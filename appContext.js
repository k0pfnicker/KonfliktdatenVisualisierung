/**
 * appContext.js
 * Shared singleton context for Three.js scene objects and DOM elements.
 *
 * DOM element references are sourced from ui/uiElements.js.
 * Three.js scene objects are sourced from core/sceneSetup.js.
 * This module exists as the shared mutable bridge that all other modules
 * import from once initAppContext() has been called.
 */

// ─── DOM elements (re-exported from uiElements) ───────────────────────────────
export let state = null;
export let container            = null;
export let yearSlider           = null;
export let yearLabel            = null;
export let info                 = null;
export let mode3dBtn            = null;
export let mode2dBtn            = null;
export let playPauseBtn         = null;
export let playStatus           = null;
export let metricEventsBtn        = null;
export let metricFatalitiesBtn    = null;
export let regionSelect           = null;
export let regionToggleRow      = null;
export let regionAvailability   = null;
export let dualRangeTrack       = null;
export let dualRangeFill        = null;
export let timeRangeStartThumb  = null;
export let timeRangeEndThumb    = null;
export let timeRangeStartSlider = null;
export let timeRangeEndSlider   = null;
export let timeRangeStartLabel  = null;
export let timeRangeEndLabel    = null;
export let timeRangeStatus      = null;
export let legendTitle          = null;
export let legendRange          = null;
export let insightTitle         = null;
export let insightList          = null;
export let tooltip              = null;

// ─── Three.js objects ─────────────────────────────────────────────────────────
export let scene                = null;
export let camera               = null;
export let renderer             = null;
export let controls             = null;
export let ambient              = null;
export let camLight             = null;
export let globeRadius          = 100;
export let earthModel           = null;
export let map2D                = null;
export let reference2DGroup     = null;
export let chartGroup           = null;
export let raycaster            = null;
export let mouse                = null;
export let haloMesh             = null;
export let currentLabelSprite   = null;
export let currentTimeLabelSprite = null;

// ─── Initializer ─────────────────────────────────────────────────────────────

export function initAppContext(values) {
  state = values.state;

  container            = values.container;
  yearSlider           = values.yearSlider;
  yearLabel            = values.yearLabel;
  info                 = values.info;
  mode3dBtn            = values.mode3dBtn;
  mode2dBtn            = values.mode2dBtn;
  playPauseBtn         = values.playPauseBtn;
  playStatus           = values.playStatus;
  metricEventsBtn      = values.metricEventsBtn;
  metricFatalitiesBtn  = values.metricFatalitiesBtn;
  regionSelect         = values.regionSelect;
  regionToggleRow      = values.regionToggleRow;
  regionAvailability   = values.regionAvailability;
  dualRangeTrack       = values.dualRangeTrack;
  dualRangeFill        = values.dualRangeFill;
  timeRangeStartThumb  = values.timeRangeStartThumb;
  timeRangeEndThumb    = values.timeRangeEndThumb;
  timeRangeStartSlider = values.timeRangeStartSlider;
  timeRangeEndSlider   = values.timeRangeEndSlider;
  timeRangeStartLabel  = values.timeRangeStartLabel;
  timeRangeEndLabel    = values.timeRangeEndLabel;
  timeRangeStatus      = values.timeRangeStatus;
  legendTitle          = values.legendTitle;
  legendRange          = values.legendRange;
  insightTitle         = values.insightTitle;
  insightList          = values.insightList;
  tooltip              = values.tooltip;

  scene                = values.scene;
  camera               = values.camera;
  renderer             = values.renderer;
  controls             = values.controls;
  ambient              = values.ambient;
  camLight             = values.camLight;
  globeRadius          = values.globeRadius;
  earthModel           = values.earthModel;
  map2D                = values.map2D;
  reference2DGroup     = values.reference2DGroup;
  chartGroup           = values.chartGroup;
  raycaster            = values.raycaster;
  mouse                = values.mouse;
  haloMesh             = values.haloMesh;
  currentLabelSprite   = values.currentLabelSprite;
  currentTimeLabelSprite = values.currentTimeLabelSprite;
}