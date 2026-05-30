import {
  clampIndex,
  getMetricValue,
  parseCsvLine,
  toInt,
  yearCountryKey,
} from "./appUtils.js";
import {
  dualRangeFill,
  playPauseBtn,
  playStatus,
  regionAvailability,
  timeRangeEndThumb,
  timeRangeEndLabel,
  timeRangeEndSlider,
  timeRangeStartThumb,
  timeRangeStartLabel,
  timeRangeStartSlider,
  timeRangeStatus,
  yearSlider,
} from "./appContext.js";

let dataState = null;

export function setDataState(nextState) {
  dataState = nextState;
  if (!dataState.particlesByYear) {
    dataState.particlesByYear = new Map();
  }
}

export function getSelectableYears() {
  const appState = globalThis.__webxrState;
  return appState?.selectedRegion ? appState.availableYearsForFilter : appState?.yearKeys ?? [];
}

export function getSelectedYearFromSlider() {
  if (!yearSlider) {
    return null;
  }

  const idx = Number.parseInt(yearSlider.value, 10) || 0;
  const years = getSelectableYears();
  return years[idx] ?? null;
}

export function getSelectedRangeYears() {
  if (!timeRangeStartSlider || !timeRangeEndSlider) {
    return [];
  }

  const years = getSelectableYears();
  const appState = globalThis.__webxrState;

  if (!appState?.selectedRegion || years.length === 0) {
    const year = getSelectedYearFromSlider();
    return year ? [year] : [];
  }

  const startIdx = clampIndex(Number.parseInt(timeRangeStartSlider.value, 10) || 0, 0, years.length - 1);
  const endIdx = clampIndex(Number.parseInt(timeRangeEndSlider.value, 10) || years.length - 1, 0, years.length - 1);
  const normalizedStart = Math.min(startIdx, endIdx);
  const normalizedEnd = Math.max(startIdx, endIdx);
  return years.slice(normalizedStart, normalizedEnd + 1);
}

export function getSelectableYearLabel(years) {
  if (!years || years.length === 0) {
    return "-";
  }

  if (years.length === 1) {
    return String(years[0]);
  }

  return `${years[0]}-${years[years.length - 1]}`;
}

export function aggregateRowsForYears(years) {
  const aggregated = new Map();
  const selectedRegion = globalThis.__webxrState?.selectedRegion;

  for (const year of years) {
    const map = globalThis.__webxrState?.yearlyByYear.get(year);
    if (!map) continue;

    for (const row of map.values()) {
      if (selectedRegion && row.region !== selectedRegion) {
        continue;
      }

      const existing = aggregated.get(row.country) ?? {
        country: row.country,
        region: row.region,
        eventsTotal: 0,
        fatalitiesTotal: 0,
      };

      existing.eventsTotal += row.eventsTotal;
      existing.fatalitiesTotal += row.fatalitiesTotal;
      aggregated.set(row.country, existing);
    }
  }

  return aggregated;
}

export function getTopRowsForYears(years) {
  return Array.from(aggregateRowsForYears(years).values())
    .sort((a, b) => getMetricValue(b) - getMetricValue(a));
}

export function getCountryAggregateForYears(years, country) {
  return aggregateRowsForYears(years).get(country) ?? null;
}

export function getTotalsForYears(years) {
  return years.reduce(
    (totals, year) => {
      const entry = globalThis.__webxrState?.totalsByYear.get(year);
      if (entry) {
        totals.eventsTotal += entry.eventsTotal;
        totals.fatalitiesTotal += entry.fatalitiesTotal;
      }
      return totals;
    },
    { eventsTotal: 0, fatalitiesTotal: 0 }
  );
}

export function getTopEventTypesForYears(years, country) {
  const aggregated = new Map();

  for (const year of years) {
    const key = yearCountryKey(year, country);
    const rows = globalThis.__webxrState?.eventTypeByYearCountry.get(key) ?? [];

    for (const row of rows) {
      const existing = aggregated.get(row.eventType) ?? {
        eventType: row.eventType,
        eventsTotal: 0,
        fatalitiesTotal: 0,
      };

      existing.eventsTotal += row.eventsTotal;
      existing.fatalitiesTotal += row.fatalitiesTotal;
      aggregated.set(row.eventType, existing);
    }
  }

  return Array.from(aggregated.values())
    .sort((a, b) => getMetricValue(b) - getMetricValue(a))
    .slice(0, 3);
}

