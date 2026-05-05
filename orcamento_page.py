"""
orcamento_page.py — Aba Orçamento por Setor para o Dashboard LocExpress
"""

import streamlit as st
import pandas as pd
import plotly.graph_objects as go
import requests
import io
import unicodedata
import re

ORC_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vR8iI90QwsF9tUR0z8VATAKDyv8B2vf6tNJ87HaDF9sT8uibM9-t1XX58IaQ6tcXhYV3TFWQVD19CiQ/pub?gid=615632484&single=true&output=csv"

C_BLUE   = "#2D3192"
C_ORANGE = "#F47920"
C_GREEN  = "#00C853"
C_YELLOW = "#FFB300"
C_RED    = "#F44336"
C_GRAY   = "#6B7280"

MESES_COLS = ["Jan","Fev","Mar","Abril","Maio","Junho",
              "Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"]
MESES_ABBR = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"]

def _norm(s):
    return unicodedata.normalize("NFD", str(s).upper()).encode("ascii","ignore").decode("ascii").strip()

def _parse_brl(v):
    """Converte 'R$17.944,04' ou '17091' ou '5.574,00' para float."""
    if pd.isna(v): return 0.0
    s = str(v).strip()
    if s in ("", "-", "nan", "None"): return 0.0
    s = s.replace("R$","").replace(" ","")
    # formato BR: 17.944,04
    if "," in s and "." in s:
        s = s.replace(".","").replace(",",".")
    elif "," in s:
        s = s.replace(",",".")
    # remove pontos restantes que sejam separador de milhar
    s = re.sub(r'\.(?=\d{3}(?:[^\d]|$))', '', s)
    try: return float(s)
    except: return 0.0

@st.cache_data(ttl=300, show_spinner=False)
def load_orc_data():
    try:
        r = requests.get(ORC_URL, timeout=15)
        r.raise_for_status()
        r.encoding = "utf-8"
        df = pd.read_csv(io.StringIO(r.text))
        df.columns = [str(c).strip() for c in df.columns]
        return df, None
    except Exception as exc:
        return None, str(exc)

def _process(df_raw):
    """Normaliza e processa a planilha de orçamento."""
    df = df_raw.copy()

    # Detectar colunas
    col_cat  = next((c for c in df.columns if _norm(c) in ("CATEGORIA","SETOR")), df.columns[0])
    col_item = next((c for c in df.columns if "ITEM" in _norm(c) or "DESPESA" in _norm(c)), df.columns[1])
    col_emp  = next((c for c in df.columns if "EMPRESA" in _norm(c) or "EMIT" in _norm(c)), None)
    col_just = next((c for c in df.columns if "JUSTIF" in _norm(c) or "ROI" in _norm(c)), None)
    col_total= next((c for c in df.columns if "TOTAL" in _norm(c) and "ANUAL" in _norm(c)), None)

    # Colunas de meses — detecta pelos nomes
    mes_map = {}
    for c in df.columns:
        cn = _norm(c)
        for i, m in enumerate(["JAN","FEV","MAR","ABR","ABRIL","MAI","MAIO","JUN","JUNHO",
                                "JUL","JULHO","AGO","AGOSTO","SET","SETEMBRO",
                                "OUT","OUTUBRO","NOV","NOVEMBRO","DEZ","DEZEMBRO"]):
            if cn.startswith(m):
                idx = [0,1,2,3,3,4,4,5,5,6,6,7,7,8,8,9,9,10,10,11,11][i]
                if idx not in mes_map:
                    mes_map[idx] = c
                break

    # Preenche categoria (forward fill)
    df[col_cat] = df[col_cat].replace("", pd.NA).ffill()
    df = df.dropna(subset=[col_cat])
    df = df[df[col_cat].astype(str).str.strip() != ""]

    # Remove linhas de totais/cabeçalhos internos
    df = df[~df[col_cat].astype(str).str.upper().str.contains("TOTAL|HEADER|MÊS|EMPRESA|FATURAMENTO")]
    df = df[df[col_item].notna() & (df[col_item].astype(str).str.strip() != "")]

    rows = []
    for _, r in df.iterrows():
        cat  = str(r[col_cat]).strip().title()
        item = str(r[col_item]).strip()
        emp  = str(r[col_emp]).strip() if col_emp else ""
        just = str(r[col_just]).strip() if col_just else ""
        total_anual = _parse_brl(r[col_total]) if col_total else 0.0

        mensal = {}
        for idx, col in mes_map.items():
            mensal[idx] = _parse_brl(r[col])

        # Se total não veio da planilha, calcula
        if total_anual == 0.0:
            total_anual = sum(mensal.values())

        if total_anual == 0.0 and all(v == 0 for v in mensal.values()):
            continue

        row = {"Categoria": cat, "Item": item, "Empresa": emp,
               "Justificativa": just, "Total_Anual": total_anual}
        for i in range(12):
            row[MESES_ABBR[i]] = mensal.get(i, 0.0)
        rows.append(row)

    return pd.DataFrame(rows) if rows else pd.DataFrame()


