// Faturamento das unidades (Performance) — carrega CSV publicado.
import { fetchCsvRows, type CsvRow } from "./data";
import { cleanBrl, cleanNumeric } from "./format";
import { parseMes, MESES_PT } from "./meses";

export const FATURAMENTO_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vQofA2ieHZkTrjbfSTntFbF2Ol-NX39_SYwoiR6L39RRymYp04ToZWbiKXeZY0wUN6BWJ3vh_j2n9HR/pub?gid=2109841240&single=true&output=csv";

export interface FatRow {
  Ano: number | null;
  Mes: number | null;
  MesNome: string;
  Franquia: string;
  Faturamento: number;
  Locacao: number;
  Renovacao: number;
  Servicos: number;
  Venda: number;
  Manutencao: number;
  Projeto: string;
  Cidade: string;
  Estado: string;
  Regiao: string;
  TempoImplantacao: string;
  Crescimento: number | null;
  Meta: number | null;
}

export interface LoadFatResult { data: FatRow[] | null; error: string | null; }

function regiaoCurta(s: string): string {
  // "Norte, Brasil" -> "Norte"
  return (s ?? "").split(",")[0].trim();
}

export async function loadFaturamento(): Promise<LoadFatResult> {
  let raw: CsvRow[];
  try {
    raw = await fetchCsvRows(FATURAMENTO_URL);
  } catch (e) {
    return { data: null, error: `Não foi possível conectar à planilha de faturamento.\n\nDetalhe: ${e}` };
  }
  if (raw.length === 0) return { data: null, error: "A base de faturamento está vazia." };

  const out: FatRow[] = raw
    .map((r) => {
      const mes = parseMes(r["MÊS"]);
      const ano = Number.isFinite(Number(r["ANO"])) && r["ANO"] !== "" ? Math.trunc(Number(r["ANO"])) : null;
      return {
        Ano: ano,
        Mes: mes,
        MesNome: mes != null ? (MESES_PT[mes] ?? String(mes)) : "",
        Franquia: (r["FRANQUIA"] ?? "").trim(),
        Faturamento: cleanBrl(r["FATURAMENTO"]) ?? 0,
        Locacao: cleanBrl(r["LOCACAO VALOR"]) ?? 0,
        Renovacao: cleanBrl(r["RENOVAÇÃO VALOR"]) ?? 0,
        Servicos: cleanBrl(r["SERVIÇOS VALOR"]) ?? 0,
        Venda: cleanBrl(r["VENDA VALOR"]) ?? 0,
        Manutencao: cleanBrl(r["MANUTENÇÃO VALOR"]) ?? 0,
        Projeto: (r["PROJETO"] ?? "").trim() || "—",
        Cidade: (r["CIDADE"] ?? "").trim(),
        Estado: (r["ESTADO"] ?? "").trim(),
        Regiao: regiaoCurta(r["REGIÃO"]) || "—",
        TempoImplantacao: (r["TEMPO DE IMPLANTAÇÃO"] ?? "").trim(),
        Crescimento: cleanNumeric(r["Crescimento Mensal"]),
        Meta: cleanBrl(r["Meta_Playnee"]),
      };
    })
    .filter((r) => r.Franquia !== "");

  return { data: out, error: null };
}
