"""
utils.py — Utilitários de dados para o Dashboard LocExpress Franchising

Suporte completo a:
  - Unidade_Medida : R$ | % | Dias | Quantidade | Número
  - Sentido_Meta   : Maior (maior é melhor) | Menor (menor é melhor)
  - Agregação      : soma para R$/Quantidade, média para %/Dias/Número
  - Atingimento    : (Valor/Meta)×100 ou (Meta/Valor)×100 conforme sentido
"""

import re
import pandas as pd
import streamlit as st
from typing import Optional, Tuple

# ─── URL da Planilha ──────────────────────────────────────────────────────────

SHEET_URL = (
    "https://docs.google.com/spreadsheets/d/e/2PACX-1vS2xFh5eXX8nGh042OkHSK9hQAjBD88kxkbCzHv0WjFp41hR5xEE9L2KM60MtRMyPf_znK13bHbwADx/pub?gid=0&single=true&output=csv")

# ─── Paleta de Cores LocExpress ───────────────────────────────────────────────

COLOR_ORANGE        = "#F47920"
COLOR_ORANGE_LIGHT  = "#FFA040"
COLOR_INDIGO_DARK   = "#1A1A6E"
COLOR_INDIGO        = "#2D3192"
COLOR_INDIGO_LIGHT  = "#3F3FBF"
COLOR_BLUE_DARK     = "#003087"
COLOR_WHITE         = "#FFFFFF"
COLOR_GRAY_DARK     = "#374151"
COLOR_GRAY_MID      = "#6B7280"
COLOR_GRAY_LIGHT    = "#F3F4F6"
COLOR_GREEN         = "#00C853"
COLOR_YELLOW        = "#FFB300"
COLOR_RED           = "#F44336"

# ─── Configuração por Unidade de Medida ──────────────────────────────────────

# agg  : método de agregação entre múltiplas linhas
# color: cor do card/gráfico para esse tipo
# icon : ícone exibido nos cards
UNIDADE_CONFIG = {
    "R$":         {"agg": "sum",  "color": COLOR_BLUE_DARK,    "icon": "💰"},
    "%":          {"agg": "mean", "color": COLOR_ORANGE,        "icon": "📊"},
    "Dias":       {"agg": "mean", "color": "#6366F1",           "icon": "📅"},
    "Quantidade": {"agg": "sum",  "color": "#10B981",           "icon": "📦"},
    "Número":     {"agg": "mean", "color": "#8B5CF6",           "icon": "🔢"},
}

def get_unidade_config(unidade: str) -> dict:
    return UNIDADE_CONFIG.get(str(unidade).strip(), {
        "agg": "sum", "color": COLOR_BLUE_DARK, "icon": "📈"
    })

def get_agg_type(unidade: str) -> str:
    return get_unidade_config(unidade)["agg"]

# ─── Mapas de Meses ───────────────────────────────────────────────────────────

MESES_PT = {
    1: "Janeiro",   2: "Fevereiro",  3: "Março",    4: "Abril",
    5: "Maio",      6: "Junho",      7: "Julho",    8: "Agosto",
    9: "Setembro", 10: "Outubro",   11: "Novembro", 12: "Dezembro",
}
MESES_ABBR = {
    1: "Jan", 2: "Fev", 3: "Mar", 4: "Abr",
    5: "Mai", 6: "Jun", 7: "Jul", 8: "Ago",
    9: "Set", 10: "Out", 11: "Nov", 12: "Dez",
}
_MESES_LOWER = {v.lower(): k for k, v in MESES_PT.items()}
_MESES_LOWER.update({v.lower(): k for k, v in MESES_ABBR.items()})

_DEPTO_ALIASES = ["Setor", "Sector", "Área", "Area", "Categoria"]

# Palavras-chave que identificam "Menor é Melhor"
_MENOR_KEYWORDS = ("menor", "decrescente", "minimizar", "reduzir", "< meta", "abaixo")


# ─── Helpers Numéricos ────────────────────────────────────────────────────────

