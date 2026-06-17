// Diagnóstico SGE — porta de sge_page.py
import { fetchCsvRows, type CsvRow } from "./data";

// Aba "BaseGeral" (resultados) da planilha SGE — formato longo:
// DATA | SETOR | ASSUNTO | AVALIAÇÃO. As metas ficam na aba "Base_meta".
export const SGE_GERAL_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vRFPj-rkhAoUxGZ3zODnfN-3jGIdbHTP1l3mcLFnGhFneHjJQRzzsoXijLoxEAT8Vqb-W6Annqcpx8d/pub?gid=225370926&single=true&output=csv";

export const SGE_COLORS = {
  BLUE: "#2D3192",
  ORANGE: "#F47920",
  GREEN: "#00C853",
  YELLOW: "#FFB300",
  RED: "#F44336",
  GRAY: "#6B7280",
};

export const SETORES_FULL: Record<string, string> = {
  "IMP.": "Implantação", "PER.": "Performance", "COM.": "Comercial",
  "MKT.": "Marketing", "DP/RH": "DP/RH", "FIN.": "Financeiro",
  "ADM.": "Administrativo",
};

export const MESES_SGE = ["JANEIRO", "FEVEREIRO", "MARÇO", "ABRIL", "MAIO", "JUNHO",
  "JULHO", "AGOSTO", "SETEMBRO", "OUTUBRO", "NOVEMBRO", "DEZEMBRO"];
export const MESES_ABBR_SGE = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

export const REGRAS_CALCULO: Record<string, string> = {
  "INDICADORES DE DESEMPENHO": "1 indicador = 3 pts; 2 indicadores = 5 pts",
  "R.A.R - REUNIÃO DE APRESENTAÇÃO DE RESULTADOS - equipe": "Realizado = 5 pts",
  "R.A.R - REUNIÃO DE APRESENTAÇÃO DE RESULTADOS - diretoria": "Realizado = 5 pts",
  "TRP - TÉCNICA DE RESOLUÇÃO DE PROBLEMAS": "1 TRP = 3 pts; 2+ TRPs = 5 pts",
  "FLUXOGRAMAS": "100% mapeados + atualiz. <90 dias = 5 pts; Parcial = 3 pts",
  "FUNCIONOGRAMAS": "100% preenchidos + atualiz. <90 dias = 5 pts; Parcial = 3 pts",
  "POP'S": "100% POPs + utilização = 5 pts; Parcial = 3 pts",
  "REUNIÃO DO BOM DIA": "1-2 registros = 3 pts; 3+ = 5 pts",
  "AUTODIAGNÓSTICO": "1 evidência = 5 pts",
  "BENCHMARKING": "1 evidência = 5 pts",
  "PDI": "Ter PDI = 5 pts; Não ter = 0",
  "PLANO DE DESENVOLVIMENTO DE BACKUP": "Ter plano atualizado = 5 pts",
  "CUMBUCA": "1-2 registros = 3 pts; 3+ = 5 pts",
  "T&D": "1-2 registros = 3 pts; 3+ = 5 pts",
};

export function norm(s: unknown): string {
  return String(s).toUpperCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();
}

export function sgeStatusColor(pct: number | null): string {
  if (pct == null || Number.isNaN(pct)) return SGE_COLORS.GRAY;
  if (pct >= 80) return SGE_COLORS.GREEN;
  if (pct >= 60) return SGE_COLORS.YELLOW;
  return SGE_COLORS.RED;
}

export function sgeStatusIcon(pct: number | null): string {
  if (pct == null || Number.isNaN(pct)) return "⬜";
  if (pct >= 80) return "✅";
  if (pct >= 60) return "⚠️";
  return "🚨";
}

export interface SgeRow {
  ANO: number;
  MES: number;
  SETOR: string;
  ASSUNTO: string;
  PONTOS: number | null;
  AVALIADO: boolean;
  MAXIMO: number;
}

