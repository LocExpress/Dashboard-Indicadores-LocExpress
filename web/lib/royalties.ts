// Royalties e Fundo de Marketing — carrega CSV publicado.
import { fetchCsvRows, type CsvRow } from "./data";
import { cleanBrl } from "./format";
import { parseMes, MESES_PT } from "./meses";

export const ROYALTIES_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vQofA2ieHZkTrjbfSTntFbF2Ol-NX39_SYwoiR6L39RRymYp04ToZWbiKXeZY0wUN6BWJ3vh_j2n9HR/pub?gid=553828179&single=true&output=csv";

export interface RoyRow {
  Ano: number | null;
  Mes: number | null;
  MesNome: string;
  Franquia: string;
  Faturamento: number;
  Royalties: number;
  FundoMkt: number;
  TaxaAdm: number;
  Bruto: number;
  Liquido: number;
}

export interface LoadRoyResult { data: RoyRow[] | null; error: string | null; }

export async function loadRoyalties(): Promise<LoadRoyResult> {
  let raw: CsvRow[];
  try {
    raw = await fetchCsvRows(ROYALTIES_URL);
  } catch (e) {
    return { data: null, error: `Não foi possível conectar à planilha de royalties.\n\nDetalhe: ${e}` };
  }
  if (raw.length === 0) return { data: null, error: "A base de royalties está vazia." };

  const out: RoyRow[] = raw
    .map((r) => {
      const mes = parseMes(r["MÊS"]);
      const ano = Number.isFinite(Number(r["ANO"])) && r["ANO"] !== "" ? Math.trunc(Number(r["ANO"])) : null;
      return {
        Ano: ano,
        Mes: mes,
        MesNome: mes != null ? (MESES_PT[mes] ?? String(mes)) : "",
        Franquia: (r["FRANQUIA"] ?? "").trim(),
        Faturamento: cleanBrl(r["FATURAMENTO"]) ?? 0,
        Royalties: cleanBrl(r["Royalties"]) ?? 0,
        FundoMkt: cleanBrl(r["Fundo de Marketing"]) ?? 0,
        TaxaAdm: cleanBrl(r["Taxa Administrativa"]) ?? 0,
        Bruto: cleanBrl(r["VL_BRUTO_CATEGORIA"]) ?? 0,
        Liquido: cleanBrl(r["VL_LIQUIDO_CATEGORIA"]) ?? 0,
      };
    })
    .filter((r) => r.Franquia !== "");

  return { data: out, error: null };
}
