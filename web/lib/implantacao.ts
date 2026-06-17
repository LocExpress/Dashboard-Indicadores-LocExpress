// Implantação / cadastro das unidades — carrega CSV publicado.
import { fetchCsvRows, type CsvRow } from "./data";

export const IMPLANTACAO_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vQofA2ieHZkTrjbfSTntFbF2Ol-NX39_SYwoiR6L39RRymYp04ToZWbiKXeZY0wUN6BWJ3vh_j2n9HR/pub?gid=445194758&single=true&output=csv";

const SISTEMAS = new Set(["SISLOC", "WAYEXPRESS"]);

export interface ImplRow {
  Franquia: string;
  Projeto: string;
  Sistema: string;
  Estado: string;
  Cidade: string;
  Regiao: string;
  Status: string;
  Aderencia: string;
  Tempo: number | null;
  AnoInaug: number | null;
  Consultor: string;
  Diretor: string;
}

export interface LoadImplResult { data: ImplRow[] | null; error: string | null; }

function num(v: string): number | null {
  const s = String(v ?? "").trim().replace(/\./g, "").replace(",", ".");
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

export async function loadImplantacao(): Promise<LoadImplResult> {
  let raw: CsvRow[];
  try {
    raw = await fetchCsvRows(IMPLANTACAO_URL);
  } catch (e) {
    return { data: null, error: `Não foi possível conectar à planilha de implantação.\n\nDetalhe: ${e}` };
  }
  if (raw.length === 0) return { data: null, error: "A base de implantação está vazia." };

  const out: ImplRow[] = raw
    .map((r) => {
      const sis = (r["SISTEMA"] ?? "").trim().toUpperCase();
      const m = (r["INAUGURAÇÃO"] ?? "").trim().match(/(\d{4})\s*$/);
      return {
        Franquia: (r["FRANQUIA"] ?? "").trim(),
        Projeto: (r["PROJETO"] ?? "").trim() || "—",
        Sistema: SISTEMAS.has(sis) ? sis : "",
        Estado: (r["ESTADO"] ?? "").trim(),
        Cidade: (r["CIDADE"] ?? "").trim(),
        Regiao: (r["REGIÃO"] ?? "").split(",")[0].trim() || "—",
        Status: (r["STATUS"] ?? "").trim() || "Sem status",
        Aderencia: (r["ADERÊNCIA"] ?? "").trim(),
        Tempo: num(r["TEMPO DE IMPLANTAÇÃO"]),
        AnoInaug: m ? Number(m[1]) : null,
        Consultor: (r["CONSULTOR"] ?? "").trim(),
        Diretor: (r["DIRETOR"] ?? "").trim(),
      };
    })
    .filter((r) => r.Franquia !== "");

  return { data: out, error: null };
}
