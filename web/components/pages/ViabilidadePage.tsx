"use client";
import { useState, type ReactNode, type CSSProperties } from "react";
import { DataTable, type Column } from "../ui";
import PlotlyChart from "../charts/PlotlyChart";
import {
  chartFluxoCaixaAcumulado, chartFaturamento, chartLucratividade, chartRentabilidade,
  chartInvestimentoPie, chartDespesasEvolucao, chartRhEvolucao, chartDreAnual,
} from "../charts/viabilidade";
import { fmtBrl, fmtPct } from "@/lib/format";
import { PROJETOS, ANOS, type Projeto } from "@/lib/viabilidadeData";

// ─── Paleta executiva ──────────────────────────────────────────────────────
const C = {
  blue: "#2F3192", orange: "#F5781C", green: "#00B050", red: "#FF3B30",
  ink: "#1F2440", mid: "#6B7280", soft: "#9097A8",
};

const SUBTABS = [
  { id: "resumo", label: "Resumo", icon: "grid" },
  { id: "invest", label: "Investimento Inicial", icon: "wallet" },
  { id: "despesas", label: "Despesas Fixas", icon: "receipt" },
  { id: "rh", label: "Recursos Humanos", icon: "users" },
  { id: "dre", label: "DRE Anual", icon: "doc" },
] as const;
type SubId = (typeof SUBTABS)[number]["id"];

const ANO_COLS: Column[] = ANOS.map((a, i) => ({ key: `a${i}`, label: a, align: "right" as const }));

