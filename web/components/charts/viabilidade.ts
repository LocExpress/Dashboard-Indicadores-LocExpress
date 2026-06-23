// Builders de gráficos da Viabilidade Financeira — estilo executivo (Power BI).
// Sem título interno (o card/painel fornece o título). Cada função recebe um Projeto.
import { fmtBrl, fmtPct } from "@/lib/format";
import { ANOS, type Projeto } from "@/lib/viabilidadeData";
import type { PlotlyFigure } from "./PlotlyChartInner";

// ─── Paleta da marca ──────────────────────────────────────────────────────
const BLUE = "#2F3192";        // azul principal
const ORANGE = "#F5781C";      // laranja
const ORANGE_SOFT = "rgba(245,120,28,0.14)";
const GREEN = "#00B050";       // positivo
const RED = "#FF3B30";         // negativo
const SLATE = "#5B6472";       // neutro
const SOFT_BAR = "#D9DCE6";    // barra secundária
const GRID = "#EEF0F4";        // grade horizontal
const MUTED = "#8A90A2";       // texto de eixo
const INK = "#1F2440";
const anos = [...ANOS];

function clean(extra: Record<string, any> = {}): Record<string, any> {
  return {
    paper_bgcolor: "rgba(0,0,0,0)",
    plot_bgcolor: "rgba(0,0,0,0)",
    font: { family: "Segoe UI, Inter, sans-serif", color: MUTED, size: 12 },
    margin: { l: 12, r: 14, t: 18, b: 10 },
    hoverlabel: { bgcolor: "#FFFFFF", bordercolor: GRID, font: { size: 12, color: INK } },
    legend: { orientation: "h", yanchor: "bottom", y: 1.0, xanchor: "left", x: 0, font: { size: 11, color: MUTED }, bgcolor: "rgba(0,0,0,0)" },
    xaxis: { showgrid: false, zeroline: false, showline: false, ticks: "", automargin: true, tickfont: { size: 12, color: MUTED } },
    yaxis: { showgrid: true, gridcolor: GRID, gridwidth: 1, zeroline: false, showline: false, ticks: "", automargin: true, tickfont: { size: 11, color: MUTED } },
    ...extra,
  };
}

// ─── Fluxo de Caixa Acumulado (60 meses) ──────────────────────────────────
export function chartFluxoCaixaAcumulado(p: Projeto): PlotlyFigure {
  const fcx = p.fluxoCaixaAcumulado;
  const x = fcx.map((_, i) => i + 1);
  const data = [
    {
      type: "scatter", mode: "lines", name: "Fluxo acumulado",
      x, y: fcx,
      line: { color: ORANGE, width: 2.6, shape: "spline", smoothing: 0.6 },
      fill: "tozeroy", fillcolor: ORANGE_SOFT,
      hovertemplate: "Mês %{x}<br>%{customdata}<extra></extra>",
      customdata: fcx.map((v) => fmtBrl(v)),
    },
  ];
  const layout = clean({
    showlegend: false,
    margin: { l: 12, r: 14, t: 14, b: 26 },
    xaxis: { showgrid: false, zeroline: false, showline: false, ticks: "", dtick: 6, tickfont: { size: 11, color: MUTED }, title: { text: "Mês", font: { size: 11, color: MUTED } } },
    shapes: [
      { type: "line", xref: "paper", x0: 0, x1: 1, y0: 0, y1: 0, line: { color: "#C8C6C4", width: 1 } },
      { type: "line", x0: p.kpis.payback, x1: p.kpis.payback, yref: "paper", y0: 0, y1: 1, line: { color: BLUE, width: 1.2, dash: "dot" } },
    ],
    annotations: [
      { x: p.kpis.payback, yref: "paper", y: 1, text: `Payback ${p.kpis.payback}m`, showarrow: false, font: { size: 11, color: BLUE }, xanchor: "left", yanchor: "top" },
    ],
  });
  return { data, layout };
}

// ─── Faturamento bruto médio mensal por ano (colunas) ─────────────────────
export function chartFaturamento(p: Projeto): PlotlyFigure {
  const data = [
    {
      type: "bar", name: "Faturamento", x: anos, y: p.faturamento,
      marker: { color: ORANGE }, width: 0.5,
      text: p.faturamento.map((v) => fmtBrl(v)), textposition: "outside",
      textfont: { size: 12, color: SLATE }, cliponaxis: false,
      hovertemplate: "%{x}<br>%{text}<extra></extra>",
    },
  ];
  return { data, layout: clean({ showlegend: false, bargap: 0.5 }) };
}

// ─── Evolução Lucratividade (colunas lucro + linha %) ─────────────────────
export function chartLucratividade(p: Projeto): PlotlyFigure {
  const data = [
    {
      type: "bar", name: "Lucro líquido mensal", x: anos, y: p.lucro,
      marker: { color: p.lucro.map((v) => (v < 0 ? RED : ORANGE)) }, width: 0.5,
      text: p.lucro.map((v) => fmtBrl(v)), textposition: "outside",
      textfont: { size: 11, color: SLATE }, cliponaxis: false,
      hovertemplate: "%{x}<br>Lucro: %{text}<extra></extra>",
    },
    {
      type: "scatter", mode: "lines+markers", name: "Lucratividade %", yaxis: "y2",
      x: anos, y: p.lucratividade,
      line: { color: BLUE, width: 2.6 }, marker: { size: 7, color: BLUE },
      text: p.lucratividade.map((v) => fmtPct(v)),
      hovertemplate: "%{x}<br>Lucratividade: %{text}<extra></extra>",
    },
  ];
  const layout = clean({
    bargap: 0.5,
    yaxis2: { overlaying: "y", side: "right", showgrid: false, zeroline: false, showline: false, ticks: "", ticksuffix: "%", tickfont: { size: 11, color: BLUE } },
  });
  return { data, layout };
}

