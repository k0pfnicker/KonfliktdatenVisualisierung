import {
  regionSelect, regionAvailability,
  timeRangeStartSlider, timeRangeEndSlider,
  timeRangeStartLabel, timeRangeEndLabel,
} from "./uiElements.js";
import { markUserInteraction } from "../core/idleRotation.js";
import { setPlayback } from "./playbackUI.js";
import { updateTimeRangeVisuals, updateTemporalControlVisibility, updateYearSliderBounds } from "./timeRangeUI.js";
import { syncSelectionControls } from "../dataLayer.js";
import { getTopRowsForYears } from "../dataLayer.js";
import {
  animateCameraToRegion,
  buildBarsForRange,
  renderCurrentView,
} from "../rendering/viewController.js";
import { renderCountryInsightForYears } from "../rendering/viewController.js";
import { updateGlobalTimeLabel } from "../rendering/labelRenderer.js";
import { getSelectableYearLabel } from "../dataLayer.js";
import { updateRegionAvailability } from "../dataLayer.js";

/**
 * Handle the region <select> change event.
 * Filters available years, updates sliders, animates camera, and re-renders.
 * @param {object} appState
 * @param {Function} syncYearSliderValueLabel
 */
export function onRegionSelectChange(appState, syncYearSliderValueLabel) {
  markUserInteraction();
  setPlayback(false, appState);

  appState.selectedRegion = regionSelect.value;
  const regionData = appState.selectedRegion
    ? appState.regionMinMaxYears.get(appState.selectedRegion)
    : null;
  const availableYearsForRegion = regionData
    ? appState.yearKeys.filter((year) => regionData.years.has(year))
    : appState.yearKeys;

  if (appState.selectedRegion && availableYearsForRegion.length > 0 && timeRangeStartSlider && timeRangeEndSlider) {
    timeRangeStartSlider.min   = "0";
    timeRangeStartSlider.max   = String(availableYearsForRegion.length - 1);
    timeRangeStartSlider.step  = "1";
    timeRangeEndSlider.min     = "0";
    timeRangeEndSlider.max     = String(availableYearsForRegion.length - 1);
    timeRangeEndSlider.step    = "1";
    timeRangeStartSlider.value = "0";
    timeRangeEndSlider.value   = String(availableYearsForRegion.length - 1);
  }

  appState.availableYearsForFilter = availableYearsForRegion;
  updateYearSliderBounds(appState.yearKeys.length, appState.yearKeys.length - 1);

  if (appState.selectedRegion && availableYearsForRegion.length > 0) {
    syncSelectionControls();
    if (regionAvailability) {
      regionAvailability.textContent = `Verfügbarer Zeitraum: ${regionData.min}-${regionData.max}`;
    }
    if (timeRangeStartLabel) timeRangeStartLabel.textContent = String(availableYearsForRegion[0]);
    if (timeRangeEndLabel)   timeRangeEndLabel.textContent   = String(availableYearsForRegion[availableYearsForRegion.length - 1]);
    if (timeRangeStartSlider) timeRangeStartSlider.disabled  = false;
    if (timeRangeEndSlider)   timeRangeEndSlider.disabled    = false;
    updateTimeRangeVisuals();
  } else {
    syncSelectionControls();
    if (regionAvailability) {
      const minYear = appState.yearKeys[0] ?? "1996";
      const maxYear = appState.yearKeys[appState.yearKeys.length - 1] ?? "2026";
      regionAvailability.textContent = `Verfügbarer Zeitraum: ${minYear}-${maxYear}`;
    }
    if (timeRangeStartSlider) timeRangeStartSlider.disabled = true;
    if (timeRangeEndSlider)   timeRangeEndSlider.disabled   = true;
  }

  updateTemporalControlVisibility(appState);
  animateCameraToRegion(appState.selectedRegion || "");

  if (appState.selectedRegion && availableYearsForRegion.length > 0) {
    const years = availableYearsForRegion;
    const availableCountries = getTopRowsForYears(years).map((row) => row.country);
    if (!appState.selectedCountry || !availableCountries.includes(appState.selectedCountry)) {
      appState.selectedCountry = availableCountries[0] ?? null;
    }
    buildBarsForRange(years[0], years[years.length - 1]);
    renderCountryInsightForYears(years, appState.selectedCountry);
    updateGlobalTimeLabel(getSelectableYearLabel(years));
  } else {
    renderCurrentView();
    syncYearSliderValueLabel();
  }
}
