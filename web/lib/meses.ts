// Mapas de meses — porta de utils.py / sge_page.py

export const MESES_PT: Record<number, string> = {
  1: "Janeiro", 2: "Fevereiro", 3: "Março", 4: "Abril",
  5: "Maio", 6: "Junho", 7: "Julho", 8: "Agosto",
  9: "Setembro", 10: "Outubro", 11: "Novembro", 12: "Dezembro",
};

export const MESES_ABBR: Record<number, string> = {
  1: "Jan", 2: "Fev", 3: "Mar", 4: "Abr",
  5: "Mai", 6: "Jun", 7: "Jul", 8: "Ago",
  9: "Set", 10: "Out", 11: "Nov", 12: "Dez",
};

const MESES_LOWER: Record<string, number> = {};
for (const [k, v] of Object.entries(MESES_PT)) MESES_LOWER[v.toLowerCase()] = Number(k);
for (const [k, v] of Object.entries(MESES_ABBR)) MESES_LOWER[v.toLowerCase()] = Number(k);

/** Converte número ou nome do mês → número 1..12, ou null. */
export function parseMes(val: unknown): number | null {
  if (val == null || val === "") return null;
  const n = Number(val);
  if (Number.isFinite(n) && n >= 1 && n <= 12) return Math.trunc(n);
  const key = String(val).trim().toLowerCase();
  return MESES_LOWER[key] ?? null;
}
