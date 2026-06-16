"use client";
import { useMemo, type ReactNode } from "react";
import { Icon } from "../Icon";
import { Kpi } from "../Kpi";
import { aggIndicators, type IndicadorRow } from "@/lib/indicators";
import { calcPctSetor, SETORES_FULL, type SgeRow } from "@/lib/sge";
import { type OrcRow } from "@/lib/orcamento";
import { fmtBrl, fmtPct } from "@/lib/format";
import { PROJETOS } from "@/lib/viabilidadeData";

const C = { blue: "#2F3192", orange: "#F5781C", green: "#00B050", red: "#FF3B30", yellow: "#FFB300", ink: "#1F2440", mid: "#6B7280" };

// ─── Cartão de drill-in para a tela detalhada ───────────────────────────────
function DrillCard({ icon, title, sub, onClick }: { icon: string; title: string; sub: string; onClick: () => void }) {
  return (
    <button className="area-drill-card" onClick={onClick}>
      <span className="area-drill-ic"><Icon name={icon} size={22} /></span>
      <span style={{ minWidth: 0 }}>
        <span className="area-drill-tt" style={{ display: "block" }}>{title}</span>
        <span className="area-drill-sub" style={{ display: "block" }}>{sub}</span>
      </span>
      <span className="area-drill-arrow"><Icon name="arrowRight" size={20} /></span>
    </button>
  );
}

function Drills({ children }: { children: ReactNode }) {
  return (<><div className="area-sec">Abrir telas da área</div><div className="area-drill">{children}</div></>);
}

