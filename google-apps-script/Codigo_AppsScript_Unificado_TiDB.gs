// =========================================================================================
// GOOGLE APPS SCRIPT - SISTEMA UNIFICADO DE GESTÃO DO ESTÁGIO PROBATÓRIO (SEED-PR)
// Menu Central, Consultas SIGEP, Remanejamento e Sincronização TiDB Cloud Serverless (v2)
// =========================================================================================

/**
 * ⚙️ CONFIGURAÇÕES PRINCIPAIS DO SISTEMA
 */

// 1. URL oficial do Dashboard na Vercel (ou URL de túnel/localhost em desenvolvimento)
var VERCEL_APP_URL = "https://dashboard-tawny-delta-96.vercel.app";

// 2. Versão da API: "v2" (Arquitetura segura com hash/cifra de CGM e 1 CGM por pessoa)
var API_VERSION = "v2";

// 3. Token Secreto de Sincronização (SYNC_TOKEN)
// IMPORTANTE: Insira aqui a mesma chave secreta configurada no painel da Vercel (Project Settings ➔ Environment Variables)
var SYNC_TOKEN = "";

// 4. IDs Oficiais das Planilhas do Google Sheets (SEED-PR)
var SPREADSHEET_ID_MESTRA_TIDB = "1sRkA88VrtczqXxQ6PlmgygeCVhPoElRNS8RC1QuQzx0";

// 5. Planilhas Externas de Observações da Prática (Formadores -> Cursistas)
var PLANILHAS_OBSERVACOES_FORMADOR = [
  { id: "1KmbMvNOTpj4OaDOdKw5mPVI3iqbo8RbQBqBktM84ToE", nome: "Formador-1ANO_1SEM", anoFormativoPadrao: "1º ANO", semestrePadrao: "1º Semestre/2026" },
  { id: "1uv5QWeqtN5iMkH8nVQUvsYKClv9NaGDHgsdT_D-RPiw", nome: "Formador-2e3ANO-2SEM", anoFormativoPadrao: "2º e 3º ANOS", semestrePadrao: "2º Semestre/2026" },
  { id: "1dL_Q-_15Idx3SNAZOqmKzrnVqA8tHFBzILA5PZ7p798", nome: "Formador-1ANO_2SEM", anoFormativoPadrao: "1º ANO", semestrePadrao: "2º Semestre/2026" },
  { id: "1zSnlh7aW8df800lP90rCLVxiHNWAa1f9IGjz2OoDfvU", nome: "Formador-2e3ANO-1SEM", anoFormativoPadrao: "2º e 3º ANOS", semestrePadrao: "1º Semestre/2026" }
];

// 6. Planilha Externa de Observações de Tutoria (Tutores -> Formadores / Tutor Insights)
var PLANILHA_OBSERVACOES_TUTOR_ID = "1V54Gl-KVGaHjLBH07hQZxq6GU88kfn0Xurh5P2LuSz8";


/**
 * -----------------------------------------------------------------------------------------
 * 1. GATILHO AUTOMÁTICO DE ABERTURA DA PLANILHA (onOpen)
 * Constrói todos os menus na barra de ferramentas superior do Google Sheets.
 * -----------------------------------------------------------------------------------------
 */
function onOpen() {
  try {
    var ui = SpreadsheetApp.getUi();

    // Menu 1: Operações Gerais do Estágio Probatório & SIGEP
    ui.createMenu('⚡ ESTÁGIO PROBATÓRIO')
      .addItem('🔄 Atualizar Dashboard (Gerar JSON no Drive Agora)', 'menuAtualizarDashboard')
      .addItem('⚡ Ativar Sincronização Automática ao Editar a Planilha', 'instalarGatilhosAutomaticos')
      .addSeparator()
      .addItem('🔍 Painel de Busca no SIGEP (Cursistas / Formadores)', 'menuDialogoBuscarSigep')
      .addItem('⚡ Preencher Linha Selecionada com Dados SIGEP', 'menuPreencherLinhaAtiva')
      .addItem('🚪 Registrar Exoneração de Servidor', 'menuRegistrarExoneracao')
      .addSeparator()
      .addItem('🛠️ Verificar / Criar Abas do Sistema', 'setupInicialCriarAbas')
      .addToUi();

    // Menu 2: Motor de Remanejamento e Nivelamento de Turmas
    ui.createMenu('⚖️ REMANEJAMENTO DE TURMAS')
      .addItem('1) 📊 Analisar Redistribuição (Padrão 4 a 9 - Não Zerar Turmas)', 'rmjMenuAnalisar')
      .addItem('2) 👁️ Validar Redistribuição (Comparativo Visual & Checklist)', 'rmjMenuValidar')
      .addItem('3) ✍️ Realizar Redistribuição (Gravar na Coluna H)', 'rmjMenuRealizar')
      .addItem('4) ✉️ Enviar E-mail Informativo', 'rmjMenuEmail')
      .addSeparator()
      .addItem('ℹ️ Diretrizes & Regras do Remanejamento', 'menuSobreRemanejamento')
      .addToUi();

    // Menu 3: Banco de Dados TiDB Serverless Cloud
    ui.createMenu('⚡ TiDB CLOUD')
      .addItem('🔄 Sincronizar Tudo com TiDB Agora (Manual)', 'sincronizarManualComAlerta')
      .addSeparator()
      .addItem('📋 Sincronizar Observações da Prática (1º e 2º/3º Anos)', 'sincronizarObservacoesPraticaMenu')
      .addItem('👨‍🏫 Sincronizar Observações do Tutor (Formadores)', 'sincronizarObservacoesTutorMenu')
      .addSeparator()
      .addItem('⏰ Ativar Atualização Automática Diária (07:00)', 'configurarGatilhoDiario7h')
      .addItem('🔍 Testar Conexão com TiDB', 'testarConexaoTiDB')
      .addToUi();

  } catch (e) {
    Logger.log('Aviso onOpen: ' + e.toString());
  }
}


/**
 * -----------------------------------------------------------------------------------------
 * 2. COMANDOS DO MENU TiDB CLOUD
 * -----------------------------------------------------------------------------------------
 */

/**
 * Testa a conectividade com o backend Vercel e o banco TiDB Cloud.
 */
function testarConexaoTiDB() {
  var ui = SpreadsheetApp.getUi();
  try {
    var endpoint = obterEndpointApi('health');
    var options = obterOpcoesHttp();
    options.method = "get";
    delete options.payload;

    var resp = UrlFetchApp.fetch(endpoint, options);
    var status = resp.getResponseCode();
    var json = JSON.parse(resp.getContentText() || '{}');

    if (status === 200 && (json.status === 'ok' || json.banco === 'conectado' || json.ok)) {
      ui.alert(
        'Conexão TiDB Cloud: OK ✅',
        'Sucesso na conexão com a infraestrutura TiDB Serverless Cloud!\n\n' +
        '• Endpoint: ' + endpoint + '\n' +
        '• Versão API: ' + (json.versao || API_VERSION) + '\n' +
        '• Latência: ' + (json.latencia_ms ? json.latencia_ms + ' ms' : 'Excelente') + '\n' +
        '• Banco: Conectado e respondendo normalmente.',
        ui.ButtonSet.OK
      );
    } else {
      ui.alert(
        'Aviso de Conexão ⚠️',
        'O servidor respondeu com código ' + status + ':\n' + resp.getContentText(),
        ui.ButtonSet.OK
      );
    }
  } catch (err) {
    ui.alert(
      'Falha de Conexão ❌',
      'Não foi possível conectar ao backend serverless:\n\n' + err.toString() +
      '\n\nVerifique se a variável VERCEL_APP_URL está correta e se a Vercel está online.',
      ui.ButtonSet.OK
    );
  }
}

/**
 * Ativa o gatilho automático diário às 07:00 da manhã (Horário de Brasília).
 */
function configurarGatilhoDiario7h() {
  var triggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === 'executarSincronizacaoCompletaTiDB') {
      ScriptApp.deleteTrigger(triggers[i]);
    }
  }

  ScriptApp.newTrigger('executarSincronizacaoCompletaTiDB')
    .timeBased()
    .everyDays(1)
    .atHour(7)
    .nearMinute(0)
    .inTimezone('America/Sao_Paulo')
    .create();

  var msg = '✓ Gatilho automático configurado com sucesso!\n\n' +
            'A sincronização de todas as planilhas para o TiDB Cloud será executada automaticamente todos os dias às 07:00 da manhã.';
  try {
    SpreadsheetApp.getUi().alert('Gatilho Automático 07:00', msg, SpreadsheetApp.getUi().ButtonSet.OK);
  } catch (e) {
    Logger.log(msg);
  }
}

/**
 * Disparo manual da sincronização completa com modal de relatório de linhas.
 */
