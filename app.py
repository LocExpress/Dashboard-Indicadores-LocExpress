"""
app.py — Dashboard de Indicadores | LocExpress Franchising
"Nosso DNA é locação!"

Páginas:
  📊 Visão Geral      — resumo de status de todos os indicadores
  🏢 Por Departamento — drill-down Setor → Indicador com cards e gráficos dedicados
"""

import streamlit as st
import pandas as pd
import plotly.graph_objects as go
from plotly.subplots import make_subplots

import utils
from sge_page import page_diagnostico_sge

# ─── Configuração da Página ───────────────────────────────────────────────────

st.set_page_config(
    page_title="Dashboard LocExpress Franchising",
    page_icon="🏠",
    layout="wide",
    initial_sidebar_state="expanded",
    menu_items={"About": "Dashboard de Indicadores | LocExpress Franchising\nNosso DNA é locação!"},
)

def _logo_svg(color: str, size: int = 50) -> str:
    # Casa com borda espessa (outer pentagon - inner pentagon via evenodd)
    # Seta superior apontando para esquerda ←
    # Seta inferior apontando para direita → (ponta sai pela parede direita)
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{size}" height="{size}" '
        f'viewBox="0 0 200 210" fill="{color}">'
        f'<path fill-rule="evenodd" d="'
        f'M100,6 L192,72 L192,202 L8,202 L8,72 Z '
        f'M100,34 L168,80 L168,174 L32,174 L32,80 Z"/>'
        f'<polygon points="168,107 168,125 68,125 68,138 32,116 68,94 68,107"/>'
        f'<polygon points="32,142 32,160 130,160 130,174 192,151 130,128 130,142"/>'
        f'</svg>'
    )

# ─── CSS ──────────────────────────────────────────────────────────────────────

def inject_css():
    st.markdown("""
    <style>
    /* ── Fonte e base ── */
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;900&display=swap');
    html, body, [class*="css"] { font-family: 'Inter', sans-serif; }

    [data-testid="stAppViewContainer"] { background-color: #F0F2F6; }
    [data-testid="block-container"]    { padding-top: 1.2rem; padding-bottom: 2rem; }

    /* ── Sidebar ── */
    [data-testid="stSidebar"] {
        background: linear-gradient(180deg, #0F0F5E 0%, #2D3192 50%, #3F3FBF 100%);
    }
    [data-testid="stSidebar"] p,
    [data-testid="stSidebar"] span,
    [data-testid="stSidebar"] label,
    [data-testid="stSidebar"] div { color: #E8EAFF !important; }
    [data-testid="stSidebar"] .stMultiSelect label,
    [data-testid="stSidebar"] .stSelectbox  label {
        font-size: 0.72rem !important; font-weight: 700 !important;
        letter-spacing: 0.07em !important; text-transform: uppercase !important;
        color: #AABFFF !important;
    }
    /* Selectbox e multiselect no sidebar — dropdown items */
    [data-testid="stSidebar"] [data-baseweb="select"] > div {
        background-color: rgba(255,255,255,0.1) !important;
        border-color: rgba(255,255,255,0.2) !important;
        color: #fff !important;
    }
    /* Tags (chips) dos filtros multiselect — cinza em vez de vermelho/laranja */
    [data-testid="stSidebar"] [data-baseweb="tag"] {
        background-color: rgba(255,255,255,0.18) !important;
        border: 1px solid rgba(255,255,255,0.28) !important;
        border-radius: 6px !important;
    }
    [data-testid="stSidebar"] [data-baseweb="tag"] span {
        color: #E8EAFF !important;
        font-size: 0.72rem !important;
    }
    [data-testid="stSidebar"] [data-baseweb="tag"] [role="button"] {
        color: rgba(255,255,255,0.6) !important;
    }
    [data-testid="stSidebar"] [data-baseweb="tag"] [role="button"]:hover {
        color: #fff !important;
    }

    /* ── Header ── */
    .lx-header {
        background: linear-gradient(135deg, #0F0F5E 0%, #2D3192 45%, #F47920 100%);
        padding: 0;
        border-radius: 16px;
        margin-bottom: 1.4rem;
        box-shadow: 0 8px 30px rgba(0,0,0,0.22);
        overflow: hidden;
    }
    .lx-header-top {
        background: #F47920;
        padding: 0.5rem 2rem;
        display: flex; align-items: center; gap: 0.8rem;
    }
    .lx-header-top .lx-logo-text {
        font-size: 1.4rem; font-weight: 900; color: #fff; letter-spacing: -0.02em;
    }
    .lx-header-top .lx-logo-text span { color: #1A1A6E; }
    .lx-header-top .lx-tagline {
        font-size: 0.75rem; font-weight: 700; color: #fff;
        letter-spacing: 0.1em; opacity: 0.9;
    }
    .lx-header-body {
        padding: 1.2rem 2rem 1.4rem;
    }
    .lx-header-body h1 {
        color: #FFFFFF; font-size: 1.6rem; font-weight: 900;
        margin: 0; letter-spacing: -0.02em;
    }
    .lx-header-body p { color: #AABFFF; font-size: 0.88rem; margin: 0.3rem 0 0; }
    .lx-badge {
        display: inline-block; background: rgba(255,255,255,0.15);
        color: #fff; padding: 0.15rem 0.7rem; border-radius: 20px;
        font-size: 0.7rem; font-weight: 700; letter-spacing: 0.07em;
        border: 1px solid rgba(255,255,255,0.25); margin-left: 0.5rem;
        vertical-align: middle;
    }

    /* ── KPI Cards ── */
    .kpi-card {
        background: #FFFFFF; border-radius: 14px;
        padding: 1.1rem 1.3rem;
        box-shadow: 0 2px 16px rgba(0,0,0,0.07);
        border-left: 5px solid;
        min-height: 120px;
        transition: transform 0.18s, box-shadow 0.18s;
    }
    .kpi-card:hover { transform: translateY(-3px); box-shadow: 0 6px 24px rgba(0,0,0,0.12); }
    .kpi-label  { font-size: 0.68rem; font-weight: 700; letter-spacing: 0.09em;
                  text-transform: uppercase; color: #6B7280; margin-bottom: 0.3rem; }
    .kpi-value  { font-size: 1.75rem; font-weight: 900; line-height: 1.1; margin-bottom: 0.2rem; }
    .kpi-status { font-size: 0.72rem; font-weight: 600; }
    .kpi-unit   { font-size: 0.65rem; color: #9CA3AF; margin-top: 0.2rem; }

    /* ── Summary count cards (Visão Geral) ── */
    .summary-card {
        background: #FFFFFF; border-radius: 14px; padding: 1rem 1.2rem;
        box-shadow: 0 2px 14px rgba(0,0,0,0.07); text-align: center;
        border-top: 4px solid;
        min-height: 130px;
        display: flex; flex-direction: column;
        align-items: center; justify-content: center;
    }
    .summary-card .s-num  { font-size: 2.4rem; font-weight: 900; line-height: 1; }
    .summary-card .s-label{ font-size: 0.75rem; font-weight: 600; color: #6B7280;
                             text-transform: uppercase; letter-spacing: 0.06em; margin-top: 0.3rem; }

    /* ── Section headers ── */
    .sec-header {
        font-size: 0.95rem; font-weight: 700; color: #2D3192;
        padding: 0.35rem 0; border-bottom: 2.5px solid #F47920;
        margin: 1rem 0 0.75rem;
    }

    /* ── Chart boxes ── */
    .chart-box {
        background: #FFFFFF; border-radius: 14px; padding: 0.6rem;
        box-shadow: 0 2px 12px rgba(0,0,0,0.06);
    }

    /* ── Indicator type pill ── */
    .unit-pill {
        display: inline-block; border-radius: 12px;
        padding: 0.1rem 0.6rem; font-size: 0.7rem; font-weight: 700;
        letter-spacing: 0.04em;
    }

    /* ── Info box ── */
    .info-box {
        background: #EEF2FF; border-left: 4px solid #2D3192;
        border-radius: 8px; padding: 0.8rem 1rem;
        color: #2D3192; font-size: 0.85rem;
    }

    /* ── Tabs ── */
    .stTabs [data-baseweb="tab-list"]  { gap: 6px; background: transparent; }
    .stTabs [data-baseweb="tab"]       {
        border-radius: 8px 8px 0 0; background: #E5E7EB;
        color: #374151; font-weight: 600; padding: 0.4rem 1.3rem;
    }
    .stTabs [aria-selected="true"] {
        background: #2D3192 !important; color: #FFFFFF !important;
    }

    /* ── Botão ── */
    .stButton > button {
        background: linear-gradient(135deg, #2D3192 0%, #F47920 100%);
        color: white; border: none; border-radius: 8px;
        font-weight: 700; width: 100%; letter-spacing: 0.02em;
    }
    .stButton > button:hover { opacity: 0.88; transform: translateY(-1px); }

    /* ── Selectbox no corpo principal ── */
    .stSelectbox label { color: #2D3192 !important; font-weight: 700 !important; }

    /* ── Dataframe ── */
    [data-testid="stDataFrame"] { border-radius: 10px; overflow: hidden; }

    footer { visibility: hidden; }
    </style>
    """, unsafe_allow_html=True)


