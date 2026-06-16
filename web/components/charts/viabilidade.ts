// Builders de gráficos da Viabilidade do Franqueado — Projeto Compact 272K.
// Replica os 4 gráficos da aba "Dashboard Franqueado (5anos)" da planilha.
import { COLOR } from "@/lib/theme";
import { fmtBrl, fmtPct } from "@/lib/format";
import {
  anos, faturamento, lucro, lucratividade, rentabilidade, fluxoCaixaAcumulado, kpis,
} from "@/lib/viabilidade";
import {
  investimento, despesasFixasTotal, rhTotalMensal, dreAnual,
} from "@/lib/viabilidadeDetalhe";
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
function titleViab(text: string): Record<string, any> {
  return { text, font: { size: 18, color: COLOR.INDIGO, weight: "bold" }, x: 0.01 };
}

// ─── Fluxo de Caixa Acumulado (60 meses) ──────────────────────────────────
export function chartFluxoCaixaAcumulado(): PlotlyFigure {
  const x = fluxoCaixaAcumulado.map((_, i) => i + 1);
  const data = [
    {
      type: "scatter", mode: "lines", name: "Fluxo de Caixa Acumulado",
      x, y: fluxoCaixaAcumulado,
      line: { color: COLOR.ORANGE, width: 3 },
      fill: "tozeroy", fillcolor: "rgba(244,121,32,0.12)",
      hovertemplate: "Mês %{x}<br>%{customdata}<extra></extra>",
      customdata: fluxoCaixaAcumulado.map((v) => fmtBrl(v)),
    },
  ];
  const layout = {
    ...baseL(), title: titleViab("Fluxo de Caixa Acumulado (60 meses)"), showlegend: false,
    xaxis: { title: { text: "Mês", font: { size: 12 } }, gridcolor: "#F0F0F0", tickfont: { size: 12 }, dtick: 6 },
    yaxis: { gridcolor: "#F0F0F0", tickfont: { size: 12 }, tickprefix: "R$ ", zeroline: false },
    height: 400,
    shapes: [
      // Linha do zero
      { type: "line", xref: "paper", x0: 0, x1: 1, y0: 0, y1: 0, line: { color: "#9CA3AF", width: 1, dash: "dot" } },
      // Marcação do payback
      { type: "line", x0: kpis.payback, x1: kpis.payback, yref: "paper", y0: 0, y1: 1, line: { color: COLOR.INDIGO, width: 1.5, dash: "dash" } },
    ],
    annotations: [
      { x: kpis.payback, yref: "paper", y: 1, text: `Payback: ${kpis.payback}m`, showarrow: false, font: { size: 12, color: COLOR.INDIGO }, xanchor: "left", yanchor: "top", bgcolor: "rgba(255,255,255,0.7)" },
    ],
  };
  return { data, layout };
}

// ─── Faturamento bruto médio mensal por ano ───────────────────────────────
export function chartFaturamento(): PlotlyFigure {
  const data = [
    {
      type: "scatter", mode: "lines+markers+text", name: "Faturamento Bruto",
      x: [...anos], y: faturamento,
      line: { color: COLOR.ORANGE, width: 3 }, marker: { size: 10, color: COLOR.ORANGE },
      fill: "tozeroy", fillcolor: "rgba(244,121,32,0.12)",
      text: faturamento.map((v) => fmtBrl(v)), textposition: "top center",
      textfont: { size: 13, color: COLOR.ORANGE },
      hovertemplate: "%{x}<br>%{text}<extra></extra>",
    },
  ];
  const layout = {
    ...baseL(), title: titleViab("Faturamento Bruto Médio Mensal"), showlegend: false,
    xaxis: { gridcolor: "#F0F0F0", tickfont: { size: 13 } },
    yaxis: { gridcolor: "#F0F0F0", tickfont: { size: 12 }, tickprefix: "R$ " },
    height: 400,
  };
  return { data, layout };
}