def _clean_numeric(val) -> float:
    """Converte 'R$ 30.000,00' | '90%' | '135 dias' → float."""
    if pd.isna(val):
        return float("nan")
    s = str(val).strip()
    if s in ("", "-", "n/a", "N/A", "nan", "None"):
        return float("nan")
    s = re.sub(r"[R$%\s]", "", s)
    s = re.sub(r"[a-zA-ZÀ-ú]+", "", s).strip(" .")
    if not s or s == "-":
        return float("nan")
    if "," in s and "." in s:
        s = s.replace(".", "").replace(",", ".")
    elif "," in s:
        s = s.replace(",", ".")
    try:
        return float(s)
    except ValueError:
        return float("nan")


def _parse_mes(val) -> object:
    if pd.isna(val):
        return pd.NA
    try:
        return int(val)
    except (ValueError, TypeError):
        return _MESES_LOWER.get(str(val).strip().lower(), pd.NA)


# ─── Atingimento ──────────────────────────────────────────────────────────────

def is_sentido_menor(sentido: str) -> bool:
    return any(k in str(sentido).lower() for k in _MENOR_KEYWORDS)


def calc_atingimento(valor, meta, sentido: str) -> float:
    """
    Calcula % de atingimento considerando a direção da meta.
    Menor é Melhor: (Meta / Valor) × 100  →  gastar menos = atingir mais.
    Maior é Melhor: (Valor / Meta) × 100  →  produzir mais = atingir mais.
    Retorna NaN quando Valor não foi informado.
    """
    if pd.isna(valor) or pd.isna(meta) or meta == 0:
        return float("nan")
    if is_sentido_menor(sentido):
        if valor == 0:
            return float("nan")          # não lançado ainda
        return (meta / valor) * 100
    return (valor / meta) * 100


# ─── Formatação de Valores ────────────────────────────────────────────────────

def fmt_value(value, unidade: str) -> str:
    """Formata valor de acordo com a Unidade_Medida."""
    if pd.isna(value):
        return "—"
    v = float(value)
    u = str(unidade).strip()

    if u == "R$":
        if abs(v) >= 1_000_000:
            return f"R$ {v / 1_000_000:.2f}M".replace(".", ",")
        elif abs(v) >= 1_000:
            fmt = f"{abs(v):,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")
            return f"{'−' if v < 0 else ''}R$ {fmt}"
        else:
            return f"R$ {v:.2f}".replace(".", ",")
    elif u == "%":
        return f"{v:.1f}%"
    elif u == "Dias":
        return f"{v:.1f} dias"
    elif u == "Quantidade":
        return f"{int(round(v)):,}".replace(",", ".")
    elif u == "Número":
        return f"{v:.2f}".replace(".", ",")
    else:
        return fmt_number(v)


def fmt_diferenca(valor, meta, sentido: str, unidade: str) -> Tuple[str, str]:
    """Retorna (texto_formatado, cor) da diferença, respeitando o sentido."""
    if pd.isna(valor) or pd.isna(meta):
        return "—", COLOR_GRAY_MID
    diff = float(valor) - float(meta)
    if is_sentido_menor(sentido):
        # Menor é melhor: negativo (gastou menos) = bom
        color  = COLOR_GREEN if diff <= 0 else COLOR_RED
        prefix = "" if diff <= 0 else "+"
    else:
        color  = COLOR_GREEN if diff >= 0 else COLOR_RED
        prefix = "+" if diff >= 0 else ""
    return f"{prefix}{fmt_value(diff, unidade)}", color


def fmt_number(value: float, decimals: int = 1) -> str:
    """Formata número grande com sufixo K/M (uso geral)."""
    abs_v = abs(value)
    sign  = "-" if value < 0 else ""
    if abs_v >= 1_000_000:
        return f"{sign}{abs_v / 1_000_000:.{decimals}f}M"
    elif abs_v >= 1_000:
        return f"{sign}{abs_v / 1_000:.{decimals}f}K"
    return f"{sign}{abs_v:.{decimals}f}"


def fmt_pct(value: float, decimals: int = 1) -> str:
    if pd.isna(value):
        return "—"
    return f"{float(value):.{decimals}f}%"


# ─── Status ───────────────────────────────────────────────────────────────────

