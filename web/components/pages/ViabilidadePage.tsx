"use client";
import { useState } from "react";
import { SecHeader, KpiCard, ChartBox, DataTable, InfoBox, type Column } from "../ui";
import PlotlyChart from "../charts/PlotlyChart";
import {
  chartFluxoCaixaAcumulado, chartFaturamento, chartLucratividade, chartRentabilidade,
  chartInvestimentoPie, chartDespesasEvolucao, chartRhEvolucao, chartDreAnual,
} from "../charts/viabilidade";
import { COLOR } from "@/lib/theme";
import { fmtBrl, fmtPct } from "@/lib/format";
import { PROJETO, kpis, anos, faturamento, lucro, lucratividade, rentabilidade } from "@/lib/viabilidade";
import {
  investimento, investimentoTotal, despesasFixas, despesasFixasTotal,
  rhCargos, rhTotalMensal, rhQtd, dreAnual,
} from "@/lib/viabilidadeDetalhe";

const SUBTABS = [
  { id: "resumo", label: "📊  Resumo" },
  { id: "invest", label: "🏗️  Investimento Inicial" },
  { id: "despesas", label: "🧾  Despesas Fixas" },
  { id: "rh", label: "👥  Recursos Humanos" },
  { id: "dre", label: "📑  DRE Anual" },
] as const;
type SubId = (typeof SUBTABS)[number]["id"];

const ANO_COLS: Column[] = anos.map((a, i) => ({ key: `a${i}`, label: a, align: "right" as const }));

