// Builders de gráficos dos indicadores — porta de app.py
import { baseLayout, title } from "./base";
import { COLOR, getStatusColor, getAggType } from "@/lib/theme";
import { fmtValue, fmtPct, fmtDiferenca, calcAtingimento } from "@/lib/format";
import { MESES_ABBR } from "@/lib/meses";
import { aggValorMeta, monthlyEvolutionIndicator, type AggRow, type IndicadorRow, type MonthlyRow } from "@/lib/indicators";
import type { PlotlyFigure } from "./PlotlyChartInner";

const NBSP = "—";

// ─── Tabela Valor × Meta × Diferença ────────────────────────────────────
export function chartTabelaIndicadores(agg: AggRow[]): PlotlyFigure {
  const df = [...agg].sort((a, b) => a.Departamento.localeCompare(b.Departamento) || a.Indicador.localeCompare(b.Indicador));
  const n = df.length;

  const colSetor = df.map((r) => r.Departamento);
  const colInd = df.map((r) => r.Indicador);
  const colUnid = df.map((r) => r.Unidade_Medida);
  const colValor = df.map((r) => fmtValue(r.Valor, r.Unidade_Medida));
  const colMeta = df.map((r) => fmtValue(r.Meta, r.Unidade_Medida));
  const colDif: string[] = [];
  const colDifColors: string[] = [];
  const colAting = df.map((r) => fmtPct(r.Atingimento));
  for (const r of df) {
    const [txt, color] = fmtDiferenca(r.Valor, r.Meta, r.Sentido_Meta, r.Unidade_Medida);
    colDif.push(txt);
    colDifColors.push(color);
  }
  const rowFill = df.map((r) => {
    const a = r.Atingimento;
    if (a == null) return "#F9FAFB";
    if (a >= 100) return "#ECFDF5";
    if (a >= 80) return "#FFFBEB";
    return "#FFF5F5";
  });
  const atingColors = df.map((r) => getStatusColor(r.Atingimento));

  const data = [{
    type: "table",
    columnwidth: [2, 3, 1.2, 1.8, 1.8, 1.8, 1.8],
    header: {
      values: ["<b>Setor</b>", "<b>Indicador</b>", "<b>Unid.</b>", "<b>Valor Real</b>", "<b>Meta</b>", "<b>Diferença</b>", "<b>% Ating.</b>"],
      fill: { color: COLOR.INDIGO },
      font: { color: "white", size: 11, family: "Inter, sans-serif" },
      align: ["left", "left", "center", "right", "right", "right", "center"],
      height: 34,
      line: { color: "rgba(255,255,255,0.15)" },
    },
    cells: {
      values: [colSetor, colInd, colUnid, colValor, colMeta, colDif, colAting],
      fill: { color: Array(7).fill(rowFill) },
      font: {
        size: 11, family: "Inter, sans-serif",
        color: [
          Array(n).fill(COLOR.GRAY_DARK),
          Array(n).fill(COLOR.INDIGO),
          Array(n).fill(COLOR.GRAY_MID),
          Array(n).fill(COLOR.BLUE_DARK),
          Array(n).fill(COLOR.ORANGE),
          colDifColors,
          atingColors,
        ],
      },
      align: ["left", "left", "center", "right", "right", "right", "center"],
      height: 30,
      line: { color: "#E5E7EB" },
    },
  }];

  const layout = {
    paper_bgcolor: "rgba(0,0,0,0)",
    font: { family: "Inter, sans-serif" },
    title: title("Indicadores — Valor Real × Meta × Diferença"),
    margin: { l: 0, r: 0, t: 44, b: 0 },
    height: Math.max(280, n * 30 + 90),
  };
  return { data, layout };
}

