import {
  yearSlider, timeRangeStartSlider, timeRangeEndSlider,
  mode3dBtn, mode2dBtn, arBtn,
  playPauseBtn, metricEventsBtn, metricFatalitiesBtn, regionSelect,
  uiToggleBtn, legendToggleBtn, legendPanel,
  arWarningBtn, arWarningPopup, arResetBtn
} from "./uiElements.js";
import { renderer, raycaster, mouse, reference2DGroup, camera, controls } from "../core/sceneSetup.js";
import { markUserInteraction } from "../core/idleRotation.js";
import { setMode, updateControlsUI } from "./controlsUI.js";
import { setPlayback } from "./playbackUI.js";
import { commitTimeRangeSelection } from "./timeRangeUI.js";
import { onRegionSelectChange } from "./regionSelectUI.js";
import { getSelectedRangeYears, getSelectedYearFromSlider, syncSliderBounds, syncSelectionControls } from "../dataLayer.js";
import {
  update3DLabel,
  closeFocusPod,
  openFocusPod,
  renderCurrentView,
  renderForYear,
  renderCountryInsight,
} from "../rendering/viewController.js";

/**
 * Wire up all event listeners for the application.
 * @param {object} appState
 * @param {THREE.Group} worldRoot
 * @param {object} callbacks  — { syncYearSliderValueLabel, updateTemporalControlVisibility,
 *                               clear2DOverlay, startArSession }
 */
