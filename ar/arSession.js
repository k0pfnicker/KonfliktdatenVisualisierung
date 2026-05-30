import { arBtn, arStatus } from "../ui/uiElements.js";
import { renderer, controls } from "../core/sceneSetup.js";
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
    }
    if (arStatus) arStatus.style.display = "none";
    return;
  }

  if (!window.isSecureContext) {
    appState.arSupported = false;
    arBtn.disabled = true;
    arBtn.textContent = "AR nicht verfuegbar";
    if (arStatus) {
      arStatus.style.display = "block";
      arStatus.textContent = "AR braucht HTTPS oder localhost. Ein LAN-HTTP-Server reicht fuer immersive-ar meist nicht aus.";
    }
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
  }
  if (arStatus) {
    arStatus.style.display = appState.arSupported || appState.arSessionActive ? "block" : "none";
    arStatus.textContent = appState.arSessionActive
      ? "AR-Session laeuft. Desktop debug und 2D sind jetzt gesperrt."
      : appState.arSupported
        ? "AR ist verfuegbar. Auf einem kompatiblen Gerät kannst du eine immersive AR-Session starten."
        : "AR wird von diesem Browser oder Gerät nicht unterstützt.";
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

    session.addEventListener("end", () => {
      appState.arSessionActive = false;
      updateArPresentation(appState, worldRoot);
      if (mode2d) mode2d.disabled = false;
      if (mode3d) mode3d.disabled = false;
      controls.enabled = true;

      updateArSupportState(appState);
      renderCurrentView();
    }, { once: true });

    await renderer.xr.setSession(session);
    renderCurrentView();
  } catch (err) {
    console.error("AR session failed", err);
    appState.arSessionActive = false;
    updateArSupportState(appState);
  }
}
