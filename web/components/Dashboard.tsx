"use client";
import { useEffect, useMemo, useState } from "react";
import Header from "./Header";
import { Icon } from "./Icon";
import { MultiSelect } from "./ui";
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
import GoogleAnalytics from "./pages/GoogleAnalytics";
import RhPage from "./pages/RhPage";
import ViabilidadePage from "./pages/ViabilidadePage";
import { IndicadoresOverview, ProjetosOverview, FinanceiroOverview } from "./pages/AreaOverviews";

// ─── Telas e áreas ──────────────────────────────────────────────────────────
type ScreenId = "geral" | "depto" | "sge" | "analytics" | "orc" | "viab" | "mkt" | "rh";

const SCREENS: Record<ScreenId, { area: AreaId; label: string; icon: string; filter?: boolean }> = {
  geral: { area: "indicadores", label: "Visão Geral", icon: "chart", filter: true },
  depto: { area: "indicadores", label: "Por Departamento", icon: "building", filter: true },
  sge: { area: "projetos", label: "Diagnóstico SGE", icon: "search" },
  analytics: { area: "projetos", label: "Portal do Franqueado", icon: "globe" },
  orc: { area: "financeiro", label: "Orçamento", icon: "receipt" },
  viab: { area: "financeiro", label: "Viabilidade Financeira", icon: "wallet" },
  mkt: { area: "marketing", label: "Marketing", icon: "megaphone" },
  rh: { area: "rh", label: "Recursos Humanos", icon: "users" },
};

type AreaId = "indicadores" | "projetos" | "financeiro" | "marketing" | "rh";