def get_status_color(pct) -> str:
    if pd.isna(pct):
        return COLOR_GRAY_MID
    if pct >= 100:
        return COLOR_GREEN
    elif pct >= 80:
        return COLOR_YELLOW
    return COLOR_RED


def get_status_icon(pct) -> str:
    if pd.isna(pct):
        return "⬜"
    if pct >= 100:
        return "✅"
    elif pct >= 80:
        return "⚠️"
    return "🚨"


def get_status_label(pct) -> str:
    if pd.isna(pct):
        return "Não Informado"
    if pct >= 100:
        return "Meta Atingida"
    elif pct >= 80:
        return "Atenção"
    return "Abaixo da Meta"


# ─── Carregamento de Dados ────────────────────────────────────────────────────

@st.cache_data(ttl=300, show_spinner=False)
def load_data() -> Tuple[Optional[pd.DataFrame], Optional[str]]:
    """
    Carrega e normaliza a planilha.
    Detecta automaticamente: Setor→Departamento, Unidade_Medida, Sentido_Meta.
    NaN em Valor = não lançado (mantido como NaN, não convertido para 0).
    """
    try:
        df = pd.read_csv(SHEET_URL)
    except Exception as exc:
        return None, (
            "Não foi possível conectar à planilha. "
            "Certifique-se de que está publicada como CSV.\n\n"
            f"Detalhe: {exc}"
        )

    df.columns = [c.strip() for c in df.columns]

    if df.empty:
        return None, "A planilha está vazia."

    # Colunas absolutamente obrigatórias
    for col in ("Data", "Indicador", "Meta"):
        if col not in df.columns:
            return None, f"Coluna obrigatória ausente: '{col}'"

    # Departamento / Setor
    if "Departamento" not in df.columns:
        for alias in _DEPTO_ALIASES:
            if alias in df.columns:
                df.rename(columns={alias: "Departamento"}, inplace=True)
                break
        else:
            df["Departamento"] = "Geral"

    # Unidade_Medida (opcional — padrão "Número")
    if "Unidade_Medida" not in df.columns:
        df["Unidade_Medida"] = "Número"
    else:
        df["Unidade_Medida"] = df["Unidade_Medida"].fillna("Número").astype(str).str.strip()

    # Sentido_Meta (opcional — padrão "Maior")
    if "Sentido_Meta" not in df.columns:
        df["Sentido_Meta"] = "Maior"
    else:
        df["Sentido_Meta"] = df["Sentido_Meta"].fillna("Maior").astype(str).str.strip()

    # Unidade (opcional — derivada de Departamento)
    if "Unidade" not in df.columns:
        df["Unidade"] = df["Departamento"]

    # Meta: limpa e valida
    df["Meta"] = df["Meta"].apply(_clean_numeric)
    df = df.dropna(subset=["Meta"])
    df = df[df["Meta"] > 0].copy()
    if df.empty:
        return None, "Nenhuma linha com Meta válida encontrada."

    # Valor: limpa, mas mantém NaN (= não lançado)
    if "Valor" not in df.columns:
        df["Valor"] = float("nan")
    else:
        df["Valor"] = df["Valor"].apply(_clean_numeric)

    # Data → Ano e Mês
    df["_dt"] = pd.to_datetime(df["Data"], dayfirst=True, errors="coerce")

    if "Ano" not in df.columns:
        df["Ano"] = df["_dt"].dt.year
    else:
        df["Ano"] = pd.to_numeric(df["Ano"], errors="coerce").fillna(df["_dt"].dt.year)

    if "Mês" not in df.columns:
        df["Mês"] = df["_dt"].dt.month
    else:
        df["Mês"] = df["Mês"].apply(_parse_mes)
        df["Mês"] = pd.to_numeric(df["Mês"], errors="coerce").fillna(df["_dt"].dt.month)

    df.drop(columns=["_dt"], inplace=True)
    df["Ano"]     = df["Ano"].astype("Int64")
    df["Mês"]     = df["Mês"].astype("Int64")
    df["MêsNome"] = df["Mês"].map(MESES_PT).fillna(df["Mês"].astype(str))

    # Strings opcionais
    for col in ("Responsável", "Observação"):
        if col not in df.columns:
            df[col] = ""
        df[col] = df[col].fillna("").astype(str).str.strip()

    for col in ("Departamento", "Unidade", "Indicador", "Unidade_Medida", "Sentido_Meta"):
        df[col] = df[col].fillna("").astype(str).str.strip()

    return df, None