export default function ViabilidadePage() {
  const [sub, setSub] = useState<SubId>("resumo");

  return (
    <div>
      <SecHeader>🏦 Viabilidade do Franqueado — {PROJETO}</SecHeader>

      <div className="lx-tabs" style={{ marginBottom: "1rem" }}>
        {SUBTABS.map((t) => (
          <button key={t.id} className={`lx-tab${t.id === sub ? " active" : ""}`} onClick={() => setSub(t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      {sub === "resumo" && <Resumo />}
      {sub === "invest" && <Investimento />}
      {sub === "despesas" && <Despesas />}
      {sub === "rh" && <RecursosHumanos />}
      {sub === "dre" && <Dre />}
    </div>
  );
}

// ─── Resumo (replica a aba "Dashboard Franqueado (5anos)") ─────────────────
function Resumo() {
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
      <InfoBox style={{ marginBottom: "1rem" }}>
        📑 Simulação dos resultados do franqueado em 5 anos, com base nas projeções do
        modelo financeiro. Valores em reais (R$).
      </InfoBox>

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

      <div className="lx-grid" style={{ gridTemplateColumns: "repeat(2, 1fr)", gap: "1rem", marginBottom: "1rem" }}>
        <ChartBox><PlotlyChart {...chartFluxoCaixaAcumulado()} height={400} /></ChartBox>
        <ChartBox><PlotlyChart {...chartFaturamento()} height={400} /></ChartBox>
        <ChartBox><PlotlyChart {...chartLucratividade()} height={400} /></ChartBox>
        <ChartBox><PlotlyChart {...chartRentabilidade()} height={400} /></ChartBox>
      </div>

      <SecHeader>📋 Resumo por Período (média mensal)</SecHeader>
      <ChartBox><DataTable columns={tableCols} rows={tableRows} /></ChartBox>
    </div>
  );
}

// ─── Investimento Inicial ──────────────────────────────────────────────────
function Investimento() {
  const cols: Column[] = [
    { key: "item", label: "Item" },
    { key: "valor", label: "Valor", align: "right" },
    { key: "pct", label: "% do Total", align: "right", style: () => ({ color: COLOR.GRAY_MID }) },
  ];
  const rows = investimento.map((i) => ({ item: i.label, valor: fmtBrl(i.valor), pct: fmtPct(i.pct) }));
  rows.push({ item: "TOTAL", valor: fmtBrl(investimentoTotal), pct: "100%" });

  return (
    <div>
      <InfoBox style={{ marginBottom: "1rem" }}>
        🏗️ Composição do capital necessário para implantar a unidade. O percentual é
        calculado sobre a Necessidade de Capital Total ({fmtBrl(Math.abs(kpis.necessidade))}).
      </InfoBox>
      <div className="lx-grid" style={{ gridTemplateColumns: "repeat(3, 1fr)", marginBottom: "1.2rem" }}>
        <KpiCard label="Investimento em Implantação" value={fmtBrl(investimentoTotal)} color={COLOR.INDIGO} />
        <KpiCard label="Capital de Giro" value={fmtBrl(kpis.capitalGiro)} color={COLOR.RED} />
        <KpiCard label="Necessidade de Capital Total" value={fmtBrl(kpis.necessidade)} color={COLOR.RED} />
      </div>
      <div className="lx-grid" style={{ gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
        <ChartBox><PlotlyChart {...chartInvestimentoPie()} height={400} /></ChartBox>
        <ChartBox><DataTable columns={cols} rows={rows} /></ChartBox>
      </div>
    </div>
  );
}

// ─── Despesas Fixas ────────────────────────────────────────────────────────
function Despesas() {
  const cols: Column[] = [{ key: "item", label: "Descrição" }, ...ANO_COLS];
  const rows = despesasFixas.map((d) => ({
    item: d.label,
    a0: fmtBrl(d.anos[0]), a1: fmtBrl(d.anos[1]), a2: fmtBrl(d.anos[2]),
    a3: fmtBrl(d.anos[3]), a4: fmtBrl(d.anos[4]),
  }));
  const totalRow: Record<string, any> = {
    item: "TOTAL MENSAL",
    a0: fmtBrl(despesasFixasTotal[0]), a1: fmtBrl(despesasFixasTotal[1]), a2: fmtBrl(despesasFixasTotal[2]),
    a3: fmtBrl(despesasFixasTotal[3]), a4: fmtBrl(despesasFixasTotal[4]),
  };
  cols[0].style = (r) => (r.item === "TOTAL MENSAL" ? { fontWeight: 700 } : {});

  return (
    <div>
      <InfoBox style={{ marginBottom: "1rem" }}>
        🧾 Despesas fixas mensais com reajuste anual projetado (valores em R$/mês por ano).
      </InfoBox>
      <ChartBox style={{ marginBottom: "1rem" }}>
        <PlotlyChart {...chartDespesasEvolucao()} height={400} />
      </ChartBox>
      <SecHeader>Detalhamento por linha</SecHeader>
      <ChartBox><DataTable columns={cols} rows={[...rows, totalRow]} maxHeight={520} /></ChartBox>
    </div>
  );
}

// ─── Recursos Humanos ──────────────────────────────────────────────────────
function RecursosHumanos() {
  const cargoCols: Column[] = [
    { key: "cargo", label: "Cargo" },
    { key: "qtd", label: "Qtde", align: "right" },
    { key: "sal", label: "Salário Base", align: "right" },
    { key: "total", label: "Custo Total (c/ encargos)", align: "right" },
  ];
  const cargoRows = rhCargos
    .filter((c) => c.qtd > 0)
    .map((c) => ({ cargo: c.cargo, qtd: c.qtd, sal: fmtBrl(c.salario), total: fmtBrl(c.total) }));

  const anoCols: Column[] = [{ key: "item", label: "" }, ...ANO_COLS];
  const anoRows = [
    { item: "Quadro (nº pessoas)", a0: rhQtd[0], a1: rhQtd[1], a2: rhQtd[2], a3: rhQtd[3], a4: rhQtd[4] },
    {
      item: "Folha mensal total",
      a0: fmtBrl(rhTotalMensal[0]), a1: fmtBrl(rhTotalMensal[1]), a2: fmtBrl(rhTotalMensal[2]),
      a3: fmtBrl(rhTotalMensal[3]), a4: fmtBrl(rhTotalMensal[4]),
    },
  ];

  return (
    <div>
      <InfoBox style={{ marginBottom: "1rem" }}>
        👥 Estrutura de pessoal e custo de folha (salários + encargos + benefícios).
      </InfoBox>
      <div className="lx-grid" style={{ gridTemplateColumns: "repeat(3, 1fr)", marginBottom: "1.2rem" }}>
        <KpiCard label="Quadro inicial (Ano 1)" value={`${rhQtd[0]} pessoas`} color={COLOR.INDIGO} />
        <KpiCard label="Folha mensal (Ano 1)" value={fmtBrl(rhTotalMensal[0])} color={COLOR.ORANGE} />
        <KpiCard label="Folha mensal (Ano 5)" value={fmtBrl(rhTotalMensal[4])} color={COLOR.ORANGE} />
      </div>
      <ChartBox style={{ marginBottom: "1rem" }}>
        <PlotlyChart {...chartRhEvolucao()} height={400} />
      </ChartBox>
      <SecHeader>Quadro inicial (Ano 1)</SecHeader>
      <ChartBox style={{ marginBottom: "1rem" }}><DataTable columns={cargoCols} rows={cargoRows} /></ChartBox>
      <SecHeader>Evolução do quadro e da folha</SecHeader>
      <ChartBox><DataTable columns={anoCols} rows={anoRows} /></ChartBox>
    </div>
  );
}

// ─── DRE Anual ─────────────────────────────────────────────────────────────
function Dre() {
  const cols: Column[] = [{ key: "linha", label: "Demonstrativo (R$/ano)" }, ...ANO_COLS];
  const rows = dreAnual.map((d) => {
    const isResult = d.label.startsWith("(=)");
    return {
      linha: d.label,
      a0: fmtBrl(d.anos[0]), a1: fmtBrl(d.anos[1]), a2: fmtBrl(d.anos[2]),
      a3: fmtBrl(d.anos[3]), a4: fmtBrl(d.anos[4]),
      _r: isResult,
    };
  });
  cols.forEach((c) => {
    c.style = (r) => (r._r ? { fontWeight: 700, color: r.linha.includes("Lucro") ? COLOR.INDIGO : COLOR.GRAY_DARK } : {});
  });

  return (
    <div>
      <InfoBox style={{ marginBottom: "1rem" }}>
        📑 Demonstrativo de Resultados (DRE) consolidado por ano. O Lucro Operacional
        equivale ao lucro líquido projetado do franqueado.
      </InfoBox>
      <ChartBox style={{ marginBottom: "1rem" }}>
        <PlotlyChart {...chartDreAnual()} height={420} />
      </ChartBox>
      <SecHeader>DRE consolidado (R$/ano)</SecHeader>
      <ChartBox><DataTable columns={cols} rows={rows} /></ChartBox>
    </div>
  );
}