export function getEventTypesForYears(years, country) {
  const aggregated = new Map();

  for (const year of years) {
    const key = yearCountryKey(year, country);
    const rows = globalThis.__webxrState?.eventTypeByYearCountry.get(key) ?? [];

    for (const row of rows) {
      const existing = aggregated.get(row.eventType) ?? {
        eventType: row.eventType,
        eventsTotal: 0,
        fatalitiesTotal: 0,
      };

      existing.eventsTotal += row.eventsTotal;
      existing.fatalitiesTotal += row.fatalitiesTotal;
      aggregated.set(row.eventType, existing);
    }
  }

  return Array.from(aggregated.values()).sort((a, b) => getMetricValue(b) - getMetricValue(a));
}

export function addParticleRow(row) {
  const year = row.year;
  if (!dataState) throw new Error("Data state not initialized");

  if (!dataState.particlesByYear) {
    dataState.particlesByYear = new Map();
  }

  if (!dataState.particlesByYear.has(year)) {
    dataState.particlesByYear.set(year, []);
  }

  dataState.particlesByYear.get(year).push({
    lat: row.lat,
    lon: row.lon,
    eventsTotal: row.eventsTotal,
    fatalitiesTotal: row.fatalitiesTotal,
  });
}

function isParticleInRegion(lat, lon, region) {
  switch (region) {
    case 'South America':
      return lat >= -60 && lat <= 15 && lon >= -95 && lon <= -34;
    case 'North America':
      return lat > 15 && lat <= 85 && lon >= -170 && lon <= -50;
    case 'Europe':
      return lat >= 35 && lat <= 75 && lon >= -25 && lon <= 45;
    case 'Middle East':
      return lat >= 12 && lat <= 42 && lon >= 26 && lon <= 63;
    case 'Africa':
      if (lat >= 12 && lat <= 42 && lon >= 35 && lon <= 63) return false;
      return lat >= -40 && lat <= 38 && lon >= -20 && lon <= 55;
    case 'Asia':
      if (lat >= 12 && lat <= 42 && lon >= 26 && lon <= 63) return false;
      return lat >= -15 && lat <= 85 && lon >= 45 && lon <= 180;
    default:
      return true;
  }
}

export function getParticlesForYears(years) {
  const particles = [];
  const region = globalThis.__webxrState?.selectedRegion;

  for (const year of years) {
    const yearParticles = globalThis.__webxrState?.particlesByYear?.get(year) || [];
    if (region) {
      for (const p of yearParticles) {
        if (isParticleInRegion(p.lat, p.lon, region)) {
          particles.push(p);
        }
      }
    } else {
      particles.push(...yearParticles);
    }
  }
  return particles;
}


export function addRowToYearlyAggregation(row) {
  const year = row.year;

  if (!dataState) {
    throw new Error("Data state not initialized");
  }

  if (!dataState.allCountriesInDataset) {
    dataState.allCountriesInDataset = new Set();
  }
  dataState.allCountriesInDataset.add(row.country);

  if (!dataState.yearlyByYear.has(year)) {
    dataState.yearlyByYear.set(year, new Map());
  }

  const countryMap = dataState.yearlyByYear.get(year);
  const existing = countryMap.get(row.country) ?? {
    country: row.country,
    region: row.region,
    eventsTotal: 0,
    fatalitiesTotal: 0,
  };

  existing.eventsTotal += row.eventsTotal;
  existing.fatalitiesTotal += row.fatalitiesTotal;
  countryMap.set(row.country, existing);

  if (existing.eventsTotal > dataState.globalMaxEvents) {
    dataState.globalMaxEvents = existing.eventsTotal;
  }

  if (existing.fatalitiesTotal > dataState.globalMaxFatalities) {
    dataState.globalMaxFatalities = existing.fatalitiesTotal;
  }

  if (!dataState.monthlyByYearCountry.has(year)) {
    dataState.monthlyByYearCountry.set(year, new Map());
  }

  const byCountry = dataState.monthlyByYearCountry.get(year);
  if (!byCountry.has(row.country)) {
    byCountry.set(row.country, []);
  }

  byCountry.get(row.country).push({
    month: row.month ?? null,
    eventsTotal: row.eventsTotal,
    fatalitiesTotal: row.fatalitiesTotal,
  });

  if (!dataState.totalsByYear.has(year)) {
    dataState.totalsByYear.set(year, { eventsTotal: 0, fatalitiesTotal: 0 });
  }

  const totals = dataState.totalsByYear.get(year);
  totals.eventsTotal += row.eventsTotal;
  totals.fatalitiesTotal += row.fatalitiesTotal;

  dataState.totalRows += 1;

  if (!dataState.yearKeySet.has(year)) {
    dataState.yearKeySet.add(year);
    dataState.yearKeys = Array.from(dataState.yearKeySet).sort((a, b) => a - b);
  }

  if (!dataState.regionMinMaxYears.has(row.region)) {
    dataState.regionMinMaxYears.set(row.region, { min: year, max: year, years: new Set() });
  }

  const regionData = dataState.regionMinMaxYears.get(row.region);
  regionData.min = Math.min(regionData.min, year);
  regionData.max = Math.max(regionData.max, year);
  regionData.years.add(year);

  return year;
}

