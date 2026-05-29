import * as THREE from "three";
import { scene, camera, chartGroup, globeRadius } from "../core/sceneSetup.js";
import { COUNTRY_COORDS } from "../country_coords.js";
import { state } from "../appContext.js";
import { formatNumber, getMetricLabel } from "../appUtils.js";
import { getCountryAggregateForYears, getSelectableYearLabel } from "../dataLayer.js";
import { roundRect } from "./labelRenderer.js";

// ─── Focus pod canvas drawing ─────────────────────────────────────────────────

function drawFocusPodCanvas(kpi) {
  const lines = [
    kpi.country   || "—",
    kpi.periodLabel || "",
    `${kpi.metricLabel || "Metrik"}: ${formatNumber(kpi.metricValue || 0)}`,
  ];

  const fontSize = 40;
  const lineGap  = 14;
  const padX     = 36;
  const padY     = 28;

  const measureCanvas = document.createElement("canvas");
  const measureCtx    = measureCanvas.getContext("2d");
  measureCtx.font     = `bold ${fontSize}px sans-serif`;
  const widths        = lines.map((line) => measureCtx.measureText(line).width);
  const maxTextWidth  = Math.max(...widths, 0);
  const w = Math.ceil(Math.max(300, maxTextWidth + padX * 2));
  const h = Math.ceil(Math.max(170, lines.length * fontSize + (lines.length - 1) * lineGap + padY * 2));

  const canvas  = document.createElement("canvas");
  canvas.width  = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = "rgba(6,10,23,0.85)";
  roundRect(ctx, 8, 8, w - 16, h - 16, 18);
  ctx.fill();

  ctx.textAlign    = "left";
  ctx.textBaseline = "top";
  ctx.fillStyle = "#fbbf24";
  ctx.font      = `bold ${fontSize}px sans-serif`;
  ctx.fillText(lines[0], padX, padY);

  ctx.fillStyle = "#e2e8f0";
  ctx.fillText(lines[1], padX, padY + fontSize + lineGap);

  ctx.fillStyle = "#ffffff";
  ctx.fillText(lines[2], padX, padY + (fontSize + lineGap) * 2);

  return canvas;
}

// ─── Sprite disposal ──────────────────────────────────────────────────────────

function disposeFocusPodSprite() {
  if (state.focusPod?.sprite) {
    try {
      scene.remove(state.focusPod.sprite);
      if (state.focusPod.sprite.material.map) state.focusPod.sprite.material.map.dispose();
      state.focusPod.sprite.material.dispose();
    } catch (e) { /* ignore disposal errors */ }
    state.focusPod.sprite = null;
  }

  // Sweep scene for any stale focusPod sprites
  const toRemove = [];
  scene.traverse((child) => {
    if (child.isSprite && child.userData?.purpose === "focusPod") toRemove.push(child);
  });
  for (const c of toRemove) {
    try {
      scene.remove(c);
      if (c.material?.map) c.material.map.dispose();
      if (c.material)      c.material.dispose();
    } catch (e) {}
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function createFocusPod() {
  state.focusPod = { sprite: null, pinned: false };
}

export function closeFocusPod() {
  disposeFocusPodSprite();
}

/**
 * Open the focus pod for a country showing aggregated KPI data.
 * @param {string}   country
 * @param {number[]} years
 */
export function openFocusPod(country, years) {
  if (!country) return;

  const yearLabelValue = getSelectableYearLabel(years);
  const agg = getCountryAggregateForYears(years, country) || { eventsTotal: 0, fatalitiesTotal: 0 };
  const kpi = {
    country,
    periodLabel:  years.length === 1 ? `Jahr ${yearLabelValue}` : `Zeitraum ${yearLabelValue}`,
    metricLabel:  getMetricLabel(),
    metricValue:  state.metric === "fatalities" ? agg.fatalitiesTotal : agg.eventsTotal,
    eventsTotal:  agg.eventsTotal,
    fatalitiesTotal: agg.fatalitiesTotal,
  };

  const canvas = drawFocusPodCanvas(kpi);
  const tex    = new THREE.CanvasTexture(canvas);
  tex.minFilter = THREE.LinearFilter;

  disposeFocusPodSprite();

  const mat    = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false });
  const sprite = new THREE.Sprite(mat);
  const baseHeight = 8.8;
  sprite.scale.set(baseHeight * (canvas.width / canvas.height), baseHeight, 1);

  // Find world position for the country
  const mesh = state.barMeshes.find((m) => m.userData?.country === country);
  let pos = null;
  if (mesh) {
    pos = mesh.getWorldPosition(new THREE.Vector3());
  } else {
    const coords = COUNTRY_COORDS[country];
    if (coords) {
      let lat, lon;
      if (Array.isArray(coords)) { [lat, lon] = coords; } else { lat = coords.lat; lon = coords.lon; }
      const phi   = (90 - lat)  * (Math.PI / 180);
      const theta = (lon + 180) * (Math.PI / 180);
      const localPos = new THREE.Vector3(
        -(globeRadius * Math.sin(phi) * Math.cos(theta)),
          globeRadius * Math.cos(phi),
          globeRadius * Math.sin(phi) * Math.sin(theta),
      );
      pos = chartGroup.localToWorld(localPos);
    }
  }

  if (pos) {
    const normal = pos.clone().normalize();
    const offset = Math.min(globeRadius * 0.45, 20 + (agg.eventsTotal ? Math.log10(1 + agg.eventsTotal) * 2 : 0));
    sprite.position.copy(pos.clone().add(normal.multiplyScalar(offset)));
  } else {
    sprite.position.set(0, globeRadius + 20, 0);
  }

  sprite.userData         = sprite.userData || {};
  sprite.userData.purpose = "focusPod";
  sprite.lookAt(camera.position);
  scene.add(sprite);

  state.focusPod = state.focusPod || { sprite: null, pinned: false };
  state.focusPod.sprite = sprite;
}
