"use client";
import { useMemo, useState } from "react";
import { Kpi } from "../Kpi";
import { Slicer, Panel, Segmented } from "../Slicer";
import { DataTable, type Column } from "../ui";
import PlotlyChart from "../charts/PlotlyChart";
import { chartLinhaMensal, chartAnual, chartBarsH, chartBarsV, chartDonut, chartMapa } from "../charts/performance";
import { fmtBrl, fmtPct } from "@/lib/format";
import { MESES_ABBR } from "@/lib/meses";
import type { FatRow } from "@/lib/faturamento";

const C = { blue: "#2F3192", orange: "#F5781C", green: "#00B050", red: "#FF3B30", mid: "#6B7280" };
const mesLabel = (v: string) => MESES_ABBR[Number(v)] ?? v;
const semPrefixo = (u: string) => u.replace(/^LOCEXPRESS\s*/i, "");

function uniqStr(arr: string[]) { return [...new Set(arr.filter(Boolean))].sort(); }
function uniqMes(arr: (number | null)[]) { return [...new Set(arr.filter((v): v is number => v != null))].sort((a, b) => a - b).map(String); }
function groupSum<T>(rows: T[], key: (r: T) => string, val: (r: T) => number) {
  const m = new Map<string, number>();
  for (const r of rows) { const k = key(r); m.set(k, (m.get(k) ?? 0) + val(r)); }
  return m;
}
function ticket<T>(rows: T[], key: (r: T) => string, valor: (r: T) => number, qtd: (r: T) => number) {
  const v = new Map<string, number>(); const q = new Map<string, number>();
  for (const r of rows) { const k = key(r); v.set(k, (v.get(k) ?? 0) + valor(r)); q.set(k, (q.get(k) ?? 0) + qtd(r)); }
  return [...v.entries()].map(([k, val]) => [k, (q.get(k) ?? 0) > 0 ? val / (q.get(k) as number) : 0] as [string, number]);
}