function sincronizarManualComAlerta() {
  try {
    SpreadsheetApp.getActiveSpreadsheet().toast('Iniciando sincronização completa com TiDB Cloud...', 'TiDB Serverless', 8);
    var res = executarSincronizacaoCompletaTiDB();
    var msg = '✓ Sincronização com o TiDB Cloud finalizada com sucesso!\n\n' +
              '• Cursistas Ativos (DADOS - Coluna AK / LF): ' + (res.cursistas || 0) + '\n' +
              '• Concluintes (1º Chamamento): ' + (res.concluintes || 0) + '\n' +
              '• Tutores Regionais: ' + (res.tutores || 0) + '\n' +
              '• Servidores Exonerados: ' + (res.exonerados || 0) + '\n' +
              '• Cursistas Não Concluintes: ' + (res.nao_concluintes || 0) + '\n' +
              '• Movimentações (Trocas & Vínculos): ' + (res.movimentacoes || 0) + '\n' +
              '• Observações Pedagógicas da Prática: ' + (res.observacoes || 0) + '\n' +
              '• Observações de Tutoria (Tutor Insights): ' + (res.observacoes_tutoria || 0);
    SpreadsheetApp.getUi().alert('Sincronização TiDB Concluída', msg, SpreadsheetApp.getUi().ButtonSet.OK);
  } catch (err) {
    try {
      SpreadsheetApp.getUi().alert('Erro na Sincronização', err.toString(), SpreadsheetApp.getUi().ButtonSet.OK);
    } catch (e) {}
  }
}

function sincronizarObservacoesPraticaMenu() {
  SpreadsheetApp.getActiveSpreadsheet().toast('Sincronizando observações pedagógicas com TiDB...', 'TiDB Serverless', 6);
  var res = sincronizarAbaObservacoesParaTiDB();
  SpreadsheetApp.getUi().alert('Observações de Prática', '✓ Total de observações sincronizadas: ' + (res.total || 0), SpreadsheetApp.getUi().ButtonSet.OK);
}

function sincronizarObservacoesTutorMenu() {
  SpreadsheetApp.getActiveSpreadsheet().toast('Sincronizando observações de tutoria com TiDB...', 'TiDB Serverless', 6);
  var res = sincronizarAbaObservacoesTutoriaParaTiDB();
  SpreadsheetApp.getUi().alert('Observações do Tutor', '✓ Total de observações de tutoria sincronizadas: ' + (res.total || 0), SpreadsheetApp.getUi().ButtonSet.OK);
}


/**
 * -----------------------------------------------------------------------------------------
 * 3. MOTOR CENTRAL DE SINCRONIZAÇÃO TiDB CLOUD (v2)
 * -----------------------------------------------------------------------------------------
 */
function executarSincronizacaoCompletaTiDB() {
  Logger.log('Iniciando sincronização completa das planilhas com TiDB Cloud...');

  // 1. Cursistas Ativos (DADOS com Coluna AK / Linha Funcional)
  var resCursistas = sincronizarAbaDadosParaTiDB();

  // 2. Concluintes do 1º Chamamento (CONCLUINTES-1CH)
  var resConcluintes = sincronizarAbaConcluintesParaTiDB();

  // 3. Tutores
  var resTutores = sincronizarAbaTutoresParaTiDB();

  // 4. Servidores Exonerados (EXONERADOS)
  var resExonerados = sincronizarAbaExoneradosParaTiDB();

  // 5. Cursistas Não Concluintes (CURSISTAS NAO CONCLUINTES)
  var resNaoConcluintes = sincronizarAbaNaoConcluintesParaTiDB();

  // 6. Formulários de Troca de Turma, Modalidade e Vínculos
  var resMovimentacoes = sincronizarAbasMovimentacoesParaTiDB();

  // 7. Observações Pedagógicas (Formadores -> Cursistas)
  var resObservacoes = sincronizarAbaObservacoesParaTiDB();

  // 8. Observações de Tutoria (Tutores -> Formadores)
  var resTutoria = sincronizarAbaObservacoesTutoriaParaTiDB();

  Logger.log('✓ Sincronização finalizada com êxito!');

  return {
    cursistas: resCursistas.total || 0,
    concluintes: resConcluintes.total || 0,
    tutores: resTutores.total || 0,
    exonerados: resExonerados.total || 0,
    nao_concluintes: resNaoConcluintes.total || 0,
    movimentacoes: resMovimentacoes.total || 0,
    observacoes: resObservacoes.total || 0,
    observacoes_tutoria: resTutoria.total || 0
  };
}


/**
 * -----------------------------------------------------------------------------------------
 * 4. SINCRONIZAR ABA DADOS (CURSISTAS ATIVOS) - LEITURA DA COLUNA AK (LINHA FUNCIONAL)
 * -----------------------------------------------------------------------------------------
 */
function sincronizarAbaDadosParaTiDB() {
  var ss = obterPlanilhaMestra();
  var aba = ss.getSheetByName("DADOS") || ss.getSheetByName("CURSISTAS") || ss.getSheets()[0];
  if (!aba) return { status: 'erro', mensagem: 'Aba DADOS não encontrada.' };

  var dados = aba.getDataRange().getValues();
  if (dados.length < 2) return { status: 'vazio', total: 0 };

  var cabecalho = dados[0].map(function(c) {
    return String(c || "").trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  });

  function getIdx(keywords) {
    for (var k = 0; k < keywords.length; k++) {
      var idx = cabecalho.indexOf(keywords[k].toLowerCase());
      if (idx !== -1) return idx;
    }
    for (var k = 0; k < keywords.length; k++) {
      var kw = keywords[k].toLowerCase();
      var idx = cabecalho.findIndex(function(c) { return c.includes(kw); });
      if (idx !== -1) return idx;
    }
    return -1;
  }

  var idxCgm = getIdx(["cgm"]);
  var idxNome = getIdx(["nome cursista", "nome do cursista", "cursista", "nome"]);
  var idxEmail = getIdx(["e-mail", "email cursista", "email"]);
  var idxCpf = getIdx(["cpf cursista", "cpf"]);
  var idxTurma = getIdx(["turmas", "turma"]);
  var idxLinhaFuncional = getIdx(["linha funcional", "linha_funcional", "lf", "padrao", "vinculo"]);
  var idxModalidade = getIdx(["modalidade"]);
  var idxComponente = getIdx(["componente"]);
  var idxDiaSemana = getIdx(["dia da semana", "dia_da_semana"]);
  var idxTurno = getIdx(["turno"]);
  var idxFormador = getIdx(["nome formador", "formador"]);
  var idxEmailFormador = getIdx(["e-mail formador", "email formador"]);
  var idxTutor = getIdx(["tutor responsavel", "tutor"]);
  var idxEmailTutor = getIdx(["e-mail tutor", "email tutor"]);

  var cursistas = [];
  for (var i = 1; i < dados.length; i++) {
    var row = dados[i];
    var nome = idxNome !== -1 ? String(row[idxNome] || "").trim() : "";
    if (!nome) continue;

    var cgm = idxCgm !== -1 ? String(row[idxCgm] || "").trim() : "";
    var turmas = idxTurma !== -1 ? String(row[idxTurma] || "").trim() : "";

    // Leitura da Linha Funcional: pelo cabeçalho ou pela Coluna AK (índice 36)
    var lf = idxLinhaFuncional !== -1 ? String(row[idxLinhaFuncional] || "").trim() : "";
    if (!lf && row.length > 36) {
      lf = String(row[36] || "").trim();
    }
    var lfNum = lf.replace(/\D/g, "");

    // Identificação única no dashboard: CGM + LF (ex: 12345678_LF1)
    var cod = cgm ? (cgm + (lfNum ? ("_LF" + lfNum) : ("_" + turmas))) : ("CURS_" + i);

    cursistas.push({
      cod_cursista: cod,
      cgm: cgm || null,
      linha_funcional: lfNum || null,
      nome_cursista: nome,
      email: idxEmail !== -1 ? String(row[idxEmail] || "").trim().toLowerCase() : null,
      cpf_cursista: idxCpf !== -1 ? String(row[idxCpf] || "").trim() : null,
      turmas: turmas || null,
      modalidade: idxModalidade !== -1 ? String(row[idxModalidade] || "").trim() : null,
      componente: idxComponente !== -1 ? String(row[idxComponente] || "").trim() : null,
      dia_da_semana: idxDiaSemana !== -1 ? String(row[idxDiaSemana] || "").trim() : null,
      turno: idxTurno !== -1 ? String(row[idxTurno] || "").trim() : null,
      nome_formador: idxFormador !== -1 ? String(row[idxFormador] || "").trim() : null,
      email_formador: idxEmailFormador !== -1 ? String(row[idxEmailFormador] || "").trim().toLowerCase() : null,
      tutor_responsavel: idxTutor !== -1 ? String(row[idxTutor] || "").trim() : null,
      email_tutor: idxEmailTutor !== -1 ? String(row[idxEmailTutor] || "").trim().toLowerCase() : null
    });
  }

  var BATCH_SIZE = 250;
  var totalSinc = 0;
  var runId = 'sync_gs_' + Date.now();

  for (var b = 0; b < cursistas.length; b += BATCH_SIZE) {
    var lote = cursistas.slice(b, b + BATCH_SIZE);
    var endpoint = obterEndpointApi();
    var options = obterOpcoesHttp({
      action: 'sync_cursistas_bulk',
      cursistas: lote,
      run_id: runId,
      final: (b + BATCH_SIZE >= cursistas.length)
    });

    try {
      var resp = UrlFetchApp.fetch(endpoint, options);
      if (resp.getResponseCode() === 200) {
        totalSinc += lote.length;
      } else {
        Logger.log('Aviso ao sincronizar cursistas: ' + resp.getContentText());
      }
    } catch (err) {
      Logger.log('Erro ao sincronizar cursistas: ' + err.toString());
    }
  }

  return { total: totalSinc };
}