// ─── Evolução Lucratividade (barras = lucro R$ | linha = lucratividade %) ──
export function chartLucratividade(): PlotlyFigure {
  const data = [
    {
      type: "bar", name: "Lucro Líquido Médio Mensal", x: [...anos], y: lucro,
      marker: { color: lucro.map((v) => (v < 0 ? COLOR.RED : COLOR.ORANGE)) }, opacity: 0.9,
      text: lucro.map((v) => fmtBrl(v)), textposition: "outside", textfont: { size: 13, color: COLOR.GRAY_DARK },
      hovertemplate: "%{x}<br>Lucro: %{text}<extra></extra>",
    },
    {
      type: "scatter", mode: "lines+markers", name: "Lucratividade (%)", yaxis: "y2",
      x: [...anos], y: lucratividade,
      line: { color: COLOR.INDIGO, width: 3 }, marker: { size: 9, color: COLOR.INDIGO },
      text: lucratividade.map((v) => fmtPct(v)),
      hovertemplate: "%{x}<br>Lucratividade: %{text}<extra></extra>",
    },
  ];
  const layout = {
    ...baseL(), title: titleViab("Evolução da Lucratividade"),
    xaxis: { gridcolor: "#F0F0F0", tickfont: { size: 13 } },
    yaxis: { gridcolor: "#F0F0F0", tickfont: { size: 12 }, tickprefix: "R$ " },
    yaxis2: { overlaying: "y", side: "right", tickfont: { size: 12, color: COLOR.INDIGO }, ticksuffix: "%", showgrid: false, zeroline: false },
    height: 400,
  };
  return { data, layout };
}

// ─── Evolução Rentabilidade (barras = lucro R$ | linha = rentabilidade %) ──
export function chartRentabilidade(): PlotlyFigure {
  const data = [
    {
      type: "bar", name: "Lucro Líquido Médio Mensal", x: [...anos], y: lucro,
      marker: { color: lucro.map((v) => (v < 0 ? COLOR.RED : COLOR.ORANGE)) }, opacity: 0.9,
      text: lucro.map((v) => fmtBrl(v)), textposition: "outside", textfont: { size: 13, color: COLOR.GRAY_DARK },
      hovertemplate: "%{x}<br>Lucro: %{text}<extra></extra>",
    },
    {
      type: "scatter", mode: "lines+markers", name: "Rentabilidade (%)", yaxis: "y2",
      x: [...anos], y: rentabilidade,
      line: { color: COLOR.BLUE_DARK, width: 3 }, marker: { size: 9, color: COLOR.BLUE_DARK },
      text: rentabilidade.map((v) => fmtPct(v)),
      hovertemplate: "%{x}<br>Rentabilidade: %{text}<extra></extra>",
    },
  ];
  const layout = {
    ...baseL(), title: titleViab("Evolução da Rentabilidade"),
    xaxis: { gridcolor: "#F0F0F0", tickfont: { size: 13 } },
    yaxis: { gridcolor: "#F0F0F0", tickfont: { size: 12 }, tickprefix: "R$ " },
    yaxis2: { overlaying: "y", side: "right", tickfont: { size: 12, color: COLOR.BLUE_DARK }, ticksuffix: "%", showgrid: false, zeroline: false },
    height: 400,
  };
  return { data, layout };
}

// ─── Composição do Investimento Inicial (donut) ───────────────────────────
export function chartInvestimentoPie(): PlotlyFigure {
  const palette = ["#F47920", "#2D3192", "#FFA040", "#3F3FBF", "#FFB300", "#00C853", "#6366F1", "#F44336"];
  const data = [
    {
      type: "pie", hole: 0.5,
      labels: investimento.map((i) => i.label.replace(/^\d+\.\s*/, "")),
      values: investimento.map((i) => i.valor),
      marker: { colors: palette },
      textinfo: "percent", textposition: "inside", insidetextorientation: "radial",
      hovertemplate: "%{label}<br>%{customdata}  (%{percent})<extra></extra>",
      customdata: investimento.map((i) => fmtBrl(i.valor)),
      sort: false,
    },
  ];
  const layout = {
    ...baseL(), title: titleViab("Composição do Investimento Inicial"),
    legend: { orientation: "v", x: 1.0, y: 0.5, font: { size: 11 } },
    margin: { l: 10, r: 10, t: 54, b: 10 }, height: 400,
  };
  return { data, layout };
}

