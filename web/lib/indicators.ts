// Agregação de indicadores — porta de utils.py
import { calcAtingimento } from "./format";
import { getAggType } from "./theme";
import { MESES_PT, MESES_ABBR } from "./meses";

export interface IndicadorRow {
  Data: string;
  Departamento: string;
  Unidade: string;
  Indicador: string;
  Unidade_Medida: string;
  Sentido_Meta: string;
  Valor: number | null; // null = não lançado
  Meta: number;
  Ano: number | null;
  Mes: number | null;
  MesNome: string;
  Responsavel: string;
  Observacao: string;
}

export interface AggRow {
  Departamento: string;
  Indicador: string;
  Unidade_Medida: string;
  Sentido_Meta: string;
  Valor: number | null;
  Meta: number | null;
  Atingimento: number | null;
}

export interface MonthlyRow {
  Ano: number | null;
  Mes: number | null;
  Label: string;
  Valor: number | null;
  Meta: number | null;
  Atingimento: number | null;
}

// soma respeitando min_count=1: null se todos null
function sumMinCount(vals: (number | null)[]): number | null {
  const present = vals.filter((v): v is number => v != null && !Number.isNaN(v));
  if (present.length === 0) return null;
  return present.reduce((a, b) => a + b, 0);
}

function mean(vals: (number | null)[]): number | null {
  const present = vals.filter((v): v is number => v != null && !Number.isNaN(v));
  if (present.length === 0) return null;
  return present.reduce((a, b) => a + b, 0) / present.length;
}

/** Agrega Valor e Meta pelo método correto. (porta _agg_valor_meta) */
export function aggValorMeta(
  group: IndicadorRow[],
  aggType: "sum" | "mean",
): { valor: number | null; meta: number | null } {
  if (aggType === "sum") {
    return {
      valor: sumMinCount(group.map((r) => r.Valor)),
      meta: sumMinCount(group.map((r) => r.Meta)),
    };
  }
  return {
    valor: mean(group.map((r) => r.Valor)),
    meta: mean(group.map((r) => r.Meta)),
  };
}

function groupByKeys<T>(rows: T[], keyFn: (r: T) => string): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const r of rows) {
    const k = keyFn(r);
    const arr = map.get(k);
    if (arr) arr.push(r);
    else map.set(k, [r]);
  }
  return map;
}

/** Uma linha por (Departamento, Indicador) com Atingimento. (porta agg_indicators) */
export function aggIndicators(df: IndicadorRow[]): AggRow[] {
  const groups = groupByKeys(df, (r) => `${r.Departamento}||${r.Indicador}`);
  const rows: AggRow[] = [];
  for (const grp of groups.values()) {
    const unidade = grp[0].Unidade_Medida;
    const sentido = grp[0].Sentido_Meta;
    const aggT = getAggType(unidade);
    const { valor, meta } = aggValorMeta(grp, aggT);
    rows.push({
      Departamento: grp[0].Departamento,
      Indicador: grp[0].Indicador,
      Unidade_Medida: unidade,
      Sentido_Meta: sentido,
      Valor: valor,
      Meta: meta,
      Atingimento: calcAtingimento(valor, meta, sentido),
    });
  }
  return rows;
}

export interface Kpis {
  valor: number | null;
  meta: number | null;
  atingimento: number | null;
  unidade: string;
  sentido: string;
}

/** KPIs de um único indicador já filtrado. (porta kpis_for_indicator) */
export function kpisForIndicator(df: IndicadorRow[]): Kpis {
  if (df.length === 0) {
    return { valor: null, meta: 0, atingimento: null, unidade: "", sentido: "Maior" };
  }
  const unidade = df[0].Unidade_Medida;
  const sentido = df[0].Sentido_Meta;
  const { valor, meta } = aggValorMeta(df, getAggType(unidade));
  return { valor, meta, atingimento: calcAtingimento(valor, meta, sentido), unidade, sentido };
}

/** Média anual agregada ao longo dos anos com dado lançado. (porta avg_across_years) */
export function avgAcrossYears(df: IndicadorRow[]): number | null {
  if (df.length === 0) return null;
  const unidade = df[0].Unidade_Medida;
  const aggT = getAggType(unidade);
  const byYear = groupByKeys(df, (r) => String(r.Ano));
  const yearly: number[] = [];
  for (const grp of byYear.values()) {
    const { valor } = aggValorMeta(grp, aggT);
    if (valor != null) yearly.push(valor);
  }
  return yearly.length ? yearly.reduce((a, b) => a + b, 0) / yearly.length : null;
}

/** Evolução mensal de um único indicador. (porta monthly_evolution_indicator) */
export function monthlyEvolutionIndicator(df: IndicadorRow[]): MonthlyRow[] {
  if (df.length === 0) return [];
  const unidade = df[0].Unidade_Medida;
  const sentido = df[0].Sentido_Meta;
  const aggT = getAggType(unidade);

  const groups = groupByKeys(df, (r) => `${r.Ano}||${r.Mes}`);
  const rows: MonthlyRow[] = [];
  for (const grp of groups.values()) {
    const { valor, meta } = aggValorMeta(grp, aggT);
    rows.push({
      Ano: grp[0].Ano,
      Mes: grp[0].Mes,
      Label: grp[0].MesNome,
      Valor: valor,
      Meta: meta,
      Atingimento: calcAtingimento(valor, meta, sentido),
    });
  }
  rows.sort((a, b) => (a.Ano ?? 0) - (b.Ano ?? 0) || (a.Mes ?? 0) - (b.Mes ?? 0));
  return rows;
}

/** Garante os 12 meses do(s) ano(s) selecionado(s). (porta _fill_all_months) */
export function fillAllMonths(monthly: MonthlyRow[], anosSel: number[]): MonthlyRow[] {
  if (anosSel.length === 0) return monthly;
  const anos = [...anosSel].map(Number).sort((a, b) => a - b);
  const multiAno = anos.length > 1;
  const rows: MonthlyRow[] = [];
  for (const ano of anos) {
    for (let mes = 1; mes <= 12; mes++) {
      const existing = monthly.find((r) => Number(r.Ano) === ano && Number(r.Mes) === mes);
      let row: MonthlyRow;
      if (existing) {
        row = { ...existing };
      } else {
        row = { Ano: ano, Mes: mes, Label: MESES_PT[mes] ?? String(mes), Valor: null, Meta: null, Atingimento: null };
      }
      if (multiAno) {
        row.Label = `${MESES_ABBR[mes] ?? mes}/${ano}`;
      }
      rows.push(row);
    }
  }
  return rows;
}
