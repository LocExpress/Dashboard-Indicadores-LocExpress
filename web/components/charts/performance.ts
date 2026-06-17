// Builders de gráficos de Performance / Royalties — estilo executivo (Power BI).
import { fmtBrl } from "@/lib/format";
import type { PlotlyFigure } from "./PlotlyChartInner";

const BLUE = "#2F3192";
const ORANGE = "#F5781C";
const ORANGE_SOFT = "rgba(245,120,28,0.14)";
const GREEN = "#00B050";
const SLATE = "#5B6472";
const SOFT = "#D9DCE6";
const GRID = "#EEF0F4";
const MUTED = "#8A90A2";
const INK = "#1F2440";

function clean(extra: Record<string, any> = {}): Record<string, any> {
  return {
    paper_bgcolor: "rgba(0,0,0,0)", plot_bgcolor: "rgba(0,0,0,0)",
    font: { family: "Segoe UI, Inter, sans-serif", color: MUTED, size: 12 },
    margin: { l: 12, r: 14, t: 16, b: 10 },
    hoverlabel: { bgcolor: "#FFFFFF", bordercolor: GRID, font: { size: 12, color: INK } },
    legend: { orientation: "h", yanchor: "bottom", y: 1.0, xanchor: "left", x: 0, font: { size: 11, color: MUTED }, bgcolor: "rgba(0,0,0,0)" },
    xaxis: { showgrid: false, zeroline: false, showline: false, ticks: "", automargin: true, tickfont: { size: 12, color: MUTED } },
    yaxis: { showgrid: true, gridcolor: GRID, gridwidth: 1, zeroline: false, showline: false, ticks: "", automargin: true, tickfont: { size: 11, color: MUTED } },
    ...extra,
  };
}

// Evolução mensal (área + linha)
export function chartLinhaMensal(labels: string[], values: number[], color = ORANGE): PlotlyFigure {
  return {
    data: [{
      type: "scatter", mode: "lines+markers", x: labels, y: values,
      line: { color, width: 2.6, shape: "spline", smoothing: 0.5 }, marker: { size: 6, color },
      fill: "tozeroy", fillcolor: ORANGE_SOFT,
      hovertemplate: "%{x}<br>%{customdata}<extra></extra>", customdata: values.map((v) => fmtBrl(v)),
    }],
    layout: clean({ showlegend: false, yaxis: { showgrid: true, gridcolor: GRID, zeroline: false, showline: false, ticks: "", tickprefix: "R$ ", tickfont: { size: 11, color: MUTED }, automargin: true } }),
  };
}

// Ranking horizontal (top unidades)
export function chartBarsH(labels: string[], values: number[], color = BLUE): PlotlyFigure {
  return {
    data: [{
      type: "bar", orientation: "h", x: values, y: labels,
      marker: { color }, width: 0.66,
      text: values.map((v) => fmtBrl(v)), textposition: "auto", insidetextanchor: "end",
      textfont: { size: 11, color: "#fff" }, cliponaxis: false,
      hovertemplate: "%{y}<br>%{text}<extra></extra>",
    }],
    layout: clean({
      showlegend: false,
      margin: { l: 12, r: 16, t: 16, b: 10 },
      xaxis: { showgrid: true, gridcolor: GRID, zeroline: false, showline: false, ticks: "", tickprefix: "R$ ", tickfont: { size: 11, color: MUTED }, automargin: true },
      yaxis: { showgrid: false, zeroline: false, showline: false, ticks: "", automargin: true, tickfont: { size: 11, color: INK }, categoryorder: "total ascending" },
    }),
  };
}

// Barras verticais (por grupo: região, estado…)
export function chartBarsV(labels: string[], values: number[], color = SLATE): PlotlyFigure {
  return {
    data: [{
      type: "bar", x: labels, y: values, marker: { color }, width: 0.55,
      text: values.map((v) => fmtBrl(v)), textposition: "outside", textfont: { size: 11, color: SLATE }, cliponaxis: false,
      hovertemplate: "%{x}<br>%{text}<extra></extra>",
    }],
    layout: clean({ showlegend: false, bargap: 0.45, yaxis: { showgrid: true, gridcolor: GRID, zeroline: false, showline: false, ticks: "", tickprefix: "R$ ", tickfont: { size: 11, color: MUTED }, automargin: true } }),
  };
}

// Donut (composição)
export function chartDonut(labels: string[], values: number[]): PlotlyFigure {
  const palette = [ORANGE, BLUE, GREEN, SLATE, "#FFA040", "#7A828E", "#9AA0B4"];
  return {
    data: [{
      type: "pie", hole: 0.62, labels, values,
      marker: { colors: palette, line: { color: "#fff", width: 2 } },
      textinfo: "percent", textposition: "inside", textfont: { size: 11, color: "#fff" },
      hovertemplate: "%{label}<br>%{customdata} (%{percent})<extra></extra>", customdata: values.map((v) => fmtBrl(v)), sort: false,
    }],
    layout: clean({ margin: { l: 8, r: 8, t: 12, b: 8 }, legend: { orientation: "v", x: 1, xanchor: "right", y: 0.5, font: { size: 11, color: MUTED } }, xaxis: { visible: false }, yaxis: { visible: false } }),
  };
}

