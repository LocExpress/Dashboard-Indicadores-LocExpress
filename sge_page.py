"""
sge_page.py — Aba Diagnóstico SGE para o Dashboard LocExpress
"""

import streamlit as st
import pandas as pd
import plotly.graph_objects as go
import requests
import io
import unicodedata

# URLs publicadas via "Arquivo > Publicar na web"
SGE_GERAL_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vR7vqbGSRITRkAikpISxGrIyAXSVr2HZllFSiYhIBIcye5_PsrTcGVAs1THfIyhqw/pub?gid=225370926&single=true&output=csv"
SGE_SHEET_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vR7vqbGSRITRkAikpISxGrIyAXSVr2HZllFSiYhIBIcye5_PsrTcGVAs1THfIyhqw/pub?gid=1667231213&single=true&output=csv"

C_BLUE   = "#2D3192"
C_ORANGE = "#F47920"
C_GREEN  = "#00C853"
C_YELLOW = "#FFB300"
C_RED    = "#F44336"
C_GRAY   = "#6B7280"

SETORES_FULL = {
    "IMP.": "Implantação", "PER.": "Performance", "COM.": "Comercial",
    "MKT.": "Marketing",   "DP/RH": "DP/RH",      "FIN.": "Financeiro",
    "ADM.": "Administrativo"
}
MESES = ["JANEIRO","FEVEREIRO","MARÇO","ABRIL","MAIO","JUNHO",
         "JULHO","AGOSTO","SETEMBRO","OUTUBRO","NOVEMBRO","DEZEMBRO"]
MESES_ABBR = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"]

def _norm(s):
    """Remove acentos e padroniza string para comparação."""
    return unicodedata.normalize("NFD", str(s).upper()).encode("ascii", "ignore").decode("ascii").strip()


REGRAS_CALCULO = {
    "INDICADORES DE DESEMPENHO": "1 indicador = 3 pts; 2 indicadores = 5 pts",
    "R.A.R - REUNIÃO DE APRESENTAÇÃO DE RESULTADOS - equipe": "Realizado = 5 pts",
    "R.A.R - REUNIÃO DE APRESENTAÇÃO DE RESULTADOS - diretoria": "Realizado = 5 pts",
    "TRP - TÉCNICA DE RESOLUÇÃO DE PROBLEMAS": "1 TRP = 3 pts; 2+ TRPs = 5 pts",
    "FLUXOGRAMAS": "100% mapeados + atualiz. <90 dias = 5 pts; Parcial = 3 pts",
    "FUNCIONOGRAMAS": "100% preenchidos + atualiz. <90 dias = 5 pts; Parcial = 3 pts",
    "POP'S": "100% POPs + utilização = 5 pts; Parcial = 3 pts",
    "REUNIÃO DO BOM DIA": "1-2 registros = 3 pts; 3+ = 5 pts",
    "AUTODIAGNÓSTICO": "Uma evidência = 5 pts",
    "BENCHMARKING": "1-2 benchmarkings = 3 pts; 3+ = 5 pts",
    "PDI": "Ter PDI = 5 pts; Não ter = 0",
    "PLANO DE DESENVOLVIMENTO DE BACKUP": "Ter plano atualizado = 5 pts",
    "CUMBUCA": "1-2 registros = 3 pts; 3+ = 5 pts",
}

def _status_color(pct):
    if pd.isna(pct): return C_GRAY
    if pct >= 80: return C_GREEN
    if pct >= 60: return C_YELLOW
    return C_RED

def _status_icon(pct):
    if pd.isna(pct): return "⬜"
    if pct >= 80: return "✅"
    if pct >= 60: return "⚠️"
    return "🚨"

@st.cache_data(ttl=300, show_spinner=False)
def load_sge_data():
    try:
        r = requests.get(SGE_GERAL_URL, timeout=15)
        r.raise_for_status()
        r.encoding = "utf-8"
        df = pd.read_csv(io.StringIO(r.text))
        df.columns = [c.strip() for c in df.columns]
        if df.empty or len(df.columns) < 3:
            return None, "Planilha vazia ou sem colunas suficientes."
        return df, None
    except Exception as exc:
        return None, str(exc)