export function syncSliderBounds() {
  const appState = globalThis.__webxrState;
  const region = appState?.selectedRegion;

  if (region) {
    const regionData = appState?.regionMinMaxYears.get(region);
    if (regionData) {
      appState.availableYearsForFilter = appState.yearKeys.filter((year) => regionData.years.has(year));
    } else {
      appState.availableYearsForFilter = appState.yearKeys;
    }
  } else {
    appState.availableYearsForFilter = appState.yearKeys;
  }

  if (yearSlider) {
    yearSlider.min = "0";
    yearSlider.max = String(Math.max(0, appState.availableYearsForFilter.length - 1));
    yearSlider.step = "1";
  }
}

export function updateDualRangeVisual() {
  const years = getSelectableYears();
  if (!years || years.length === 0) {
    if (timeRangeStartSlider) timeRangeStartSlider.style.background = "";
    if (timeRangeEndSlider) timeRangeEndSlider.style.background = "";
    if (dualRangeFill) {
      dualRangeFill.style.left = "0%";
      dualRangeFill.style.width = "0%";
    }
    return;
  }

  const lastIndex = Math.max(1, years.length - 1);
  const start = clampIndex(Number.parseInt(timeRangeStartSlider?.value ?? "0", 10) || 0, 0, lastIndex);
  const end = clampIndex(Number.parseInt(timeRangeEndSlider?.value ?? String(lastIndex), 10) || lastIndex, 0, lastIndex);
  const s = Math.min(start, end);
  const e = Math.max(start, end);
  const startPct = (s / lastIndex) * 100;
  const endPct = (e / lastIndex) * 100;

  const track = `linear-gradient(90deg, #334155 ${startPct}%, #3b82f6 ${startPct}%, #3b82f6 ${endPct}%, #334155 ${endPct}%)`;
  if (timeRangeStartSlider) {
    timeRangeStartSlider.style.background = track;
  }
  if (timeRangeEndSlider) {
    timeRangeEndSlider.style.background = track;
  }
  if (dualRangeFill) {
    dualRangeFill.style.left = `${startPct}%`;
    dualRangeFill.style.width = `${Math.max(0, endPct - startPct)}%`;
  }
  if (timeRangeStartThumb) {
    timeRangeStartThumb.style.left = `${startPct}%`;
  }
  if (timeRangeEndThumb) {
    timeRangeEndThumb.style.left = `${endPct}%`;
  }
}

