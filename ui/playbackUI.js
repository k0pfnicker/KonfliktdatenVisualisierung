import { playPauseBtn, playStatus, yearSlider, timeRangeStartSlider, timeRangeEndSlider } from "./uiElements.js";
import { formatNumber, getMetricValue } from "../appUtils.js";
import { clampIndex } from "../appUtils.js";
import { getSelectableYears, aggregateRowsForYears } from "../dataLayer.js";
import { renderForYear } from "../rendering/viewController.js";
import { spawnNumberPopup } from "../core/animationLoop.js";

// ─── Playback ─────────────────────────────────────────────────────────────────

/**
 * Set play/pause state on the application.
 * @param {boolean} isPlaying
 * @param {object} appState
 */
export function setPlayback(isPlaying, appState) {
  appState.isPlaying = isPlaying;
  appState.playAccumulator = 0;
  if (playPauseBtn) playPauseBtn.textContent = isPlaying ? "Stop" : "Start";
  if (playStatus) {
    playStatus.textContent = isPlaying
      ? `Zeitleiste: Wiedergabe (${appState.playStepSeconds.toFixed(1)}s/Jahr)`
      : "Zeitleiste: Pause";
  }
}

// ─── Year advancement ─────────────────────────────────────────────────────────

/**
 * Advance the visualization by one time step.
 * In year-mode: steps the year slider forward.
 * In region-mode: shifts the dual range window by one index.
 * @param {object} appState
 * @param {Function} syncYearSliderValueLabel
 * @param {Function} updateTimeRangeVisuals
 * @param {Function} syncSelectionControls
 * @param {Function} renderCurrentView
 */
export function advanceYear(appState, syncYearSliderValueLabel, updateTimeRangeVisuals, syncSelectionControls, renderCurrentView) {
  if (!appState.availableYearsForFilter.length) return;

  const selectableYears = appState.availableYearsForFilter;
  if (!selectableYears.length) return;

  if (!appState.selectedRegion) {
    // ── Year mode ──────────────────────────────────────────────────────────────
    const currentIdx = Number.parseInt(yearSlider.value, 10) || 0;
    const nextIdx = (currentIdx + 1) % selectableYears.length;

    // Snapshot previous bar values
    const prevMap = new Map();
    for (const mesh of appState.barMeshes) {
      if (mesh.userData?.country) {
        prevMap.set(mesh.userData.country, getMetricValue(mesh.userData));
      }
    }

    yearSlider.value = String(nextIdx);
    const year = selectableYears[nextIdx];
    if (year) {
      renderForYear(year);
      syncYearSliderValueLabel();

      // Compare and spawn delta popups
      const changes = [];
      for (const mesh of appState.barMeshes) {
        if (!mesh.userData?.country) continue;
        const newVal = getMetricValue(mesh.userData);
        const oldVal = prevMap.get(mesh.userData.country) || 0;
        const delta = newVal - oldVal;
        if (Math.abs(delta) >= appState.popupThreshold) changes.push({ country: mesh.userData.country, delta });
      }
      changes.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
      for (const ch of changes.slice(0, appState.popupMaxVisible)) {
        const mesh = appState.barMeshes.find((m) => m.userData?.country === ch.country);
        if (mesh?.userData?.pos) {
          const sign = ch.delta > 0 ? "+" : "";
          const color = ch.delta > 0 ? "#ef4444" : "#86efac";
          spawnNumberPopup(appState, mesh.userData.pos, `${sign}${formatNumber(ch.delta)}`, color);
        }
      }
    }
  } else {
    // ── Region range mode ──────────────────────────────────────────────────────
    const years = getSelectableYears();
    const lastIndex = Math.max(0, years.length - 1);
    const s = clampIndex(Number.parseInt(timeRangeStartSlider.value, 10) || 0, 0, lastIndex);
    const e = clampIndex(Number.parseInt(timeRangeEndSlider.value, 10) || 0, 0, lastIndex);

    const prevYears = years.slice(s, e + 1);
    const prevAgg = aggregateRowsForYears(prevYears);

    let newS = s + 1;
    let newE = e + 1;
    if (newE > lastIndex) { newS = 0; newE = Math.min(newS + (e - s), lastIndex); }

    timeRangeStartSlider.value = String(newS);
    timeRangeEndSlider.value   = String(newE);
    syncSelectionControls();
    updateTimeRangeVisuals();
    renderCurrentView();

    // Compare and spawn delta popups
    const newYears = years.slice(newS, newE + 1);
    const newAgg = aggregateRowsForYears(newYears);
    const rangeChanges = [];
    for (const [country, newRow] of newAgg) {
      const prevRow = prevAgg.get(country) ?? { eventsTotal: 0, fatalitiesTotal: 0 };
      const delta = appState.metric === "fatalities"
        ? newRow.fatalitiesTotal - prevRow.fatalitiesTotal
        : newRow.eventsTotal - prevRow.eventsTotal;
      if (Math.abs(delta) >= appState.popupThreshold) rangeChanges.push({ country, delta });
    }
    rangeChanges.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
    for (const ch of rangeChanges.slice(0, appState.popupMaxVisible)) {
      const mesh = appState.barMeshes.find((m) => m.userData?.country === ch.country);
      if (mesh?.userData?.pos) {
        const sign = ch.delta > 0 ? "+" : "";
        const color = ch.delta > 0 ? "#ef4444" : "#86efac";
        spawnNumberPopup(appState, mesh.userData.pos, `${sign}${formatNumber(ch.delta)}`, color);
      }
    }
  }
}
