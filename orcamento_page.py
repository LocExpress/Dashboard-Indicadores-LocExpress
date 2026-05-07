"""
orcamento_page.py — Módulo de Orçamento BI | LocExpress Franchising
Estrutura analítica: meses em linhas, Orçado × Realizado separados por Tipo_Valor.
"""

import re
import streamlit as st
import pandas as pd
import plotly.graph_objects as go

import utils

# ─── URL da Base de Orçamento ─────────────────────────────────────────────────
# Publique a aba 'base_orcamento_bi' no Google Sheets como CSV e cole a URL aqui.
# Arquivo → Compartilhar → Publicar na web → Selecionar aba → CSV → Publicar
ORCAMENTO_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vR8iI90QwsF9tUR0z8VATAKDyv8B2vf6tNJ87HaDF9sT8uibM9-t1XX58IaQ6tcXhYV3TFWQVD19CiQ/pub?gid=615632484&single=true&output=csv"

# ─── Colunas obrigatórias ─────────────────────────────────────────────────────
_REQUIRED = {"Data", "Ano", "Mês", "Área", "Categoria", "Empresa", "Tipo_Valor", "Valor"}

# ─── Paleta LocExpress ────────────────────────────────────────────────────────
C_BLUE   = "#003087"
C_ORANGE = "#F47920"
C_GREEN  = "#00C853"
C_YELLOW = "#FFB300"
C_RED    = "#F44336"
C_GRAY   = "#F3F4F6"

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


def _title(text: str) -> dict:
    return dict(text=text, font=dict(size=13, color=C_BLUE, weight="bold"), x=0.01)


# ─── Limpeza de valor em formato brasileiro ───────────────────────────────────

def _clean_brl(val) -> float:
    """Converte 'R$ 1.500,00' | '1500,00' | '1500.00' → float. Vazio → NaN."""
    if pd.isna(val):
        return float("nan")
    s = str(val).strip()
    if s in ("", "-", "n/a", "N/A", "nan", "None"):
        return float("nan")
    s = re.sub(r"[R$\s]", "", s).strip()
    if "," in s and "." in s:
        s = s.replace(".", "").replace(",", ".")
    elif "," in s:
        s = s.replace(",", ".")
    try:
        return float(s)
    except ValueError:
        return float("nan")


# ─── Formatação ───────────────────────────────────────────────────────────────

def _fmt_brl(value) -> str:
    if pd.isna(value):
        return "R$ 0,00"
    v = float(value)
    if abs(v) >= 1_000_000:
        return f"R$ {v / 1_000_000:.2f}M".replace(".", ",")
    if abs(v) >= 1_000:
        fmt = f"{abs(v):,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")
        return f"{'−' if v < 0 else ''}R$ {fmt}"
    sign = "−" if v < 0 else ""
    return f"{sign}R$ {abs(v):.2f}".replace(".", ",")


def _fmt_pct(value) -> str:
    if pd.isna(value):
        return "—"
    return f"{float(value):.1f}%"


def _kpi_card(label: str, value: str, color: str, sub: str = "") -> str:
    sub_html = f"<div class='kpi-status' style='color:{color}'>{sub}</div>" if sub else ""
    return (
        f'<div class="kpi-card" style="border-left-color:{color}">'
        f'<div class="kpi-label">{label}</div>'
        f'<div class="kpi-value" style="color:{color}">{value}</div>'
        f'{sub_html}</div>'
    )


# ─── Carregamento de Dados ────────────────────────────────────────────────────

@st.cache_data(ttl=300, show_spinner=False)
def load_orcamento():
    """
    Carrega e normaliza a base de orçamento BI.
    Retorna (DataFrame, None) ou (None, mensagem_de_erro).
    """
    if not ORCAMENTO_URL:
        return None, (
            "URL da planilha de orçamento não configurada.\n\n"
            "Atualize a variável `ORCAMENTO_URL` em `orcamento_page.py` com a URL CSV "
            "gerada ao publicar a aba `base_orcamento_bi` no Google Sheets."
        )

    try:
        df = pd.read_csv(ORCAMENTO_URL)
    except Exception as exc:
        return None, f"Não foi possível conectar à planilha de orçamento.\n\nDetalhe: {exc}"

    df.columns = [c.strip() for c in df.columns]

    if df.empty:
        return None, "A base de orçamento está vazia."

    missing = _REQUIRED - set(df.columns)
    if missing:
        lista = ", ".join(f"`{c}`" for c in sorted(missing))
        return None, f"Colunas ausentes na base: {lista}"

    # Data → datetime
    df["Data"] = pd.to_datetime(df["Data"], dayfirst=True, errors="coerce")

    # Ano e Mês: preferir coluna explícita, fallback para Data
    df["Ano"] = pd.to_numeric(df["Ano"], errors="coerce").fillna(df["Data"].dt.year).astype("Int64")
    df["Mês"] = pd.to_numeric(df["Mês"], errors="coerce").fillna(df["Data"].dt.month).astype("Int64")

    # Valor com suporte a formato BR (R$, ponto, vírgula)
    df["Valor"] = df["Valor"].apply(_clean_brl)

    # Strings obrigatórias
    for col in ("Área", "Categoria", "Empresa", "Tipo_Valor"):
        df[col] = df[col].fillna("").astype(str).str.strip()

    # Justificativa opcional
    if "Justificativa_ROI" not in df.columns:
        df["Justificativa_ROI"] = ""
    df["Justificativa_ROI"] = df["Justificativa_ROI"].fillna("").astype(str).str.strip()

    df["MêsNome"] = df["Mês"].map(utils.MESES_PT).fillna(df["Mês"].astype(str))

    return df, None