const AREAS: { id: AreaId; label: string; icon: string; desc: string; screens: ScreenId[] }[] = [
  { id: "indicadores", label: "Indicadores", icon: "chart", desc: "KPIs por setor, indicador e período", screens: ["geral", "depto"] },
  { id: "projetos", label: "Projetos", icon: "layers", desc: "Diagnóstico SGE e Portal do Franqueado", screens: ["sge", "analytics"] },
  { id: "financeiro", label: "Financeiro", icon: "wallet", desc: "Orçamento e Viabilidade Financeira", screens: ["orc", "viab"] },
  { id: "marketing", label: "Marketing", icon: "megaphone", desc: "Painéis e campanhas de marketing", screens: ["mkt"] },
  { id: "rh", label: "RH", icon: "users", desc: "Recursos Humanos e folha", screens: ["rh"] },
];

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [indic, setIndic] = useState<IndicadorRow[] | null>(null);
  const [indicErr, setIndicErr] = useState<string | null>(null);
  const [sge, setSge] = useState<SgeRow[] | null>(null);
  const [sgeErr, setSgeErr] = useState<string | null>(null);
  const [orc, setOrc] = useState<OrcRow[] | null>(null);
  const [orcErr, setOrcErr] = useState<string | null>(null);

  const [area, setArea] = useState<AreaId>("indicadores");
  const [screen, setScreen] = useState<ScreenId | null>(null); // null = visão da área
  const [filtersOpen, setFiltersOpen] = useState(false); // filtros recolhidos por padrão

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
        <Header nFiltered={0} nTotal={0} />
        <div className="lx-spinner">⏳ Carregando dados das planilhas…</div>
      </div>
    );
  }

  const areaDef = AREAS.find((a) => a.id === area)!;

  function openArea(a: AreaId) {
    const def = AREAS.find((x) => x.id === a)!;
    setArea(a);
    setScreen(def.screens.length === 1 ? def.screens[0] : null);
  }

  const screenDef = screen ? SCREENS[screen] : null;
  const showFilters = !!screenDef?.filter;
  const filtrando =
    selAno.size < opts.anos.length || selMes.size < opts.meses.length ||
    selDep.size < opts.deptos.length || selInd.size < opts.inds.length;

  const pageNode = (() => {
    switch (screen) {
      case "geral": return <VisaoGeral df={dfFiltered} error={indicErr} />;
      case "depto": return <PorDepartamento df={dfFiltered} dfFull={indic ?? []} selAno={[...selAno]} error={indicErr} />;
      case "sge": return <SgePage data={sge} error={sgeErr} />;
      case "orc": return <OrcamentoPage data={orc} error={orcErr} />;
      case "mkt": return <Marketing />;
      case "analytics": return <GoogleAnalytics />;
      case "rh": return <RhPage />;
      case "viab": return <ViabilidadePage />;
      default: return null;
    }
  })();

  const overviewNode = (() => {
    switch (area) {
      case "indicadores": return <IndicadoresOverview df={dfFiltered} onOpen={(s) => setScreen(s as ScreenId)} />;
      case "projetos": return <ProjetosOverview sge={sge} onOpen={(s) => setScreen(s as ScreenId)} />;
      case "financeiro": return <FinanceiroOverview orc={orc} onOpen={(s) => setScreen(s as ScreenId)} />;
      default: return null;
    }
  })();

  return (
    <div className="lx-container">
      <Header nFiltered={dfFiltered.length} nTotal={indic?.length ?? 0} />

      {/* Navegação por áreas */}
      <div className="area-bar">
        <div className="area-tabs">
          {AREAS.map((a) => (
            <button key={a.id} className={`area-tab${a.id === area ? " active" : ""}`} onClick={() => openArea(a.id)}>
              <Icon name={a.icon} size={18} /> {a.label}
            </button>
          ))}
        </div>
        <button className="area-refresh" onClick={loadAll} title="Recarregar dados das planilhas">
          <Icon name="refresh" size={15} /> Atualizar
        </button>
      </div>

      {screen === null ? (
        // ─── Visão da área (insights) ───
        <>
          <div className="area-hero">
            <span className="area-hero-icon"><Icon name={areaDef.icon} size={26} /></span>
            <div><h2>{areaDef.label}</h2><p>{areaDef.desc}</p></div>
          </div>
          {overviewNode}
        </>
      ) : (
        // ─── Tela detalhada ───
        <>
          <div className="area-subnav">
            {areaDef.screens.length > 1 && (
              <button className="area-back" onClick={() => setScreen(null)}>
                <Icon name="arrowLeft" size={14} /> {areaDef.label}
              </button>
            )}
            <div className="viab-seg" style={{ marginBottom: 0 }}>
              {areaDef.screens.map((s) => (
                <button key={s} className={`viab-seg-btn${s === screen ? " active" : ""}`} onClick={() => setScreen(s)}>
                  <Icon name={SCREENS[s].icon} size={15} /> {SCREENS[s].label}
                </button>
              ))}
            </div>
          </div>

          {showFilters && (
            <div className={`filt-wrap${filtersOpen ? " open" : ""}`}>
              <button className="filt-toggle" onClick={() => setFiltersOpen((o) => !o)} aria-expanded={filtersOpen}>
                <span className="filt-left">
                  <Icon name="filter" size={15} /> Filtros
                  {filtrando && <span className="filt-chip">filtrando</span>}
                </span>
                <span className="filt-chev"><Icon name={filtersOpen ? "chevronUp" : "chevronDown"} size={16} /></span>
              </button>
              {filtersOpen && (
                <div className="filt-bar">
                  <div className="filt-item">
                    <div className="filt-label"><Icon name="filter" size={12} /> Ano</div>
                    <MultiSelect variant="body" label="" options={opts.anos} selected={selAno} onChange={setSelAno} />
                  </div>
                  <div className="filt-item">
                    <div className="filt-label"><Icon name="filter" size={12} /> Mês</div>
                    <MultiSelect variant="body" label="" options={opts.meses} selected={selMes} onChange={setSelMes} formatLabel={(m) => MESES_PT[m] ?? String(m)} />
                  </div>
                  <div className="filt-item">
                    <div className="filt-label"><Icon name="filter" size={12} /> Setor</div>
                    <MultiSelect variant="body" label="" options={opts.deptos} selected={selDep} onChange={setSelDep} />
                  </div>
                  <div className="filt-item" style={{ flex: "2 1 260px" }}>
                    <div className="filt-label"><Icon name="filter" size={12} /> Indicador</div>
                    <MultiSelect variant="body" label="" options={opts.inds} selected={selInd} onChange={setSelInd} />
                  </div>
                </div>
              )}
            </div>
          )}

          {pageNode}
        </>
      )}
    </div>
  );
}

function uniqNums(arr: (number | null)[]): number[] {
  return [...new Set(arr.filter((v): v is number => v != null))];
}
function uniqStrs(arr: string[]): string[] {
  return [...new Set(arr.filter((v) => v && v.trim() !== ""))];
}