function parseScore(v: unknown): number | null {
  const s = String(v ?? "").trim();
  if (["-", "", "nan", "None", "N/A"].includes(s)) return null;
  const n = Number(s.replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

function parseDateParts(s: string): { year: number; month: number } | null {
  const m = (s ?? "").trim().match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})/);
  if (m) {
    let year = Number(m[3]);
    if (year < 100) year += 2000;
    const month = Number(m[2]);
    if (month >= 1 && month <= 12) return { year, month };
  }
  const d = new Date(s);
  if (!Number.isNaN(d.getTime())) return { year: d.getFullYear(), month: d.getMonth() + 1 };
  return null;
}

/** Parseia as linhas brutas do SGE. (porta _parse_sge) */
export function parseSge(raw: CsvRow[]): SgeRow[] {
  if (raw.length === 0) return [];
  const colMap: Record<string, string> = {};
  for (const c of Object.keys(raw[0])) {
    const cn = norm(c);
    if (cn.includes("DATA")) colMap[c] = "DATA";
    else if (cn.includes("SETOR")) colMap[c] = "SETOR";
    else if (cn.includes("ASSUNTO")) colMap[c] = "ASSUNTO";
    else if (cn.includes("AVALI")) colMap[c] = "AVALIACAO";
    else if (["MAXIMO", "MAX", "PONTOS MAX", "PONTOS_MAX", "MAXIMOS", "MAXI", "PESO", "TOTAL MAX"].includes(cn))
      colMap[c] = "MAXIMO";
  }
  const inv: Record<string, string> = {};
  for (const [orig, std] of Object.entries(colMap)) inv[std] = orig;
  for (const needed of ["DATA", "SETOR", "ASSUNTO", "AVALIACAO"]) if (!(needed in inv)) return [];

  const hasMax = "MAXIMO" in inv;
  const out: SgeRow[] = [];
  for (const r of raw) {
    const dp = parseDateParts(r[inv["DATA"]]);
    if (!dp) continue;
    const pontos = parseScore(r[inv["AVALIACAO"]]);
    let maximo = 5.0;
    if (hasMax) { const mx = parseScore(r[inv["MAXIMO"]]); maximo = mx == null ? 5.0 : mx; }
    out.push({
      ANO: dp.year,
      MES: dp.month,
      SETOR: (r[inv["SETOR"]] ?? "").trim(),
      ASSUNTO: (r[inv["ASSUNTO"]] ?? "").trim(),
      PONTOS: pontos,
      AVALIADO: pontos != null,
      MAXIMO: maximo,
    });
  }
  return out;
}

/** % geral do setor = soma(PONTOS)/soma(MAXIMO)*100. (porta _calc_pct_setor) */
export function calcPctSetor(df: SgeRow[], setor: string, mes?: number | null): number | null {
  const sub = df.filter((r) => norm(r.SETOR) === norm(setor) && (mes == null || r.MES === mes) && r.AVALIADO);
  if (sub.length === 0) return null;
  const pts = sub.reduce((a, r) => a + (r.PONTOS ?? 0), 0);
  const maxi = sub.reduce((a, r) => a + r.MAXIMO, 0);
  return maxi > 0 ? (pts / maxi) * 100 : null;
}

/** Retorna [pts, maxi, pct] de um item+setor. (porta _calc_pct_item_setor) */
export function calcPctItemSetor(
  df: SgeRow[], assunto: string, setor: string, mes?: number | null,
): [number | null, number | null, number | null] {
  const sub = df.filter(
    (r) => norm(r.ASSUNTO) === norm(assunto) && norm(r.SETOR) === norm(setor) && (mes == null || r.MES === mes) && r.AVALIADO,
  );
  if (sub.length === 0) return [null, null, null];
  const pts = sub.reduce((a, r) => a + (r.PONTOS ?? 0), 0);
  const maxi = sub.reduce((a, r) => a + r.MAXIMO, 0);
  return [pts, maxi, maxi > 0 ? (pts / maxi) * 100 : null];
}

