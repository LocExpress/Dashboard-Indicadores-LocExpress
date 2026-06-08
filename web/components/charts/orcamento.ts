// Builders de gráficos do orçamento — porta de orcamento_page.py
import { ORC_COLORS, type MonthlyOrc, type AreaOrc } from "@/lib/orcamento";
import { fmtBrl } from "@/lib/format";
import type { PlotlyFigure } from "./PlotlyChartInner";

function baseL(): Record<string, any> {
  return {
    paper_bgcolor: "rgba(0,0,0,0)", plot_bgcolor: "rgba(0,0,0,0)",
    font: { family: "Inter, Segoe UI, sans-serif", color: "#374151", size: 14 },
    margin: { l: 10, r: 10, t: 54, b: 10 },
    hoverlabel: { bgcolor: "#FFFFFF", bordercolor: "#E5E7EB", font_size: 13 },
    legend: { orientation: "h", yanchor: "bottom", y: 1.02, xanchor: "right", x: 1, bgcolor: "rgba(0,0,0,0)" },
  };
}
function titleOrc(text: string): Record<string, any> {
  return { text, font: { size: 18, color: ORC_COLORS.BLUE, weight: "bold" }, x: 0.01 };
}

export function chartOrcRealMensal(dfM: MonthlyOrc[]): PlotlyFigure {
  const data = [
    {
      type: "bar", name: "Orçado", x: dfM.map((r) => r.Label), y: dfM.map((r) => r.Orcado),
      marker: { color: ORC_COLORS.BLUE }, opacity: 0.85,
      text: dfM.map((r) => fmtBrl(r.Orcado)), textposition: "outside", textfont: { size: 14, color: ORC_COLORS.BLUE },
      hovertemplate: "%{x}<br>Orçado: %{text}<extra></extra>",
    },
    {
      type: "bar", name: "Realizado", x: dfM.map((r) => r.Label), y: dfM.map((r) => r.Realizado),
      marker: { color: ORC_COLORS.ORANGE }, opacity: 0.9,
      text: dfM.map((r) => fmtBrl(r.Realizado)), textposition: "outside", textfont: { size: 14, color: ORC_COLORS.ORANGE },
      hovertemplate: "%{x}<br>Realizado: %{text}<extra></extra>",
    },
  ];
  const layout = {
    ...baseL(), title: titleOrc("Orçado × Realizado por Mês"), barmode: "group", bargap: 0.22, bargroupgap: 0.05,
    xaxis: { gridcolor: "#F0F0F0", tickfont: { size: 13 } }, yaxis: { gridcolor: "#F0F0F0", tickfont: { size: 13 } },
    height: 400,
  };
  return { data, layout };
}

export function chartOrcRealArea(dfA: AreaOrc[]): PlotlyFigure {
  const tickAngle = dfA.length > 4 ? -20 : 0;
  const data = [
    {
      type: "bar", name: "Orçado", x: dfA.map((r) => r.Area), y: dfA.map((r) => r.Orcado),
      marker: { color: ORC_COLORS.BLUE }, opacity: 0.85,
      text: dfA.map((r) => fmtBrl(r.Orcado)), textposition: "outside", textfont: { size: 14, color: ORC_COLORS.BLUE },
      hovertemplate: "%{x}<br>Orçado: %{text}<extra></extra>",
    },
    {
      type: "bar", name: "Realizado", x: dfA.map((r) => r.Area), y: dfA.map((r) => r.Realizado),
      marker: { color: ORC_COLORS.ORANGE }, opacity: 0.9,
      text: dfA.map((r) => fmtBrl(r.Realizado)), textposition: "outside", textfont: { size: 14, color: ORC_COLORS.ORANGE },
      hovertemplate: "%{x}<br>Realizado: %{text}<extra></extra>",
    },
  ];
  const layout = {
    ...baseL(), title: titleOrc("Orçado × Realizado por Área"), barmode: "group", bargap: 0.22, bargroupgap: 0.05,
    xaxis: { gridcolor: "#F0F0F0", tickangle: tickAngle, tickfont: { size: 13 } }, yaxis: { gridcolor: "#F0F0F0", tickfont: { size: 13 } },
    height: 400,
  };
  return { data, layout };
}

export function chartDesvioArea(dfA: AreaOrc[]): PlotlyFigure {
  const dfS = [...dfA].sort((a, b) => b.Desvio - a.Desvio);
  const colors = dfS.map((r) => (r.Desvio <= 0 ? ORC_COLORS.GREEN : ORC_COLORS.RED));
  const data = [{
    type: "bar", orientation: "h", x: dfS.map((r) => r.Desvio), y: dfS.map((r) => r.Area),
    marker: { color: colors }, text: dfS.map((r) => fmtBrl(r.Desvio)), textposition: "outside",
    textfont: { size: 14, color: "#374151" }, hovertemplate: "%{y}<br>Desvio: %{text}<extra></extra>",
  }];
  const layout = {
    ...baseL(), title: titleOrc("Desvio por Área (Realizado − Orçado)"), showlegend: false,
    xaxis: { gridcolor: "#F0F0F0", tickfont: { size: 13 } },
    yaxis: { gridcolor: "rgba(0,0,0,0)", automargin: true, tickfont: { size: 13 }, categoryorder: "array", categoryarray: [...dfS.map((r) => r.Area)].reverse() },
    height: Math.max(280, dfS.length * 54 + 90),
    shapes: [{ type: "line", x0: 0, x1: 0, yref: "paper", y0: 0, y1: 1, line: { color: "#374151", width: 1 } }],
  };
  return { data, layout };
}

export function chartEvolucaoMensalOrc(dfM: MonthlyOrc[]): PlotlyFigure {
  const data = [
    {
      type: "scatter", x: dfM.map((r) => r.Label), y: dfM.map((r) => r.Orcado), name: "Orçado", mode: "lines+markers",
      line: { color: ORC_COLORS.BLUE, width: 2, dash: "dot" }, marker: { size: 7, color: ORC_COLORS.BLUE },
      hovertemplate: "%{x}<br>Orçado: %{y}<extra></extra>",
    },
    {
      type: "scatter", x: dfM.map((r) => r.Label), y: dfM.map((r) => r.Realizado), name: "Realizado", mode: "lines+markers+text",
      line: { color: ORC_COLORS.ORANGE, width: 3 }, marker: { size: 9, color: ORC_COLORS.ORANGE, line: { color: ORC_COLORS.BLUE, width: 2 } },
      fill: "tonexty", fillcolor: "rgba(244,121,32,0.10)",
      text: dfM.map((r) => (r.Realizado > 0 ? fmtBrl(r.Realizado) : "")), textposition: "top center",
      textfont: { size: 14, color: ORC_COLORS.ORANGE }, hovertemplate: "%{x}<br>Realizado: %{text}<extra></extra>",
    },
  ];
  const layout = {
    ...baseL(), title: titleOrc("Evolução Mensal do Orçamento"),
    xaxis: { gridcolor: "#F0F0F0", tickfont: { size: 13 } }, yaxis: { gridcolor: "#F0F0F0", tickfont: { size: 13 } },
    hovermode: "x unified", height: 400,
  };
  return { data, layout };
}