# ─── Logo + Header ────────────────────────────────────────────────────────────

def render_header(n_filtered: int, n_total: int):
    logo_white = _logo_svg("#FFFFFF", size=44)
    st.markdown(f"""
    <div class="lx-header">
        <div class="lx-header-top">
            <div>
                <div style="display:flex;align-items:center;gap:12px">
                    <div style="width:52px;height:52px;background:rgba(255,255,255,0.15);
                                border-radius:12px;display:flex;align-items:center;
                                justify-content:center;padding:4px">
                        {logo_white}
                    </div>
                    <div>
                        <div class="lx-logo-text">
                            Loc<span>Express</span>
                            <em style="font-style:italic;font-size:0.95rem;font-weight:700;
                                       color:rgba(255,255,255,0.9);margin-left:3px">Franchising</em>
                        </div>
                        <div class="lx-tagline">NOSSO DNA É LOCAÇÃO!</div>
                    </div>
                </div>
            </div>
        </div>
        <div class="lx-header-body">
            <h1>📊 Dashboard de Indicadores</h1>
            <p>Acompanhamento de KPIs por Setor, Indicador e Período
               &nbsp;|&nbsp; {n_filtered:,} registros · {n_total:,} total</p>
        </div>
    </div>
    """, unsafe_allow_html=True)


# ─── Plotly layout base ───────────────────────────────────────────────────────

_CFG = {"displayModeBar": False}

_L = dict(
    paper_bgcolor="rgba(0,0,0,0)",
    plot_bgcolor="rgba(0,0,0,0)",
    font=dict(family="Inter, Segoe UI, sans-serif", color="#374151", size=12),
    margin=dict(l=10, r=10, t=44, b=10),
    hoverlabel=dict(bgcolor="#FFFFFF", bordercolor="#E5E7EB", font_size=12),
    legend=dict(orientation="h", yanchor="bottom", y=1.02,
                xanchor="right", x=1, bgcolor="rgba(0,0,0,0)"),
)

_TITLE = lambda t: dict(text=t, font=dict(size=13, color=utils.COLOR_INDIGO, weight="bold"), x=0.01)


# ─── KPI Cards para um Indicador específico ──────────────────────────────────

def render_kpi_cards_indicator(kpis: dict):
    """Cards formatados com Unidade_Medida e sentido corretos."""
    unidade = kpis.get("unidade", "")
    sentido = kpis.get("sentido", "Maior")
    valor   = kpis.get("valor",   float("nan"))
    meta    = kpis.get("meta",    0.0)
    ating   = kpis.get("atingimento", float("nan"))

    cfg     = utils.get_unidade_config(unidade)
    u_color = cfg["color"]
    u_icon  = cfg["icon"]

    status_color = utils.get_status_color(ating)
    status_icon  = utils.get_status_icon(ating)
    status_label = utils.get_status_label(ating)

    diff_txt, diff_color = utils.fmt_diferenca(valor, meta, sentido, unidade)

    sentido_label = "⬇ Menor é Melhor" if utils.is_sentido_menor(sentido) else "⬆ Maior é Melhor"

    c1, c2, c3, c4 = st.columns(4)

    with c1:
        st.markdown(f"""
        <div class="kpi-card" style="border-left-color:{u_color}">
            <div class="kpi-label">{u_icon} Valor Realizado</div>
            <div class="kpi-value" style="color:{u_color}">{utils.fmt_value(valor, unidade)}</div>
            <div class="kpi-unit">{sentido_label}</div>
        </div>""", unsafe_allow_html=True)

    with c2:
        st.markdown(f"""
        <div class="kpi-card" style="border-left-color:{utils.COLOR_ORANGE}">
            <div class="kpi-label">🎯 Meta</div>
            <div class="kpi-value" style="color:{utils.COLOR_ORANGE}">{utils.fmt_value(meta, unidade)}</div>
            <div class="kpi-unit">Unidade: {unidade}</div>
        </div>""", unsafe_allow_html=True)

    with c3:
        st.markdown(f"""
        <div class="kpi-card" style="border-left-color:{status_color}">
            <div class="kpi-label">📈 % Atingimento</div>
            <div class="kpi-value" style="color:{status_color}">{utils.fmt_pct(ating)}</div>
            <div class="kpi-status" style="color:{status_color}">{status_icon} {status_label}</div>
        </div>""", unsafe_allow_html=True)

    with c4:
        st.markdown(f"""
        <div class="kpi-card" style="border-left-color:{diff_color}">
            <div class="kpi-label">📉 Diferença</div>
            <div class="kpi-value" style="color:{diff_color}">{diff_txt}</div>
            <div class="kpi-unit">Realizado − Meta</div>
        </div>""", unsafe_allow_html=True)

    st.markdown("<div style='margin-top:1rem'></div>", unsafe_allow_html=True)


