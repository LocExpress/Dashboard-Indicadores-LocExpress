// Snapshot do modelo de Viabilidade Financeira do Franqueado — Projeto Compact 272K.
// Fonte: Google Sheets publicado, aba "Dashboard Franqueado (5anos)".
// NÃO editar à mão — regenerar com `python scripts/gen_viabilidade.py` quando a
// planilha mudar (ver scripts/README.md). Ranges-fonte documentados no script.

export const PROJETO = "Projeto Compact 272K";

export interface ViabKpis {
  vpl: number;          // R$
  taxaVpl: number;      // fração (0.12 = 12%)
  payback: number;      // meses
  capitalGiro: number;  // R$ (negativo = saída)
  investimento: number; // R$ (negativo = saída)
  necessidade: number;  // R$ (negativo = saída)
  tirAm: number;        // fração ao mês
  tirAa: number;        // fração ao ano
}

export const kpis: ViabKpis = {
  vpl: 583290.98,
  taxaVpl: 0.12,
  payback: 35,
  capitalGiro: -25351.94,
  investimento: -328500,
  necessidade: -353851.94,
  tirAm: 0.0344,
  tirAa: 0.5003078339,
};

export const anos = ["Ano 1", "Ano 2", "Ano 3", "Ano 4", "Ano 5"] as const;

// Faturamento bruto médio mensal por ano (R$)
export const faturamento = [16838.78, 38258.28, 50962.39, 76438.34, 120564.02];

// Lucro líquido médio mensal por ano (R$)
export const lucro = [-2145.56, 143413.48, 195184.83, 348922.63, 704122.28];

// Lucratividade por ano (% — lucro / faturamento)
export const lucratividade = [-1.06, 31.24, 31.92, 38.04, 48.67];

// Rentabilidade por ano (% — retorno sobre o capital investido)
export const rentabilidade = [-0.65, 43.66, 59.42, 106.22, 214.34];

// Fluxo de Caixa Acumulado — 60 pontos mensais (R$)
export const fluxoCaixaAcumulado = [
  -328500, -328500, -335079.09, -342013.81, -346674.16, -350460.75, -352462.97,
  -353851.94, -351613.26, -346532.79, -339345.4, -330645.56, -323754.08, -315816.73,
  -306517.55, -295831.0, -283680.68, -270738.88, -259973.0, -247119.05, -232693.62,
  -217418.65, -201135.58, -187232.08, -177475.47, -166692.07, -154849.95, -141916.23,
  -127857.01, -112638.95, -95263.67, -76805.92, -57064.16, -36000.12, -13574.38,
  7952.75, 24254.63, 43081.12, 63215.27, 86182.7, 111231.78, 139225.64,
  168715.36, 199243.14, 233271.14, 271365.41, 312765.5, 356875.38, 400243.22,
  446568.32, 495122.19, 547212.96, 601695.79, 658847.03, 719908.64, 783611.27,
  849018.74, 916406.71, 987114.77, 1060997.65,
];
