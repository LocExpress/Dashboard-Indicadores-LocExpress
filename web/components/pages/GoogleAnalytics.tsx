"use client";
import { useEffect, useState } from "react";
import { COLOR } from "@/lib/theme";
import { KpiCard, ChartBox, DataTable, SecHeader, type Column } from "../ui";
import PlotlyChart from "../charts/PlotlyChart";
import { DateRangePicker } from "../youtube/DateRangePicker";

interface Kpis {
  activeUsers: number; sessions: number; pageViews: number;
  avgSessionDuration: number; bounceRate: number; newUsers: number;
}
interface PageRow  { path: string; title: string; views: number; users: number; }
interface CityRow  { city: string; users: number; sessions: number; }
interface DeviceRow { device: string; users: number; sessions: number; }
interface DayRow   { date: string; users: number; sessions: number; pageViews: number; }

function fmt(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}K`;
  return String(Math.round(n));
}
function fmtSec(s: number) {
  const m = Math.floor(s / 60); const sec = Math.round(s % 60);
  return `${m}m ${String(sec).padStart(2, "0")}s`;
}
function fmtDate(d: string) {
  const [y, m, day] = d.split("-");
  return `${day}/${m}`;
}
function todayISO() { return new Date().toISOString().slice(0, 10); }
function daysAgoISO(n: number) { const d = new Date(); d.setDate(d.getDate() - n); return d.toISOString().slice(0, 10); }

const PAGE_COLS: Column[] = [
  { key: "title", label: "Página", render: (r) => (
    <span title={r.path} style={{ color: COLOR.INDIGO, fontWeight: 600 }}>
      {(r.title || r.path || "").slice(0, 50)}
    </span>
  )},
  { key: "views", label: "Visualizações", align: "right", render: (r) => fmt(r.views) },
  { key: "users", label: "Usuários",      align: "right", render: (r) => fmt(r.users) },
];

const CITY_COLS: Column[] = [
  { key: "city",     label: "Cidade",   render: (r) => r.city || "(não definido)" },
  { key: "users",    label: "Usuários", align: "right", render: (r) => fmt(r.users) },
  { key: "sessions", label: "Sessões",  align: "right", render: (r) => fmt(r.sessions) },
];

const PERIODS = [
  { label: "7 dias",  value: 7  },
  { label: "30 dias", value: 30 },
  { label: "90 dias", value: 90 },
] as const;

export default function GoogleAnalytics() {
  const [kpis,        setKpis]        = useState<Kpis | null>(null);
  const [topPages,    setTopPages]    = useState<PageRow[]>([]);
  const [topCities,   setTopCities]   = useState<CityRow[]>([]);
  const [allCities,   setAllCities]   = useState<CityRow[]>([]);
  const [deviceData,  setDeviceData]  = useState<DeviceRow[]>([]);
  const [dailySeries, setDailySeries] = useState<DayRow[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState<string | null>(null);
  const [days,        setDays]        = useState(30);
  const [startDate,   setStartDate]   = useState("2026-01-01");
  const [endDate,     setEndDate]     = useState(todayISO());

  async function load(start = startDate, end = endDate) {
    setLoading(true); setError(null);
    try {
      const res = await fetch(`/api/ga/data?startDate=${start}&endDate=${end}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setKpis(data.kpis);
      setTopPages(data.topPages ?? []);
      setTopCities(data.topCities ?? []);
      setAllCities(data.allCities ?? []);
      setDeviceData(data.deviceData ?? []);
      setDailySeries(data.dailySeries ?? []);
    } catch (e: any) {
      setError(e.message ?? "Erro desconhecido");
    } finally {
      setLoading(false);
    }
  }

  function selectPeriod(d: number) {
    const s = daysAgoISO(d); const e = todayISO();
    setDays(d); setStartDate(s); setEndDate(e); load(s, e);
  }

  function applyCustom(s: string, e: string) {
    setDays(0); setStartDate(s); setEndDate(e); load(s, e);
  }

  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Gráfico diário ──
  const dailyDates = dailySeries.map((r) => fmtDate(r.date));
  const chartDaily = {
    data: [
      { type: "scatter", mode: "lines+markers", name: "Usuários",
        x: dailyDates, y: dailySeries.map((r) => r.users),
        line: { color: COLOR.INDIGO, width: 2 }, marker: { size: 4 },
        fill: "tozeroy", fillcolor: "rgba(45,49,146,0.07)" },
      { type: "scatter", mode: "lines", name: "Sessões",
        x: dailyDates, y: dailySeries.map((r) => r.sessions),
        line: { color: COLOR.ORANGE, width: 2, dash: "dot" } },
    ],
    layout: {
      height: 280, showlegend: true, plot_bgcolor: "#fff", paper_bgcolor: "#fff",
      margin: { l: 40, r: 20, t: 10, b: 60 },
      xaxis: { type: "category" as const, gridcolor: "#F0F0F0",
               tickangle: dailySeries.length > 20 ? -45 : 0, tickfont: { size: 10 }, automargin: true },
      yaxis: { gridcolor: "#F0F0F0" },
      legend: { orientation: "h" as const, y: 1.1 },
    },
  };

  // ── Gráfico de dispositivos ──
  const chartDevices = {
    data: [{ type: "pie",
      labels: deviceData.map((r) => r.device),
      values: deviceData.map((r) => r.users),
      hole: 0.4,
      marker: { colors: [COLOR.INDIGO, COLOR.ORANGE, COLOR.GREEN, COLOR.YELLOW] },
      textinfo: "label+percent",
    }],
    layout: {
      height: 260, showlegend: false, plot_bgcolor: "#fff", paper_bgcolor: "#fff",
      margin: { l: 10, r: 10, t: 10, b: 10 },
    },
  };

  // ── Gráfico de cidades ──
  const chartCities = {
    data: [{ type: "bar", orientation: "h" as const,
      x: topCities.map((r) => r.users),
      y: topCities.map((r) => r.city || "(não definido)"),
      marker: { color: COLOR.INDIGO },
      text: topCities.map((r) => fmt(r.users)),
      textposition: "auto" as const,
      cliponaxis: false,
      insidetextanchor: "middle" as const,
      textfont: { size: 12, color: "#fff" },
      outsidetextfont: { size: 12, color: "#374151" },
    }],
    layout: {
      height: Math.max(260, topCities.length * 32 + 60),
      plot_bgcolor: "#fff", paper_bgcolor: "#fff",
      margin: { l: 10, r: 60, t: 10, b: 10 },
      xaxis: { gridcolor: "#F0F0F0", range: [0, Math.max(...topCities.map(r => r.users)) * 1.25] },
      yaxis: { automargin: true, tickfont: { size: 11 } },
      showlegend: false,
    },
  };

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "4rem", gap: 12 }}>
      <span className="lx-spinner" style={{ width: 24, height: 24 }} />
      <span style={{ color: COLOR.GRAY_MID }}>Carregando Google Analytics…</span>
    </div>
  );

  if (error) return (
    <div className="info-box" style={{ borderLeftColor: COLOR.RED, background: "#FFF5F5", color: COLOR.RED }}>
      ❌ {error}
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>

      {/* ── Filtro de período ── */}
      <div style={{ background: "#fff", borderRadius: 14, padding: "0.9rem 1.4rem",
                    boxShadow: "0 2px 12px rgba(0,0,0,0.07)",
                    display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "0.5rem" }}>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          {PERIODS.map((p) => (
            <button key={p.value} onClick={() => selectPeriod(p.value)}
                    style={{ padding: "0.35rem 0.9rem", borderRadius: 8, fontWeight: 700,
                             fontSize: "0.82rem", cursor: "pointer", transition: "all 0.15s",
                             border: `1.5px solid ${COLOR.INDIGO}`,
                             background: days === p.value ? COLOR.INDIGO : "transparent",
                             color: days === p.value ? "#fff" : COLOR.INDIGO }}>
              {p.label}
            </button>
          ))}
        </div>
        <DateRangePicker startDate={startDate} endDate={endDate} onChange={applyCustom} />
      </div>

      {/* ── KPIs ── */}
      {kpis && (
        <>
          <div className="lx-grid" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
            <KpiCard label="Usuários ativos"  value={fmt(kpis.activeUsers)}  color={COLOR.INDIGO} unit={`Últimos ${days || "custom"} dias`} />
            <KpiCard label="Novos usuários"   value={fmt(kpis.newUsers)}     color={COLOR.GREEN}  unit="Primeiro acesso" />
            <KpiCard label="Sessões"          value={fmt(kpis.sessions)}     color={COLOR.ORANGE} unit="Total de sessões" />
          </div>
          <div className="lx-grid" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
            <KpiCard label="Visualizações"    value={fmt(kpis.pageViews)}            color={COLOR.INDIGO} unit="Total de páginas vistas" />
            <KpiCard label="Tempo médio"      value={fmtSec(kpis.avgSessionDuration)} color={COLOR.YELLOW} unit="Por sessão" />
            <KpiCard label="Taxa de rejeição" value={`${(kpis.bounceRate * 100).toFixed(1)}%`} color={COLOR.RED} unit="Sessões de 1 página" />
          </div>
        </>
      )}

      {/* ── Gráfico diário ── */}
      {dailySeries.length > 0 && (
        <>
          <SecHeader>📈 Usuários e Sessões por dia</SecHeader>
          <ChartBox><PlotlyChart {...chartDaily} /></ChartBox>
        </>
      )}

      {/* ── Dispositivos + Cidades ── */}
      {(deviceData.length > 0 || topCities.length > 0) && (
        <>
          <SecHeader>📊 Dispositivos e Cidades</SecHeader>
          <div className="lx-grid" style={{ gridTemplateColumns: "1fr 2fr" }}>
            {deviceData.length > 0 && <ChartBox><PlotlyChart {...chartDevices} /></ChartBox>}
            {topCities.length  > 0 && <ChartBox><PlotlyChart {...chartCities}  /></ChartBox>}
          </div>
        </>
      )}

      {/* ── Top páginas ── */}
      {topPages.length > 0 && (
        <>
          <SecHeader>🔝 Páginas mais acessadas</SecHeader>
          <ChartBox>
            <DataTable columns={PAGE_COLS} rows={topPages as any} maxHeight={400} />
          </ChartBox>
        </>
      )}

      {/* ── Top cidades tabela ── */}
      {allCities.length > 0 && (
        <>
          <SecHeader>🌎 Acessos por cidade</SecHeader>
          <ChartBox>
            <DataTable columns={CITY_COLS} rows={allCities as any} maxHeight={360} />
          </ChartBox>
        </>
      )}
    </div>
  );
}
