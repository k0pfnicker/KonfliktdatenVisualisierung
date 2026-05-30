import * as THREE from "three";
import { COUNTRY_COORDS } from "../country_coords.js";
import { reference2DGroup, map2D, globeRadius } from "../core/sceneSetup.js";
import { state } from "../appContext.js";
import { getMetricValue, softCapRatio, getEventTypeColor } from "../appUtils.js";
import { getSelectableYearLabel, getEventTypesForYears, getParticlesForYears } from "../dataLayer.js";
import { buildOverlayCanvas } from "../insightRendering.js";

// ─── Coordinate helpers ───────────────────────────────────────────────────────

/**
 * Project lat/lon to the 2D equirectangular plane used by the flat map.
 * @param {string} country
 * @returns {THREE.Vector3|null}
 */
export function projectCountryTo2D(country) {
  const coords = COUNTRY_COORDS[country];
  if (!coords) return null;
  let lat, lon;
  if (Array.isArray(coords)) { [lat, lon] = coords; } else { lat = coords.lat; lon = coords.lon; }
  return projectLatLonTo2D(lat, lon);
}

export function projectLatLonTo2D(lat, lon) {
  const mapWidth  = 2 * Math.PI * globeRadius;
  const mapHeight = Math.PI  * globeRadius;
  return new THREE.Vector3(
    (lon / 180) * (mapWidth  / 2),
    (lat / 90)  * (mapHeight / 2),
    0
  );
}

// ─── 2D overlay clear ─────────────────────────────────────────────────────────

export function clear2DOverlay() {
  while (reference2DGroup.children.length > 0) {
    const child = reference2DGroup.children[0];
    reference2DGroup.remove(child);
    if (child.material?.map) child.material.map.dispose();
    if (child.material) child.material.dispose();
    if (child.geometry) child.geometry.dispose();
  }
}

// ─── Particle Swarm Material ──────────────────────────────────────────────────

let swarmMaterial = null;
function getSwarmMaterial() {
  if (!swarmMaterial) {
    swarmMaterial = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexShader: `
        attribute float intensity;
        varying float vIntensity;
        void main() {
          vIntensity = intensity;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          
          // Size scales with intensity (soft cap)
          float particleSize = 8.0 + min(intensity * 1.5, 30.0);
          
          // Perspective scale
          gl_PointSize = particleSize * (100.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying float vIntensity;
        void main() {
          vec2 coord = gl_PointCoord - vec2(0.5);
          float dist = length(coord);
          if (dist > 0.5) discard;
          
          // Soft glowing dot
          float alpha = smoothstep(0.5, 0.1, dist);
          
          // Color gradient based on intensity: Yellow -> Intense Red
          vec3 colorLow = vec3(1.0, 0.9, 0.3); // Bright, vivid yellow-white
          vec3 colorHigh = vec3(1.0, 0.1, 0.1);
          vec3 finalColor = mix(colorLow, colorHigh, min(vIntensity / 30.0, 1.0));
          
          // Boost overall alpha to prevent blending out on bright backgrounds
          gl_FragColor = vec4(finalColor, min(alpha * 1.5, 1.0));
        }
      `
    });
  }
  return swarmMaterial;
}

// ─── 2D map overlay builder ───────────────────────────────────────────────────

/**
 * Build and add the 3D particle swarm and invisible hit-proxies for the given year range.
 * @param {number[]} years
 */
export function build2DMapOverlay(years) {
  clear2DOverlay();
  if (!years || years.length === 0 || !map2D) return;

  // 1. Fetch particles and build the THREE.Points swarm
  const particles = getParticlesForYears(years);
  if (particles.length > 0) {
    const positions = new Float32Array(particles.length * 3);
    const intensities = new Float32Array(particles.length);

    // First pass: calculate intensities and find max intensity
    let maxIntensity = 1;
    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      // Base intensity heavily on fatalities for maximum impact
      const intensity = p.fatalitiesTotal > 0 ? p.fatalitiesTotal : (p.eventsTotal * 0.5);
      intensities[i] = intensity;
      if (intensity > maxIntensity) maxIntensity = intensity;
    }

    // Second pass: set positions with Z-elevation based on intensity
    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      const pos = projectLatLonTo2D(p.lat, p.lon);
      positions[i * 3 + 0] = pos.x;
      positions[i * 3 + 1] = pos.y;
      
      const intensity = intensities[i];
      // Elevate the particles into a 3D point cloud! Max height is 30 units.
      const normalizedIntensity = Math.min(intensity / maxIntensity, 1.0);
      
      // Use an exponential curve so only truly intense events spike really high,
      // while standard events float gently above the map.
      const elevation = 0.2 + Math.pow(normalizedIntensity, 0.4) * 35;
      
      positions[i * 3 + 2] = elevation;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('intensity', new THREE.BufferAttribute(intensities, 1));

    const pointCloud = new THREE.Points(geometry, getSwarmMaterial());
    pointCloud.userData = { purpose: "2dParticleSwarm" };
    reference2DGroup.add(pointCloud);
  }
}
