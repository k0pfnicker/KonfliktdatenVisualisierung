import { camera, controls, globeRadius } from "../core/sceneSetup.js";
import { state } from "../appContext.js";

// ─── Region target coordinates ────────────────────────────────────────────────

const REGION_COORDS = {
  Africa:          { lat:   2, lon:  20 },
  Asia:            { lat:  28, lon:  95 },
  Europe:          { lat:  52, lon:  15 },
  "Middle East":   { lat:  28, lon:  48 },
  "North America": { lat:  40, lon: -100 },
  "South America": { lat: -12, lon:  -60 },
};

// ─── Camera animation helper ──────────────────────────────────────────────────

function easeToTarget(startPos, newX, newY, newZ, duration = 800) {
  const startTime = performance.now();

  function animateCamera(currentTime) {
    const elapsed  = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const eased    = 1 - Math.pow(1 - progress, 3); // ease-out cubic

    camera.position.x = startPos.x + (newX - startPos.x) * eased;
    camera.position.y = startPos.y + (newY - startPos.y) * eased;
    camera.position.z = startPos.z + (newZ - startPos.z) * eased;
    controls.target.set(0, 0, 0);
    camera.lookAt(0, 0, 0);

    if (progress < 1) requestAnimationFrame(animateCamera);
  }

  requestAnimationFrame(animateCamera);
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Smoothly animate the camera to focus on a named region.
 * Pass an empty string or an unknown region to reset to the default globe view.
 * @param {string} region
 */
export function animateCameraToRegion(region) {
  const startPos = camera.position.clone();

  if (!region || !REGION_COORDS[region] || state.mode !== "3d") {
    if (state.mode === "3d") {
      easeToTarget(startPos, 0, 200, 0);
    }
    return;
  }

  const { lat, lon } = REGION_COORDS[region];
  const dist         = globeRadius * 2.5;
  const phi          = (90 - lat)  * (Math.PI / 180);
  const theta        = (lon + 180) * (Math.PI / 180);

  easeToTarget(
    startPos,
    -(dist * Math.sin(phi) * Math.cos(theta)),
      dist * Math.cos(phi),
      dist * Math.sin(phi) * Math.sin(theta),
  );
}