// ─── Ícones (SVG inline, sem dependência) ──────────────────────────────────
function Icon({ name, size = 18 }: { name: string; size?: number }) {
  const common = { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  const paths: Record<string, ReactNode> = {
    trendingUp: <><polyline points="22 7 13.5 15.5 8.5 10.5 2 17" /><polyline points="16 7 22 7 22 13" /></>,
    percent: <><line x1="19" y1="5" x2="5" y2="19" /><circle cx="6.5" cy="6.5" r="2.5" /><circle cx="17.5" cy="17.5" r="2.5" /></>,
    clock: <><circle cx="12" cy="12" r="9" /><polyline points="12 7 12 12 15.5 14" /></>,
    refresh: <><polyline points="21 3 21 9 15 9" /><path d="M21 9a9 9 0 1 0-2.6 6.4" /></>,
    wallet: <><path d="M3 7a2 2 0 0 1 2-2h13a1 1 0 0 1 1 1v2" /><path d="M3 7v10a2 2 0 0 0 2 2h14a1 1 0 0 0 1-1v-3" /><path d="M16 13a2 2 0 0 0 0 4h5v-4z" /></>,
    layers: <><polygon points="12 2 22 8.5 12 15 2 8.5 12 2" /><polyline points="2 15.5 12 22 22 15.5" /></>,
    grid: <><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></>,
    receipt: <><path d="M5 3v18l2-1.4 2 1.4 2-1.4 2 1.4 2-1.4 2 1.4V3l-2 1.4L15 3l-2 1.4L11 3 9 4.4 7 3z" /><line x1="8" y1="9" x2="16" y2="9" /><line x1="8" y1="13" x2="14" y2="13" /></>,
    users: <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /></>,
    doc: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="8" y1="13" x2="16" y2="13" /><line x1="8" y1="17" x2="13" y2="17" /></>,
    filter: <><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" /></>,
    insight: <><path d="M9 18h6" /><path d="M10 22h4" /><path d="M12 2a7 7 0 0 0-4 12.7c.6.5 1 1.3 1 2.1h6c0-.8.4-1.6 1-2.1A7 7 0 0 0 12 2z" /></>,
  };
  return <svg {...common} aria-hidden>{paths[name]}</svg>;
}

// ─── KPI card executivo ─────────────────────────────────────────────────────
function Kpi({ label, value, sub, accent, icon }: { label: string; value: string; sub?: string; accent: string; icon: string }) {
  return (
    <div className="viab-kpi" style={{ "--accent": accent } as CSSProperties}>
      <div className="viab-kpi-top">
        <div className="viab-kpi-label">{label}</div>
        <div className="viab-kpi-icon" style={{ background: `${accent}1F`, color: accent }}><Icon name={icon} /></div>
      </div>
      <div className="viab-kpi-value" style={{ color: accent }}>{value}</div>
      {sub && <div className="viab-kpi-sub">{sub}</div>}
    </div>
  );
}

// ─── Painel de gráfico ──────────────────────────────────────────────────────
function Panel({ title, sub, span, height = 320, children }: { title: string; sub?: string; span?: boolean; height?: number; children: ReactNode }) {
  return (
    <div className={`viab-panel${span ? " span-2" : ""}`}>
      <div className="viab-panel-head">
        <div className="viab-panel-title">{title}</div>
        {sub && <div className="viab-panel-sub">{sub}</div>}
      </div>
      <div style={{ height }}>{children}</div>
    </div>
  );
}

// ─── Slicer (filtro estilo Power BI) ────────────────────────────────────────
function Slicer({ label, value, options, onChange, disabled, soon }: {
  label: string; value?: string; options?: { value: string; label: string }[];
  onChange?: (v: string) => void; disabled?: boolean; soon?: boolean;
}) {
  return (
    <div className="viab-slicer">
      <span className="viab-slicer-label">
        <Icon name="filter" size={12} /> {label} {soon && <span className="viab-soon">em breve</span>}
      </span>
      <select className="viab-select" value={value ?? ""} disabled={disabled} onChange={(e) => onChange?.(e.target.value)}>
        {disabled && <option>Todos</option>}
        {options?.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}

export default function ViabilidadePage() {
  const [slug, setSlug] = useState<string>(PROJETOS[0].slug);
  const [sub, setSub] = useState<SubId>("resumo");
  const p = PROJETOS.find((x) => x.slug === slug) ?? PROJETOS[0];
  const vplPos = p.kpis.vpl >= 0;

  return (
    <div className="viab">
      {/* Título */}
      <div className="viab-title-row">
        <span className="viab-title-bar" />
        <div>
          <h2>Viabilidade Financeira</h2>
          <div className="viab-title-sub">LocHub · LocExpress Franchising — simulação de resultados em 5 anos</div>
        </div>
      </div>

      {/* Resumo executivo */}
      <div className="viab-summary">
        <div className="viab-summary-icon"><Icon name="insight" size={24} /></div>
        <div>
          <div className="viab-summary-label">Leitura executiva</div>
          <div className="viab-summary-text">
            <b>{p.nome}</b> apresenta retorno estimado em <b>{p.kpis.payback} meses</b>,
            TIR de <b>{fmtPct(p.kpis.tirAa * 100, 1)}</b> a.a. e VPL {vplPos ? "positivo" : "negativo"} de{" "}
            <b>{fmtBrl(p.kpis.vpl)}</b>. No 5º ano, a lucratividade projetada chega a{" "}
            <b>{fmtPct(p.lucratividade[4])}</b> sobre o faturamento.
          </div>
        </div>
      </div>

      {/* Filtros / slicers */}
      <div className="viab-filterbar">
        <Slicer label="Projeto" value={slug} options={PROJETOS.map((x) => ({ value: x.slug, label: x.nome }))} onChange={setSlug} />
        <Slicer label="Ano" disabled soon />
        <Slicer label="Cenário" disabled soon />
        <Slicer label="Tipo de Projeto" disabled soon />
        <Slicer label="Unidade" disabled soon />
      </div>

      {/* Navegação segmentada */}
      <div className="viab-seg">
        {SUBTABS.map((t) => (
          <button key={t.id} className={`viab-seg-btn${t.id === sub ? " active" : ""}`} onClick={() => setSub(t.id)}>
            <Icon name={t.icon} size={15} /> {t.label}
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
      style: (r) => ({ color: r.lucroNum < 0 ? C.red : C.ink, fontWeight: 600 }) },
    { key: "lucrat", label: "Lucratividade", align: "right",
      style: (r) => ({ color: r.lucratNum < 0 ? C.red : C.blue }) },
    { key: "rent", label: "Rentabilidade", align: "right",
      style: (r) => ({ color: r.rentNum < 0 ? C.red : C.green }) },
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
      <div className="viab-kpis">
        <Kpi label="VPL · Valor Presente Líquido" value={fmtBrl(p.kpis.vpl)} sub={`Taxa VPL ${fmtPct(p.kpis.taxaVpl * 100, 1)}`} accent={p.kpis.vpl >= 0 ? C.green : C.red} icon="trendingUp" />
        <Kpi label="TIR · Taxa Interna de Retorno" value={fmtPct(p.kpis.tirAa * 100, 1)} sub={`${fmtPct(p.kpis.tirAm * 100, 2)} ao mês`} accent={C.green} icon="percent" />
        <Kpi label="Payback" value={`${p.kpis.payback} meses`} sub="Tempo de retorno do investimento" accent={C.blue} icon="clock" />
        <Kpi label="Capital de Giro" value={fmtBrl(p.kpis.capitalGiro)} sub="Capital operacional necessário" accent={C.red} icon="refresh" />
        <Kpi label="Investimento Inicial" value={fmtBrl(p.kpis.investimento)} sub="Implantação da unidade" accent={C.red} icon="wallet" />
        <Kpi label="Necessidade de Capital Total" value={fmtBrl(p.kpis.necessidade)} sub="Investimento + capital de giro" accent={C.red} icon="layers" />
      </div>

      <div className="viab-grid viab-grid-2" style={{ marginBottom: "1rem" }}>
        <Panel span title="Fluxo de Caixa Acumulado" sub="Saldo acumulado de caixa ao longo de 60 meses" height={360}>
          <PlotlyChart {...chartFluxoCaixaAcumulado(p)} height={360} />
        </Panel>
        <Panel title="Faturamento Bruto Médio Mensal" sub="Média mensal por ano de operação">
          <PlotlyChart {...chartFaturamento(p)} height={320} />
        </Panel>
        <Panel title="Evolução da Lucratividade" sub="Lucro líquido mensal e % sobre o faturamento">
          <PlotlyChart {...chartLucratividade(p)} height={320} />
        </Panel>
        <Panel title="Evolução da Rentabilidade" sub="Lucro líquido mensal e retorno % sobre o capital">
          <PlotlyChart {...chartRentabilidade(p)} height={320} />
        </Panel>
        <Panel title="DRE Anual" sub="Receita × despesas operacionais × lucro">
          <PlotlyChart {...chartDreAnual(p)} height={320} />
        </Panel>
      </div>

      <div className="viab-panel">
        <div className="viab-panel-head"><div className="viab-panel-title">Resumo por Período</div><div className="viab-panel-sub">Médias mensais por ano</div></div>
        <DataTable columns={tableCols} rows={tableRows} />
      </div>
    </div>
  );
}

// ─── Investimento Inicial ──────────────────────────────────────────────────
function Investimento({ p }: { p: Projeto }) {
  const cols: Column[] = [
    { key: "item", label: "Item" },
    { key: "valor", label: "Valor", align: "right" },
    { key: "pct", label: "% do Total", align: "right", style: () => ({ color: C.mid }) },
  ];
  const rows: Record<string, any>[] = p.investimento.map((i) => ({ item: i.label, valor: fmtBrl(i.valor), pct: fmtPct(i.pct) }));
  rows.push({ item: "TOTAL", valor: fmtBrl(p.investimentoTotal), pct: "100%" });
  cols[0].style = (r) => (r.item === "TOTAL" ? { fontWeight: 700 } : {});

  return (
    <div>
      <div className="viab-kpis">
        <Kpi label="Investimento em Implantação" value={fmtBrl(p.investimentoTotal)} sub="Soma dos itens de implantação" accent={C.blue} icon="wallet" />
        <Kpi label="Capital de Giro" value={fmtBrl(p.kpis.capitalGiro)} sub="Capital operacional" accent={C.red} icon="refresh" />
        <Kpi label="Necessidade de Capital Total" value={fmtBrl(p.kpis.necessidade)} sub="Investimento + capital de giro" accent={C.red} icon="layers" />
      </div>
      <div className="viab-grid viab-grid-2">
        <Panel title="Composição do Investimento" sub="Distribuição por categoria" height={400}>
          <PlotlyChart {...chartInvestimentoPie(p)} height={400} />
        </Panel>
        <div className="viab-panel">
          <div className="viab-panel-head"><div className="viab-panel-title">Detalhamento</div><div className="viab-panel-sub">Itens do investimento inicial</div></div>
          <DataTable columns={cols} rows={rows} />
        </div>
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
      <Panel title="Despesas Fixas Mensais por Ano" sub="Total mensal com reajuste anual projetado" height={340}>
        <PlotlyChart {...chartDespesasEvolucao(p)} height={340} />
      </Panel>
      <div className="viab-panel" style={{ marginTop: "1rem" }}>
        <div className="viab-panel-head"><div className="viab-panel-title">Detalhamento por linha</div><div className="viab-panel-sub">Valores em R$/mês por ano</div></div>
        <DataTable columns={cols} rows={rows} maxHeight={520} />
      </div>
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
  const cargoRows = p.rhCargos.filter((c) => c.qtd > 0).map((c) => ({ cargo: c.cargo, qtd: c.qtd, sal: fmtBrl(c.salario), total: fmtBrl(c.total) }));

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
      <div className="viab-kpis">
        <Kpi label="Quadro Inicial (Ano 1)" value={`${p.rhQtd[0]} pessoas`} sub="Colaboradores na abertura" accent={C.blue} icon="users" />
        <Kpi label="Folha Mensal (Ano 1)" value={fmtBrl(p.rhTotalMensal[0])} sub="Salários + encargos + benefícios" accent={C.orange} icon="wallet" />
        <Kpi label="Folha Mensal (Ano 5)" value={fmtBrl(p.rhTotalMensal[4])} sub="Projeção no 5º ano" accent={C.orange} icon="trendingUp" />
      </div>
      <Panel title="Custo de Pessoal Mensal por Ano" sub="Evolução da folha de pagamento" height={340}>
        <PlotlyChart {...chartRhEvolucao(p)} height={340} />
      </Panel>
      <div className="viab-grid viab-grid-2" style={{ marginTop: "1rem" }}>
        <div className="viab-panel">
          <div className="viab-panel-head"><div className="viab-panel-title">Quadro Inicial (Ano 1)</div><div className="viab-panel-sub">Cargos e custo individual</div></div>
          <DataTable columns={cargoCols} rows={cargoRows} />
        </div>
        <div className="viab-panel">
          <div className="viab-panel-head"><div className="viab-panel-title">Evolução do Quadro e da Folha</div><div className="viab-panel-sub">Por ano de operação</div></div>
          <DataTable columns={anoCols} rows={anoRows} />
        </div>
      </div>
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
    c.style = (r) => (r._r ? { fontWeight: 700, color: r.linha.includes("Lucro") ? C.blue : C.ink } : {});
  });

  return (
    <div>
      <Panel title="DRE Anual — Receita × Despesas × Lucro" sub="Demonstrativo de resultados consolidado por ano" height={420}>
        <PlotlyChart {...chartDreAnual(p)} height={420} />
      </Panel>
      <div className="viab-panel" style={{ marginTop: "1rem" }}>
        <div className="viab-panel-head"><div className="viab-panel-title">DRE Consolidado</div><div className="viab-panel-sub">Valores em R$/ano · o Lucro Operacional equivale ao lucro líquido projetado</div></div>
        <DataTable columns={cols} rows={rows} />
      </div>
    </div>
  );
}
