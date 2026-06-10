import streamlit as st
import plotly.graph_objects as go
import requests
from datetime import datetime

# ── Cores do dashboard LocExpress ──────────────────────────────────────────
COLOR_INDIGO = "#2D3192"
COLOR_ORANGE = "#F47920"
COLOR_RED    = "#EF4444"
COLOR_GREEN  = "#10B981"
COLOR_YELLOW = "#F59E0B"
COLOR_GRAY   = "#6B7280"

_CFG = {"displayModeBar": False}
_L = dict(
    paper_bgcolor="rgba(0,0,0,0)",
    plot_bgcolor="rgba(0,0,0,0)",
    font=dict(family="Inter, Segoe UI, sans-serif", color="#374151", size=12),
    margin=dict(l=10, r=10, t=44, b=10),
    hoverlabel=dict(bgcolor="#FFFFFF", bordercolor="#E5E7EB", font_size=12),
)

# ── Conexão Supabase via REST API ──────────────────────────────────────────

def _supabase_get(table: str, params: dict = None) -> list:
    try:
        url = st.secrets["supabase"]["url"]
        key = st.secrets["supabase"]["service_role_key"]
    except Exception:
        return []

    headers = {
        "apikey": key,
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json",
    }
    query = f"{url}/rest/v1/{table}"
    resp = requests.get(query, headers=headers, params=params or {}, timeout=10)
    if resp.status_code == 200:
        return resp.json()
    return []


@st.cache_data(ttl=300)
def load_channel():
    rows = _supabase_get("youtube_channels", {"order": "created_at.desc", "limit": "1"})
    return rows[0] if rows else None


@st.cache_data(ttl=300)
def load_analytics():
    return _supabase_get(
        "youtube_channel_analytics",
        {"order": "date.asc", "limit": "30"},
    )


@st.cache_data(ttl=300)
def load_videos():
    return _supabase_get(
        "youtube_videos",
        {"order": "score.desc", "limit": "50"},
    )


# ── Helpers ────────────────────────────────────────────────────────────────

def fmt_num(n):
    if n is None:
        return "—"
    n = int(n)
    if n >= 1_000_000:
        return f"{n/1_000_000:.1f}M"
    if n >= 1_000:
        return f"{n/1_000:.1f}K"
    return str(n)


def fmt_date(d: str) -> str:
    try:
        return datetime.strptime(d[:10], "%Y-%m-%d").strftime("%d/%m")
    except Exception:
        return d[:5] if d else "—"


def kpi_card(label: str, value: str, subtitle: str, color: str) -> str:
    return f"""
    <div style="background:#fff;border-radius:14px;padding:1rem 1.2rem;
                box-shadow:0 2px 12px rgba(0,0,0,0.07);border-left:5px solid {color};
                min-height:110px">
        <div style="font-size:0.68rem;font-weight:700;letter-spacing:0.09em;
                    text-transform:uppercase;color:#6B7280;margin-bottom:0.3rem">{label}</div>
        <div style="font-size:1.8rem;font-weight:900;color:{color};line-height:1.1">{value}</div>
        <div style="font-size:0.72rem;color:#9CA3AF;margin-top:0.2rem">{subtitle}</div>
    </div>"""


# ── Gráficos ───────────────────────────────────────────────────────────────

def chart_views(analytics: list) -> go.Figure:
    dates  = [fmt_date(r.get("date", "")) for r in analytics]
    views  = [int(r.get("views", 0)) for r in analytics]
    fig = go.Figure()
    fig.add_trace(go.Scatter(
        x=dates, y=views, mode="lines+markers",
        name="Visualizações",
        line=dict(color=COLOR_INDIGO, width=2.5),
        marker=dict(size=5, color=COLOR_ORANGE),
        fill="tozeroy", fillcolor="rgba(45,49,146,0.08)",
        hovertemplate="%{x}<br>Views: %{y:,}<extra></extra>",
    ))
    fig.update_layout(
        **_L,
        title=dict(text="Visualizações — Últimos 30 dias",
                   font=dict(size=13, color=COLOR_INDIGO), x=0.01),
        xaxis=dict(gridcolor="#F0F0F0"),
        yaxis=dict(gridcolor="#F0F0F0"),
        height=240,
        showlegend=False,
    )
    return fig


