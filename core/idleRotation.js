import * as THREE from "three";
import { camera, chartGroup, earthModel, haloMesh } from "./sceneSetup.js";

// ─── Constants ────────────────────────────────────────────────────────────────
const IDLE_AUTO_ROTATE_DELAY_MS = 5000;
const IDLE_ROTATION_SPEED_RAD_PER_SEC = THREE.MathUtils.degToRad(4.5);
const idleRotationAxis = new THREE.Vector3(0, 1, 0);
const idleRotationQuat = new THREE.Quaternion();
/*
// Idle Rotation Erde realistisch
const EARTH_AXIAL_TILT_DEG = 23.4;

const idleRotationAxis = new THREE.Vector3(
  Math.sin(THREE.MathUtils.degToRad(EARTH_AXIAL_TILT_DEG)),
  Math.cos(THREE.MathUtils.degToRad(EARTH_AXIAL_TILT_DEG)),
  0,
).normalize();
*/

// ─── Mutable state ────────────────────────────────────────────────────────────
let lastUserInteractionAtMs = performance.now();
let idleActive = false;
export let idleStartedAtMs = 0;
let restoring = false;

let baselineEarthQuat = null;
let baselineChartQuat = null;
let baselineHaloQuat = null;
let baselineFocusPodPos = null;

let baselineIsPlaying = false;
let baselineYearSliderValue = null;
let baselineTimeRangeStartValue = null;
let baselineTimeRangeEndValue = null;

// ─── Exported getters used by animationLoop ───────────────────────────────────
export function isIdleActive() { return idleActive; }
export function isRestoring() { return restoring; }
export function getLastUserInteractionAtMs() { return lastUserInteractionAtMs; }

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Reset the inactivity timer. Call from any user-driven event.
 */
export function markUserInteraction() {
  lastUserInteractionAtMs = performance.now();
}

/**
 * Smoothly restore the pre-idle rotations over durationMs milliseconds.
 * Accepts callbacks so this module doesn't need to import app-level functions.
 * @param {object} opts
 * @param {Function} opts.setPlayback
 * @param {Function} opts.syncSelectionControls
 * @param {Function} opts.updateTimeRangeVisuals
 * @param {Function} opts.syncYearSliderValueLabel
 * @param {Function} opts.renderCurrentView
 * @param {HTMLElement|null} opts.yearSlider
 * @param {HTMLElement|null} opts.timeRangeStartSlider
 * @param {HTMLElement|null} opts.timeRangeEndSlider
 * @param {number} [durationMs=600]
 */
export function startRestoreRotation(opts, durationMs = 600) {
  if (!idleActive) return;
  restoring = true;

  const startEarth = earthModel ? earthModel.quaternion.clone() : null;
  const startChart = chartGroup ? chartGroup.quaternion.clone() : null;
  const startHalo = haloMesh ? haloMesh.quaternion.clone() : null;
  const targetEarth = baselineEarthQuat ? baselineEarthQuat.clone() : null;
  const targetChart = baselineChartQuat ? baselineChartQuat.clone() : null;
  const targetHalo = baselineHaloQuat ? baselineHaloQuat.clone() : null;

  const startTime = performance.now();

  function step(now) {
    const elapsed = now - startTime;
    const tRaw = Math.min(1, elapsed / durationMs);
    const t = 1 - Math.pow(1 - tRaw, 3); // ease-out cubic

    if (startEarth && targetEarth && earthModel) {
      earthModel.quaternion.copy(startEarth.clone().slerp(targetEarth, t));
    }
    if (startChart && targetChart && chartGroup) {
      chartGroup.quaternion.copy(startChart.clone().slerp(targetChart, t));
    }
    if (startHalo && targetHalo && haloMesh) {
      haloMesh.quaternion.copy(startHalo.clone().slerp(targetHalo, t));
    }

    if (t < 1) {
      requestAnimationFrame(step);
    } else {
      // Restore completed — reset all baseline state
      idleActive = false;
      restoring = false;
      baselineEarthQuat = null;
      baselineChartQuat = null;
      baselineHaloQuat = null;
      baselineFocusPodPos = null;

      const { yearSlider, timeRangeStartSlider, timeRangeEndSlider } = opts;
      if (yearSlider && baselineYearSliderValue !== null) yearSlider.value = baselineYearSliderValue;
      if (timeRangeStartSlider && baselineTimeRangeStartValue !== null) timeRangeStartSlider.value = baselineTimeRangeStartValue;
      if (timeRangeEndSlider && baselineTimeRangeEndValue !== null) timeRangeEndSlider.value = baselineTimeRangeEndValue;

      opts.setPlayback(baselineIsPlaying);
      opts.syncSelectionControls();
      if (globalThis.__webxrState?.selectedRegion) {
        opts.updateTimeRangeVisuals();
      } else {
        opts.syncYearSliderValueLabel();
      }
      opts.renderCurrentView();
    }
  }

  requestAnimationFrame(step);
}

/**
 * Apply a slow idle rotation to the earth when no user interaction has occurred
 * for IDLE_AUTO_ROTATE_DELAY_MS. Accepts the appState and focusPod as params.
 * @param {number} dt  — seconds since last frame
 * @param {object} appState
 */
export function applyIdleEarthRotation(dt, appState) {
  if (appState.mode !== "3d" || appState.desktopDebug || appState.arSessionActive) return;

  const idleMs = performance.now() - lastUserInteractionAtMs;
  if (idleMs < IDLE_AUTO_ROTATE_DELAY_MS) return;

  if (!idleActive) {
    idleActive = true;
    idleStartedAtMs = performance.now();

    if (earthModel) baselineEarthQuat = earthModel.quaternion.clone();
    if (chartGroup) baselineChartQuat = chartGroup.quaternion.clone();
    if (haloMesh) baselineHaloQuat = haloMesh.quaternion.clone();
    if (appState.focusPod?.sprite) baselineFocusPodPos = appState.focusPod.sprite.position.clone();

    baselineIsPlaying = appState.isPlaying;
    baselineYearSliderValue = globalThis.__appSliders?.yearSlider?.value ?? null;
    baselineTimeRangeStartValue = globalThis.__appSliders?.timeRangeStartSlider?.value ?? null;
    baselineTimeRangeEndValue = globalThis.__appSliders?.timeRangeEndSlider?.value ?? null;

    if (!appState.isPlaying && globalThis.__appSetPlayback) {
      globalThis.__appSetPlayback(true);
    }
  }

  const deltaAngle = IDLE_ROTATION_SPEED_RAD_PER_SEC * Math.max(0, dt);
  if (deltaAngle <= 0 || restoring) return;

  idleRotationQuat.setFromAxisAngle(idleRotationAxis, -deltaAngle);
  if (earthModel) earthModel.quaternion.premultiply(idleRotationQuat);
  if (chartGroup) chartGroup.quaternion.premultiply(idleRotationQuat);
  if (haloMesh) haloMesh.quaternion.premultiply(idleRotationQuat);
  if (appState.focusPod?.sprite) {
    appState.focusPod.sprite.position.applyQuaternion(idleRotationQuat);
    appState.focusPod.sprite.lookAt(camera.position);
  }
}