# ─── Cards de Resumo (Visão Geral) ───────────────────────────────────────────

def render_summary_cards(agg: pd.DataFrame):
    """4 cards de contagem: total, atingido, atenção, abaixo."""
    total     = len(agg)
    with_data = agg.dropna(subset=["Atingimento"])
    n_green   = (with_data["Atingimento"] >= 100).sum()
    n_yellow  = ((with_data["Atingimento"] >= 80) & (with_data["Atingimento"] < 100)).sum()
    n_red     = (with_data["Atingimento"] < 80).sum()
    n_na      = total - len(with_data)

    c1, c2, c3, c4, c5 = st.columns(5)
    cards = [
        (c1, total,    "#2D3192", "Total de KPIs"),
        (c2, n_green,  utils.COLOR_GREEN,  "✅ Meta Atingida"),
        (c3, n_yellow, utils.COLOR_YELLOW, "⚠️ Em Atenção"),
        (c4, n_red,    utils.COLOR_RED,    "🚨 Abaixo da Meta"),
        (c5, n_na,     utils.COLOR_GRAY_MID, "⬜ Não Informado"),
    ]
    for col, num, color, label in cards:
        with col:
            pct_txt = f"{num/total*100:.0f}%" if total > 0 and label != "Total de KPIs" else ""
            st.markdown(f"""
            <div class="summary-card" style="border-top-color:{color}">
                <div class="s-num" style="color:{color}">{num}</div>
                <div class="s-label">{label}</div>
                {"<div style='font-size:0.7rem;color:#9CA3AF;margin-top:3px'>" + pct_txt + "</div>" if pct_txt else ""}
            </div>""", unsafe_allow_html=True)
    st.markdown("<div style='margin-top:1rem'></div>", unsafe_allow_html=True)


# ─── Gráfico: Barras Meta × Realizado ────────────────────────────────────────

def chart_meta_realizado_mensal(monthly: pd.DataFrame, unidade: str, title: str,
                                  hist_avg: float = None) -> go.Figure:
    """Barras agrupadas Meta × Realizado por mês, com valor real + % acima de cada barra."""
    colors_r = [utils.get_status_color(a) for a in monthly["Atingimento"]]

    fig = go.Figure()
    fig.add_trace(go.Bar(
        name="Meta", x=monthly["Label"], y=monthly["Meta"],
        marker_color="#CBD5E1", marker_line_color="#94A3B8", marker_line_width=1,
        text=[utils.fmt_value(v, unidade) if not pd.isna(v) else "" for v in monthly["Meta"]],
        textposition="outside", textfont=dict(size=9, color="#94A3B8"),
        hovertemplate="%{x}<br>Meta: %{text}<extra></extra>",
    ))

    # Rótulo: valor real + % atingimento
    real_labels = []
    hover_custom = []
    for v, a in zip(monthly["Valor"], monthly["Atingimento"]):
        if pd.isna(v):
            real_labels.append("—")
        else:
            real_labels.append(f"{utils.fmt_value(v, unidade)}  {utils.fmt_pct(a)}")
        hover_custom.append([utils.fmt_value(v, unidade), utils.fmt_pct(a)])

    fig.add_trace(go.Bar(
        name="Realizado", x=monthly["Label"], y=monthly["Valor"],
        marker_color=colors_r,
        text=real_labels,
        textposition="outside", textfont=dict(size=9, color=utils.COLOR_INDIGO, weight="bold"),
        hovertemplate="%{x}<br>Realizado: %{customdata[0]}<br>Atingimento: %{customdata[1]}<extra></extra>",
        customdata=hover_custom,
    ))

    if hist_avg is not None and not pd.isna(hist_avg):
        fig.add_hline(
            y=hist_avg, line_dash="dot", line_color=utils.COLOR_INDIGO, line_width=1.5,
            annotation_text=f"Média anos ant.: {utils.fmt_value(hist_avg, unidade)}",
            annotation_position="top left",
            annotation_font=dict(size=9, color=utils.COLOR_INDIGO),
        )

    fig.update_layout(
        **_L, title=_TITLE(title),
        barmode="group", bargap=0.22, bargroupgap=0.05,
        xaxis=dict(gridcolor="#F0F0F0"), yaxis=dict(gridcolor="#F0F0F0"),
    )
    return fig


def chart_evolucao_linha(monthly: pd.DataFrame, unidade: str, title: str,
                          hist_avg: float = None) -> go.Figure:
    """Linha + área de evolução mensal com % de atingimento."""
    fig = go.Figure()
    fig.add_trace(go.Scatter(
        x=monthly["Label"], y=monthly["Meta"],
        name="Meta", mode="lines+markers",
        line=dict(color="#CBD5E1", width=2, dash="dot"),
        marker=dict(size=6, color="#94A3B8"),
        hovertemplate="%{x}<br>Meta: %{customdata}<extra></extra>",
        customdata=[utils.fmt_value(v, unidade) for v in monthly["Meta"]],
    ))
    fig.add_trace(go.Scatter(
        x=monthly["Label"], y=monthly["Valor"],
        name="Realizado", mode="lines+markers+text",
        line=dict(color=utils.COLOR_INDIGO, width=3),
        marker=dict(size=9, color=utils.COLOR_ORANGE,
                    line=dict(color=utils.COLOR_INDIGO, width=2)),
        fill="tonexty", fillcolor="rgba(45,49,146,0.10)",
        text=[utils.fmt_pct(a) for a in monthly["Atingimento"]],
        textposition="top center",
        textfont=dict(size=10, color=utils.COLOR_INDIGO, weight="bold"),
        hovertemplate="%{x}<br>Realizado: %{customdata}<br>Ating.: %{text}<extra></extra>",
        customdata=[utils.fmt_value(v, unidade) for v in monthly["Valor"]],
    ))
    if hist_avg is not None and not pd.isna(hist_avg):
        fig.add_hline(
            y=hist_avg, line_dash="dot", line_color=utils.COLOR_ORANGE, line_width=1.5,
            annotation_text=f"Média anos ant.: {utils.fmt_value(hist_avg, unidade)}",
            annotation_position="top left",
            annotation_font=dict(size=9, color=utils.COLOR_ORANGE),
        )
    fig.update_layout(
        **_L, title=_TITLE(title),
        xaxis=dict(gridcolor="#F0F0F0"),
        yaxis=dict(gridcolor="#F0F0F0"),
        hovermode="x unified",
    )
    return fig


