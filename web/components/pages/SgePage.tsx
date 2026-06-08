"use client";
import { useMemo, useState } from "react";
import {
  type SgeRow, SETORES_FULL, MESES_SGE, calcPctSetor, calcPctItemSetor,
  sgeStatusColor, sgeStatusIcon, findRegra, norm,
} from "@/lib/sge";
import { BodySelect, ChartBox, DataTable, type Column } from "../ui";
import PlotlyChart from "../charts/PlotlyChart";
import { chartRadar, chartEvolucaoMensalSetor, chartDrillItem } from "../charts/sge";

export default function SgePage({ data, error }: { data: SgeRow[] | null; error: string | null }) {
  const anos = useMemo(() => (data ? [...new Set(data.map((r) => r.ANO))].sort((a, b) => b - a) : []), [data]);
  const setoresDisp = useMemo(() => (data ? [...new Set(data.map((r) => r.SETOR))].filter(Boolean).sort() : []), [data]);
  const assuntos = useMemo(() => (data ? [...new Set(data.map((r) => r.ASSUNTO))].filter(Boolean).sort() : []), [data]);

  const [rawAno, setRawAno] = useState<number | null>(null);
  const anoSel = rawAno != null && anos.includes(rawAno) ? rawAno : anos[0] ?? 0;
  const [mesSel, setMesSel] = useState(0);
  const [setorView, setSetorView] = useState("Todos");
  const [rawItem, setRawItem] = useState("");
  const itemSel = assuntos.includes(rawItem) ? rawItem : assuntos[0] ?? "";

  if (error) return <div className="lx-error">❌ Erro ao carregar dados SGE: {error}</div>;
  if (!data || data.length === 0) return <div className="info-box">⚠️ Nenhum dado SGE encontrado.</div>;

  const mesF = mesSel === 0 ? null : mesSel;
  const dfF = data.filter((r) => r.ANO === anoSel && (mesF == null || r.MES === mesF));
  const setoresCalc = setorView === "Todos" ? setoresDisp : [setorView];

  const pcts = new Map<string, number | null>();
  for (const s of setoresCalc) pcts.set(s, calcPctSetor(dfF, s));
  const validVals = [...pcts.values()].filter((v): v is number => v != null);
  const mediaGeral = validVals.length ? validVals.reduce((a, b) => a + b, 0) / validVals.length : null;

  const mesLabel = mesF ? MESES_SGE[mesF - 1] : "Todos os meses";

  // memória de cálculo
  const memRows = assuntos.map((assunto) => {
    const row: Record<string, any> = { Item: assunto, Regra: findRegra(assunto) };
    let totPts = 0, totMax = 0;
    for (const setor of setoresCalc) {
      const [pts, maxi, pct] = calcPctItemSetor(dfF, assunto, setor);
      if (pts == null) { row[setor] = "—"; }
      else { row[setor] = `${Math.round(pts)}/${Math.round(maxi!)} (${Math.round(pct!)}%)`; totPts += Math.round(pts); totMax += Math.round(maxi!); }
    }
    row.TOTAL = totMax > 0 ? `${totPts}/${totMax} (${Math.round((totPts / totMax) * 100)}%)` : "—";
    return row;
  });

  const cellStyle = (v: string) => {
    if (typeof v !== "string" || v === "—") return {};
    const m = v.match(/\((\d+)%\)/);
    if (!m) return {};
    const pct = Number(m[1]);
    if (pct >= 80) return { background: "#ECFDF5", color: "#065F46", fontWeight: 700 };
    if (pct >= 60) return { background: "#FFFBEB", color: "#92400E", fontWeight: 700 };
    return { background: "#FEF2F2", color: "#991B1B", fontWeight: 700 };
  };
  const memCols: Column[] = [
    { key: "Item", label: "Item" }, { key: "Regra", label: "Regra" },
    ...setoresCalc.map((s) => ({ key: s, label: s, align: "center" as const, style: (r: Record<string, any>) => cellStyle(r[s]) })),
    { key: "TOTAL", label: "TOTAL", align: "center" as const, style: (r: Record<string, any>) => cellStyle(r.TOTAL) },
  ];

  const dfAno = data.filter((r) => r.ANO === anoSel);
  const figRadar = chartRadar(setoresCalc, pcts);
  const figEvo = chartEvolucaoMensalSetor(dfAno, setoresCalc);
  const figItem = chartDrillItem(dfAno, itemSel, setoresCalc);

  return (
    <div>
      <div style={{ background: "linear-gradient(135deg,#2D3192 0%,#F47920 100%)", borderRadius: 12, padding: "1.2rem 1.8rem", marginBottom: "1.2rem", color: "#fff" }}>
        <div style={{ fontSize: "1.3rem", fontWeight: 900 }}>🔍 Diagnóstico SGE</div>
        <div style={{ fontSize: "0.85rem", opacity: 0.88, marginTop: 4 }}>
          Sistema de Gestão Estratégica — Memória de Cálculo por Setor e Item
        </div>
      </div>

      <div className="lx-grid" style={{ gridTemplateColumns: "repeat(3, 1fr)", marginBottom: "1rem" }}>
        <BodySelect label="📅 Ano" value={String(anoSel)} onChange={(v) => setRawAno(Number(v))} options={anos.map((a) => ({ value: String(a), label: String(a) }))} />
        <BodySelect label="📆 Mês" value={String(mesSel)} onChange={(v) => setMesSel(Number(v))}
          options={[{ value: "0", label: "Todos" }, ...MESES_SGE.map((m, i) => ({ value: String(i + 1), label: m }))]} />
        <BodySelect label="🏢 Setor" value={setorView} onChange={setSetorView}
          options={[{ value: "Todos", label: "Todos" }, ...setoresDisp.map((s) => ({ value: s, label: s }))]} />
      </div>

      <div className="sge-header">📊 Resumo Geral do Diagnóstico</div>
      <div className="lx-grid" style={{ gridTemplateColumns: "repeat(4, 1fr)" }}>
        {setoresCalc.map((setor) => {
          const pct = pcts.get(setor) ?? null;
          const color = sgeStatusColor(pct);
          const subAv = dfF.filter((r) => norm(r.SETOR) === norm(setor) && r.AVALIADO);
          const ptsLabel = subAv.length
            ? `${Math.round(subAv.reduce((a, r) => a + (r.PONTOS ?? 0), 0))} / ${Math.round(subAv.reduce((a, r) => a + r.MAXIMO, 0))} pts`
            : "";
          return (
            <div key={setor} className="sge-card" style={{ borderLeft: `5px solid ${color}`, textAlign: "center" }}>
              <div style={{ fontSize: "0.65rem", fontWeight: 700, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.06em" }}>{setor}</div>
              <div style={{ fontSize: "2rem", fontWeight: 900, color, lineHeight: 1.1 }}>{pct == null ? "—" : `${Math.round(pct)}%`}</div>
              <div style={{ fontSize: "0.72rem", color, marginTop: 2 }}>{sgeStatusIcon(pct)} SGE</div>
              <div style={{ fontSize: "0.68rem", color: "#9CA3AF", marginTop: 2 }}>{ptsLabel}</div>
            </div>
          );
        })}
      </div>

      <div style={{ background: "linear-gradient(135deg,#2D3192,#1A1A6E)", borderRadius: 12, padding: "0.8rem 1.5rem", display: "flex", alignItems: "center", gap: "1rem", margin: "0.8rem 0", color: "#fff" }}>
        <span style={{ fontSize: "2.5rem", fontWeight: 900 }}>{mediaGeral == null ? "—" : `${Math.round(mediaGeral)}%`}</span>
        <div>
          <div style={{ fontWeight: 700, fontSize: "1rem" }}>Média Geral SGE</div>
          <div style={{ fontSize: "0.75rem", opacity: 0.8 }}>{mesLabel} / {anoSel}</div>
        </div>
      </div>

      {figRadar && (<><div className="sge-header">🕸️ Radar de Desempenho por Setor</div>
        <ChartBox><PlotlyChart {...figRadar} height={380} /></ChartBox></>)}

      <div className="sge-header">📋 Memória de Cálculo — Item × Setor</div>
      <div style={{ fontSize: "0.75rem", color: "#6B7280", marginBottom: "0.4rem" }}>Pontos obtidos / Pontos máximos reais (% atingida) por setor</div>
      <DataTable columns={memCols} rows={memRows} maxHeight={520} />

      <div className="sge-header">📈 Evolução Mensal — % SGE por Setor</div>
      <ChartBox><PlotlyChart {...figEvo} height={400} /></ChartBox>

      <div className="sge-header">🔎 Detalhe de Item por Mês</div>
      <div style={{ maxWidth: 480, marginBottom: "0.5rem" }}>
        <BodySelect label="Selecione o Item" value={itemSel} onChange={setRawItem} options={assuntos.map((a) => ({ value: a, label: a }))} />
      </div>
      <div className="sge-regra">📏 Regra: {findRegra(itemSel)}</div>
      <ChartBox><PlotlyChart {...figItem} height={380} /></ChartBox>
    </div>
  );
}
