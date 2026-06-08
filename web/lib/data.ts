// Carregamento e normalização dos dados de indicadores — porta de utils.py:load_data
import Papa from "papaparse";
import { cleanNumeric } from "./format";
import { parseMes, MESES_PT } from "./meses";
import type { IndicadorRow } from "./indicators";

export const SHEET_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vS2xFh5eXX8nGh042OkHSK9hQAjBD88kxkbCzHv0WjFp41hR5xEE9L2KM60MtRMyPf_znK13bHbwADx/pub?gid=0&single=true&output=csv";

export type CsvRow = Record<string, string>;

/** Baixa e parseia um CSV publicado, retornando linhas como objetos string. */
export async function fetchCsvRows(url: string): Promise<CsvRow[]> {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`HTTP ${res.status} ao buscar a planilha.`);
  const text = await res.text();
  const parsed = Papa.parse<CsvRow>(text, { header: true, skipEmptyLines: true });
  return (parsed.data ?? []).map((row) => {
    const clean: CsvRow = {};
    for (const [k, v] of Object.entries(row)) clean[k.trim()] = (v ?? "").toString();
    return clean;
  });
}

const DEPTO_ALIASES = ["Setor", "Sector", "Área", "Area", "Categoria"];

/** Parse data dd/mm/yyyy (dayfirst) → {year, month} ou nulls. */
function parseDateBR(s: string): { year: number | null; month: number | null } {
  if (!s) return { year: null, month: null };
  const m = s.trim().match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})/);
  if (m) {
    const day = Number(m[1]);
    const month = Number(m[2]);
    let year = Number(m[3]);
    if (year < 100) year += 2000;
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) return { year, month };
  }
  const d = new Date(s);
  if (!Number.isNaN(d.getTime())) return { year: d.getFullYear(), month: d.getMonth() + 1 };
  return { year: null, month: null };
}

export interface LoadResult {
  data: IndicadorRow[] | null;
  error: string | null;
}

/** Carrega e normaliza a planilha de indicadores. (porta load_data) */
export async function loadIndicadores(): Promise<LoadResult> {
  let raw: CsvRow[];
  try {
    raw = await fetchCsvRows(SHEET_URL);
  } catch (e) {
    return { data: null, error: `Não foi possível conectar à planilha. Certifique-se de que está publicada como CSV.\n\nDetalhe: ${e}` };
  }
  if (raw.length === 0) return { data: null, error: "A planilha está vazia." };

  const cols = new Set(Object.keys(raw[0]));
  for (const col of ["Data", "Indicador", "Meta"]) {
    if (!cols.has(col)) return { data: null, error: `Coluna obrigatória ausente: '${col}'` };
  }

  // Detecta coluna de Departamento
  let deptoCol: string | null = cols.has("Departamento") ? "Departamento" : null;
  if (!deptoCol) for (const a of DEPTO_ALIASES) if (cols.has(a)) { deptoCol = a; break; }

  const hasUnidadeMedida = cols.has("Unidade_Medida");
  const hasSentido = cols.has("Sentido_Meta");
  const hasUnidade = cols.has("Unidade");
  const hasAno = cols.has("Ano");
  const hasMes = cols.has("Mês") || cols.has("Mes");
  const mesKey = cols.has("Mês") ? "Mês" : "Mes";

  const out: IndicadorRow[] = [];
  for (const r of raw) {
    const meta = cleanNumeric(r["Meta"]);
    if (meta == null || meta <= 0) continue; // descarta linhas sem meta válida

    const { year: dYear, month: dMonth } = parseDateBR(r["Data"]);
    let ano: number | null = dYear;
    if (hasAno) { const a = Number(r["Ano"]); ano = Number.isFinite(a) && a !== 0 ? Math.trunc(a) : dYear; }
    let mes: number | null = dMonth;
    if (hasMes) { mes = parseMes(r[mesKey]) ?? dMonth; }

    const departamento = (deptoCol ? r[deptoCol] : "Geral")?.trim() || "Geral";

    out.push({
      Data: (r["Data"] ?? "").trim(),
      Departamento: departamento,
      Unidade: (hasUnidade ? r["Unidade"] : departamento)?.trim() || departamento,
      Indicador: (r["Indicador"] ?? "").trim(),
      Unidade_Medida: hasUnidadeMedida ? (r["Unidade_Medida"]?.trim() || "Número") : "Número",
      Sentido_Meta: hasSentido ? (r["Sentido_Meta"]?.trim() || "Maior") : "Maior",
      Valor: cols.has("Valor") ? cleanNumeric(r["Valor"]) : null,
      Meta: meta,
      Ano: ano,
      Mes: mes,
      MesNome: mes != null ? (MESES_PT[mes] ?? String(mes)) : "",
      Responsavel: (r["Responsável"] ?? r["Responsavel"] ?? "").trim(),
      Observacao: (r["Observação"] ?? r["Observacao"] ?? "").trim(),
    });
  }

  if (out.length === 0) return { data: null, error: "Nenhuma linha com Meta válida encontrada." };
  return { data: out, error: null };
}
