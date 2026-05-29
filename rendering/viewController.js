/**
 * viewController.js
 * Orchestrates the rendering subsystems: decides what to render and delegates
 * to barRenderer, overlayRenderer, labelRenderer, and insightRendering.
 */
import { state } from "../appContext.js";
import { getYearsForCurrentView, getTopRowsForYears, getSelectableYearLabel, getSelectedRangeYears, getSelectedYearFromSlider } from "../dataLayer.js";
import { buildBarsForYear, buildBarsForRange } from "./barRenderer.js";
import { build2DMapOverlay, clear2DOverlay } from "./overlayRenderer.js";
import { updateGlobalTimeLabel, update3DLabel } from "./labelRenderer.js";
import { renderCountryInsight, renderCountryInsightForYears } from "../insightRendering.js";
import { openFocusPod, closeFocusPod, createFocusPod } from "./focusPod.js";
import { animateCameraToRegion } from "./cameraAnimation.js";

// ─── View rendering ───────────────────────────────────────────────────────────

/**
 * Render the 3D or 2D view for a single year.
 * @param {number} year
 */
export function renderForYear(year) {
  if (!year) return;
  if (state.mode === "2d") {
    clear2DOverlay();
    build2DMapOverlay([year]);
    renderCountryInsight(year, state.selectedCountry);
    return;
  }
  buildBarsForYear(year);
  renderCountryInsight(year, state.selectedCountry);
}

/**
 * Re-render whatever is currently selected (year slider or region range).
 */
export function renderCurrentView() {
  if (state.mode === "2d") {
    const years = getYearsForCurrentView();
    if (years.length === 0) return;
    const availableCountries = getTopRowsForYears(years).map((row) => row.country);
    if (!state.selectedCountry || !availableCountries.includes(state.selectedCountry)) {
      state.selectedCountry = availableCountries[0] ?? null;
    }
    build2DMapOverlay(years);
    updateGlobalTimeLabel(getSelectableYearLabel(years));
    return;
  }

  if (state.selectedRegion) {
    const years = getSelectedRangeYears();
    if (years.length === 0) return;
    const availableCountries = getTopRowsForYears(years).map((row) => row.country);
    if (!state.selectedCountry || !availableCountries.includes(state.selectedCountry)) {
      state.selectedCountry = availableCountries[0] ?? null;
    }
    buildBarsForRange(years[0], years[years.length - 1]);
    renderCountryInsightForYears(years, state.selectedCountry);
    updateGlobalTimeLabel(getSelectableYearLabel(years));
    return;
  }

  const year = getSelectedYearFromSlider();
  if (year) {
    renderForYear(year);
    updateGlobalTimeLabel(String(year));
  }
}

// Re-export collaborators so app.js and event handlers can import from one place
export {
  update3DLabel,
  updateGlobalTimeLabel,
  openFocusPod,
  closeFocusPod,
  createFocusPod,
  animateCameraToRegion,
  buildBarsForRange,
  renderCountryInsight,
  renderCountryInsightForYears,
  clear2DOverlay,
};
