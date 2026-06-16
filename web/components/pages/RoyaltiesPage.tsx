"use client";
import { useMemo, useState } from "react";
import { Kpi } from "../Kpi";
import { Slicer, Panel } from "../Slicer";
import { DataTable, type Column } from "../ui";
import PlotlyChart from "../charts/PlotlyChart";
import { chartRoyMensal, chartBarsH, chartDonut } from "../charts/performance";
import { fmtBrl } from "@/lib/format";
import { MESES_ABBR } from "@/lib/meses";
import type { RoyRow } from "@/lib/royalties";

const C = { blue: "#2F3192", orange: "#F5781C", green: "#00B050", mid: "#6B7280" };

function uniq(arr: string[]): string[] { return [...new Set(arr.filter(Boolean))].sort(); }
function groupSum<T>(rows: T[], key: (r: T) => string, val: (r: T) => number) {
  const m = new Map<string, number>();
  for (const r of rows) { const k = key(r); m.set(k, (m.get(k) ?? 0) + val(r)); }
  return m;
}

export default function RoyaltiesPage({ data, error }: { data: RoyRow[] | null; error: string | null }) {
  const [ano, setAno] = useState(""); const [mes, setMes] = useState(""); const [unidade, setUnidade] = useState("");

  const opts = useMemo(() => ({
    anos: uniq((data ?? []).map((r) => String(r.Ano ?? ""))),
    meses: uniq((data ?? []).map((r) => (r.Mes != null ? String(r.Mes) : ""))),
    unidades: uniq((data ?? []).map((r) => r.Franquia)),
  }), [data]);

  const df = useMemo(() => (data ?? []).filter((r) =>
    (!ano || String(r.Ano) === ano) && (!mes || String(r.Mes) === mes) && (!unidade || r.Franquia === unidade),
  ), [data, ano, mes, unidade]);

  const ins = useMemo(() => {
    const roy = df.reduce((a, r) => a + r.Royalties, 0);
    const fundo = df.reduce((a, r) => a + r.FundoMkt, 0);
    const taxa = df.reduce((a, r) => a + r.TaxaAdm, 0);
    const bruto = df.reduce((a, r) => a + (r.Bruto || r.Royalties + r.FundoMkt + r.TaxaAdm), 0);
    return { roy, fundo, taxa, bruto };
  }, [df]);

  const mensal = useMemo(() => {
    const m = new Map<string, { ano: number; mes: number; roy: number; fundo: number; taxa: number }>();
    for (const r of df) {
      if (r.Ano == null || r.Mes == null) continue;
      const k = `${r.Ano}-${String(r.Mes).padStart(2, "0")}`;
      const cur = m.get(k) ?? { ano: r.Ano, mes: r.Mes, roy: 0, fundo: 0, taxa: 0 };
      cur.roy += r.Royalties; cur.fundo += r.FundoMkt; cur.taxa += r.TaxaAdm; m.set(k, cur);
    }
    const arr = [...m.values()].sort((a, b) => a.ano - b.ano || a.mes - b.mes);
    return { labels: arr.map((x) => `${MESES_ABBR[x.mes] ?? x.mes}/${String(x.ano).slice(2)}`), roy: arr.map((x) => x.roy), fundo: arr.map((x) => x.fundo), taxa: arr.map((x) => x.taxa) };
  }, [df]);

  const topUni = useMemo(() => [...groupSum(df, (r) => r.Franquia, (r) => r.Royalties).entries()].sort((a, b) => b[1] - a[1]), [df]);

  if (error) return <div className="lx-error">❌ {error}</div>;
  if (!data) return <div className="info-box">Carregando royalties e fundo de marketing…</div>;

  const top10 = topUni.slice(0, 10);
  const tableCols: Column[] = [
    { key: "uni", label: "Unidade" }, { key: "roy", label: "Royalties", align: "right" },
    { key: "fundo", label: "Fundo de Mkt", align: "right" }, { key: "taxa", label: "Taxa Adm.", align: "right" },
    { key: "tot", label: "Total Bruto", align: "right", style: () => ({ fontWeight: 600 }) },
  ];
  const byUni = new Map<string, { roy: number; fundo: number; taxa: number; bruto: number }>();
  for (const r of df) {
    const cur = byUni.get(r.Franquia) ?? { roy: 0, fundo: 0, taxa: 0, bruto: 0 };
    cur.roy += r.Royalties; cur.fundo += r.FundoMkt; cur.taxa += r.TaxaAdm; cur.bruto += r.Bruto || (r.Royalties + r.FundoMkt + r.TaxaAdm); byUni.set(r.Franquia, cur);
  }
  const tableRows = [...byUni.entries()].sort((a, b) => b[1].bruto - a[1].bruto).slice(0, 20)
    .map(([u, x]) => ({ uni: u, roy: fmtBrl(x.roy), fundo: fmtBrl(x.fundo), taxa: fmtBrl(x.taxa), tot: fmtBrl(x.bruto) }));

  return (
    <div className="viab">
      <div className="filt-bar">
        <Slicer label="Ano" value={ano} options={opts.anos} onChange={setAno} />
        <Slicer label="Mês" value={mes} options={opts.meses} onChange={setMes} />
        <Slicer label="Unidade" value={unidade} options={opts.unidades} onChange={setUnidade} wide />
      </div>

      <div className="viab-kpis cols-4">
        <Kpi label="Royalties" value={fmtBrl(ins.roy)} sub="Total no período" accent={C.blue} icon="coins" />
        <Kpi label="Fundo de Marketing" value={fmtBrl(ins.fundo)} sub="Total no período" accent={C.orange} icon="megaphone" />
        <Kpi label="Taxa Administrativa" value={fmtBrl(ins.taxa)} sub="Total no período" accent={C.green} icon="receipt" />
        <Kpi label="Total Bruto" value={fmtBrl(ins.bruto)} sub="Royalties + fundo + taxa" accent={C.blue} icon="wallet" />
      </div>

      <div className="viab-grid viab-grid-2">
        <Panel span title="Royalties × Fundo × Taxa por Mês" sub="Composição mensal das receitas da franqueadora" height={360}>
          <PlotlyChart {...chartRoyMensal(mensal.labels, mensal.roy, mensal.fundo, mensal.taxa)} height={360} />
        </Panel>
        <Panel title="Top 10 Unidades por Royalties" sub="Maiores geradores no período" height={360}>
          <PlotlyChart {...chartBarsH(top10.map(([u]) => u.replace(/^LOCEXPRESS\s*/i, "")), top10.map(([, v]) => v))} height={360} />
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
