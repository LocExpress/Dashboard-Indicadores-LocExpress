/**
 * ════════════════════════════════════════════════════════════════════════
 *  AGENTE SGE — preenche a coluna AVALIAÇÃO da BaseGeral a partir do Forms
 * ════════════════════════════════════════════════════════════════════════
 *  ETAPA 1 (este arquivo): pontuação por CONTAGEM (sem IA).
 *    - Lê as respostas do formulário (planilha SGE V2).
 *    - Mapeia Setor e Tipo para o padrão da BaseGeral.
 *    - Conta os registros por (mês × setor × assunto) e aplica 3/5 pts.
 *    - Escreve o resultado na coluna AVALIAÇÃO da aba BaseGeral.
 *
 *  COMO INSTALAR:
 *    1) Abra a planilha BaseGeral (precisa ser Google Sheets NATIVO, não .xlsx).
 *    2) Extensões → Apps Script → cole este arquivo → Salvar.
 *    3) Recarregue a planilha. Vai aparecer o menu "🤖 Agente SGE".
 *    4) Clique em "Calcular pontuação do mês…" e informe o mês (ex.: 04/2026).
 *
 *  AJUSTE OS MAPAS ABAIXO conforme a regra de negócio (especialmente SETOR_MAP).
 * ════════════════════════════════════════════════════════════════════════
 */

// ─── Config ───────────────────────────────────────────────────────────────
const FORM_SHEET_ID = '1Qic6D96fNhjfl8HTDpgRLSYMjS18YuQm-Un5G87GQCo'; // planilha de respostas do Forms
const FORM_TAB_NAME = 'Respostas ao formulário 1';                    // aba das respostas
const BASEGERAL_TAB_NAME = 'BaseGeral';                               // aba destino (nesta planilha)

// Colunas do Forms (1-based): A=Carimbo, B=Gestor, C=Data do evento, D=Setor, E=Tipo, F=Evidência
const COL_DATA_EVENTO = 3;
const COL_SETOR = 4;
const COL_TIPO = 5;

// Se TRUE, quando não houver nenhum registro o agente escreve 0 (= não realizado).
// Se FALSE, deixa "-" (não mexe / não penaliza). Recomendado começar com FALSE.
const ESCREVER_ZERO_QUANDO_VAZIO = false;

// ─── Mapa Setor (Forms "Empresa: Setor") → Setor (BaseGeral) ───────────────
// Valor pode ser uma string OU um array (conta para vários setores).
// Use '' ou [] para IGNORAR.
const SETOR_MAP = {
  'LocExpress: Implantação':       'Implantação',
  'LocExpress: SAF & Performance': 'Performance',
  'LocExpress: Comercial':         'Comercial',
  'Escan: Comercial':              'Comercial Escan',  // Escan tem setor próprio na BaseGeral
  'Grupo Even: Marketing':         'Marketing',
  'Grupo Even: RH':                'DP/RH',
  'Grupo Even: Compras':           'Compras',
  'Grupo Even: Adm/Financeiro':    ['Administrativo', 'Financeiro'], // conta para os dois
  'LocExpress: Franchising':       '',                               // não existe na BaseGeral — ignorado
};

// ─── Mapa Tipo (Forms) → Assunto (BaseGeral) ───────────────────────────────
const TIPO_MAP = {
  'Reunião de bom dia':                       'REUNIÃO DO BOM DIA',
  'Cumbuca':                                  'CUMBUCA',
  'Benchmark':                                'BENCHMARKING',
  'RAR com a equipe':                         'R.A.R - REUNIÃO DE APRESENTAÇÃO DE RESULTADOS - equipe',
  'TRP -  Técnica de Resolução de Problemas': 'TRP - TÉCNICA DE RESOLUÇÃO DE PROBLEMAS',
  'Funcionograma - Atualização':              'FUNCIONOGRAMAS',
  'Autodiagnóstico do SGE':                   'AUTODIAGNÓSTICO',
  'Fluxograma - Atualização':                 'FLUXOGRAMAS',
  // Preenchidos MANUALMENTE pelo gestor (agente NÃO mexe): POP´S, PDI, BACKUP,
  // R.A.R diretoria, INDICADORES.
  // Tipos sem assunto (ignorados): Follow-up com a equipe, Reunião SGE com a
  // equipe, T&D - Treinamento e desenvolvimento.
};

