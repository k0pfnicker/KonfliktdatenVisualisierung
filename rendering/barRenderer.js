import * as THREE from "three";
import { COUNTRY_COORDS } from "../country_coords.js";
import { scene, camera, chartGroup, globeRadius } from "../core/sceneSetup.js";
import { state } from "../appContext.js";
import { formatNumber, getMetricLabel, getMetricValue, softCapRatio } from "../appUtils.js";
import { getTopRowsForYears } from "../dataLayer.js";
import { legendTitle, legendRange, yearLabel } from "../ui/uiElements.js";

// ─── Object Pools & Geometries ────────────────────────────────────────────────

const meshPool = new Map();
const markerPool = new Map();

const genericBarGeo = new THREE.CylinderGeometry(1.5, 1.5, 1, 8);
genericBarGeo.translate(0, 0.5, 0);
genericBarGeo.rotateX(-Math.PI / 2);

const genericTapGeo = new THREE.CylinderGeometry(3.5, 3.5, 1, 10);
genericTapGeo.translate(0, 0.5, 0);
genericTapGeo.rotateX(-Math.PI / 2);

const genericMarkerGeo = new THREE.RingGeometry(1.4 * 0.75, 1.4, 16);

// ─── Helpers ──────────────────────────────────────────────────────────────────

function latLonToCartesian(lat, lon, radius) {
  const phi   = (90 - lat)  * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180);
  return new THREE.Vector3(
    -(radius * Math.sin(phi) * Math.cos(theta)),
      radius * Math.cos(phi),
      radius * Math.sin(phi) * Math.sin(theta),
  );
}

function latLonTo2D(lat, lon, radius) {
  const mapWidth  = 2 * Math.PI * radius;
  const mapHeight = Math.PI  * radius;
  return new THREE.Vector3(
    (lon / 180) * (mapWidth  / 2),
    (lat / 90)  * (mapHeight / 2),
    0,
  );
}

function getCountryPosition(country, mode) {
  const coords = COUNTRY_COORDS[country];
  if (!coords) return null;
  let lat, lon;
  if (Array.isArray(coords)) { [lat, lon] = coords; } else { lat = coords.lat; lon = coords.lon; }
  if (mode === "3d") {
    return { pos: latLonToCartesian(lat, lon, globeRadius), lookAt: new THREE.Vector3(0, 0, 0) };
  }
  const pos = latLonTo2D(lat, lon, globeRadius);
  return { pos, lookAt: new THREE.Vector3(pos.x, pos.y, -1) };
}

// ─── Legend ───────────────────────────────────────────────────────────────────

function renderLegend(selectionLabel, rows) {
  if (!legendTitle || !legendRange) return;
  if (!rows || rows.length === 0) {
    legendTitle.textContent = `Legende (${getMetricLabel()})`;
    legendRange.textContent = "Keine Daten";
    return;
  }
  const values = rows.map((row) => getMetricValue(row));
  legendTitle.textContent = `Legende (${getMetricLabel()}) - ${selectionLabel}`;
  const positiveValues = values.filter(v => v > 0);
  const minVal = positiveValues.length > 0 ? Math.min(...positiveValues) : 0;
  legendRange.textContent = `Niedrig: ${formatNumber(minVal)} | Hoch: ${formatNumber(Math.max(...values))}`;
}

// ─── Bar clearing ─────────────────────────────────────────────────────────────

export function clearBars() {
  for (const mesh of meshPool.values()) {
    mesh.visible = false;
    if (mesh.userData.hitProxy) {
      mesh.userData.hitProxy.visible = false;
    }
  }
  for (const marker of markerPool.values()) {
    marker.visible = false;
  }
  state.barMeshes = [];
}

// ─── Core bar builder ─────────────────────────────────────────────────────────

/**
 * Build and add bar meshes for the given data rows.
 * @param {string} selectionLabel
 * @param {Array}  rows
 * @param {"year"|"range"} periodType
 */