def chart_ranking_indicadores(agg: pd.DataFrame, title: str) -> go.Figure:
    """Barras horizontais de % Atingimento por Indicador."""
    df_s = agg.dropna(subset=["Atingimento"]).sort_values("Atingimento", ascending=True)
    if df_s.empty:
        return go.Figure()

    colors = [utils.get_status_color(a) for a in df_s["Atingimento"]]
    labels = [f"{row['Indicador']} <span style='font-size:10px'>({row['Unidade_Medida']})</span>"
              for _, row in df_s.iterrows()]

    fig = go.Figure(go.Bar(
        x=df_s["Atingimento"], y=df_s["Indicador"], orientation="h",
        marker_color=colors,
        text=[utils.fmt_pct(a) for a in df_s["Atingimento"]],
        textposition="outside",
        textfont=dict(size=11, color="#374151", weight="bold"),
        hovertemplate="%{y}<br>% Ating.: %{x:.1f}%<extra></extra>",
    ))
    fig.add_vline(x=80,  line_dash="dash", line_color=utils.COLOR_YELLOW, line_width=1.5,
                  annotation_text="80%",  annotation_position="top",
                  annotation_font=dict(size=9, color=utils.COLOR_YELLOW))
    fig.add_vline(x=100, line_dash="dash", line_color=utils.COLOR_GREEN, line_width=1.5,
                  annotation_text="100%", annotation_position="top",
                  annotation_font=dict(size=9, color=utils.COLOR_GREEN))
    x_max = max(df_s["Atingimento"].max() * 1.28, 130)
    max_label = max((len(str(i)) for i in df_s["Indicador"]), default=10)
    l_margin = max(120, max_label * 7)
    fig.update_layout(
        **_L, title=_TITLE(title), showlegend=False,
        xaxis=dict(title="% Atingimento", gridcolor="#F0F0F0",
                   ticksuffix="%", range=[0, x_max]),
        yaxis=dict(gridcolor="rgba(0,0,0,0)", tickfont=dict(size=10), automargin=True),
        height=max(300, len(df_s) * 50 + 90),
    )
    fig.update_layout(margin=dict(l=l_margin, r=20, t=44, b=10))
    return fig


def chart_tabela_indicadores(agg: pd.DataFrame) -> go.Figure:
    """Tabela Plotly: Valor Realizado × Meta × Diferença × % Atingimento por Indicador."""
    if agg.empty:
        return go.Figure()

    df = agg.copy().sort_values(["Departamento", "Indicador"]).reset_index(drop=True)

    col_setor  = df["Departamento"].tolist()
    col_ind    = df["Indicador"].tolist()
    col_unid   = df["Unidade_Medida"].tolist()
    col_valor  = [utils.fmt_value(r["Valor"], r["Unidade_Medida"]) for _, r in df.iterrows()]
    col_meta   = [utils.fmt_value(r["Meta"],  r["Unidade_Medida"]) for _, r in df.iterrows()]
    col_dif    = []
    col_dif_colors = []
    col_ating  = [utils.fmt_pct(a) for a in df["Atingimento"]]

    for _, r in df.iterrows():
        txt, color = utils.fmt_diferenca(
            r["Valor"], r["Meta"], r["Sentido_Meta"], r["Unidade_Medida"]
        )
        col_dif.append(txt)
        col_dif_colors.append(color)

    row_fill = []
    for a in df["Atingimento"]:
        if pd.isna(a):
            row_fill.append("#F9FAFB")
        elif a >= 100:
            row_fill.append("#ECFDF5")
        elif a >= 80:
            row_fill.append("#FFFBEB")
        else:
            row_fill.append("#FFF5F5")

    ating_colors = [utils.get_status_color(a) for a in df["Atingimento"]]

    n = len(df)
    fig = go.Figure(go.Table(
        columnwidth=[2, 3, 1.2, 1.8, 1.8, 1.8, 1.8],
        header=dict(
            values=["<b>Setor</b>", "<b>Indicador</b>", "<b>Unid.</b>",
                    "<b>Valor Real</b>", "<b>Meta</b>", "<b>Diferença</b>", "<b>% Ating.</b>"],
            fill_color=utils.COLOR_INDIGO,
            font=dict(color="white", size=11, family="Inter, sans-serif"),
            align=["left", "left", "center", "right", "right", "right", "center"],
            height=34,
            line_color="rgba(255,255,255,0.15)",
        ),
        cells=dict(
            values=[col_setor, col_ind, col_unid, col_valor, col_meta, col_dif, col_ating],
            fill_color=[row_fill] * 7,
            font=dict(
                size=11, family="Inter, sans-serif",
                color=[
                    [utils.COLOR_GRAY_DARK] * n,
                    [utils.COLOR_INDIGO]    * n,
                    [utils.COLOR_GRAY_MID]  * n,
                    [utils.COLOR_BLUE_DARK] * n,
                    [utils.COLOR_ORANGE]    * n,
                    col_dif_colors,
                    ating_colors,
                ],
            ),
            align=["left", "left", "center", "right", "right", "right", "center"],
            height=30,
            line_color="#E5E7EB",
        ),
    ))
    fig.update_layout(
        paper_bgcolor="rgba(0,0,0,0)",
        font=dict(family="Inter, sans-serif"),
        title=_TITLE("Indicadores — Valor Real × Meta × Diferença"),
        margin=dict(l=0, r=0, t=44, b=0),
        height=max(280, n * 30 + 90),
    )
    return fig


def chart_atingimento_por_setor(agg: pd.DataFrame) -> go.Figure:
    """Barra horizontal com atingimento médio por Setor."""
    df_a = (
        agg.dropna(subset=["Atingimento"])
        .groupby("Departamento", as_index=False)["Atingimento"].mean()
        .sort_values("Atingimento", ascending=True)
    )
    if df_a.empty:
        return go.Figure()

    colors = [utils.get_status_color(a) for a in df_a["Atingimento"]]
    fig = go.Figure(go.Bar(
        x=df_a["Atingimento"], y=df_a["Departamento"], orientation="h",
        marker_color=colors,
        text=[utils.fmt_pct(a) for a in df_a["Atingimento"]],
        textposition="outside", textfont=dict(size=11, color="#374151", weight="bold"),
        hovertemplate="%{y}<br>Atingimento médio: %{x:.1f}%<extra></extra>",
    ))
    fig.add_vline(x=80,  line_dash="dash", line_color=utils.COLOR_YELLOW, line_width=1.5,
                  annotation_text="80%",  annotation_position="top",
                  annotation_font=dict(size=9, color=utils.COLOR_YELLOW))
    fig.add_vline(x=100, line_dash="dash", line_color=utils.COLOR_GREEN,  line_width=1.5,
                  annotation_text="100%", annotation_position="top",
                  annotation_font=dict(size=9, color=utils.COLOR_GREEN))
    x_max = max(df_a["Atingimento"].max() * 1.3, 130)
    max_label = max((len(str(d)) for d in df_a["Departamento"]), default=8)
    l_margin = max(80, max_label * 7)
    fig.update_layout(
        **_L, title=_TITLE("Atingimento Médio por Setor"),
        showlegend=False,
        xaxis=dict(title="% Atingimento médio", gridcolor="#F0F0F0",
                   ticksuffix="%", range=[0, x_max]),
        yaxis=dict(gridcolor="rgba(0,0,0,0)", tickfont=dict(size=11), automargin=True),
        height=max(280, len(df_a) * 56 + 100),
    )
    fig.update_layout(margin=dict(l=l_margin, r=20, t=44, b=10))
    return fig



