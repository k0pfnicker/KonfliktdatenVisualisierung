let appState = null;

export function setAppState(nextState) {
  appState = nextState;
}

export const EVENT_TYPE_COLORS = {
  Battles: "#fca5a5",
  "Explosions/Remote violence": "#fdba74",
  Riots: "#fde68a",
  Protests: "#93c5fd",
  "Violence against civilians": "#c4b5fd",
  "Strategic developments": "#86efac",
};

export function buildNoCacheUrl(path) {
  const url = new URL(path, window.location.href);
  url.searchParams.set("v", String(Date.now()));
  return url.toString();
}

export function parseCsvLine(line) {
  const values = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && i + 1 < line.length && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      values.push(current);
      current = "";
    } else {
      current += ch;
    }
  }

  values.push(current);
  return values;
}

export function toInt(value) {
  return Number.parseInt(value, 10);
}

export function yearCountryKey(year, country) {
  return `${year}||${country}`;
}

export function clampIndex(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function formatNumber(value) {
  return Number(value).toLocaleString("de-DE");
}

export function softCapRatio(value, maxValue) {
  if (!maxValue || maxValue <= 0) return 0;
  const normalized = Math.max(0, value) / maxValue;
  return Math.log10(1 + normalized * 9) / Math.log10(10);
}

export function getMetricValue(row) {
  return appState?.metric === "fatalities" ? row.fatalitiesTotal : row.eventsTotal;
}

export function getMetricLabel() {
  return appState?.metric === "fatalities" ? "Todesfälle" : "Ereignisse";
}

export function getEventTypeColor(eventType) {
  return EVENT_TYPE_COLORS[eventType] ?? "#d4d4d8";
}