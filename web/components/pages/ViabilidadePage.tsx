"use client";
import { useState } from "react";
import { SecHeader, KpiCard, ChartBox, DataTable, InfoBox, BodySelect, type Column } from "../ui";
import PlotlyChart from "../charts/PlotlyChart";
import {
  chartFluxoCaixaAcumulado, chartFaturamento, chartLucratividade, chartRentabilidade,
  chartInvestimentoPie, chartDespesasEvolucao, chartRhEvolucao, chartDreAnual,
} from "../charts/viabilidade";
import { COLOR } from "@/lib/theme";
import { fmtBrl, fmtPct } from "@/lib/format";
import { PROJETOS, ANOS, type Projeto } from "@/lib/viabilidadeData";

const SUBTABS = [
  { id: "resumo", label: "📊  Resumo" },
  { id: "invest", label: "🏗️  Investimento Inicial" },
  { id: "despesas", label: "🧾  Despesas Fixas" },
  { id: "rh", label: "👥  Recursos Humanos" },
  { id: "dre", label: "📑  DRE Anual" },
] as const;
type SubId = (typeof SUBTABS)[number]["id"];

const ANO_COLS: Column[] = ANOS.map((a, i) => ({ key: `a${i}`, label: a, align: "right" as const }));

export default function ViabilidadePage() {
  const [slug, setSlug] = useState<string>(PROJETOS[0].slug);
  const [sub, setSub] = useState<SubId>("resumo");
  const p = PROJETOS.find((x) => x.slug === slug) ?? PROJETOS[0];

  return (
    <div>
      <SecHeader>💼 Viabilidade Financeira</SecHeader>

      <div className="chart-box" style={{ padding: "0.9rem 1.2rem", marginBottom: "1rem", display: "flex", flexWrap: "wrap", gap: "1.5rem", alignItems: "flex-end" }}>
        <div style={{ minWidth: 280 }}>
          <BodySelect
            label="Projeto"
            value={slug}
            options={PROJETOS.map((x) => ({ value: x.slug, label: x.nome }))}
            onChange={setSlug}
          />
        </div>
        <div style={{ color: COLOR.GRAY_MID, fontSize: "0.85rem", paddingBottom: 6 }}>
          Simulação dos resultados do franqueado em 5 anos · valores em R$
        </div>
      </div>

      <div className="lx-tabs" style={{ marginBottom: "1rem" }}>
        {SUBTABS.map((t) => (
          <button key={t.id} className={`lx-tab${t.id === sub ? " active" : ""}`} onClick={() => setSub(t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      {sub === "resumo" && <Resumo p={p} />}
      {sub === "invest" && <Investimento p={p} />}
      {sub === "despesas" && <Despesas p={p} />}
      {sub === "rh" && <RecursosHumanos p={p} />}
      {sub === "dre" && <Dre p={p} />}
    </div>
  );
}

// ─── Resumo ─────────────────────────────────────────────────────────────────
function Resumo({ p }: { p: Projeto }) {
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
  const tableRows = ANOS.map((ano, i) => ({
    ano,
    fat: fmtBrl(p.faturamento[i]),
    lucro: fmtBrl(p.lucro[i]), lucroNum: p.lucro[i],
    lucrat: fmtPct(p.lucratividade[i]), lucratNum: p.lucratividade[i],
    rent: fmtPct(p.rentabilidade[i]), rentNum: p.rentabilidade[i],
  }));

  return (
    <div>
      <div className="lx-grid" style={{ gridTemplateColumns: "repeat(3, 1fr)", marginBottom: "1.2rem" }}>
        <KpiCard label="VPL (Valor Presente Líquido)" value={fmtBrl(p.kpis.vpl)} color={COLOR.GREEN}
          sub={`Taxa VPL: ${fmtPct(p.kpis.taxaVpl * 100, 1)}`} subColor={COLOR.GRAY_MID} />
        <KpiCard label="TIR (Taxa Interna de Retorno)" value={fmtPct(p.kpis.tirAa * 100, 1)} color={COLOR.GREEN}
          sub={`${fmtPct(p.kpis.tirAm * 100, 2)} a.m. · a.a.`} subColor={COLOR.GRAY_MID} />
        <KpiCard label="Payback" value={`${p.kpis.payback} meses`} color={COLOR.INDIGO}
          sub="Retorno do investimento" subColor={COLOR.GRAY_MID} />
        <KpiCard label="Capital de Giro" value={fmtBrl(p.kpis.capitalGiro)} color={COLOR.RED} />
        <KpiCard label="Investimento Inicial" value={fmtBrl(p.kpis.investimento)} color={COLOR.RED} />
        <KpiCard label="Necessidade de Capital Total" value={fmtBrl(p.kpis.necessidade)} color={COLOR.RED}
          sub="Investimento + Capital de Giro" subColor={COLOR.GRAY_MID} />
      </div>

      <div className="lx-grid" style={{ gridTemplateColumns: "repeat(2, 1fr)", gap: "1rem", marginBottom: "1rem" }}>
        <ChartBox><PlotlyChart {...chartFluxoCaixaAcumulado(p)} height={380} /></ChartBox>
        <ChartBox><PlotlyChart {...chartFaturamento(p)} height={380} /></ChartBox>
        <ChartBox><PlotlyChart {...chartLucratividade(p)} height={380} /></ChartBox>
        <ChartBox><PlotlyChart {...chartRentabilidade(p)} height={380} /></ChartBox>
      </div>

      <SecHeader>📋 Resumo por Período (média mensal)</SecHeader>
      <ChartBox><DataTable columns={tableCols} rows={tableRows} /></ChartBox>
    </div>
  );
}

// ─── Investimento Inicial ──────────────────────────────────────────────────
function Investimento({ p }: { p: Projeto }) {
  const cols: Column[] = [
    { key: "item", label: "Item" },
    { key: "valor", label: "Valor", align: "right" },
    { key: "pct", label: "% do Total", align: "right", style: () => ({ color: COLOR.GRAY_MID }) },
  ];
  const rows: Record<string, any>[] = p.investimento.map((i) => ({ item: i.label, valor: fmtBrl(i.valor), pct: fmtPct(i.pct) }));
  rows.push({ item: "TOTAL", valor: fmtBrl(p.investimentoTotal), pct: "100%" });
  cols[0].style = (r) => (r.item === "TOTAL" ? { fontWeight: 700 } : {});

  return (
    <div>
      <InfoBox style={{ marginBottom: "1rem" }}>
        🏗️ Composição do capital de implantação da unidade ({fmtBrl(p.investimentoTotal)}).
      </InfoBox>
      <div className="lx-grid" style={{ gridTemplateColumns: "repeat(3, 1fr)", marginBottom: "1.2rem" }}>
        <KpiCard label="Investimento em Implantação" value={fmtBrl(p.investimentoTotal)} color={COLOR.INDIGO} />
        <KpiCard label="Capital de Giro" value={fmtBrl(p.kpis.capitalGiro)} color={COLOR.RED} />
        <KpiCard label="Necessidade de Capital Total" value={fmtBrl(p.kpis.necessidade)} color={COLOR.RED} />
      </div>
      <div className="lx-grid" style={{ gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
        <ChartBox><PlotlyChart {...chartInvestimentoPie(p)} height={400} /></ChartBox>
        <ChartBox><DataTable columns={cols} rows={rows} /></ChartBox>
      </div>
    </div>
  );
}

// ─── Despesas Fixas ────────────────────────────────────────────────────────
function Despesas({ p }: { p: Projeto }) {
  const cols: Column[] = [{ key: "item", label: "Descrição" }, ...ANO_COLS];
  const rows: Record<string, any>[] = p.despesasFixas.map((d) => ({
    item: d.label,
    a0: fmtBrl(d.anos[0]), a1: fmtBrl(d.anos[1]), a2: fmtBrl(d.anos[2]),
    a3: fmtBrl(d.anos[3]), a4: fmtBrl(d.anos[4]),
  }));
  rows.push({
    item: "TOTAL MENSAL",
    a0: fmtBrl(p.despesasFixasTotal[0]), a1: fmtBrl(p.despesasFixasTotal[1]), a2: fmtBrl(p.despesasFixasTotal[2]),
    a3: fmtBrl(p.despesasFixasTotal[3]), a4: fmtBrl(p.despesasFixasTotal[4]),
  });
  cols[0].style = (r) => (r.item === "TOTAL MENSAL" ? { fontWeight: 700 } : {});

  return (
    <div>
      <InfoBox style={{ marginBottom: "1rem" }}>
        🧾 Despesas fixas mensais com reajuste anual projetado (R$/mês por ano).
      </InfoBox>
      <ChartBox style={{ marginBottom: "1rem" }}>
        <PlotlyChart {...chartDespesasEvolucao(p)} height={380} />
      </ChartBox>
      <SecHeader>Detalhamento por linha</SecHeader>
      <ChartBox><DataTable columns={cols} rows={rows} maxHeight={520} /></ChartBox>
    </div>
  );
}

// ─── Recursos Humanos ──────────────────────────────────────────────────────
function RecursosHumanos({ p }: { p: Projeto }) {
  const cargoCols: Column[] = [
    { key: "cargo", label: "Cargo" },
    { key: "qtd", label: "Qtde", align: "right" },
    { key: "sal", label: "Salário Base", align: "right" },
    { key: "total", label: "Custo Total (c/ encargos)", align: "right" },
  ];
  const cargoRows = p.rhCargos
    .filter((c) => c.qtd > 0)
    .map((c) => ({ cargo: c.cargo, qtd: c.qtd, sal: fmtBrl(c.salario), total: fmtBrl(c.total) }));

  const anoCols: Column[] = [{ key: "item", label: "" }, ...ANO_COLS];
  const anoRows: Record<string, any>[] = [
    { item: "Quadro (nº pessoas)", a0: p.rhQtd[0], a1: p.rhQtd[1], a2: p.rhQtd[2], a3: p.rhQtd[3], a4: p.rhQtd[4] },
    {
      item: "Folha mensal total",
      a0: fmtBrl(p.rhTotalMensal[0]), a1: fmtBrl(p.rhTotalMensal[1]), a2: fmtBrl(p.rhTotalMensal[2]),
      a3: fmtBrl(p.rhTotalMensal[3]), a4: fmtBrl(p.rhTotalMensal[4]),
    },
  ];

  return (
    <div>
      <InfoBox style={{ marginBottom: "1rem" }}>
        👥 Estrutura de pessoal e custo de folha (salários + encargos + benefícios).
      </InfoBox>
      <div className="lx-grid" style={{ gridTemplateColumns: "repeat(3, 1fr)", marginBottom: "1.2rem" }}>
        <KpiCard label="Quadro inicial (Ano 1)" value={`${p.rhQtd[0]} pessoas`} color={COLOR.INDIGO} />
        <KpiCard label="Folha mensal (Ano 1)" value={fmtBrl(p.rhTotalMensal[0])} color={COLOR.ORANGE} />
        <KpiCard label="Folha mensal (Ano 5)" value={fmtBrl(p.rhTotalMensal[4])} color={COLOR.ORANGE} />
      </div>
      <ChartBox style={{ marginBottom: "1rem" }}>
        <PlotlyChart {...chartRhEvolucao(p)} height={380} />
      </ChartBox>
      <SecHeader>Quadro inicial (Ano 1)</SecHeader>
      <ChartBox style={{ marginBottom: "1rem" }}><DataTable columns={cargoCols} rows={cargoRows} /></ChartBox>
      <SecHeader>Evolução do quadro e da folha</SecHeader>
      <ChartBox><DataTable columns={anoCols} rows={anoRows} /></ChartBox>
    </div>
  );
}

// ─── DRE Anual ─────────────────────────────────────────────────────────────
function Dre({ p }: { p: Projeto }) {
  const cols: Column[] = [{ key: "linha", label: "Demonstrativo (R$/ano)" }, ...ANO_COLS];
  const rows: Record<string, any>[] = p.dreAnual.map((d) => ({
    linha: d.label,
    a0: fmtBrl(d.anos[0]), a1: fmtBrl(d.anos[1]), a2: fmtBrl(d.anos[2]),
    a3: fmtBrl(d.anos[3]), a4: fmtBrl(d.anos[4]),
    _r: d.label.startsWith("(="),
  }));
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
        <PlotlyChart {...chartDreAnual(p)} height={420} />
      </ChartBox>
      <SecHeader>DRE consolidado (R$/ano)</SecHeader>
      <ChartBox><DataTable columns={cols} rows={rows} /></ChartBox>
    </div>
  );
}
