// RH — indicadores de pessoal (salários, benefícios, custos).
// Dados sensíveis: a planilha é buscada SÓ no servidor (app/api/rh), após senha.
import type { CsvRow } from "./data";

export interface RhRow {
  unidade: string;
  situacao: string;
  funcionario: string;
  funcao: string;
  setor: string;
  sexo: string;
  tempoCasa: number;
  salarioBruto: number;
  insalubridade: number;
  ppr: number;
  bonus: number;
  planoSaude: number;
  valeAlimentacao: number;
  seguroVida: number;
  auxilioCombustivel: number;
  vt: number;
  descontoVt: number;
  custoFgts: number;
  custoTotal: number;
  beneficios: number;
}

/** Normaliza um cabeçalho/string: maiúsculas, sem acento, sem espaços extras. */
function norm(s: unknown): string {
  return String(s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase().trim();
}

/**
 * Parser de número no padrão BR usado na planilha de RH:
 *  - "2.061"   → 2061   (ponto = milhar, sem decimais)
 *  - "604,03"  → 604.03 (vírgula = decimal)
 *  - "1.234,56"→ 1234.56
 *  - "2,91"    → 2.91
 *  - ""/"-"    → 0
 */
function brMoney(v: unknown): number {
  let s = String(v ?? "").trim();
  if (!s || s === "-" || s === "—") return 0;
  s = s.replace(/[R$\s]/g, "");
  if (s.includes(",")) {
    s = s.replace(/\./g, "").replace(",", ".");
  } else {
    s = s.replace(/\./g, "");
  }
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
}

export function parseRh(raw: CsvRow[]): RhRow[] {
  if (raw.length === 0) return [];

  // Mapa normalizado → chave original (cabeçalhos têm acentos/espaços variados).
  const keyByNorm: Record<string, string> = {};
  for (const k of Object.keys(raw[0])) keyByNorm[norm(k)] = k;

  // Acha a chave cujo nome normalizado bate (exato ou contém).
  const find = (...needles: string[]): string | null => {
    for (const nd of needles) {
      const target = norm(nd);
      if (keyByNorm[target]) return keyByNorm[target]; // exato
    }
    for (const nd of needles) {
      const target = norm(nd);
      for (const [nk, orig] of Object.entries(keyByNorm)) {
        if (nk.includes(target)) return orig;
      }
    }
    return null;
  };

  const kUnidade = find("UNIDADE");
  const kSituacao = find("SITUACAO");
  const kFuncionario = find("FUNCIONARIO");
  const kFuncao = find("FUNCAO");
  const kSetor = find("SETOR");
  const kSexo = find("SEXO");
  const kTempo = find("TEMPO DE CASA");
  const kSalario = find("SALARIO BRUTO", "SALARIO");
  const kInsal = find("INSALUBRIDADE");
  const kPpr = find("PPR");
  const kBonus = find("BONUS");
  const kPlano = find("PLANO DE SAUDE");
  const kVa = find("VALE ALIMENTACAO");
  const kSeguro = find("SEGURO DE VIDA");
  const kComb = find("AUXILIO COMBUSTIVEL");
  const kDescVt = find("DESCONTO VT");
  // VT exato (evita casar com "DESCONTO VT")
  const kVt = keyByNorm["VT"] ?? null;
  const kFgts = find("CUSTO FGTS");
  const kTotal = find("CUSTO TOTAL");

  const str = (r: CsvRow, k: string | null) => (k ? String(r[k] ?? "").trim() : "");
  const num = (r: CsvRow, k: string | null) => (k ? brMoney(r[k]) : 0);

  const out: RhRow[] = [];
  for (const r of raw) {
    const funcionario = str(r, kFuncionario);
    if (!funcionario) continue; // ignora linhas sem nome (rodapés/totais)

    const planoSaude = num(r, kPlano);
    const valeAlimentacao = num(r, kVa);
    const seguroVida = num(r, kSeguro);
    const auxilioCombustivel = num(r, kComb);
    const vt = num(r, kVt);

    out.push({
      unidade: str(r, kUnidade),
      situacao: str(r, kSituacao),
      funcionario,
      funcao: str(r, kFuncao),
      setor: str(r, kSetor),
      sexo: str(r, kSexo),
      tempoCasa: num(r, kTempo),
      salarioBruto: num(r, kSalario),
      insalubridade: num(r, kInsal),
      ppr: num(r, kPpr),
      bonus: num(r, kBonus),
      planoSaude,
      valeAlimentacao,
      seguroVida,
      auxilioCombustivel,
      vt,
      descontoVt: num(r, kDescVt),
      custoFgts: num(r, kFgts),
      custoTotal: num(r, kTotal),
      beneficios: planoSaude + valeAlimentacao + seguroVida + auxilioCombustivel + vt,
    });
  }
  return out;
}

export interface RhTotais {
  headcount: number;
  folhaBruta: number;
  custoTotal: number;
  salarioMedio: number;
  beneficios: number;
}

export function calcTotais(rows: RhRow[]): RhTotais {
  const headcount = rows.length;
  const folhaBruta = rows.reduce((a, r) => a + r.salarioBruto, 0);
  const custoTotal = rows.reduce((a, r) => a + r.custoTotal, 0);
  const beneficios = rows.reduce((a, r) => a + r.beneficios, 0);
  return {
    headcount,
    folhaBruta,
    custoTotal,
    salarioMedio: headcount > 0 ? folhaBruta / headcount : 0,
    beneficios,
  };
}

export interface RhGrupo {
  chave: string;
  headcount: number;
  folhaBruta: number;
  custoTotal: number;
}

/** Agrupa por unidade ou setor, somando folha e custo. */
export function agrupar(rows: RhRow[], campo: "unidade" | "setor"): RhGrupo[] {
  const map = new Map<string, RhGrupo>();
  for (const r of rows) {
    const chave = (r[campo] || "(sem)").trim();
    const g = map.get(chave) ?? { chave, headcount: 0, folhaBruta: 0, custoTotal: 0 };
    g.headcount += 1;
    g.folhaBruta += r.salarioBruto;
    g.custoTotal += r.custoTotal;
    map.set(chave, g);
  }
  return [...map.values()].sort((a, b) => b.custoTotal - a.custoTotal);
}