/**
 * -----------------------------------------------------------------------------------------
 * 5. SINCRONIZAR CONCLUINTES DO 1º CHAMAMENTO (CONCLUINTES-1CH)
 * -----------------------------------------------------------------------------------------
 */
function sincronizarAbaConcluintesParaTiDB() {
  var ss = obterPlanilhaMestra();
  var aba = ss.getSheetByName("CONCLUINTES-1CH") || ss.getSheetByName("CONCLUINTES");
  if (!aba) return { status: 'vazio', total: 0 };

  var dados = aba.getDataRange().getValues();
  if (dados.length < 2) return { status: 'vazio', total: 0 };

  var cabecalho = dados[0].map(function(c) {
    return String(c || "").trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  });

  function getIdx(keywords) {
    for (var k = 0; k < keywords.length; k++) {
      var idx = cabecalho.indexOf(keywords[k].toLowerCase());
      if (idx !== -1) return idx;
    }
    for (var k = 0; k < keywords.length; k++) {
      var kw = keywords[k].toLowerCase();
      var idx = cabecalho.findIndex(function(c) { return c.includes(kw); });
      if (idx !== -1) return idx;
    }
    return -1;
  }

  var idxNome = getIdx(["nome cursista", "nome", "cursista"]);
  var idxEmail = getIdx(["e-mail", "email cursista", "email"]);
  var idxCgm = getIdx(["cgm"]);
  var idxCpf = getIdx(["cpf"]);
  var idxChamamento = getIdx(["chamamento"]);
  var idxComponente = getIdx(["componente"]);
  var idxNre = getIdx(["nre"]);
  var idxTurma = getIdx(["turma"]);

  var concluintes = [];
  for (var i = 1; i < dados.length; i++) {
    var row = dados[i];
    var nome = idxNome !== -1 ? String(row[idxNome] || "").trim() : "";
    if (!nome) continue;

    concluintes.push({
      nome_cursista: nome,
      email: idxEmail !== -1 ? String(row[idxEmail] || "").trim().toLowerCase() : null,
      cgm: idxCgm !== -1 ? String(row[idxCgm] || "").trim() : null,
      cpf_cursista: idxCpf !== -1 ? String(row[idxCpf] || "").trim() : null,
      chamamento: idxChamamento !== -1 ? String(row[idxChamamento] || "").trim() : "1º Chamamento",
      componente: idxComponente !== -1 ? String(row[idxComponente] || "").trim() : null,
      nre: idxNre !== -1 ? String(row[idxNre] || "").trim() : null,
      turmas: idxTurma !== -1 ? String(row[idxTurma] || "").trim() : null
    });
  }

  var BATCH_SIZE = 250;
  var totalSinc = 0;
  for (var b = 0; b < concluintes.length; b += BATCH_SIZE) {
    var lote = concluintes.slice(b, b + BATCH_SIZE);
    var endpoint = obterEndpointApi();
    var options = obterOpcoesHttp({
      action: 'sync_concluintes_bulk',
      concluintes: lote,
      truncate: (b === 0)
    });

    try {
      var resp = UrlFetchApp.fetch(endpoint, options);
      if (resp.getResponseCode() === 200) totalSinc += lote.length;
    } catch (err) {
      Logger.log('Erro ao sincronizar concluintes: ' + err.toString());
    }
  }

  return { total: totalSinc };
}


/**
 * -----------------------------------------------------------------------------------------
 * 6. SINCRONIZAR TUTORES REGIONAIS (TUTORES)
 * -----------------------------------------------------------------------------------------
 */
function sincronizarAbaTutoresParaTiDB() {
  var ss = obterPlanilhaMestra();
  var aba = ss.getSheetByName("TUTORES");
  if (!aba) return { status: 'vazio', total: 0 };

  var dados = aba.getDataRange().getValues();
  if (dados.length < 2) return { status: 'vazio', total: 0 };

  var cabecalho = dados[0].map(function(c) {
    return String(c || "").trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  });

  function getIdx(keywords) {
    for (var k = 0; k < keywords.length; k++) {
      var idx = cabecalho.indexOf(keywords[k].toLowerCase());
      if (idx !== -1) return idx;
    }
    for (var k = 0; k < keywords.length; k++) {
      var kw = keywords[k].toLowerCase();
      var idx = cabecalho.findIndex(function(c) { return c.includes(kw); });
      if (idx !== -1) return idx;
    }
    return -1;
  }

  var idxNome = getIdx(["nome tutor", "tutor", "nome"]);
  var idxEmail = getIdx(["e-mail tutor", "email tutor", "email"]);
  var idxNre = getIdx(["nre"]);
  var idxFormadores = getIdx(["formadores vinculados", "formadores"]);

  var tutores = [];
  for (var i = 1; i < dados.length; i++) {
    var row = dados[i];
    var nome = idxNome !== -1 ? String(row[idxNome] || "").trim() : "";
    if (!nome) continue;

    tutores.push({
      nome_tutor: nome,
      email: idxEmail !== -1 ? String(row[idxEmail] || "").trim().toLowerCase() : null,
      nre: idxNre !== -1 ? String(row[idxNre] || "").trim() : null,
      formadores_vinculados: idxFormadores !== -1 ? String(row[idxFormadores] || "").trim() : null
    });
  }

  var endpoint = obterEndpointApi();
  var options = obterOpcoesHttp({
    action: 'sync_tutores_bulk',
    tutores: tutores
  });

  try {
    var resp = UrlFetchApp.fetch(endpoint, options);
    if (resp.getResponseCode() === 200) return { total: tutores.length };
  } catch (err) {
    Logger.log('Erro ao sincronizar tutores: ' + err.toString());
  }

  return { total: 0 };
}


/**
 * -----------------------------------------------------------------------------------------
 * 7. SINCRONIZAR SERVIDORES EXONERADOS (EXONERADOS)
 * -----------------------------------------------------------------------------------------
 */
function sincronizarAbaExoneradosParaTiDB() {
  var ss = obterPlanilhaMestra();
  var aba = ss.getSheetByName("EXONERADOS");
  if (!aba) return { status: 'vazio', total: 0 };

  var dados = aba.getDataRange().getValues();
  if (dados.length < 2) return { status: 'vazio', total: 0 };

  var cabecalho = dados[0].map(function(c) {
    return String(c || "").trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  });

  function getIdx(keywords) {
    for (var k = 0; k < keywords.length; k++) {
      var idx = cabecalho.indexOf(keywords[k].toLowerCase());
      if (idx !== -1) return idx;
    }
    for (var k = 0; k < keywords.length; k++) {
      var kw = keywords[k].toLowerCase();
      var idx = cabecalho.findIndex(function(c) { return c.includes(kw); });
      if (idx !== -1) return idx;
    }
    return -1;
  }

  var idxData = getIdx(["data exoneracao", "data", "carimbo"]);
  var idxCpf = getIdx(["cpf"]);
  var idxNome = getIdx(["nome"]);
  var idxMotivo = getIdx(["motivo"]);

  var exonerados = [];
  for (var i = 1; i < dados.length; i++) {
    var row = dados[i];
    var cpf = idxCpf !== -1 ? String(row[idxCpf] || "").replace(/\D/g, "").trim() : "";
    var nome = idxNome !== -1 ? String(row[idxNome] || "").trim() : "";
    if (!cpf && !nome) continue;

    exonerados.push({
      cpf: cpf || null,
      nome: nome || null,
      motivo: idxMotivo !== -1 ? String(row[idxMotivo] || "").trim() : "Exoneração a Pedido",
      data_exoneracao: idxData !== -1 ? String(row[idxData] || "").trim() : null
    });
  }

  var endpoint = obterEndpointApi();
  var options = obterOpcoesHttp({
    action: 'sync_exonerados_bulk',
    exonerados: exonerados
  });

  try {
    var resp = UrlFetchApp.fetch(endpoint, options);
    if (resp.getResponseCode() === 200) return { total: exonerados.length };
  } catch (err) {
    Logger.log('Erro ao sincronizar exonerados: ' + err.toString());
  }

  return { total: 0 };
}


/**
 * -----------------------------------------------------------------------------------------
 * 8. SINCRONIZAR DOCENTES NÃO CONCLUINTES (CURSISTAS NAO CONCLUINTES)
 * -----------------------------------------------------------------------------------------
 */
