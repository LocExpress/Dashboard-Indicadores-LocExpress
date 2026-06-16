// Detalhamento do modelo de Viabilidade — Projeto Compact 272K (abas da planilha).
// NÃO editar à mão — regenerar com `python scripts/gen_detalhe.py`.

export interface InvestItem { label: string; valor: number; pct: number; }
export interface SerieAno { label: string; anos: number[]; }
export interface CargoRH { cargo: string; qtd: number; salario: number; total: number; }

export const investimento: InvestItem[] = [
  { label: "1. Máquinas e equipamentos", valor: 190000.0, pct: 53.69 },
  { label: "Reforma/infra/Fachada", valor: 45000, pct: 12.72 },
  { label: "2. Taxa de franquia", valor: 60000.0, pct: 16.96 },
  { label: "3. Reforma e adaptação visual", valor: 15000.0, pct: 4.24 },
  { label: "4. Mobiliário", valor: 8000.0, pct: 2.26 },
  { label: "5. Hardware e software", valor: 8000, pct: 2.26 },
  { label: "6. Despesas de deslocamento e estadia - Treinamento Presencial", valor: 9000, pct: 2.54 },
];
export const investimentoTotal = 335000.0;

export const despesasFixas: SerieAno[] = [
  { label: "Aluguel  72m²", anos: [2880, 3052.8, 3266.5, 3527.82, 3810.04] },
  { label: "IPTU", anos: [240.0, 254.4, 272.21, 293.98, 317.5] },
  { label: "Água", anos: [50.0, 53, 56.71, 61.25, 66.15] },
  { label: "Energia Elétrica", anos: [350.0, 371, 396.97, 428.73, 463.03] },
  { label: "Telefone - Celular", anos: [100.0, 106, 113.42, 122.49, 132.29] },
  { label: "Internet", anos: [100.0, 106, 113.42, 122.49, 132.29] },
  { label: "Manutenção Software", anos: [1000.0, 1060, 1134.2, 1224.94, 1322.93] },
  { label: "Seguro Empresarial (imóvel)", anos: [150.0, 159, 170.13, 183.74, 198.44] },
  { label: "Manutenção - Instalação Física", anos: [50.0, 53, 56.71, 61.25, 66.15] },
  { label: "Manutenção - Máquinas e Equipamentos", anos: [404.13, 1147.75, 2038.5, 3821.92, 7233.84] },
  { label: "Contador", anos: [750.0, 795, 850.65, 918.7, 992.2] },
  { label: "Serviços de Segurança/Monitoramento", anos: [200.0, 212, 226.84, 244.99, 264.59] },
  { label: "Despesas bancárias", anos: [50.0, 53, 56.71, 61.25, 66.15] },
  { label: "Despesas diversas", anos: [350.0, 371, 396.97, 428.73, 463.03] },
  { label: "Serasa", anos: [100, 106, 113.42, 122.49, 132.29] },
  { label: "Materiais de Limpeza", anos: [120.0, 127.2, 136.1, 146.99, 158.75] },
  { label: "Materiais de Escritório", anos: [60.0, 63.6, 68.05, 73.5, 79.38] },
  { label: "Provedor de email", anos: [74.4, 78.86, 84.38, 91.14, 98.43] },
  { label: "Fretes", anos: [350.0, 371, 396.97, 428.73, 463.03] },
];
export const despesasFixasTotal = [7378.53, 8540.61, 9948.86, 12365.11, 16460.49];

export const rhCargos: CargoRH[] = [
  { cargo: "Auxiliar Administrativo", qtd: 0.0, salario: 1760.0, total: 0 },
  { cargo: "Assistente Comercial (interno)", qtd: 1.0, salario: 1760.0, total: 3316.18 },
  { cargo: "Auxiliar de Manutenção", qtd: 1.0, salario: 1621.0, total: 2782.42 },
  { cargo: "Motorista /Entregador Técnico", qtd: 0.0, salario: 1900.0, total: 0 },
  { cargo: "Técnico em Manutenção", qtd: 0.0, salario: 1900.0, total: 0 },
  { cargo: "Franqueado/Gestor (Pró-Labore)", qtd: 1.0, salario: 3000.0, total: 4126.97 },
];
export const rhTotalMensal = [10225.56, 11055.85, 15352.24, 20506.09, 21064.11];
export const rhQtd = [3, 3, 4, 5, 5];

export const dreAnual: SerieAno[] = [
  { label: "(+) Receita Bruta", anos: [202065.0, 459099.0, 611549.0, 917260.0, 1446768.0] },
  { label: "(-) Impostos", anos: [7035.0, 26480.0, 41015.0, 67567.0, 123206.0] },
  { label: "(=) Receita Líquida", anos: [195031.0, 432620.0, 570534.0, 849694.0, 1323562.0] },
  { label: "(-) Folha de Pagamento", anos: [102256.0, 132670.0, 184227.0, 246073.0, 252769.0] },
  { label: "(-) Despesas Fixas", anos: [73785.0, 102487.0, 119386.0, 148381.0, 197526.0] },
  { label: "(-) Taxas do Sistema", anos: [17094.0, 44867.0, 59505.0, 87971.0, 140210.0] },
  { label: "(-) Despesas Operacionais", anos: [197176.0, 289206.0, 375349.0, 500771.0, 619440.0] },
  { label: "(=) Lucro Operacional", anos: [-2146.0, 143413.0, 195185.0, 348923.0, 704122.0] },
];
export const faturamentoBrutoAnual = [202065.0, 459099.0, 611549.0, 917260.0, 1446768.0];

export const temFinanciamento = false;
