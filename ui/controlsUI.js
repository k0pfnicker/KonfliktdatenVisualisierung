import {
  mode3dBtn, mode2dBtn, regionToggleRow, regionSelect,
  regionAvailability, playPauseBtn, tooltip,
  desktopDebugBtn, debugStatus, metricToggleRow
} from "./uiElements.js";
import { controls, earthModel, map2D, chartGroup, haloMesh, camera } from "../core/sceneSetup.js";
import { update3DLabel } from "../rendering/labelRenderer.js";
import { closeFocusPod } from "../rendering/focusPod.js";

// ─── Helpers (forward declarations resolved at call-time via callbacks) ────────

/**
 * Update the world root position/scale for AR vs. desktop mode.
 * @param {object} appState
 * @param {THREE.Group} worldRoot
 */
export function updateArPresentation(appState, worldRoot) {
  if (!worldRoot) return;
  if (appState.arSessionActive) {
    worldRoot.position.set(0, -0.2, -1.6);
    worldRoot.scale.setScalar(0.012);
  } else {
    worldRoot.position.set(0, 0, 0);
    worldRoot.scale.setScalar(1);
  }
}

/**
 * Toggle between 3D and 2D display modes.
 * @param {string} mode  "3d" | "2d"
 * @param {object} appState
 * @param {THREE.Group} worldRoot
 * @param {object} callbacks  — { markUserInteraction, updateTemporalControlVisibility,
 *                               updateDesktopDebugUI, renderCurrentView, clear2DOverlay }
 */
export function setMode(mode, appState, worldRoot, callbacks) {
  callbacks.markUserInteraction();
  if (appState.arSessionActive && mode !== "3d") return;

  appState.mode = mode;
  updateArPresentation(appState, worldRoot);

  if (mode === "3d") {
    if (earthModel) earthModel.visible = true;
    if (map2D)      map2D.visible = false;
    chartGroup.visible = true;
    callbacks.clear2DOverlay();
    if (regionToggleRow) regionToggleRow.style.display = "flex";
    if (metricToggleRow) metricToggleRow.style.display = "flex";
    if (regionSelect) regionSelect.disabled = false;
    if (mode3dBtn)    mode3dBtn.disabled = true;
    if (mode2dBtn)    mode2dBtn.disabled = false;
    controls.enableRotate = true;
    haloMesh.visible = true;
  } else {
    if (earthModel) earthModel.visible = false;
    if (map2D)      map2D.visible = true;
    chartGroup.visible = false;
    appState.selectedRegion = "";
    if (regionSelect)       regionSelect.value = "";
    if (regionToggleRow)    regionToggleRow.style.display = "none";
    if (metricToggleRow)    metricToggleRow.style.display = "none";
    if (regionSelect)       regionSelect.disabled = true;
    if (regionAvailability) regionAvailability.textContent = "2D: alle Regionen sichtbar";
    if (mode3dBtn)          mode3dBtn.disabled = false;
    if (mode2dBtn)          mode2dBtn.disabled = true;
    controls.enableRotate = true; // Changed to true: Allow orbiting the 2D plane in 3D space
    camera.position.set(0, 0, 400);
    controls.target.set(0, 0, 0);
    camera.lookAt(0, 0, 0);
    if (tooltip) tooltip.style.display = "none";
    haloMesh.visible = false;
    closeFocusPod();
    update3DLabel(null);
  }

  callbacks.updateTemporalControlVisibility();
  callbacks.updateDesktopDebugUI();
  if (appState.arSessionActive) appState.mode = "3d";

  if (appState.yearKeys.length > 0) {
    callbacks.renderCurrentView();
  }
}

/**
 * Sync desktop-debug button text and apply debug camera settings.
 * @param {object} appState
 */
export function updateDesktopDebugUI(appState) {
  if (desktopDebugBtn) {
    desktopDebugBtn.classList.toggle("active", appState.desktopDebug);
    desktopDebugBtn.textContent = appState.desktopDebug ? "Desktop Debug: On" : "Desktop Debug: Off";
  }
  if (debugStatus) {
    debugStatus.textContent = appState.desktopDebug
      ? "Desktop debug mode is on. Idle auto-rotation is disabled, and mouse/keyboard controls stay stable for inspection."
      : "PC-test mode is off. Use this to keep the scene stable for mouse/keyboard debugging.";
  }
  if (appState.desktopDebug) {
    controls.enableRotate = true;
    controls.enablePan = true;
    controls.enableZoom = true;
    controls.screenSpacePanning = true;
    camera.position.set(0, 0, 260);
    controls.target.set(0, 0, 0);
    controls.update();
  }
}