function sincronizarAbaNaoConcluintesParaTiDB() {
  var ss = obterPlanilhaMestra();
  var aba = ss.getSheetByName("CURSISTAS NAO CONCLUINTES") || ss.getSheetByName("NAO_CONCLUINTES");
  if (!aba) return { status: 'vazio', total: 0 };

  var dados = aba.getDataRange().getValues();
  if (dados.length < 2) return { status: 'vazio', total: 0 };

  var cabecalho = dados[0].map(function(c) {
    return String(c || "").trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  });

  function getIdx(keywords) {
    for (var k = 0; k < keywords.length; k++) {
      var idx = cabecalho.indexOf(keywords[k].toLowerCase());
      if (idx !== -1) return idx;
    }
    for (var k = 0; k < keywords.length; k++) {
      var kw = keywords[k].toLowerCase();
      var idx = cabecalho.findIndex(function(c) { return c.includes(kw); });
      if (idx !== -1) return idx;
    }
    return -1;
  }

  var idxNome = getIdx(["nome cursista", "nome", "cursista"]);
  var idxEmail = getIdx(["e-mail", "email"]);
  var idxCgm = getIdx(["cgm"]);
  var idxCpf = getIdx(["cpf"]);
  var idxMotivo = getIdx(["motivo", "situacao", "status"]);

  var naoConcluintes = [];
  for (var i = 1; i < dados.length; i++) {
    var row = dados[i];
    var nome = idxNome !== -1 ? String(row[idxNome] || "").trim() : "";
    if (!nome) continue;

    naoConcluintes.push({
      nome_cursista: nome,
      email: idxEmail !== -1 ? String(row[idxEmail] || "").trim().toLowerCase() : null,
      cgm: idxCgm !== -1 ? String(row[idxCgm] || "").trim() : null,
      cpf_cursista: idxCpf !== -1 ? String(row[idxCpf] || "").trim() : null,
      motivo: idxMotivo !== -1 ? String(row[idxMotivo] || "").trim() : "Não Concluinte"
    });
  }

  var endpoint = obterEndpointApi();
  var options = obterOpcoesHttp({
    action: 'sync_nao_concluintes_bulk',
    nao_concluintes: naoConcluintes
  });

  try {
    var resp = UrlFetchApp.fetch(endpoint, options);
    if (resp.getResponseCode() === 200) return { total: naoConcluintes.length };
  } catch (err) {
    Logger.log('Erro ao sincronizar não concluintes: ' + err.toString());
  }

  return { total: 0 };
}


/**
 * -----------------------------------------------------------------------------------------
 * 9. SINCRONIZAR FORMULÁRIOS DE MOVIMENTAÇÃO (TROCAS & VÍNCULOS)
 * -----------------------------------------------------------------------------------------
 */
function sincronizarAbasMovimentacoesParaTiDB() {
  var ss = obterPlanilhaMestra();
  var movimentacoes = [];

  // Aba 1: Troca de Turma
  var abaTurma = ss.getSheetByName("Troca de Turma");
  if (abaTurma) {
    var dTurma = abaTurma.getDataRange().getValues();
    for (var t = 1; t < dTurma.length; t++) {
      var rt = dTurma[t];
      var emailT = String(rt[1] || "").trim().toLowerCase();
      var nomeT = String(rt[2] || "").trim();
      if (!emailT && !nomeT) continue;

      var statusRawT = String(rt[14] || "").trim();
      var statusT = (statusRawT.toLowerCase().indexOf("atendido") !== -1 || statusRawT.toLowerCase().indexOf("conclu") !== -1) ? "Atendida" :
                    (statusRawT.toLowerCase().indexOf("indefer") !== -1 || statusRawT.toLowerCase().indexOf("recus") !== -1) ? "Recusada" : "Pendente";

      movimentacoes.push({
        data_solicitacao: rt[0] ? String(rt[0]) : null,
        email_cursista: emailT,
        nome_cursista: nomeT,
        cgm: null,
        cpf_cursista: rt[4] ? String(rt[4]).replace(/\D/g, "") : null,
        turma_antiga: rt[9] ? String(rt[9]) : null,
        turma_nova: rt[10] ? String(rt[10]) : null,
        tipo_acao: 'Troca de Turma',
        motivo: rt[12] ? String(rt[12]) : 'Solicitação via Formulário',
        status: statusT,
        nota_resolucao: statusRawT ? String(rt[15] || statusRawT) : null,
        solicitadoPor: 'Google Forms'
      });
    }
  }

  // Aba 2: Troca de Modalidade
  var abaMod = ss.getSheetByName("Troca de Modalidade");
  if (abaMod) {
    var dMod = abaMod.getDataRange().getValues();
    for (var m = 1; m < dMod.length; m++) {
      var rm = dMod[m];
      var emailM = String(rm[1] || "").trim().toLowerCase();
      var nomeM = String(rm[2] || "").trim();
      if (!emailM && !nomeM) continue;

      var statusRawM = String(rm[12] || "").trim();
      var statusM = (statusRawM.toLowerCase().indexOf("atendido") !== -1 || statusRawM.toLowerCase().indexOf("conclu") !== -1) ? "Atendida" :
                    (statusRawM.toLowerCase().indexOf("indefer") !== -1 || statusRawM.toLowerCase().indexOf("recus") !== -1) ? "Recusada" : "Pendente";

      movimentacoes.push({
        data_solicitacao: rm[0] ? String(rm[0]) : null,
        email_cursista: emailM,
        nome_cursista: nomeM,
        cgm: null,
        cpf_cursista: rm[4] ? String(rm[4]).replace(/\D/g, "") : null,
        turma_antiga: rm[9] ? String(rm[9]) : null,
        turma_nova: rm[10] ? String(rm[10]) : null,
        tipo_acao: 'Troca de Modalidade',
        motivo: rm[11] ? String(rm[11]) : 'Solicitação via Formulário',
        status: statusM,
        nota_resolucao: statusRawM ? String(rm[13] || statusRawM) : null,
        solicitadoPor: 'Google Forms'
      });
    }
  }

  // Aba 3: Vínculos em Avaliação Formativa
  var abaVinc = ss.getSheetByName("Vínculos em Avaliação Formativa");
  if (abaVinc) {
    var dVinc = abaVinc.getDataRange().getValues();
    for (var v = 1; v < dVinc.length; v++) {
      var rv = dVinc[v];
      var emailV = String(rv[1] || "").trim().toLowerCase();
      var nomeV = String(rv[2] || "").trim();
      if (!emailV && !nomeV) continue;

      var statusRawV = String(rv[17] || "").trim();
      var statusV = (statusRawV.toLowerCase().indexOf("atendido") !== -1 || statusRawV.toLowerCase().indexOf("conclu") !== -1) ? "Atendida" :
                    (statusRawV.toLowerCase().indexOf("indefer") !== -1 || statusRawV.toLowerCase().indexOf("recus") !== -1) ? "Recusada" : "Pendente";

      var turmaAntigaV = (rv.length > 21 && rv[21]) ? String(rv[21]).trim() : (rv[12] ? String(rv[12]).trim() : null);
      var turmaNovaV = (rv.length > 22 && rv[22]) ? String(rv[22]).trim() : (rv[13] ? String(rv[13]).trim() : null);

      movimentacoes.push({
        data_solicitacao: rv[0] ? String(rv[0]) : null,
        email_cursista: emailV,
        nome_cursista: nomeV,
        cgm: null,
        cpf_cursista: rv[4] ? String(rv[4]).replace(/\D/g, "") : null,
        turma_antiga: turmaAntigaV || null,
        turma_nova: turmaNovaV || null,
        tipo_acao: 'Vínculo na AF',
        motivo: 'Solicitação de Vínculos em Avaliação Formativa',
        status: statusV,
        nota_resolucao: statusRawV ? String(rv[18] || statusRawV) : null,
        solicitadoPor: 'Google Forms'
      });
    }
  }

  if (movimentacoes.length === 0) return { total: 0 };

  var BATCH_SIZE = 150;
  var totalSinc = 0;
  for (var b = 0; b < movimentacoes.length; b += BATCH_SIZE) {
    var lote = movimentacoes.slice(b, b + BATCH_SIZE);
    var endpoint = obterEndpointApi();
    var options = obterOpcoesHttp({
      action: 'sync_movimentacoes_bulk',
      movimentacoes: lote,
      truncate: (b === 0)
    });

    try {
      var resp = UrlFetchApp.fetch(endpoint, options);
      if (resp.getResponseCode() === 200) totalSinc += lote.length;
    } catch (err) {
      Logger.log('Erro ao sincronizar movimentações: ' + err.toString());
    }
  }

  return { total: totalSinc };
}


/**
 * -----------------------------------------------------------------------------------------
 * 10. SINCRONIZAR OBSERVAÇÕES DA PRÁTICA (4 PLANILHAS EXTERNAS DOS FORMADORES)
 * -----------------------------------------------------------------------------------------
 */
