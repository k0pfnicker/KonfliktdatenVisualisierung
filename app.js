/**
 * app.js — Entry point
 *
 * Responsibility: Bootstrap the application.
 * - Create shared state
 * - Initialize the appContext (scene, DOM refs)
 * - Load data
 * - Register UI event handlers
 * - Start the animation loop
 *
 * All logic is delegated to focused modules in core/, ui/, ar/, and rendering/.
 */

import {
  buildNoCacheUrl,
  parseCsvLine,
  toInt,
  setAppState,
} from "./appUtils.js";
import {
  addRowToYearlyAggregation,
  addParticleRow,
  loadEventTypeSummary,
  setDataState,
  syncSelectionControls,
  syncSliderBounds,
  updateRegionAvailability,
} from "./dataLayer.js";
import { initAppContext } from "./appContext.js";
import { mountRendererAndLoadGlobe, scene, camera, renderer, controls, ambient, camLight, globeRadius, earthModel, map2D, reference2DGroup, chartGroup, raycaster, mouse, haloMesh, worldRoot } from "./core/sceneSetup.js";
import { markUserInteraction } from "./core/idleRotation.js";
import { startAnimationLoop } from "./core/animationLoop.js";
import { updateArSupportState, startArSession } from "./ar/arSession.js";
import { setMode, updateDesktopDebugUI } from "./ui/controlsUI.js";
import { setPlayback, advanceYear } from "./ui/playbackUI.js";
import { updateTemporalControlVisibility, updateTimeRangeVisuals, attachDualRangeThumbs, updateYearSliderBounds, commitTimeRangeSelection } from "./ui/timeRangeUI.js";
import { registerEventHandlers } from "./ui/eventHandlers.js";
import { renderForYear, renderCurrentView } from "./rendering/viewController.js";
import { clear2DOverlay } from "./rendering/overlayRenderer.js";
import {
  container, yearSlider, yearLabel, info,
  mode3dBtn, mode2dBtn, playPauseBtn, playStatus,
  metricSelect, regionSelect, regionToggleRow, regionAvailability,
  dualRangeTrack, dualRangeFill,
  timeRangeStartThumb, timeRangeEndThumb,
  timeRangeStartSlider, timeRangeEndSlider,
  timeRangeStartLabel, timeRangeEndLabel,
  timeRangeStatus, legendTitle, legendRange,
  insightTitle, insightList, tooltip,
} from "./ui/uiElements.js";

// ─── Paths ────────────────────────────────────────────────────────────────────

const DATA_PATH               = "./data/spike_monthly_country_recent.csv";
const EVENT_TYPE_SUMMARY_PATH = "./data/event_type_year_country_summary.csv";
const PARTICLE_DATA_PATH      = "./data/spike_particle_swarm.csv";

// ─── Application state ────────────────────────────────────────────────────────

const state = {
  yearKeys: [],
  yearKeySet: new Set(),
  availableYearsForFilter: [],
  yearlyByYear: new Map(),
  eventTypeByYearCountry: new Map(),
  monthlyByYearCountry: new Map(),
  totalsByYear: new Map(),
  barMeshes: [],
  allCountriesInDataset: new Set(),
  totalRows: 0,
  autoFollowLatest: true,
  mode: "3d",
  metric: "events",
  currentYear: null,
  selectedCountry: null,
  selectedRegion: "",
  regionMinMaxYears: new Map(),
  selectedTimeRange: { startIndex: 0, endIndex: 0 },
  focusPod: { sprite: null, pinned: false },
  globalMaxEvents: 0,
  globalMaxFatalities: 0,
  numberPopups: [],
  popupThreshold: 1,
  popupMaxVisible: 5,
  playStepSeconds: 3.0,
  isPlaying: false,
  playAccumulator: 0,
  desktopDebug: false,
  arSupported: false,
  arSessionActive: false,
};

// Read URL params
const searchParams = new URLSearchParams(window.location.search);
state.desktopDebug = searchParams.has("desktopDebug") && searchParams.get("desktopDebug") !== "0";

// Expose state globally (used by dataLayer as a bridge to avoid circular deps)
globalThis.__webxrState = state;
// Expose slider elements for idleRotation restore callbacks
globalThis.__appSliders = { yearSlider, timeRangeStartSlider, timeRangeEndSlider };

setAppState(state);
setDataState(state);

// ─── Bootstrap Three.js scene ─────────────────────────────────────────────────

mountRendererAndLoadGlobe(container);