// ─── Regras de pontuação por contagem (qtd de registros → pontos) ──────────
// Itens "qualitativos" (Fluxograma/Funcionograma/POP) recebem 3 (parcial) por
// padrão na contagem; a ETAPA 2 (IA) poderá elevar para 5 lendo a evidência.
function pontuar(assunto, qtd) {
  if (qtd <= 0) return 0;
  switch (assunto) {
    case 'REUNIÃO DO BOM DIA':
    case 'CUMBUCA':
    case 'BENCHMARKING':
      return qtd >= 3 ? 5 : 3;
    case 'TRP - TÉCNICA DE RESOLUÇÃO DE PROBLEMAS':
      return qtd >= 2 ? 5 : 3;
    case 'R.A.R - REUNIÃO DE APRESENTAÇÃO DE RESULTADOS - equipe':
    case 'AUTODIAGNÓSTICO':
    case 'PDI - PLANO DE DESENVOLVIMENTO INDIVIDUAL':
    case 'PLANO DE DESENVOLVIMENTO DE BACKUP':
      return 5; // existência = 5
    case 'FLUXOGRAMAS':
    case 'FUNCIONOGRAMAS':
    case 'POP´S':
      return 3; // parcial por contagem; IA refina depois
    default:
      return qtd >= 1 ? 3 : 0;
  }
}

// ─── Normalização auxiliar ─────────────────────────────────────────────────
function norm(s) {
  return String(s == null ? '' : s).trim().toUpperCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '');
}
function mesAno(dateVal) {
  // aceita Date ou string dd/mm/yyyy
  if (dateVal instanceof Date) return (dateVal.getMonth() + 1) + '/' + dateVal.getFullYear();
  const m = String(dateVal).trim().match(/(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
  if (!m) return '';
  let y = Number(m[3]); if (y < 100) y += 2000;
  return Number(m[2]) + '/' + y;
}

// ─── Menu ───────────────────────────────────────────────────────────────────
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('🤖 Agente SGE')
    .addItem('1) Contagem (Forms) — calcular mês…', 'calcularMes')
    .addItem('2) Planilhas-mestre (IA) — avaliar mês…', 'calcularMesIA')
    .addToUi();
}

// ─── Função principal ────────────────────────────────────────────────────────
function calcularMes() {
  const ui = SpreadsheetApp.getUi();
  const resp = ui.prompt('Agente SGE', 'Informe o mês a calcular (MM/AAAA), ex.: 04/2026:', ui.ButtonSet.OK_CANCEL);
  if (resp.getSelectedButton() !== ui.Button.OK) return;
  const alvo = resp.getResponseText().trim().match(/(\d{1,2})\/(\d{4})/);
  if (!alvo) { ui.alert('Mês inválido. Use o formato MM/AAAA.'); return; }
  const mesAlvo = Number(alvo[1]) + '/' + Number(alvo[2]);

  // 1) Lê respostas do Forms e conta por (setor, assunto) no mês alvo
  const formSS = SpreadsheetApp.openById(FORM_SHEET_ID);
  const formSheet = formSS.getSheetByName(FORM_TAB_NAME) || formSS.getSheets()[0];
  const rows = formSheet.getDataRange().getValues();

  const contagem = {}; // chave "SETOR||ASSUNTO" -> qtd
  let ignoradosSetor = {}, ignoradosTipo = {};
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    if (mesAno(r[COL_DATA_EVENTO - 1]) !== mesAlvo) continue;
    const setorForms = String(r[COL_SETOR - 1] || '').trim();
    const tipoForms = String(r[COL_TIPO - 1] || '').trim();
    const setorRaw = SETOR_MAP[setorForms];
    const assunto = TIPO_MAP[tipoForms];
    if (setorRaw === undefined) { ignoradosSetor[setorForms] = (ignoradosSetor[setorForms] || 0) + 1; continue; }
    const setores = Array.isArray(setorRaw) ? setorRaw : (setorRaw ? [setorRaw] : []);
    if (setores.length === 0) continue;   // mapeado para '' = ignorar
    if (!assunto) { ignoradosTipo[tipoForms] = (ignoradosTipo[tipoForms] || 0) + 1; continue; }
    setores.forEach(function (setor) {
      const k = norm(setor) + '||' + norm(assunto);
      contagem[k] = (contagem[k] || 0) + 1;
    });
  }

  // 2) Escreve na BaseGeral (só nas linhas do mês alvo)
  const base = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(BASEGERAL_TAB_NAME);
  if (!base) { ui.alert('Aba "' + BASEGERAL_TAB_NAME + '" não encontrada nesta planilha.'); return; }
  const bvals = base.getDataRange().getValues();   // A=DATA B=SETOR C=ASSUNTO D=AVALIAÇÃO
  let escritos = 0;
  for (let i = 1; i < bvals.length; i++) {
    if (mesAno(bvals[i][0]) !== mesAlvo) continue;
    const setor = bvals[i][1], assunto = bvals[i][2];
    if (!TIPO_MAP_VALORES().has(norm(assunto))) continue; // não mexe em itens sem dado no Forms (Indicadores, RAR diretoria)
    const k = norm(setor) + '||' + norm(assunto);
    const qtd = contagem[k] || 0;
    if (qtd === 0 && !ESCREVER_ZERO_QUANDO_VAZIO) continue;
    base.getRange(i + 1, 4).setValue(pontuar(assunto, qtd));
    escritos++;
  }

  let msg = 'Mês ' + mesAlvo + ': ' + escritos + ' avaliações escritas na BaseGeral.';
  const ignS = Object.keys(ignoradosSetor); if (ignS.length) msg += '\n\nSetores não mapeados (revise SETOR_MAP): ' + ignS.join(', ');
  const ignT = Object.keys(ignoradosTipo); if (ignT.length) msg += '\nTipos sem assunto (ignorados): ' + ignT.join(', ');
  ui.alert(msg);
}