# ─── Gráfico: Evolução Mensal do KPI — Barras Executivo ─────────────────────

def chart_evolucao_mensal_kpi(
    df_full: pd.DataFrame,
    sel_setor: str,
    sel_indicador: str,
    unidade: str,
    sentido: str,
    anos_sel: list,
    monthly: pd.DataFrame,
    title: str,
) -> go.Figure:
    """
    Gráfico executivo de barras:
    - Cinza : média mensal de cada ano anterior presente na base
    - Amarelo: média mensal do(s) ano(s) selecionado(s)
    - Verde/Vermelho: realizado mensal do ano máximo selecionado
    - Azul  : barra META (meta mensal média) + linha pontilhada
    - Anotação de desvio % vs ano anterior (só quando existir)
    """
    _ano_f   = lambda x: int(x) if not pd.isna(x) else -1
    ano_atual = max(anos_sel) if anos_sel else 0

    # Todos os anos com dados para este indicador/setor
    df_all    = df_full[
        (df_full["Departamento"] == sel_setor) &
        (df_full["Indicador"]    == sel_indicador)
    ]
    all_years = sorted(set(int(y) for y in df_all["Ano"].dropna().unique()))

    # Média mensal por ano (mesma escala das barras mensais)
    year_avgs: dict = {}
    for yr in all_years:
        grp = df_all[df_all["Ano"].apply(_ano_f) == yr]
        if grp.empty:
            year_avgs[yr] = float("nan")
            continue
        grp_monthly = utils.monthly_evolution_indicator(grp)
        if grp_monthly.empty or grp_monthly["Valor"].isna().all():
            year_avgs[yr] = float("nan")
        else:
            year_avgs[yr] = float(grp_monthly["Valor"].dropna().mean())

    # --- Eixo X e valores ---
    x_labels:   list = []
    y_vals:     list = []
    bar_colors: list = []
    bar_texts:  list = []

    # Barras de médias anuais
    for yr in all_years:
        x_labels.append(f"{yr}<br>Média")
        val = year_avgs.get(yr, float("nan"))
        y_vals.append(val if not pd.isna(val) else 0)
        bar_colors.append(utils.COLOR_YELLOW if yr in anos_sel else "#9E9E9E")
        bar_texts.append(utils.fmt_value(val, unidade) if not pd.isna(val) else "—")

    # Separador visual transparente
    x_labels.append("  ")
    y_vals.append(0)
    bar_colors.append("rgba(0,0,0,0)")
    bar_texts.append("")

    # Barras mensais do ano atual
    monthly_by_mes: dict = {int(r["Mês"]): r for _, r in monthly.iterrows()}
    meta_vals: list = []

    for mes in range(1, 13):
        abbr = utils.MESES_ABBR.get(mes, str(mes)).upper()
        x_labels.append(abbr)
        row = monthly_by_mes.get(mes)
        has_valor = row is not None and not pd.isna(row.get("Valor", float("nan")))
        if has_valor:
            val   = float(row["Valor"])
            ating_raw = row.get("Atingimento", float("nan"))
            ating = float(ating_raw) if not pd.isna(ating_raw) else float("nan")
            color = utils.get_status_color(ating)
            text  = utils.fmt_value(val, unidade)
        else:
            val, color, text = 0, "#E8E8E8", ""
        y_vals.append(val)
        bar_colors.append(color)
        bar_texts.append(text)
        if row is not None and not pd.isna(row.get("Meta", float("nan"))):
            meta_vals.append(float(row["Meta"]))

    # Barra META no final (meta mensal média)
    meta_anual = sum(meta_vals) / len(meta_vals) if meta_vals else float("nan")
    x_labels.append(" META")
    y_vals.append(meta_anual if not pd.isna(meta_anual) else 0)
    bar_colors.append("#1565C0")
    bar_texts.append(utils.fmt_value(meta_anual, unidade) if not pd.isna(meta_anual) else "—")

    # --- Figura ---
    fig = go.Figure()

    fig.add_trace(go.Bar(
        x=x_labels,
        y=y_vals,
        marker_color=bar_colors,
        text=bar_texts,
        textposition="inside",
        textangle=-90,
        insidetextanchor="middle",
        textfont=dict(size=9, color="white"),
        showlegend=False,
        hovertemplate="%{x}: %{text}<extra></extra>",
        cliponaxis=False,
    ))

    # Traces vazios para legenda
    for leg_name, leg_color in [
        ("Dentro da Meta", utils.COLOR_GREEN),
        ("Fora da Meta",   utils.COLOR_RED),
        ("Anos Anteriores","#9E9E9E"),
        ("Média",          utils.COLOR_YELLOW),
    ]:
        fig.add_trace(go.Bar(
            x=[None], y=[None], name=leg_name,
            marker_color=leg_color, showlegend=True,
        ))
    fig.add_trace(go.Scatter(
        x=[None], y=[None], name="Meta",
        mode="lines",
        line=dict(color="#1565C0", width=2, dash="dot"),
        showlegend=True,
    ))

    # Linha pontilhada de meta
    meta_line = sum(meta_vals) / len(meta_vals) if meta_vals else float("nan")
    if not pd.isna(meta_line):
        fig.add_hline(
            y=meta_line,
            line_dash="dot", line_color="#1565C0", line_width=1.5,
            annotation_text=utils.fmt_value(meta_line, unidade),
            annotation_position="top right",
            annotation_font=dict(size=9, color="#1565C0"),
        )

    # Anotações de desvio % acima de cada barra de média anual
    for yr in all_years:
        v_at  = year_avgs.get(yr, float("nan"))
        v_ant = year_avgs.get(yr - 1, float("nan"))
        if not pd.isna(v_at) and not pd.isna(v_ant) and v_ant != 0:
            dev    = (v_at - v_ant) / abs(v_ant) * 100
            prefix = "+" if dev >= 0 else ""
            fig.add_annotation(
                x=f"{yr}<br>Média",
                y=v_at,
                text=f"{prefix}{dev:.2f}%",
                showarrow=True,
                arrowhead=2,
                arrowcolor="#555",
                arrowwidth=1,
                bgcolor="white",
                bordercolor="#555",
                borderwidth=1,
                borderpad=3,
                font=dict(size=9, color="#374151"),
                yshift=24,
                ax=0,
                ay=-28,
            )

    fig.update_layout(
        **_L,
        title=_TITLE(title),
        xaxis=dict(gridcolor="#F0F0F0", tickangle=0),
        yaxis=dict(gridcolor="#F0F0F0"),
        bargap=0.18,
        height=480,
    )
    fig.update_layout(
        margin=dict(l=10, r=80, t=44, b=80),
        legend=dict(orientation="h", y=-0.15, x=0.5, xanchor="center",
                    bgcolor="rgba(0,0,0,0)"),
    )
    return fig