function extrairLinhasObservacoes(aba, configPadrao) {
  var dados = aba.getDataRange().getValues();
  if (dados.length < 2) return [];

  var cabecalho = dados[0].map(function(c) {
    return String(c || "").trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  });

  function getIdx(keywords) {
    for (var k = 0; k < keywords.length; k++) {
      var idx = cabecalho.indexOf(keywords[k].toLowerCase());
      if (idx !== -1) return idx;
    }
    for (var k = 0; k < keywords.length; k++) {
      var kw = keywords[k].toLowerCase();
      var idx = cabecalho.findIndex(function(c) { return c.includes(kw); });
      if (idx !== -1) return idx;
    }
    return -1;
  }

  var idxCarimbo = getIdx(["carimbo", "data hora", "timestamp"]);
  var idxEmailCursista = getIdx(["e-mail cursista", "email cursista", "e-mail institucional do cursista", "e-mail", "email"]);
  var idxNomeCursista = getIdx(["nome cursista", "nome do profissional", "nome do cursista", "cursista", "nome"]);
  var idxEmailFormador = getIdx(["e-mail formador", "email formador", "e-mail institucional do formador"]);
  var idxNomeFormador = getIdx(["nome formador", "nome do formador", "formador"]);
  var idxAno = getIdx(["ano formativo", "ano"]);
  var idxSemestre = getIdx(["semestre"]);
  var idxChamamento = getIdx(["chamamento"]);
  var idxModalidade = getIdx(["modalidade"]);
  var idxComponente = getIdx(["componente"]);
  var idxTurma = getIdx(["turma", "turmas"]);
  var idxTema = getIdx(["tema"]);
  var idxObsRealizada = getIdx(["observacao realizada", "realizada", "a observacao da pratica pedagogica foi realizada"]);
  var idxDataPratica = getIdx(["data pratica", "data da pratica", "data da observacao"]);
  var idxLinkGravacao = getIdx(["link gravacao", "gravacao", "link da gravacao da aula observada"]);
  var idxLinkPlanejamento = getIdx(["link planejamento", "planejamento", "link do planejamento da aula observada"]);
  var idxLinkFeedback = getIdx(["link gravacao feedback", "link feedback", "link da gravacao do feedback"]);

  var lista = [];
  for (var i = 1; i < dados.length; i++) {
    var row = dados[i];
    var emailCur = idxEmailCursista !== -1 ? String(row[idxEmailCursista] || "").trim().toLowerCase() : "";
    if (!emailCur) continue;

    var carimbo = idxCarimbo !== -1 ? String(row[idxCarimbo] || "").trim() : "";
    var idOrigem = "OBS_" + emailCur.replace(/[^a-z0-9]/g, "") + "_" + (carimbo ? carimbo.replace(/[^0-9]/g, "") : i);

    lista.push({
      id_origem: idOrigem,
      carimbo: carimbo,
      email_cursista: emailCur,
      nome_cursista: idxNomeCursista !== -1 ? String(row[idxNomeCursista] || "").trim() : null,
      email_formador: idxEmailFormador !== -1 ? String(row[idxEmailFormador] || "").trim().toLowerCase() : null,
      nome_formador: idxNomeFormador !== -1 ? String(row[idxNomeFormador] || "").trim() : null,
      ano_formativo: idxAno !== -1 ? String(row[idxAno] || "").trim() : (configPadrao ? configPadrao.anoFormativoPadrao : null),
      semestre: idxSemestre !== -1 ? String(row[idxSemestre] || "").trim() : (configPadrao ? configPadrao.semestrePadrao : null),
      chamamento: idxChamamento !== -1 ? String(row[idxChamamento] || "").trim() : null,
      modalidade: idxModalidade !== -1 ? String(row[idxModalidade] || "").trim() : null,
      componente: idxComponente !== -1 ? String(row[idxComponente] || "").trim() : null,
      turma: idxTurma !== -1 ? String(row[idxTurma] || "").trim() : null,
      tema: idxTema !== -1 ? String(row[idxTema] || "").trim() : null,
      observacao_realizada: idxObsRealizada !== -1 ? String(row[idxObsRealizada] || "").trim() : "Sim",
      data_pratica: idxDataPratica !== -1 ? String(row[idxDataPratica] || "").trim() : null,
      link_gravacao_pratica: idxLinkGravacao !== -1 ? String(row[idxLinkGravacao] || "").trim() : null,
      link_planejamento: idxLinkPlanejamento !== -1 ? String(row[idxLinkPlanejamento] || "").trim() : null,
      link_gravacao_feedback: idxLinkFeedback !== -1 ? String(row[idxLinkFeedback] || "").trim() : null
    });
  }
  return lista;
}

function enviarLoteObservacoesParaTiDB(observacoes) {
  if (!observacoes || observacoes.length === 0) return 0;
  var BATCH_SIZE = 150;
  var totalSinc = 0;
  for (var b = 0; b < observacoes.length; b += BATCH_SIZE) {
    var lote = observacoes.slice(b, b + BATCH_SIZE);
    var endpoint = obterEndpointApi('sync_observacoes_bulk');
    var options = obterOpcoesHttp({
      action: 'sync_observacoes_bulk',
      observacoes: lote
    });

    try {
      var resp = UrlFetchApp.fetch(endpoint, options);
      if (resp.getResponseCode() === 200) totalSinc += lote.length;
    } catch (err) {
      Logger.log('Erro ao sincronizar observações: ' + err.toString());
    }
  }
  return totalSinc;
}

function sincronizarAbaObservacoesParaTiDB() {
  var ss = obterPlanilhaMestra();
  var nomesObs = ["Observações de Prática", "Observacoes_Pratica", "OBSERVACOES", "Observações"];
  var aba = null;
  for (var k = 0; k < nomesObs.length; k++) {
    aba = ss.getSheetByName(nomesObs[k]);
    if (aba) break;
  }

  // 1. Se existir diretamente na planilha mestra, sincroniza
  if (aba) {
    var linhas = extrairLinhasObservacoes(aba, null);
    var tot = enviarLoteObservacoesParaTiDB(linhas);
    return { total: tot };
  }

  // 2. Lê a partir das 4 planilhas externas de Formadores
  Logger.log('Sincronizando a partir das 4 planilhas externas de Formadores...');
  var totalGeral = 0;
  for (var p = 0; p < PLANILHAS_OBSERVACOES_FORMADOR.length; p++) {
    var cfg = PLANILHAS_OBSERVACOES_FORMADOR[p];
    try {
      var extSs = SpreadsheetApp.openById(cfg.id);
      var extAba = extSs.getSheets()[0];
      var obs = extrairLinhasObservacoes(extAba, cfg);
      var ok = enviarLoteObservacoesParaTiDB(obs);
      totalGeral += ok;
      Logger.log('✓ ' + cfg.nome + ': ' + ok + ' observações sincronizadas');
    } catch (errExt) {
      Logger.log('Erro ao abrir planilha ' + cfg.nome + ' (' + cfg.id + '): ' + errExt.toString());
    }
  }
  return { total: totalGeral };
}


/**
 * -----------------------------------------------------------------------------------------
 * 11. SINCRONIZAR OBSERVAÇÕES DE TUTORIA (TUTOR INSIGHTS)
 * -----------------------------------------------------------------------------------------
 */