# ─── Agregação Correta por Indicador ─────────────────────────────────────────

def _agg_valor_meta(group: pd.DataFrame, agg_type: str):
    """Agrega Valor e Meta usando o método correto para a unidade."""
    if agg_type == "sum":
        valor = group["Valor"].sum(min_count=1)   # NaN se todos NaN
        meta  = group["Meta"].sum()
    else:
        valor = group["Valor"].mean()              # NaN se todos NaN
        meta  = group["Meta"].mean()
    return valor, meta


def agg_indicators(df: pd.DataFrame) -> pd.DataFrame:
    """
    Agrega cada combinação única Departamento+Indicador com o método correto.
    Retorna uma linha por indicador com Atingimento calculado.
    """
    rows = []
    for (setor, indicador), grp in df.groupby(["Departamento", "Indicador"], sort=False):
        unidade = grp["Unidade_Medida"].iloc[0]
        sentido = grp["Sentido_Meta"].iloc[0]
        agg_t   = get_agg_type(unidade)
        valor, meta = _agg_valor_meta(grp, agg_t)
        ating = calc_atingimento(valor, meta, sentido)
        rows.append({
            "Departamento":  setor,
            "Indicador":     indicador,
            "Unidade_Medida": unidade,
            "Sentido_Meta":  sentido,
            "Valor":         valor,
            "Meta":          meta,
            "Atingimento":   ating,
        })
    return pd.DataFrame(rows) if rows else pd.DataFrame()


def kpis_for_indicator(df: pd.DataFrame) -> dict:
    """
    KPIs para um único Indicador já filtrado (df deve ter só 1 Indicador).
    Agrega corretamente por Unidade_Medida e calcula atingimento pelo Sentido_Meta.
    """
    if df.empty:
        return {"valor": float("nan"), "meta": 0.0,
                "atingimento": float("nan"), "unidade": "", "sentido": "Maior"}

    unidade = df["Unidade_Medida"].iloc[0]
    sentido = df["Sentido_Meta"].iloc[0]
    agg_t   = get_agg_type(unidade)
    valor, meta = _agg_valor_meta(df, agg_t)
    ating = calc_atingimento(valor, meta, sentido)

    return {
        "valor":      valor,
        "meta":       meta,
        "atingimento": ating,
        "unidade":    unidade,
        "sentido":    sentido,
    }


def avg_across_years(df: pd.DataFrame) -> float:
    """Valor médio anual agregado ao longo de todos os anos com dado lançado."""
    if df.empty or df["Valor"].isna().all():
        return float("nan")
    unidade = df["Unidade_Medida"].iloc[0]
    agg_t   = get_agg_type(unidade)
    yearly  = []
    for _, grp in df.groupby("Ano"):
        val, _ = _agg_valor_meta(grp, agg_t)
        if not pd.isna(val):
            yearly.append(float(val))
    return sum(yearly) / len(yearly) if yearly else float("nan")


def monthly_evolution_indicator(df: pd.DataFrame) -> pd.DataFrame:
    """
    Evolução mensal para um único Indicador.
    Respeita o método de agregação e calcula atingimento por período.
    """
    if df.empty:
        return pd.DataFrame()

    unidade = df["Unidade_Medida"].iloc[0]
    sentido = df["Sentido_Meta"].iloc[0]
    agg_t   = get_agg_type(unidade)

    rows = []
    for (ano, mes, mes_nome), grp in df.groupby(["Ano", "Mês", "MêsNome"], sort=False):
        valor, meta = _agg_valor_meta(grp, agg_t)
        ating = calc_atingimento(valor, meta, sentido)
        rows.append({
            "Ano": ano, "Mês": mes, "Label": mes_nome,
            "Valor": valor, "Meta": meta, "Atingimento": ating,
        })

    result = pd.DataFrame(rows).sort_values(["Ano", "Mês"]).reset_index(drop=True)
    return result
