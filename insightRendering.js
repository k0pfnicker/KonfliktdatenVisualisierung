import { insightList, insightTitle, state } from "./appContext.js";
import { formatNumber, getEventTypeColor, getMetricLabel, getMetricValue } from "./appUtils.js";
import { getCountryAggregateForYears, getEventTypesForYears, getSelectableYearLabel, getTopEventTypesForYears, getTopRowsForYears, getTotalsForYears } from "./dataLayer.js";
import { roundRect } from "./rendering/labelRenderer.js";


function drawSparklineArray(ctx, arr, w, h) {
  const max = Math.max(...arr, 1);
  const pad = 6;
  ctx.strokeStyle = "#93c5fd";
  ctx.fillStyle = "rgba(99,102,241,0.06)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let i = 0; i < arr.length; i += 1) {
    const x = pad + (i / (arr.length - 1)) * (w - pad * 2);
    const y = h - pad - (arr[i] / max) * (h - pad * 2);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.lineTo(w - pad, h - pad);
  ctx.lineTo(pad, h - pad);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  for (let i = 0; i < arr.length; i += 1) {
    const x = pad + (i / (arr.length - 1)) * (w - pad * 2);
    const y = h - pad - (arr[i] / max) * (h - pad * 2);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();
}

function drawSparklineForYear(country, year, canvasId) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const monthly = state.monthlyByYearCountry.get(year)?.get(country) ?? [];
  const months = Array(12).fill(0);
  for (const m of monthly) {
    const idx = (m.month || 1) - 1;
    if (idx >= 0 && idx < 12) months[idx] += m.eventsTotal || 0;
  }
  drawSparklineArray(ctx, months, canvas.width, canvas.height);
}

function drawSparklineForYears(years, country, canvasId) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const months = Array(12).fill(0);
  for (const y of years) {
    const monthly = state.monthlyByYearCountry.get(y)?.get(country) ?? [];
    for (const m of monthly) {
      const idx = (m.month || 1) - 1;
      if (idx >= 0 && idx < 12) months[idx] += m.eventsTotal || 0;
    }
  }
  drawSparklineArray(ctx, months, canvas.width, canvas.height);
}

function drawComparisonChart(years, country, canvasId) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const top = getTopRowsForYears(years).slice(0, 6);
  if (!top.length) return;
  const labels = top.map((row) => row.country);
  const values = top.map((row) => (state.metric === "fatalities" ? row.fatalitiesTotal : row.eventsTotal));
  const max = Math.max(...values, 1);

  const w = canvas.width;
  const h = canvas.height;
  const pad = 8;
  const barW = (w - pad * 2) / values.length - 8;

  labels.forEach((lab, i) => {
    const val = values[i];
    const x = pad + i * (barW + 8);
    const barH = Math.max(2, (val / max) * (h - pad * 2 - 20));
    const y = h - pad - barH;
    ctx.fillStyle = lab === country ? "#fbbf24" : "#60a5fa";
    ctx.fillRect(x, y, barW, barH);
    ctx.fillStyle = "#e2e8f0";
    ctx.font = "12px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(lab, x + barW / 2, h - pad + 12);
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 12px sans-serif";
    ctx.fillText(formatNumber(val), x + barW / 2, y - 6);
  });
}

function buildOverlayCanvas({ country, periodLabel, metricLabel, metricValue, topTypes, sparklineCanvasId, compareCanvasId }) {
  const titleFont = 34;
  const bodyFont = 22;
  const pad = 24;
  const lines = [country || "—", periodLabel || "", `${metricLabel || "Metrik"}: ${formatNumber(metricValue || 0)}`];
  const metricText = typeof metricValue === "number" ? formatNumber(metricValue) : String(metricValue || "");
  lines[2] = `${metricLabel || "Metrik"}: ${metricText}`;
  const measureCanvas = document.createElement("canvas");
  const measureCtx = measureCanvas.getContext("2d");
  measureCtx.font = `bold ${titleFont}px sans-serif`;
  const maxWidth = Math.max(...lines.map((line) => measureCtx.measureText(line).width), 260);
  const width = Math.ceil(maxWidth + pad * 2);
  const height = 250;

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "rgba(6,10,23,0.88)";
  roundRect(ctx, 8, 8, width - 16, height - 16, 16);
  ctx.fill();

  ctx.textAlign = "left";
  ctx.textBaseline = "top";

  ctx.fillStyle = "#fbbf24";
  ctx.font = `bold ${titleFont}px sans-serif`;
  ctx.fillText(lines[0], pad, 20);

  ctx.fillStyle = "#cbd5e1";
  ctx.font = `bold ${bodyFont}px sans-serif`;
  ctx.fillText(lines[1], pad, 64);

  ctx.fillStyle = "#ffffff";
  ctx.font = `bold ${bodyFont}px sans-serif`;
  ctx.fillText(lines[2], pad, 96);

  if (sparklineCanvasId) {
    const spark = document.getElementById(sparklineCanvasId);
    if (spark) ctx.drawImage(spark, pad, 128, width - pad * 2, 52);
  }

  if (compareCanvasId) {
    const compare = document.getElementById(compareCanvasId);
    if (compare) ctx.drawImage(compare, pad, 186, width - pad * 2, 48);
  }

  if (topTypes && topTypes.length) {
    let chipX = pad;
    const chipY = height - 34;
    ctx.font = "bold 14px sans-serif";
    topTypes.slice(0, 3).forEach((row) => {
      const label = `${row.eventType} · ${formatNumber(row.eventsTotal)}`;
      const textWidth = ctx.measureText(label).width + 18;
      ctx.fillStyle = getEventTypeColor(row.eventType);
      roundRect(ctx, chipX, chipY, textWidth, 22, 11);
      ctx.fill();
      ctx.fillStyle = "#0f172a";
      ctx.fillText(label, chipX + 9, chipY + 3);
      chipX += textWidth + 8;
    });
  }

  return canvas;
}