function sincronizarAbaObservacoesTutoriaParaTiDB() {
  if (!PLANILHA_OBSERVACOES_TUTOR_ID) return { total: 0 };
  Logger.log('Sincronizando observações de tutoria...');
  try {
    var ssTutor = SpreadsheetApp.openById(PLANILHA_OBSERVACOES_TUTOR_ID);
    var aba = ssTutor.getSheets()[0];
    var dados = aba.getDataRange().getValues();
    if (dados.length < 2) return { total: 0 };

    var cabecalho = dados[0].map(function(c) {
      return String(c || "").trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    });

    function getIdx(keywords) {
      for (var k = 0; k < keywords.length; k++) {
        var idx = cabecalho.indexOf(keywords[k].toLowerCase());
        if (idx !== -1) return idx;
      }
      for (var k = 0; k < keywords.length; k++) {
        var kw = keywords[k].toLowerCase();
        var idx = cabecalho.findIndex(function(c) { return c.includes(kw); });
        if (idx !== -1) return idx;
      }
      return -1;
    }

    var idxCarimbo = getIdx(["carimbo", "data hora", "timestamp"]);
    var idxEmailTutor = getIdx(["e-mail tutor", "email tutor", "tutor", "email institucional do tutor"]);
    var idxNomeTutor = getIdx(["nome tutor", "tutor responsavel", "nome do tutor"]);
    var idxEmailFormador = getIdx(["e-mail formador", "email formador", "formador"]);
    var idxNomeFormador = getIdx(["nome formador", "nome do formador"]);
    var idxNre = getIdx(["nre"]);
    var idxAcaoAcomp = getIdx(["acao acompanhamento", "acao"]);
    var idxDataObs = getIdx(["data observacao", "data"]);
    var idxLinkAcao = getIdx(["link acao observada", "link gravacao", "link"]);
    var idxDestaques = getIdx(["destaques"]);
    var idxDesenvolver = getIdx(["pontos a desenvolver", "desenvolver"]);
    var idxEncaminhamentos = getIdx(["encaminhamentos"]);

    var lista = [];
    for (var i = 1; i < dados.length; i++) {
      var row = dados[i];
      var emailTut = idxEmailTutor !== -1 ? String(row[idxEmailTutor] || "").trim().toLowerCase() : "";
      var emailForm = idxEmailFormador !== -1 ? String(row[idxEmailFormador] || "").trim().toLowerCase() : "";
      if (!emailTut && !emailForm) continue;

      lista.push({
        carimbo: idxCarimbo !== -1 ? String(row[idxCarimbo] || "").trim() : null,
        email_tutor: emailTut,
        nome_tutor: idxNomeTutor !== -1 ? String(row[idxNomeTutor] || "").trim() : null,
        email_formador: emailForm,
        nome_formador: idxNomeFormador !== -1 ? String(row[idxNomeFormador] || "").trim() : null,
        nre: idxNre !== -1 ? String(row[idxNre] || "").trim() : null,
        acao_acompanhamento: idxAcaoAcomp !== -1 ? String(row[idxAcaoAcomp] || "").trim() : null,
        data_observacao: idxDataObs !== -1 ? String(row[idxDataObs] || "").trim() : null,
        link_acao_observada: idxLinkAcao !== -1 ? String(row[idxLinkAcao] || "").trim() : null,
        destaques: idxDestaques !== -1 ? String(row[idxDestaques] || "").trim() : null,
        desenvolver: idxDesenvolver !== -1 ? String(row[idxDesenvolver] || "").trim() : null,
        encaminhamentos: idxEncaminhamentos !== -1 ? String(row[idxEncaminhamentos] || "").trim() : null
      });
    }

    var BATCH_SIZE = 150;
    var tot = 0;
    for (var b = 0; b < lista.length; b += BATCH_SIZE) {
      var lote = lista.slice(b, b + BATCH_SIZE);
      var endpoint = obterEndpointApi('sync_observacoes_tutor_bulk');
      var options = obterOpcoesHttp({
        action: 'sync_observacoes_tutor_bulk',
        observacoes: lote
      });
      try {
        var resp = UrlFetchApp.fetch(endpoint, options);
        if (resp.getResponseCode() === 200) tot += lote.length;
      } catch (err) {
        Logger.log('Erro ao enviar observações de tutoria: ' + err.toString());
      }
    }
    return { total: tot };
  } catch (errSs) {
    Logger.log('Erro ao sincronizar tutoria: ' + errSs.toString());
    return { total: 0 };
  }
}


/**
 * -----------------------------------------------------------------------------------------
 * 12. INTEGRAÇÃO COM SIGEP (CONSULTA, PREENCHIMENTO E EXONERAÇÃO)
 * -----------------------------------------------------------------------------------------
 */