// ─── Atingimento médio por Setor ────────────────────────────────────────
export function chartAtingimentoPorSetor(agg: AggRow[]): PlotlyFigure | null {
  const byDep = new Map<string, number[]>();
  for (const r of agg) {
    if (r.Atingimento == null) continue;
    const arr = byDep.get(r.Departamento) ?? [];
    arr.push(r.Atingimento);
    byDep.set(r.Departamento, arr);
  }
  const rows = [...byDep.entries()].map(([dep, vals]) => ({ dep, ating: vals.reduce((a, b) => a + b, 0) / vals.length }));
  rows.sort((a, b) => a.ating - b.ating);
  if (rows.length === 0) return null;

  const colors = rows.map((r) => getStatusColor(r.ating));
  const xMax = Math.max(Math.max(...rows.map((r) => r.ating)) * 1.3, 130);
  const maxLabel = Math.max(...rows.map((r) => r.dep.length), 8);
  const lMargin = Math.max(80, maxLabel * 7);

  const data = [{
    type: "bar", orientation: "h",
    x: rows.map((r) => r.ating), y: rows.map((r) => r.dep),
    marker: { color: colors },
    text: rows.map((r) => fmtPct(r.ating)),
    textposition: "outside", textfont: { size: 11, color: "#374151" },
    hovertemplate: "%{y}<br>Atingimento médio: %{x:.1f}%<extra></extra>",
  }];
  const layout = {
    ...baseLayout(), title: title("Atingimento Médio por Setor"), showlegend: false,
    xaxis: { title: "% Atingimento médio", gridcolor: "#F0F0F0", ticksuffix: "%", range: [0, xMax] },
    yaxis: { gridcolor: "rgba(0,0,0,0)", tickfont: { size: 11 }, automargin: true },
    height: Math.max(280, rows.length * 56 + 100),
    margin: { l: lMargin, r: 20, t: 44, b: 10 },
    shapes: vlines(80, 100),
    annotations: vlineAnnotations(80, 100),
  };
  return { data, layout };
}

// ─── Ranking de Indicadores ─────────────────────────────────────────────
export function chartRankingIndicadores(agg: AggRow[], titleText: string): PlotlyFigure | null {
  const df = agg.filter((r) => r.Atingimento != null).sort((a, b) => (a.Atingimento ?? 0) - (b.Atingimento ?? 0));
  if (df.length === 0) return null;
  const colors = df.map((r) => getStatusColor(r.Atingimento));
  const xMax = Math.max(Math.max(...df.map((r) => r.Atingimento ?? 0)) * 1.28, 130);
  const maxLabel = Math.max(...df.map((r) => r.Indicador.length), 10);
  const lMargin = Math.max(120, maxLabel * 7);

  const data = [{
    type: "bar", orientation: "h",
    x: df.map((r) => r.Atingimento), y: df.map((r) => r.Indicador),
    marker: { color: colors },
    text: df.map((r) => fmtPct(r.Atingimento)),
    textposition: "outside", textfont: { size: 11, color: "#374151" },
    hovertemplate: "%{y}<br>% Ating.: %{x:.1f}%<extra></extra>",
  }];
  const layout = {
    ...baseLayout(), title: title(titleText), showlegend: false,
    xaxis: { title: "% Atingimento", gridcolor: "#F0F0F0", ticksuffix: "%", range: [0, xMax] },
    yaxis: { gridcolor: "rgba(0,0,0,0)", tickfont: { size: 10 }, automargin: true },
    height: Math.max(300, df.length * 50 + 90),
    margin: { l: lMargin, r: 20, t: 44, b: 10 },
    shapes: vlines(80, 100),
    annotations: vlineAnnotations(80, 100),
  };
  return { data, layout };
}