def chart_engagement(analytics: list) -> go.Figure:
    dates    = [fmt_date(r.get("date", "")) for r in analytics]
    likes    = [int(r.get("likes", 0)) for r in analytics]
    comments = [int(r.get("comments", 0)) for r in analytics]
    fig = go.Figure()
    fig.add_trace(go.Bar(
        x=dates, y=likes, name="Curtidas",
        marker_color=COLOR_INDIGO, opacity=0.85,
        hovertemplate="%{x}<br>Curtidas: %{y:,}<extra></extra>",
    ))
    fig.add_trace(go.Bar(
        x=dates, y=comments, name="Comentários",
        marker_color=COLOR_ORANGE, opacity=0.85,
        hovertemplate="%{x}<br>Comentários: %{y:,}<extra></extra>",
    ))
    fig.update_layout(
        **_L,
        title=dict(text="Engajamento — Curtidas e Comentários",
                   font=dict(size=13, color=COLOR_INDIGO), x=0.01),
        barmode="group", bargap=0.2,
        xaxis=dict(gridcolor="#F0F0F0"),
        yaxis=dict(gridcolor="#F0F0F0"),
        height=240,
        legend=dict(orientation="h", y=1.12, x=0, bgcolor="rgba(0,0,0,0)"),
    )
    return fig


def chart_subscribers(analytics: list) -> go.Figure:
    dates   = [fmt_date(r.get("date", "")) for r in analytics]
    gained  = [int(r.get("subscribers_gained", 0)) for r in analytics]
    lost    = [-int(r.get("subscribers_lost", 0)) for r in analytics]
    fig = go.Figure()
    fig.add_trace(go.Bar(
        x=dates, y=gained, name="Ganhos",
        marker_color=COLOR_GREEN,
        hovertemplate="%{x}<br>Ganhos: %{y:,}<extra></extra>",
    ))
    fig.add_trace(go.Bar(
        x=dates, y=lost, name="Perdidos",
        marker_color=COLOR_RED,
        hovertemplate="%{x}<br>Perdidos: %{customdata:,}<extra></extra>",
        customdata=[-v for v in lost],
    ))
    fig.update_layout(
        **_L,
        title=dict(text="Inscritos — Ganhos e Perdidos",
                   font=dict(size=13, color=COLOR_INDIGO), x=0.01),
        barmode="relative", bargap=0.2,
        xaxis=dict(gridcolor="#F0F0F0"),
        yaxis=dict(gridcolor="#F0F0F0"),
        height=240,
        legend=dict(orientation="h", y=1.12, x=0, bgcolor="rgba(0,0,0,0)"),
    )
    return fig


def chart_watchtime(analytics: list) -> go.Figure:
    dates   = [fmt_date(r.get("date", "")) for r in analytics]
    minutes = [int(r.get("estimated_minutes_watched", 0)) for r in analytics]
    fig = go.Figure()
    fig.add_trace(go.Scatter(
        x=dates, y=minutes, mode="lines",
        name="Minutos assistidos",
        line=dict(color=COLOR_YELLOW, width=2.5),
        fill="tozeroy", fillcolor="rgba(245,158,11,0.10)",
        hovertemplate="%{x}<br>Minutos: %{y:,}<extra></extra>",
    ))
    fig.update_layout(
        **_L,
        title=dict(text="Tempo Assistido — Minutos (30 dias)",
                   font=dict(size=13, color=COLOR_INDIGO), x=0.01),
        xaxis=dict(gridcolor="#F0F0F0"),
        yaxis=dict(gridcolor="#F0F0F0"),
        height=240,
        showlegend=False,
    )
    return fig