// ════════════════════════════════════════════════════════════════════════
// INDICADORES — Visão Geral + Por Departamento
// ════════════════════════════════════════════════════════════════════════
export function IndicadoresOverview({ df, onOpen }: { df: IndicadorRow[]; onOpen: (s: string) => void }) {
  const ins = useMemo(() => {
    const agg = aggIndicators(df);
    const withData = agg.filter((r) => r.Atingimento != null);
    const total = agg.length;
    const nGreen = withData.filter((r) => (r.Atingimento ?? 0) >= 100).length;
    const nYellow = withData.filter((r) => (r.Atingimento ?? 0) >= 80 && (r.Atingimento ?? 0) < 100).length;
    const nRed = withData.filter((r) => (r.Atingimento ?? 0) < 80).length;
    const nNa = total - withData.length;
    const media = withData.length ? withData.reduce((a, r) => a + (r.Atingimento ?? 0), 0) / withData.length : null;
    // média por setor
    const bySetor = new Map<string, number[]>();
    withData.forEach((r) => { const k = r.Departamento || "—"; if (!bySetor.has(k)) bySetor.set(k, []); bySetor.get(k)!.push(r.Atingimento ?? 0); });
    const setores = [...bySetor.entries()].map(([k, v]) => [k, v.reduce((a, b) => a + b, 0) / v.length] as [string, number]);
    setores.sort((a, b) => b[1] - a[1]);
    const best = setores[0]; const worst = setores[setores.length - 1];
    return { total, nGreen, nYellow, nRed, nNa, media, best, worst };
  }, [df]);

  const pct = (n: number) => (ins.total > 0 ? `${Math.round((n / ins.total) * 100)}% do total` : undefined);
  const mediaColor = ins.media == null ? C.mid : ins.media >= 100 ? C.green : ins.media >= 80 ? C.yellow : C.red;

  return (
    <div>
      <div className="viab-kpis">
        <Kpi label="Total de KPIs" value={String(ins.total)} sub="Indicadores monitorados" accent={C.blue} icon="grid" />
        <Kpi label="Atingimento Médio" value={ins.media == null ? "—" : fmtPct(ins.media)} sub="Média geral de atingimento" accent={mediaColor} icon="target" />
        <Kpi label="Meta Atingida" value={String(ins.nGreen)} sub={pct(ins.nGreen)} accent={C.green} icon="check" />
        <Kpi label="Em Atenção" value={String(ins.nYellow)} sub={pct(ins.nYellow)} accent={C.yellow} icon="alert" />
        <Kpi label="Abaixo da Meta" value={String(ins.nRed)} sub={pct(ins.nRed)} accent={C.red} icon="trendingDown" />
        <Kpi label="Não Informado" value={String(ins.nNa)} sub={pct(ins.nNa)} accent={C.mid} icon="doc" />
      </div>

      {(ins.best || ins.worst) && (
        <div className="viab-grid viab-grid-2" style={{ marginBottom: "0.4rem" }}>
          {ins.best && (
            <div className="viab-panel" style={{ display: "flex", alignItems: "center", gap: "0.8rem" }}>
              <span className="area-drill-ic" style={{ background: "#e6f6ed", color: C.green }}><Icon name="trendingUp" size={20} /></span>
              <div><div className="viab-panel-sub">Melhor setor</div><div className="viab-panel-title">{ins.best[0]} · {fmtPct(ins.best[1])}</div></div>
            </div>
          )}
          {ins.worst && ins.worst[0] !== ins.best?.[0] && (
            <div className="viab-panel" style={{ display: "flex", alignItems: "center", gap: "0.8rem" }}>
              <span className="area-drill-ic" style={{ background: "#fdecec", color: C.red }}><Icon name="trendingDown" size={20} /></span>
              <div><div className="viab-panel-sub">Setor em atenção</div><div className="viab-panel-title">{ins.worst[0]} · {fmtPct(ins.worst[1])}</div></div>
            </div>
          )}
        </div>
      )}

      <Drills>
        <DrillCard icon="chart" title="Visão Geral" sub="Tabela Real × Meta × Diferença e ranking" onClick={() => onOpen("geral")} />
        <DrillCard icon="building" title="Por Departamento" sub="Drill-down por setor e indicador" onClick={() => onOpen("depto")} />
      </Drills>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════
// PROJETOS — Diagnóstico SGE + Portal do Franqueado
// ════════════════════════════════════════════════════════════════════════
export function ProjetosOverview({ sge, onOpen }: { sge: SgeRow[] | null; onOpen: (s: string) => void }) {
  const ins = useMemo(() => {
    if (!sge || sge.length === 0) return null;
    const setores = [...new Set(sge.map((r) => r.SETOR).filter(Boolean))];
    const pcts = setores
      .map((s) => [SETORES_FULL[s] ?? s, calcPctSetor(sge, s)] as [string, number | null])
      .filter((x): x is [string, number] => x[1] != null);
    if (pcts.length === 0) return null;
    pcts.sort((a, b) => b[1] - a[1]);
    const geral = pcts.reduce((a, b) => a + b[1], 0) / pcts.length;
    return { geral, best: pcts[0], worst: pcts[pcts.length - 1], n: pcts.length };
  }, [sge]);

  const col = (v: number) => (v >= 100 ? C.green : v >= 80 ? C.yellow : C.red);

  return (
    <div>
      {ins ? (
        <div className="viab-kpis">
          <Kpi label="SGE Geral" value={fmtPct(ins.geral)} sub="Média de aderência dos setores" accent={col(ins.geral)} icon="target" />
          <Kpi label="Melhor Setor" value={ins.best[0]} sub={`${fmtPct(ins.best[1])} de aderência`} accent={C.green} icon="check" />
          <Kpi label="Setor em Atenção" value={ins.worst[0]} sub={`${fmtPct(ins.worst[1])} de aderência`} accent={col(ins.worst[1])} icon="alert" />
          <Kpi label="Setores Avaliados" value={String(ins.n)} sub="Áreas no diagnóstico SGE" accent={C.blue} icon="layers" />
        </div>
      ) : (
        <div className="info-box" style={{ marginBottom: "1rem" }}>Diagnóstico SGE sem dados carregados no momento.</div>
      )}

      <Drills>
        <DrillCard icon="search" title="Diagnóstico SGE" sub="Aderência ao sistema de gestão por setor" onClick={() => onOpen("sge")} />
        <DrillCard icon="globe" title="Portal do Franqueado" sub="Analytics e indicadores do portal" onClick={() => onOpen("analytics")} />
      </Drills>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════
// FINANCEIRO — Orçamento + Viabilidade Financeira
// ════════════════════════════════════════════════════════════════════════
export function FinanceiroOverview({ orc, onOpen }: { orc: OrcRow[] | null; onOpen: (s: string) => void }) {
  const ins = useMemo(() => {
    const orcado = (orc ?? []).filter((r) => r.Tipo_Valor === "Orçado").reduce((a, r) => a + (r.Valor ?? 0), 0);
    const real = (orc ?? []).filter((r) => r.Tipo_Valor === "Realizado").reduce((a, r) => a + (r.Valor ?? 0), 0);
    const exec = orcado > 0 ? (real / orcado) * 100 : null;
    const desvio = real - orcado;
    // melhor projeto por VPL
    const best = [...PROJETOS].sort((a, b) => b.kpis.vpl - a.kpis.vpl)[0];
    return { orcado, real, exec, desvio, best, nProj: PROJETOS.length };
  }, [orc]);

  const hasOrc = ins.orcado > 0 || ins.real > 0;

  return (
    <div>
      <div className="area-sec">Orçamento</div>
      {hasOrc ? (
        <div className="viab-kpis">
          <Kpi label="Orçado (Total)" value={fmtBrl(ins.orcado)} sub="Valor planejado" accent={C.blue} icon="wallet" />
          <Kpi label="Realizado (Total)" value={fmtBrl(ins.real)} sub="Valor executado" accent={C.orange} icon="coins" />
          <Kpi label="Execução" value={ins.exec == null ? "—" : fmtPct(ins.exec)} sub="Realizado ÷ Orçado" accent={ins.exec != null && ins.exec <= 100 ? C.green : C.red} icon="percent" />
          <Kpi label="Desvio" value={fmtBrl(ins.desvio)} sub="Realizado − Orçado" accent={ins.desvio <= 0 ? C.green : C.red} icon={ins.desvio <= 0 ? "trendingDown" : "trendingUp"} />
        </div>
      ) : (
        <div className="info-box" style={{ marginBottom: "1rem" }}>Orçamento sem dados carregados no momento.</div>
      )}

      <div className="area-sec">Viabilidade Financeira</div>
      <div className="viab-kpis">
        <Kpi label="Projetos Simulados" value={String(ins.nProj)} sub="Modelos de viabilidade" accent={C.blue} icon="layers" />
        <Kpi label="Maior VPL" value={fmtBrl(ins.best.kpis.vpl)} sub={ins.best.nome} accent={C.green} icon="trendingUp" />
        <Kpi label="TIR (maior VPL)" value={fmtPct(ins.best.kpis.tirAa * 100, 1)} sub={`${ins.best.nome} · a.a.`} accent={C.green} icon="percent" />
        <Kpi label="Payback (maior VPL)" value={`${ins.best.kpis.payback} meses`} sub={ins.best.nome} accent={C.blue} icon="clock" />
      </div>

      <Drills>
        <DrillCard icon="receipt" title="Orçamento" sub="Orçado × Realizado por área e mês" onClick={() => onOpen("orc")} />
        <DrillCard icon="wallet" title="Viabilidade Financeira" sub="Simulação de resultados em 5 anos" onClick={() => onOpen("viab")} />
      </Drills>
    </div>
  );
}
