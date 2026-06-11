"use client";
import { useEffect, useState } from "react";
import { COLOR } from "@/lib/theme";
import { KpiCard, ChartBox, DataTable, SecHeader, type Column } from "../ui";
import PlotlyChart from "../charts/PlotlyChart";

interface Summary {
  total_followers: number; total_reach: number; total_interactions: number;
  total_posts: number; connected_count: number; pending_count: number; followers_growth: number;
}
interface FranquiaRank {
  id: string; nome: string; instagram_username: string;
  followers: number; followers_growth: number; reach: number;
  total_interactions: number; posts_count: number;
  last_post: string | null; days_since_post: number | null; status: string;
}
interface Pending {
  id: string; page_name: string; nome_franquia: string | null;
  business_id: string | null; origem_api: string;
  status_conexao: string; erro_api: string | null; data_ultima_validacao: string | null;
}
interface Post {
  id: string; caption: string | null; media_type: string; permalink: string;
  timestamp: string; franquia_name: string; instagram_username: string;
  reach: number; likes: number; comments: number; shares: number; saved: number;
  total_interactions: number; engagement_rate: number;
}

function fmt(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(Math.round(n));
}
function fmtDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("pt-BR");
}
function todayISO() { return new Date().toISOString().slice(0, 10); }

type IgTab = "resumo" | "ranking" | "conteudos" | "conexoes";
const IG_TAB_LABELS: Record<IgTab, string> = {
  resumo: "📊 Resumo da Rede",
  ranking: "🏆 Ranking",
  conteudos: "🎬 Conteúdos",
  conexoes: "🔗 Conexões",
};

const STATUS_COLOR: Record<string, string> = {
  conectada: COLOR.GREEN, sem_instagram: COLOR.YELLOW,
  sem_permissao: COLOR.RED, pendente: COLOR.GRAY_MID,
};
const STATUS_LABEL: Record<string, string> = {
  conectada: "✅ Conectada", sem_instagram: "⚠️ Sem Instagram",
  sem_permissao: "❌ Sem Permissão", pendente: "⏳ Pendente",
};

const SORT_OPTIONS = [
  { value: "reach", label: "Alcance" },
  { value: "total_interactions", label: "Engajamento" },
  { value: "likes", label: "Curtidas" },
  { value: "saved", label: "Salvamentos" },
  { value: "shares", label: "Compartilhamentos" },
];
const MEDIA_TYPES = [
  { value: "", label: "Todos" },
  { value: "IMAGE", label: "Fotos" },
  { value: "VIDEO", label: "Vídeos" },
  { value: "CAROUSEL_ALBUM", label: "Carrosséis" },
];

const btnStyle = (active: boolean) => ({
  padding: "0.35rem 0.9rem", borderRadius: 8, fontWeight: 700 as const,
  fontSize: "0.82rem", cursor: "pointer" as const, transition: "all 0.15s",
  border: `1.5px solid ${COLOR.INDIGO}`,
  background: active ? COLOR.INDIGO : "transparent",
  color: active ? "#fff" : COLOR.INDIGO,
});

const selStyle = {
  border: "1px solid #E5E7EB", borderRadius: 8, padding: "0.35rem 0.6rem",
  fontSize: "0.82rem", cursor: "pointer" as const, color: COLOR.GRAY_DARK,
};