// conjunto dos assuntos que o agente controla (os que têm Tipo no Forms)
function TIPO_MAP_VALORES() {
  const set = new Set();
  Object.keys(TIPO_MAP).forEach(k => set.add(norm(TIPO_MAP[k])));
  return set;
}

/* ════════════════════════════════════════════════════════════════════════
 *  ETAPA 2 — Avaliação por IA (OpenAI) das PLANILHAS-MESTRE
 *  Itens: Backup (piloto), depois Funcionograma, POP, Fluxograma.
 *  Requer: Propriedades do script → OPENAI_API_KEY = sua chave nova.
 * ════════════════════════════════════════════════════════════════════════ */

const OPENAI_MODEL = 'gpt-4o-mini';

// Fontes a avaliar. tabToSetor: nome da aba → setor(es) da BaseGeral.
//   'IDENTIDADE' = o nome da aba já é o setor da BaseGeral.
//   '' = ignora a aba.
const FONTES_IA = [
  {
    assunto: 'PLANO DE DESENVOLVIMENTO DE BACKUP',
    regra: 'Backup mapeado para 100% dos titulares E planilha atualizada nos últimos 90 dias = 5. ' +
           'Parcial (faltam titulares) OU desatualizada (>90 dias) = 3. Sem dados = 0.',
    planilhas: [
      { id: '1kYvFxZuqf8YVhaKUtn6rfCqaz9un9untZodKfBvzxsM',                              // Backup LOC
        tabToSetor: {
          'Projetos':       '',                          // auditoria — não entra na conta
          'Franchising':    ['Implantação', 'Performance'],
          'Marketing':      'Marketing',
          'Comercial':      'Comercial',
          'RH':             'DP/RH',
          'Financeiro':     'Financeiro',
          'Administrativo': 'Administrativo',
          'Compras':        'Compras',
        } },
      { id: '1GSBF_VTg4LULG8FeOxMlWa4HLQf_9v5XiPs9I88l4ys',                              // Backup ESCAN
        tabToSetor: { 'Operacional': 'Operacional Escan', 'Comercial': 'Comercial Escan' } },
    ],
  },
  // PRÓXIMOS (adicione no mesmo formato quando validarmos o piloto):
  // { assunto:'FUNCIONOGRAMAS', regra:'...', planilhas:[ {id:'1f4JpXqRF...', tabToSetor:{...}}, {id:'1DfHUWL28...', tabToSetor:{...}} ] },
  // { assunto:'POP´S',          regra:'...', planilhas:[ {id:'1Uwf897x...', tabToSetor:'IDENTIDADE'}, {id:'19HQC9oC...', tabToSetor:{...}} ] },
  // { assunto:'FLUXOGRAMAS',    regra:'...', planilhas:[ {id:'1LPr_cgY...', tabToSetor:{...}} ] }, // LOC ainda não existe
];

