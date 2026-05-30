import { arBtn, arWarningContainer, arWarningPopup } from "../ui/uiElements.js";
import { renderer, controls, scene } from "../core/sceneSetup.js";
import * as THREE from "three";
import { updateArPresentation } from "../ui/controlsUI.js";
import { setPlayback } from "../ui/playbackUI.js";
import { renderCurrentView } from "../rendering/viewController.js";

// ─── AR support detection ─────────────────────────────────────────────────────

/**
 * Check WebXR immersive-ar support and update button/status accordingly.
 * @param {object} appState
 */
export async function updateArSupportState(appState) {
  if (!navigator.xr || !arBtn) {
    appState.arSupported = false;
    if (arBtn) {
      arBtn.disabled = true;
      arBtn.textContent = "AR nicht verfuegbar";
      const arRow = arBtn.closest(".ar-row");
      if (arRow) arRow.style.display = "none";
    }
    if (arWarningContainer) arWarningContainer.style.display = "block";
    if (arWarningPopup) arWarningPopup.textContent = "AR wird von diesem Browser oder Gerät nicht unterstützt.";
    return;
  }

  if (!window.isSecureContext) {
    appState.arSupported = false;
    arBtn.disabled = true;
    arBtn.textContent = "AR nicht verfuegbar";
    const arRow = arBtn.closest(".ar-row");
    if (arRow) arRow.style.display = "none";
    if (arWarningContainer) arWarningContainer.style.display = "block";
    if (arWarningPopup) arWarningPopup.textContent = "AR braucht HTTPS oder localhost. Ein LAN-HTTP-Server reicht für immersive-ar meist nicht aus.";
    return;
  }

  try {
    appState.arSupported = await navigator.xr.isSessionSupported("immersive-ar");
  } catch {
    appState.arSupported = false;
  }

  if (arBtn) {
    arBtn.disabled   = !appState.arSupported && !appState.arSessionActive;
    arBtn.textContent = appState.arSessionActive
      ? "AR beenden"
      : appState.arSupported ? "AR starten" : "AR nicht verfuegbar";
      
    const arRow = arBtn.closest(".ar-row");
    if (arRow) {
      arRow.style.display = appState.arSupported || appState.arSessionActive ? "flex" : "none";
    }
  }
  if (arWarningContainer) {
    arWarningContainer.style.display = appState.arSupported || appState.arSessionActive ? "none" : "block";
    if (arWarningPopup && !appState.arSupported) {
      arWarningPopup.textContent = "AR wird von diesem Browser oder Gerät nicht unterstützt.";
    }
  }
}

// ─── AR session start/end ─────────────────────────────────────────────────────

/**
 * Request and activate an immersive-ar WebXR session.
 * @param {object} appState
 * @param {THREE.Group} worldRoot
 */
export async function startArSession(appState, worldRoot) {
  if (!navigator.xr || !appState.arSupported || !renderer.xr) return;

  try {
    const session = await navigator.xr.requestSession("immersive-ar", {
      requiredFeatures: ["local-floor"],
      optionalFeatures: ["dom-overlay"],
      domOverlay: { root: document.body },
    });

    appState.arSessionActive = true;
    appState.desktopDebug    = false;
    appState.mode            = "3d";
    updateArPresentation(appState, worldRoot);
    setPlayback(false, appState);

    updateArSupportState(appState);

    // Lock mode buttons during AR
    const mode2d = document.getElementById("mode2dBtn");
    const mode3d = document.getElementById("mode3dBtn");
    if (mode2d) mode2d.disabled = true;
    if (mode3d) mode3d.disabled = true;
    controls.enabled = false;
    scene.background = null;

    session.addEventListener("end", () => {
      appState.arSessionActive = false;
      updateArPresentation(appState, worldRoot);
      if (mode2d) mode2d.disabled = false;
      if (mode3d) mode3d.disabled = false;
      controls.enabled = true;
      scene.background = new THREE.Color(0x020617);

      updateArSupportState(appState);
      renderCurrentView();
    }, { once: true });

    await renderer.xr.setSession(session);
    renderCurrentView();
  } catch (err) {
    console.error("AR session failed", err);
    appState.arSessionActive = false;
    scene.background = new THREE.Color(0x020617);
    updateArSupportState(appState);
  }
}