// ─── Evolução das Despesas Fixas (total mensal por ano) ───────────────────
export function chartDespesasEvolucao(): PlotlyFigure {
  const data = [
    {
      type: "bar", name: "Despesas Fixas (mensal)", x: [...anos], y: despesasFixasTotal,
      marker: { color: COLOR.INDIGO }, opacity: 0.9,
      text: despesasFixasTotal.map((v) => fmtBrl(v)), textposition: "outside",
      textfont: { size: 13, color: COLOR.INDIGO },
      hovertemplate: "%{x}<br>%{text}<extra></extra>",
    },
  ];
  const layout = {
    ...baseL(), title: titleViab("Despesas Fixas Mensais por Ano"), showlegend: false,
    xaxis: { gridcolor: "#F0F0F0", tickfont: { size: 13 } },
    yaxis: { gridcolor: "#F0F0F0", tickfont: { size: 12 }, tickprefix: "R$ " },
    height: 400,
  };
  return { data, layout };
}

// ─── Evolução do custo de Recursos Humanos (folha mensal por ano) ─────────
export function chartRhEvolucao(): PlotlyFigure {
  const data = [
    {
      type: "bar", name: "Folha mensal", x: [...anos], y: rhTotalMensal,
      marker: { color: COLOR.ORANGE }, opacity: 0.9,
      text: rhTotalMensal.map((v) => fmtBrl(v)), textposition: "outside",
      textfont: { size: 13, color: COLOR.ORANGE },
      hovertemplate: "%{x}<br>%{text}<extra></extra>",
    },
  ];
  const layout = {
    ...baseL(), title: titleViab("Custo de Pessoal Mensal por Ano"), showlegend: false,
    xaxis: { gridcolor: "#F0F0F0", tickfont: { size: 13 } },
    yaxis: { gridcolor: "#F0F0F0", tickfont: { size: 12 }, tickprefix: "R$ " },
    height: 400,
  };
  return { data, layout };
}

// ─── DRE anual: Receita Bruta × Despesas Operacionais × Lucro Operacional ──
export function chartDreAnual(): PlotlyFigure {
  const find = (l: string) => dreAnual.find((d) => d.label === l)?.anos ?? [0, 0, 0, 0, 0];
  const receita = find("(+) Receita Bruta");
  const despOp = find("(-) Despesas Operacionais");
  const lucro = find("(=) Lucro Operacional");
  const data = [
    {
      type: "bar", name: "Receita Bruta", x: [...anos], y: receita,
      marker: { color: COLOR.INDIGO }, opacity: 0.9,
      hovertemplate: "%{x}<br>Receita: %{y:,.0f}<extra></extra>",
    },
    {
      type: "bar", name: "Despesas Operacionais", x: [...anos], y: despOp,
      marker: { color: COLOR.RED }, opacity: 0.85,
      hovertemplate: "%{x}<br>Despesas: %{y:,.0f}<extra></extra>",
    },
    {
      type: "scatter", mode: "lines+markers+text", name: "Lucro Operacional",
      x: [...anos], y: lucro,
      line: { color: COLOR.ORANGE, width: 3 }, marker: { size: 9, color: COLOR.ORANGE },
      text: lucro.map((v) => fmtBrl(v)), textposition: "top center",
      textfont: { size: 12, color: COLOR.ORANGE },
      hovertemplate: "%{x}<br>Lucro: %{text}<extra></extra>",
    },
  ];
  const layout = {
    ...baseL(), title: titleViab("DRE Anual — Receita × Despesas × Lucro"), barmode: "group",
    xaxis: { gridcolor: "#F0F0F0", tickfont: { size: 13 } },
    yaxis: { gridcolor: "#F0F0F0", tickfont: { size: 12 }, tickprefix: "R$ " },
    height: 420,
  };
  return { data, layout };
}