// ─── Evolução Rentabilidade (colunas lucro + linha %) ─────────────────────
export function chartRentabilidade(p: Projeto): PlotlyFigure {
  const data = [
    {
      type: "bar", name: "Lucro líquido mensal", x: anos, y: p.lucro,
      marker: { color: p.lucro.map((v) => (v < 0 ? RED : ORANGE)) }, width: 0.5,
      text: p.lucro.map((v) => fmtBrl(v)), textposition: "outside",
      textfont: { size: 11, color: SLATE }, cliponaxis: false,
      hovertemplate: "%{x}<br>Lucro: %{text}<extra></extra>",
    },
    {
      type: "scatter", mode: "lines+markers", name: "Rentabilidade %", yaxis: "y2",
      x: anos, y: p.rentabilidade,
      line: { color: GREEN, width: 2.6 }, marker: { size: 7, color: GREEN },
      text: p.rentabilidade.map((v) => fmtPct(v)),
      hovertemplate: "%{x}<br>Rentabilidade: %{text}<extra></extra>",
    },
  ];
  const layout = clean({
    bargap: 0.5,
    yaxis2: { overlaying: "y", side: "right", showgrid: false, zeroline: false, showline: false, ticks: "", ticksuffix: "%", tickfont: { size: 11, color: GREEN } },
  });
  return { data, layout };
}

// ─── Composição do Investimento Inicial (donut) ───────────────────────────
export function chartInvestimentoPie(p: Projeto): PlotlyFigure {
  const palette = [ORANGE, BLUE, GREEN, SLATE, "#FFA040", "#7A828E", "#9AA0B4", RED];
  const data = [
    {
      type: "pie", hole: 0.62,
      domain: { x: [0, 0.5], y: [0, 1] },
      labels: p.investimento.map((i) => i.label.replace(/^\d+\.\s*/, "")),
      values: p.investimento.map((i) => i.valor),
      marker: { colors: palette, line: { color: "#FFFFFF", width: 2 } },
      textinfo: "percent", textposition: "inside",
      textfont: { size: 11, color: "#FFFFFF" },
      hovertemplate: "%{label}<br>%{customdata}  (%{percent})<extra></extra>",
      customdata: p.investimento.map((i) => fmtBrl(i.valor)),
      sort: false,
    },
  ];
  const layout = clean({
    margin: { l: 8, r: 8, t: 12, b: 8 },
    legend: { orientation: "v", x: 0.54, xanchor: "left", y: 0.5, yanchor: "middle", font: { size: 11, color: MUTED } },
    xaxis: { visible: false }, yaxis: { visible: false },
  });
  return { data, layout };
}

// ─── Despesas Fixas mensais por ano (colunas) ─────────────────────────────
export function chartDespesasEvolucao(p: Projeto): PlotlyFigure {
  const data = [
    {
      type: "bar", name: "Despesas fixas mensais", x: anos, y: p.despesasFixasTotal,
      marker: { color: BLUE }, width: 0.5,
      text: p.despesasFixasTotal.map((v) => fmtBrl(v)), textposition: "outside",
      textfont: { size: 12, color: SLATE }, cliponaxis: false,
      hovertemplate: "%{x}<br>%{text}<extra></extra>",
    },
  ];
  return { data, layout: clean({ showlegend: false, bargap: 0.5 }) };
}

// ─── Custo de pessoal mensal por ano (colunas) ────────────────────────────
export function chartRhEvolucao(p: Projeto): PlotlyFigure {
  const data = [
    {
      type: "bar", name: "Folha mensal", x: anos, y: p.rhTotalMensal,
      marker: { color: ORANGE }, width: 0.5,
      text: p.rhTotalMensal.map((v) => fmtBrl(v)), textposition: "outside",
      textfont: { size: 12, color: SLATE }, cliponaxis: false,
      hovertemplate: "%{x}<br>%{text}<extra></extra>",
    },
  ];
  return { data, layout: clean({ showlegend: false, bargap: 0.5 }) };
}

// ─── DRE anual: Receita × Despesas × Lucro ────────────────────────────────
export function chartDreAnual(p: Projeto): PlotlyFigure {
  const find = (l: string) => p.dreAnual.find((d) => d.label === l)?.anos ?? [0, 0, 0, 0, 0];
  const receita = find("(+) Receita Bruta");
  const despOp = find("(-) Despesas Operacionais");
  const lucroOp = find("(=) Lucro Operacional");
  const data = [
    {
      type: "bar", name: "Receita Bruta", x: anos, y: receita,
      marker: { color: BLUE }, width: 0.3, offsetgroup: "1",
      hovertemplate: "%{x}<br>Receita: %{customdata}<extra></extra>",
      customdata: receita.map((v) => fmtBrl(v)),
    },
    {
      type: "bar", name: "Despesas Operacionais", x: anos, y: despOp,
      marker: { color: SOFT_BAR }, width: 0.3, offsetgroup: "2",
      hovertemplate: "%{x}<br>Despesas: %{customdata}<extra></extra>",
      customdata: despOp.map((v) => fmtBrl(v)),
    },
    {
      type: "scatter", mode: "lines+markers+text", name: "Lucro Operacional",
      x: anos, y: lucroOp,
      line: { color: ORANGE, width: 2.6 }, marker: { size: 7, color: ORANGE },
      text: lucroOp.map((v) => fmtBrl(v)), textposition: "top center",
      textfont: { size: 11, color: ORANGE }, cliponaxis: false,
      hovertemplate: "%{x}<br>Lucro: %{text}<extra></extra>",
    },
  ];
  return { data, layout: clean({ barmode: "group", bargap: 0.35 }) };
}
