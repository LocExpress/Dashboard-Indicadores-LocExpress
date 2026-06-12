// RH — indicadores de pessoal (salários, benefícios, custos, rescisão).
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
  dataAdmissao: string;
  mesesCasa: number;
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
  ativo: boolean;
  // Projeção de rescisão (cenário: demitir hoje)
  resc13: number;
  rescFerias: number;
  rescAviso: number;
  rescMulta40: number;
  rescTotal: number;
}

/** Normaliza um cabeçalho/string: maiúsculas, sem acento, sem espaços extras. */
function norm(s: unknown): string {
  return String(s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase().trim();
}

/**
 * Parser de número no padrão BR usado na planilha de RH:
 *  - "2.061"   → 2061   (ponto = milhar, sem decimais)
 *  - "604,03"  → 604.03 (vírgula = decimal)
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

function parseBRDate(s: string): Date | null {
  const m = String(s ?? "").trim().match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})/);
  if (!m) return null;
  let y = Number(m[3]); if (y < 100) y += 2000;
  const mo = Number(m[2]), d = Number(m[1]);
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
  return new Date(y, mo - 1, d);
}

/** Meses completos entre duas datas. */
function mesesEntre(ini: Date, fim: Date): number {
  let m = (fim.getFullYear() - ini.getFullYear()) * 12 + (fim.getMonth() - ini.getMonth());
  if (fim.getDate() < ini.getDate()) m -= 1;
  return Math.max(0, m);
}

export interface Rescisao {
  meses: number;
  resc13: number;
  rescFerias: number;
  rescAviso: number;
  rescMulta40: number;
  total: number;
}

/**
 * Custo de rescisão sem justa causa, cenário "demitir hoje".
 *  - 13º proporcional .......... salário × meses_no_ano / 12
 *  - Férias prop. + 1/3 ........ salário × 1,3333 × meses_aquisitivo / 12
 *  - Aviso prévio indenizado ... salário × min(30 + 3×anos, 90) / 30  (máx 3 salários)
 *  - Multa 40% FGTS ............ 40% × (8% × salário × meses de casa)
 */
export function calcRescisao(salario: number, admissao: Date | null, hoje: Date): Rescisao {
  if (!salario || !admissao) {
    return { meses: 0, resc13: 0, rescFerias: 0, rescAviso: 0, rescMulta40: 0, total: 0 };
  }
  const meses = mesesEntre(admissao, hoje);
  const anos = Math.floor(meses / 12);

  // meses trabalhados no ano corrente (para 13º)
  const inicioAno = new Date(hoje.getFullYear(), 0, 1);
  const refIni = admissao > inicioAno ? admissao : inicioAno;
  const mesesNoAno = Math.min(12, Math.max(0, (hoje.getFullYear() - refIni.getFullYear()) * 12 + (hoje.getMonth() - refIni.getMonth()) + 1));

  // meses do período aquisitivo atual de férias
  const mesesAquisitivo = meses % 12;

  const resc13 = salario * (mesesNoAno / 12);
  const rescFerias = salario * (4 / 3) * (mesesAquisitivo / 12);
  const diasAviso = Math.min(30 + 3 * anos, 90);
  const rescAviso = salario * (diasAviso / 30);
  const rescMulta40 = 0.4 * 0.08 * salario * meses;

  const total = resc13 + rescFerias + rescAviso + rescMulta40;
  return { meses, resc13, rescFerias, rescAviso, rescMulta40, total };
}

export function parseRh(raw: CsvRow[]): RhRow[] {
  if (raw.length === 0) return [];

  const keyByNorm: Record<string, string> = {};
  for (const k of Object.keys(raw[0])) keyByNorm[norm(k)] = k;

  const find = (...needles: string[]): string | null => {
    for (const nd of needles) {
      const target = norm(nd);
      if (keyByNorm[target]) return keyByNorm[target];
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
  const kAdmissao = find("DATA ADMISSAO");
  const kHoje = find("HOJE");
  const kSalario = find("SALARIO BRUTO", "SALARIO");
  const kInsal = find("INSALUBRIDADE");
  const kPpr = find("PPR");
  const kBonus = find("BONUS");
  const kPlano = find("PLANO DE SAUDE");
  const kVa = find("VALE ALIMENTACAO");
  const kSeguro = find("SEGURO DE VIDA");
  const kComb = find("AUXILIO COMBUSTIVEL");
  const kDescVt = find("DESCONTO VT");
  const kVt = keyByNorm["VT"] ?? null;
  const kFgts = find("CUSTO FGTS");
  const kTotal = find("CUSTO TOTAL");

  const str = (r: CsvRow, k: string | null) => (k ? String(r[k] ?? "").trim() : "");
  const num = (r: CsvRow, k: string | null) => (k ? brMoney(r[k]) : 0);

  const out: RhRow[] = [];
  for (const r of raw) {
    const funcionario = str(r, kFuncionario);
    if (!funcionario) continue;

    const planoSaude = num(r, kPlano);
    const valeAlimentacao = num(r, kVa);
    const seguroVida = num(r, kSeguro);
    const auxilioCombustivel = num(r, kComb);
    const vt = num(r, kVt);
    const salarioBruto = num(r, kSalario);
    const situacao = str(r, kSituacao);
    const dataAdmissaoStr = str(r, kAdmissao);
    const admissao = parseBRDate(dataAdmissaoStr);
    const hoje = parseBRDate(str(r, kHoje)) ?? new Date();
    const mesesCasa = admissao ? mesesEntre(admissao, hoje) : Math.round(num(r, kTempo) * 12);

    const ativo = norm(situacao) === "ATIVO";
    const resc = ativo
      ? calcRescisao(salarioBruto, admissao, hoje)
      : { meses: mesesCasa, resc13: 0, rescFerias: 0, rescAviso: 0, rescMulta40: 0, total: 0 };

    out.push({
      unidade: str(r, kUnidade),
      situacao,
      funcionario,
      funcao: str(r, kFuncao),
      setor: str(r, kSetor),
      sexo: str(r, kSexo),
      tempoCasa: num(r, kTempo),
      dataAdmissao: dataAdmissaoStr,
      mesesCasa,
      salarioBruto,
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
      ativo,
      resc13: resc.resc13,
      rescFerias: resc.rescFerias,
      rescAviso: resc.rescAviso,
      rescMulta40: resc.rescMulta40,
      rescTotal: resc.total,
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

export interface RhTotaisResc {
  resc13: number;
  rescFerias: number;
  rescAviso: number;
  rescMulta40: number;
  rescTotal: number;
  qtdAtivos: number;
}

/** Soma das rescisões projetadas (apenas ativos). */
export function calcTotaisRescisao(rows: RhRow[]): RhTotaisResc {
  const ativos = rows.filter((r) => r.ativo);
  return {
    resc13: ativos.reduce((a, r) => a + r.resc13, 0),
    rescFerias: ativos.reduce((a, r) => a + r.rescFerias, 0),
    rescAviso: ativos.reduce((a, r) => a + r.rescAviso, 0),
    rescMulta40: ativos.reduce((a, r) => a + r.rescMulta40, 0),
    rescTotal: ativos.reduce((a, r) => a + r.rescTotal, 0),
    qtdAtivos: ativos.length,
  };
}

export interface RhGrupo {
  chave: string;
  headcount: number;
  folhaBruta: number;
  custoTotal: number;
  rescTotal: number;
}

/** Agrupa por unidade ou setor, somando folha, custo e rescisão. */
export function agrupar(rows: RhRow[], campo: "unidade" | "setor"): RhGrupo[] {
  const map = new Map<string, RhGrupo>();
  for (const r of rows) {
    const chave = (r[campo] || "(sem)").trim();
    const g = map.get(chave) ?? { chave, headcount: 0, folhaBruta: 0, custoTotal: 0, rescTotal: 0 };
    g.headcount += 1;
    g.folhaBruta += r.salarioBruto;
    g.custoTotal += r.custoTotal;
    g.rescTotal += r.rescTotal;
    map.set(chave, g);
  }
  return [...map.values()].sort((a, b) => b.custoTotal - a.custoTotal);
}
