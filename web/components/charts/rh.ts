// Gráficos da aba RH (custo de pessoal).
import type { PlotlyFigure } from "./PlotlyChartInner";
import type { RhGrupo, RhRow } from "@/lib/rh";

const CORES = ["#2D3192", "#F47920", "#10B981", "#8B5CF6", "#F59E0B", "#EF4444", "#6366F1", "#0EA5E9", "#EC4899"];
const BASE_LAYOUT = {
  paper_bgcolor: "rgba(0,0,0,0)",
  plot_bgcolor: "rgba(0,0,0,0)",
  font: { family: "Inter, sans-serif", color: "#374151" },
};

/** Donut: % do custo total por setor (responde "qual setor gasta mais"). */
export function chartCustoPorSetor(grupos: RhGrupo[]): PlotlyFigure {
  const sorted = [...grupos].sort((a, b) => b.custoTotal - a.custoTotal);
  const data = [{
    type: "pie",
    hole: 0.58,
    labels: sorted.map((g) => g.chave),
    values: sorted.map((g) => g.custoTotal),
    textinfo: "label+percent",
    textposition: "outside",
    automargin: true,
    marker: { colors: CORES, line: { color: "#fff", width: 2 } },
    hovertemplate: "<b>%{label}</b><br>R$ %{value:,.0f}<br>%{percent}<extra></extra>",
    sort: false,
  }];
  const layout = { ...BASE_LAYOUT, margin: { l: 20, r: 20, t: 20, b: 20 }, height: 360, showlegend: false };
  return { data, layout };
}

/** Barras horizontais: custo total por unidade. */
export function chartCustoPorUnidade(grupos: RhGrupo[]): PlotlyFigure {
  const sorted = [...grupos].sort((a, b) => a.custoTotal - b.custoTotal); // asc → maior no topo
  const data = [{
    type: "bar",
    orientation: "h",
    y: sorted.map((g) => g.chave),
    x: sorted.map((g) => g.custoTotal),
    marker: { color: sorted.map((_, i) => CORES[(sorted.length - 1 - i) % CORES.length]) },
    text: sorted.map((g) => `R$ ${(g.custoTotal / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} mil`),
    textposition: "auto",
    hovertemplate: "<b>%{y}</b><br>R$ %{x:,.0f}<extra></extra>",
  }];
  const layout = {
    ...BASE_LAYOUT,
    margin: { l: 10, r: 20, t: 20, b: 30 },
    height: 320,
    xaxis: { gridcolor: "#F0F0F0", tickprefix: "R$ ", tickformat: ",.0f" },
    yaxis: { automargin: true },
  };
  return { data, layout };
}

/** Donut: composição do custo total (salário, FGTS, benefícios, variável). */
export function chartComposicaoCusto(rows: RhRow[]): PlotlyFigure {
  const salario = rows.reduce((a, r) => a + r.salarioBruto, 0);
  const fgts = rows.reduce((a, r) => a + r.custoFgts, 0);
  const beneficios = rows.reduce((a, r) => a + r.beneficios, 0);
  const variavel = rows.reduce((a, r) => a + r.ppr + r.bonus + r.insalubridade, 0);
  const labels = ["Salário Bruto", "Benefícios", "FGTS", "Variável (PPR/Bônus)"];
  const values = [salario, beneficios, fgts, variavel];
  const data = [{
    type: "pie",
    hole: 0.58,
    labels,
    values,
    textinfo: "label+percent",
    textposition: "outside",
    automargin: true,
    marker: { colors: ["#2D3192", "#10B981", "#F47920", "#8B5CF6"], line: { color: "#fff", width: 2 } },
    hovertemplate: "<b>%{label}</b><br>R$ %{value:,.0f}<br>%{percent}<extra></extra>",
    sort: false,
  }];
  const layout = { ...BASE_LAYOUT, margin: { l: 20, r: 20, t: 20, b: 20 }, height: 360, showlegend: false };
  return { data, layout };
}