// ─── Ranking de Unidades por Atingimento ────────────────────────────────
export function chartRankingUnidades(dfChart: IndicadorRow[], unidade: string, sentido: string, titleText: string): PlotlyFigure | null {
  if (dfChart.length === 0) return null;
  const aggT = getAggType(unidade);
  const byUnit = new Map<string, IndicadorRow[]>();
  for (const r of dfChart) {
    if (!r.Unidade || !r.Unidade.trim()) continue;
    const arr = byUnit.get(r.Unidade) ?? [];
    arr.push(r);
    byUnit.set(r.Unidade, arr);
  }
  const rows: { Unidade: string; Valor: number | null; Meta: number | null; Atingimento: number }[] = [];
  for (const [unid, grp] of byUnit) {
    const { valor, meta } = aggValorMeta(grp, aggT);
    const ating = calcAtingimento(valor, meta, sentido);
    if (ating == null) continue;
    rows.push({ Unidade: unid, Valor: valor, Meta: meta, Atingimento: ating });
  }
  rows.sort((a, b) => a.Atingimento - b.Atingimento);
  if (rows.length === 0) return null;

  const colors = rows.map((r) => getStatusColor(r.Atingimento));
  const xMax = Math.max(Math.max(...rows.map((r) => r.Atingimento)) * 1.3, 130);
  const maxLabel = Math.max(...rows.map((r) => r.Unidade.length), 10);
  const lMargin = Math.max(120, maxLabel * 7);

  const data = [{
    type: "bar", orientation: "h",
    x: rows.map((r) => r.Atingimento), y: rows.map((r) => r.Unidade),
    marker: { color: colors },
    text: rows.map((r) => `${fmtValue(r.Valor, unidade)}  ${fmtPct(r.Atingimento)}`),
    textposition: "outside", textfont: { size: 10, color: "#374151" },
    customdata: rows.map((r) => [r.Unidade, fmtValue(r.Valor, unidade), fmtValue(r.Meta, unidade), fmtPct(r.Atingimento)]),
    hovertemplate: "<b>%{customdata[0]}</b><br>Realizado: %{customdata[1]}<br>Meta: %{customdata[2]}<br>Atingimento: %{customdata[3]}<extra></extra>",
  }];
  const layout = {
    ...baseLayout(), title: title(titleText), showlegend: false,
    xaxis: { title: "% Atingimento", gridcolor: "#F0F0F0", ticksuffix: "%", range: [0, xMax] },
    yaxis: { gridcolor: "rgba(0,0,0,0)", tickfont: { size: 10 }, automargin: true },
    height: Math.max(300, rows.length * 54 + 90),
    margin: { l: lMargin, r: 140, t: 44, b: 10 },
    shapes: vlines(80, 100),
    annotations: vlineAnnotations(80, 100),
  };
  return { data, layout };
}