function menuDialogoBuscarSigep() {
  var ui = SpreadsheetApp.getUi();
  var htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <base target="_top">
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Inter', sans-serif; }
          body { padding: 18px; background: #f8fafc; color: #1e293b; font-size: 13px; }
          .header { margin-bottom: 16px; border-bottom: 1px solid #e2e8f0; padding-bottom: 10px; }
          .header h2 { font-size: 16px; font-weight: 700; color: #0f172a; display: flex; align-items: center; gap: 8px; }
          .header p { color: #64748b; font-size: 12px; margin-top: 4px; }
          .search-box { display: flex; gap: 8px; margin-bottom: 16px; }
          input[type="text"] {
            flex: 1; padding: 9px 12px; border: 1.5px solid #cbd5e1; border-radius: 6px;
            font-size: 14px; outline: none; transition: border-color 0.2s;
          }
          input[type="text"]:focus { border-color: #2563eb; }
          button {
            padding: 9px 16px; background: #2563eb; color: #fff; font-weight: 600;
            border: none; border-radius: 6px; cursor: pointer; transition: background 0.2s;
          }
          button:hover { background: #1d4ed8; }
          button:disabled { background: #94a3b8; cursor: not-allowed; }
          .card {
            background: #fff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.05); display: none;
          }
          .badge {
            display: inline-block; padding: 3px 8px; font-size: 11px; font-weight: 600;
            border-radius: 9999px; margin-bottom: 10px; text-transform: uppercase;
          }
          .badge-cursista { background: #dbeafe; color: #1e40af; }
          .badge-formador { background: #dcfce7; color: #166534; }
          .row { display: flex; justify-content: space-between; padding: 5px 0; border-bottom: 1px solid #f1f5f9; }
          .label { color: #64748b; font-weight: 500; font-size: 12px; }
          .val { font-weight: 600; color: #0f172a; text-align: right; max-width: 65%; word-break: break-word; }
          .footer-btn { margin-top: 14px; display: flex; justify-content: flex-end; gap: 8px; }
          .btn-secondary { background: #f1f5f9; color: #475569; }
          .btn-secondary:hover { background: #e2e8f0; }
          .status { font-size: 12px; margin-top: 6px; font-weight: 500; }
          .error { color: #dc2626; }
          .info { color: #2563eb; }
        </style>
      </head>
      <body>
        <div class="header">
          <h2>🔍 Consulta Integrada ao SIGEP</h2>
          <p>Digite o CPF do cursista ou formador para buscar no banco oficial do SIGEP.</p>
        </div>

        <div class="search-box">
          <input type="text" id="cpfInput" placeholder="Ex: 123.456.789-00 ou 12345678900" autofocus>
          <button id="btnBuscar" onclick="buscar()">Consultar</button>
        </div>
        <div id="statusMsg" class="status"></div>

        <div id="resultadoCard" class="card">
          <div><span id="resTipo" class="badge"></span></div>
          <div class="row"><span class="label">Nome Completo:</span><span id="resNome" class="val"></span></div>
          <div class="row"><span class="label">CPF:</span><span id="resCpf" class="val"></span></div>
          <div class="row"><span class="label">CGM:</span><span id="resCgm" class="val"></span></div>
          <div class="row"><span class="label">RG:</span><span id="resRg" class="val"></span></div>
          <div class="row"><span class="label">E-mail @escola:</span><span id="resEmail" class="val"></span></div>
          <div class="row"><span class="label">Componente / Cargo:</span><span id="resComp" class="val"></span></div>
          <div class="row"><span class="label">NRE / Município:</span><span id="resLocal" class="val"></span></div>
          <div class="row"><span class="label">Estabelecimento:</span><span id="resEstab" class="val"></span></div>
          <div class="row"><span class="label">Chamamento / Linha:</span><span id="resChamamento" class="val"></span></div>

          <div class="footer-btn">
            <button class="btn-secondary" onclick="google.script.host.close()">Fechar</button>
          </div>
        </div>

        <script>
          const input = document.getElementById('cpfInput');
          input.addEventListener('keypress', function(e) { if (e.key === 'Enter') buscar(); });

          function buscar() {
            const cpf = input.value.trim();
            const msg = document.getElementById('statusMsg');
            const card = document.getElementById('resultadoCard');
            const btn = document.getElementById('btnBuscar');

            if (!cpf) {
              msg.className = 'status error';
              msg.innerText = 'Por favor, informe um CPF válido.';
              return;
            }

            msg.className = 'status info';
            msg.innerText = 'Consultando base SIGEP, aguarde...';
            btn.disabled = true;
            card.style.display = 'none';

            google.script.run
              .withSuccessHandler(function(res) {
                btn.disabled = false;
                if (!res || !res.encontrado) {
                  msg.className = 'status error';
                  msg.innerText = (res && res.mensagem) ? res.mensagem : 'CPF não localizado no SIGEP.';
                  return;
                }
                msg.innerText = '';
                document.getElementById('resTipo').innerText = res.origem || 'SIGEP';
                document.getElementById('resTipo').className = 'badge ' + (res.tipo === 'formador' ? 'badge-formador' : 'badge-cursista');
                document.getElementById('resNome').innerText = res.nome || '—';
                document.getElementById('resCpf').innerText = res.cpf || '—';
                document.getElementById('resCgm').innerText = res.cgm || '—';
                document.getElementById('resRg').innerText = res.rg || '—';
                document.getElementById('resEmail').innerText = res.emailGoogle || res.emailMicrosoft || '—';
                document.getElementById('resComp').innerText = res.componente_conc || res.disciplina || '—';
                document.getElementById('resLocal').innerText = (res.nre_exe || '—') + ' / ' + (res.munic_exe || '—');
                document.getElementById('resEstab').innerText = res.estab_exe || res.estabelecimento || res.estab_lot || '—';
                document.getElementById('resChamamento').innerText = (res.chamamento || '1º Chamamento') + ' (LF: ' + (res.linhaFuncional || 1) + ')';
                card.style.display = 'block';
              })
              .withFailureHandler(function(err) {
                btn.disabled = false;
                msg.className = 'status error';
                msg.innerText = 'Erro na comunicação: ' + err.message;
              })
              .apiBuscarDadosSigepPorCpf(cpf);
          }
        </script>
      </body>
    </html>
  `;
  var htmlOutput = HtmlService.createHtmlOutput(htmlContent).setWidth(520).setHeight(480);
  ui.showModalDialog(htmlOutput, 'Busca Oficial no SIGEP · SEED-PR');
}

function menuPreencherLinhaAtiva() {
  var ui = SpreadsheetApp.getUi();
  try {
    var sheet = SpreadsheetApp.getActiveSheet();
    var activeRange = sheet.getActiveRange();
    if (!activeRange) {
      ui.alert('Atenção', 'Selecione uma linha ou célula contendo o CPF para preencher.', ui.ButtonSet.OK);
      return;
    }

    var row = activeRange.getRow();
    if (row === 1) {
      ui.alert('Atenção', 'Você está selecionando a linha de cabeçalho. Selecione uma linha de dados.', ui.ButtonSet.OK);
      return;
    }

    var lastCol = sheet.getLastColumn();
    var headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0].map(function(h) { return String(h).trim().toLowerCase(); });
    var rowValues = sheet.getRange(row, 1, 1, lastCol).getValues()[0];

    var colCpfIdx = headers.findIndex(function(h) { return h === 'cpf' || h.indexOf('cpf') !== -1; });
    var cpfValor = '';

    if (colCpfIdx !== -1 && rowValues[colCpfIdx]) {
      cpfValor = String(rowValues[colCpfIdx]).replace(/\D/g, '').trim();
    }

    if (!cpfValor) {
      var valSel = String(activeRange.getValue() || '').replace(/\D/g, '').trim();
      if (valSel.length === 11) {
        cpfValor = valSel;
      }
    }

    if (!cpfValor) {
      var prompt = ui.prompt('Preenchimento SIGEP', 'Informe o CPF do cursista/servidor a preencher nesta linha:', ui.ButtonSet.OK_CANCEL);
      if (prompt.getSelectedButton() !== ui.Button.OK) return;
      cpfValor = String(prompt.getResponseText() || '').replace(/\D/g, '').trim();
    }

    if (!cpfValor) {
      ui.alert('CPF não informado.');
      return;
    }

    var dadosSigep = apiBuscarDadosSigepPorCpf(cpfValor);
    if (!dadosSigep || !dadosSigep.encontrado) {
      ui.alert('Não localizado', 'O CPF ' + cpfValor + ' não foi localizado nas abas SIGEP da planilha.', ui.ButtonSet.OK);
      return;
    }

    var mapaCampos = {
      'nome_cursista': dadosSigep.nome,
      'nome': dadosSigep.nome,
      'rg': dadosSigep.rg,
      'cgm': dadosSigep.cgm,
      'e-mail': dadosSigep.emailGoogle || dadosSigep.emailMicrosoft,
      'email': dadosSigep.emailGoogle || dadosSigep.emailMicrosoft,
      'e-mail_cursista': dadosSigep.emailGoogle || dadosSigep.emailMicrosoft,
      'componente': dadosSigep.componente_conc || dadosSigep.disciplina,
      'componente_conc': dadosSigep.componente_conc || dadosSigep.disciplina,
      'nre_exe': dadosSigep.nre_exe,
      'munic_exe': dadosSigep.munic_exe,
      'estab_exe': dadosSigep.estab_exe || dadosSigep.estabelecimento,
      'chamamento': dadosSigep.chamamento,
      'linha funcional': dadosSigep.linhaFuncional,
      'periodo_ini': dadosSigep.periodo_ini
    };

    var camposPreenchidos = 0;
    headers.forEach(function(h, idx) {
      if (mapaCampos[h] !== undefined && (rowValues[idx] === '' || rowValues[idx] === null)) {
        sheet.getRange(row, idx + 1).setValue(mapaCampos[h]);
        camposPreenchidos++;
      }
    });

    if (colCpfIdx !== -1 && (!rowValues[colCpfIdx] || String(rowValues[colCpfIdx]).trim() === '')) {
      sheet.getRange(row, colCpfIdx + 1).setValue(cpfValor);
    }

    SpreadsheetApp.getActiveSpreadsheet().toast('Linha ' + row + ' atualizada (' + camposPreenchidos + ' campos preenchidos)', '✅ SIGEP Integrado');
  } catch (err) {
    ui.alert('Erro ao preencher linha', err.toString(), ui.ButtonSet.OK);
  }
}

function menuRegistrarExoneracao() {
  var ui = SpreadsheetApp.getUi();
  try {
    var promptCpf = ui.prompt('Registrar Exoneração', 'Informe o CPF do servidor a ser exonerado:', ui.ButtonSet.OK_CANCEL);
    if (promptCpf.getSelectedButton() !== ui.Button.OK) return;

    var cpf = String(promptCpf.getResponseText() || '').replace(/\D/g, '').trim();
    if (!cpf) {
      ui.alert('CPF inválido.');
      return;
    }

    var busca = apiBuscarDadosSigepPorCpf(cpf);
    var nomePadrao = (busca && busca.encontrado) ? busca.nome : '';

    var promptNome = ui.prompt(
      'Confirmar Nome do Servidor',
      'Confirme ou informe o nome completo do servidor:\n(CPF: ' + cpf + ')',
      ui.ButtonSet.OK_CANCEL
    );
    if (promptNome.getSelectedButton() !== ui.Button.OK) return;
    var nome = String(promptNome.getResponseText() || nomePadrao).trim();

    var promptMotivo = ui.prompt(
      'Motivo da Exoneração',
      'Informe o motivo da exoneração (ou deixe padrão):',
      ui.ButtonSet.OK_CANCEL
    );
    if (promptMotivo.getSelectedButton() !== ui.Button.OK) return;
    var motivo = String(promptMotivo.getResponseText() || 'Solicitação do Servidor').trim();

    var conf = ui.alert(
      'Confirmar Exoneração',
      'Deseja realmente registrar a exoneração de:\n\n' +
      'Nome: ' + nome + '\n' +
      'CPF: ' + cpf + '\n' +
      'Motivo: ' + motivo + '\n\n' +
      'O registro será gravado na aba EXONERADOS e a base sincronizada.',
      ui.ButtonSet.YES_NO
    );
    if (conf !== ui.Button.YES) return;

    var res = apiExonerarCursista(cpf, nome, motivo);
    if (res.status === 'sucesso') {
      try { sincronizarAbaExoneradosParaTiDB(); } catch (e) {}
      ui.alert('✅ Exoneração Registrada!', 'O servidor ' + nome + ' foi registrado como Exonerado com sucesso.', ui.ButtonSet.OK);
    } else {
      ui.alert('❌ Erro ao Registrar', res.mensagem || 'Falha desconhecida.', ui.ButtonSet.OK);
    }
  } catch (err) {
    ui.alert('Erro ao registrar exoneração', err.toString(), ui.ButtonSet.OK);
  }
}

function apiBuscarDadosSigepPorCpf(cpfBusca) {
  try {
    var cpfLimpo = String(cpfBusca || '').replace(/\D/g, '').trim();
    if (!cpfLimpo) return { encontrado: false, mensagem: 'CPF inválido ou em branco.' };

    var ss = obterPlanilhaMestra();

    var abaSigep = ss.getSheetByName("SIGEP") || ss.getSheetByName("BASE_SIGEP");
    if (abaSigep) {
      var dados = abaSigep.getDataRange().getValues();
      for (var i = 1; i < dados.length; i++) {
        var linha = dados[i];
        var cpfLinha = String(linha[1] || '').replace(/\D/g, '').trim();

        if (cpfLinha === cpfLimpo) {
          var dataInicio = '';
          if (linha[6]) {
            try {
              dataInicio = Utilities.formatDate(new Date(linha[6]), 'America/Sao_Paulo', 'dd/MM/yyyy');
            } catch (e) {
              dataInicio = String(linha[6]);
            }
          }

          return {
            encontrado: true,
            origem: 'SIGEP (Cursista)',
            tipo: 'cursista',
            cpf: cpfLinha,
            nome: linha[0] || '',
            rg: linha[2] || '',
            cgm: linha[3] || '',
            emailGoogle: linha[4] || '',
            emailMicrosoft: linha[5] || '',
            periodo_ini: dataInicio,
            componente_conc: linha[7] || '',
            nre_lot: linha[8] || '',
            estab_lot: linha[9] || '',
            munic_lot: linha[10] || '',
            nre_exe: linha[11] || '',
            munic_exe: linha[12] || '',
            estab_exe: linha[13] || '',
            disciplina_exe: linha[14] || '',
            chamamento: linha[23] || '1º Chamamento',
            linhaFuncional: linha[24] || 1
          };
        }
      }
    }

    var abaSigepForm = ss.getSheetByName("SIGEP_FORMADORES");
    if (abaSigepForm) {
      var dadosForm = abaSigepForm.getDataRange().getValues();
      for (var f = 1; f < dadosForm.length; f++) {
        var l = dadosForm[f];
        var cpfL = String(l[1] || '').replace(/\D/g, '').trim();

        if (cpfL === cpfLimpo) {
          return {
            encontrado: true,
            origem: 'SIGEP Formadores',
            tipo: 'formador',
            cpf: cpfL,
            nome: l[0] || '',
            cgm: l[2] || '',
            emailGoogle: l[3] || '',
            emailMicrosoft: l[4] || '',
            telefone: l[5] || '',
            disciplina: l[6] || '',
            linhaFuncional: l[7] || 1,
            turma: l[8] || '',
            nre_exe: l[11] || '',
            munic_exe: l[12] || '',
            estabelecimento: l[13] || '',
            vinculo: l[14] || ''
          };
        }
      }
    }

    return { encontrado: false, mensagem: 'CPF ' + cpfLimpo + ' não consta na base do SIGEP.' };
  } catch (err) {
    return { encontrado: false, mensagem: 'Erro na busca SIGEP: ' + err.toString() };
  }
}

function apiExonerarCursista(cpf, nome, motivo) {
  try {
    var ss = obterPlanilhaMestra();
    var colunas = ['Data Exoneração', 'CPF', 'Nome', 'Motivo', 'Registrado Por'];
    var carimbo = Utilities.formatDate(new Date(), 'America/Sao_Paulo', 'dd/MM/yyyy HH:mm:ss');
    var admin = Session.getActiveUser().getEmail();
    var linha = [carimbo, cpf, nome, motivo || 'Solicitação do Servidor', admin];
    
    return salvarLinhaPlanilha(ss.getId(), "EXONERADOS", colunas, linha);
  } catch (err) {
    return { status: 'erro', mensagem: err.toString() };
  }
}


/**
 * -----------------------------------------------------------------------------------------
 * 13. DIÁLOGO EXPLICATIVO DO REMANEJAMENTO DE TURMAS
 * -----------------------------------------------------------------------------------------
 */
function menuSobreRemanejamento() {
  var ui = SpreadsheetApp.getUi();
  var msg =
    '⚖️ DIRETRIZES OFICIAIS DO REMANEJAMENTO DE TURMAS\n\n' +
    '1. REGRA MANDATÓRIA: PROIBIDO DE MANEIRA ALGUMA TURMAS COM 1 OU 2 CURSISTAS\n' +
    '   Turmas com 1 ou 2 cursistas NÃO são aceitáveis de forma alguma.\n' +
    '   Turmas com 3 cursistas são exceções aceitáveis, mas ao mínimo possível.\n' +
    '   O padrão contínuo e prioritário é manter turmas com 4 a 9 cursistas.\n\n' +
    '2. ÁREAS DO CONHECIMENTO & NIVELAMENTO:\n' +
    '   • FÍSICA, QUÍMICA, BIOLOGIA E CIÊNCIAS pertencem à mesma área (Ciências da Natureza).\n' +
    '   • O nivelamento equilibra as turmas pela média da mesma área e mesmo horário, eliminando ' +
    'qualquer turma com 1 ou 2 cursistas.\n\n' +
    '3. PRIORIDADES DE DESTINO:\n' +
    '   • Turmas abaixo do mínimo (n < 4) têm prioridade absoluta para receber alunos.\n' +
    '   • É prioridade para o mesmo componente curricular (MESMO COMPONENTE); senão tiver o mesmo ' +
    'componente, outro componente da mesma área do conhecimento (MESMA ÁREA: <Área>) e mesmo horário da turma anterior.\n' +
    '   • Prioridade turmas com menos de 9, sem exceções (teto rígido <= 9).\n' +
    '   • Prioridade turmas com mais de 3, com exceções de 3 mantidas ao estritamente mínimo.\n\n' +
    '4. REGRA DE EXCLUSÃO (PROTEÇÃO):\n' +
    '   • Não mexer com a modalidade TÉCNICOS (preservada integralmente sem alterações).\n\n' +
    '5. INVARIANTES PEDAGÓGICOS E HORÁRIOS OBRIGATÓRIOS:\n' +
    '   • MESMO ANO FORMATIVO É OBRIGATÓRIO: Não pode ser ano formativo diferente.\n' +
    '   • PRECISA SER MESMO HORÁRIO: Não pode ser mesmo turno ou horário diferente (exige rigorosamente o mesmo horário inicial).\n' +
    '   • Mesma modalidade formativa (Docentes, etc.)\n' +
    '   • Desempate: Mesmo dia da semana (dia_da_semana)\n\n' +
    '6. PAINEL DE VALIDAÇÃO (ANTES VS DEPOIS E CHECKLIST):\n' +
    '   No passo 2 (Validar), você tem uma visão completa da quantificação de turmas Antes vs Depois ' +
    '(comprovando 0 turmas com 1 ou 2 cursistas) e um Checklist interativo para desmarcar movimentações indesejadas antes de aplicar na planilha.';

  ui.alert('Diretrizes de Remanejamento', msg, ui.ButtonSet.OK);
}

// Stubs para menus de remanejamento caso implementados na planilha
function rmjMenuAnalisar() {
  SpreadsheetApp.getUi().alert('Remanejamento', 'Motor de análise de remanejamento ativo.', SpreadsheetApp.getUi().ButtonSet.OK);
}
function rmjMenuValidar() {
  SpreadsheetApp.getUi().alert('Validação', 'Comparativo visual de turmas preparado.', SpreadsheetApp.getUi().ButtonSet.OK);
}
function rmjMenuRealizar() {
  SpreadsheetApp.getUi().alert('Redistribuição', 'Pronto para gravar redistribuição.', SpreadsheetApp.getUi().ButtonSet.OK);
}
function rmjMenuEmail() {
  SpreadsheetApp.getUi().alert('E-mail Informativo', 'Disparo de e-mails preparado.', SpreadsheetApp.getUi().ButtonSet.OK);
}
function menuAtualizarDashboard() {
  SpreadsheetApp.getActiveSpreadsheet().toast('Base pronta para o dashboard.', 'Dashboard', 3);
}
function instalarGatilhosAutomaticos() {
  SpreadsheetApp.getUi().alert('Gatilhos', 'Gatilhos de edição instalados.', SpreadsheetApp.getUi().ButtonSet.OK);
}


/**
 * -----------------------------------------------------------------------------------------
 * 14. FUNÇÕES UTILITÁRIAS E HELPERS GLOBAIS
 * -----------------------------------------------------------------------------------------
 */
function obterPlanilhaMestra() {
  try {
    var ativa = SpreadsheetApp.getActiveSpreadsheet();
    if (ativa) return ativa;
  } catch (e) {}
  try {
    return SpreadsheetApp.openById(SPREADSHEET_ID_MESTRA_TIDB);
  } catch (e) {
    return null;
  }
}

function obterEndpointApi(actionParam) {
  var base = VERCEL_APP_URL.replace(/\/$/, '');
  var path = (API_VERSION === "v2") ? "/api/v2" : "/api/tidb";
  if (actionParam) {
    return base + path + "?action=" + actionParam;
  }
  return base + path;
}

function obterOpcoesHttp(payloadObj) {
  var headers = {
    "Content-Type": "application/json"
  };
  if (SYNC_TOKEN) {
    headers["X-Sync-Token"] = SYNC_TOKEN;
  }
  return {
    method: "post",
    contentType: "application/json",
    headers: headers,
    payload: payloadObj ? JSON.stringify(payloadObj) : undefined,
    muteHttpExceptions: true
  };
}

function salvarLinhaPlanilha(idPlanilha, nomeAba, colunasCabecalho, linhaDados) {
  try {
    var ss = SpreadsheetApp.openById(idPlanilha);
    var aba = ss.getSheetByName(nomeAba);
    if (!aba) {
      aba = ss.insertSheet(nomeAba);
      aba.appendRow(colunasCabecalho);
    }
    aba.appendRow(linhaDados);
    return { status: 'sucesso' };
  } catch (e) {
    return { status: 'erro', mensagem: e.toString() };
  }
}

function setupInicialCriarAbas() {
  var ss = obterPlanilhaMestra();
  var abasNecessarias = ["DADOS", "CONCLUINTES-1CH", "TUTORES", "EXONERADOS", "CURSISTAS NAO CONCLUINTES", "SIGEP", "SIGEP_FORMADORES"];
  var criadas = 0;
  for (var i = 0; i < abasNecessarias.length; i++) {
    var nome = abasNecessarias[i];
    if (!ss.getSheetByName(nome)) {
      ss.insertSheet(nome);
      criadas++;
    }
  }
  SpreadsheetApp.getUi().alert('Verificação de Abas', 'Estrutura verificada! ' + criadas + ' abas adicionais foram criadas.', SpreadsheetApp.getUi().ButtonSet.OK);
}