def _parse_sge(df_raw):
    if df_raw is None or df_raw.empty:
        return pd.DataFrame()
    df = df_raw.copy()
    df.columns = [c.strip().upper() for c in df.columns]

    col_map = {}
    for c in df.columns:
        cn = _norm(c)
        if "DATA" in cn:          col_map[c] = "DATA"
        elif "SETOR" in cn:       col_map[c] = "SETOR"
        elif "ASSUNTO" in cn:     col_map[c] = "ASSUNTO"
        elif "AVALI" in cn:       col_map[c] = "AVALIACAO"
        elif cn in ("MAXIMO", "MAX", "PONTOS MAX", "PONTOS_MAX",
                    "MAXIMOS", "MÁXIMO", "MAXI", "PESO", "TOTAL MAX"):
            col_map[c] = "MAXIMO"

    df.rename(columns=col_map, inplace=True)

    for needed in ("DATA", "SETOR", "ASSUNTO", "AVALIACAO"):
        if needed not in df.columns:
            return pd.DataFrame()

    df["DATA"] = pd.to_datetime(df["DATA"], dayfirst=True, errors="coerce")
    df = df.dropna(subset=["DATA"])
    df["MES"] = df["DATA"].dt.month
    df["ANO"] = df["DATA"].dt.year

    def _parse_score(v):
        s = str(v).strip()
        if s in ("-", "", "nan", "None", "N/A"): return float("nan")
        try: return float(s)
        except: return float("nan")

    df["PONTOS"]   = df["AVALIACAO"].apply(_parse_score)
    df["AVALIADO"] = ~df["PONTOS"].isna()

    # ── Coluna MAXIMO ────────────────────────────────────────────────────────
    # Prioridade:
    #   1. Coluna explícita "MAXIMO" (ou variante) já na planilha
    #   2. Fallback: 5 pontos por linha (comportamento anterior)
    if "MAXIMO" in df.columns:
        df["MAXIMO"] = df["MAXIMO"].apply(_parse_score).fillna(5.0)
    else:
        # Sem coluna explícita → usa 5 como padrão por item
        df["MAXIMO"] = 5.0

    return df


# ── Cálculo de % usando pontos máximos reais ─────────────────────────────────

def _calc_pct_item_setor(df, assunto, setor, mes=None, ano=None):
    """
    Retorna (pts_obtidos, pts_maximos, pct) para um item+setor.
    pts_maximos = soma da coluna MAXIMO (não mais n_linhas × 5).
    """
    mask = (
        df["ASSUNTO"].str.strip().apply(_norm) == _norm(assunto)
    ) & (
        df["SETOR"].str.strip().apply(_norm) == _norm(setor)
    )
    if mes: mask &= (df["MES"] == mes)
    if ano: mask &= (df["ANO"] == ano)

    avaliados = df[mask & df["AVALIADO"]]
    if avaliados.empty:
        return float("nan"), float("nan"), float("nan")

    pts  = avaliados["PONTOS"].sum()
    maxi = avaliados["MAXIMO"].sum()          # ← usa máximo real, não n*5
    pct  = (pts / maxi * 100) if maxi > 0 else float("nan")
    return pts, maxi, pct


def _calc_pct_setor(df, setor, mes=None, ano=None):
    """
    % geral do setor = soma(PONTOS) / soma(MAXIMO) × 100
    Ex.: IMP. obteve 48 de 65 → 73,84% ≈ 74%
    """
    mask = df["SETOR"].str.strip().apply(_norm) == _norm(setor)
    if mes: mask &= (df["MES"] == mes)
    if ano: mask &= (df["ANO"] == ano)

    sub = df[mask & df["AVALIADO"]]
    if sub.empty:
        return float("nan")

    pts  = sub["PONTOS"].sum()
    maxi = sub["MAXIMO"].sum()               # ← usa máximo real
    return (pts / maxi * 100) if maxi > 0 else float("nan")