# ─── Gráfico: Ranking de Unidades por Atingimento (por departamento) ──────────

def chart_ranking_unidades_atingimento(
    df_chart: pd.DataFrame, unidade: str, sentido: str, title: str
) -> go.Figure:
    """Barras horizontais de % Atingimento por Unidade — verde/amarelo/vermelho."""
    if df_chart.empty:
        return go.Figure()

    agg_t = utils.get_agg_type(unidade)
    rows: list = []
    for unid, grp in df_chart.groupby("Unidade"):
        if not str(unid).strip():
            continue
        valor, meta = utils._agg_valor_meta(grp, agg_t)
        ating = utils.calc_atingimento(valor, meta, sentido)
        rows.append({"Unidade": unid, "Valor": valor, "Meta": meta, "Atingimento": ating})

    df_rank = (
        pd.DataFrame(rows)
        .dropna(subset=["Atingimento"])
        .sort_values("Atingimento", ascending=True)
        .reset_index(drop=True)
    )
    if df_rank.empty:
        return go.Figure()

    colors = [utils.get_status_color(a) for a in df_rank["Atingimento"]]
    custom = [
        [row["Unidade"],
         utils.fmt_value(row["Valor"], unidade),
         utils.fmt_value(row["Meta"],  unidade),
         utils.fmt_pct(row["Atingimento"])]
        for _, row in df_rank.iterrows()
    ]

    fig = go.Figure(go.Bar(
        x=df_rank["Atingimento"], y=df_rank["Unidade"], orientation="h",
        marker_color=colors,
        text=[f"{utils.fmt_value(r['Valor'], unidade)}  {utils.fmt_pct(r['Atingimento'])}"
              for _, r in df_rank.iterrows()],
        textposition="outside",
        textfont=dict(size=10, color="#374151", weight="bold"),
        hovertemplate=(
            "<b>%{customdata[0]}</b><br>"
            "Realizado: %{customdata[1]}<br>"
            "Meta: %{customdata[2]}<br>"
            "Atingimento: %{customdata[3]}<extra></extra>"
        ),
        customdata=custom,
    ))
    fig.add_vline(x=80,  line_dash="dash", line_color=utils.COLOR_YELLOW, line_width=1.5,
                  annotation_text="80%",  annotation_position="top",
                  annotation_font=dict(size=9, color=utils.COLOR_YELLOW))
    fig.add_vline(x=100, line_dash="dash", line_color=utils.COLOR_GREEN,  line_width=1.5,
                  annotation_text="100%", annotation_position="top",
                  annotation_font=dict(size=9, color=utils.COLOR_GREEN))

    x_max     = max(df_rank["Atingimento"].max() * 1.3, 130)
    max_label = max((len(str(u)) for u in df_rank["Unidade"]), default=10)
    l_margin  = max(120, max_label * 7)

    fig.update_layout(
        **_L, title=_TITLE(title), showlegend=False,
        xaxis=dict(title="% Atingimento", gridcolor="#F0F0F0",
                   ticksuffix="%", range=[0, x_max]),
        yaxis=dict(gridcolor="rgba(0,0,0,0)", tickfont=dict(size=10), automargin=True),
        height=max(300, len(df_rank) * 54 + 90),
    )
    fig.update_layout(margin=dict(l=l_margin, r=140, t=44, b=10))
    return fig


# ─── Sidebar ──────────────────────────────────────────────────────────────────

def render_sidebar(df: pd.DataFrame):
    with st.sidebar:
        logo_orange = _logo_svg("#F47920", size=52)
        st.markdown(f"""
        <div style="text-align:center;padding:1.4rem 0 1.2rem">
            <div style="width:64px;height:64px;background:rgba(255,255,255,0.08);
                        border-radius:14px;display:flex;align-items:center;
                        justify-content:center;margin:0 auto 0.7rem;padding:6px">
                {logo_orange}
            </div>
            <div style="font-size:1.15rem;font-weight:900;color:#fff;letter-spacing:-0.01em">
                <span style="color:#F47920">Loc</span>Express
            </div>
            <div style="font-size:0.78rem;font-style:italic;font-weight:700;
                        color:#F47920;margin-top:1px">Franchising</div>
            <div style="font-size:0.6rem;color:#AABFFF;letter-spacing:0.08em;
                        text-transform:uppercase;margin-top:3px">Locadora de Equipamentos</div>
            <div style="font-size:0.62rem;font-weight:700;color:rgba(255,255,255,0.55);
                        margin-top:5px;letter-spacing:0.05em">NOSSO DNA É LOCAÇÃO!</div>
        </div>
        <hr style="border:none;border-top:1px solid rgba(255,255,255,0.15);margin:0 0 1.2rem">
        <div style="font-size:0.72rem;font-weight:700;letter-spacing:0.07em;
                    text-transform:uppercase;color:#AABFFF;margin-bottom:0.8rem">🔍 Filtros</div>
        """, unsafe_allow_html=True)

        anos        = sorted(df["Ano"].dropna().unique().tolist())
        meses_num   = sorted(df["Mês"].dropna().unique().tolist())
        deptos      = sorted(df["Departamento"].dropna().unique().tolist())
        indicadores = sorted(df["Indicador"].dropna().unique().tolist())

        sel_ano = st.multiselect("Ano",        options=anos,        default=anos,        key="f_ano")
        sel_mes = st.multiselect("Mês",        options=meses_num,   default=meses_num,   key="f_mes",
                                 format_func=lambda m: utils.MESES_PT.get(int(m), str(m)))
        sel_dep = st.multiselect("Setor",      options=deptos,      default=deptos,      key="f_dep")
        sel_ind = st.multiselect("Indicador",  options=indicadores, default=indicadores, key="f_ind")

        st.markdown("<hr style='border:none;border-top:1px solid rgba(255,255,255,0.15);margin:1rem 0'>",
                    unsafe_allow_html=True)
        if st.button("🔄  Atualizar Dados"):
            st.cache_data.clear()
            st.rerun()
        st.markdown(
            "<div style='text-align:center;padding-top:0.6rem;font-size:0.65rem;"
            "color:rgba(255,255,255,0.3)'>Cache renovado a cada 5 min</div>",
            unsafe_allow_html=True)

    return sel_ano, sel_mes, sel_dep, sel_ind