# ─── Gráficos ─────────────────────────────────────────────────────────────────

def _chart_orc_real_mensal(df_m: pd.DataFrame) -> go.Figure:
    """Barras agrupadas Orçado × Realizado por mês."""
    fig = go.Figure()
    fig.add_trace(go.Bar(
        name="Orçado", x=df_m["Label"], y=df_m["Orçado"],
        marker_color=C_BLUE, opacity=0.85,
        text=[_fmt_brl(v) for v in df_m["Orçado"]],
        textposition="outside", textfont=dict(size=8, color=C_BLUE),
        hovertemplate="%{x}<br>Orçado: %{text}<extra></extra>",
    ))
    fig.add_trace(go.Bar(
        name="Realizado", x=df_m["Label"], y=df_m["Realizado"],
        marker_color=C_ORANGE, opacity=0.9,
        text=[_fmt_brl(v) for v in df_m["Realizado"]],
        textposition="outside", textfont=dict(size=8, color=C_ORANGE),
        hovertemplate="%{x}<br>Realizado: %{text}<extra></extra>",
    ))
    fig.update_layout(
        **_L, title=_title("Orçado × Realizado por Mês"),
        barmode="group", bargap=0.22, bargroupgap=0.05,
        xaxis=dict(gridcolor="#F0F0F0"),
        yaxis=dict(gridcolor="#F0F0F0"),
    )
    return fig


def _chart_orc_real_area(df_a: pd.DataFrame) -> go.Figure:
    """Barras agrupadas Orçado × Realizado por área."""
    tick_angle = -20 if len(df_a) > 4 else 0
    fig = go.Figure()
    fig.add_trace(go.Bar(
        name="Orçado", x=df_a["Área"], y=df_a["Orçado"],
        marker_color=C_BLUE, opacity=0.85,
        text=[_fmt_brl(v) for v in df_a["Orçado"]],
        textposition="outside", textfont=dict(size=8, color=C_BLUE),
        hovertemplate="%{x}<br>Orçado: %{text}<extra></extra>",
    ))
    fig.add_trace(go.Bar(
        name="Realizado", x=df_a["Área"], y=df_a["Realizado"],
        marker_color=C_ORANGE, opacity=0.9,
        text=[_fmt_brl(v) for v in df_a["Realizado"]],
        textposition="outside", textfont=dict(size=8, color=C_ORANGE),
        hovertemplate="%{x}<br>Realizado: %{text}<extra></extra>",
    ))
    fig.update_layout(
        **_L, title=_title("Orçado × Realizado por Área"),
        barmode="group", bargap=0.22, bargroupgap=0.05,
        xaxis=dict(gridcolor="#F0F0F0", tickangle=tick_angle),
        yaxis=dict(gridcolor="#F0F0F0"),
    )
    return fig


def _chart_desvio_area(df_a: pd.DataFrame) -> go.Figure:
    """Barras horizontais de desvio (Realizado − Orçado) por área."""
    df_s = df_a.sort_values("Desvio").reset_index(drop=True)
    colors = [C_GREEN if v <= 0 else C_RED for v in df_s["Desvio"]]
    fig = go.Figure(go.Bar(
        x=df_s["Desvio"], y=df_s["Área"], orientation="h",
        marker_color=colors,
        text=[_fmt_brl(v) for v in df_s["Desvio"]],
        textposition="outside",
        textfont=dict(size=10, color="#374151", weight="bold"),
        hovertemplate="%{y}<br>Desvio: %{text}<extra></extra>",
    ))
    fig.add_vline(x=0, line_color="#374151", line_width=1)
    fig.update_layout(
        **_L, title=_title("Desvio por Área (Realizado − Orçado)"),
        showlegend=False,
        xaxis=dict(gridcolor="#F0F0F0"),
        yaxis=dict(gridcolor="rgba(0,0,0,0)", automargin=True),
        height=max(280, len(df_s) * 54 + 90),
    )
    return fig


