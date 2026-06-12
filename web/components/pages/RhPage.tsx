"use client";
import { useMemo, useState } from "react";
import { KpiCard, SecHeader, DataTable, BodySelect, ChartBox, Collapsible, type Column } from "../ui";
import PlotlyChart from "../charts/PlotlyChart";
import { fmtBrl } from "@/lib/format";
import { calcTotais, calcTotaisRescisao, agrupar, type RhRow } from "@/lib/rh";
import { chartCustoPorSetor, chartCustoPorUnidade, chartComposicaoCusto, chartRescisaoPorSetor, chartRescisaoComponentes } from "../charts/rh";

const C = { INDIGO: "#2D3192", ORANGE: "#F47920", GREEN: "#00C853", BLUE: "#2563EB", PURPLE: "#7C3AED" };
const SESSION_KEY = "rh_data_v2";

/** R$ compacto p/ caber nos KPIs sem quebrar linha (R$ 233,3 mil). */
function brCompact(v: number): string {
  const a = Math.abs(v);
  if (a >= 1_000_000) return `R$ ${(v / 1_000_000).toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} mi`;
  if (a >= 1_000) return `R$ ${(v / 1_000).toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} mil`;
  return fmtBrl(v);
}

function InsightCard({ icon, title, value, desc, color }: { icon: string; title: string; value: string; desc: string; color: string }) {
  return (
    <div style={{ background: "#fff", border: "1px solid #EEF0F4", borderRadius: 12, padding: "0.9rem 1rem", borderTop: `3px solid ${color}` }}>
      <div style={{ fontSize: "0.7rem", fontWeight: 700, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.05em" }}>
        {icon} {title}
      </div>
      <div style={{ fontSize: "1.45rem", fontWeight: 900, color, lineHeight: 1.15, marginTop: 4 }}>{value}</div>
      <div style={{ fontSize: "0.72rem", color: "#9CA3AF", marginTop: 3 }}>{desc}</div>
    </div>
  );
}

export default function RhPage() {
  const [data, setData] = useState<RhRow[] | null>(() => {
    if (typeof window === "undefined") return null;
    try {
      const cached = sessionStorage.getItem(SESSION_KEY);
      return cached ? (JSON.parse(cached) as RhRow[]) : null;
    } catch {
      return null;
    }
  });
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unidadeView, setUnidadeView] = useState("Todas");
  const [setorView, setSetorView] = useState("Todos");
  const [faturamento, setFaturamento] = useState("");

  async function unlock(e?: React.FormEvent) {
    e?.preventDefault();
    if (!password.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/rh", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json?.error ?? "Falha ao acessar dados de RH.");
        return;
      }
      const rows = json.data as RhRow[];
      setData(rows);
      try { sessionStorage.setItem(SESSION_KEY, JSON.stringify(rows)); } catch { /* ignore */ }
      setPassword("");
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }

  function lock() {
    setData(null);
    try { sessionStorage.removeItem(SESSION_KEY); } catch { /* ignore */ }
  }

  const unidades = useMemo(
    () => (data ? [...new Set(data.map((r) => r.unidade).filter(Boolean))].sort() : []),
    [data],
  );
  const setores = useMemo(
    () => (data ? [...new Set(data.map((r) => r.setor).filter(Boolean))].sort() : []),
    [data],
  );
  const rows = useMemo(
    () => (data ?? []).filter(
      (r) => (unidadeView === "Todas" || r.unidade === unidadeView) && (setorView === "Todos" || r.setor === setorView),
    ),
    [data, unidadeView, setorView],
  );
  const tot = useMemo(() => calcTotais(rows), [rows]);
  const totResc = useMemo(() => calcTotaisRescisao(rows), [rows]);
  const porUnidade = useMemo(() => agrupar(rows, "unidade"), [rows]);
  const porSetor = useMemo(() => agrupar(rows, "setor"), [rows]);

  // ─── Tela de bloqueio ──────────────────────────────────────────────
  if (!data) {
    return (
      <div style={{ maxWidth: 460, margin: "3rem auto", textAlign: "center" }}>
        <div style={{
          background: "linear-gradient(135deg,#2D3192 0%,#1A1A6E 100%)", borderRadius: 16,
          padding: "2.2rem 1.8rem", color: "#fff", boxShadow: "0 10px 30px rgba(45,49,146,0.25)",
        }}>
          <div style={{ fontSize: "2.4rem" }}>🔒</div>
          <div style={{ fontSize: "1.3rem", fontWeight: 900, marginTop: 6 }}>Indicadores de RH</div>
          <div style={{ fontSize: "0.83rem", opacity: 0.85, marginTop: 6 }}>
            Área restrita — salários e benefícios. Informe a senha para acessar.
          </div>
          <form onSubmit={unlock} style={{ marginTop: "1.4rem", display: "flex", flexDirection: "column", gap: 10 }}>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Senha de acesso"
              autoFocus
              style={{
                padding: "0.7rem 0.9rem", borderRadius: 10, border: "none", fontSize: "1rem",
                textAlign: "center", outline: "none",
              }}
            />
            <button
              type="submit"
              disabled={loading || !password.trim()}
              style={{
                padding: "0.7rem", borderRadius: 10, border: "none", cursor: "pointer",
                background: "#F47920", color: "#fff", fontWeight: 800, fontSize: "0.95rem",
                opacity: loading || !password.trim() ? 0.6 : 1,
              }}
            >
              {loading ? "Verificando…" : "🔓 Desbloquear"}
            </button>
          </form>
          {error && (
            <div style={{ marginTop: 12, fontSize: "0.85rem", color: "#FFD3C2", fontWeight: 700 }}>
              ⚠️ {error}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ─── Insights calculados ───────────────────────────────────────────
  const topSetor = porSetor[0];
  const topSetorPct = topSetor && tot.custoTotal > 0 ? (topSetor.custoTotal / tot.custoTotal) * 100 : 0;
  const topUnidade = porUnidade[0];
  const topUnidadePct = topUnidade && tot.custoTotal > 0 ? (topUnidade.custoTotal / tot.custoTotal) * 100 : 0;
  const benefPctFolha = tot.folhaBruta > 0 ? (tot.beneficios / tot.folhaBruta) * 100 : 0;
  const custoMedio = tot.headcount > 0 ? tot.custoTotal / tot.headcount : 0;

  const fatNum = brToNumber(faturamento);
  const folhaVsFat = fatNum && fatNum > 0 ? (tot.folhaBruta / fatNum) * 100 : null;

  const detalheCols: Column[] = [
    { key: "funcionario", label: "Funcionário" },
    { key: "funcao", label: "Função" },
    { key: "setor", label: "Setor" },
    { key: "unidade", label: "Unidade" },
    { key: "salarioBruto", label: "Salário Bruto", align: "right", render: (r) => fmtBrl(r.salarioBruto) },
    { key: "beneficios", label: "Benefícios", align: "right", render: (r) => fmtBrl(r.beneficios) },
    { key: "custoTotal", label: "Custo Total", align: "right", render: (r) => fmtBrl(r.custoTotal) },
    { key: "rescTotal", label: "Rescisão (hoje)", align: "right", render: (r) => (r.rescTotal ? fmtBrl(r.rescTotal) : "—") },
  ];

  return (
    <div>
      <div style={{
        background: "linear-gradient(135deg,#2D3192 0%,#F47920 100%)", borderRadius: 12,
        padding: "1.2rem 1.8rem", marginBottom: "1.2rem", color: "#fff",
        display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap",
      }}>
        <div>
          <div style={{ fontSize: "1.3rem", fontWeight: 900 }}>👥 Indicadores de RH</div>
          <div style={{ fontSize: "0.85rem", opacity: 0.88, marginTop: 4 }}>
            Salários, benefícios e custo de pessoal — {tot.headcount} funcionários
          </div>
        </div>
        <button
          onClick={lock}
          style={{ padding: "0.5rem 0.9rem", borderRadius: 8, border: "1px solid rgba(255,255,255,0.4)",
            background: "rgba(255,255,255,0.12)", color: "#fff", cursor: "pointer", fontWeight: 700, fontSize: "0.8rem" }}
        >
          🔒 Bloquear
        </button>
      </div>

      <div className="lx-grid" style={{ gridTemplateColumns: "repeat(2, minmax(0,320px))", marginBottom: "1.1rem" }}>
        <BodySelect
          label="🏢 Unidade"
          value={unidadeView}
          onChange={setUnidadeView}
          options={[{ value: "Todas", label: "Todas" }, ...unidades.map((u) => ({ value: u, label: u }))]}
        />
        <BodySelect
          label="🗂️ Setor"
          value={setorView}
          onChange={setSetorView}
          options={[{ value: "Todos", label: "Todos" }, ...setores.map((s) => ({ value: s, label: s }))]}
        />
      </div>

      {/* KPIs — valores compactos p/ não quebrar linha */}
      <div className="lx-grid" style={{ gridTemplateColumns: "repeat(5, minmax(0,1fr))" }}>
        <KpiCard label="👥 Funcionários" value={String(tot.headcount)} color={C.INDIGO} />
        <KpiCard label="💰 Folha Bruta" value={brCompact(tot.folhaBruta)} color={C.BLUE} sub={fmtBrl(tot.folhaBruta)} subColor="#9CA3AF" />
        <KpiCard label="🧾 Custo Total" value={brCompact(tot.custoTotal)} color={C.ORANGE} sub={fmtBrl(tot.custoTotal)} subColor="#9CA3AF" />
        <KpiCard label="📊 Salário Médio" value={brCompact(tot.salarioMedio)} color={C.PURPLE} sub={fmtBrl(tot.salarioMedio)} subColor="#9CA3AF" />
        <KpiCard label="🎁 Benefícios" value={brCompact(tot.beneficios)} color={C.GREEN} sub={fmtBrl(tot.beneficios)} subColor="#9CA3AF" />
      </div>

      {/* Insights automáticos */}
      <SecHeader>💡 Insights</SecHeader>
      <div className="lx-grid" style={{ gridTemplateColumns: "repeat(4, minmax(0,1fr))" }}>
        <InsightCard icon="🏆" title="Setor que mais consome" value={topSetor ? `${topSetor.chave}` : "—"}
          desc={topSetor ? `${topSetorPct.toFixed(1)}% do custo · ${fmtBrl(topSetor.custoTotal)}` : ""} color={C.ORANGE} />
        <InsightCard icon="🏢" title="Maior unidade" value={topUnidade ? `${topUnidade.chave}` : "—"}
          desc={topUnidade ? `${topUnidadePct.toFixed(1)}% do custo · ${topUnidade.headcount} func.` : ""} color={C.INDIGO} />
        <InsightCard icon="🎁" title="Benefícios / Folha" value={`${benefPctFolha.toFixed(1)}%`}
          desc={`Benefícios equivalem a ${benefPctFolha.toFixed(1)}% da folha bruta`} color={C.GREEN} />
        <InsightCard icon="👤" title="Custo médio / func." value={brCompact(custoMedio)}
          desc={`Custo total ÷ ${tot.headcount} funcionários`} color={C.PURPLE} />
      </div>

      {/* Folha vs Faturamento */}
      <SecHeader>📐 Folha vs. Faturamento</SecHeader>
      <div style={{ display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap", background: "#fff", border: "1px solid #EEF0F4", borderRadius: 12, padding: "1rem 1.2rem" }}>
        <div style={{ maxWidth: 240 }}>
          <label className="lx-select-label">Faturamento mensal (R$)</label>
          <input
            value={faturamento}
            onChange={(e) => setFaturamento(e.target.value)}
            placeholder="ex: 1.200.000"
            inputMode="decimal"
            className="lx-select"
            style={{ width: "100%" }}
          />
        </div>
        <div style={{ flex: 1, minWidth: 220 }}>
          {folhaVsFat == null ? (
            <div style={{ fontSize: "0.82rem", color: "#9CA3AF" }}>
              Digite o faturamento do mês para ver quanto a folha de pagamento consome da receita.
            </div>
          ) : (
            <div>
              <span style={{ fontSize: "2rem", fontWeight: 900, color: folhaVsFat > 40 ? "#EF4444" : folhaVsFat > 30 ? "#F59E0B" : "#00C853" }}>
                {folhaVsFat.toFixed(1)}%
              </span>
              <span style={{ fontSize: "0.85rem", color: "#6B7280", marginLeft: 10 }}>
                da receita é consumida pela folha bruta ({fmtBrl(tot.folhaBruta)} / {fmtBrl(fatNum!)})
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Gráficos */}
      <div className="lx-grid" style={{ gridTemplateColumns: "repeat(2, minmax(0,1fr))", marginTop: "0.4rem" }}>
        <div>
          <SecHeader>🍩 Custo por Setor (%)</SecHeader>
          <ChartBox><PlotlyChart {...chartCustoPorSetor(porSetor)} /></ChartBox>
        </div>
        <div>
          <SecHeader>🏢 Custo por Unidade</SecHeader>
          <ChartBox><PlotlyChart {...chartCustoPorUnidade(porUnidade)} /></ChartBox>
        </div>
      </div>

      <SecHeader>🧩 Composição do Custo Total</SecHeader>
      <ChartBox><PlotlyChart {...chartComposicaoCusto(rows)} /></ChartBox>

      {/* Projeção de rescisão */}
      <SecHeader>💼 Projeção de Rescisão — cenário “demitir hoje”</SecHeader>
      <div style={{ fontSize: "0.76rem", color: "#6B7280", margin: "-2px 0 8px", lineHeight: 1.5 }}>
        Passivo trabalhista estimado se os <strong>{totResc.qtdAtivos}</strong> funcionários ativos fossem desligados sem justa causa hoje.
        Cálculo por tempo de casa: <strong>13º</strong> e <strong>férias+⅓</strong> proporcionais, <strong>aviso prévio</strong> (30 + 3 dias/ano, máx 90)
        e <strong>multa 40%</strong> sobre o FGTS acumulado (8% × salário × meses). Estimativa — não considera férias vencidas não gozadas.
        Se a planilha tiver as colunas de rescisão preenchidas, <strong>os valores dela têm prioridade</strong> sobre o cálculo.
      </div>
      <div className="lx-grid" style={{ gridTemplateColumns: "repeat(5, minmax(0,1fr))" }}>
        <KpiCard label="🎄 13º Proporcional" value={brCompact(totResc.resc13)} color={C.INDIGO} sub={fmtBrl(totResc.resc13)} subColor="#9CA3AF" />
        <KpiCard label="🏖️ Férias + ⅓" value={brCompact(totResc.rescFerias)} color={C.GREEN} sub={fmtBrl(totResc.rescFerias)} subColor="#9CA3AF" />
        <KpiCard label="📄 Aviso Prévio" value={brCompact(totResc.rescAviso)} color={C.BLUE} sub={fmtBrl(totResc.rescAviso)} subColor="#9CA3AF" />
        <KpiCard label="⚖️ Multa 40% FGTS" value={brCompact(totResc.rescMulta40)} color={C.ORANGE} sub={fmtBrl(totResc.rescMulta40)} subColor="#9CA3AF" />
        <KpiCard label="💼 Passivo Total" value={brCompact(totResc.rescTotal)} color="#EF4444" sub={fmtBrl(totResc.rescTotal)} subColor="#9CA3AF" />
      </div>
      <div className="lx-grid" style={{ gridTemplateColumns: "repeat(2, minmax(0,1fr))", marginTop: "0.4rem" }}>
        <div>
          <SecHeader>🏢 Custo de Rescisão por Setor</SecHeader>
          <ChartBox><PlotlyChart {...chartRescisaoPorSetor(porSetor)} /></ChartBox>
        </div>
        <div>
          <SecHeader>📊 Composição do Passivo</SecHeader>
          <ChartBox><PlotlyChart {...chartRescisaoComponentes(totResc)} /></ChartBox>
        </div>
      </div>

      {/* Detalhe (recolhido) */}
      <div style={{ marginTop: "1rem" }}>
        <Collapsible title={`📋 Detalhe por Funcionário (${rows.length})`} defaultOpen={false}>
          <DataTable columns={detalheCols} rows={rows} maxHeight={560} />
        </Collapsible>
      </div>
    </div>
  );
}

/** Converte "1.200.000" | "1200000,50" → number, ou null. */
function brToNumber(v: string): number | null {
  let s = String(v ?? "").trim();
  if (!s) return null;
  s = s.replace(/[R$\s]/g, "");
  if (s.includes(",")) s = s.replace(/\./g, "").replace(",", ".");
  else s = s.replace(/\./g, "");
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}