export function registerEventHandlers(appState, worldRoot, callbacks) {
  const {
    syncYearSliderValueLabel,
    updateTemporalControlVisibility,
    clear2DOverlay,
    startArSession,
  } = callbacks;

  // Shared setMode wrapper with all required deps
  function doSetMode(mode) {
    setMode(mode, appState, worldRoot, {
      markUserInteraction,
      updateTemporalControlVisibility: () => updateTemporalControlVisibility(appState),
      renderCurrentView,
      clear2DOverlay,
    });
    syncSelectionControls();
    syncYearSliderValueLabel();
  }

  // ─── Year slider ───────────────────────────────────────────────────────────
  yearSlider.addEventListener("input", () => {
    markUserInteraction();
    setPlayback(false, appState);
    appState.autoFollowLatest = false;
    const year = getSelectedYearFromSlider();
    if (year !== null) {
      renderForYear(year);
      syncYearSliderValueLabel();
    }
  });

  // ─── Time range sliders ────────────────────────────────────────────────────
  timeRangeStartSlider.addEventListener("input", () => {
    markUserInteraction();
    if (!appState.selectedRegion) return;
    setPlayback(false, appState);
    appState.autoFollowLatest = false;
    const sVal = Number.parseInt(timeRangeStartSlider.value, 10) || 0;
    const eVal = Number.parseInt(timeRangeEndSlider.value, 10) || 0;
    if (sVal >= eVal) timeRangeStartSlider.value = String(Math.max(0, eVal - 1));
    commitTimeRangeSelection();
  });

  timeRangeEndSlider.addEventListener("input", () => {
    markUserInteraction();
    if (!appState.selectedRegion) return;
    setPlayback(false, appState);
    appState.autoFollowLatest = false;
    const sVal = Number.parseInt(timeRangeStartSlider.value, 10) || 0;
    const eVal = Number.parseInt(timeRangeEndSlider.value, 10) || 0;
    if (eVal <= sVal) {
      timeRangeEndSlider.value = String(
        Math.min(timeRangeEndSlider.max ? Number.parseInt(timeRangeEndSlider.max, 10) || eVal : eVal, sVal + 1),
      );
    }
    commitTimeRangeSelection();
  });

  // Fallback for browser change events on sliders
  document.addEventListener("input", (event) => {
    markUserInteraction();
    if (event.target === timeRangeStartSlider || event.target === timeRangeEndSlider) {
      if (!appState.selectedRegion) return;
      commitTimeRangeSelection();
    }
  });
  document.addEventListener("change", (event) => {
    markUserInteraction();
    if (event.target === timeRangeStartSlider || event.target === timeRangeEndSlider) {
      if (!appState.selectedRegion) return;
      commitTimeRangeSelection();
    }
  });

  // ─── Mode buttons ──────────────────────────────────────────────────────────
  mode3dBtn.addEventListener("click", () => doSetMode("3d"));
  mode2dBtn.addEventListener("click", () => doSetMode("2d"));

  // ─── AR button ────────────────────────────────────────────────────────────
  arBtn.addEventListener("click", () => {
    markUserInteraction();
    if (appState.arSessionActive) {
      renderer.xr.getSession()?.end();
      return;
    }
    callbacks.startArSession();
  });

  if (arResetBtn) {
    arResetBtn.addEventListener("click", () => {
      markUserInteraction();
      if (!appState.arSessionActive || !worldRoot) return;

      appState.triggerArReset = true;
    });
  }

  // ─── AR Warning Popup ───────────────────────────────────────────────────────
  if (arWarningBtn && arWarningPopup) {
    arWarningBtn.addEventListener("click", () => {
      markUserInteraction();
      const isVisible = arWarningPopup.style.display === "block";
      arWarningPopup.style.display = isVisible ? "none" : "block";
    });
  }

  // ─── Play/pause ───────────────────────────────────────────────────────────
  playPauseBtn.addEventListener("click", () => {
    markUserInteraction();
    if (!appState.yearKeys.length) return;
    setPlayback(!appState.isPlaying, appState);
  });

  // ─── Metric select ────────────────────────────────────────────────────────
  if (metricEventsBtn && metricFatalitiesBtn) {
    metricEventsBtn.addEventListener("click", () => {
      markUserInteraction();
      setPlayback(false, appState);
      appState.metric = "events";
      updateControlsUI(appState);
      renderCurrentView();
    });
    metricFatalitiesBtn.addEventListener("click", () => {
      markUserInteraction();
      setPlayback(false, appState);
      appState.metric = "fatalities";
      updateControlsUI(appState);
      renderCurrentView();
    });
  }

  // ─── Region select ────────────────────────────────────────────────────────
  regionSelect.addEventListener("change", () => {
    onRegionSelectChange(appState, syncYearSliderValueLabel);
  });

  // ─── UI toggle ────────────────────────────────────────────────────────────
  if (uiToggleBtn) {
    uiToggleBtn.addEventListener("click", () => {
      document.body.classList.toggle("controls-collapsed");
    });
  }

  // ─── Legend toggle ─────────────────────────────────────────────────────────
  if (legendToggleBtn && legendPanel) {
    legendToggleBtn.addEventListener("click", () => {
      if (legendPanel.style.display === "none") {
        legendPanel.style.display = "block";
      } else {
        legendPanel.style.display = "none";
      }
    });
  }

  // ─── Canvas click (country selection) ─────────────────────────────────────
  renderer.domElement.addEventListener("click", (e) => {
    markUserInteraction();
    if (appState.mode === "2d") return;

    const rect = renderer.domElement.getBoundingClientRect();
    mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    const activeCamera = appState.arSessionActive ? renderer.xr.getCamera(camera) : camera;
    raycaster.setFromCamera(mouse, activeCamera);
    const hitTargets = appState.mode === "2d"
      ? reference2DGroup.children
      : appState.barMeshes.flatMap((mesh) => (mesh.userData?.hitProxy ? [mesh, mesh.userData.hitProxy] : [mesh]));
    const hits = raycaster.intersectObjects(hitTargets, false);

    if (!hits.length) {
      appState.selectedCountry = null;
      update3DLabel(null);
      closeFocusPod();
      if (appState.mode === "2d") clear2DOverlay();
      renderCurrentView();
      return;
    }

    const pickedMesh = hits[0].object;
    const resolved = pickedMesh.userData?.hitTarget ?? pickedMesh;
    const d = resolved.userData;
    appState.selectedCountry = d.country;

    if (appState.mode === "2d") {
      renderCurrentView();
    } else if (appState.selectedRegion) {
      renderCurrentView();
      update3DLabel(null);
      const years = getSelectedRangeYears();
      openFocusPod(d.country, years);
    } else {
      const year = getSelectedYearFromSlider();
      if (year) renderCountryInsight(year, d.country);
      update3DLabel(null);
      openFocusPod(d.country, year ? [year] : [Number(d.year)]);
    }
  });

  // ─── Window + controls passthrough ────────────────────────────────────────
  window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  renderer.domElement.addEventListener("pointerdown", markUserInteraction);
  renderer.domElement.addEventListener("wheel", markUserInteraction, { passive: true });
  window.addEventListener("keydown", markUserInteraction);

  controls.addEventListener("start", markUserInteraction);
  controls.addEventListener("change", markUserInteraction);

  // ─── AR Manual Rotation ───────────────────────────────────────────────────
  let isDraggingAR = false;
  let previousMousePosition = { x: 0, y: 0 };

  renderer.domElement.addEventListener('pointerdown', (e) => {
    if (!appState.arSessionActive || !e.isPrimary) return;
    isDraggingAR = true;
    previousMousePosition = { x: e.clientX, y: e.clientY };
  });

  renderer.domElement.addEventListener('pointermove', (e) => {
    if (!appState.arSessionActive || !isDraggingAR || !e.isPrimary) return;
    
    const deltaMove = {
      x: e.clientX - previousMousePosition.x,
      y: e.clientY - previousMousePosition.y
    };
    
    // Reverse directions to feel natural (drag left -> earth spins left)
    worldRoot.rotation.y += deltaMove.x * 0.01;
    worldRoot.rotation.x += deltaMove.y * 0.01;
    
    previousMousePosition = { x: e.clientX, y: e.clientY };
  });

  renderer.domElement.addEventListener('pointerup', () => {
    isDraggingAR = false;
  });
  renderer.domElement.addEventListener('pointerout', () => {
    isDraggingAR = false;
  });

  // ─── AR Pinch to Zoom ─────────────────────────────────────────────────────
  let initialPinchDistance = null;
  let initialWorldScale = 1;

  renderer.domElement.addEventListener('touchstart', (e) => {
    if (!appState.arSessionActive) return;
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      initialPinchDistance = Math.sqrt(dx * dx + dy * dy);
      initialWorldScale = worldRoot.scale.x;
    }
  }, { passive: true });

  renderer.domElement.addEventListener('touchmove', (e) => {
    if (!appState.arSessionActive) return;
    if (e.touches.length === 2 && initialPinchDistance) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      const scaleFactor = distance / initialPinchDistance;
      const newScale = Math.max(0.1, Math.min(5.0, initialWorldScale * scaleFactor));
      
      worldRoot.scale.set(newScale, newScale, newScale);
    }
  }, { passive: true });

  renderer.domElement.addEventListener('touchend', (e) => {
    if (e.touches.length < 2) {
      initialPinchDistance = null;
    }
  });
}
