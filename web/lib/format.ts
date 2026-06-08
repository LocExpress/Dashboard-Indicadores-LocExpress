// Limpeza e formatação de valores — porta de utils.py / orcamento_page.py
import { COLOR } from "./theme";

const NA_STRINGS = new Set(["", "-", "n/a", "N/A", "nan", "None"]);

/** Converte 'R$ 30.000,00' | '90%' | '135 dias' → number, ou null. (porta _clean_numeric) */
export function cleanNumeric(val: unknown): number | null {
  if (val == null) return null;
  let s = String(val).trim();
  if (NA_STRINGS.has(s)) return null;
  s = s.replace(/[R$%\s]/g, "");
  s = s.replace(/[a-zA-ZÀ-ú]+/g, "");
  // strip(" .") — remove espaços e pontos das extremidades
  s = s.replace(/^[ .]+|[ .]+$/g, "");
  if (!s || s === "-") return null;
  if (s.includes(",") && s.includes(".")) {
    s = s.replace(/\./g, "").replace(",", ".");
  } else if (s.includes(",")) {
    s = s.replace(",", ".");
  }
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

/** Converte 'R$ 1.500,00' | '1500,00' → number, ou null (formato BR). (porta _clean_brl) */
export function cleanBrl(val: unknown): number | null {
  if (val == null) return null;
  let s = String(val).trim();
  if (NA_STRINGS.has(s)) return null;
  s = s.replace(/[R$\s]/g, "");
  if (s.includes(",") && s.includes(".")) {
    s = s.replace(/\./g, "").replace(",", ".");
  } else if (s.includes(",")) {
    s = s.replace(",", ".");
  }
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function isNil(v: number | null | undefined): v is null | undefined {
  return v == null || Number.isNaN(v as number);
}

/** Formata número grande com sufixo K/M. (porta fmt_number) */
export function fmtNumber(value: number, decimals = 1): string {
  const absV = Math.abs(value);
  const sign = value < 0 ? "-" : "";
  if (absV >= 1_000_000) return `${sign}${(absV / 1_000_000).toFixed(decimals)}M`;
  if (absV >= 1_000) return `${sign}${(absV / 1_000).toFixed(decimals)}K`;
  return `${sign}${absV.toFixed(decimals)}`;
}

// formata número no padrão BR (1.234,56)
function brNumber(v: number, decimals: number): string {
  return v.toLocaleString("pt-BR", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

/** Formata valor conforme Unidade_Medida. (porta fmt_value) */
export function fmtValue(value: number | null | undefined, unidade: string): string {
  if (isNil(value)) return "—";
  const v = value as number;
  const u = String(unidade).trim();

  if (u === "R$") {
    if (Math.abs(v) >= 1_000_000) return `R$ ${(v / 1_000_000).toFixed(2).replace(".", ",")}M`;
    if (Math.abs(v) >= 1_000) {
      const fmt = brNumber(Math.abs(v), 2);
      return `${v < 0 ? "−" : ""}R$ ${fmt}`;
    }
    return `R$ ${v.toFixed(2).replace(".", ",")}`;
  }
  if (u === "%") return `${v.toFixed(1)}%`;
  if (u === "Dias") return `${v.toFixed(1)} dias`;
  if (u === "Quantidade") return Math.round(v).toLocaleString("pt-BR");
  if (u === "Número") return v.toFixed(2).replace(".", ",");
  return fmtNumber(v);
}

/** (porta fmt_pct) */
export function fmtPct(value: number | null | undefined, decimals = 1): string {
  if (isNil(value)) return "—";
  return `${(value as number).toFixed(decimals)}%`;
}

/** Retorna [texto, cor] da diferença respeitando o sentido. (porta fmt_diferenca) */
export function fmtDiferenca(
  valor: number | null,
  meta: number | null,
  sentido: string,
  unidade: string,
): [string, string] {
  if (isNil(valor) || isNil(meta)) return ["—", COLOR.GRAY_MID];
  const diff = (valor as number) - (meta as number);
  let color: string;
  let prefix: string;
  if (isSentidoMenor(sentido)) {
    color = diff <= 0 ? COLOR.GREEN : COLOR.RED;
    prefix = diff <= 0 ? "" : "+";
  } else {
    color = diff >= 0 ? COLOR.GREEN : COLOR.RED;
    prefix = diff >= 0 ? "+" : "";
  }
  return [`${prefix}${fmtValue(diff, unidade)}`, color];
}

// ─── Orçamento (BRL) ─────────────────────────────────────────────────────

/** (porta _fmt_brl de orcamento_page.py) */
export function fmtBrl(value: number | null | undefined): string {
  if (isNil(value)) return "R$ 0,00";
  const v = value as number;
  if (Math.abs(v) >= 1_000_000) return `R$ ${(v / 1_000_000).toFixed(2).replace(".", ",")}M`;
  if (Math.abs(v) >= 1_000) {
    const fmt = brNumber(Math.abs(v), 2);
    return `${v < 0 ? "−" : ""}R$ ${fmt}`;
  }
  const sign = v < 0 ? "−" : "";
  return `${sign}R$ ${Math.abs(v).toFixed(2).replace(".", ",")}`;
}

// ─── Atingimento (compartilhado) ─────────────────────────────────────────

const MENOR_KEYWORDS = ["menor", "decrescente", "minimizar", "reduzir", "< meta", "abaixo"];

export function isSentidoMenor(sentido: string): boolean {
  const s = String(sentido).toLowerCase();
  return MENOR_KEYWORDS.some((k) => s.includes(k));
}

/** (porta calc_atingimento) Retorna null quando não calculável / não lançado. */
export function calcAtingimento(valor: number | null, meta: number | null, sentido: string): number | null {
  if (isNil(valor) || isNil(meta) || meta === 0) return null;
  if (isSentidoMenor(sentido)) {
    if (valor === 0) return null;
    return ((meta as number) / (valor as number)) * 100;
  }
  return ((valor as number) / (meta as number)) * 100;
}