def chart_top_videos(videos: list) -> go.Figure:
    top = videos[:10]
    titles = [v.get("title", "")[:40] + ("…" if len(v.get("title", "")) > 40 else "")
              for v in top]
    views  = [int(v.get("view_count", 0)) for v in top]
    fig = go.Figure(go.Bar(
        x=views,
        y=titles,
        orientation="h",
        marker_color=COLOR_INDIGO,
        text=[fmt_num(v) for v in views],
        textposition="outside",
        textfont=dict(size=10, color="#374151"),
        hovertemplate="%{y}<br>Views: %{x:,}<extra></extra>",
    ))
    fig.update_layout(
        **_L,
        title=dict(text="Top 10 Vídeos por Visualizações",
                   font=dict(size=13, color=COLOR_INDIGO), x=0.01),
        xaxis=dict(gridcolor="#F0F0F0"),
        yaxis=dict(automargin=True, tickfont=dict(size=10)),
        height=max(300, len(top) * 40 + 80),
        margin=dict(l=10, r=60, t=44, b=10),
        showlegend=False,
    )
    return fig


# ── Tabela de vídeos ───────────────────────────────────────────────────────

def render_video_table(videos: list):
    if not videos:
        st.info("Nenhum vídeo disponível. Clique em Sincronizar no dashboard YouTube.")
        return

    st.markdown("""
    <style>
    .yt-table { width:100%; border-collapse:collapse; font-size:0.82rem; }
    .yt-table th { background:#2D3192; color:#fff; padding:8px 12px;
                   text-align:left; font-weight:700; font-size:0.72rem;
                   letter-spacing:0.06em; text-transform:uppercase; }
    .yt-table td { padding:8px 12px; border-bottom:1px solid #F0F0F0; color:#374151; }
    .yt-table tr:hover td { background:#F8F9FF; }
    .yt-score { color:#F47920; font-weight:700; }
    </style>
    """, unsafe_allow_html=True)

    rows_html = ""
    for v in videos[:30]:
        title = v.get("title", "—")[:55]
        pub   = v.get("published_at", "")[:10]
        try:
            pub = datetime.strptime(pub, "%Y-%m-%d").strftime("%d/%m/%Y")
        except Exception:
            pass
        views    = fmt_num(v.get("view_count", 0))
        likes    = fmt_num(v.get("like_count", 0))
        comments = fmt_num(v.get("comment_count", 0))
        score    = fmt_num(v.get("score", 0))
        vid_id   = v.get("video_id", "")
        link     = f"https://www.youtube.com/watch?v={vid_id}"
        rows_html += f"""
        <tr>
            <td><a href="{link}" target="_blank"
                   style="color:#2D3192;text-decoration:none;font-weight:600">{title}</a></td>
            <td>{pub}</td>
            <td style="text-align:right">{views}</td>
            <td style="text-align:right">{likes}</td>
            <td style="text-align:right">{comments}</td>
            <td style="text-align:right" class="yt-score">{score}</td>
        </tr>"""

    st.markdown(f"""
    <div style="background:#fff;border-radius:14px;overflow:hidden;
                box-shadow:0 2px 12px rgba(0,0,0,0.06);margin-top:0.5rem">
        <table class="yt-table">
            <thead><tr>
                <th>Vídeo</th><th>Data</th>
                <th style="text-align:right">Views</th>
                <th style="text-align:right">Curtidas</th>
                <th style="text-align:right">Coment.</th>
                <th style="text-align:right">Score</th>
            </tr></thead>
            <tbody>{rows_html}</tbody>
        </table>
    </div>
    """, unsafe_allow_html=True)


# ── Página principal ───────────────────────────────────────────────────────