def apply_filters(df, sel_ano, sel_mes, sel_dep, sel_ind) -> pd.DataFrame:
    return df[
        df["Ano"].isin(sel_ano)
        & df["Mês"].isin(sel_mes)
        & df["Departamento"].isin(sel_dep)
        & df["Indicador"].isin(sel_ind)
    ].copy()


# ─── Helper: preenche todos os meses do(s) ano(s) selecionado(s) ─────────────

def _fill_all_months(monthly: pd.DataFrame, sel_ano: list) -> pd.DataFrame:
    """Garante que todos os 12 meses de cada ano selecionado apareçam no gráfico."""
    if not sel_ano:
        return monthly

    anos_sel = sorted(int(a) for a in sel_ano)
    multi_ano = len(anos_sel) > 1
    rows = []
    for ano in anos_sel:
        for mes in range(1, 13):
            existing = monthly[
                (monthly["Ano"].astype(int) == ano) &
                (monthly["Mês"].astype(int) == mes)
            ]
            if not existing.empty:
                row = existing.iloc[0].to_dict()
            else:
                row = {"Ano": ano, "Mês": mes,
                       "Label": utils.MESES_PT.get(mes, str(mes)),
                       "Valor": float("nan"), "Meta": float("nan"),
                       "Atingimento": float("nan")}
            if multi_ano:
                row["Label"] = f"{utils.MESES_ABBR.get(mes, str(mes))}/{ano}"
            rows.append(row)

    return pd.DataFrame(rows).reset_index(drop=True)


# ─── Pill de unidade ──────────────────────────────────────────────────────────

def _unit_pill(unidade: str) -> str:
    cfg = utils.get_unidade_config(unidade)
    color = cfg["color"]
    return (f'<span class="unit-pill" '
            f'style="background:{color}22;color:{color};border:1px solid {color}55">'
            f'{unidade}</span>')


# ─── Página 1: Visão Geral ────────────────────────────────────────────────────

def page_visao_geral(df_f: pd.DataFrame):
    agg = utils.agg_indicators(df_f)
    if agg.empty:
        st.info("Nenhum dado disponível para os filtros selecionados.")
        return

    # Cards de resumo
    render_summary_cards(agg)

    # Linha 1: Tabela Valor Real × Meta × Diferença (largura total)
    fig_tbl = chart_tabela_indicadores(agg)
    if fig_tbl.data:
        st.markdown('<div class="chart-box" style="margin-bottom:0.6rem">', unsafe_allow_html=True)
        st.plotly_chart(fig_tbl, use_container_width=True, config=_CFG)
        st.markdown("</div>", unsafe_allow_html=True)

    # Linha 2: Atingimento por Setor | Ranking de Indicadores
    c1, c2 = st.columns([2, 3])
    with c1:
        fig_setor = chart_atingimento_por_setor(agg)
        if fig_setor.data:
            st.markdown('<div class="chart-box">', unsafe_allow_html=True)
            st.plotly_chart(fig_setor, use_container_width=True, config=_CFG)
            st.markdown("</div>", unsafe_allow_html=True)
    with c2:
        fig_rank = chart_ranking_indicadores(agg, "Ranking de Indicadores — % Atingimento")
        if fig_rank.data:
            st.markdown('<div class="chart-box">', unsafe_allow_html=True)
            st.plotly_chart(fig_rank, use_container_width=True, config=_CFG)
            st.markdown("</div>", unsafe_allow_html=True)


# ─── Página 2: Por Departamento ──────────────────────────────────────────────

def page_por_departamento(df_f: pd.DataFrame, df_full: pd.DataFrame, sel_ano: list):
    setores = sorted(df_f["Departamento"].unique().tolist())
    if not setores:
        st.info("Nenhum setor disponível com os filtros atuais.")
        return

    # ── Seletores em linha ────────────────────────────────────────────────────
    col_s, col_i = st.columns(2)
    with col_s:
        sel_setor = st.selectbox("🏢 Selecionar Setor", options=setores, key="dd_setor")

    df_setor = df_f[df_f["Departamento"] == sel_setor]
    indicadores_do_setor = sorted(df_setor["Indicador"].unique().tolist())
    with col_i:
        sel_indicador = st.selectbox(
            "📊 Selecionar Indicador", options=indicadores_do_setor, key="dd_indicador"
        )

    # ── KPIs: todos os filtros da sidebar ────────────────────────────────────
    df_ind = df_setor[df_setor["Indicador"] == sel_indicador].copy()
    if df_ind.empty:
        st.warning("Sem dados para essa combinação de Setor e Indicador.")
        return

    unidade = df_ind["Unidade_Medida"].iloc[0]
    sentido = df_ind["Sentido_Meta"].iloc[0]

    # ── Gráficos: filtro só por Departamento + Indicador + Ano ───────────────
    anos_int = set(int(a) for a in sel_ano)
    _ano_filter = lambda x: int(x) if not pd.isna(x) else -1

    df_ind_chart = df_full[
        (df_full["Departamento"] == sel_setor) &
        (df_full["Indicador"]    == sel_indicador) &
        (df_full["Ano"].apply(_ano_filter).isin(anos_int))
    ].copy()

    # ── Média histórica (anos anteriores à seleção — para info box) ──────────
    todos_anos      = set(int(a) for a in df_full["Ano"].dropna().unique())
    anos_anteriores = todos_anos - anos_int
    df_ind_hist = df_full[
        (df_full["Departamento"] == sel_setor) &
        (df_full["Indicador"]    == sel_indicador) &
        (df_full["Ano"].apply(_ano_filter).isin(anos_anteriores))
    ].copy()
    hist_avg = utils.avg_across_years(df_ind_hist)

    # ── Info box ─────────────────────────────────────────────────────────────
    sentido_desc = ("⬇ Menor é Melhor — quanto menos, melhor"
                    if utils.is_sentido_menor(sentido)
                    else "⬆ Maior é Melhor — quanto mais, melhor")
    hist_txt = ""
    if not pd.isna(hist_avg):
        hist_txt = (f' &nbsp;|&nbsp; <span style="font-size:0.75rem;color:#2D3192">'
                    f'Média anos ant.: <strong>{utils.fmt_value(hist_avg, unidade)}</strong></span>')

    st.markdown(
        f'<div class="info-box" style="margin-bottom:0.8rem">'
        f'<strong>{sel_setor} › {sel_indicador}</strong> &nbsp; '
        f'{_unit_pill(unidade)} &nbsp; '
        f'<span style="font-size:0.78rem;color:#6B7280">{sentido_desc}</span>'
        f'{hist_txt}'
        f'</div>',
        unsafe_allow_html=True,
    )

    # ── KPI Cards ─────────────────────────────────────────────────────────────
    kpis = utils.kpis_for_indicator(df_ind)
    render_kpi_cards_indicator(kpis)

    # ── Dados mensais: apenas o ano máximo selecionado ────────────────────────
    ano_chart  = max(anos_int)
    df_mes_ano = df_full[
        (df_full["Departamento"] == sel_setor) &
        (df_full["Indicador"]    == sel_indicador) &
        (df_full["Ano"].apply(_ano_filter) == ano_chart)
    ].copy()
    monthly = utils.monthly_evolution_indicator(df_mes_ano)
    monthly = _fill_all_months(monthly, [ano_chart])

    # ── Gráfico 1: Evolução Mensal — barras executivo ─────────────────────────
    st.markdown('<div class="chart-box" style="margin-bottom:0.6rem">', unsafe_allow_html=True)
    st.plotly_chart(
        chart_evolucao_mensal_kpi(
            df_full, sel_setor, sel_indicador,
            unidade, sentido, sorted(anos_int),
            monthly,
            f"Evolução Mensal — {sel_indicador}",
        ),
        use_container_width=True, config=_CFG,
    )
    st.markdown("</div>", unsafe_allow_html=True)

    # ── Gráfico 2: Ranking de Unidades por Atingimento (largura total) ────────
    fig_rank_u = chart_ranking_unidades_atingimento(
        df_ind_chart, unidade, sentido,
        f"Ranking de Unidades — {sel_indicador}",
    )
    if fig_rank_u.data:
        st.markdown('<div class="chart-box" style="margin-bottom:0.6rem">', unsafe_allow_html=True)
        st.plotly_chart(fig_rank_u, use_container_width=True, config=_CFG)
        st.markdown("</div>", unsafe_allow_html=True)

    # ── Tabela detalhada ──────────────────────────────────────────────────────
    st.markdown(
        f'<div class="sec-header">📋 Registros — {sel_setor} › {sel_indicador}</div>',
        unsafe_allow_html=True,
    )
    show_cols = [c for c in ["Data", "MêsNome", "Valor", "Meta"] if c in df_ind.columns]
    df_show = df_ind[show_cols].copy()
    df_show.rename(columns={"MêsNome": "Mês"}, inplace=True)
    df_show["Valor (fmt)"] = df_ind["Valor"].apply(lambda v: utils.fmt_value(v, unidade))
    df_show["Meta (fmt)"]  = df_ind["Meta"].apply(lambda v: utils.fmt_value(v, unidade))
    df_show["Atingimento"] = df_ind.apply(
        lambda r: utils.fmt_pct(utils.calc_atingimento(r["Valor"], r["Meta"], sentido)),
        axis=1,
    )
    df_show["Status"] = df_ind.apply(
        lambda r: (
            f"{utils.get_status_icon(utils.calc_atingimento(r['Valor'], r['Meta'], sentido))} "
            f"{utils.get_status_label(utils.calc_atingimento(r['Valor'], r['Meta'], sentido))}"
        ),
        axis=1,
    )
    df_show.drop(columns=["Valor", "Meta"], errors="ignore", inplace=True)
    st.dataframe(df_show, use_container_width=True, hide_index=True)