// Initialize the shared appContext so other modules can import from it
initAppContext({
  state, container,
  yearSlider, yearLabel, info,
  mode3dBtn, mode2dBtn, playPauseBtn, playStatus,
  metricSelect, regionSelect, regionToggleRow, regionAvailability,
  dualRangeTrack, dualRangeFill,
  timeRangeStartThumb, timeRangeEndThumb,
  timeRangeStartSlider, timeRangeEndSlider,
  timeRangeStartLabel, timeRangeEndLabel,
  timeRangeStatus, legendTitle, legendRange,
  insightTitle, insightList, tooltip,
  scene, camera, renderer, controls, ambient, camLight,
  globeRadius, earthModel, map2D, reference2DGroup,
  chartGroup, raycaster, mouse, haloMesh,
  currentLabelSprite: null,
  currentTimeLabelSprite: null,
});

// ─── Initial UI state ─────────────────────────────────────────────────────────

document.body.classList.add("controls-collapsed");

// ─── Year slider value label ──────────────────────────────────────────────────

function syncYearSliderValueLabel() {
  const yearSliderValue = document.getElementById("yearSliderValue");
  if (!yearSliderValue || !yearSlider) return;
  const idx   = Number.parseInt(yearSlider.value, 10) || 0;
  
  let years = state.yearKeys;
  if (state.mode !== "2d" && state.availableYearsForFilter.length > 0) {
    years = state.availableYearsForFilter;
  }
  
  yearSliderValue.textContent = String(years[idx] ?? "-");
}

// ─── Data loading ─────────────────────────────────────────────────────────────

