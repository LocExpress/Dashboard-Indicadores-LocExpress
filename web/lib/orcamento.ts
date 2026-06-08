// Orçamento BI — porta de orcamento_page.py
import { fetchCsvRows, type CsvRow } from "./data";
import { cleanBrl } from "./format";
import { parseMes, MESES_PT, MESES_ABBR } from "./meses";

export const ORCAMENTO_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vR8iI90QwsF9tUR0z8VATAKDyv8B2vf6tNJ87HaDF9sT8uibM9-t1XX58IaQ6tcXhYV3TFWQVD19CiQ/pub?gid=615632484&single=true&output=csv";

const REQUIRED = ["Data", "Ano", "Mês", "Área", "Categoria", "Empresa", "Tipo_Valor", "Valor"];

export const ORC_COLORS = {
  BLUE: "#003087",
  ORANGE: "#F47920",
  GREEN: "#00C853",
  YELLOW: "#FFB300",
  RED: "#F44336",
  GRAY: "#F3F4F6",
};

export interface OrcRow {
  Data: string;
  Ano: number | null;
  Mes: number | null;
  MesNome: string;
  Area: string;
  Categoria: string;
  Empresa: string;
  Tipo_Valor: string;
  Valor: number | null;
  Justificativa_ROI: string;
}

export interface MonthlyOrc { Ano: number | null; Mes: number | null; MesNome: string; Label: string; Orcado: number; Realizado: number; }
export interface AreaOrc { Area: string; Orcado: number; Realizado: number; Desvio: number; }

function parseDateParts(s: string): { year: number | null; month: number | null } {
  const m = (s ?? "").trim().match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})/);
  if (m) {
    let year = Number(m[3]);
    if (year < 100) year += 2000;
    return { year, month: Number(m[2]) };
  }
  const d = new Date(s);
  if (!Number.isNaN(d.getTime())) return { year: d.getFullYear(), month: d.getMonth() + 1 };
  return { year: null, month: null };
}

export interface LoadOrcResult { data: OrcRow[] | null; error: string | null; }

export async function loadOrcamento(): Promise<LoadOrcResult> {
  let raw: CsvRow[];
  try {
    raw = await fetchCsvRows(ORCAMENTO_URL);
  } catch (e) {
    return { data: null, error: `Não foi possível conectar à planilha de orçamento.\n\nDetalhe: ${e}` };
  }
  if (raw.length === 0) return { data: null, error: "A base de orçamento está vazia." };

  const cols = new Set(Object.keys(raw[0]));
  const missing = REQUIRED.filter((c) => !cols.has(c));
  if (missing.length) return { data: null, error: `Colunas ausentes na base: ${missing.map((c) => `\`${c}\``).join(", ")}` };

  const hasJust = cols.has("Justificativa_ROI");
  const out: OrcRow[] = raw.map((r) => {
    const dp = parseDateParts(r["Data"]);
    let ano: number | null = Number.isFinite(Number(r["Ano"])) && r["Ano"] !== "" ? Math.trunc(Number(r["Ano"])) : dp.year;
    let mes: number | null = parseMes(r["Mês"]) ?? dp.month;
    return {
      Data: (r["Data"] ?? "").trim(),
      Ano: ano,
      Mes: mes,
      MesNome: mes != null ? (MESES_PT[mes] ?? String(mes)) : "",
      Area: (r["Área"] ?? "").trim(),
      Categoria: (r["Categoria"] ?? "").trim(),
      Empresa: (r["Empresa"] ?? "").trim(),
      Tipo_Valor: (r["Tipo_Valor"] ?? "").trim(),
      Valor: cleanBrl(r["Valor"]),
      Justificativa_ROI: hasJust ? (r["Justificativa_ROI"] ?? "").trim() : "",
    };
  });
  return { data: out, error: null };
}

function sumBy(rows: OrcRow[], tipo: string, keyFn: (r: OrcRow) => string): Map<string, { sample: OrcRow; total: number }> {
  const map = new Map<string, { sample: OrcRow; total: number }>();
  for (const r of rows) {
    if (r.Tipo_Valor !== tipo) continue;
    const k = keyFn(r);
    const cur = map.get(k);
    const v = r.Valor ?? 0;
    if (cur) cur.total += v;
    else map.set(k, { sample: r, total: v });
  }
  return map;
}

/** Pivô mensal Orçado × Realizado. (porta _build_monthly) */
export function buildMonthly(rows: OrcRow[]): MonthlyOrc[] {
  const orc = sumBy(rows, "Orçado", (r) => `${r.Ano}||${r.Mes}`);
  const real = sumBy(rows, "Realizado", (r) => `${r.Ano}||${r.Mes}`);
  const keys = new Set([...orc.keys(), ...real.keys()]);
  const result: MonthlyOrc[] = [];
  for (const k of keys) {
    const sample = (orc.get(k) ?? real.get(k))!.sample;
    result.push({
      Ano: sample.Ano, Mes: sample.Mes, MesNome: sample.MesNome,
      Label: "", Orcado: orc.get(k)?.total ?? 0, Realizado: real.get(k)?.total ?? 0,
    });
  }
  result.sort((a, b) => (a.Ano ?? 0) - (b.Ano ?? 0) || (a.Mes ?? 0) - (b.Mes ?? 0));
  const multi = new Set(result.map((r) => r.Ano)).size > 1;
  for (const r of result) {
    r.Label = multi ? `${MESES_ABBR[r.Mes ?? 0] ?? r.Mes}/${r.Ano}` : r.MesNome;
  }
  return result;
}

/** Pivô por área com Desvio. (porta _build_area) */
export function buildArea(rows: OrcRow[]): AreaOrc[] {
  const orc = sumBy(rows, "Orçado", (r) => r.Area);
  const real = sumBy(rows, "Realizado", (r) => r.Area);
  const areas = new Set([...orc.keys(), ...real.keys()]);
  const result: AreaOrc[] = [];
  for (const a of areas) {
    const orcado = orc.get(a)?.total ?? 0;
    const realizado = real.get(a)?.total ?? 0;
    result.push({ Area: a, Orcado: orcado, Realizado: realizado, Desvio: realizado - orcado });
  }
  return result;
}