export function syncSelectionControls() {
  syncSliderBounds();

  const appState = globalThis.__webxrState;
  const hasRegion = Boolean(appState?.selectedRegion);
  const selectableYears = getSelectableYears();
  const hasRangeSpace = selectableYears.length > 1;

  if (yearSlider) {
    yearSlider.disabled = hasRegion || selectableYears.length === 0;
  }
  if (timeRangeStartSlider) {
    timeRangeStartSlider.disabled = !hasRegion || !hasRangeSpace;
  }
  if (timeRangeEndSlider) {
    timeRangeEndSlider.disabled = !hasRegion || !hasRangeSpace;
  }
  if (playPauseBtn) {
    playPauseBtn.disabled = selectableYears.length === 0;
  }

  if (hasRegion && hasRangeSpace) {
    const lastIndex = selectableYears.length - 1;
    const currentStart = clampIndex(Number.parseInt(timeRangeStartSlider?.value ?? "0", 10) || 0, 0, lastIndex);
    const currentEnd = clampIndex(Number.parseInt(timeRangeEndSlider?.value ?? String(lastIndex), 10) || lastIndex, 0, lastIndex);
    const normalizedStart = Math.min(currentStart, Math.max(0, currentEnd - 1));
    const normalizedEnd = Math.max(currentEnd, Math.min(lastIndex, currentStart + 1));

    appState.selectedTimeRange = {
      startIndex: normalizedStart,
      endIndex: normalizedEnd,
    };

    if (timeRangeStartSlider) {
      timeRangeStartSlider.min = "0";
      timeRangeStartSlider.max = String(Math.max(0, normalizedEnd - 1));
      timeRangeStartSlider.step = "1";
      timeRangeStartSlider.value = String(normalizedStart);
    }
    if (timeRangeEndSlider) {
      timeRangeEndSlider.min = String(Math.min(lastIndex, normalizedStart + 1));
      timeRangeEndSlider.max = String(lastIndex);
      timeRangeEndSlider.step = "1";
      timeRangeEndSlider.value = String(normalizedEnd);
    }
    if (timeRangeStartLabel) {
      timeRangeStartLabel.textContent = String(selectableYears[normalizedStart]);
    }
    if (timeRangeEndLabel) {
      timeRangeEndLabel.textContent = String(selectableYears[normalizedEnd]);
    }

    if (playStatus) {
      playStatus.textContent = "Zeitleiste: Zeitraum-Modus";
    }
    updateDualRangeVisual();
  } else {
    appState.selectedTimeRange = { startIndex: 0, endIndex: 0 };
    if (timeRangeStartLabel) {
      timeRangeStartLabel.textContent = "-";
    }
    if (timeRangeEndLabel) {
      timeRangeEndLabel.textContent = "-";
    }

    if (playStatus) {
      playStatus.textContent = appState?.isPlaying ? `Zeitleiste: Wiedergabe (${appState.playStepSeconds.toFixed(1)}s/Jahr)` : "Zeitleiste: Pause";
    }
  }

  const yearSliderValue = document.getElementById("yearSliderValue");
  if (yearSliderValue && yearSlider) {
    const idx = Number.parseInt(yearSlider.value, 10) || 0;
    const years = appState?.yearKeys || [];
    yearSliderValue.textContent = String(years[idx] ?? "-");
  }
}

export function updateRegionAvailability() {
  if (!regionAvailability) {
    return;
  }

  const appState = globalThis.__webxrState;

  if (!appState?.selectedRegion) {
    const minYear = appState?.yearKeys?.[0] ?? "-";
    const maxYear = appState?.yearKeys?.[appState.yearKeys.length - 1] ?? "-";
    regionAvailability.textContent = `Verfügbarer Zeitraum: ${minYear}-${maxYear}`;
    return;
  }

  const regionData = appState.regionMinMaxYears.get(appState.selectedRegion);
  if (!regionData) {
    regionAvailability.textContent = "Region nicht gefunden";
    return;
  }

  regionAvailability.textContent = `Verfügbarer Zeitraum: ${regionData.min}-${regionData.max}`;
}

export function getYearsForCurrentView() {
  const appState = globalThis.__webxrState;

  if (appState?.mode === "2d") {
    if (appState.selectedTimeRange && appState.selectedTimeRange.endIndex > appState.selectedTimeRange.startIndex) {
      const years = appState.yearKeys.slice(appState.selectedTimeRange.startIndex, appState.selectedTimeRange.endIndex + 1);
      return years.length ? years : appState.yearKeys;
    }

    const year = getSelectedYearFromSlider();
    return year ? [year] : appState?.yearKeys ?? [];
  }

  if (appState?.selectedRegion) {
    return getSelectedRangeYears();
  }

  const year = getSelectedYearFromSlider();
  return year ? [year] : [];
}

export async function loadEventTypeSummary(eventTypeSummaryPath) {
  try {
    const response = await fetch(eventTypeSummaryPath, { cache: "no-store" });
    if (!response.ok) {
      return;
    }

    const text = await response.text();
    const lines = text.split(/\r?\n/).filter((line) => line.trim().length > 0);
    if (lines.length < 2) {
      return;
    }

    const headers = parseCsvLine(lines[0]);
    for (let i = 1; i < lines.length; i += 1) {
      const values = parseCsvLine(lines[i]);
      if (values.length !== headers.length) continue;

      const row = Object.fromEntries(headers.map((header, idx) => [header, values[idx]]));
      const year = toInt(row.year);
      const country = row.country;
      const key = yearCountryKey(year, country);
      if (!dataState.eventTypeByYearCountry.has(key)) {
        dataState.eventTypeByYearCountry.set(key, []);
      }

      dataState.eventTypeByYearCountry.get(key).push({
        eventType: row.event_type,
        eventsTotal: toInt(row.events_total),
        fatalitiesTotal: toInt(row.fatalities_total),
      });
    }
  } catch (error) {
    console.warn("Event-Typ-Zusammenfassung konnte nicht geladen werden", error);
  }
}