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
