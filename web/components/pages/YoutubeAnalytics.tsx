"use client";
import { useEffect, useState, useCallback } from "react";
import { Eye, ThumbsUp, MessageCircle, Users, RefreshCw, PlaySquare, Clock, BarChart2, Star, TrendingUp, ExternalLink } from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { DateRangePicker } from "../youtube/DateRangePicker";
import { YoutubeAnalyticsChart } from "../youtube/YoutubeAnalyticsChart";

type Metric = "views" | "outros";
type Preset = 7 | 30 | 90 | null;

const PRESETS: { label: string; days: Preset }[] = [
  { label: "7 dias",  days: 7  },
  { label: "30 dias", days: 30 },
  { label: "90 dias", days: 90 },
];

function toISO(d: Date) { return d.toISOString().slice(0, 10); }
function daysAgo(n: number) { const d = new Date(); d.setDate(d.getDate() - n); return toISO(d); }

interface Channel {
  title: string;
  thumbnail_url: string;
  subscriber_count: number;
  video_count: number;
  view_count: number;
  custom_url?: string;
}
interface AnalyticsRow {
  date: string;
  views: number;
  likes: number;
  comments: number;
  subscribers_gained: number;
  subscribers_lost: number;
  estimated_minutes_watched: number;
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

function fmtN(n: number) { return n.toLocaleString("pt-BR"); }
function fmtDate(d: string) {
  try { return format(parseISO(d), "dd/MM/yyyy", { locale: ptBR }); } catch { return d?.slice(0, 10) ?? "—"; }
}

const colorMap: Record<string, string> = {
  red:    "bg-red-50    text-red-600    border-red-100",
  blue:   "bg-blue-50   text-blue-600   border-blue-100",
  green:  "bg-green-50  text-green-600  border-green-100",
  purple: "bg-purple-50 text-purple-600 border-purple-100",
  yellow: "bg-yellow-50 text-yellow-600 border-yellow-100",
};
const iconBgMap: Record<string, string> = {
  red:    "bg-red-100    text-red-600",
  blue:   "bg-blue-100   text-blue-600",
  green:  "bg-green-100  text-green-600",
  purple: "bg-purple-100 text-purple-600",
  yellow: "bg-yellow-100 text-yellow-600",
};

function MetricsCard({ title, value, subtitle, icon: Icon, color = "blue" }: {
  title: string; value: string | number; subtitle?: string;
  icon: React.ElementType; color?: string;
}) {
  const formatted = typeof value === "number" ? fmtN(value) : value;
  return (
    <div className={`rounded-xl border p-5 bg-white shadow-sm ${colorMap[color]}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{formatted}</p>
          {subtitle && <p className="mt-1 text-xs text-gray-400">{subtitle}</p>}
        </div>
        <div className={`rounded-lg p-2.5 ${iconBgMap[color]}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

function TopVideoCard({ label, video, metric, color }: {
  label: string; video: Video; metric: string; color: "blue" | "yellow";
}) {
  const ytUrl = `https://www.youtube.com/watch?v=${video.video_id}`;
  const IconComp = color === "yellow" ? Star : TrendingUp;
  const borderCls = color === "blue" ? "border-blue-100 hover:border-blue-300" : "border-yellow-100 hover:border-yellow-300";
  const labelCls  = color === "blue" ? "text-blue-600" : "text-yellow-600";
  const iconCls   = color === "blue" ? "text-blue-500" : "text-yellow-500";
  const badgeCls  = color === "blue" ? "bg-blue-100 text-blue-700" : "bg-yellow-100 text-yellow-700";
  return (
    <div className={`rounded-xl border bg-white p-4 shadow-sm flex gap-4 items-start transition-all hover:shadow-md ${borderCls}`}>
      <a href={ytUrl} target="_blank" rel="noopener noreferrer"
         className="w-28 h-16 flex-shrink-0 rounded-lg overflow-hidden bg-gray-100 block">
        {video.thumbnail_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={video.thumbnail_url} alt={video.title}
               style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
        )}
      </a>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-1">
          <IconComp className={`h-3.5 w-3.5 ${iconCls}`} />
          <span className={`text-xs font-semibold uppercase tracking-wide ${labelCls}`}>{label}</span>
          <ExternalLink className="h-3 w-3 text-gray-300 ml-auto" />
        </div>
        <a href={ytUrl} target="_blank" rel="noopener noreferrer"
           className="text-sm font-semibold text-gray-800 hover:text-red-600 line-clamp-2 leading-snug block">
          {video.title}
        </a>
        <div className="mt-2 flex items-center gap-2">
          <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-bold ${badgeCls}`}>{metric}</span>
          <a href={ytUrl} target="_blank" rel="noopener noreferrer"
             className="text-xs font-medium text-gray-400 hover:text-red-500">Ver vídeo →</a>
        </div>
      </div>
    </div>
  );
}

const METRIC_TABS: { key: Metric; label: string; icon: React.ElementType }[] = [
  { key: "views",  label: "Visualizações",              icon: Eye    },
  { key: "outros", label: "Engajamento, Inscritos & Tempo", icon: ThumbsUp },
];

export default function YoutubeAnalytics() {
  const [channel,      setChannel]      = useState<Channel | null>(null);
  const [analytics,    setAnalytics]    = useState<AnalyticsRow[]>([]);
  const [videos,       setVideos]       = useState<Video[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState<string | null>(null);
  const [activeMetric, setActiveMetric] = useState<Metric>("views");
  const [preset,       setPreset]       = useState<Preset>(30);
  const [startDate,    setStartDate]    = useState(daysAgo(30));
  const [endDate,      setEndDate]      = useState(toISO(new Date()));

  const loadData = useCallback(async (start = startDate, end = endDate) => {
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
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { loadData(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function applyPreset(days: Preset) {
    if (!days) return;
    const start = daysAgo(days);
    const end   = toISO(new Date());
    setPreset(days);
    setStartDate(start);
    setEndDate(end);
    loadData(start, end);
  }

  function applyCustom(start: string, end: string) {
    if (!start || !end || start > end) return;
    setPreset(null);
    setStartDate(start);
    setEndDate(end);
    loadData(start, end);
  }

  const totalViews    = analytics.reduce((s, r) => s + Number(r.views), 0);
  const totalLikes    = analytics.reduce((s, r) => s + Number(r.likes), 0);
  const totalComments = analytics.reduce((s, r) => s + Number(r.comments), 0);
  const totalMinutes  = analytics.reduce((s, r) => s + Number(r.estimated_minutes_watched), 0);
  const netSubs       = analytics.reduce((s, r) => s + Number(r.subscribers_gained) - Number(r.subscribers_lost), 0);

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <RefreshCw className="h-6 w-6 animate-spin text-red-500" />
      <span className="ml-2 text-gray-500">Carregando dados...</span>
    </div>
  );

  if (error) return (
    <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-600">
      ❌ {error}
    </div>
  );

  if (!channel && analytics.length === 0 && videos.length === 0) return (
    <div className="rounded-xl border bg-white p-8 text-center text-sm text-gray-400 shadow-sm">
      Nenhum dado encontrado. Sincronize o canal para carregar.
    </div>
  );

  const topViews = [...videos].sort((a, b) => b.view_count - a.view_count)[0];
  const topScore = [...videos].sort((a, b) => b.score       - a.score      )[0];

  return (
    <div className="space-y-6">

      {/* ── Header do canal ── */}
      {channel && (
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-xl border bg-white p-5 shadow-sm">
          <div className="flex items-center gap-4">
            {channel.thumbnail_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={channel.thumbnail_url} alt={channel.title}
                   className="h-14 w-14 flex-shrink-0 rounded-full object-cover ring-2 ring-red-100" />
            )}
            <div>
              <div className="flex items-center gap-2">
                <PlaySquare className="h-4 w-4 text-red-600" />
                <h2 className="text-lg font-bold text-gray-900">{channel.title}</h2>
              </div>
              {channel.custom_url && (
                <a href={`https://www.youtube.com/${channel.custom_url}`} target="_blank" rel="noopener noreferrer"
                   className="text-xs text-gray-400 hover:text-red-500">
                  youtube.com/{channel.custom_url}
                </a>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {PRESETS.map((p) => (
              <button key={p.days} onClick={() => applyPreset(p.days)}
                      className={`rounded-lg px-3 py-1.5 text-xs font-semibold border transition-colors ${
                        preset === p.days
                          ? "bg-red-600 text-white border-red-600"
                          : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
                      }`}>
                {p.label}
              </button>
            ))}
            <DateRangePicker startDate={startDate} endDate={endDate} onChange={applyCustom} />
            <button onClick={() => loadData()}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors">
              <RefreshCw className="h-3.5 w-3.5" />
              Sincronizar
            </button>
          </div>
        </div>
      )}

      {/* ── KPIs linha 1 (5 colunas) ── */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <MetricsCard title="Inscritos"           value={channel?.subscriber_count ?? 0} icon={Users}          color="red"    subtitle="Total do canal" />
        <MetricsCard title={`Views (${preset ?? "custom"}d)`}      value={totalViews}                         icon={Eye}            color="blue"   />
        <MetricsCard title={`Curtidas (${preset ?? "custom"}d)`}   value={totalLikes}                         icon={ThumbsUp}       color="green"  />
        <MetricsCard title={`Comentários (${preset ?? "custom"}d)`}value={totalComments}                      icon={MessageCircle}  color="purple" />
        <MetricsCard title="Minutos assistidos"  value={totalMinutes}                   icon={Clock}          color="yellow" subtitle={`Últimos ${preset ?? "..."} dias`} />
      </div>

      {/* ── KPIs linha 2 (3 colunas) ── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <MetricsCard
          title="Inscritos líquidos"
          value={netSubs >= 0 ? `+${fmtN(netSubs)}` : fmtN(netSubs)}
          icon={Users}
          color={netSubs >= 0 ? "green" : "red"}
          subtitle="Ganhos − Perdidos"
        />
        <MetricsCard title="Total de vídeos"  value={channel?.video_count ?? 0} icon={BarChart2} color="blue"   subtitle="No canal" />
        <MetricsCard title="Views totais"     value={channel?.view_count  ?? 0} icon={Eye}       color="purple" subtitle="Histórico do canal" />
      </div>

      {/* ── Top vídeos ── */}
      {videos.length > 0 && topViews && topScore && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <TopVideoCard label="Top Vídeo"    video={topViews} metric={`${fmtN(topViews.view_count)} views`} color="blue"   />
          <TopVideoCard label="Melhor Score" video={topScore} metric={`${fmtN(topScore.score)} pts`}        color="yellow" />
        </div>
      )}

      {/* ── Gráfico com 4 abas ── */}
      <div>
        <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
          {METRIC_TABS.map((tab) => (
            <button key={tab.key} onClick={() => setActiveMetric(tab.key)}
                    className={`inline-flex flex-shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                      activeMetric === tab.key
                        ? "bg-red-600 text-white"
                        : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
                    }`}>
              <tab.icon className="h-3.5 w-3.5" />
              {tab.label}
            </button>
          ))}
        </div>
        {analytics.length > 0 ? (
          activeMetric === "views" ? (
            <YoutubeAnalyticsChart data={analytics} metric="views" />
          ) : (
            <div className="space-y-4">
              <YoutubeAnalyticsChart data={analytics} metric="engagement" />
              <YoutubeAnalyticsChart data={analytics} metric="subscribers" />
              <YoutubeAnalyticsChart data={analytics} metric="watchtime" />
            </div>
          )
        ) : (
          <div className="rounded-xl border bg-white p-8 text-center text-sm text-gray-400 shadow-sm">
            Nenhum dado disponível para o período selecionado.
          </div>
        )}
      </div>

      {/* ── Lista de vídeos (só em Visualizações) ── */}
      {videos.length > 0 && activeMetric === "views" && (
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-gray-700">Vídeos do canal ({videos.length})</h3>

          {/* Cards de destaque (igual ao VideoList do lochub) */}
          {topViews && topScore && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <a href={`https://www.youtube.com/watch?v=${topViews.video_id}`} target="_blank" rel="noopener noreferrer"
                 className="group flex gap-3 rounded-xl border border-blue-100 bg-white p-4 shadow-sm hover:border-blue-300 hover:shadow-md transition-all">
                <div className="w-24 h-14 flex-shrink-0 rounded-lg overflow-hidden bg-gray-100">
                  {topViews.thumbnail_url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={topViews.thumbnail_url} alt={topViews.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-1">
                    <TrendingUp className="h-3.5 w-3.5 text-blue-500" />
                    <span className="text-xs font-semibold text-blue-600 uppercase tracking-wide">Top Vídeo</span>
                    <ExternalLink className="h-3 w-3 text-gray-300 group-hover:text-blue-400 ml-auto" />
                  </div>
                  <p className="text-sm font-semibold text-gray-800 group-hover:text-blue-600 line-clamp-2 leading-snug">{topViews.title}</p>
                  <p className="mt-1 text-xs text-gray-400"><Eye className="inline h-3 w-3 mr-0.5" />{fmtN(topViews.view_count)} visualizações</p>
                </div>
              </a>
              <a href={`https://www.youtube.com/watch?v=${topScore.video_id}`} target="_blank" rel="noopener noreferrer"
                 className="group flex gap-3 rounded-xl border border-yellow-100 bg-white p-4 shadow-sm hover:border-yellow-300 hover:shadow-md transition-all">
                <div className="w-24 h-14 flex-shrink-0 rounded-lg overflow-hidden bg-gray-100">
                  {topScore.thumbnail_url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={topScore.thumbnail_url} alt={topScore.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Star className="h-3.5 w-3.5 text-yellow-500" />
                    <span className="text-xs font-semibold text-yellow-600 uppercase tracking-wide">Score mais alto</span>
                    <ExternalLink className="h-3 w-3 text-gray-300 group-hover:text-yellow-400 ml-auto" />
                  </div>
                  <p className="text-sm font-semibold text-gray-800 group-hover:text-yellow-600 line-clamp-2 leading-snug">{topScore.title}</p>
                  <p className="mt-1 text-xs text-gray-400"><Star className="inline h-3 w-3 mr-0.5 text-yellow-400" />Score: {fmtN(Number(topScore.score))} · Views + curtidas + comentários</p>
                </div>
              </a>
            </div>
          )}

          <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-100">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left   text-xs font-semibold text-gray-500 uppercase tracking-wider">Vídeo</th>
                    <th className="px-4 py-3 text-right  text-xs font-semibold text-gray-500 uppercase tracking-wider">Visualizações</th>
                    <th className="px-4 py-3 text-right  text-xs font-semibold text-gray-500 uppercase tracking-wider">Curtidas</th>
                    <th className="px-4 py-3 text-right  text-xs font-semibold text-gray-500 uppercase tracking-wider">Comentários</th>
                    <th className="px-4 py-3 text-right  text-xs font-semibold text-gray-500 uppercase tracking-wider">Score</th>
                    <th className="px-4 py-3 text-right  text-xs font-semibold text-gray-500 uppercase tracking-wider">Data</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {videos.map((v) => (
                    <tr key={v.video_id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <a href={`https://www.youtube.com/watch?v=${v.video_id}`} target="_blank" rel="noopener noreferrer"
                           className="flex items-center gap-3 group">
                          <div className="relative w-20 h-12 flex-shrink-0 rounded overflow-hidden bg-gray-100">
                            {v.thumbnail_url && (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={v.thumbnail_url} alt={v.title}
                                   style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                            )}
                          </div>
                          <span className="text-sm font-medium text-gray-800 group-hover:text-red-600 line-clamp-2 max-w-xs">
                            {v.title}
                          </span>
                        </a>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="flex items-center justify-end gap-1 text-sm text-gray-700">
                          <Eye className="h-3.5 w-3.5 text-gray-400" />{fmtN(v.view_count)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="flex items-center justify-end gap-1 text-sm text-gray-700">
                          <ThumbsUp className="h-3.5 w-3.5 text-blue-400" />{fmtN(v.like_count)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="flex items-center justify-end gap-1 text-sm text-gray-700">
                          <MessageCircle className="h-3.5 w-3.5 text-purple-400" />{fmtN(v.comment_count)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="flex items-center justify-end gap-1 text-sm font-semibold text-yellow-600">
                          <Star className="h-3.5 w-3.5" />{fmtN(Number(v.score))}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-xs text-gray-400">
                        {v.published_at ? fmtDate(v.published_at) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