def page_youtube():
    # Verifica se secrets estão configurados
    try:
        _ = st.secrets["supabase"]["url"]
    except Exception:
        st.error("⚠️ Configure as credenciais do Supabase nos Secrets do Streamlit Cloud.")
        st.code("""
# .streamlit/secrets.toml
[supabase]
url = "https://hhjrevkohnszuezvcinb.supabase.co"
service_role_key = "sua-service-role-key"
        """)
        return

    # ── Header ──────────────────────────────────────────────────────────────
    st.markdown(f"""
    <div style="background:linear-gradient(135deg,#FF0000 0%,#CC0000 100%);
                border-radius:14px;padding:1rem 1.5rem;margin-bottom:1rem;
                box-shadow:0 4px 20px rgba(255,0,0,0.2)">
        <div style="display:flex;align-items:center;gap:12px">
            <div style="font-size:1.5rem">▶</div>
            <div>
                <div style="font-size:1.1rem;font-weight:900;color:#fff">YouTube Analytics</div>
                <div style="font-size:0.75rem;color:rgba(255,255,255,0.8)">
                    Dados dos últimos 30 dias · Atualização via Sincronizar no LocHub</div>
            </div>
        </div>
    </div>
    """, unsafe_allow_html=True)

    # ── Carrega dados ────────────────────────────────────────────────────────
    with st.spinner("Carregando dados do YouTube..."):
        channel   = load_channel()
        analytics = load_analytics()
        videos    = load_videos()

    if not channel and not analytics and not videos:
        st.warning("Nenhum dado encontrado. Conecte o canal YouTube no LocHub e sincronize primeiro.")
        st.markdown("""
        **Como conectar:**
        1. Acesse o LocHub em `http://localhost:3000/youtube`
        2. Clique em **Conectar YouTube**
        3. Autorize o acesso
        4. Clique em **Sincronizar agora**
        """)
        return

    # ── Botão de refresh ────────────────────────────────────────────────────
    col_title, col_btn = st.columns([5, 1])
    with col_btn:
        if st.button("🔄 Atualizar", use_container_width=True):
            st.cache_data.clear()
            st.rerun()

    # ── KPI Cards do canal ──────────────────────────────────────────────────
    if channel:
        c1, c2, c3, c4 = st.columns(4)
        with c1:
            st.markdown(kpi_card(
                "Inscritos", fmt_num(channel.get("subscriber_count")),
                "Total do canal", COLOR_RED,
            ), unsafe_allow_html=True)
        with c2:
            st.markdown(kpi_card(
                "Visualizações totais", fmt_num(channel.get("view_count")),
                "Histórico do canal", COLOR_INDIGO,
            ), unsafe_allow_html=True)
        with c3:
            st.markdown(kpi_card(
                "Vídeos publicados", fmt_num(channel.get("video_count")),
                "No canal", COLOR_ORANGE,
            ), unsafe_allow_html=True)
        with c4:
            total_views_30d = sum(int(r.get("views", 0)) for r in analytics)
            st.markdown(kpi_card(
                "Views (30 dias)", fmt_num(total_views_30d),
                "Últimos 30 dias", COLOR_GREEN,
            ), unsafe_allow_html=True)

        st.markdown("<div style='margin-top:0.8rem'></div>", unsafe_allow_html=True)

        # ── Cards de engajamento 30 dias ────────────────────────────────────
        c5, c6, c7, c8 = st.columns(4)
        total_likes    = sum(int(r.get("likes", 0)) for r in analytics)
        total_comments = sum(int(r.get("comments", 0)) for r in analytics)
        total_minutes  = sum(int(r.get("estimated_minutes_watched", 0)) for r in analytics)
        net_subs = sum(
            int(r.get("subscribers_gained", 0)) - int(r.get("subscribers_lost", 0))
            for r in analytics
        )
        net_color = COLOR_GREEN if net_subs >= 0 else COLOR_RED
        net_prefix = "+" if net_subs >= 0 else ""

        with c5:
            st.markdown(kpi_card("Curtidas (30d)", fmt_num(total_likes), "Últimos 30 dias", COLOR_INDIGO), unsafe_allow_html=True)
        with c6:
            st.markdown(kpi_card("Comentários (30d)", fmt_num(total_comments), "Últimos 30 dias", COLOR_ORANGE), unsafe_allow_html=True)
        with c7:
            st.markdown(kpi_card("Minutos assistidos", fmt_num(total_minutes), "Últimos 30 dias", COLOR_YELLOW), unsafe_allow_html=True)
        with c8:
            st.markdown(kpi_card("Inscritos líquidos", f"{net_prefix}{fmt_num(net_subs)}", "Ganhos − perdidos (30d)", net_color), unsafe_allow_html=True)

        st.markdown("<div style='margin-top:0.5rem'></div>", unsafe_allow_html=True)

    # ── Gráficos ─────────────────────────────────────────────────────────────
    if analytics:
        st.markdown(f'<div style="font-size:0.95rem;font-weight:700;color:{COLOR_INDIGO};'
                    f'padding:0.35rem 0;border-bottom:2.5px solid {COLOR_ORANGE};'
                    f'margin-bottom:0.75rem">📈 Desempenho — Últimos 30 dias</div>',
                    unsafe_allow_html=True)

        col_a, col_b = st.columns(2)
        with col_a:
            st.markdown('<div style="background:#fff;border-radius:14px;padding:0.5rem;'
                        'box-shadow:0 2px 12px rgba(0,0,0,0.06)">', unsafe_allow_html=True)
            st.plotly_chart(chart_views(analytics), use_container_width=True, config=_CFG)
            st.markdown("</div>", unsafe_allow_html=True)
        with col_b:
            st.markdown('<div style="background:#fff;border-radius:14px;padding:0.5rem;'
                        'box-shadow:0 2px 12px rgba(0,0,0,0.06)">', unsafe_allow_html=True)
            st.plotly_chart(chart_engagement(analytics), use_container_width=True, config=_CFG)
            st.markdown("</div>", unsafe_allow_html=True)

        col_c, col_d = st.columns(2)
        with col_c:
            st.markdown('<div style="background:#fff;border-radius:14px;padding:0.5rem;'
                        'box-shadow:0 2px 12px rgba(0,0,0,0.06)">', unsafe_allow_html=True)
            st.plotly_chart(chart_subscribers(analytics), use_container_width=True, config=_CFG)
            st.markdown("</div>", unsafe_allow_html=True)
        with col_d:
            st.markdown('<div style="background:#fff;border-radius:14px;padding:0.5rem;'
                        'box-shadow:0 2px 12px rgba(0,0,0,0.06)">', unsafe_allow_html=True)
            st.plotly_chart(chart_watchtime(analytics), use_container_width=True, config=_CFG)
            st.markdown("</div>", unsafe_allow_html=True)

    # ── Top vídeos ────────────────────────────────────────────────────────────
    if videos:
        st.markdown("<div style='margin-top:0.5rem'></div>", unsafe_allow_html=True)
        st.markdown(f'<div style="font-size:0.95rem;font-weight:700;color:{COLOR_INDIGO};'
                    f'padding:0.35rem 0;border-bottom:2.5px solid {COLOR_ORANGE};'
                    f'margin-bottom:0.75rem">🎬 Vídeos do canal ({len(videos)} vídeos)</div>',
                    unsafe_allow_html=True)

        col_chart, col_space = st.columns([2, 1])
        with col_chart:
            st.markdown('<div style="background:#fff;border-radius:14px;padding:0.5rem;'
                        'box-shadow:0 2px 12px rgba(0,0,0,0.06)">', unsafe_allow_html=True)
            st.plotly_chart(chart_top_videos(videos), use_container_width=True, config=_CFG)
            st.markdown("</div>", unsafe_allow_html=True)

        render_video_table(videos)