function calcularMesIA() {
  const ui = SpreadsheetApp.getUi();
  const key = PropertiesService.getScriptProperties().getProperty('OPENAI_API_KEY');
  if (!key) { ui.alert('Defina OPENAI_API_KEY em ⚙️ Configurações do projeto → Propriedades do script.'); return; }
  const resp = ui.prompt('Agente SGE (IA)', 'Mês a avaliar (MM/AAAA), ex.: 04/2026:', ui.ButtonSet.OK_CANCEL);
  if (resp.getSelectedButton() !== ui.Button.OK) return;
  const m = resp.getResponseText().trim().match(/(\d{1,2})\/(\d{4})/);
  if (!m) { ui.alert('Mês inválido.'); return; }
  const mesAlvo = Number(m[1]) + '/' + Number(m[2]);

  // 1) Avalia cada aba das planilhas-mestre via IA
  const result = {}; // "SETOR||ASSUNTO" → {score, just}
  const erros = [], ignoradas = [];
  FONTES_IA.forEach(function (fonte) {
    fonte.planilhas.forEach(function (p) {
      let ss;
      try { ss = SpreadsheetApp.openById(p.id); }
      catch (e) { erros.push('Não consegui abrir a planilha ' + p.id + ' → ' + e); return; }
      ss.getSheets().forEach(function (sheet) {
        const tab = sheet.getName();
        let dest;
        if (p.tabToSetor === 'IDENTIDADE') dest = tab;
        else { for (var k in p.tabToSetor) { if (norm(k) === norm(tab)) { dest = p.tabToSetor[k]; break; } } }
        if (dest === undefined) { ignoradas.push(ss.getName() + ' → "' + tab + '"'); return; }
        if (!dest) return; // '' = ignorar de propósito (ex.: Projetos)
        const setores = Array.isArray(dest) ? dest : [dest];
        const conteudo = sheet.getDataRange().getDisplayValues()
          .map(function (r) { return r.join(' | '); }).join('\n').slice(0, 12000);
        const av = avaliarIA(key, fonte.regra, fonte.assunto, conteudo, mesAlvo);
        setores.forEach(function (s) { result[norm(s) + '||' + norm(fonte.assunto)] = av; });
      });
    });
  });

  // 2) Escreve na BaseGeral (linhas do mês alvo)
  const base = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(BASEGERAL_TAB_NAME);
  const bvals = base.getDataRange().getValues();
  let escritos = 0, log = [];
  for (let i = 1; i < bvals.length; i++) {
    if (mesAno(bvals[i][0]) !== mesAlvo) continue;
    const k = norm(bvals[i][1]) + '||' + norm(bvals[i][2]);
    if (result[k]) {
      base.getRange(i + 1, 4).setValue(result[k].score);
      log.push(bvals[i][1] + ' / ' + bvals[i][2] + ' = ' + result[k].score + '  (' + result[k].just + ')');
      escritos++;
    }
  }
  let msg = 'IA — ' + escritos + ' avaliações escritas (' + mesAlvo + ').\n\n' + log.slice(0, 25).join('\n');
  if (ignoradas.length) msg += '\n\n⚠️ Abas não reconhecidas (ajuste o tabToSetor): \n' + ignoradas.join('\n');
  if (erros.length) msg += '\n\n❌ Erros: \n' + erros.join('\n');
  if (!escritos && !erros.length && !ignoradas.length) msg += '\n\n(Nada escrito — confira se autorizou as permissões na 1ª execução.)';
  ui.alert(msg);
}

function avaliarIA(key, regra, assunto, conteudo, mesAlvo) {
  const prompt =
    'Avalie o item SGE "' + assunto + '" para UM setor, com base na planilha abaixo.\n' +
    'Regra de pontuação: ' + regra + '\n' +
    'Mês de referência: ' + mesAlvo + '. Considere "atualizado" se a última atualização estiver dentro dos 90 dias anteriores a esse mês.\n\n' +
    'Conteúdo da aba:\n' + conteudo + '\n\n' +
    'Responda APENAS um JSON: {"score": 0|3|5, "justificativa": "frase curta"}';
  const payload = {
    model: OPENAI_MODEL, temperature: 0,
    response_format: { type: 'json_object' },
    messages: [{ role: 'user', content: prompt }],
  };
  try {
    const r = UrlFetchApp.fetch('https://api.openai.com/v1/chat/completions', {
      method: 'post', contentType: 'application/json',
      headers: { Authorization: 'Bearer ' + key },
      payload: JSON.stringify(payload), muteHttpExceptions: true,
    });
    const j = JSON.parse(r.getContentText());
    const parsed = JSON.parse(j.choices[0].message.content);
    return { score: parsed.score, just: String(parsed.justificativa || '').slice(0, 120) };
  } catch (e) {
    return { score: 3, just: 'falha IA: ' + e };
  }
}
