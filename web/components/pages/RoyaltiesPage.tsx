"use client";
import { useMemo, useState } from "react";
import { Kpi } from "../Kpi";
import { Slicer, Panel, Segmented } from "../Slicer";
import { DataTable, type Column } from "../ui";
import PlotlyChart from "../charts/PlotlyChart";
import { chartRoyMensal, chartLinhaMensal, chartAnual, chartBarsH, chartDonut } from "../charts/performance";
import { fmtBrl, fmtPct } from "@/lib/format";
import { MESES_ABBR } from "@/lib/meses";
import type { RoyRow } from "@/lib/royalties";

const C = { blue: "#2F3192", orange: "#F5781C", green: "#00B050", red: "#FF3B30", mid: "#6B7280" };
const mesLabel = (v: string) => MESES_ABBR[Number(v)] ?? v;
const semPrefixo = (u: string) => u.replace(/^LOCEXPRESS\s*/i, "");
const TIPOS: Record<string, string> = { royalties: "Royalties", fundo: "Fundo de Marketing", taxa: "Taxa Administrativa" };

function uniqStr(arr: string[]) { return [...new Set(arr.filter(Boolean))].sort(); }
function uniqMes(arr: (number | null)[]) { return [...new Set(arr.filter((v): v is number => v != null))].sort((a, b) => a - b).map(String); }

