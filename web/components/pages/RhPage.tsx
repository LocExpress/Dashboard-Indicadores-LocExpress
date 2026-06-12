"use client";
import { useMemo, useState } from "react";
import { KpiCard, SecHeader, DataTable, BodySelect, type Column } from "../ui";
import { fmtBrl } from "@/lib/format";
import { calcTotais, agrupar, type RhRow } from "@/lib/rh";

const C = { INDIGO: "#2D3192", ORANGE: "#F47920", GREEN: "#00C853", BLUE: "#2563EB", PURPLE: "#7C3AED" };
const SESSION_KEY = "rh_data_v1";

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
  const rows = useMemo(
    () => (data ? (unidadeView === "Todas" ? data : data.filter((r) => r.unidade === unidadeView)) : []),
    [data, unidadeView],
  );
  const tot = useMemo(() => calcTotais(rows), [rows]);
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

  // ─── Dashboard de RH ───────────────────────────────────────────────
  const detalheCols: Column[] = [
    { key: "funcionario", label: "Funcionário" },
    { key: "funcao", label: "Função" },
    { key: "setor", label: "Setor" },
    { key: "unidade", label: "Unidade" },
    { key: "salarioBruto", label: "Salário Bruto", align: "right", render: (r) => fmtBrl(r.salarioBruto) },
    { key: "beneficios", label: "Benefícios", align: "right", render: (r) => fmtBrl(r.beneficios) },
    { key: "custoTotal", label: "Custo Total", align: "right", render: (r) => fmtBrl(r.custoTotal) },
  ];
  const unidadeCols: Column[] = [
    { key: "chave", label: "Unidade" },
    { key: "headcount", label: "Funcionários", align: "right" },
    { key: "folhaBruta", label: "Folha Bruta", align: "right", render: (r) => fmtBrl(r.folhaBruta) },
    { key: "custoTotal", label: "Custo Total", align: "right", render: (r) => fmtBrl(r.custoTotal) },
  ];
  const setorCols: Column[] = [
    { key: "chave", label: "Setor" },
    { key: "headcount", label: "Funcionários", align: "right" },
    { key: "folhaBruta", label: "Folha Bruta", align: "right", render: (r) => fmtBrl(r.folhaBruta) },
    { key: "custoTotal", label: "Custo Total", align: "right", render: (r) => fmtBrl(r.custoTotal) },
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

      <div style={{ maxWidth: 320, marginBottom: "1rem" }}>
        <BodySelect
          label="🏢 Unidade"
          value={unidadeView}
          onChange={setUnidadeView}
          options={[{ value: "Todas", label: "Todas" }, ...unidades.map((u) => ({ value: u, label: u }))]}
        />
      </div>

      <div className="lx-grid" style={{ gridTemplateColumns: "repeat(5, 1fr)" }}>
        <KpiCard label="👥 Funcionários" value={String(tot.headcount)} color={C.INDIGO} />
        <KpiCard label="💰 Folha Bruta" value={fmtBrl(tot.folhaBruta)} color={C.BLUE} />
        <KpiCard label="🧾 Custo Total" value={fmtBrl(tot.custoTotal)} color={C.ORANGE} />
        <KpiCard label="📊 Salário Médio" value={fmtBrl(tot.salarioMedio)} color={C.PURPLE} />
        <KpiCard label="🎁 Benefícios" value={fmtBrl(tot.beneficios)} color={C.GREEN} />
      </div>

      <SecHeader>🏢 Custo por Unidade</SecHeader>
      <DataTable columns={unidadeCols} rows={porUnidade} maxHeight={360} />

      <SecHeader>🗂️ Custo por Setor</SecHeader>
      <DataTable columns={setorCols} rows={porSetor} maxHeight={360} />

      <SecHeader>📋 Detalhe por Funcionário</SecHeader>
      <DataTable columns={detalheCols} rows={rows} maxHeight={560} />
    </div>
  );
}