# ─── Gauge chart (único período) ─────────────────────────────────────────────

def _gauge_chart(ating, indicador: str) -> go.Figure:
    val   = float(ating) if not pd.isna(ating) else 0.0
    color = utils.get_status_color(ating)
    fig = go.Figure(go.Indicator(
        mode="gauge+number+delta",
        value=val,
        number={"suffix": "%", "font": {"size": 36, "color": color, "family": "Inter"}},
        delta={"reference": 100, "suffix": "%",
               "increasing": {"color": utils.COLOR_GREEN},
               "decreasing": {"color": utils.COLOR_RED}},
        gauge={
            "axis": {"range": [0, 150], "tickwidth": 1, "tickcolor": "#E5E7EB"},
            "bar":  {"color": color, "thickness": 0.28},
            "bgcolor": "#F3F4F6",
            "bordercolor": "#E5E7EB",
            "steps": [
                {"range": [0,  80],  "color": "#FEE2E2"},
                {"range": [80, 100], "color": "#FEF3C7"},
                {"range": [100, 150],"color": "#D1FAE5"},
            ],
            "threshold": {
                "line": {"color": utils.COLOR_INDIGO, "width": 3},
                "thickness": 0.8, "value": 100,
            },
        },
        title={"text": f"% Atingimento<br><span style='font-size:0.75rem'>{indicador}</span>",
               "font": {"size": 13, "color": utils.COLOR_INDIGO}},
    ))
    fig.update_layout(
        paper_bgcolor="rgba(0,0,0,0)",
        font=dict(family="Inter, sans-serif"),
        margin=dict(l=20, r=20, t=60, b=20),
        height=260,
    )
    return fig


# ─── Main ─────────────────────────────────────────────────────────────────────

def main():
    inject_css()

    with st.spinner("Carregando dados da planilha..."):
        df, error = utils.load_data()

    if error:
        st.error(f"❌ **Erro ao carregar os dados**\n\n{error}")
        st.markdown("""
        **💡 Como resolver:**
        - A planilha deve estar publicada em *Arquivo → Compartilhar → Publicar na web → CSV*
        - Confirme que a aba se chama `base_indicadores`
        - Colunas obrigatórias: `Data`, `Indicador`, `Meta`
        - Colunas opcionais detectadas automaticamente: `Setor`, `Unidade_Medida`, `Sentido_Meta`, `Valor`
        """)
        if st.button("🔄 Tentar Novamente"):
            st.cache_data.clear()
            st.rerun()
        st.stop()

    sel_ano, sel_mes, sel_dep, sel_ind = render_sidebar(df)
    df_f = apply_filters(df, sel_ano, sel_mes, sel_dep, sel_ind)

    render_header(len(df_f), len(df))

    if df_f.empty:
        st.warning("⚠️ Nenhum dado encontrado para os filtros selecionados.")
        st.stop()

    # Aviso quando nenhum valor foi lançado
    if df_f["Valor"].isna().all():
        st.markdown(
            '<div class="info-box">ℹ️ <strong>Valores realizados ainda não lançados.</strong> '
            'Preencha a coluna <strong>Valor</strong> na planilha para ver o atingimento. '
            'As metas já estão carregadas e os gráficos serão atualizados automaticamente.</div>',
            unsafe_allow_html=True,
        )
        st.markdown("<div style='margin-top:0.8rem'></div>", unsafe_allow_html=True)

    tab_geral, tab_depto, tab_sge = st.tabs(["📊  Visão Geral", "🏢  Por Departamento", "🔍  Diagnóstico SGE"])
    with tab_geral:
        page_visao_geral(df_f)
    with tab_depto:
        page_por_departamento(df_f, df, sel_ano)
    with tab_sge:
        page_diagnostico_sge()


if __name__ == "__main__":
    main()