export default function PerformancePage({ data, error }: { data: FatRow[] | null; error: string | null }) {
  const [ano, setAno] = useState(""); const [mes, setMes] = useState(""); const [projeto, setProjeto] = useState("");
  const [regiao, setRegiao] = useState(""); const [unidade, setUnidade] = useState("");
  const [modo, setModo] = useState<"mensal" | "anual">("mensal");

  const opts = useMemo(() => ({
    anos: uniqStr((data ?? []).map((r) => String(r.Ano ?? ""))),
    meses: uniqMes((data ?? []).map((r) => r.Mes)),
    projetos: uniqStr((data ?? []).map((r) => r.Projeto)),
    regioes: uniqStr((data ?? []).map((r) => r.Regiao)),
    unidades: uniqStr((data ?? []).map((r) => r.Franquia)),
  }), [data]);

  const df = useMemo(() => (data ?? []).filter((r) =>
    (!ano || String(r.Ano) === ano) && (!mes || String(r.Mes) === mes) &&
    (!projeto || r.Projeto === projeto) && (!regiao || r.Regiao === regiao) && (!unidade || r.Franquia === unidade),
  ), [data, ano, mes, projeto, regiao, unidade]);

  const mensal = useMemo(() => {
    const m = new Map<string, { ano: number; mes: number; v: number }>();
    for (const r of df) { if (r.Ano == null || r.Mes == null) continue; const k = `${r.Ano}-${String(r.Mes).padStart(2, "0")}`; const c = m.get(k) ?? { ano: r.Ano, mes: r.Mes, v: 0 }; c.v += r.Faturamento; m.set(k, c); }
    const arr = [...m.values()].sort((a, b) => a.ano - b.ano || a.mes - b.mes);
    return { labels: arr.map((x) => `${MESES_ABBR[x.mes] ?? x.mes}/${String(x.ano).slice(2)}`), values: arr.map((x) => x.v) };
  }, [df]);

  const anual = useMemo(() => {
    const m = new Map<number, number>();
    for (const r of df) if (r.Ano != null) m.set(r.Ano, (m.get(r.Ano) ?? 0) + r.Faturamento);
    const arr = [...m.entries()].sort((a, b) => a[0] - b[0]);
    const values = arr.map(([, v]) => v);
    const growth = values.map((v, i) => (i === 0 ? null : arr[i - 1][1] > 0 ? ((v - arr[i - 1][1]) / arr[i - 1][1]) * 100 : null));
    return { years: arr.map(([y]) => String(y)), values, growth };
  }, [df]);

  const ins = useMemo(() => {
    const total = df.reduce((a, r) => a + r.Faturamento, 0);
    const unidades = new Set(df.map((r) => r.Franquia)).size;
    const medio = df.length ? total / df.length : 0;
    const qtd = df.reduce((a, r) => a + r.Qtd, 0);
    const locacoes = df.reduce((a, r) => a + r.LocacaoQtd, 0);
    const tkt = qtd > 0 ? total / qtd : 0;
    const cresc = df.map((r) => r.Crescimento).filter((v): v is number => v != null);
    const crescMed = cresc.length ? cresc.reduce((a, b) => a + b, 0) / cresc.length : null;
    const n = mensal.values.length;
    const desvioMoM = n >= 2 && mensal.values[n - 2] > 0 ? ((mensal.values[n - 1] - mensal.values[n - 2]) / mensal.values[n - 2]) * 100 : null;
    const topUni = [...groupSum(df, (r) => r.Franquia, (r) => r.Faturamento).entries()].sort((a, b) => b[1] - a[1]);
    return { total, unidades, medio, qtd, locacoes, tkt, crescMed, desvioMoM, topUni };
  }, [df, mensal]);

  const porRegiao = useMemo(() => [...groupSum(df, (r) => r.Regiao, (r) => r.Faturamento).entries()].sort((a, b) => b[1] - a[1]), [df]);
  const porEstado = useMemo(() => [...groupSum(df, (r) => r.Estado, (r) => r.Faturamento).entries()].filter(([k]) => k) as [string, number][], [df]);
  const tktRegiao = useMemo(() => ticket(df, (r) => r.Regiao, (r) => r.Faturamento, (r) => r.Qtd).sort((a, b) => b[1] - a[1]), [df]);
  const tktProjeto = useMemo(() => ticket(df, (r) => r.Projeto, (r) => r.Faturamento, (r) => r.Qtd).sort((a, b) => b[1] - a[1]), [df]);
  const tempoCasa = useMemo(() => [...groupSum(df, (r) => r.TempoImplantacao || "—", (r) => r.Faturamento).entries()].sort((a, b) => b[1] - a[1]), [df]);
  const porCategoria = useMemo(() => {
    const s = (f: (r: FatRow) => number) => df.reduce((a, r) => a + f(r), 0);
    return ([["Locação", s((r) => r.Locacao)], ["Renovação", s((r) => r.Renovacao)], ["Serviços", s((r) => r.Servicos)], ["Venda", s((r) => r.Venda)], ["Manutenção", s((r) => r.Manutencao)]] as [string, number][]).filter(([, v]) => v > 0);
  }, [df]);

  if (error) return <div className="lx-error">❌ {error}</div>;
  if (!data) return <div className="info-box">Carregando faturamento das unidades…</div>;

  const top10 = ins.topUni.slice(0, 10);
  const tableCols: Column[] = [
    { key: "uni", label: "Unidade" }, { key: "fat", label: "Faturamento", align: "right" }, { key: "part", label: "% do total", align: "right", style: () => ({ color: C.mid }) },
  ];
  const tableRows = ins.topUni.slice(0, 15).map(([u, v]) => ({ uni: semPrefixo(u), fat: fmtBrl(v), part: ins.total > 0 ? fmtPct((v / ins.total) * 100) : "—" }));

  const toggle = <Segmented value={modo} options={[{ id: "mensal", label: "Mensal" }, { id: "anual", label: "Anual" }]} onChange={setModo} />;

  return (
    <div className="viab">
      <div className="filt-bar">
        <Slicer label="Ano" value={ano} options={opts.anos} onChange={setAno} />
        <Slicer label="Mês" value={mes} options={opts.meses} onChange={setMes} format={mesLabel} />
        <Slicer label="Projeto" value={projeto} options={opts.projetos} onChange={setProjeto} />
        <Slicer label="Região" value={regiao} options={opts.regioes} onChange={setRegiao} />
        <Slicer label="Unidade" value={unidade} options={opts.unidades} onChange={setUnidade} wide />
      </div>

      <div className="viab-kpis cols-4">
        <Kpi label="Faturamento Total" value={fmtBrl(ins.total)} sub={`${df.length} registros · ${ins.unidades} unidades`} accent={C.green} icon="coins" />
        <Kpi label="Faturamento Médio" value={fmtBrl(ins.medio)} sub="Por unidade / mês" accent={C.orange} icon="chart" />
        <Kpi label="Ticket Médio" value={fmtBrl(ins.tkt)} sub="Faturamento por contrato" accent={C.blue} icon="receipt" />
        <Kpi label="Contratos (Locações)" value={ins.locacoes.toLocaleString("pt-BR")} sub="Quantidade no período" accent={C.blue} icon="layers" />
        <Kpi label="Crescimento Médio" value={ins.crescMed == null ? "—" : fmtPct(ins.crescMed)} sub="Variação mensal média" accent={ins.crescMed != null && ins.crescMed < 0 ? C.red : C.green} icon={ins.crescMed != null && ins.crescMed < 0 ? "trendingDown" : "trendingUp"} />
        <Kpi label="Desvio vs. Mês Anterior" value={ins.desvioMoM == null ? "—" : fmtPct(ins.desvioMoM)} sub="Último mês × anterior" accent={ins.desvioMoM != null && ins.desvioMoM < 0 ? C.red : C.green} icon={ins.desvioMoM != null && ins.desvioMoM < 0 ? "trendingDown" : "trendingUp"} />
        <Kpi label="Unidades Ativas" value={String(ins.unidades)} sub="Franquias com faturamento" accent={C.blue} icon="building" />
        <Kpi label="Itens Faturados" value={ins.qtd.toLocaleString("pt-BR")} sub="Total de contratos/itens" accent={C.orange} icon="grid" />
      </div>

      <div className="viab-grid viab-grid-2">
        <Panel span title="Evolução do Faturamento" sub={modo === "mensal" ? "Soma mensal das unidades" : "Comparação anual e crescimento (a.a.)"} height={350} action={toggle}>
          {modo === "mensal"
            ? <PlotlyChart {...chartLinhaMensal(mensal.labels, mensal.values)} height={350} />
            : <PlotlyChart {...chartAnual(anual.years, anual.values, anual.growth)} height={350} />}
        </Panel>
        <Panel title="Faturamento por Estado (Mapa)" sub="Bolhas proporcionais ao faturamento" height={420}>
          <PlotlyChart {...chartMapa(porEstado)} height={420} />
        </Panel>
        <Panel title="Top 10 Unidades" sub="Faturamento acumulado no período" height={420}>
          <PlotlyChart {...chartBarsH(top10.map(([u]) => semPrefixo(u)), top10.map(([, v]) => v))} height={420} />
        </Panel>
        <Panel title="Composição por Categoria" sub="Locação, renovação, serviços, venda e manutenção" height={360}>
          <PlotlyChart {...chartDonut(porCategoria.map(([k]) => k), porCategoria.map(([, v]) => v))} height={360} />
        </Panel>
        <Panel title="Ticket Médio por Projeto" sub="Faturamento por contrato em cada tipo" height={320}>
          <PlotlyChart {...chartBarsH(tktProjeto.map(([k]) => k), tktProjeto.map(([, v]) => v), C.orange)} height={320} />
        </Panel>
        <Panel title="Faturamento por Tempo de Casa" sub="Maturidade das unidades" height={320}>
          <PlotlyChart {...chartDonut(tempoCasa.map(([k]) => k), tempoCasa.map(([, v]) => v))} height={320} />
        </Panel>
        <Panel title="Ticket Médio por Região" sub="Faturamento por contrato por região" height={320}>
          <PlotlyChart {...chartBarsH(tktRegiao.map(([k]) => k), tktRegiao.map(([, v]) => v), C.orange)} height={320} />
        </Panel>
        <Panel title="Faturamento por Região" sub="Distribuição geográfica" height={320}>
          <PlotlyChart {...chartBarsV(porRegiao.map(([k]) => k), porRegiao.map(([, v]) => v))} height={320} />
        </Panel>
      </div>

      <div className="viab-panel" style={{ marginTop: "1rem" }}>
        <div className="viab-panel-head"><div className="viab-panel-title">Ranking de Unidades</div><div className="viab-panel-sub">Top 15 por faturamento no período</div></div>
        <DataTable columns={tableCols} rows={tableRows} maxHeight={460} />
      </div>
    </div>
  );
}