def page_diagnostico_sge():
    st.markdown("""
    <style>
    .sge-card { background:#fff; border-radius:12px; padding:1rem 1.2rem;
        box-shadow:0 2px 12px rgba(0,0,0,0.07); margin-bottom:0.5rem; }
    .sge-header { font-size:0.9rem; font-weight:700; color:#2D3192;
        border-bottom:2.5px solid #F47920; padding-bottom:0.3rem; margin:1rem 0 0.6rem; }
    .sge-regra { font-size:0.72rem; color:#6B7280; font-style:italic;
        background:#F3F4F6; border-radius:6px; padding:0.25rem 0.6rem;
        display:inline-block; margin-bottom:0.4rem; }
    </style>
    """, unsafe_allow_html=True)

    st.markdown("""
    <div style='background:linear-gradient(135deg,#2D3192 0%,#F47920 100%);
                border-radius:12px;padding:1.2rem 1.8rem;margin-bottom:1.2rem;color:#fff;'>
        <div style='font-size:1.3rem;font-weight:900'>🔍 Diagnóstico SGE</div>
        <div style='font-size:0.85rem;opacity:0.88;margin-top:4px'>
            Sistema de Gestão Estratégica — Memória de Cálculo por Setor e Item
        </div>
    </div>
    """, unsafe_allow_html=True)

    with st.spinner("Carregando dados SGE..."):
        df_raw, err = load_sge_data()

    if err or df_raw is None:
        st.error(f"❌ Erro ao carregar dados SGE: {err}")
        if st.button("🔄 Tentar Novamente", key="sge_retry"):
            st.cache_data.clear()
            st.rerun()
        return

    df = _parse_sge(df_raw)
    if df.empty:
        st.warning("⚠️ Nenhum dado SGE encontrado.")
        return

    anos_disp     = sorted(df["ANO"].dropna().unique().tolist(), reverse=True)
    setores_disp  = sorted(df["SETOR"].dropna().unique().tolist())
    assuntos_disp = sorted(df["ASSUNTO"].dropna().unique().tolist())

    fc1, fc2, fc3 = st.columns(3)
    with fc1:
        ano_sel = st.selectbox("📅 Ano", anos_disp, key="sge_ano")
    with fc2:
        mes_sel = st.selectbox("📆 Mês", [0] + list(range(1, 13)),
                               format_func=lambda m: "Todos" if m == 0 else MESES[m - 1],
                               key="sge_mes")
    with fc3:
        setor_view = st.selectbox("🏢 Setor", ["Todos"] + setores_disp, key="sge_setor_view")

    mes_f = None if mes_sel == 0 else mes_sel
    df_f  = df[df["ANO"] == ano_sel].copy()
    if mes_f:
        df_f = df_f[df_f["MES"] == mes_f]

    setores_calc = setores_disp if setor_view == "Todos" else [setor_view]
    pcts_setores = {s: _calc_pct_setor(df_f, s) for s in setores_calc}
    vals_validos = [v for v in pcts_setores.values() if not pd.isna(v)]
    media_geral  = sum(vals_validos) / len(vals_validos) if vals_validos else float("nan")

    # ── Cards por setor ───────────────────────────────────────────────────────
    st.markdown('<div class="sge-header">📊 Resumo Geral do Diagnóstico</div>', unsafe_allow_html=True)

    # Mostra também pts obtidos / pts máximos no card
    cols_cards = st.columns(min(len(setores_calc), 4))
    for i, setor in enumerate(setores_calc):
        pct   = pcts_setores[setor]
        color = _status_color(pct)
        icon  = _status_icon(pct)
        pct_str = f"{pct:.0f}%" if not pd.isna(pct) else "—"

        # Pontos brutos para exibir no sub-label do card
        sub = df_f[df_f["SETOR"].str.strip().apply(_norm) == _norm(setor)]
        sub_av = sub[sub["AVALIADO"]]
        if not sub_av.empty:
            pts_tot  = sub_av["PONTOS"].sum()
            maxi_tot = sub_av["MAXIMO"].sum()
            pts_label = f"{pts_tot:.0f} / {maxi_tot:.0f} pts"
        else:
            pts_label = ""

        with cols_cards[i % 4]:
            st.markdown(f"""
            <div class="sge-card" style="border-left:5px solid {color};text-align:center">
                <div style="font-size:0.65rem;font-weight:700;color:#6B7280;
                            text-transform:uppercase;letter-spacing:0.06em">{setor}</div>
                <div style="font-size:2rem;font-weight:900;color:{color};line-height:1.1">{pct_str}</div>
                <div style="font-size:0.72rem;color:{color};margin-top:2px">{icon} SGE</div>
                <div style="font-size:0.68rem;color:#9CA3AF;margin-top:2px">{pts_label}</div>
            </div>""", unsafe_allow_html=True)

    mes_label = MESES[mes_f - 1] if mes_f else "Todos os meses"
    media_str = f"{media_geral:.0f}%" if not pd.isna(media_geral) else "—"
    st.markdown(f"""
    <div style="background:linear-gradient(135deg,#2D3192,#1A1A6E);border-radius:12px;
                padding:0.8rem 1.5rem;display:flex;align-items:center;gap:1rem;
                margin:0.8rem 0;color:#fff;">
        <span style="font-size:2.5rem;font-weight:900">{media_str}</span>
        <div>
            <div style="font-weight:700;font-size:1rem">Média Geral SGE</div>
            <div style="font-size:0.75rem;opacity:0.8">{mes_label} / {ano_sel}</div>
        </div>
    </div>""", unsafe_allow_html=True)

    # ── Radar ─────────────────────────────────────────────────────────────────
    st.markdown('<div class="sge-header">🕸️ Radar de Desempenho por Setor</div>', unsafe_allow_html=True)
    radar_vals   = [pcts_setores.get(s, 0) or 0 for s in setores_calc]
    radar_labels = [SETORES_FULL.get(s, s) for s in setores_calc]
    if len(radar_vals) > 2:
        fig_radar = go.Figure(go.Scatterpolar(
            r=radar_vals + [radar_vals[0]],
            theta=radar_labels + [radar_labels[0]],
            fill='toself',
            fillcolor='rgba(45,49,146,0.18)',
            line=dict(color=C_BLUE, width=2.5),
            marker=dict(color=C_ORANGE, size=8),
            hovertemplate="%{theta}: %{r:.0f}%<extra></extra>",
        ))
        fig_radar.update_layout(
            polar=dict(
                radialaxis=dict(visible=True, range=[0, 100], ticksuffix="%",
                                gridcolor="#E5E7EB", linecolor="#E5E7EB"),
                angularaxis=dict(gridcolor="#E5E7EB"),
                bgcolor="rgba(0,0,0,0)",
            ),
            paper_bgcolor="rgba(0,0,0,0)",
            margin=dict(l=60, r=60, t=30, b=30),
            height=380, showlegend=False,
        )
        st.plotly_chart(fig_radar, use_container_width=True, config={"displayModeBar": False})

    # ── Regras de cálculo ─────────────────────────────────────────────────────
    with st.expander("📖 Ver descrição e regras de cálculo dos itens SGE", expanded=False):
        desc_rows = []
        for assunto in assuntos_disp:
            regra = next(
                (v for k, v in REGRAS_CALCULO.items()
                 if _norm(k) in _norm(assunto) or _norm(assunto) in _norm(k)),
                "Pontuação por evidência apresentada"
            )
            desc_rows.append({"Item SGE": assunto, "Regra de Cálculo": regra})
        df_desc = pd.DataFrame(desc_rows)
        st.dataframe(df_desc, use_container_width=True, hide_index=True,
                     height=min(480, len(df_desc) * 38 + 50))

    # ── Tabela memória de cálculo ─────────────────────────────────────────────
    st.markdown('<div class="sge-header">📋 Memória de Cálculo — Item × Setor</div>', unsafe_allow_html=True)
    st.caption("Pontos obtidos / Pontos máximos reais (% atingida) por setor")

    rows_data = []
    for assunto in assuntos_disp:
        regra = next(
            (v for k, v in REGRAS_CALCULO.items() if k.upper() in assunto.upper()),
            "Por evidência"
        )
        row = {"Item": assunto, "Regra": regra}
        total_pts = 0
        total_max = 0
        for setor in setores_calc:
            pts, maxi, pct = _calc_pct_item_setor(df_f, assunto, setor)
            if pd.isna(pts):
                row[setor] = "—"
            else:
                row[setor] = f"{int(pts)}/{int(maxi)} ({pct:.0f}%)"
                total_pts += int(pts)
                total_max += int(maxi)
        row["TOTAL"] = (
            f"{total_pts}/{total_max} ({total_pts/total_max*100:.0f}%)"
            if total_max > 0 else "—"
        )
        rows_data.append(row)

    df_tabela = pd.DataFrame(rows_data)

    def _highlight(val):
        if not isinstance(val, str) or val == "—": return ""
        try:
            pct = float(val.split("(")[1].replace("%)", ""))
            if pct >= 80: return "background-color:#ECFDF5;color:#065F46;font-weight:700"
            if pct >= 60: return "background-color:#FFFBEB;color:#92400E;font-weight:700"
            return "background-color:#FEF2F2;color:#991B1B;font-weight:700"
        except:
            return ""

    cols_show = ["Item", "Regra"] + setores_calc + ["TOTAL"]
    st.dataframe(
        df_tabela[cols_show].style.map(_highlight, subset=setores_calc + ["TOTAL"]),
        use_container_width=True, hide_index=True,
        height=min(600, len(df_tabela) * 42 + 60),
    )

    # ── Evolução mensal ───────────────────────────────────────────────────────
    st.markdown('<div class="sge-header">📈 Evolução Mensal — % SGE por Setor</div>', unsafe_allow_html=True)
    cores   = [C_BLUE, C_ORANGE, "#10B981", "#8B5CF6", "#F59E0B", "#EF4444", "#6366F1"]
    df_ano  = df[df["ANO"] == ano_sel]
    fig_evo = go.Figure()
    for i, setor in enumerate(setores_calc):
        ys = []
        for m in range(1, 13):
            pct = _calc_pct_setor(df_ano, setor, mes=m)
            ys.append(pct if not pd.isna(pct) else None)
        fig_evo.add_trace(go.Scatter(
            x=MESES_ABBR, y=ys,
            name=SETORES_FULL.get(setor, setor),
            mode="lines+markers",
            line=dict(color=cores[i % len(cores)], width=2.5),
            marker=dict(size=8),
            connectgaps=False,
        ))
    fig_evo.add_hline(y=80, line_dash="dash", line_color=C_GREEN, line_width=1.5,
                      annotation_text="Meta 80%", annotation_font=dict(size=9, color=C_GREEN))
    fig_evo.update_layout(
        paper_bgcolor="rgba(0,0,0,0)", plot_bgcolor="rgba(0,0,0,0)",
        font=dict(family="Inter, sans-serif", color="#374151"),
        xaxis=dict(gridcolor="#F0F0F0"),
        yaxis=dict(gridcolor="#F0F0F0", ticksuffix="%", range=[0, 110]),
        legend=dict(orientation="h", y=-0.2, x=0.5, xanchor="center", bgcolor="rgba(0,0,0,0)"),
        margin=dict(l=10, r=10, t=30, b=80), height=400, hovermode="x unified",
    )
    st.plotly_chart(fig_evo, use_container_width=True, config={"displayModeBar": False})

    # ── Drill-down por item ───────────────────────────────────────────────────
    st.markdown('<div class="sge-header">🔎 Detalhe de Item por Mês</div>', unsafe_allow_html=True)
    item_sel  = st.selectbox("Selecione o Item", assuntos_disp, key="sge_item_detail")
    regra_sel = next(
        (v for k, v in REGRAS_CALCULO.items() if k.upper() in item_sel.upper()),
        "Por evidência"
    )
    st.markdown(f'<div class="sge-regra">📏 Regra: {regra_sel}</div>', unsafe_allow_html=True)

    fig_item = go.Figure()
    for i, setor in enumerate(setores_calc):
        ys = []
        for m in range(1, 13):
            _, _, pct = _calc_pct_item_setor(df_ano, item_sel, setor, mes=m)
            ys.append(pct if not pd.isna(pct) else None)
        fig_item.add_trace(go.Bar(
            name=SETORES_FULL.get(setor, setor),
            x=MESES_ABBR, y=ys,
            marker_color=cores[i % len(cores)],
        ))
    fig_item.add_hline(y=80, line_dash="dash", line_color=C_GREEN, line_width=1.5,
                       annotation_text="80%", annotation_font=dict(size=9, color=C_GREEN))
    fig_item.update_layout(
        barmode="group",
        paper_bgcolor="rgba(0,0,0,0)", plot_bgcolor="rgba(0,0,0,0)",
        font=dict(family="Inter, sans-serif", color="#374151"),
        xaxis=dict(gridcolor="#F0F0F0"),
        yaxis=dict(gridcolor="#F0F0F0", ticksuffix="%", range=[0, 115]),
        legend=dict(orientation="h", y=-0.25, x=0.5, xanchor="center", bgcolor="rgba(0,0,0,0)"),
        margin=dict(l=10, r=10, t=30, b=90), height=380,
    )
    st.plotly_chart(fig_item, use_container_width=True, config={"displayModeBar": False})