export default function RoyaltiesPage({ data, error }: { data: RoyRow[] | null; error: string | null }) {
  const [ano, setAno] = useState(""); const [mes, setMes] = useState(""); const [unidade, setUnidade] = useState("");
  const [tipo, setTipo] = useState(""); const [modo, setModo] = useState<"mensal" | "anual">("mensal");

  const metricOf = (r: RoyRow) => tipo === "royalties" ? r.Royalties : tipo === "fundo" ? r.FundoMkt : tipo === "taxa" ? r.TaxaAdm : r.Royalties + r.FundoMkt + r.TaxaAdm;
  const tituloTipo = tipo ? TIPOS[tipo] : "Total Bruto";

  const opts = useMemo(() => ({
    anos: uniqStr((data ?? []).map((r) => String(r.Ano ?? ""))),
    meses: uniqMes((data ?? []).map((r) => r.Mes)),
    unidades: uniqStr((data ?? []).map((r) => r.Franquia)),
  }), [data]);

  const df = useMemo(() => (data ?? []).filter((r) =>
    (!ano || String(r.Ano) === ano) && (!mes || String(r.Mes) === mes) && (!unidade || r.Franquia === unidade),
  ), [data, ano, mes, unidade]);

  const mensal = useMemo(() => {
    const m = new Map<string, { ano: number; mes: number; roy: number; fundo: number; taxa: number }>();
    for (const r of df) {
      if (r.Ano == null || r.Mes == null) continue;
      const k = `${r.Ano}-${String(r.Mes).padStart(2, "0")}`;
      const c = m.get(k) ?? { ano: r.Ano, mes: r.Mes, roy: 0, fundo: 0, taxa: 0 };
      c.roy += r.Royalties; c.fundo += r.FundoMkt; c.taxa += r.TaxaAdm; m.set(k, c);
    }
    const arr = [...m.values()].sort((a, b) => a.ano - b.ano || a.mes - b.mes);
    const metric = arr.map((x) => tipo === "royalties" ? x.roy : tipo === "fundo" ? x.fundo : tipo === "taxa" ? x.taxa : x.roy + x.fundo + x.taxa);
    return { labels: arr.map((x) => `${MESES_ABBR[x.mes] ?? x.mes}/${String(x.ano).slice(2)}`), roy: arr.map((x) => x.roy), fundo: arr.map((x) => x.fundo), taxa: arr.map((x) => x.taxa), metric };
  }, [df, tipo]);

  const anual = useMemo(() => {
    const m = new Map<number, number>();
    for (const r of df) if (r.Ano != null) m.set(r.Ano, (m.get(r.Ano) ?? 0) + metricOf(r));
    const arr = [...m.entries()].sort((a, b) => a[0] - b[0]);
    const values = arr.map(([, v]) => v);
    const growth = values.map((v, i) => (i === 0 ? null : arr[i - 1][1] > 0 ? ((v - arr[i - 1][1]) / arr[i - 1][1]) * 100 : null));
    return { years: arr.map(([y]) => String(y)), values, growth };
  }, [df, tipo]);

  const ins = useMemo(() => {
    const roy = df.reduce((a, r) => a + r.Royalties, 0);
    const fundo = df.reduce((a, r) => a + r.FundoMkt, 0);
    const taxa = df.reduce((a, r) => a + r.TaxaAdm, 0);
    const principal = df.reduce((a, r) => a + metricOf(r), 0);
    const nMeses = mensal.metric.length;
    const media = nMeses ? principal / nMeses : 0;
    const desvioMoM = nMeses >= 2 && mensal.metric[nMeses - 2] > 0 ? ((mensal.metric[nMeses - 1] - mensal.metric[nMeses - 2]) / mensal.metric[nMeses - 2]) * 100 : null;
    const unidades = new Set(df.map((r) => r.Franquia)).size;
    return { roy, fundo, taxa, principal, media, desvioMoM, unidades };
  }, [df, tipo, mensal]);

  const topUni = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of df) m.set(r.Franquia, (m.get(r.Franquia) ?? 0) + metricOf(r));
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [df, tipo]);

  if (error) return <div className="lx-error">❌ {error}</div>;
  if (!data) return <div className="info-box">Carregando royalties e fundo de marketing…</div>;

  const top10 = topUni.slice(0, 10);
  const tableCols: Column[] = [
    { key: "uni", label: "Unidade" }, { key: "roy", label: "Royalties", align: "right" },
    { key: "fundo", label: "Fundo de Mkt", align: "right" }, { key: "taxa", label: "Taxa Adm.", align: "right" },
    { key: "tot", label: "Total Bruto", align: "right", style: () => ({ fontWeight: 600 }) },
  ];
  const byUni = new Map<string, { roy: number; fundo: number; taxa: number }>();
  for (const r of df) { const c = byUni.get(r.Franquia) ?? { roy: 0, fundo: 0, taxa: 0 }; c.roy += r.Royalties; c.fundo += r.FundoMkt; c.taxa += r.TaxaAdm; byUni.set(r.Franquia, c); }
  const tableRows = [...byUni.entries()].map(([u, x]) => ({ u, ...x, tot: x.roy + x.fundo + x.taxa }))
    .sort((a, b) => b.tot - a.tot).slice(0, 20)
    .map((x) => ({ uni: semPrefixo(x.u), roy: fmtBrl(x.roy), fundo: fmtBrl(x.fundo), taxa: fmtBrl(x.taxa), tot: fmtBrl(x.tot) }));

  const toggle = <Segmented value={modo} options={[{ id: "mensal", label: "Mensal" }, { id: "anual", label: "Anual" }]} onChange={setModo} />;

  return (
    <div className="viab">
      <div className="filt-bar">
        <Slicer label="Ano" value={ano} options={opts.anos} onChange={setAno} />
        <Slicer label="Mês" value={mes} options={opts.meses} onChange={setMes} format={mesLabel} />
        <Slicer label="Tipo de Receita" value={tipo} options={["royalties", "fundo", "taxa"]} onChange={setTipo} allLabel="Todos os tipos" format={(v) => TIPOS[v] ?? v} />
        <Slicer label="Unidade" value={unidade} options={opts.unidades} onChange={setUnidade} wide />
      </div>

      <div className="viab-kpis cols-4">
        <Kpi label={tituloTipo} value={fmtBrl(ins.principal)} sub="Total no período" accent={C.blue} icon="coins" />
        <Kpi label="Média Mensal" value={fmtBrl(ins.media)} sub={tituloTipo} accent={C.orange} icon="chart" />
        <Kpi label="Desvio vs. Mês Anterior" value={ins.desvioMoM == null ? "—" : fmtPct(ins.desvioMoM)} sub="Último mês × anterior" accent={ins.desvioMoM != null && ins.desvioMoM < 0 ? C.red : C.green} icon={ins.desvioMoM != null && ins.desvioMoM < 0 ? "trendingDown" : "trendingUp"} />
        <Kpi label="Unidades Pagantes" value={String(ins.unidades)} sub="Franquias na base" accent={C.green} icon="building" />
      </div>

      <div className="viab-grid viab-grid-2">
        <Panel span title={tipo ? `${tituloTipo} por ${modo === "mensal" ? "Mês" : "Ano"}` : "Royalties × Fundo × Taxa"} sub={modo === "mensal" ? "Composição mensal das receitas da franqueadora" : "Comparação anual e crescimento (a.a.)"} height={360} action={toggle}>
          {modo === "anual"
            ? <PlotlyChart {...chartAnual(anual.years, anual.values, anual.growth, C.blue)} height={360} />
            : tipo
              ? <PlotlyChart {...chartLinhaMensal(mensal.labels, mensal.metric, C.blue)} height={360} />
              : <PlotlyChart {...chartRoyMensal(mensal.labels, mensal.roy, mensal.fundo, mensal.taxa)} height={360} />}
        </Panel>
        <Panel title={`Top 10 Unidades — ${tituloTipo}`} sub="Maiores geradores no período" height={360}>
          <PlotlyChart {...chartBarsH(top10.map(([u]) => semPrefixo(u)), top10.map(([, v]) => v))} height={360} />
        </Panel>
        <Panel title="Composição das Receitas" sub="Royalties, fundo e taxa administrativa" height={360}>
          <PlotlyChart {...chartDonut(["Royalties", "Fundo de Marketing", "Taxa Administrativa"], [ins.roy, ins.fundo, ins.taxa])} height={360} />
        </Panel>
      </div>

      <div className="viab-panel" style={{ marginTop: "1rem" }}>
        <div className="viab-panel-head"><div className="viab-panel-title">Detalhamento por Unidade</div><div className="viab-panel-sub">Top 20 por total bruto no período</div></div>
        <DataTable columns={tableCols} rows={tableRows} maxHeight={460} />
      </div>
    </div>
  );
}