// Centróides aproximados dos estados (UF) — para o mapa de bolhas.
const UF_COORDS: Record<string, [number, number]> = {
  AC: [-8.77, -70.55], AL: [-9.71, -35.73], AP: [1.41, -51.77], AM: [-3.47, -65.10],
  BA: [-12.96, -41.50], CE: [-5.20, -39.53], DF: [-15.83, -47.86], ES: [-19.19, -40.34],
  GO: [-15.98, -49.86], MA: [-5.42, -45.44], MT: [-12.64, -55.42], MS: [-20.51, -54.54],
  MG: [-18.10, -44.38], PA: [-3.79, -52.48], PB: [-7.28, -36.72], PR: [-24.89, -51.55],
  PE: [-8.38, -37.86], PI: [-6.60, -42.28], RJ: [-22.25, -42.66], RN: [-5.81, -36.59],
  RS: [-30.17, -53.50], RO: [-10.83, -63.34], RR: [1.99, -61.33], SC: [-27.45, -50.95],
  SP: [-22.19, -48.79], SE: [-10.57, -37.45], TO: [-9.46, -48.26],
};

// Mapa de bolhas (faturamento por estado) — oceano azul, escala de cor por valor.
export function chartMapa(items: [string, number][]): PlotlyFigure {
  const pts = items.filter(([uf]) => UF_COORDS[uf.toUpperCase()]).sort((a, b) => a[1] - b[1]);
  const max = Math.max(1, ...pts.map(([, v]) => v));
  const values = pts.map(([, v]) => v);
  return {
    data: [{
      type: "scattergeo", mode: "markers+text",
      lat: pts.map(([uf]) => UF_COORDS[uf.toUpperCase()][0]),
      lon: pts.map(([uf]) => UF_COORDS[uf.toUpperCase()][1]),
      marker: {
        size: values, sizemode: "area", sizeref: (2 * max) / (52 * 52), sizemin: 6,
        color: values, colorscale: [[0, "#FFD9B8"], [0.5, "#F5781C"], [1, "#B5410B"]],
        cmin: 0, cmax: max, opacity: 0.9, line: { color: "#FFFFFF", width: 1.2 },
        colorbar: { title: { text: "R$", side: "right" }, thickness: 10, len: 0.7, x: 1, tickfont: { size: 10, color: MUTED }, outlinewidth: 0 },
      },
      text: pts.map(([uf]) => uf.toUpperCase()),
      textposition: "top center", textfont: { size: 9, color: INK },
      customdata: pts.map(([uf, v]) => `${uf.toUpperCase()} — ${fmtBrl(v)}`),
      hovertemplate: "%{customdata}<extra></extra>",
    }],
    layout: {
      paper_bgcolor: "rgba(0,0,0,0)", margin: { l: 0, r: 0, t: 6, b: 0 },
      hoverlabel: { bgcolor: "#FFFFFF", bordercolor: GRID, font: { size: 12, color: INK } },
      geo: {
        scope: "south america", resolution: 50,
        showocean: true, oceancolor: "#CFE2F7", bgcolor: "rgba(0,0,0,0)",
        showland: true, landcolor: "#F4F6FA",
        showcountries: true, countrycolor: "#FFFFFF", showsubunits: true, subunitcolor: "#DCE3EF",
        showcoastlines: true, coastlinecolor: "#AFC6E6", showframe: false,
        lataxis: { range: [-34, 6] }, lonaxis: { range: [-74, -34] },
      },
    },
  };
}

// Comparação anual: barras (valor) + linha (crescimento % a.a.)
export function chartAnual(years: string[], values: number[], growth: (number | null)[], barColor = ORANGE): PlotlyFigure {
  return {
    data: [
      {
        type: "bar", name: "Total", x: years, y: values, marker: { color: barColor }, width: 0.5,
        text: values.map((v) => fmtBrl(v)), textposition: "outside", textfont: { size: 11, color: SLATE }, cliponaxis: false,
        hovertemplate: "%{x}<br>%{text}<extra></extra>",
      },
      {
        type: "scatter", mode: "lines+markers+text", name: "Crescimento %", yaxis: "y2", x: years, y: growth as number[],
        line: { color: BLUE, width: 2.6 }, marker: { size: 7, color: BLUE },
        text: growth.map((g) => (g == null ? "" : `${g.toFixed(0)}%`)), textposition: "top center", textfont: { size: 11, color: BLUE },
        hovertemplate: "%{x}<br>Crescimento: %{text}<extra></extra>",
      },
    ],
    layout: clean({
      bargap: 0.4,
      yaxis: { showgrid: true, gridcolor: GRID, zeroline: false, showline: false, ticks: "", tickprefix: "R$ ", tickfont: { size: 11, color: MUTED }, automargin: true },
      yaxis2: { overlaying: "y", side: "right", showgrid: false, zeroline: false, showline: false, ticks: "", ticksuffix: "%", tickfont: { size: 11, color: BLUE } },
    }),
  };
}

// Royalties × Fundo × Taxa por mês (barras agrupadas)
export function chartRoyMensal(labels: string[], roy: number[], fundo: number[], taxa: number[]): PlotlyFigure {
  return {
    data: [
      { type: "bar", name: "Royalties", x: labels, y: roy, marker: { color: BLUE }, hovertemplate: "%{x}<br>Royalties: %{customdata}<extra></extra>", customdata: roy.map((v) => fmtBrl(v)) },
      { type: "bar", name: "Fundo de Marketing", x: labels, y: fundo, marker: { color: ORANGE }, hovertemplate: "%{x}<br>Fundo: %{customdata}<extra></extra>", customdata: fundo.map((v) => fmtBrl(v)) },
      { type: "bar", name: "Taxa Administrativa", x: labels, y: taxa, marker: { color: SOFT }, hovertemplate: "%{x}<br>Taxa: %{customdata}<extra></extra>", customdata: taxa.map((v) => fmtBrl(v)) },
    ],
    layout: clean({ barmode: "group", bargap: 0.35, yaxis: { showgrid: true, gridcolor: GRID, zeroline: false, showline: false, ticks: "", tickprefix: "R$ ", tickfont: { size: 11, color: MUTED }, automargin: true } }),
  };
}