async function init() {
  const summaryPromise = loadEventTypeSummary(EVENT_TYPE_SUMMARY_PATH);

  const particlePromise = fetch(buildNoCacheUrl(PARTICLE_DATA_PATH), { cache: "no-store" })
    .then(r => r.ok ? r.text() : "")
    .then(csvText => {
      if (!csvText) return;
      const lines = csvText.split(/\r?\n/).filter(l => l.trim().length > 0);
      const headers = parseCsvLine(lines[0] || "");
      for (let i = 1; i < lines.length; i++) {
        const values = parseCsvLine(lines[i]);
        if (values.length !== headers.length) continue;
        const row = Object.fromEntries(headers.map((h, idx) => [h, values[idx]]));
        addParticleRow({
          year: toInt(row.year),
          month: toInt(row.month),
          lat: Number.parseFloat(row.centroid_latitude),
          lon: Number.parseFloat(row.centroid_longitude),
          eventsTotal: toInt(row.events_total),
          fatalitiesTotal: toInt(row.fatalities_total)
        });
      }
    })
    .catch(err => console.error("Error loading particle data:", err));

  const response = await fetch(buildNoCacheUrl(DATA_PATH), { cache: "no-store" });
  if (!response.ok) throw new Error("CSV konnte nicht geladen werden");

  const totalBytes = Number.parseInt(response.headers.get("content-length") ?? "0", 10) || 0;

  // Fallback for browsers without stream support
  if (!response.body) {
    const csvText = await response.text();
    const lines   = csvText.split(/\r?\n/).filter((line) => line.trim().length > 0);
    const headers = parseCsvLine(lines[0] ?? "");
    for (let i = 1; i < lines.length; i += 1) {
      const values = parseCsvLine(lines[i]);
      if (values.length !== headers.length) continue;
      const row = Object.fromEntries(headers.map((h, idx) => [h, values[idx]]));
      addRowToYearlyAggregation({ year: toInt(row.year), month: toInt(row.month), region: row.region, country: row.country, eventsTotal: toInt(row.events_total), fatalitiesTotal: toInt(row.fatalities_total) });
    }
    syncSelectionControls();
    await summaryPromise;
    await particlePromise;
    yearSlider.value = String(Math.max(0, state.availableYearsForFilter.length - 1));
    renderForYear(state.availableYearsForFilter[Number.parseInt(yearSlider.value, 10)]);
    if (info) info.textContent = state.yearKeys.length > 0
      ? `Geladen: ${state.totalRows} Zeilen | Jahre: ${state.yearKeys[0]}-${state.yearKeys[state.yearKeys.length - 1]}`
      : `Geladen: ${state.totalRows} Zeilen`;
    return;
  }

  // Streaming read
  const reader  = response.body.getReader();
  const decoder = new TextDecoder();
  let bytesRead = 0;
  let pending   = "";
  let headers   = null;
  let latestLoadedYear = null;
  let lastUiUpdate     = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    bytesRead += value.length;
    pending   += decoder.decode(value, { stream: true });

    const lines = pending.split(/\r?\n/);
    pending = lines.pop() ?? "";

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      if (!headers) { headers = parseCsvLine(trimmed); continue; }
      const values = parseCsvLine(trimmed);
      if (values.length !== headers.length) continue;
      const row = Object.fromEntries(headers.map((h, idx) => [h, values[idx]]));
      latestLoadedYear = addRowToYearlyAggregation({ year: toInt(row.year), month: toInt(row.month), region: row.region, country: row.country, eventsTotal: toInt(row.events_total), fatalitiesTotal: toInt(row.fatalities_total) });
    }

    const now = performance.now();
    if (now - lastUiUpdate > 120 && state.yearKeys.length > 0) {
      syncSliderBounds();
      if (state.autoFollowLatest && latestLoadedYear) {
        const idx = state.yearKeys.indexOf(latestLoadedYear);
        if (idx >= 0) {
          yearSlider.value = String(idx);
          renderForYear(latestLoadedYear);
          syncYearSliderValueLabel();
        }
      }
      const percent = totalBytes > 0 ? Math.min(100, Math.round((bytesRead / totalBytes) * 100)) : null;
      if (info) info.textContent = percent === null
        ? `Laedt... ${state.totalRows} Zeilen`
        : `Laedt... ${state.totalRows} Zeilen (${percent}%)`;
      lastUiUpdate = now;
    }
  }

  // Process any remaining tail
  const tail = pending.trim();
  if (tail && headers) {
    const values = parseCsvLine(tail);
    if (values.length === headers.length) {
      const row = Object.fromEntries(headers.map((h, idx) => [h, values[idx]]));
      latestLoadedYear = addRowToYearlyAggregation({ year: toInt(row.year), month: toInt(row.month), region: row.region, country: row.country, eventsTotal: toInt(row.events_total), fatalitiesTotal: toInt(row.fatalities_total) });
    }
  }

  await summaryPromise;
  await particlePromise;

  if (state.yearKeys.length > 0) {
    state.availableYearsForFilter = state.yearKeys;
    updateYearSliderBounds(state.yearKeys.length, state.yearKeys.length - 1);
    syncSelectionControls();
    if (state.autoFollowLatest && latestLoadedYear) {
      const idx = state.availableYearsForFilter.indexOf(latestLoadedYear);
      yearSlider.value = String(Math.max(0, idx));
      renderForYear(latestLoadedYear);
    } else {
      const idx  = Number.parseInt(yearSlider.value, 10) || 0;
      const year = state.availableYearsForFilter[Math.min(idx, state.availableYearsForFilter.length - 1)];
      renderForYear(year);
    }
  }

  // Populate region dropdown
  const regions = Array.from(state.regionMinMaxYears.keys()).sort();
  for (const region of regions) {
    const option       = document.createElement("option");
    option.value       = region;
    option.textContent = region;
    regionSelect.appendChild(option);
  }
  updateRegionAvailability();
  syncSelectionControls();
  syncYearSliderValueLabel();

  if (info) info.textContent = state.yearKeys.length > 0
    ? `Fertig: ${state.totalRows} Zeilen geladen | Jahre: ${state.yearKeys[0]}-${state.yearKeys[state.yearKeys.length - 1]}`
    : `Fertig: ${state.totalRows} Zeilen geladen`;
}

// ─── Wire up everything ───────────────────────────────────────────────────────

setMode("3d", state, worldRoot, {
  markUserInteraction,
  updateTemporalControlVisibility: () => updateTemporalControlVisibility(state),
  updateDesktopDebugUI: () => updateDesktopDebugUI(state),
  renderCurrentView,
  clear2DOverlay,
});
setPlayback(false, state);
updateDesktopDebugUI(state);
updateArSupportState(state);
attachDualRangeThumbs(state);

registerEventHandlers(state, worldRoot, {
  syncYearSliderValueLabel,
  updateTemporalControlVisibility,
  clear2DOverlay,
  startArSession: () => startArSession(state, worldRoot),
});

// ─── Start ────────────────────────────────────────────────────────────────────

init().then(() => {
  startAnimationLoop(state, controls, {
    advanceYear: () => advanceYear(state, syncYearSliderValueLabel, updateTimeRangeVisuals, syncSelectionControls, renderCurrentView),
    commitTimeRangeSelection,
    setPlayback: (isPlaying) => setPlayback(isPlaying, state),
    syncSelectionControls,
    updateTimeRangeVisuals,
    syncYearSliderValueLabel,
    renderCurrentView,
  });
}).catch((err) => {
  if (info) info.textContent = "Fehler beim Laden";
  console.error(err);
});