export default function Instagram() {
  const [igTab, setIgTab] = useState<IgTab>("resumo");
  const [summary, setSummary] = useState<Summary | null>(null);
  const [ranking, setRanking] = useState<FranquiaRank[]>([]);
  const [pending, setPending] = useState<Pending[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [postsLoading, setPostsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [days, setDays] = useState(30);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState("reach");
  const [mediaType, setMediaType] = useState("");
  const [franquiaFilter, setFranquiaFilter] = useState("");

  async function loadDashboard(d = days) {
    setLoading(true); setError(null);
    try {
      const res = await fetch(`/api/instagram/dashboard?days=${d}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setSummary(data.summary);
      setRanking(data.ranking ?? []);
      setPending(data.pending ?? []);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }

  async function loadPosts(d = days) {
    setPostsLoading(true);
    try {
      const qs = new URLSearchParams({ days: String(d), sort_by: sortBy });
      if (mediaType) qs.set("media_type", mediaType);
      if (franquiaFilter) qs.set("franquia_id", franquiaFilter);
      const res = await fetch(`/api/instagram/posts?${qs}`);
      const data = await res.json();
      setPosts(data.posts ?? []);
    } finally { setPostsLoading(false); }
  }

  async function sync() {
    setSyncing(true); setSyncResult(null);
    try {
      const res = await fetch("/api/instagram/sync", { method: "POST" });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setSyncResult(`✅ ${data.synced} conectadas, ${data.pending} pendentes${data.errors?.length ? `, ${data.errors.length} erros` : ""}`);
      await loadDashboard();
    } catch (e: any) { setSyncResult(`❌ ${e.message}`); }
    finally { setSyncing(false); }
  }

  function selectDays(d: number) { setDays(d); loadDashboard(d); if (igTab === "conteudos") loadPosts(d); }

  useEffect(() => { loadDashboard(); }, []); // eslint-disable-line
  useEffect(() => { if (igTab === "conteudos") loadPosts(); }, [igTab]); // eslint-disable-line
  useEffect(() => { if (igTab === "conteudos") loadPosts(); }, [sortBy, mediaType, franquiaFilter]); // eslint-disable-line

  const RANKING_COLS: Column[] = [
    { key: "nome", label: "Franquia", render: (r) => (
      <div>
        <div style={{ fontWeight: 700 }}>{r.nome}</div>
        {r.instagram_username && <div style={{ fontSize: "0.75rem", color: COLOR.INDIGO }}>@{r.instagram_username}</div>}
      </div>
    )},
    { key: "followers", label: "Seguidores", align: "right", render: (r) => (
      <div>
        <div style={{ fontWeight: 700 }}>{fmt(r.followers)}</div>
        {r.followers_growth !== 0 && (
          <div style={{ fontSize: "0.72rem", color: r.followers_growth > 0 ? COLOR.GREEN : COLOR.RED }}>
            {r.followers_growth > 0 ? "+" : ""}{r.followers_growth}
          </div>
        )}
      </div>
    )},
    { key: "reach", label: "Alcance", align: "right", render: (r) => fmt(r.reach) },
    { key: "total_interactions", label: "Engajamento", align: "right", render: (r) => fmt(r.total_interactions) },
    { key: "posts_count", label: "Posts", align: "right", render: (r) => String(r.posts_count) },
    { key: "last_post", label: "Último post", render: (r) => (
      <div>
        <div style={{ fontSize: "0.82rem" }}>{fmtDate(r.last_post)}</div>
        {r.days_since_post !== null && (
          <div style={{ fontSize: "0.72rem", color: r.days_since_post > 7 ? COLOR.RED : COLOR.GREEN }}>
            {r.days_since_post === 0 ? "hoje" : `${r.days_since_post}d atrás`}
          </div>
        )}
      </div>
    )},
    { key: "status", label: "Status", render: (r) => (
      <span style={{ color: STATUS_COLOR[r.status] ?? COLOR.GRAY_MID, fontWeight: 700, fontSize: "0.78rem" }}>
        {STATUS_LABEL[r.status] ?? r.status}
      </span>
    )},
  ];

  const PENDING_COLS: Column[] = [
    { key: "page_name", label: "Página Facebook", render: (r) => <span style={{ fontWeight: 600 }}>{r.page_name}</span> },
    { key: "business_id", label: "Business ID", render: (r) => <span style={{ fontSize: "0.75rem", color: COLOR.GRAY_MID }}>{r.business_id || "—"}</span> },
    { key: "origem_api", label: "Origem", render: (r) => <span style={{ fontSize: "0.75rem" }}>{r.origem_api}</span> },
    { key: "status_conexao", label: "Status", render: (r) => (
      <span style={{ color: STATUS_COLOR[r.status_conexao] ?? COLOR.GRAY_MID, fontWeight: 700, fontSize: "0.78rem" }}>
        {STATUS_LABEL[r.status_conexao] ?? r.status_conexao}
      </span>
    )},
    { key: "erro_api", label: "Erro", render: (r) => <span style={{ fontSize: "0.72rem", color: COLOR.RED }}>{r.erro_api || "—"}</span> },
    { key: "data_ultima_validacao", label: "Última validação", render: (r) => <span style={{ fontSize: "0.75rem" }}>{fmtDate(r.data_ultima_validacao)}</span> },
  ];

  const POST_COLS: Column[] = [
    { key: "franquia", label: "Franquia", render: (r) => (
      <div>
        <div style={{ fontWeight: 600, fontSize: "0.82rem" }}>{r.franquia_name}</div>
        {r.instagram_username && <div style={{ fontSize: "0.72rem", color: COLOR.INDIGO }}>@{r.instagram_username}</div>}
      </div>
    )},
    { key: "caption", label: "Legenda", render: (r) => (
      <span style={{ fontSize: "0.78rem", color: COLOR.GRAY_DARK }}>
        {(r.caption || "—").slice(0, 80)}{(r.caption?.length ?? 0) > 80 ? "…" : ""}
      </span>
    )},
    { key: "media_type", label: "Tipo", render: (r) => (
      <span style={{ fontSize: "0.72rem", background: COLOR.GRAY_LIGHT, borderRadius: 4, padding: "2px 6px" }}>
        {r.media_type}
      </span>
    )},
    { key: "timestamp", label: "Data", render: (r) => <span style={{ fontSize: "0.82rem" }}>{fmtDate(r.timestamp)}</span> },
    { key: "reach", label: "Alcance", align: "right", render: (r) => fmt(r.reach) },
    { key: "likes", label: "Curtidas", align: "right", render: (r) => fmt(r.likes) },
    { key: "saved", label: "Salvos", align: "right", render: (r) => fmt(r.saved) },
    { key: "shares", label: "Compart.", align: "right", render: (r) => fmt(r.shares) },
    { key: "permalink", label: "", render: (r) => (
      <a href={r.permalink} target="_blank" rel="noopener noreferrer"
         style={{ color: COLOR.INDIGO, fontSize: "0.75rem", textDecoration: "none", fontWeight: 700 }}>
        Ver →
      </a>
    )},
  ];

  const periodBar = (
    <div style={{ background: "#fff", borderRadius: 14, padding: "0.8rem 1.2rem",
                  boxShadow: "0 2px 12px rgba(0,0,0,0.07)",
                  display: "flex", alignItems: "center", gap: "0.5rem" }}>
      {[7, 30, 90].map(d => (
        <button key={d} onClick={() => selectDays(d)} style={btnStyle(days === d)}>{d} dias</button>
      ))}
    </div>
  );

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "4rem", gap: 12 }}>
      <span className="lx-spinner" style={{ width: 24, height: 24 }} />
      <span style={{ color: COLOR.GRAY_MID }}>Carregando Instagram…</span>
    </div>
  );

  if (error) return (
    <div className="info-box" style={{ borderLeftColor: COLOR.RED, background: "#FFF5F5", color: COLOR.RED }}>
      ❌ {error}
      <div style={{ marginTop: 8 }}>
        <button onClick={sync} style={{ ...btnStyle(false), fontSize: "0.78rem" }}>
          🔄 Sincronizar dados agora
        </button>
      </div>
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>

      {/* Sub-tabs */}
      <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
        {(Object.keys(IG_TAB_LABELS) as IgTab[]).map(t => (
          <button key={t} onClick={() => setIgTab(t)}
                  style={{ padding: "0.45rem 1.1rem", borderRadius: 10, fontWeight: 700,
                           fontSize: "0.85rem", cursor: "pointer", border: "none",
                           background: igTab === t ? COLOR.INDIGO : COLOR.GRAY_LIGHT,
                           color: igTab === t ? "#fff" : COLOR.GRAY_DARK,
                           transition: "all 0.15s" }}>
            {IG_TAB_LABELS[t]}
          </button>
        ))}
      </div>

      {/* ── RESUMO ── */}
      {igTab === "resumo" && (
        <>
          {periodBar}
          {summary && (
            <>
              <div className="lx-grid" style={{ gridTemplateColumns: "repeat(4, 1fr)" }}>
                <KpiCard label="Total de Seguidores" value={fmt(summary.total_followers)} color={COLOR.INDIGO}
                         unit={summary.followers_growth > 0 ? `+${fmt(summary.followers_growth)} no período` : "No período"} />
                <KpiCard label="Alcance Total" value={fmt(summary.total_reach)} color={COLOR.ORANGE} unit="No período" />
                <KpiCard label="Engajamento" value={fmt(summary.total_interactions)} color={COLOR.GREEN} unit="Interações" />
                <KpiCard label="Posts Publicados" value={String(summary.total_posts)} color="#8B5CF6" unit="No período" />
              </div>
              <div className="lx-grid" style={{ gridTemplateColumns: "repeat(2, 1fr)" }}>
                <KpiCard label="Franquias Conectadas" value={String(summary.connected_count)} color={COLOR.GREEN} unit="Com Instagram vinculado" />
                <KpiCard label="Franquias Pendentes" value={String(summary.pending_count)} color={COLOR.YELLOW} unit="Aguardando configuração" />
              </div>
            </>
          )}
          {ranking.length > 0 && (
            <>
              <SecHeader>🏆 Top Franquias por Seguidores</SecHeader>
              <ChartBox>
                <PlotlyChart
                  data={[{
                    type: "bar", orientation: "h" as const,
                    x: [...ranking].slice(0, 10).reverse().map(r => r.followers),
                    y: [...ranking].slice(0, 10).reverse().map(r => r.instagram_username ? `@${r.instagram_username}` : r.nome),
                    marker: { color: COLOR.INDIGO },
                    text: [...ranking].slice(0, 10).reverse().map(r => fmt(r.followers)),
                    textposition: "outside" as const,
                    cliponaxis: false,
                    textfont: { size: 11, color: "#374151" },
                  }]}
                  layout={{
                    height: Math.max(300, Math.min(10, ranking.length) * 42 + 60),
                    plot_bgcolor: "#fff", paper_bgcolor: "#fff",
                    margin: { l: 10, r: 80, t: 10, b: 10 },
                    xaxis: {
                      gridcolor: "#F0F0F0",
                      range: [0, Math.max(...ranking.slice(0, 10).map(r => r.followers)) * 1.35],
                      tickfont: { size: 9 },
                    },
                    yaxis: { automargin: true, tickfont: { size: 11 } },
                    showlegend: false,
                  }}
                />
              </ChartBox>
            </>
          )}
          {ranking.length === 0 && !loading && (
            <div className="info-box" style={{ color: COLOR.GRAY_MID }}>
              Nenhuma franquia conectada ainda.{" "}
              <button onClick={sync} disabled={syncing}
                      style={{ background: COLOR.ORANGE, color: "#fff", border: "none",
                               borderRadius: 6, padding: "0.3rem 0.8rem", cursor: "pointer", fontWeight: 700, fontSize: "0.82rem" }}>
                {syncing ? "Sincronizando…" : "🔄 Sincronizar agora"}
              </button>
            </div>
          )}
        </>
      )}

      {/* ── RANKING ── */}
      {igTab === "ranking" && (
        <>
          {periodBar}
          <SecHeader>🏆 Ranking das Franquias ({ranking.length})</SecHeader>
          {ranking.length > 0 ? (
            <ChartBox>
              <DataTable columns={RANKING_COLS} rows={ranking as any} maxHeight={600} />
            </ChartBox>
          ) : (
            <div className="info-box" style={{ color: COLOR.GRAY_MID }}>
              Nenhuma franquia conectada. Execute uma sincronização na aba Conexões.
            </div>
          )}
        </>
      )}

      {/* ── CONTEÚDOS ── */}
      {igTab === "conteudos" && (
        <>
          <div style={{ background: "#fff", borderRadius: 14, padding: "0.8rem 1.2rem",
                        boxShadow: "0 2px 12px rgba(0,0,0,0.07)",
                        display: "flex", alignItems: "center", flexWrap: "wrap", gap: "0.6rem" }}>
            <div style={{ display: "flex", gap: "0.4rem" }}>
              {[7, 30, 90].map(d => (
                <button key={d} onClick={() => selectDays(d)} style={btnStyle(days === d)}>{d} dias</button>
              ))}
            </div>
            <select value={sortBy} onChange={e => setSortBy(e.target.value)} style={selStyle}>
              {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <select value={mediaType} onChange={e => setMediaType(e.target.value)} style={selStyle}>
              {MEDIA_TYPES.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <select value={franquiaFilter} onChange={e => setFranquiaFilter(e.target.value)} style={selStyle}>
              <option value="">Todas as franquias</option>
              {ranking.map(r => <option key={r.id} value={r.id}>{r.nome}</option>)}
            </select>
          </div>
          <SecHeader>🎬 Top Posts — ordenado por {SORT_OPTIONS.find(o => o.value === sortBy)?.label}</SecHeader>
          {postsLoading ? (
            <div style={{ padding: "2rem", textAlign: "center", color: COLOR.GRAY_MID }}>Carregando posts…</div>
          ) : posts.length > 0 ? (
            <ChartBox>
              <DataTable columns={POST_COLS} rows={posts as any} maxHeight={600} />
            </ChartBox>
          ) : (
            <div className="info-box" style={{ color: COLOR.GRAY_MID }}>
              Nenhum post encontrado no período. Tente sincronizar na aba Conexões.
            </div>
          )}
        </>
      )}

      {/* ── CONEXÕES ── */}
      {igTab === "conexoes" && (
        <>
          <div style={{ background: "#fff", borderRadius: 14, padding: "0.9rem 1.4rem",
                        boxShadow: "0 2px 12px rgba(0,0,0,0.07)",
                        display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "0.8rem" }}>
            <div>
              <span style={{ fontWeight: 700, color: COLOR.GRAY_DARK, fontSize: "0.95rem" }}>Status das conexões Meta</span>
              <div style={{ fontSize: "0.8rem", color: COLOR.GRAY_MID, marginTop: 2 }}>
                <span style={{ color: COLOR.GREEN, fontWeight: 700 }}>{ranking.length} conectadas</span>
                {" · "}
                <span style={{ color: COLOR.YELLOW, fontWeight: 700 }}>{pending.length} pendentes</span>
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem", alignItems: "flex-end" }}>
              <button onClick={sync} disabled={syncing}
                      style={{ padding: "0.45rem 1.2rem", borderRadius: 8, fontWeight: 700,
                               fontSize: "0.85rem", cursor: syncing ? "not-allowed" : "pointer",
                               background: COLOR.ORANGE, color: "#fff", border: "none", opacity: syncing ? 0.7 : 1 }}>
                {syncing ? "⏳ Sincronizando…" : "🔄 Sincronizar Agora"}
              </button>
              {syncResult && (
                <span style={{ fontSize: "0.78rem", color: syncResult.startsWith("✅") ? COLOR.GREEN : COLOR.RED }}>
                  {syncResult}
                </span>
              )}
            </div>
          </div>

          <SecHeader>✅ Franquias Conectadas ({ranking.length})</SecHeader>
          {ranking.length > 0 ? (
            <ChartBox>
              <DataTable columns={RANKING_COLS} rows={ranking as any} maxHeight={400} />
            </ChartBox>
          ) : (
            <div className="info-box" style={{ color: COLOR.GRAY_MID }}>Nenhuma franquia conectada ainda.</div>
          )}

          <SecHeader>⚠️ Franquias Pendentes ({pending.length})</SecHeader>
          {pending.length > 0 ? (
            <ChartBox>
              <DataTable columns={PENDING_COLS} rows={pending as any} maxHeight={400} />
            </ChartBox>
          ) : (
            <div className="info-box" style={{ color: COLOR.GREEN }}>✅ Todas as franquias estão conectadas!</div>
          )}
        </>
      )}
    </div>
  );
}