export function buildBarsFromRows(selectionLabel, rows, periodType) {
  clearBars();

  const globalMax = state.metric === "fatalities" ? state.globalMaxFatalities : state.globalMaxEvents;
  const safeMax   = globalMax || 1;
  const maxBarHeight = globeRadius * 0.6;

  renderLegend(selectionLabel, rows);

  for (const row of rows) {
    const result = getCountryPosition(row.country, state.mode);
    if (!result) continue;
    const { pos, lookAt } = result;

    const rawRatio = getMetricValue(row) / safeMax;
    const ratio    = softCapRatio(getMetricValue(row), safeMax);
    const h        = Math.min(maxBarHeight, 5 + ratio * (maxBarHeight - 5));

    let colorHex = 0x3b82f6;
    if (ratio > 0.72) colorHex = 0xef4444;
    else if (ratio > 0.28) colorHex = 0xf59e0b;

    const isSelected  = state.selectedCountry && row.country === state.selectedCountry;
    const baseOpacity = isSelected ? 1.0 : 0.6;

    let mesh;
    if (meshPool.has(row.country)) {
      mesh = meshPool.get(row.country);
      mesh.visible = true;
      mesh.material.uniforms.uColor.value.setHex(colorHex);
      mesh.material.uniforms.uOpacity.value = baseOpacity;
      mesh.scale.set(1, 1, h);
    } else {
      const mat = new THREE.ShaderMaterial({
        uniforms: {
          uColor:   { value: new THREE.Color(colorHex) },
          uOpacity: { value: baseOpacity },
        },
        vertexShader: `
          varying vec2 vUv;
          void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: `
          uniform vec3 uColor;
          uniform float uOpacity;
          varying vec2 vUv;
          void main() {
            float alpha = pow(1.0 - vUv.y, 1.5) * uOpacity;
            gl_FragColor = vec4(uColor + (vec3(1.0) * pow(1.0 - vUv.y, 3.0) * 0.3), alpha);
          }
        `,
        transparent: true, depthWrite: false,
        blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
      });
      mesh = new THREE.Mesh(genericBarGeo, mat);
      mesh.scale.set(1, 1, h);
      chartGroup.add(mesh);
      meshPool.set(row.country, mesh);
    }

    mesh.position.copy(pos);
    mesh.lookAt(lookAt);

    mesh.userData = {
      year: selectionLabel, periodLabel: selectionLabel, periodType,
      country: row.country, region: row.region,
      eventsTotal: row.eventsTotal, fatalitiesTotal: row.fatalitiesTotal,
      pos: pos.clone(), colorHex, lookAtTarget: lookAt.clone(),
      ratio, rawRatio, height: h,
    };
    state.barMeshes.push(mesh);

    // Invisible tap-proxy for easier mobile touch
    const tapH   = Math.max(h + 14, 18);
    let tapMesh = mesh.userData.hitProxy;
    if (!tapMesh) {
      const tapMat  = new THREE.MeshBasicMaterial({ color: colorHex, transparent: true, opacity: 0, depthWrite: false, depthTest: false });
      tapMesh = new THREE.Mesh(genericTapGeo, tapMat);
      chartGroup.add(tapMesh);
      mesh.userData.hitProxy = tapMesh;
    }
    tapMesh.visible = true;
    tapMesh.scale.set(1, 1, tapH);
    tapMesh.position.copy(pos);
    tapMesh.lookAt(lookAt);
    tapMesh.userData = { ...mesh.userData, hitTarget: mesh, purpose: "barTapProxy" };
  }

  // No-data markers for countries present in the dataset but absent from current selection
  if (!state.selectedRegion && state.allCountriesInDataset) {
    const activeCountries = new Set(rows.map((row) => row.country));
    for (const country of state.allCountriesInDataset) {
      if (activeCountries.has(country)) continue;
      const result = getCountryPosition(country, state.mode);
      if (!result) continue;
      const { pos, lookAt } = result;

      let markerMesh;
      if (markerPool.has(country)) {
        markerMesh = markerPool.get(country);
        markerMesh.visible = true;
      } else {
        const material = new THREE.MeshBasicMaterial({
          color: 0xcbd5e1, transparent: true, opacity: 0.65,
          depthWrite: false, side: THREE.DoubleSide,
        });
        markerMesh = new THREE.Mesh(genericMarkerGeo, material);
        chartGroup.add(markerMesh);
        markerPool.set(country, markerMesh);
      }

      const normal = pos.clone().normalize();
      markerMesh.position.copy(pos.clone().add(normal.multiplyScalar(0.35)));
      markerMesh.lookAt(lookAt);

      markerMesh.userData = { country, purpose: "noDataMarker" };
      state.barMeshes.push(markerMesh);
    }
  }

  if (yearLabel) {
    yearLabel.textContent = `${periodType === "range" ? "Zeitraum" : "Jahr"}: ${selectionLabel} | Metrik: ${getMetricLabel()}`;
  }
}

// ─── Convenience wrappers ─────────────────────────────────────────────────────

export function buildBarsForYear(year) {
  const rows = getTopRowsForYears([year]);
  buildBarsFromRows(String(year), rows, "year");
}

export function buildBarsForRange(startYear, endYear) {
  const years = state.availableYearsForFilter.filter((y) => y >= startYear && y <= endYear);
  const rows  = getTopRowsForYears(years);
  buildBarsFromRows(`${startYear}-${endYear}`, rows, "range");
}
