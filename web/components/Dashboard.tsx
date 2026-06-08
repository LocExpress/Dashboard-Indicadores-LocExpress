"use client";
import { useEffect, useMemo, useState } from "react";
import Header from "./Header";
import { MultiSelect } from "./ui";
import LogoSvg from "./LogoSvg";
import { loadIndicadores } from "@/lib/data";
import { loadSge, type SgeRow } from "@/lib/sge";
import { loadOrcamento, type OrcRow } from "@/lib/orcamento";
import type { IndicadorRow } from "@/lib/indicators";
import { MESES_PT } from "@/lib/meses";
import VisaoGeral from "./pages/VisaoGeral";
import PorDepartamento from "./pages/PorDepartamento";
import SgePage from "./pages/SgePage";
import OrcamentoPage from "./pages/OrcamentoPage";
import Marketing from "./pages/Marketing";

const TABS = [
  { id: "geral", label: "📊  Visão Geral", sidebar: true },
  { id: "depto", label: "🏢  Por Departamento", sidebar: true },
  { id: "sge", label: "🔍  Diagnóstico SGE", sidebar: false },
  { id: "orc", label: "💰  Orçamento", sidebar: false },
  { id: "mkt", label: "📣  Marketing", sidebar: false },
] as const;

type TabId = (typeof TABS)[number]["id"];

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [indic, setIndic] = useState<IndicadorRow[] | null>(null);
  const [indicErr, setIndicErr] = useState<string | null>(null);
  const [sge, setSge] = useState<SgeRow[] | null>(null);
  const [sgeErr, setSgeErr] = useState<string | null>(null);
  const [orc, setOrc] = useState<OrcRow[] | null>(null);
  const [orcErr, setOrcErr] = useState<string | null>(null);

  const [tab, setTab] = useState<TabId>("geral");

  // filtros globais (indicadores)
  const [selAno, setSelAno] = useState<Set<number>>(new Set());
  const [selMes, setSelMes] = useState<Set<number>>(new Set());
  const [selDep, setSelDep] = useState<Set<string>>(new Set());
  const [selInd, setSelInd] = useState<Set<string>>(new Set());

  async function loadAll() {
    setLoading(true);
    const [i, s, o] = await Promise.all([loadIndicadores(), loadSge(), loadOrcamento()]);
    setIndic(i.data); setIndicErr(i.error);
    setSge(s.data); setSgeErr(s.error);
    setOrc(o.data); setOrcErr(o.error);
    if (i.data) {
      setSelAno(new Set(uniqNums(i.data.map((r) => r.Ano))));
      setSelMes(new Set(uniqNums(i.data.map((r) => r.Mes))));
      setSelDep(new Set(uniqStrs(i.data.map((r) => r.Departamento))));
      setSelInd(new Set(uniqStrs(i.data.map((r) => r.Indicador))));
    }
    setLoading(false);
  }

  useEffect(() => { loadAll(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  const opts = useMemo(() => {
    if (!indic) return { anos: [], meses: [], deptos: [], inds: [] };
    return {
      anos: uniqNums(indic.map((r) => r.Ano)).sort((a, b) => a - b),
      meses: uniqNums(indic.map((r) => r.Mes)).sort((a, b) => a - b),
      deptos: uniqStrs(indic.map((r) => r.Departamento)).sort(),
      inds: uniqStrs(indic.map((r) => r.Indicador)).sort(),
    };
  }, [indic]);

  const dfFiltered = useMemo(() => {
    if (!indic) return [];
    return indic.filter(
      (r) =>
        r.Ano != null && selAno.has(r.Ano) &&
        r.Mes != null && selMes.has(r.Mes) &&
        selDep.has(r.Departamento) &&
        selInd.has(r.Indicador),
    );
  }, [indic, selAno, selMes, selDep, selInd]);

  if (loading) {
    return (
      <div className="lx-container">
        <div className="lx-spinner">⏳ Carregando dados das planilhas…</div>
      </div>
    );
  }

  const current = TABS.find((t) => t.id === tab)!;

  const pageNode = (() => {
    switch (tab) {
      case "geral":
        return <VisaoGeral df={dfFiltered} error={indicErr} />;
      case "depto":
        return <PorDepartamento df={dfFiltered} dfFull={indic ?? []} selAno={[...selAno]} error={indicErr} />;
      case "sge":
        return <SgePage data={sge} error={sgeErr} />;
      case "orc":
        return <OrcamentoPage data={orc} error={orcErr} />;
      case "mkt":
        return <Marketing />;
    }
  })();

  return (
    <div className="lx-container">
      <Header nFiltered={dfFiltered.length} nTotal={indic?.length ?? 0} />

      <div className="lx-tabs">
        {TABS.map((t) => (
          <button key={t.id} className={`lx-tab${t.id === tab ? " active" : ""}`} onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      {current.sidebar ? (
        <div className="lx-shell">
          <aside className="lx-sidebar">
            <SidebarBrand />
            <div className="lx-sidebar-title">🔍 Filtros</div>
            <MultiSelect label="Ano" options={opts.anos} selected={selAno} onChange={setSelAno} />
            <MultiSelect label="Mês" options={opts.meses} selected={selMes} onChange={setSelMes} formatLabel={(m) => MESES_PT[m] ?? String(m)} />
            <MultiSelect label="Setor" options={opts.deptos} selected={selDep} onChange={setSelDep} />
            <MultiSelect label="Indicador" options={opts.inds} selected={selInd} onChange={setSelInd} />
            <div style={{ marginTop: "1rem" }}>
              <button className="lx-btn" onClick={loadAll}>🔄 Atualizar Dados</button>
            </div>
          </aside>
          <main style={{ minWidth: 0 }}>{pageNode}</main>
        </div>
      ) : (
        <div>{pageNode}</div>
      )}
    </div>
  );
}

function SidebarBrand() {
  return (
    <div style={{ textAlign: "center", padding: "0.4rem 0 1rem" }}>
      <div style={{ width: 56, height: 56, background: "rgba(255,255,255,0.08)", borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 0.6rem", padding: 6 }}>
        <LogoSvg color="#F47920" size={44} />
      </div>
      <div style={{ fontSize: "1.1rem", fontWeight: 900, color: "#fff" }}>
        <span style={{ color: "#F47920" }}>Loc</span>Express
      </div>
      <div style={{ fontSize: "0.72rem", fontStyle: "italic", fontWeight: 700, color: "#F47920" }}>Franchising</div>
      <div style={{ fontSize: "0.6rem", color: "#AABFFF", letterSpacing: "0.08em", textTransform: "uppercase", marginTop: 3 }}>
        Nosso DNA é locação!
      </div>
    </div>
  );
}

function uniqNums(arr: (number | null)[]): number[] {
  return [...new Set(arr.filter((v): v is number => v != null))];
}
function uniqStrs(arr: string[]): string[] {
  return [...new Set(arr.filter((v) => v && v.trim() !== ""))];
}