def page_orcamento():
    st.markdown("""
    <style>
    .orc-header { font-size:0.9rem; font-weight:700; color:#2D3192;
        border-bottom:2.5px solid #F47920; padding-bottom:0.3rem; margin:1rem 0 0.6rem; }
    .orc-card { background:#fff; border-radius:12px; padding:1rem 1.2rem;
        box-shadow:0 2px 12px rgba(0,0,0,0.07); text-align:center; }
    </style>
    """, unsafe_allow_html=True)

    st.markdown("""
    <div style='background:linear-gradient(135deg,#2D3192 0%,#F47920 100%);
                border-radius:12px;padding:1.2rem 1.8rem;margin-bottom:1.2rem;color:#fff;'>
        <div style='font-size:1.3rem;font-weight:900'>💰 Orçamento por Setor</div>
        <div style='font-size:0.85rem;opacity:0.88;margin-top:4px'>
            Previsão orçamentária 2026 — Valores por categoria, item e mês
        </div>
    </div>
    """, unsafe_allow_html=True)

    with st.spinner("Carregando orçamento..."):
        df_raw, err = load_orc_data()

    if err or df_raw is None:
        st.error(f"❌ Erro ao carregar orçamento: {err}")
        if st.button("🔄 Tentar Novamente", key="orc_retry"):
            st.cache_data.clear()
            st.rerun()
        return

    df = _process(df_raw)
    if df.empty:
        st.warning("⚠️ Nenhum dado de orçamento encontrado.")
        return

    categorias = sorted(df["Categoria"].unique().tolist())

    # ── Filtros ──────────────────────────────────────────────────────────────
    fc1, fc2 = st.columns([2,1])
    with fc1:
        cats_sel = st.multiselect("🏢 Setor / Categoria", categorias,
                                   default=categorias, key="orc_cat")
    with fc2:
        view_mes = st.selectbox("📆 Visualizar mês", ["Anual"]+MESES_ABBR, key="orc_mes")

    df_f = df[df["Categoria"].isin(cats_sel)] if cats_sel else df

    # ── KPIs de Topo ─────────────────────────────────────────────────────────
    total_geral = df_f["Total_Anual"].sum()
    n_itens     = len(df_f)
    maior_cat   = df_f.groupby("Categoria")["Total_Anual"].sum().idxmax() if not df_f.empty else "—"
    maior_val   = df_f.groupby("Categoria")["Total_Anual"].sum().max() if not df_f.empty else 0

    k1, k2, k3, k4 = st.columns(4)
    def _kcard(col, label, value, color, fmt_brl=True):
        val_str = f"R$ {value:,.2f}".replace(",","X").replace(".",",").replace("X",".") if fmt_brl else str(value)
        col.markdown(f"""
        <div class="orc-card" style="border-left:5px solid {color}">
            <div style="font-size:0.65rem;font-weight:700;color:#6B7280;
                        text-transform:uppercase;letter-spacing:0.06em">{label}</div>
            <div style="font-size:1.5rem;font-weight:900;color:{color};line-height:1.2">{val_str}</div>
        </div>""", unsafe_allow_html=True)

    _kcard(k1, "💰 Total Orçado", total_geral, C_BLUE)
    _kcard(k2, "📋 Nº de Itens",  n_itens,     C_ORANGE, fmt_brl=False)
    _kcard(k3, "🏆 Maior Setor",  maior_val,   C_INDIGO if False else "#6366F1")
    with k4:
        st.markdown(f"""
        <div class="orc-card" style="border-left:5px solid #10B981">
            <div style="font-size:0.65rem;font-weight:700;color:#6B7280;
                        text-transform:uppercase;letter-spacing:0.06em">🏆 Setor Líder</div>
            <div style="font-size:1.1rem;font-weight:900;color:#10B981;line-height:1.3">{maior_cat}</div>
        </div>""", unsafe_allow_html=True)

    st.markdown("<div style='margin-top:1rem'></div>", unsafe_allow_html=True)

    # ── Gráfico: Total por Setor ──────────────────────────────────────────────
    st.markdown('<div class="orc-header">📊 Orçamento Total por Setor</div>', unsafe_allow_html=True)

    df_cat = df_f.groupby("Categoria")["Total_Anual"].sum().sort_values(ascending=True).reset_index()
    cores  = [C_ORANGE if v == df_cat["Total_Anual"].max() else C_BLUE for v in df_cat["Total_Anual"]]

    fig_bar = go.Figure(go.Bar(
        x=df_cat["Total_Anual"], y=df_cat["Categoria"], orientation="h",
        marker_color=cores,
        text=[f"R$ {v:,.0f}".replace(",",".") for v in df_cat["Total_Anual"]],
        textposition="outside",
        textfont=dict(size=10, color="#374151", weight="bold"),
        hovertemplate="%{y}: R$ %{x:,.2f}<extra></extra>",
    ))
    fig_bar.update_layout(
        paper_bgcolor="rgba(0,0,0,0)", plot_bgcolor="rgba(0,0,0,0)",
        font=dict(family="Inter, sans-serif", color="#374151"),
        xaxis=dict(gridcolor="#F0F0F0", tickprefix="R$ "),
        yaxis=dict(gridcolor="rgba(0,0,0,0)", automargin=True),
        margin=dict(l=10, r=120, t=20, b=20),
        height=max(300, len(df_cat)*52+80),
        showlegend=False,
    )
    st.plotly_chart(fig_bar, use_container_width=True, config={"displayModeBar": False})

    # ── Gráfico: Evolução Mensal ──────────────────────────────────────────────
    st.markdown('<div class="orc-header">📈 Distribuição Mensal do Orçamento</div>', unsafe_allow_html=True)

    cores_linha = [C_BLUE, C_ORANGE, "#10B981", "#8B5CF6", "#F59E0B",
                   "#EF4444", "#6366F1", "#EC4899", "#14B8A6", "#F97316"]

    fig_evo = go.Figure()
    for i, cat in enumerate(cats_sel or categorias):
        df_c = df_f[df_f["Categoria"] == cat]
        ys   = [df_c[m].sum() for m in MESES_ABBR]
        fig_evo.add_trace(go.Scatter(
            x=MESES_ABBR, y=ys, name=cat,
            mode="lines+markers",
            line=dict(color=cores_linha[i % len(cores_linha)], width=2),
            marker=dict(size=7),
            hovertemplate=f"{cat}: R$ %{{y:,.2f}}<extra></extra>",
            stackgroup=None,
        ))
    fig_evo.update_layout(
        paper_bgcolor="rgba(0,0,0,0)", plot_bgcolor="rgba(0,0,0,0)",
        font=dict(family="Inter, sans-serif", color="#374151"),
        xaxis=dict(gridcolor="#F0F0F0"),
        yaxis=dict(gridcolor="#F0F0F0", tickprefix="R$ "),
        legend=dict(orientation="h", y=-0.2, x=0.5, xanchor="center", bgcolor="rgba(0,0,0,0)"),
        margin=dict(l=10, r=10, t=20, b=80),
        height=400, hovermode="x unified",
    )
    st.plotly_chart(fig_evo, use_container_width=True, config={"displayModeBar": False})

    # ── Tabela Detalhada ──────────────────────────────────────────────────────
    st.markdown('<div class="orc-header">📋 Detalhamento por Item</div>', unsafe_allow_html=True)

    cat_detail = st.selectbox("Selecione o Setor para detalhar",
                               ["Todos"] + (cats_sel or categorias), key="orc_detail")
    df_det = df_f if cat_detail == "Todos" else df_f[df_f["Categoria"] == cat_detail]

    # Define colunas a mostrar
    if view_mes == "Anual":
        cols_show = ["Categoria","Item","Empresa","Total_Anual"] + MESES_ABBR
    else:
        cols_show = ["Categoria","Item","Empresa", view_mes]

    df_show = df_det[cols_show].copy()

    # Formata valores monetários
    def _fmt(v):
        if isinstance(v, float) and v > 0:
            return f"R$ {v:,.2f}".replace(",","X").replace(".",",").replace("X",".")
        return "—" if v == 0.0 else v

    for col in MESES_ABBR + ["Total_Anual"]:
        if col in df_show.columns:
            df_show[col] = df_show[col].apply(_fmt)

    df_show.rename(columns={"Total_Anual":"Total Anual"}, inplace=True)

    # Destaque por setor
    def _row_color(row):
        styles = [""] * len(row)
        return styles

    st.dataframe(df_show, use_container_width=True, hide_index=True,
                 height=min(600, len(df_show)*38+60))

    # ── Justificativas ───────────────────────────────────────────────────────
    df_just = df_det[df_det["Justificativa"].str.strip() != ""][["Categoria","Item","Justificativa","Total_Anual"]]
    if not df_just.empty:
        with st.expander("📖 Ver Justificativas / ROI dos itens", expanded=False):
            for _, r in df_just.iterrows():
                total_fmt = f"R$ {r['Total_Anual']:,.2f}".replace(",","X").replace(".",",").replace("X",".")
                st.markdown(f"""
                <div style="background:#F8FAFF;border-left:4px solid {C_BLUE};
                            border-radius:8px;padding:0.7rem 1rem;margin-bottom:0.5rem">
                    <div style="font-size:0.75rem;color:{C_ORANGE};font-weight:700">{r['Categoria']} — {r['Item']}</div>
                    <div style="font-size:0.85rem;color:#374151;margin-top:2px">{r['Justificativa']}</div>
                    <div style="font-size:0.72rem;color:{C_BLUE};margin-top:4px;font-weight:700">{total_fmt}</div>
                </div>""", unsafe_allow_html=True)

    # ── Pizza: composição por setor ───────────────────────────────────────────
    st.markdown('<div class="orc-header">🥧 Composição do Orçamento por Setor</div>', unsafe_allow_html=True)
    df_pie = df_f.groupby("Categoria")["Total_Anual"].sum().reset_index()
    df_pie = df_pie[df_pie["Total_Anual"] > 0]
    fig_pie = go.Figure(go.Pie(
        labels=df_pie["Categoria"],
        values=df_pie["Total_Anual"],
        hole=0.45,
        marker=dict(colors=cores_linha[:len(df_pie)]),
        textinfo="label+percent",
        hovertemplate="%{label}: R$ %{value:,.2f}<extra></extra>",
    ))
    fig_pie.update_layout(
        paper_bgcolor="rgba(0,0,0,0)",
        font=dict(family="Inter, sans-serif"),
        legend=dict(orientation="h", y=-0.15, x=0.5, xanchor="center"),
        margin=dict(l=10, r=10, t=20, b=60),
        height=420,
    )
    st.plotly_chart(fig_pie, use_container_width=True, config={"displayModeBar": False})

