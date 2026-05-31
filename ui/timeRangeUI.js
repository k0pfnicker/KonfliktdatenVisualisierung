import {
  yearControl, yearSlider, playPauseBtn, animationRow,
  timeRangeBlock, timeRangeStartSlider, timeRangeEndSlider,
  timeRangeStartThumb, timeRangeEndThumb, dualRangeFill,
  dualRangeTrack,
} from "./uiElements.js";
import { syncSelectionControls } from "../dataLayer.js";
import { renderCurrentView } from "../rendering/viewController.js";
import { markUserInteraction } from "../core/idleRotation.js";

// ─── Year slider bounds ────────────────────────────────────────────────────────

/**
 * Update the year slider min/max/value.
 * @param {number} yearCount
 * @param {number|undefined} currentIndex
 */
export function updateYearSliderBounds(yearCount, currentIndex) {
  if (!yearSlider) return;
  const lastIndex = Math.max(0, yearCount - 1);
  yearSlider.min  = "0";
  yearSlider.max  = String(lastIndex);
  yearSlider.step = "1";
  if (typeof currentIndex === "number") {
    yearSlider.value = String(Math.max(0, Math.min(currentIndex, lastIndex)));
  }
}

// ─── Time range visuals ────────────────────────────────────────────────────────

/**
 * Recompute and apply fill / thumb positions for the dual range track.
 */
export function updateTimeRangeVisuals() {
  const sliderStart = Number.parseInt(timeRangeStartSlider?.value ?? "0", 10) || 0;
  const sliderEnd   = Number.parseInt(timeRangeEndSlider?.value   ?? "0", 10) || 0;
  const lastIndex   = Math.max(1, Number.parseInt(timeRangeEndSlider?.max ?? "0", 10) || 0);
  const start       = Math.max(0, Math.min(sliderStart, lastIndex));
  const end         = Math.max(0, Math.min(sliderEnd,   lastIndex));
  const startValue  = Math.min(start, end);
  const endValue    = Math.max(start, end);

  const track = `linear-gradient(90deg, #334155 ${startValue / lastIndex * 100}%, #3b82f6 ${startValue / lastIndex * 100}%, #3b82f6 ${endValue / lastIndex * 100}%, #334155 ${endValue / lastIndex * 100}%)`;

  if (timeRangeStartSlider) timeRangeStartSlider.style.background = track;
  if (timeRangeEndSlider)   timeRangeEndSlider.style.background   = track;
  if (dualRangeFill) {
    dualRangeFill.style.left  = `${startValue / lastIndex * 100}%`;
    dualRangeFill.style.width = `${Math.max(0, (endValue - startValue) / lastIndex * 100)}%`;
  }
  if (timeRangeStartThumb) timeRangeStartThumb.style.left = `${startValue / lastIndex * 100}%`;
  if (timeRangeEndThumb)   timeRangeEndThumb.style.left   = `${endValue   / lastIndex * 100}%`;
}

// ─── Commit selection ─────────────────────────────────────────────────────────

export function commitTimeRangeSelection() {
  syncSelectionControls();
  updateTimeRangeVisuals();
  renderCurrentView();
}

// ─── Temporal control visibility ──────────────────────────────────────────────

/**
 * Show/hide year slider vs. time range block depending on current mode/region.
 * @param {object} appState
 */
export function updateTemporalControlVisibility(appState) {
  const showRangeControl = appState.mode === "3d" && Boolean(appState.selectedRegion);

  if (yearControl)  yearControl.style.display  = showRangeControl ? "none"  : "block";
  if (timeRangeBlock) timeRangeBlock.style.display = showRangeControl ? "block" : "none";
  if (animationRow) animationRow.style.display = appState.mode === "2d" ? "none" : "flex";

  if (!showRangeControl) {
    if (timeRangeStartSlider) timeRangeStartSlider.disabled = true;
    if (timeRangeEndSlider)   timeRangeEndSlider.disabled   = true;
  }
}

// ─── Dual range thumb drag handling ───────────────────────────────────────────

/**
 * Attach custom pointer-drag handlers to the two visual thumbs that sit on top
 * of the underlying hidden range inputs.
 * @param {object} appState
 */
export function attachDualRangeThumbs(appState) {
  const { timeRangeStartThumb: startThumb, timeRangeEndThumb: endThumb } = {
    timeRangeStartThumb: document.getElementById("timeRangeStartThumb"),
    timeRangeEndThumb:   document.getElementById("timeRangeEndThumb"),
  };
  if (!startThumb || !endThumb || !timeRangeStartSlider || !timeRangeEndSlider || !dualRangeTrack) return;

  let active = null;

  function clientXToIndex(clientX) {
    const rect = dualRangeTrack.getBoundingClientRect();
    const pct  = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    const years = appState.availableYearsForFilter || appState.yearKeys || [];
    return Math.round(pct * Math.max(0, years.length - 1));
  }

  function onPointerDown(e) {
    e.preventDefault();
    markUserInteraction();
    active = e.currentTarget === startThumb ? "start" : "end";
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp, { once: true });
  }

  function onPointerMove(e) {
    if (!active) return;
    markUserInteraction();
    const idx = clientXToIndex(e.clientX);
    if (active === "start") {
      const endMax  = Number.parseInt(timeRangeEndSlider.max || "0", 10) || 0;
      timeRangeStartSlider.value = String(Math.min(idx, Math.max(0, endMax - 1)));
    } else {
      const startMin = Number.parseInt(timeRangeStartSlider.min || "0", 10) || 0;
      const last     = Number.parseInt(timeRangeEndSlider.max   || "0", 10) || 0;
      timeRangeEndSlider.value   = String(Math.max(idx, Math.min(last, startMin + 1)));
    }
    updateTimeRangeVisuals();
  }

  function onPointerUp() {
    markUserInteraction();
    window.removeEventListener("pointermove", onPointerMove);
    active = null;
    commitTimeRangeSelection();
  }

  startThumb.addEventListener("pointerdown", onPointerDown);
  endThumb.addEventListener("pointerdown", onPointerDown);
}