def _chart_evolucao_mensal(df_m: pd.DataFrame) -> go.Figure:
    """Linha de evolução mensal Orçado × Realizado com área preenchida."""
    fig = go.Figure()
    fig.add_trace(go.Scatter(
        x=df_m["Label"], y=df_m["Orçado"],
        name="Orçado", mode="lines+markers",
        line=dict(color=C_BLUE, width=2, dash="dot"),
        marker=dict(size=7, color=C_BLUE),
        text=[_fmt_brl(v) for v in df_m["Orçado"]],
        hovertemplate="%{x}<br>Orçado: %{text}<extra></extra>",
    ))
    fig.add_trace(go.Scatter(
        x=df_m["Label"], y=df_m["Realizado"],
        name="Realizado", mode="lines+markers+text",
        line=dict(color=C_ORANGE, width=3),
        marker=dict(size=9, color=C_ORANGE, line=dict(color=C_BLUE, width=2)),
        fill="tonexty", fillcolor="rgba(244,121,32,0.10)",
        text=[_fmt_brl(v) if v > 0 else "" for v in df_m["Realizado"]],
        textposition="top center",
        textfont=dict(size=9, color=C_ORANGE, weight="bold"),
        hovertemplate="%{x}<br>Realizado: %{text}<extra></extra>",
    ))
    fig.update_layout(
        **_L, title=_title("Evolução Mensal do Orçamento"),
        xaxis=dict(gridcolor="#F0F0F0"),
        yaxis=dict(gridcolor="#F0F0F0"),
        hovermode="x unified",
    )
    return fig


# ─── Helpers de agrupamento ───────────────────────────────────────────────────

def _grp_mensal(df: pd.DataFrame, tipo: str) -> pd.DataFrame:
    sub = df[df["Tipo_Valor"] == tipo]
    if sub.empty:
        return pd.DataFrame(columns=["Ano", "Mês", "MêsNome", "Valor"])
    return sub.groupby(["Ano", "Mês", "MêsNome"], as_index=False)["Valor"].sum()


def _grp_area(df: pd.DataFrame, tipo: str) -> pd.DataFrame:
    sub = df[df["Tipo_Valor"] == tipo]
    if sub.empty:
        return pd.DataFrame(columns=["Área", "Valor"])
    return sub.groupby("Área", as_index=False)["Valor"].sum()


def _build_monthly(df_f: pd.DataFrame) -> pd.DataFrame:
    """Pivô mensal com Orçado e Realizado — robusto a ausência de qualquer tipo."""
    orc_m  = _grp_mensal(df_f, "Orçado")
    real_m = _grp_mensal(df_f, "Realizado")

    keys = pd.concat(
        [orc_m[["Ano", "Mês", "MêsNome"]], real_m[["Ano", "Mês", "MêsNome"]]]
    ).drop_duplicates()

    df_m = (
        keys
        .merge(orc_m.rename(columns={"Valor": "Orçado"}),  on=["Ano", "Mês", "MêsNome"], how="left")
        .merge(real_m.rename(columns={"Valor": "Realizado"}), on=["Ano", "Mês", "MêsNome"], how="left")
        .sort_values(["Ano", "Mês"])
        .reset_index(drop=True)
    )
    df_m["Orçado"]    = df_m["Orçado"].fillna(0.0)
    df_m["Realizado"] = df_m["Realizado"].fillna(0.0)

    multi = df_m["Ano"].nunique() > 1
    df_m["Label"] = df_m.apply(
        lambda r: (
            f"{utils.MESES_ABBR.get(int(r['Mês']), str(r['Mês']))}/{int(r['Ano'])}"
            if multi else str(r["MêsNome"])
        ), axis=1,
    )
    return df_m


def _build_area(df_f: pd.DataFrame) -> pd.DataFrame:
    """Pivô por área com Orçado e Realizado."""
    orc_a  = _grp_area(df_f, "Orçado")
    real_a = _grp_area(df_f, "Realizado")

    all_areas = pd.Series(
        list(set(orc_a["Área"].tolist() + real_a["Área"].tolist())), name="Área"
    ).to_frame()

    df_a = (
        all_areas
        .merge(orc_a.rename(columns={"Valor": "Orçado"}),    on="Área", how="left")
        .merge(real_a.rename(columns={"Valor": "Realizado"}), on="Área", how="left")
    )
    df_a["Orçado"]    = df_a["Orçado"].fillna(0.0)
    df_a["Realizado"] = df_a["Realizado"].fillna(0.0)
    df_a["Desvio"]    = df_a["Realizado"] - df_a["Orçado"]
    return df_a