function renderCountryInsight(year, country) {
  if (!insightTitle || !insightList) return;
  if (!year || !country) {
    insightTitle.textContent = "Einordnung";
    insightList.innerHTML = "<li>Waehle ein Land per Klick auf einen Balken.</li>";
    return;
  }

  const yearMap = state.yearlyByYear.get(year);
  const countryRow = yearMap?.get(country);
  if (!countryRow) {
    insightTitle.textContent = "Einordnung";
    insightList.innerHTML = "<li>Fuer dieses Jahr sind keine Daten fuer das Land vorhanden.</li>";
    return;
  }

  const totals = state.totalsByYear.get(year) ?? { eventsTotal: 0, fatalitiesTotal: 0 };
  const fatalityShare = totals.fatalitiesTotal > 0 ? (countryRow.fatalitiesTotal / totals.fatalitiesTotal) * 100 : 0;
  const topTypes = getTopEventTypesForYears([year], country);
  const topTypesHtml = topTypes.length > 0
    ? `<div class="etype-row">${topTypes
      .map((row) => `<span class="etype-pill" style="background:${getEventTypeColor(row.eventType)}">${row.eventType}: ${formatNumber(getMetricValue(row))}</span>`)
      .join("")}</div>`
    : "n/a";
  insightTitle.textContent = `Einordnung: ${country} (${year})`;
  const itemsHtml = [
    `<canvas id="insightSparkline" width="300" height="64" style="display:block;margin-bottom:8px;border-radius:6px;background:transparent"></canvas>`,
    `<li>Events gesamt: ${formatNumber(countryRow.eventsTotal)}</li>`,
    `<li>Todesfälle gesamt: ${formatNumber(countryRow.fatalitiesTotal)}</li>`,
    `<li>Fatality-Anteil: ${fatalityShare.toFixed(1)}%</li>`,
    `<li>Top Event-Typen: ${topTypesHtml}</li>`,
  ].join("");
  insightList.innerHTML = itemsHtml;
  drawSparklineForYear(country, year, "insightSparkline");
}

function renderCountryInsightForYears(years, country) {
  if (!insightTitle || !insightList) return;
  if (!years || years.length === 0 || !country) {
    insightTitle.textContent = "Einordnung";
    insightList.innerHTML = "<li>Waehle ein Land per Klick auf einen Balken.</li>";
    return;
  }

  const countryRow = getCountryAggregateForYears(years, country);
  if (!countryRow) {
    insightTitle.textContent = "Einordnung";
    insightList.innerHTML = "<li>Fuer diesen Zeitraum sind keine Daten fuer das Land vorhanden.</li>";
    return;
  }

  const totals = getTotalsForYears(years);
  const fatalityShare = totals.fatalitiesTotal > 0 ? (countryRow.fatalitiesTotal / totals.fatalitiesTotal) * 100 : 0;
  const topTypes = getTopEventTypesForYears(years, country);
  const topTypesHtml = topTypes.length > 0
    ? `<div class="etype-row">${topTypes
      .map((row) => `<span class="etype-pill" style="background:${getEventTypeColor(row.eventType)}">${row.eventType}: ${formatNumber(getMetricValue(row))}</span>`)
      .join("")}</div>`
    : "n/a";
  insightTitle.textContent = `Einordnung: ${country} (${getSelectableYearLabel(years)})`;
  const itemsHtml = [
    `<canvas id="insightSparkline" width="300" height="64" style="display:block;margin-bottom:8px;border-radius:6px;background:transparent"></canvas>`,
    `<li>Events gesamt im Zeitraum: ${formatNumber(countryRow.eventsTotal)}</li>`,
    `<li>Todesfälle gesamt im Zeitraum: ${formatNumber(countryRow.fatalitiesTotal)}</li>`,
    `<li>Fatality-Anteil am Zeitraum: ${fatalityShare.toFixed(1)}%</li>`,
    `<li>Top Event-Typen: ${topTypesHtml}</li>`,
    `<li style="margin-top:8px;"><canvas id="insightCompare" width="320" height="120" style="width:100%;height:80px;background:transparent;border-radius:6px"></canvas></li>`,
  ].join("");
  insightList.innerHTML = itemsHtml;

  drawSparklineForYears(years, country, "insightSparkline");
  drawComparisonChart(years, country, "insightCompare");
}

export {
  buildOverlayCanvas,
  renderCountryInsight,
  renderCountryInsightForYears,
};