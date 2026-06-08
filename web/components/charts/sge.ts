// Builders de gráficos do SGE — porta de sge_page.py
import { SGE_COLORS, SETORES_FULL, MESES_ABBR_SGE, calcPctSetor, calcPctItemSetor, type SgeRow } from "@/lib/sge";
import type { PlotlyFigure } from "./PlotlyChartInner";

const CORES = [SGE_COLORS.BLUE, SGE_COLORS.ORANGE, "#10B981", "#8B5CF6", "#F59E0B", "#EF4444", "#6366F1"];

export function chartRadar(setores: string[], pcts: Map<string, number | null>): PlotlyFigure | null {
  if (setores.length <= 2) return null;
  const vals = setores.map((s) => pcts.get(s) ?? 0);
  const labels = setores.map((s) => SETORES_FULL[s] ?? s);
  const data = [{
    type: "scatterpolar",
    r: [...vals, vals[0]],
    theta: [...labels, labels[0]],
    fill: "toself",
    fillcolor: "rgba(45,49,146,0.18)",
    line: { color: SGE_COLORS.BLUE, width: 2.5 },
    marker: { color: SGE_COLORS.ORANGE, size: 8 },
    hovertemplate: "%{theta}: %{r:.0f}%<extra></extra>",
  }];
  const layout = {
    polar: {
      radialaxis: { visible: true, range: [0, 100], ticksuffix: "%", gridcolor: "#E5E7EB", linecolor: "#E5E7EB" },
      angularaxis: { gridcolor: "#E5E7EB" },
      bgcolor: "rgba(0,0,0,0)",
    },
    paper_bgcolor: "rgba(0,0,0,0)",
    margin: { l: 60, r: 60, t: 30, b: 30 },
    height: 380, showlegend: false,
    font: { family: "Inter, sans-serif", color: "#374151" },
  };
  return { data, layout };
}

export function chartEvolucaoMensalSetor(dfAno: SgeRow[], setores: string[]): PlotlyFigure {
  const data = setores.map((setor, i) => {
    const ys = Array.from({ length: 12 }, (_, m) => calcPctSetor(dfAno, setor, m + 1));
    return {
      type: "scatter", x: MESES_ABBR_SGE, y: ys.map((v) => (v == null ? null : v)),
      name: SETORES_FULL[setor] ?? setor, mode: "lines+markers",
      line: { color: CORES[i % CORES.length], width: 2.5 }, marker: { size: 8 }, connectgaps: false,
    };
  });
  const layout = {
    paper_bgcolor: "rgba(0,0,0,0)", plot_bgcolor: "rgba(0,0,0,0)",
    font: { family: "Inter, sans-serif", color: "#374151" },
    xaxis: { gridcolor: "#F0F0F0" },
    yaxis: { gridcolor: "#F0F0F0", ticksuffix: "%", range: [0, 110] },
    legend: { orientation: "h", y: -0.2, x: 0.5, xanchor: "center", bgcolor: "rgba(0,0,0,0)" },
    margin: { l: 10, r: 10, t: 30, b: 80 }, height: 400, hovermode: "x unified",
    shapes: [{ type: "line", xref: "paper", x0: 0, x1: 1, yref: "y", y0: 80, y1: 80, line: { color: SGE_COLORS.GREEN, width: 1.5, dash: "dash" } }],
    annotations: [{ xref: "paper", x: 0, y: 80, text: "Meta 80%", showarrow: false, yanchor: "bottom", font: { size: 9, color: SGE_COLORS.GREEN } }],
  };
  return { data, layout };
}

export function chartDrillItem(dfAno: SgeRow[], item: string, setores: string[]): PlotlyFigure {
  const data = setores.map((setor, i) => {
    const ys = Array.from({ length: 12 }, (_, m) => calcPctItemSetor(dfAno, item, setor, m + 1)[2]);
    return {
      type: "bar", name: SETORES_FULL[setor] ?? setor, x: MESES_ABBR_SGE,
      y: ys.map((v) => (v == null ? null : v)), marker: { color: CORES[i % CORES.length] },
    };
  });
  const layout = {
    barmode: "group",
    paper_bgcolor: "rgba(0,0,0,0)", plot_bgcolor: "rgba(0,0,0,0)",
    font: { family: "Inter, sans-serif", color: "#374151" },
    xaxis: { gridcolor: "#F0F0F0" },
    yaxis: { gridcolor: "#F0F0F0", ticksuffix: "%", range: [0, 115] },
    legend: { orientation: "h", y: -0.25, x: 0.5, xanchor: "center", bgcolor: "rgba(0,0,0,0)" },
    margin: { l: 10, r: 10, t: 30, b: 90 }, height: 380,
    shapes: [{ type: "line", xref: "paper", x0: 0, x1: 1, yref: "y", y0: 80, y1: 80, line: { color: SGE_COLORS.GREEN, width: 1.5, dash: "dash" } }],
    annotations: [{ xref: "paper", x: 0, y: 80, text: "80%", showarrow: false, yanchor: "bottom", font: { size: 9, color: SGE_COLORS.GREEN } }],
  };
  return { data, layout };
}
