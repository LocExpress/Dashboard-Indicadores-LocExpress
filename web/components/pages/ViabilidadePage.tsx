"use client";
import { SecHeader, KpiCard, ChartBox, DataTable, InfoBox, type Column } from "../ui";
import PlotlyChart from "../charts/PlotlyChart";
import {
  chartFluxoCaixaAcumulado, chartFaturamento, chartLucratividade, chartRentabilidade,
} from "../charts/viabilidade";
import { COLOR } from "@/lib/theme";
import { fmtBrl, fmtPct } from "@/lib/format";
import { PROJETO, kpis, anos, faturamento, lucro, lucratividade, rentabilidade } from "@/lib/viabilidade";

export default function ViabilidadePage() {
  const tableCols: Column[] = [
    { key: "ano", label: "Período" },
    { key: "fat", label: "Faturamento Médio Mensal", align: "right" },
    { key: "lucro", label: "Lucro Líquido Médio Mensal", align: "right",
      style: (r) => ({ color: r.lucroNum < 0 ? COLOR.RED : COLOR.GRAY_DARK, fontWeight: 600 }) },
    { key: "lucrat", label: "Lucratividade", align: "right",
      style: (r) => ({ color: r.lucratNum < 0 ? COLOR.RED : COLOR.INDIGO }) },
    { key: "rent", label: "Rentabilidade", align: "right",
      style: (r) => ({ color: r.rentNum < 0 ? COLOR.RED : COLOR.BLUE_DARK }) },
  ];
  const tableRows = anos.map((ano, i) => ({
    ano,
    fat: fmtBrl(faturamento[i]),
    lucro: fmtBrl(lucro[i]), lucroNum: lucro[i],
    lucrat: fmtPct(lucratividade[i]), lucratNum: lucratividade[i],
    rent: fmtPct(rentabilidade[i]), rentNum: rentabilidade[i],
  }));

  return (
    <div>
      <SecHeader>🏦 Viabilidade do Franqueado — {PROJETO}</SecHeader>

      <InfoBox style={{ marginBottom: "1rem" }}>
        📑 Simulação dos resultados do franqueado em 5 anos, com base nas projeções do
        modelo financeiro. Valores em reais (R$).
      </InfoBox>

      {/* ─── KPIs ─── */}
      <div className="lx-grid" style={{ gridTemplateColumns: "repeat(3, 1fr)", marginBottom: "1.2rem" }}>
        <KpiCard label="VPL (Valor Presente Líquido)" value={fmtBrl(kpis.vpl)} color={COLOR.GREEN}
          sub={`Taxa VPL: ${fmtPct(kpis.taxaVpl * 100, 1)}`} subColor={COLOR.GRAY_MID} />
        <KpiCard label="TIR (Taxa Interna de Retorno)" value={fmtPct(kpis.tirAa * 100, 1)} color={COLOR.GREEN}
          sub={`${fmtPct(kpis.tirAm * 100, 2)} a.m. · a.a.`} subColor={COLOR.GRAY_MID} />
        <KpiCard label="Payback" value={`${kpis.payback} meses`} color={COLOR.INDIGO}
          sub="Retorno do investimento" subColor={COLOR.GRAY_MID} />
        <KpiCard label="Capital de Giro" value={fmtBrl(kpis.capitalGiro)} color={COLOR.RED} />
        <KpiCard label="Investimento Inicial" value={fmtBrl(kpis.investimento)} color={COLOR.RED} />
        <KpiCard label="Necessidade de Capital Total" value={fmtBrl(kpis.necessidade)} color={COLOR.RED}
          sub="Investimento + Capital de Giro" subColor={COLOR.GRAY_MID} />
      </div>

      {/* ─── Gráficos 2×2 ─── */}
      <div className="lx-grid" style={{ gridTemplateColumns: "repeat(2, 1fr)", gap: "1rem", marginBottom: "1rem" }}>
        <ChartBox><PlotlyChart {...chartFluxoCaixaAcumulado()} height={400} /></ChartBox>
        <ChartBox><PlotlyChart {...chartFaturamento()} height={400} /></ChartBox>
        <ChartBox><PlotlyChart {...chartLucratividade()} height={400} /></ChartBox>
        <ChartBox><PlotlyChart {...chartRentabilidade()} height={400} /></ChartBox>
      </div>

      {/* ─── Tabela resumo por ano ─── */}
      <SecHeader>📋 Resumo por Período (média mensal)</SecHeader>
      <ChartBox>
        <DataTable columns={tableCols} rows={tableRows} />
      </ChartBox>
    </div>
  );
}