export function findRegra(assunto: string): string {
  for (const [k, v] of Object.entries(REGRAS_CALCULO)) {
    if (norm(k).includes(norm(assunto)) || norm(assunto).includes(norm(k))) return v;
  }
  return "Pontuação por evidência apresentada";
}

export interface LoadSgeResult {
  data: SgeRow[] | null;
  error: string | null;
}

// --- Pivot-format parser (new sheet: months as columns) ---

const SETORES_PIVOT = ["IMP.", "PER.", "COM.", "MKT.", "DP/RH", "FIN.", "ADM."];
const MESES_NORM = MESES_SGE.map((m) =>
  m.normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase()
);

// Full CSV parser that handles multi-line quoted fields and escaped quotes ("")
function parseCsvRows(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cur = "";
  let inQ = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const nx = text[i + 1];
    if (inQ) {
      if (ch === '"' && nx === '"') { cur += '"'; i++; }
      else if (ch === '"') { inQ = false; }
      else { cur += ch; }
    } else {
      if (ch === '"') { inQ = true; }
      else if (ch === ',') { row.push(cur.trim()); cur = ""; }
      else if (ch === '\r' && nx === '\n') {
        row.push(cur.trim()); cur = "";
        if (row.some(c => c !== "")) rows.push(row);
        row = []; i++;
      } else if (ch === '\n' || ch === '\r') {
        row.push(cur.trim()); cur = "";
        if (row.some(c => c !== "")) rows.push(row);
        row = [];
      } else { cur += ch; }
    }
  }
  if (cur || row.length > 0) {
    row.push(cur.trim());
    if (row.some(c => c !== "")) rows.push(row);
  }
  return rows;
}

function parseSgePivot(text: string): SgeRow[] {
  const rows = parseCsvRows(text);
  const ano = new Date().getFullYear();

  // Find the row that contains month names (JANEIRO, FEVEREIRO …)
  let monthRowIdx = -1;
  const monthCols: { mes: number; startCol: number }[] = [];
  for (let ri = 0; ri < Math.min(rows.length, 8); ri++) {
    const normed = rows[ri].map((c) =>
      c.normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase().trim()
    );
    if (normed.some((c) => MESES_NORM.includes(c))) {
      monthRowIdx = ri;
      for (let ci = 0; ci < normed.length; ci++) {
        const mi = MESES_NORM.indexOf(normed[ci]);
        if (mi >= 0) monthCols.push({ mes: mi + 1, startCol: ci });
      }
      break;
    }
  }
  if (monthRowIdx === -1 || monthCols.length === 0) return [];

  // Data rows start 2 rows after the month header
  const out: SgeRow[] = [];
  for (let ri = monthRowIdx + 2; ri < rows.length; ri++) {
    const row = rows[ri];
    const itemNum = (row[1] ?? "").trim();
    const assunto = (row[2] ?? "").trim();
    if (!assunto) continue;
    if (/STATUS/i.test(assunto) || /ASSUNTOS/i.test(assunto)) continue;
    // Accept rows with numeric item number OR empty item number (e.g. T&D has no number)
    if (itemNum && !/^\d+$/.test(itemNum)) continue;

    for (const { mes, startCol } of monthCols) {
      for (let d = 0; d < SETORES_PIVOT.length; d++) {
        const ci = startCol + d;
        const raw = ci < row.length ? row[ci] : "";
        const pontos = parseScore(raw);
        out.push({
          ANO: ano,
          MES: mes,
          SETOR: SETORES_PIVOT[d],
          ASSUNTO: assunto,
          PONTOS: pontos,
          AVALIADO: pontos !== null,
          MAXIMO: 5,
        });
      }
    }
  }
  return out;
}

export async function loadSge(): Promise<LoadSgeResult> {
  try {
    const res = await fetch(SGE_GERAL_URL, { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const text = await res.text();
    const parsed = parseSgePivot(text);
    if (parsed.length === 0) return { data: null, error: "Nenhum dado encontrado na planilha." };
    return { data: parsed, error: null };
  } catch (e) {
    return { data: null, error: String(e) };
  }
}
