/**
 * uiElements.js
 * Single source of truth for all DOM element references.
 * Import from here instead of using getElementById scattered across files.
 */

export const container            = document.getElementById("container");
export const yearSlider           = document.getElementById("yearSlider");
export const yearControl          = document.getElementById("yearControl");
export const yearLabel            = document.getElementById("yearLabel");
export const info                 = document.getElementById("info");
export const mode3dBtn            = document.getElementById("mode3dBtn");
export const mode2dBtn            = document.getElementById("mode2dBtn");
export const playPauseBtn         = document.getElementById("playPauseBtn");
export const arBtn                = document.getElementById("arBtn");
export const arStatus             = document.getElementById("arStatus");
export const playStatus           = document.getElementById("playStatus");
export const metricSelect         = document.getElementById("metricSelect");
export const metricToggleRow      = metricSelect?.closest(".toggle-row") ?? null;
export const regionSelect         = document.getElementById("regionSelect");
export const regionToggleRow      = regionSelect?.closest(".toggle-row") ?? null;
export const desktopDebugBtn      = document.getElementById("desktopDebugBtn");
export const debugStatus          = document.getElementById("debugStatus");
export const regionAvailability   = document.getElementById("regionAvailability");
export const dualRangeTrack       = document.getElementById("dualRangeTrack");
export const dualRangeFill        = document.getElementById("dualRangeFill");
export const timeRangeStartThumb  = document.getElementById("timeRangeStartThumb");
export const timeRangeEndThumb    = document.getElementById("timeRangeEndThumb");
export const timeRangeStartSlider = document.getElementById("timeRangeStartSlider");
export const timeRangeEndSlider   = document.getElementById("timeRangeEndSlider");
export const timeRangeStartLabel  = document.getElementById("timeRangeStartLabel");
export const timeRangeEndLabel    = document.getElementById("timeRangeEndLabel");
export const timeRangeStatus      = document.getElementById("timeRangeStatus");
export const timeRangeBlock       = document.querySelector(".range-block");
export const controlToast         = document.getElementById("controlToast");
export const uiToggleBtn          = document.getElementById("uiToggleBtn");
export const tooltip              = document.getElementById("tooltip");
export const legendTitle          = document.getElementById("legendTitle");
export const legendRange          = document.getElementById("legendRange");
export const insightTitle         = document.getElementById("insightTitle");
export const insightList          = document.getElementById("insightList");
export const legendToggleBtn      = document.getElementById("legendToggleBtn");
export const legendPanel          = document.getElementById("legendPanel");
export const legend2DInfo         = document.getElementById("legend2DInfo");