# ─── Página principal ─────────────────────────────────────────────────────────

def page_orcamento():
    st.markdown('<div class="sec-header">💰 Orçamento Setorial BI</div>', unsafe_allow_html=True)

    with st.spinner("Carregando base de orçamento..."):
        df, error = load_orcamento()

    if error:
        st.error(f"❌ **Erro ao carregar orçamento**\n\n{error}")
        st.markdown("""
**💡 Como configurar:**
1. Abra a planilha de orçamento no Google Sheets
2. Vá em **Arquivo → Compartilhar → Publicar na web**
3. Selecione a aba **`base_orcamento_bi`** e o formato **CSV**
4. Clique em **Publicar** e copie a URL gerada
5. Cole a URL na variável `ORCAMENTO_URL` no arquivo `orcamento_page.py`

**Colunas obrigatórias:** `Data`, `Ano`, `Mês`, `Área`, `Categoria`, `Empresa`, `Tipo_Valor`, `Valor`

**Valores aceitos em `Tipo_Valor`:** `Orçado` | `Realizado`
        """)
        if st.button("🔄 Tentar Novamente", key="orc_retry"):
            st.cache_data.clear()
            st.rerun()
        return

    # ─── Filtros (dentro da aba, não polui a sidebar) ─────────────────────────
    anos     = sorted(df["Ano"].dropna().unique().tolist())
    meses    = sorted(df["Mês"].dropna().unique().tolist())
    areas    = sorted(a for a in df["Área"].unique() if a)
    cats     = sorted(c for c in df["Categoria"].unique() if c)
    empresas = sorted(e for e in df["Empresa"].unique() if e)
    tipos    = sorted(t for t in df["Tipo_Valor"].unique() if t)

    with st.expander("🔍 Filtros do Orçamento", expanded=True):
        fc1, fc2, fc3 = st.columns(3)
        fc4, fc5, fc6 = st.columns(3)
        with fc1:
            sel_ano = st.multiselect("Ano", anos, default=anos, key="orc_ano")
        with fc2:
            sel_mes = st.multiselect(
                "Mês", meses, default=meses, key="orc_mes",
                format_func=lambda m: utils.MESES_PT.get(int(m), str(m)),
            )
        with fc3:
            sel_area = st.multiselect("Área", areas, default=areas, key="orc_area")
        with fc4:
            sel_cat = st.multiselect("Categoria", cats, default=cats, key="orc_cat")
        with fc5:
            sel_emp = st.multiselect("Empresa", empresas, default=empresas, key="orc_emp")
        with fc6:
            sel_tipo = st.multiselect("Tipo de Valor", tipos, default=tipos, key="orc_tipo")

    # Aplicar filtros
    if not sel_ano or not sel_mes or not sel_area or not sel_cat or not sel_emp or not sel_tipo:
        st.warning("⚠️ Selecione ao menos uma opção em cada filtro.")
        return

    df_f = df[
        df["Ano"].isin(sel_ano)
        & df["Mês"].isin(sel_mes)
        & df["Área"].isin(sel_area)
        & df["Categoria"].isin(sel_cat)
        & df["Empresa"].isin(sel_emp)
        & df["Tipo_Valor"].isin(sel_tipo)
    ].copy()

    if df_f.empty:
        st.warning("⚠️ Nenhum registro encontrado para os filtros selecionados.")
        return

    # ─── Totais ───────────────────────────────────────────────────────────────
    orc  = df_f[df_f["Tipo_Valor"] == "Orçado"]["Valor"].sum()
    real = (
        df_f[df_f["Tipo_Valor"] == "Realizado"]["Valor"].sum()
        if "Realizado" in df_f["Tipo_Valor"].values
        else 0.0
    )
    orc  = 0.0 if pd.isna(orc)  else float(orc)
    real = 0.0 if pd.isna(real) else float(real)

    desvio_brl = real - orc
    desvio_pct = (desvio_brl / orc * 100) if orc != 0 else float("nan")
    execucao   = (real / orc * 100)        if orc != 0 else float("nan")

    # ─── Aviso: sem Realizado lançado ────────────────────────────────────────
    if real == 0 and "Realizado" not in df_f["Tipo_Valor"].values:
        st.markdown(
            '<div class="info-box">ℹ️ <strong>Realizado ainda não lançado.</strong> '
            "O dashboard está operando apenas com dados de Orçado. "
            "Os gráficos serão atualizados automaticamente quando o Realizado for inserido.</div>",
            unsafe_allow_html=True,
        )
        st.markdown("<div style='margin-top:0.6rem'></div>", unsafe_allow_html=True)

    # ─── KPI Cards ───────────────────────────────────────────────────────────
    st.markdown("<div style='margin-top:0.6rem'></div>", unsafe_allow_html=True)
    k1, k2, k3, k4, k5 = st.columns(5)

    with k1:
        st.markdown(_kpi_card("💰 Orçado Total", _fmt_brl(orc), C_BLUE), unsafe_allow_html=True)
    with k2:
        r_color = C_GRAY if real == 0 else (C_GREEN if real <= orc else C_RED)
        st.markdown(_kpi_card("✅ Realizado Total", _fmt_brl(real), r_color,
                              "Sem lançamento" if real == 0 else ""), unsafe_allow_html=True)
    with k3:
        d_color = C_GRAY if real == 0 else (C_GREEN if desvio_brl <= 0 else C_RED)
        st.markdown(_kpi_card("📉 Desvio R$", _fmt_brl(desvio_brl), d_color,
                              "Realizado − Orçado"), unsafe_allow_html=True)
    with k4:
        p_color = C_GRAY if pd.isna(desvio_pct) else (C_GREEN if desvio_pct <= 0 else C_RED)
        st.markdown(_kpi_card("📊 Desvio %", _fmt_pct(desvio_pct), p_color,
                              "Desvio / Orçado"), unsafe_allow_html=True)
    with k5:
        e_color = C_GRAY if pd.isna(execucao) else (C_GREEN if execucao <= 100 else C_RED)
        st.markdown(_kpi_card("🎯 % Execução", _fmt_pct(execucao), e_color,
                              "Realizado / Orçado"), unsafe_allow_html=True)

    st.markdown("<div style='margin-top:1.2rem'></div>", unsafe_allow_html=True)

    # ─── Agregações ───────────────────────────────────────────────────────────
    df_monthly = _build_monthly(df_f)
    df_area    = _build_area(df_f)

    # ─── Gráficos — linha 1 ───────────────────────────────────────────────────
    g1, g2 = st.columns(2)
    with g1:
        st.markdown('<div class="chart-box">', unsafe_allow_html=True)
        st.plotly_chart(_chart_orc_real_mensal(df_monthly), use_container_width=True, config=_CFG)
        st.markdown("</div>", unsafe_allow_html=True)
    with g2:
        st.markdown('<div class="chart-box">', unsafe_allow_html=True)
        st.plotly_chart(_chart_orc_real_area(df_area), use_container_width=True, config=_CFG)
        st.markdown("</div>", unsafe_allow_html=True)

    # ─── Gráficos — linha 2 ───────────────────────────────────────────────────
    g3, g4 = st.columns(2)
    with g3:
        st.markdown('<div class="chart-box">', unsafe_allow_html=True)
        st.plotly_chart(_chart_desvio_area(df_area), use_container_width=True, config=_CFG)
        st.markdown("</div>", unsafe_allow_html=True)
    with g4:
        st.markdown('<div class="chart-box">', unsafe_allow_html=True)
        st.plotly_chart(_chart_evolucao_mensal(df_monthly), use_container_width=True, config=_CFG)
        st.markdown("</div>", unsafe_allow_html=True)

    # ─── Tabela detalhada ─────────────────────────────────────────────────────
    st.markdown("<div style='margin-top:0.4rem'></div>", unsafe_allow_html=True)
    st.markdown('<div class="sec-header">📋 Registros Detalhados</div>', unsafe_allow_html=True)

    df_show = df_f.copy()
    df_show["Valor (R$)"] = df_show["Valor"].apply(_fmt_brl)
    df_show = df_show.rename(columns={"MêsNome": "Mês"})
    df_show["Data"] = df_show["Data"].apply(
        lambda x: x.strftime("%d/%m/%Y") if pd.notna(x) else ""
    )

    show_cols = [c for c in [
        "Data", "Ano", "Mês", "Área", "Categoria",
        "Empresa", "Tipo_Valor", "Valor (R$)", "Justificativa_ROI",
    ] if c in df_show.columns]

    st.dataframe(df_show[show_cols], use_container_width=True, hide_index=True)

    st.markdown("<div style='margin-top:0.5rem'></div>", unsafe_allow_html=True)
    if st.button("🔄 Atualizar Base de Orçamento", key="orc_refresh"):
        st.cache_data.clear()
        st.rerun()
