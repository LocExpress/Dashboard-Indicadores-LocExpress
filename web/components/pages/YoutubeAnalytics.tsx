"use client";
import { useEffect, useState } from "react";
import { COLOR } from "@/lib/theme";
import { KpiCard, ChartBox, DataTable, SecHeader, type Column } from "../ui";
import PlotlyChart from "../charts/PlotlyChart";
import { DateRangePicker } from "../youtube/DateRangePicker";
import {
  chartYtViews, chartYtEngagement, chartYtSubscribers,
  chartYtWatchtime, chartYtTopVideos, type AnalyticsRow,
} from "../charts/youtube";

interface Channel {
  title: string;
  thumbnail_url: string;
  subscriber_count: number;
  video_count: number;
  view_count: number;
  custom_url?: string;
}

interface Video {
  video_id: string;
  title: string;
  thumbnail_url: string;
  published_at: string;
  view_count: number;
  like_count: number;
  comment_count: number;
  score: number;
}

function fmtNum(n: number | null | undefined): string {
  if (n == null) return "—";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function fmtDate(d: string): string {
  try {
    const [y, m, day] = d.slice(0, 10).split("-");
    return `${day}/${m}/${y}`;
  } catch {
    return d?.slice(0, 10) ?? "—";
  }
}

const VIDEO_COLS: Column[] = [
  {
    key: "title", label: "Vídeo",
    render: (r) => (
      <a href={`https://www.youtube.com/watch?v=${r.video_id}`} target="_blank" rel="noopener noreferrer"
         style={{ color: COLOR.INDIGO, fontWeight: 600, textDecoration: "none" }}>
        {(r.title ?? "").slice(0, 55)}{(r.title ?? "").length > 55 ? "…" : ""}
      </a>
    ),
  },
  { key: "published_at", label: "Data", align: "center", render: (r) => fmtDate(r.published_at) },
  { key: "view_count",   label: "Views",    align: "right", render: (r) => fmtNum(r.view_count) },
  { key: "like_count",   label: "Curtidas", align: "right", render: (r) => fmtNum(r.like_count) },
  { key: "comment_count",label: "Coment.",  align: "right", render: (r) => fmtNum(r.comment_count) },
  {
    key: "score", label: "Score", align: "right",
    render: (r) => <span style={{ color: COLOR.ORANGE, fontWeight: 700 }}>{fmtNum(r.score)}</span>,
  },
  {
    key: "ver", label: "",
    render: (r) => (
      <a href={`https://www.youtube.com/watch?v=${r.video_id}`} target="_blank" rel="noopener noreferrer"
         style={{ display: "inline-flex", alignItems: "center", gap: 3,
                  background: "#FF0000", color: "#fff", borderRadius: 6,
                  padding: "3px 10px", fontSize: "0.75rem", textDecoration: "none",
                  fontWeight: 700, whiteSpace: "nowrap" as const }}>
        Ver ↗
      </a>
    ),
  },
];

const PERIODS = [
  { label: "7 dias",  value: 7  },
  { label: "30 dias", value: 30 },
  { label: "90 dias", value: 90 },
] as const;

type Metric = "views" | "outros";

const METRIC_TABS: { key: Metric; label: string; icon: string }[] = [
  { key: "views",  label: "Visualizações",              icon: "👁️" },
  { key: "outros", label: "Engajamento, Inscritos & Tempo", icon: "📊" },
];

export default function YoutubeAnalytics() {
  const [channel,   setChannel]   = useState<Channel | null>(null);
  const [analytics, setAnalytics] = useState<AnalyticsRow[]>([]);
  const [videos,    setVideos]    = useState<Video[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState<string | null>(null);
  const [days,         setDays]         = useState(30);
  const [activeMetric, setActiveMetric] = useState<Metric>("views");

  function todayISO() { return new Date().toISOString().slice(0, 10); }
  function daysAgoISO(n: number) { const d = new Date(); d.setDate(d.getDate() - n); return d.toISOString().slice(0, 10); }

  const [startDate, setStartDate] = useState(daysAgoISO(30));
  const [endDate,   setEndDate]   = useState(todayISO());

  async function load(start = startDate, end = endDate) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/youtube/data?startDate=${start}&endDate=${end}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setChannel(data.channel);
      setAnalytics(data.analytics ?? []);
      setVideos(data.videos ?? []);
    } catch (e: any) {
      setError(e.message ?? "Erro desconhecido");
    } finally {
      setLoading(false);
    }
  }

  function selectPeriod(d: number) {
    const start = daysAgoISO(d);
    const end   = todayISO();
    setDays(d);
    setStartDate(start);
    setEndDate(end);
    load(start, end);
  }

  function applyCustom(start: string, end: string) {
    setDays(0);
    setStartDate(start);
    setEndDate(end);
    load(start, end);
  }

  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Totais 30 dias ────────────────────────────────────────────────────────
  const totalViews    = analytics.reduce((s, r) => s + Number(r.views), 0);
  const totalLikes    = analytics.reduce((s, r) => s + Number(r.likes), 0);
  const totalComments = analytics.reduce((s, r) => s + Number(r.comments), 0);
  const totalMinutes  = analytics.reduce((s, r) => s + Number(r.estimated_minutes_watched), 0);
  const netSubs       = analytics.reduce((s, r) => s + Number(r.subscribers_gained) - Number(r.subscribers_lost), 0);

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "4rem", gap: 12 }}>
        <span className="lx-spinner" style={{ width: 24, height: 24 }} />
        <span style={{ color: COLOR.GRAY_MID }}>Carregando dados do YouTube…</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="info-box" style={{ borderLeftColor: COLOR.RED, background: "#FFF5F5", color: COLOR.RED }}>
        ❌ {error} — verifique se as variáveis de ambiente do Supabase estão configuradas no Vercel.
      </div>
    );
  }

  if (!channel && analytics.length === 0 && videos.length === 0) {
    return (
      <div className="info-box">
        ℹ️ Nenhum dado encontrado. Conecte o canal YouTube em <strong>localhost:3000/youtube</strong> e clique em <strong>Sincronizar agora</strong>.
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>

      {/* ── Canal + filtro de período ── */}
      {channel && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between",
                      background: "#fff", borderRadius: 14, padding: "0.9rem 1.4rem",
                      boxShadow: "0 2px 12px rgba(0,0,0,0.07)", flexWrap: "wrap", gap: "0.75rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {channel.thumbnail_url && (
              <img src={channel.thumbnail_url} alt={channel.title}
                   style={{ width: 48, height: 48, borderRadius: "50%", objectFit: "cover",
                            border: `2px solid ${COLOR.ORANGE}` }} />
            )}
            <div>
              <div style={{ fontWeight: 900, color: COLOR.INDIGO, fontSize: "1rem" }}>{channel.title}</div>
              {channel.custom_url && (
                <a href={`https://www.youtube.com/${channel.custom_url}`} target="_blank" rel="noopener noreferrer"
                   style={{ fontSize: "0.75rem", color: COLOR.GRAY_MID, textDecoration: "none" }}>
                  youtube.com/{channel.custom_url}
                </a>
              )}
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
            {PERIODS.map((p) => (
              <button key={p.value} onClick={() => selectPeriod(p.value)}
                      style={{
                        padding: "0.35rem 0.9rem", borderRadius: 8, fontWeight: 700,
                        fontSize: "0.82rem", cursor: "pointer",
                        border: `1.5px solid ${COLOR.INDIGO}`,
                        background: days === p.value ? COLOR.INDIGO : "transparent",
                        color:      days === p.value ? "#fff"        : COLOR.INDIGO,
                        transition: "all 0.15s",
                      }}>
                {p.label}
              </button>
            ))}
            <DateRangePicker startDate={startDate} endDate={endDate} onChange={applyCustom} />
            <button onClick={() => load()}
                    style={{ background: "none", border: `1px solid ${COLOR.INDIGO}`, borderRadius: 8,
                             padding: "0.35rem 0.75rem", fontWeight: 700, color: COLOR.INDIGO,
                             cursor: "pointer", fontSize: "0.82rem" }}>
              🔄
            </button>
          </div>
        </div>
      )}

      {/* ── KPI Cards — Visualizações ── */}
      {channel && activeMetric === "views" && (
        <div className="lx-grid" style={{ gridTemplateColumns: "repeat(4, 1fr)" }}>
          <KpiCard label="Inscritos"       value={fmtNum(channel.subscriber_count)} color="#EF4444" unit="Total do canal" />
          <KpiCard label="Views totais"    value={fmtNum(channel.view_count)}       color={COLOR.INDIGO} unit="Histórico" />
          <KpiCard label="Vídeos"          value={fmtNum(channel.video_count)}      color={COLOR.ORANGE} unit="No canal" />
          <KpiCard label={`Views (${days}d)`} value={fmtNum(totalViews)}            color={COLOR.GREEN}  unit={`Últimos ${days} dias`} />
        </div>
      )}

      {/* ── KPI Cards — Engajamento, Inscritos & Tempo ── */}
      {analytics.length > 0 && activeMetric === "outros" && (
        <div className="lx-grid" style={{ gridTemplateColumns: "repeat(4, 1fr)" }}>
          <KpiCard label={`Curtidas (${days}d)`}    value={fmtNum(totalLikes)}    color={COLOR.INDIGO} unit={`Últimos ${days} dias`} />
          <KpiCard label={`Comentários (${days}d)`} value={fmtNum(totalComments)} color={COLOR.ORANGE} unit={`Últimos ${days} dias`} />
          <KpiCard label="Min. assistidos"          value={fmtNum(totalMinutes)}  color={COLOR.YELLOW} unit={`Últimos ${days} dias`} />
          <KpiCard
            label="Inscritos líquidos"
            value={`${netSubs >= 0 ? "+" : ""}${fmtNum(netSubs)}`}
            color={netSubs >= 0 ? COLOR.GREEN : COLOR.RED}
            unit={`Ganhos − perdidos (${days}d)`}
          />
        </div>
      )}

      {/* ── Gráfico com abas ── */}
      {analytics.length > 0 && (
        <>
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            {METRIC_TABS.map((tab) => (
              <button key={tab.key} onClick={() => setActiveMetric(tab.key)}
                      style={{
                        display: "inline-flex", alignItems: "center", gap: "0.35rem",
                        padding: "0.4rem 1rem", borderRadius: 8, fontWeight: 700,
                        fontSize: "0.82rem", cursor: "pointer", transition: "all 0.15s",
                        border: `1.5px solid ${activeMetric === tab.key ? COLOR.RED : "#E5E7EB"}`,
                        background: activeMetric === tab.key ? COLOR.RED : "#fff",
                        color:      activeMetric === tab.key ? "#fff"    : "#374151",
                      }}>
                <span>{tab.icon}</span>{tab.label}
              </button>
            ))}
          </div>
          {activeMetric === "views" && (
            <ChartBox>
              <PlotlyChart {...chartYtViews(analytics)} />
            </ChartBox>
          )}
          {activeMetric === "outros" && (
            <>
              <ChartBox>
                <PlotlyChart {...chartYtEngagement(analytics)} />
              </ChartBox>
              <ChartBox>
                <PlotlyChart {...chartYtSubscribers(analytics)} />
              </ChartBox>
              <ChartBox>
                <PlotlyChart {...chartYtWatchtime(analytics)} />
              </ChartBox>
            </>
          )}
        </>
      )}

      {/* ── Top vídeos + tabela (só na aba Visualizações) ── */}
      {videos.length > 0 && activeMetric === "views" && (
        <>
          <SecHeader>🎬 Vídeos do canal ({videos.length})</SecHeader>
          {(() => {
            const topViews = [...videos].sort((a, b) => b.view_count - a.view_count)[0];
            const topScore = [...videos].sort((a, b) => b.score - a.score)[0];

            const IconTrending = () => (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="22 7 13 16 9 12 2 19" />
                <polyline points="16 7 22 7 22 13" />
              </svg>
            );
            const IconStar = () => (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="#D97706" stroke="#D97706" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
              </svg>
            );

            const card = (
              borderColor: string,
              Icon: () => JSX.Element,
              iconBg: string,
              labelText: string,
              labelColor: string,
              badgeBg: string,
              badgeColor: string,
              video: typeof topViews,
              metric: string,
            ) => {
              const url = `https://www.youtube.com/watch?v=${video?.video_id}`;
              return (
                <div style={{
                  background: "#fff", borderRadius: 12, border: `1px solid ${borderColor}`,
                  boxShadow: "0 1px 3px rgba(0,0,0,0.08)", padding: 16,
                  display: "flex", gap: 16, alignItems: "flex-start",
                }}>
                  <a href={url} target="_blank" rel="noopener noreferrer"
                     style={{ width: 112, height: 64, flexShrink: 0, borderRadius: 8,
                              overflow: "hidden", background: "#F3F4F6", display: "block" }}>
                    {video?.thumbnail_url && (
                      <img src={video.thumbnail_url} alt={video.title}
                           style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                    )}
                  </a>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                      <span style={{ background: iconBg, borderRadius: 6, padding: 4,
                                     display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <Icon />
                      </span>
                      <span style={{ fontSize: "0.72rem", fontWeight: 600, color: "#6B7280",
                                     textTransform: "uppercase", letterSpacing: "0.06em" }}>
                        {labelText}
                      </span>
                    </div>
                    <a href={url} target="_blank" rel="noopener noreferrer"
                       style={{ fontWeight: 600, color: "#1F2937", fontSize: "0.875rem",
                                lineHeight: 1.4, textDecoration: "none", display: "block",
                                overflow: "hidden", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" as const }}>
                      {video?.title ?? "—"}
                    </a>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8 }}>
                      <span style={{ background: badgeBg, color: badgeColor, borderRadius: 999,
                                     padding: "2px 8px", fontSize: "0.72rem", fontWeight: 700,
                                     whiteSpace: "nowrap" as const }}>
                        {metric}
                      </span>
                      <a href={url} target="_blank" rel="noopener noreferrer"
                         style={{ fontSize: "0.72rem", fontWeight: 500, color: "#9CA3AF",
                                  textDecoration: "none" }}>
                        Ver vídeo →
                      </a>
                    </div>
                  </div>
                </div>
              );
            };

            return (
              <div className="lx-grid" style={{ gridTemplateColumns: "repeat(2, 1fr)" }}>
                {card("#DBEAFE", IconTrending, "#DBEAFE", "Top Vídeo",   "#2563EB", "#DBEAFE", "#1D4ED8", topViews, `${fmtNum(topViews?.view_count)} views`)}
                {card("#FEF3C7", IconStar,    "#FEF3C7", "Melhor Score", "#D97706", "#FEF3C7", "#B45309", topScore, `${fmtNum(topScore?.score)} pts`)}
              </div>
            );
          })()}
          <ChartBox style={{ overflow: "hidden" }}>
            <PlotlyChart {...chartYtTopVideos(videos)} height={Math.max(560, Math.min(videos.length, 10) * 72 + 120)} />
          </ChartBox>
          <ChartBox>
            <DataTable columns={VIDEO_COLS} rows={videos as any} maxHeight={500} />
          </ChartBox>
        </>
      )}
    </div>
  );
}
