"use client";
import { useMemo, useState } from "react";
import { Kpi } from "../Kpi";
import { Slicer, Panel } from "../Slicer";
import { DataTable, type Column } from "../ui";
import PlotlyChart from "../charts/PlotlyChart";
import { chartDonut, chartFunil, chartBarLinha } from "../charts/performance";
import { fmtPct } from "@/lib/format";
import type { ImplRow } from "@/lib/implantacao";

const C = { blue: "#2F3192", orange: "#F5781C", green: "#00B050", red: "#FF3B30", mid: "#6B7280" };
const semPrefixo = (u: string) => u.replace(/^LOCEXPRESS\s*/i, "");

function uniqStr(arr: string[]) { return [...new Set(arr.filter(Boolean))].sort(); }
function countBy<T>(rows: T[], key: (r: T) => string) {
  const m = new Map<string, number>();
  for (const r of rows) { const k = key(r); if (k) m.set(k, (m.get(k) ?? 0) + 1); }
  return [...m.entries()];
}

export default function ImplantacaoPage({ data, error }: { data: ImplRow[] | null; error: string | null }) {
  const [projeto, setProjeto] = useState(""); const [sistema, setSistema] = useState(""); const [status, setStatus] = useState("");
  const [regiao, setRegiao] = useState(""); const [estado, setEstado] = useState("");

  const opts = useMemo(() => ({
    projetos: uniqStr((data ?? []).map((r) => r.Projeto)),
    sistemas: uniqStr((data ?? []).map((r) => r.Sistema)),
    status: uniqStr((data ?? []).map((r) => r.Status)),
    regioes: uniqStr((data ?? []).map((r) => r.Regiao)),
    estados: uniqStr((data ?? []).map((r) => r.Estado)),
  }), [data]);

  const df = useMemo(() => (data ?? []).filter((r) =>
    (!projeto || r.Projeto === projeto) && (!sistema || r.Sistema === sistema) && (!status || r.Status === status) &&
    (!regiao || r.Regiao === regiao) && (!estado || r.Estado === estado),
  ), [data, projeto, sistema, status, regiao, estado]);

  const ins = useMemo(() => {
    const operacoes = df.length;
    const estados = new Set(df.map((r) => r.Estado).filter(Boolean)).size;
    const cidades = new Set(df.map((r) => r.Cidade).filter(Boolean)).size;
    const ativas = df.filter((r) => r.Status.toUpperCase() === "ATIVA").length;
    const temposNum = df.map((r) => r.Tempo).filter((v): v is number => v != null);
    const tempoMed = temposNum.length ? temposNum.reduce((a, b) => a + b, 0) / temposNum.length : null;
    const dentro = df.filter((r) => r.Aderencia.toUpperCase() === "DENTRO DO PRAZO").length;
    const fora = df.filter((r) => r.Aderencia.toUpperCase() === "FORA DO PRAZO").length;
    const aderencia = dentro + fora > 0 ? (dentro / (dentro + fora)) * 100 : null;
    return { operacoes, estados, cidades, ativas, tempoMed, aderencia };
  }, [df]);

  const porAno = useMemo(() => {
    const m = new Map<number, { n: number; soma: number; cnt: number }>();
    for (const r of df) { if (r.AnoInaug == null) continue; const c = m.get(r.AnoInaug) ?? { n: 0, soma: 0, cnt: 0 }; c.n += 1; if (r.Tempo != null) { c.soma += r.Tempo; c.cnt += 1; } m.set(r.AnoInaug, c); }
    const arr = [...m.entries()].sort((a, b) => a[0] - b[0]);
    return { labels: arr.map(([y]) => String(y)), counts: arr.map(([, v]) => v.n), tempos: arr.map(([, v]) => (v.cnt ? v.soma / v.cnt : 0)) };
  }, [df]);

  const porStatus = useMemo(() => countBy(df, (r) => r.Status).sort((a, b) => b[1] - a[1]), [df]);
  const porSistema = useMemo(() => countBy(df, (r) => r.Sistema).sort((a, b) => b[1] - a[1]), [df]);
  const porProjeto = useMemo(() => countBy(df, (r) => r.Projeto).sort((a, b) => b[1] - a[1]), [df]);

  if (error) return <div className="lx-error">❌ {error}</div>;
  if (!data) return <div className="info-box">Carregando dados de implantação…</div>;

  const tableCols: Column[] = [
    { key: "uni", label: "Franquia" }, { key: "proj", label: "Projeto" }, { key: "sis", label: "Sistema" },
    { key: "st", label: "Status" }, { key: "tempo", label: "Tempo (dias)", align: "right" }, { key: "reg", label: "Região" },
  ];
  const tableRows = [...df].sort((a, b) => (b.Tempo ?? -1) - (a.Tempo ?? -1)).map((r) => ({
    uni: semPrefixo(r.Franquia), proj: r.Projeto, sis: r.Sistema || "—", st: r.Status, tempo: r.Tempo ?? "—", reg: r.Regiao,
  }));

  return (
    <div className="viab">
      <div className="filt-bar">
        <Slicer label="Projeto" value={projeto} options={opts.projetos} onChange={setProjeto} />
        <Slicer label="Sistema" value={sistema} options={opts.sistemas} onChange={setSistema} />
        <Slicer label="Status" value={status} options={opts.status} onChange={setStatus} />
        <Slicer label="Região" value={regiao} options={opts.regioes} onChange={setRegiao} />
        <Slicer label="Estado" value={estado} options={opts.estados} onChange={setEstado} />
      </div>

      <div className="viab-kpis cols-4">
        <Kpi label="Operações" value={String(ins.operacoes)} sub="Unidades cadastradas" accent={C.blue} icon="building" />
        <Kpi label="Unidades Ativas" value={String(ins.ativas)} sub={ins.operacoes ? fmtPct((ins.ativas / ins.operacoes) * 100) + " do total" : undefined} accent={C.green} icon="check" />
        <Kpi label="Tempo Médio de Implantação" value={ins.tempoMed == null ? "—" : `${ins.tempoMed.toFixed(0)} dias`} sub="Da assinatura à inauguração" accent={C.orange} icon="clock" />
        <Kpi label="Aderência ao Prazo" value={ins.aderencia == null ? "—" : fmtPct(ins.aderencia)} sub="Dentro do prazo" accent={ins.aderencia != null && ins.aderencia < 60 ? C.red : C.green} icon="target" />
        <Kpi label="Estados" value={String(ins.estados)} sub="Presença geográfica" accent={C.blue} icon="globe" />
        <Kpi label="Cidades" value={String(ins.cidades)} sub="Municípios atendidos" accent={C.blue} icon="building" />
        <Kpi label="Em Implantação" value={String(df.filter((r) => ["A IMPLANTAR", "EM IMPLANTAÇÃO", "AGUARDANDO ASSINATURA", "AGUARDANDO PGTO"].includes(r.Status.toUpperCase())).length)} sub="No pipeline de abertura" accent={C.orange} icon="layers" />
        <Kpi label="Inativas" value={String(df.filter((r) => r.Status.toUpperCase() === "INATIVA").length)} sub="Unidades encerradas" accent={C.red} icon="trendingDown" />
      </div>

      <div className="viab-grid viab-grid-2">
        <Panel span title="Implantações por Ano" sub="Inaugurações e tempo médio de implantação (dias)" height={350}>
          <PlotlyChart {...chartBarLinha(porAno.labels, porAno.counts, "Inaugurações", porAno.tempos, "Tempo médio", "d")} height={350} />
        </Panel>
        <Panel title="Status de Implantação" sub="Funil por situação das unidades" height={360}>
          <PlotlyChart {...chartFunil(porStatus.map(([k]) => k), porStatus.map(([, v]) => v))} height={360} />
        </Panel>
        <Panel title="Divisão por Sistema" sub="SISLOC × WayExpress" height={360}>
          <PlotlyChart {...chartDonut(porSistema.map(([k]) => k), porSistema.map(([, v]) => v))} height={360} />
        </Panel>
        <Panel span title="Divisão por Projeto" sub="Tipo de unidade contratado" height={340}>
          <PlotlyChart {...chartDonut(porProjeto.map(([k]) => k), porProjeto.map(([, v]) => v))} height={340} />
        </Panel>
      </div>

      <div className="viab-panel" style={{ marginTop: "1rem" }}>
        <div className="viab-panel-head"><div className="viab-panel-title">Dados das Unidades</div><div className="viab-panel-sub">{df.length} unidades</div></div>
        <DataTable columns={tableCols} rows={tableRows} maxHeight={480} />
      </div>
    </div>
  );
}