// ─── Evolução Mensal do KPI (executivo) ─────────────────────────────────
export function chartEvolucaoMensalKpi(
  dfFull: IndicadorRow[], selSetor: string, selIndicador: string,
  unidade: string, anosSel: number[], monthly: MonthlyRow[], titleText: string,
): PlotlyFigure {
  const dfAll = dfFull.filter((r) => r.Departamento === selSetor && r.Indicador === selIndicador);
  const allYears = [...new Set(dfAll.map((r) => r.Ano).filter((y): y is number => y != null))].sort((a, b) => a - b);

  const yearAvgs = new Map<number, number | null>();
  for (const yr of allYears) {
    const grp = dfAll.filter((r) => r.Ano === yr);
    if (grp.length === 0) { yearAvgs.set(yr, null); continue; }
    const gm = monthlyEvolutionIndicator(grp);
    const vals = gm.map((m) => m.Valor).filter((v): v is number => v != null);
    yearAvgs.set(yr, vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null);
  }

  const xLabels: string[] = [];
  const yVals: number[] = [];
  const barColors: string[] = [];
  const barTexts: string[] = [];

  for (const yr of allYears) {
    xLabels.push(`${yr}<br>Média`);
    const val = yearAvgs.get(yr) ?? null;
    yVals.push(val ?? 0);
    barColors.push(anosSel.includes(yr) ? COLOR.YELLOW : "#9E9E9E");
    barTexts.push(val != null ? fmtValue(val, unidade) : NBSP);
  }
  // separador
  xLabels.push("  "); yVals.push(0); barColors.push("rgba(0,0,0,0)"); barTexts.push("");

  const byMes = new Map<number, MonthlyRow>();
  for (const r of monthly) if (r.Mes != null) byMes.set(r.Mes, r);
  const metaVals: number[] = [];

  for (let mes = 1; mes <= 12; mes++) {
    xLabels.push((MESES_ABBR[mes] ?? String(mes)).toUpperCase());
    const row = byMes.get(mes);
    if (row && row.Valor != null) {
      yVals.push(row.Valor);
      barColors.push(getStatusColor(row.Atingimento));
      barTexts.push(fmtValue(row.Valor, unidade));
    } else {
      yVals.push(0); barColors.push("#E8E8E8"); barTexts.push("");
    }
    if (row && row.Meta != null) metaVals.push(row.Meta);
  }

  const metaAnual = metaVals.length ? metaVals.reduce((a, b) => a + b, 0) / metaVals.length : null;
  xLabels.push(" META");
  yVals.push(metaAnual ?? 0);
  barColors.push("#1565C0");
  barTexts.push(metaAnual != null ? fmtValue(metaAnual, unidade) : NBSP);

  const data: any[] = [{
    type: "bar", x: xLabels, y: yVals,
    marker: { color: barColors },
    text: barTexts, textposition: "inside", textangle: -90, insidetextanchor: "middle",
    textfont: { size: 9, color: "white" }, showlegend: false,
    hovertemplate: "%{x}: %{text}<extra></extra>", cliponaxis: false,
  }];
  // legenda dummy
  for (const [name, color] of [["Dentro da Meta", COLOR.GREEN], ["Fora da Meta", COLOR.RED], ["Anos Anteriores", "#9E9E9E"], ["Média", COLOR.YELLOW]] as [string, string][]) {
    data.push({ type: "bar", x: [null], y: [null], name, marker: { color }, showlegend: true });
  }
  data.push({ type: "scatter", x: [null], y: [null], name: "Meta", mode: "lines", line: { color: "#1565C0", width: 2, dash: "dot" }, showlegend: true });

  const shapes: any[] = [];
  const annotations: any[] = [];
  if (metaAnual != null) {
    shapes.push({ type: "line", xref: "paper", x0: 0, x1: 1, yref: "y", y0: metaAnual, y1: metaAnual, line: { color: "#1565C0", width: 1.5, dash: "dot" } });
    annotations.push({ xref: "paper", x: 1, y: metaAnual, text: fmtValue(metaAnual, unidade), showarrow: false, xanchor: "right", yanchor: "bottom", font: { size: 9, color: "#1565C0" } });
  }
  for (const yr of allYears) {
    const vAt = yearAvgs.get(yr);
    const vAnt = yearAvgs.get(yr - 1);
    if (vAt != null && vAnt != null && vAnt !== 0) {
      const dev = ((vAt - vAnt) / Math.abs(vAnt)) * 100;
      const prefix = dev >= 0 ? "+" : "";
      annotations.push({
        x: `${yr}<br>Média`, y: vAt, text: `${prefix}${dev.toFixed(2)}%`,
        showarrow: true, arrowhead: 2, arrowcolor: "#555", arrowwidth: 1,
        bgcolor: "white", bordercolor: "#555", borderwidth: 1, borderpad: 3,
        font: { size: 9, color: "#374151" }, yshift: 24, ax: 0, ay: -28,
      });
    }
  }

  const layout = {
    ...baseLayout(), title: title(titleText),
    xaxis: { gridcolor: "#F0F0F0", tickangle: 0 },
    yaxis: { gridcolor: "#F0F0F0" },
    bargap: 0.18, height: 480,
    margin: { l: 10, r: 80, t: 44, b: 80 },
    legend: { orientation: "h", y: -0.15, x: 0.5, xanchor: "center", bgcolor: "rgba(0,0,0,0)" },
    shapes, annotations,
  };
  return { data, layout };
}

// ─── helpers de linhas verticais 80%/100% ───────────────────────────────
function vlines(...xs: number[]): any[] {
  const colorMap: Record<number, string> = { 80: COLOR.YELLOW, 100: COLOR.GREEN };
  return xs.map((x) => ({
    type: "line", x0: x, x1: x, yref: "paper", y0: 0, y1: 1,
    line: { color: colorMap[x] ?? COLOR.GRAY_MID, width: 1.5, dash: "dash" },
  }));
}
function vlineAnnotations(...xs: number[]): any[] {
  const colorMap: Record<number, string> = { 80: COLOR.YELLOW, 100: COLOR.GREEN };
  return xs.map((x) => ({
    x, xref: "x", yref: "paper", y: 1, text: `${x}%`, showarrow: false,
    yanchor: "bottom", font: { size: 9, color: colorMap[x] ?? COLOR.GRAY_MID },
  }));
}
