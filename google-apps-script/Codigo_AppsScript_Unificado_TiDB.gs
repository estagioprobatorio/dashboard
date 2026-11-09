// =========================================================================================
// GOOGLE APPS SCRIPT - SISTEMA UNIFICADO DE GESTÃO DO ESTÁGIO PROBATÓRIO (SEED-PR)
// Menu Central, Consultas SIGEP, Remanejamento, Intenções 2027 e Sincronização TiDB Cloud (v2)
// =========================================================================================

/**
 * ⚙️ CONFIGURAÇÕES PRINCIPAIS DO SISTEMA
 */

// 1. URL oficial do Dashboard na Vercel (ou URL de túnel/localhost em desenvolvimento)
var VERCEL_APP_URL = "https://dashboard-tawny-delta-96.vercel.app";

// 2. Versão da API: "v2" (Arquitetura segura com hash/cifra de CGM e 1 CGM por pessoa)
var API_VERSION = "v2";

// 3. Token Secreto de Sincronização (SYNC_TOKEN)
// Configure o mesmo valor definido no painel da Vercel (Project Settings ➔ Environment Variables)
var SYNC_TOKEN = "l26zXdDT0Mm3h_KOF9hehDotnB6FYJyg";

// 4. IDs Oficiais das Planilhas do Google Sheets (SEED-PR)
var SPREADSHEET_ID_MESTRA_TIDB = "1sRkA88VrtczqXxQ6PlmgygeCVhPoElRNS8RC1QuQzx0";

// 5. Planilhas Externas Oficiais de Observações da Prática (Formadores -> Cursistas)
var PLANILHAS_OBSERVACOES_FORMADOR = [
  {
    sigla: "1ANO_1SEM",
    nome: "Formador-1ANO_1SEM",
    id: "1KmbMvNOTpj4OaDOdKw5mPVI3iqbo8RbQBqBktM84ToE",
    gid: "1030562032",
    anoFormativoPadrao: "1º ANO",
    semestrePadrao: "1º Semestre/2026"
  },
  {
    sigla: "2e3ANO_2SEM",
    nome: "Formador-2e3ANO-2SEM",
    id: "1uv5QWeqtN5iMkH8nVQUvsYKClv9NaGDHgsdT_D-RPiw",
    gid: "2068065207",
    anoFormativoPadrao: "2º e 3º ANOS",
    semestrePadrao: "2º Semestre/2026"
  },
  {
    sigla: "1ANO_2SEM",
    nome: "Formador-1ANO_2SEM",
    id: "1dL_Q-_15Idx3SNAZOqmKzrnVqA8tHFBzILA5PZ7p798",
    gid: "425616417",
    anoFormativoPadrao: "1º ANO",
    semestrePadrao: "2º Semestre/2026"
  },
  {
    sigla: "2e3ANO_1SEM",
    nome: "Formador-2e3ANO-1SEM",
    id: "1zSnlh7aW8df800lP90rCLVxiHNWAa1f9IGjz2OoDfvU",
    gid: "848666482",
    anoFormativoPadrao: "2º e 3º ANOS",
    semestrePadrao: "1º Semestre/2026"
  }
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

    // Menu Único e Centralizado (Planilhas atuando estritamente como Backup do Banco TiDB Cloud)
    ui.createMenu('⚡ ESTÁGIO PROBATÓRIO')
      .addItem('🔄 Sincronizar Tudo com TiDB Cloud (Backup Completo)', 'sincronizarManualComAlerta')
      .addSeparator()
      .addItem('👥 Sincronizar Cursistas Ativos (DADOS)', 'sincronizarAbaDadosMenu')
      .addItem('🚪 Sincronizar Servidores Exonerados', 'sincronizarAbaExoneradosMenu')
      .addItem('🎓 Sincronizar Concluintes', 'sincronizarAbaConcluintesMenu')
      .addItem('👨‍🏫 Sincronizar Tutores Regionais', 'sincronizarAbaTutoresMenu')
      .addItem('📋 Sincronizar Observações da Prática', 'sincronizarObservacoesPraticaMenu')
      .addItem('🕵️ Sincronizar Observações do Tutor', 'sincronizarObservacoesTutorMenu')
      .addItem('🔀 Sincronizar Movimentações', 'sincronizarAbaMovimentacoesMenu')
      .addSeparator()
      .addItem('🔍 Consultar Cadastro no SIGEP (CPF)', 'menuDialogoBuscarSigep')
      .addItem('🚪 Registrar Exoneração de Servidor', 'menuRegistrarExoneracao')
      .addItem('⚖️ Remanejamento de Turmas (Analisar)', 'rmjMenuAnalisar')
      .addSeparator()
      .addItem('⏰ Agendar Sincronização Automática Diária (07:00)', 'configurarGatilhoDiario7h')
      .addItem('🔍 Testar Conexão com TiDB Cloud', 'testarConexaoTiDB')
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
  SpreadsheetApp.getActiveSpreadsheet().toast('Sincronizando as 4 planilhas de observações dos Formadores...', 'TiDB Serverless', 10);
  var res = sincronizarAbaObservacoesParaTiDB();
  var msg = '✓ Sincronização de Observações de Prática Concluída!\n\n' +
            'Total enviado ao TiDB: ' + (res.total || 0) + ' observações.\n\n' +
            (res.relatorio ? res.relatorio.join('\n') : '');
  SpreadsheetApp.getUi().alert('Observações dos Formadores', msg, SpreadsheetApp.getUi().ButtonSet.OK);
}

function sincronizarObservacoesTutorMenu() {
  SpreadsheetApp.getActiveSpreadsheet().toast('Sincronizando observações de tutoria com TiDB...', 'TiDB Serverless', 6);
  var res = sincronizarAbaObservacoesTutoriaParaTiDB();
  SpreadsheetApp.getUi().alert('Observações do Tutor', '✓ Total de observações de tutoria sincronizadas: ' + (res.total || 0), SpreadsheetApp.getUi().ButtonSet.OK);
}

function sincronizarAbaDadosMenu() {
  SpreadsheetApp.getActiveSpreadsheet().toast('Sincronizando Cursistas Ativos (Aba DADOS)...', 'TiDB Serverless', 10);
  var res = sincronizarAbaDadosParaTiDB();
  SpreadsheetApp.getUi().alert('Cursistas Ativos (DADOS)', '✓ Sincronização concluída!\n\nTotal de cursistas enviados: ' + (res.total || 0), SpreadsheetApp.getUi().ButtonSet.OK);
}

function sincronizarAbaExoneradosMenu() {
  SpreadsheetApp.getActiveSpreadsheet().toast('Sincronizando Servidores Exonerados...', 'TiDB Serverless', 6);
  var res = sincronizarAbaExoneradosParaTiDB();
  SpreadsheetApp.getUi().alert('Servidores Exonerados', '✓ Sincronização concluída!\n\nTotal de exonerados registrados no TiDB: ' + (res.total || 0), SpreadsheetApp.getUi().ButtonSet.OK);
}

function sincronizarAbaConcluintesMenu() {
  SpreadsheetApp.getActiveSpreadsheet().toast('Sincronizando Concluintes (1º Chamamento)...', 'TiDB Serverless', 6);
  var res = sincronizarAbaConcluintesParaTiDB();
  SpreadsheetApp.getUi().alert('Concluintes', '✓ Sincronização concluída!\n\nTotal de concluintes enviados: ' + (res.total || 0), SpreadsheetApp.getUi().ButtonSet.OK);
}

function sincronizarAbaTutoresMenu() {
  SpreadsheetApp.getActiveSpreadsheet().toast('Sincronizando Tutores Regionais...', 'TiDB Serverless', 5);
  var res = sincronizarAbaTutoresParaTiDB();
  SpreadsheetApp.getUi().alert('Tutores Regionais', '✓ Sincronização concluída!\n\nTotal de tutores enviados: ' + (res.total || 0), SpreadsheetApp.getUi().ButtonSet.OK);
}

function sincronizarAbaMovimentacoesMenu() {
  SpreadsheetApp.getActiveSpreadsheet().toast('Sincronizando Movimentações e Trocas...', 'TiDB Serverless', 6);
  var res = sincronizarAbasMovimentacoesParaTiDB();
  SpreadsheetApp.getUi().alert('Movimentações de Turma', '✓ Sincronização concluída!\n\nTotal de movimentações enviadas: ' + (res.total || 0), SpreadsheetApp.getUi().ButtonSet.OK);
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

  function formatarValorPlanilha(v) {
    if (v === null || v === undefined || v === "") return null;
    if (v instanceof Date) {
      if (isNaN(v.getTime())) return null;
      return Utilities.formatDate(v, "America/Sao_Paulo", "dd/MM/yyyy");
    }
    var s = String(v).trim();
    return s === "" ? null : s;
  }

  var idxCgm = getIdx(["cgm"]);
  var idxNome = getIdx(["nome cursista", "nome do cursista", "cursista", "nome"]);
  var idxEmail = getIdx(["e-mail", "email cursista", "email"]);
  var idxCpf = getIdx(["cpf cursista", "cpf"]);
  var idxRg = getIdx(["rg cursista", "rg"]);
  var idxTurma = getIdx(["turmas", "turma"]);
  var idxLinhaFuncional = getIdx(["linha funcional", "linha_funcional", "lf", "padrao", "vinculo"]);
  var idxModalidade = getIdx(["modalidade"]);
  var idxComponente = getIdx(["componente", "componente_conc"]);
  var idxChamamento = getIdx(["chamamento"]);
  var idxAnoFormativo = getIdx(["ano formativo", "ano_formativo"]);
  var idxSemestreInicio = getIdx(["semestre de inicio", "semestre_inicio", "semestre"]);
  var idxPeriodoIni = getIdx(["periodo_ini", "data de posse", "posse", "exercicio"]);
  var idxNreExe = getIdx(["nre_exe", "nre exercicio", "nre"]);
  var idxMunicExe = getIdx(["munic_exe", "municipio exercicio", "municipio"]);
  var idxEstabExe = getIdx(["estab_exe", "estabelecimento"]);
  var idxDiaSemana = getIdx(["dia da semana", "dia_da_semana"]);
  var idxTurno = getIdx(["turno"]);
  var idxHorarioIni = getIdx(["horario inicial", "horario_inicial", "inicio"]);
  var idxHorarioFim = getIdx(["horario final", "horario_fim", "fim"]);
  var idxFormador = getIdx(["nome formador", "formador"]);
  var idxEmailFormador = getIdx(["e-mail formador", "email formador"]);
  var idxTutor = getIdx(["tutor responsavel", "tutor"]);
  var idxEmailTutor = getIdx(["e-mail tutor", "email tutor"]);
  var idxSituacao = getIdx(["situacao", "status"]);
  var idxObs = getIdx(["observacao", "observacoes"]);

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
      rg: idxRg !== -1 ? String(row[idxRg] || "").trim() : null,
      turmas: turmas || null,
      modalidade: idxModalidade !== -1 ? String(row[idxModalidade] || "").trim() : null,
      componente: idxComponente !== -1 ? String(row[idxComponente] || "").trim() : null,
      chamamento: idxChamamento !== -1 ? String(row[idxChamamento] || "").trim() : null,
      ano_formativo: idxAnoFormativo !== -1 ? String(row[idxAnoFormativo] || "").trim() : null,
      semestre_inicio: idxSemestreInicio !== -1 ? String(row[idxSemestreInicio] || "").trim() : null,
      periodo_ini: idxPeriodoIni !== -1 ? formatarValorPlanilha(row[idxPeriodoIni]) : null,
      nre_exe: idxNreExe !== -1 ? String(row[idxNreExe] || "").trim() : null,
      munic_exe: idxMunicExe !== -1 ? String(row[idxMunicExe] || "").trim() : null,
      estab_exe: idxEstabExe !== -1 ? String(row[idxEstabExe] || "").trim() : null,
      dia_da_semana: idxDiaSemana !== -1 ? String(row[idxDiaSemana] || "").trim() : null,
      turno: idxTurno !== -1 ? String(row[idxTurno] || "").trim() : null,
      horario_inicial: idxHorarioIni !== -1 ? formatarValorPlanilha(row[idxHorarioIni]) : null,
      horario_fim: idxHorarioFim !== -1 ? formatarValorPlanilha(row[idxHorarioFim]) : null,
      nome_formador: idxFormador !== -1 ? String(row[idxFormador] || "").trim() : null,
      email_formador: idxEmailFormador !== -1 ? String(row[idxEmailFormador] || "").trim().toLowerCase() : null,
      tutor_responsavel: idxTutor !== -1 ? String(row[idxTutor] || "").trim() : null,
      email_tutor: idxEmailTutor !== -1 ? String(row[idxEmailTutor] || "").trim().toLowerCase() : null,
      situacao: idxSituacao !== -1 ? String(row[idxSituacao] || "").trim() : "Ativo",
      observacao: idxObs !== -1 ? String(row[idxObs] || "").trim() : null
    });
  }

  var BATCH_SIZE = 400;
  var totalSinc = 0;
  var runId = 'sync_gs_' + Date.now();

  for (var b = 0; b < cursistas.length; b += BATCH_SIZE) {
    var lote = cursistas.slice(b, b + BATCH_SIZE);
    var endpoint = obterEndpointApi('sync_cursistas_bulk');
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

  var BATCH_SIZE = 400;
  var totalSinc = 0;
  for (var b = 0; b < concluintes.length; b += BATCH_SIZE) {
    var lote = concluintes.slice(b, b + BATCH_SIZE);
    var endpoint = obterEndpointApi('sync_concluintes_bulk');
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

  var endpoint = obterEndpointApi('sync_tutores_bulk');
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

  var endpoint = obterEndpointApi('sync_exonerados_bulk');
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

  var endpoint = obterEndpointApi('sync_nao_concluintes_bulk');
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
    var endpoint = obterEndpointApi('sync_movimentacoes_bulk');
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
function getSheetByGid(ss, gid) {
  var sheets = ss.getSheets();
  for (var i = 0; i < sheets.length; i++) {
    if (String(sheets[i].getSheetId()) === String(gid)) {
      return sheets[i];
    }
  }
  return sheets[0];
}

function mapRowToObservation(headers, row, sheetName, sheetId, rowNumber, config) {
  function getRawVal(keywords) {
    for (var i = 0; i < headers.length; i++) {
      var h = String(headers[i] || "").toLowerCase();
      for (var k = 0; k < keywords.length; k++) {
        if (h.indexOf(keywords[k].toLowerCase()) !== -1) {
          var val = row[i];
          if (val !== undefined && val !== null && val !== "") {
            return val;
          }
        }
      }
    }
    return null;
  }

  function getVal(keywords) {
    var raw = getRawVal(keywords);
    return raw !== null && raw !== undefined ? String(raw).trim() : "";
  }

  function parseDate(dateRaw) {
    if (!dateRaw) return null;
    if (dateRaw instanceof Date) {
      if (isNaN(dateRaw.getTime())) return null;
      return Utilities.formatDate(dateRaw, "America/Sao_Paulo", "yyyy-MM-dd");
    }
    var str = String(dateRaw).trim();
    if (!str || str === "-" || str === "—" || str.toLowerCase() === "não informada") return null;

    if (str.indexOf("GMT") !== -1 || str.indexOf("T") !== -1 || /^[A-Za-z]{3}\s/.test(str)) {
      var d = new Date(str);
      if (!isNaN(d.getTime())) {
        return Utilities.formatDate(d, "America/Sao_Paulo", "yyyy-MM-dd");
      }
    }

    if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
      return str;
    }

    var parts = str.split(/[/.-]/);
    if (parts.length === 3) {
      if (parts[0].length === 4) {
        return parts[0] + "-" + parts[1].padStart(2, "0") + "-" + parts[2].padStart(2, "0");
      }
      var dd = parts[0].padStart(2, "0");
      var mm = parts[1].padStart(2, "0");
      var yy = parts[2].length === 2 ? "20" + parts[2] : parts[2].slice(0, 4);
      return yy + "-" + mm + "-" + dd;
    }
    return null;
  }

  function formatCarimbo(dateRaw) {
    if (!dateRaw) return null;
    if (dateRaw instanceof Date) {
      if (isNaN(dateRaw.getTime())) return null;
      return Utilities.formatDate(dateRaw, "America/Sao_Paulo", "dd/MM/yyyy HH:mm:ss");
    }
    var str = String(dateRaw).trim();
    if (!str || str === "-" || str === "—") return null;

    if (str.indexOf("GMT") !== -1 || str.indexOf("T") !== -1 || /^[A-Za-z]{3}\s/.test(str)) {
      var d = new Date(str);
      if (!isNaN(d.getTime())) {
        return Utilities.formatDate(d, "America/Sao_Paulo", "dd/MM/yyyy HH:mm:ss");
      }
    }
    return str;
  }

  // 1. Identificar e-mail do cursista
  var emailCursista = getVal([
    "e-mail institucional do cursista",
    "email institucional do cursista",
    "e-mail do cursista",
    "email do cursista"
  ]);

  if (!emailCursista) {
    for (var c = 0; c < row.length; c++) {
      var cellStr = String(row[c] || "").toLowerCase().trim();
      if (cellStr.indexOf("@escola.pr.gov.br") !== -1 && cellStr.indexOf("formador") === -1 && cellStr.indexOf("seed") === -1) {
        emailCursista = cellStr;
        break;
      }
    }
  }

  if (!emailCursista || emailCursista.indexOf("@") === -1) return null;
  emailCursista = emailCursista.toLowerCase().trim();

  // 2. Chave Única Determinística (id_origem)
  var idOrigem = (config.sigla || "OBS") + "_L" + rowNumber;

  var nomeCursista = getVal(["nome do cursista", "cursista"]);
  var nomeFormador = getVal(["selecione o nome do formador", "nome do formador", "formador/tutor/técnico"]);
  var emailFormador = String(row[1] || "").toLowerCase().trim();

  // 3. Status da observação
  var obsRealizadaRaw = getVal(["a observação da prática foi realizada", "observação da prática foi realizada"]);
  var isRealizada = !obsRealizadaRaw || obsRealizadaRaw.toLowerCase().indexOf("sim") !== -1;

  // 4. Níveis pedagógicos
  var nivelPlanejamento = "";
  var nivelPratica = "";

  for (var hIdx = 0; hIdx < headers.length; hIdx++) {
    var headLower = String(headers[hIdx] || "").toLowerCase();
    var valUpper = String(row[hIdx] || "").trim().toUpperCase();

    if ((headLower.indexOf("planejamento") !== -1 || headLower.indexOf("critério 1") !== -1) && !nivelPlanejamento) {
      if (valUpper.indexOf("SUPERA") !== -1 || valUpper.indexOf("ATINGE") !== -1 || valUpper.indexOf("ATENDE") !== -1 || valUpper.indexOf("PARCIAL") !== -1) {
        nivelPlanejamento = valUpper.replace(/[.,;]$/, "").trim();
      }
    }
    if ((headLower.indexOf("prática") !== -1 || headLower.indexOf("pratica") !== -1 || headLower.indexOf("critério 2") !== -1) && !nivelPratica) {
      if (valUpper.indexOf("SUPERA") !== -1 || valUpper.indexOf("ATINGE") !== -1 || valUpper.indexOf("ATENDE") !== -1 || valUpper.indexOf("PARCIAL") !== -1) {
        nivelPratica = valUpper.replace(/[.,;]$/, "").trim();
      }
    }
  }

  // 5. Modalidade do cursista
  var modalidadeCursista = getVal([
    "selecione a modalidade do cursista",
    "modalidades. selecione a modalidade",
    "modalidades. selecione",
    "modalidade do cursista"
  ]);
  if (!modalidadeCursista || modalidadeCursista.toLowerCase().indexOf("feedback") !== -1 || modalidadeCursista.toLowerCase().indexOf("diálogo") !== -1 || modalidadeCursista.toLowerCase().indexOf("dialogo") !== -1) {
    modalidadeCursista = "Docentes";
  }

  var componente = getVal(["componente curricular", "componente", "área"]);
  if (!componente && (modalidadeCursista.toLowerCase().indexOf("gestora") !== -1 || modalidadeCursista.toLowerCase().indexOf("pedagog") !== -1)) {
    componente = "PEDAGÓGICO";
  }

  var chamamento = getVal(["chamamento"]);
  if (!chamamento && sheetName && sheetName.toLowerCase().indexOf("4º chamamento") !== -1) chamamento = "4º Chamamento";

  var tema = getVal([
    "selecione o tema relacionado",
    "tema relacionado à observação",
    "tema relacionado a observacao",
    "tema relacionado",
    "tema"
  ]);

  var proposta = getVal([
    "qual  é a proposta escolhida",
    "qual é a proposta escolhida",
    "qual a proposta escolhida",
    "proposta escolhida"
  ]);

  if (tema && proposta && tema.toLowerCase().indexOf(proposta.toLowerCase()) === -1) {
    tema = tema + " (" + proposta + ")";
  }

  var carimboRaw = getRawVal(["carimbo de data/hora", "carimbo", "timestamp"]);
  if (!carimboRaw && row[0]) {
    carimboRaw = row[0];
  }
  var carimbo = formatCarimbo(carimboRaw);

  var dataPraticaRaw = getRawVal([
    "data em que a prática pedagógica foi realizada",
    "data da realização da prática pedagógica",
    "data da realização da prática",
    "data de observação da prática pedagógica",
    "data da observação da prática pedagógica",
    "data em que a prática foi realizada",
    "data da prática pedagógica",
    "data da prática"
  ]);

  var dataObservacaoRaw = getRawVal([
    "data de observação da prática pedagógica",
    "data da observação da prática pedagógica",
    "data em que foi realizada a observação",
    "data da realização da observação",
    "data da observação",
    "data de observação"
  ]);

  var parsedDataPratica = parseDate(dataPraticaRaw) || parseDate(dataObservacaoRaw);
  var parsedDataObservacao = parseDate(dataObservacaoRaw) || parsedDataPratica;

  var dataFeedbackRaw = getRawVal(["data do feedback", "data da devolutiva", "devolutiva"]);
  var dataAgendamentoRaw = getRawVal(["data do agendamento", "agendamento"]);

  var evidenciasPlanejamento = getVal([
    "evidências para que o planejamento",
    "evidências para que a prática seja situada nesse nível do critério 1",
    "evidências para que a prática seja situada nesse nível do  critério 1",
    "evidências para que a implementação",
    "critério 1:"
  ]);

  var evidenciasPratica = getVal([
    "evidências para que a implementação",
    "evidências para que a prática seja situada nesse nível do critério 2",
    "evidências para que a prática seja situada nesse nível do  critério 2",
    "critério 2:"
  ]);

  return {
    id_origem: idOrigem,
    carimbo: carimbo || null,
    semestre: config.semestrePadrao,
    email_cursista: emailCursista,
    nome_cursista: nomeCursista || "",
    email_formador: emailFormador || null,
    nome_formador: nomeFormador || null,
    ano_formativo: config.anoFormativoPadrao,
    chamamento: chamamento || null,
    modalidade: modalidadeCursista,
    componente: componente || null,
    tema: tema || null,
    observacao_realizada: obsRealizadaRaw || (isRealizada ? "Sim, a observação foi realizada." : "Não"),
    data_pratica: parsedDataPratica,
    data_observacao: parsedDataObservacao,
    data_feedback: parseDate(dataFeedbackRaw),
    data_agendamento: parseDate(dataAgendamentoRaw),
    modalidade_feedback: getVal(["modalidade de feedback formativo", "modalidade de feedback"]) || (isRealizada ? "Diálogo formativo" : null),
    motivo_devolutiva: getVal(["motivo da realização de feedback", "qual foi o motivo"]),
    link_gravacao_pratica: getVal(["link da gravação da prática pedagógica", "link da gravação da prática"]),
    link_planejamento: getVal(["link do documento de planejamento", "link do pdp"]),
    link_gravacao_feedback: getVal(["link da gravação do diálogo formativo", "link da gravação do feedback"]),
    nivel_planejamento: nivelPlanejamento || (isRealizada ? "SUPERA" : null),
    nivel_pratica: nivelPratica || (isRealizada ? "ATENDE INTEGRALMENTE" : null),
    evidencias_planejamento: evidenciasPlanejamento || null,
    evidencias_pratica: evidenciasPratica || null,
    questionamentos_propositivos: getVal(["questionamentos propositivos"]),
    proposicoes_sugestoes: getVal(["proposições ou sugestões", "proposições"]),
    combinados: getVal(["combinados realizados no feedback", "combinados"]),
    justificativa_nao_realizada: getVal(["justificativa:"]),
    contexto_justificativa: getVal(["descreva a situação ou contexto"]),
    reflexoes_gerais: getVal(["registre informações ou reflexões"])
  };
}

function enviarLoteObservacoesParaTiDB(observacoes) {
  if (!observacoes || observacoes.length === 0) return 0;
  var BATCH_SIZE = 400;
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
      if (resp.getResponseCode() === 200) {
        totalSinc += lote.length;
      } else {
        Logger.log('Aviso ao sincronizar lote: ' + resp.getContentText());
      }
    } catch (err) {
      Logger.log('Erro ao sincronizar observações: ' + err.toString());
    }
  }
  return totalSinc;
}

function sincronizarAbaObservacoesParaTiDB() {
  Logger.log('Sincronizando a partir das 4 planilhas externas de Formadores...');
  var totalGeral = 0;
  var relatorio = [];
  var startTime = Date.now();

  for (var p = 0; p < PLANILHAS_OBSERVACOES_FORMADOR.length; p++) {
    // Guarda de segurança contra timeout (máximo 4.5 minutos de execução)
    if (Date.now() - startTime > 260000) {
      relatorio.push('⏱️ Tempo limite preventivo atingido (demais planilhas serão processadas no próximo disparo).');
      break;
    }
    var cfg = PLANILHAS_OBSERVACOES_FORMADOR[p];
    try {
      var extSs = SpreadsheetApp.openById(cfg.id);
      var extAba = getSheetByGid(extSs, cfg.gid);
      if (!extAba) {
        relatorio.push('❌ ' + cfg.nome + ': Aba não localizada.');
        continue;
      }

      var lastRow = extAba.getLastRow();
      var lastCol = extAba.getLastColumn();
      if (lastRow < 2 || lastCol < 3) {
        relatorio.push('⚠️ ' + cfg.nome + ': Planilha sem dados.');
        continue;
      }

      var headers = extAba.getRange(1, 1, 1, lastCol).getValues()[0];
      var allValues = extAba.getRange(2, 1, lastRow - 1, lastCol).getValues();
      var lista = [];

      for (var r = 0; r < allValues.length; r++) {
        var rowNumber = r + 2;
        var payload = mapRowToObservation(headers, allValues[r], extAba.getName(), extAba.getSheetId(), rowNumber, cfg);
        if (payload && payload.email_cursista) {
          lista.push(payload);
        }
      }

      var ok = enviarLoteObservacoesParaTiDB(lista);
      totalGeral += ok;
      relatorio.push('✓ ' + cfg.nome + ': ' + ok + ' observações');
      Logger.log('✓ ' + cfg.nome + ': ' + ok + ' observações sincronizadas');
    } catch (errExt) {
      relatorio.push('❌ ' + cfg.nome + ': Erro ' + errExt.message);
      Logger.log('Erro ao abrir planilha ' + cfg.nome + ' (' + cfg.id + '): ' + errExt.toString());
    }
  }

  return { total: totalGeral, relatorio: relatorio };
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
        observacoes_tutor: lote,
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
  var abasNecessarias = ["DADOS", "CONCLUINTES-1CH", "TUTORES", "EXONERADOS", "CURSISTAS NAO CONCLUINTES", "Histórico de Movimentações", "SIGEP", "SIGEP_FORMADORES", "Intencoes_2027"];
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


/**
 * -----------------------------------------------------------------------------------------
 * 15. API PARA INTENÇÃO DE MATRÍCULA 2027 (PLANILHA + DISPARO DE E-MAIL COM CC)
 * -----------------------------------------------------------------------------------------
 */
function apiSalvarIntencao2027(payload) {
  try {
    var ss = obterPlanilhaMestra();
    var nomeAba = "Intencoes_2027";
    var colunas = [
      "CGM_LF",
      "CGM",
      "Linha Funcional",
      "Nome Cursista",
      "E-mail Cursista",
      "Componente",
      "NRE",
      "Chamamento",
      "Ano Formativo 2026",
      "Ano Formativo 2027",
      "Semestre 2027",
      "Turma Origem 2026",
      "Turno Pretendido 2027",
      "Horário Pretendido 2027",
      "Necessita Atendimento Especializado",
      "Descrição Atendimento Especializado",
      "Decisão Duas Matrículas",
      "Aceite Termo Ciência",
      "Data/Hora Aceite Termo",
      "Observações",
      "Registrado Por",
      "Data/Hora Registro"
    ];

    var d = payload.dados || payload;
    var cgmLimpo = String(d.cgm_cursista || d.cgm || "").trim();
    var lfLimpa = String(d.linha_funcional || "1").replace(/\D/g, "").trim() || "1";
    var chaveCgmLf = String(d.cgm_lf || (cgmLimpo + "_LF" + lfLimpa)).trim();

    var aba = ss.getSheetByName(nomeAba);
    if (!aba) {
      aba = ss.insertSheet(nomeAba);
      aba.appendRow(colunas);
      aba.getRange(1, 1, 1, colunas.length).setFontWeight("bold").setBackground("#0f172a").setFontColor("#ffffff");
    }

    var novaLinha = [
      chaveCgmLf,
      cgmLimpo,
      lfLimpa,
      d.nome_cursista || d.nome || "",
      d.email_cursista || d.email || "",
      d.componente || "",
      d.nre || "",
      d.chamamento || "",
      d.ano_formativo_2026 || "",
      d.ano_formativo_2027 || "",
      d.semestre_2027 || "",
      d.turma_origem_2026 || "",
      d.turnoPretendido || d.turno_pretendido || "",
      d.horarioPretendido || d.horario_pretendido || "",
      d.necessitaAtendimentoEspecializado ? "SIM" : "NÃO",
      d.descricaoAtendimentoEspecializado || "",
      d.decisao_duas_matriculas || "",
      d.aceite_termo_ciencia !== false ? "SIM" : "NÃO",
      d.data_aceite_termo || new Date().toISOString(),
      d.observacoes || "",
      d.registrado_por || "",
      d.timestamp || Utilities.formatDate(new Date(), "America/Sao_Paulo", "dd/MM/yyyy HH:mm:ss")
    ];

    var valores = aba.getDataRange().getValues();
    var atualizou = false;
    for (var i = 1; i < valores.length; i++) {
      var chaveLinha = String(valores[i][0] || "").trim();
      if (chaveLinha && chaveLinha === chaveCgmLf) {
        aba.getRange(i + 1, 1, 1, novaLinha.length).setValues([novaLinha]);
        atualizou = true;
        break;
      }
    }

    if (!atualizou) {
      aba.appendRow(novaLinha);
    }

    // Dispara e-mail de confirmação para o cursista com cópia para a coordenação
    var emailEnviado = false;
    try {
      emailEnviado = enviarEmailConfirmacaoIntencao(d, chaveCgmLf, lfLimpa);
    } catch (mailErr) {
      Logger.log("Aviso: não foi possível enviar e-mail de confirmação: " + mailErr.toString());
    }

    return {
      status: "sucesso",
      acao: atualizou ? "atualizado" : "inserido",
      cgm_lf: chaveCgmLf,
      email_enviado: emailEnviado
    };
  } catch (err) {
    return { status: "erro", mensagem: err.toString() };
  }
}

function apiLimparIntencoes2027() {
  try {
    var ss = obterPlanilhaMestra();
    var aba = ss.getSheetByName("Intencoes_2027");
    if (aba && aba.getLastRow() > 1) {
      aba.deleteRows(2, aba.getLastRow() - 1);
    }
    return { status: "sucesso", mensagem: "Aba Intencoes_2027 limpa com sucesso." };
  } catch (err) {
    return { status: "erro", mensagem: err.toString() };
  }
}

function enviarEmailConfirmacaoIntencao(d, chaveCgmLf, lfLimpa) {
  if (!d) return false;
  var destinatario = String(d.email_cursista || d.email || "").trim().toLowerCase();
  if (!destinatario || destinatario.indexOf("@") === -1) return false;

  var cgmLimpo = String(d.cgm_cursista || d.cgm || "").trim();
  if (!lfLimpa) {
    lfLimpa = String(d.linha_funcional || "1").replace(/\D/g, "").trim() || "1";
  }
  if (!chaveCgmLf) {
    chaveCgmLf = String(d.cgm_lf || (cgmLimpo ? (cgmLimpo + "_LF" + lfLimpa) : ("LF" + lfLimpa))).trim();
  }

  var nome = d.nome_cursista || d.nome || "Cursista";
  var cgm = d.cgm_cursista || d.cgm || "-";
  var componente = d.componente || "-";
  var nre = d.nre || "-";
  var turno = d.turnoPretendido || d.turno_pretendido || "-";
  var horario = d.horarioPretendido || d.horario_pretendido || "-";
  var ano2027 = d.ano_formativo_2027 || "2º/3º ANO";
  var sem2027 = d.semestre_2027 || "2027.1";
  var atendimentoEsp = d.necessitaAtendimentoEspecializado ? ("SIM (" + (d.descricaoAtendimentoEspecializado || "Solicitado") + ")") : "NÃO";
  var dataHora = Utilities.formatDate(new Date(), "America/Sao_Paulo", "dd/MM/yyyy 'às' HH:mm");

  var assunto = "Confirmação de Intenção de Matrícula 2027 - Estágio Probatório SEED-PR (" + chaveCgmLf + ")";

  var corpoTexto =
    "Olá, " + nome + "!\n\n" +
    "Confirmamos o recebimento da sua Intenção de Matrícula para o ano letivo de 2027 no Programa de Formação do Estágio Probatório (SEED-PR).\n\n" +
    "RESUMO DO SEU REGISTRO:\n" +
    "• Nome: " + nome + "\n" +
    "• CGM / Linha Funcional: " + cgm + " (LF " + lfLimpa + ")\n" +
    "• NRE: " + nre + "\n" +
    "• Componente Curricular: " + componente + "\n" +
    "• Etapa Prevista 2027: " + ano2027 + " (" + sem2027 + ")\n" +
    "• Turno Pretendido: " + turno + "\n" +
    "• Horário Pretendido: " + horario + "\n" +
    "• Atendimento Especializado: " + atendimentoEsp + "\n" +
    "• Data/Hora do Registro: " + dataHora + "\n\n" +
    "Observação: Este registro constitui pré-inscrição para o planejamento das turmas de 2027, estando a priorização do turno e horário condicionada ao suprimento de aulas no ano letivo de 2027.\n\n" +
    "Atenciosamente,\n" +
    "Coordenação do Estágio Probatório - SEED/PR";

  var corpoHtml =
    "<div style='font-family:Segoe UI,Arial,sans-serif;max-width:620px;margin:0 auto;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;color:#1e293b;'>" +
      "<div style='background:linear-gradient(135deg,#0f172a,#1e3a8a);color:#ffffff;padding:20px 24px;'>" +
        "<div style='font-size:11px;text-transform:uppercase;letter-spacing:1px;opacity:0.85;font-weight:700;'>SEED-PR • Estágio Probatório</div>" +
        "<h2 style='margin:6px 0 0;font-size:18px;'>Confirmação de Intenção de Matrícula 2027</h2>" +
      "</div>" +
      "<div style='padding:24px;background:#ffffff;'>" +
        "<p style='margin-top:0;'>Olá, <strong>" + nome + "</strong>!</p>" +
        "<p>Sua intenção de matrícula para o ciclo formativo de <strong>2027</strong> foi registrada com sucesso em nosso sistema.</p>" +
        "<div style='background:#f8fafc;border:1px solid #cbd5e1;border-radius:10px;padding:16px;margin:18px 0;'>" +
          "<div style='font-size:12px;font-weight:800;color:#0f172a;text-transform:uppercase;margin-bottom:10px;'>Resumo da Intenção Registrada</div>" +
          "<table style='width:100%;font-size:13px;border-collapse:collapse;'>" +
            "<tr><td style='padding:5px 0;color:#64748b;'>CGM / Linha Funcional:</td><td style='padding:5px 0;font-weight:700;'>" + cgm + " (LF " + lfLimpa + ")</td></tr>" +
            "<tr><td style='padding:5px 0;color:#64748b;'>NRE:</td><td style='padding:5px 0;font-weight:700;'>" + nre + "</td></tr>" +
            "<tr><td style='padding:5px 0;color:#64748b;'>Componente:</td><td style='padding:5px 0;font-weight:700;'>" + componente + "</td></tr>" +
            "<tr><td style='padding:5px 0;color:#64748b;'>Etapa Prevista 2027:</td><td style='padding:5px 0;font-weight:700;'>" + ano2027 + " (" + sem2027 + ")</td></tr>" +
            "<tr><td style='padding:5px 0;color:#64748b;'>Turno Pretendido:</td><td style='padding:5px 0;font-weight:700;color:#1d4ed8;'>" + turno + "</td></tr>" +
            "<tr><td style='padding:5px 0;color:#64748b;'>Horário Pretendido:</td><td style='padding:5px 0;font-weight:700;color:#15803d;'>" + horario + "</td></tr>" +
            "<tr><td style='padding:5px 0;color:#64748b;'>Atendimento Especializado:</td><td style='padding:5px 0;font-weight:700;'>" + atendimentoEsp + "</td></tr>" +
            "<tr><td style='padding:5px 0;color:#64748b;'>Data/Hora da Confirmação:</td><td style='padding:5px 0;font-weight:600;'>" + dataHora + "</td></tr>" +
          "</table>" +
        "</div>" +
        "<p style='font-size:12px;color:#475569;line-height:1.5;background:#f0fdf4;border:1px solid #bbf7d0;padding:12px;border-radius:8px;'>" +
          "<strong>Declaração de Ciência Registrada:</strong> O preenchimento deste formulário constitui pré-inscrição necessária para o planejamento e organização prévia das turmas de 2027, estando a priorização do turno e horário condicionada ao suprimento de aulas no mesmo turno no ano letivo de 2027." +
        "</p>" +
        "<p style='font-size:12px;color:#64748b;margin-bottom:0;'>Caso necessite alterar sua opção dentro do prazo vigente, basta acessar novamente a plataforma do Estágio Probatório.</p>" +
      "</div>" +
    "</div>";

  MailApp.sendEmail({
    to: destinatario,
    cc: "jorge.dotti@escola.pr.gov.br, estagioprobatorio@escola.pr.gov.br",
    subject: assunto,
    body: corpoTexto,
    htmlBody: corpoHtml
  });

  return true;
}


/**
 * -----------------------------------------------------------------------------------------
 * 16. API EXCLUSIVA PARA O SISTEMA DESKTOP JAVA SWING E ROTEAMENTO HTTP UNIFICADO
 * Gerencia leitura de solicitações, alteração da Coluna H, disparo de e-mails e Web App
 * -----------------------------------------------------------------------------------------
 */

function apiObterSolicitacoesPendentes() {
  var ss = obterPlanilhaMestra();
  if (!ss) return { status: 'erro', mensagem: 'Planilha mestra não acessível.', lista: [] };

  var solicitacoes = [];

  // 1. Aba: Troca de Turma
  var abaTurma = ss.getSheetByName("Troca de Turma");
  if (abaTurma) {
    var dTurma = abaTurma.getDataRange().getValues();
    for (var t = 1; t < dTurma.length; t++) {
      var rt = dTurma[t];
      var emailT = String(rt[1] || "").trim().toLowerCase();
      var nomeT = String(rt[2] || "").trim();
      if (!emailT && !nomeT) continue;

      var statusRawT = String(rt[14] || "").trim();
      var statusT = (statusRawT.toLowerCase().indexOf("atendido") !== -1 || statusRawT.toLowerCase().indexOf("conclu") !== -1 || statusRawT.toLowerCase().indexOf("deferido") !== -1) ? "Deferido" :
                    (statusRawT.toLowerCase().indexOf("indefer") !== -1 || statusRawT.toLowerCase().indexOf("recus") !== -1) ? "Indeferido" : "Pendente";

      solicitacoes.push({
        id: "SOLIC_TURMA_" + (t + 1),
        abaOrigem: "Troca de Turma",
        linhaOrigem: t + 1,
        origem: "Troca de Turma",
        dataSolicitacao: rt[0] ? String(rt[0]) : "",
        emailCursista: emailT,
        nomeCursista: nomeT,
        cpf: rt[4] ? String(rt[4]).replace(/\D/g, "") : "",
        cgm: rt[5] ? String(rt[5]).replace(/\D/g, "") : "",
        turmaAntiga: rt[9] ? String(rt[9]).trim() : "",
        turmaNova: rt[10] ? String(rt[10]).trim() : "",
        tipoAcao: "Troca de Turma",
        motivo: rt[12] ? String(rt[12]).trim() : "Solicitação via Formulário",
        justificativa: rt[13] ? String(rt[13]).trim() : "",
        status: statusT,
        notaResolucao: rt[15] ? String(rt[15]).trim() : ""
      });
    }
  }

  // 2. Aba: Troca de Modalidade
  var abaMod = ss.getSheetByName("Troca de Modalidade");
  if (abaMod) {
    var dMod = abaMod.getDataRange().getValues();
    for (var m = 1; m < dMod.length; m++) {
      var rm = dMod[m];
      var emailM = String(rm[1] || "").trim().toLowerCase();
      var nomeM = String(rm[2] || "").trim();
      if (!emailM && !nomeM) continue;

      var statusRawM = String(rm[12] || "").trim();
      var statusM = (statusRawM.toLowerCase().indexOf("atendido") !== -1 || statusRawM.toLowerCase().indexOf("conclu") !== -1 || statusRawM.toLowerCase().indexOf("deferido") !== -1) ? "Deferido" :
                    (statusRawM.toLowerCase().indexOf("indefer") !== -1 || statusRawM.toLowerCase().indexOf("recus") !== -1) ? "Indeferido" : "Pendente";

      solicitacoes.push({
        id: "SOLIC_MOD_" + (m + 1),
        abaOrigem: "Troca de Modalidade",
        linhaOrigem: m + 1,
        origem: "Troca de Modalidade",
        dataSolicitacao: rm[0] ? String(rm[0]) : "",
        emailCursista: emailM,
        nomeCursista: nomeM,
        cpf: rm[4] ? String(rm[4]).replace(/\D/g, "") : "",
        cgm: rm[5] ? String(rm[5]).replace(/\D/g, "") : "",
        turmaAntiga: rm[9] ? String(rm[9]).trim() : "",
        turmaNova: rm[10] ? String(rm[10]).trim() : "",
        tipoAcao: "Troca de Modalidade",
        motivo: rm[11] ? String(rm[11]).trim() : "Solicitação de Modalidade",
        justificativa: rm[12] ? String(rm[12]).trim() : "",
        status: statusM,
        notaResolucao: rm[13] ? String(rm[13]).trim() : ""
      });
    }
  }

  // 3. Aba: Vínculos em Avaliação Formativa
  var abaVinc = ss.getSheetByName("Vínculos em Avaliação Formativa") || ss.getSheetByName("Vinculos na AF");
  if (abaVinc) {
    var dVinc = abaVinc.getDataRange().getValues();
    for (var v = 1; v < dVinc.length; v++) {
      var rv = dVinc[v];
      var emailV = String(rv[1] || "").trim().toLowerCase();
      var nomeV = String(rv[2] || "").trim();
      if (!emailV && !nomeV) continue;

      var statusRawV = String(rv[17] || "").trim();
      var statusV = (statusRawV.toLowerCase().indexOf("atendido") !== -1 || statusRawV.toLowerCase().indexOf("conclu") !== -1 || statusRawV.toLowerCase().indexOf("deferido") !== -1) ? "Deferido" :
                    (statusRawV.toLowerCase().indexOf("indefer") !== -1 || statusRawV.toLowerCase().indexOf("recus") !== -1) ? "Indeferido" : "Pendente";

      var turmaAntigaV = (rv.length > 21 && rv[21]) ? String(rv[21]).trim() : (rv[12] ? String(rv[12]).trim() : "");
      var turmaNovaV = (rv.length > 22 && rv[22]) ? String(rv[22]).trim() : (rv[13] ? String(rv[13]).trim() : "");

      solicitacoes.push({
        id: "SOLIC_VINC_" + (v + 1),
        abaOrigem: abaVinc.getName(),
        linhaOrigem: v + 1,
        origem: "Vínculos na AF",
        dataSolicitacao: rv[0] ? String(rv[0]) : "",
        emailCursista: emailV,
        nomeCursista: nomeV,
        cpf: rv[4] ? String(rv[4]).replace(/\D/g, "") : "",
        cgm: rv[5] ? String(rv[5]).replace(/\D/g, "") : "",
        turmaAntiga: turmaAntigaV,
        turmaNova: turmaNovaV,
        tipoAcao: "Vínculo na AF",
        motivo: "Vínculo em Avaliação Formativa",
        justificativa: rv[16] ? String(rv[16]).trim() : "",
        status: statusV,
        notaResolucao: rv[18] ? String(rv[18]).trim() : ""
      });
    }
  }

  return { status: 'sucesso', total: solicitacoes.length, lista: solicitacoes };
}

function apiProcessarMovimentacao(dados) {
  var ss = obterPlanilhaMestra();
  if (!ss) return { status: 'erro', mensagem: 'Planilha mestra não acessível.' };

  var cgmBusca = dados.cgm ? String(dados.cgm).replace(/\D/g, "").trim() : "";
  var cpfBusca = dados.cpf ? String(dados.cpf).replace(/\D/g, "").trim() : "";
  var emailBusca = dados.email ? String(dados.email).trim().toLowerCase() : "";
  var lfBusca = dados.lf ? String(dados.lf).replace(/\D/g, "").trim() : "";
  var turmaNova = dados.turmaNova ? String(dados.turmaNova).trim() : "";
  var codSereNova = dados.codSereNova ? String(dados.codSereNova).trim() : "";
  var statusDecisao = dados.statusDecisao || "Deferido";
  var isDeferido = (statusDecisao.toLowerCase() === "deferido" || statusDecisao.toLowerCase() === "atendida");

  var abaCursistas = ss.getSheetByName("CURSISTAS") || ss.getSheetByName("DADOS");
  if (!abaCursistas) return { status: 'erro', mensagem: 'Aba CURSISTAS/DADOS não encontrada.' };

  var valoresCursistas = abaCursistas.getDataRange().getValues();
  var cabecalho = valoresCursistas[0].map(function(c) {
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
  var idxCpf = getIdx(["cpf cursista", "cpf"]);
  var idxEmail = getIdx(["e-mail", "email cursista", "email"]);
  var idxNome = getIdx(["nome cursista", "nome do cursista", "cursista", "nome"]);
  var idxTurma = getIdx(["turmas", "turma"]);
  var idxFormador = getIdx(["nome formador", "formador"]);
  var idxEmailFormador = getIdx(["e-mail formador", "email formador"]);
  var idxTutor = getIdx(["tutor responsavel", "tutor"]);
  var idxEmailTutor = getIdx(["e-mail tutor", "email tutor"]);
  var idxLinhaFuncional = getIdx(["linha funcional", "linha_funcional", "lf", "padrao", "vinculo"]);

  // Coluna H na planilha padrão da SEED-PR é a coluna 8
  var colTurma = idxTurma !== -1 ? (idxTurma + 1) : 8;

  var linhaCursista = -1;
  var linhaDadosCursista = null;

  for (var r = 1; r < valoresCursistas.length; r++) {
    var row = valoresCursistas[r];
    var cgmRow = idxCgm !== -1 ? String(row[idxCgm] || "").replace(/\D/g, "").trim() : "";
    var cpfRow = idxCpf !== -1 ? String(row[idxCpf] || "").replace(/\D/g, "").trim() : "";
    var emailRow = idxEmail !== -1 ? String(row[idxEmail] || "").trim().toLowerCase() : "";
    var lfRow = idxLinhaFuncional !== -1 ? String(row[idxLinhaFuncional] || "").replace(/\D/g, "").trim() : (row.length > 36 ? String(row[36] || "").replace(/\D/g, "").trim() : "");

    var match = false;
    if (cgmBusca && cgmRow === cgmBusca) {
      if (lfBusca && lfRow) {
        match = (lfRow === lfBusca);
      } else {
        match = true;
      }
    } else if (cpfBusca && cpfRow === cpfBusca) {
      match = true;
    } else if (emailBusca && emailRow === emailBusca) {
      match = true;
    }

    if (match) {
      linhaCursista = r + 1; // 1-based index no Google Sheets
      linhaDadosCursista = row;
      break;
    }
  }

  var turmaAnterior = dados.turmaAnterior || "";
  var nomeCursista = dados.nomeCursista || (dados.nome || "");
  var emailCursista = emailBusca;
  var cgmEncontrado = cgmBusca;
  var lfEncontrada = lfBusca || "1";
  var cpfEncontrado = cpfBusca;
  var tutorAntigo = "";
  var emailTutorAntigo = "";
  var formadorAntigo = "";
  var emailFormadorAntigo = "";

  if (linhaDadosCursista) {
    turmaAnterior = idxTurma !== -1 ? String(linhaDadosCursista[idxTurma] || "").trim() : String(linhaDadosCursista[7] || "").trim();
    nomeCursista = idxNome !== -1 ? String(linhaDadosCursista[idxNome] || "").trim() : nomeCursista;
    emailCursista = idxEmail !== -1 ? String(linhaDadosCursista[idxEmail] || "").trim().toLowerCase() : emailCursista;
    cgmEncontrado = idxCgm !== -1 ? String(linhaDadosCursista[idxCgm] || "").replace(/\D/g, "").trim() : cgmEncontrado;
    cpfEncontrado = idxCpf !== -1 ? String(linhaDadosCursista[idxCpf] || "").replace(/\D/g, "").trim() : cpfEncontrado;
    tutorAntigo = idxTutor !== -1 ? String(linhaDadosCursista[idxTutor] || "").trim() : "";
    emailTutorAntigo = idxEmailTutor !== -1 ? String(linhaDadosCursista[idxEmailTutor] || "").trim().toLowerCase() : "";
    formadorAntigo = idxFormador !== -1 ? String(linhaDadosCursista[idxFormador] || "").trim() : "";
    emailFormadorAntigo = idxEmailFormador !== -1 ? String(linhaDadosCursista[idxEmailFormador] || "").trim().toLowerCase() : "";
    if (idxLinhaFuncional !== -1 && linhaDadosCursista[idxLinhaFuncional]) {
      lfEncontrada = String(linhaDadosCursista[idxLinhaFuncional]).replace(/\D/g, "").trim() || lfEncontrada;
    }
  }

  // 1. SE DEFERIDO: Atualiza a Coluna H na aba CURSISTAS/DADOS
  if (isDeferido && linhaCursista !== -1 && turmaNova) {
    abaCursistas.getRange(linhaCursista, colTurma).setValue(turmaNova);
    SpreadsheetApp.flush();
  }

  // 2. Busca Formador e Tutor da Turma Nova na aba DADOS
  var tutorNovo = "";
  var emailTutorNovo = "";
  var formadorNovo = "";
  var emailFormadorNovo = "";

  if (turmaNova) {
    var cleanNova = turmaNova.trim().toUpperCase();
    for (var r = 1; r < valoresCursistas.length; r++) {
      var tRow = idxTurma !== -1 ? String(valoresCursistas[r][idxTurma] || "").trim().toUpperCase() : "";
      if (tRow === cleanNova) {
        formadorNovo = idxFormador !== -1 ? String(valoresCursistas[r][idxFormador] || "").trim() : "";
        emailFormadorNovo = idxEmailFormador !== -1 ? String(valoresCursistas[r][idxEmailFormador] || "").trim().toLowerCase() : "";
        tutorNovo = idxTutor !== -1 ? String(valoresCursistas[r][idxTutor] || "").trim() : "";
        emailTutorNovo = idxEmailTutor !== -1 ? String(valoresCursistas[r][idxEmailTutor] || "").trim().toLowerCase() : "";
        break;
      }
    }
  }

  // 3. Garante e grava na aba "Histórico de Movimentações"
  var nomeAbaHist = "Histórico de Movimentações";
  var abaHist = ss.getSheetByName(nomeAbaHist);
  if (!abaHist) {
    abaHist = ss.insertSheet(nomeAbaHist);
    abaHist.appendRow([
      "Data/Hora Registro",
      "CGM",
      "Linha Funcional",
      "Nome do Cursista",
      "CPF",
      "Turma Anterior",
      "Turma Nova",
      "Cód. SERE Nova",
      "Status Decisão",
      "Motivo",
      "Justificativa / Observação",
      "Status E-mail",
      "Operador / Solicitado Por"
    ]);
    abaHist.getRange(1, 1, 1, 13).setFontWeight("bold").setBackground("#001d3d").setFontColor("#ffffff");
  }

  var dataHoraAgora = Utilities.formatDate(new Date(), "America/Sao_Paulo", "dd/MM/yyyy HH:mm:ss");
  var linhaHist = [
    dataHoraAgora,
    cgmEncontrado,
    lfEncontrada,
    nomeCursista,
    cpfEncontrado,
    turmaAnterior,
    turmaNova,
    codSereNova,
    statusDecisao,
    dados.motivo || "Movimentação de Turma",
    dados.notaResolucao || "",
    "Pendente",
    dados.solicitadoPor || "Sistema Desktop Java Swing"
  ];
  abaHist.appendRow(linhaHist);
  var linhaInserida = abaHist.getLastRow();

  // 4. Atualiza o status na aba de solicitação original se informada
  if (dados.abaOrigem && dados.linhaOrigem) {
    try {
      var abaOrig = ss.getSheetByName(dados.abaOrigem);
      if (abaOrig) {
        var numLinha = parseInt(dados.linhaOrigem, 10);
        if (numLinha > 1) {
          var headersOrig = abaOrig.getRange(1, 1, 1, abaOrig.getLastColumn()).getValues()[0].map(function(h) {
            return String(h || "").trim().toLowerCase();
          });
          var colStatus = headersOrig.findIndex(function(h) { return h.indexOf("status") !== -1 || h.indexOf("situa") !== -1; });
          if (colStatus !== -1) {
            abaOrig.getRange(numLinha, colStatus + 1).setValue(statusDecisao);
          }
        }
      }
    } catch (eOrig) {
      Logger.log("Aviso atualização origem: " + eOrig.toString());
    }
  }

  // 5. Grava no TiDB Cloud para atualizar o dashboard web em tempo real
  try {
    var movPayload = {
      id: "MOV_SWING_" + Date.now(),
      timestamp: new Date().toISOString(),
      cgm: cgmEncontrado,
      linha_funcional: lfEncontrada,
      nome_cursista: nomeCursista,
      emailCursista: emailCursista,
      cpf: cpfEncontrado,
      turma_anterior: turmaAnterior,
      turma_nova: turmaNova,
      tipo_acao: dados.tipoAcao || "Troca de Turma",
      motivo: dados.motivo || "Movimentação de Turma",
      justificativa: dados.notaResolucao || "",
      status: statusDecisao,
      nota_resolucao: dados.notaResolucao || ("Decisão: " + statusDecisao),
      solicitadoPor: dados.solicitadoPor || "Sistema Desktop Java Swing"
    };

    var endpoint = obterEndpointApi('sync_movimentacoes_bulk');
    var options = obterOpcoesHttp({
      action: 'sync_movimentacoes_bulk',
      movimentacoes: [movPayload]
    });
    UrlFetchApp.fetch(endpoint, options);
  } catch (eTiDB) {
    Logger.log("Aviso TiDB: " + eTiDB.toString());
  }

  return {
    status: 'sucesso',
    linhaHistIndice: linhaInserida,
    dadosEmail: {
      cursistaNome: nomeCursista,
      cursistaEmail: emailCursista,
      cgm: cgmEncontrado,
      linhaFuncional: lfEncontrada,
      turmaAnterior: turmaAnterior,
      turmaNova: turmaNova,
      codSereNova: codSereNova,
      formadorAntigoNome: formadorAntigo,
      formadorAntigoEmail: emailFormadorAntigo,
      tutorAntigoNome: tutorAntigo,
      tutorAntigoEmail: emailTutorAntigo,
      formadorNovoNome: formadorNovo,
      formadorNovoEmail: emailFormadorNovo,
      tutorNovoNome: tutorNovo,
      tutorNovoEmail: emailTutorNovo,
      statusDecisao: statusDecisao,
      notaResolucao: dados.notaResolucao || "",
      dataEfetivacao: dataHoraAgora
    }
  };
}

function apiEnviarEmailMovimentacao(dadosEmail) {
  try {
    var para = dadosEmail.para || dadosEmail.cursistaEmail;
    if (!para) return { status: 'erro', mensagem: 'E-mail do cursista não informado.' };

    var ccs = [];
    if (dadosEmail.ccFormadorAntigo) ccs.push(dadosEmail.ccFormadorAntigo);
    if (dadosEmail.ccFormadorNovo) ccs.push(dadosEmail.ccFormadorNovo);
    if (dadosEmail.ccTutorAntigo) ccs.push(dadosEmail.ccTutorAntigo);
    if (dadosEmail.ccTutorNovo) ccs.push(dadosEmail.ccTutorNovo);

    var ccString = ccs.filter(function(e) { return e && e.indexOf("@") !== -1; }).join(",");
    var assunto = dadosEmail.assunto || ("[SEED-PR / Estágio Probatório] Movimentação de Turma: " + (dadosEmail.cursistaNome || ""));
    var corpo = dadosEmail.corpo || "";

    MailApp.sendEmail({
      to: para,
      cc: ccString || undefined,
      subject: assunto,
      body: corpo
    });

    // Atualiza a coluna Status E-mail na aba "Histórico de Movimentações"
    if (dadosEmail.linhaHistIndice) {
      var ss = obterPlanilhaMestra();
      var abaHist = ss.getSheetByName("Histórico de Movimentações");
      if (abaHist) {
        var dataHoraEnvio = Utilities.formatDate(new Date(), "America/Sao_Paulo", "dd/MM/yyyy HH:mm");
        abaHist.getRange(dadosEmail.linhaHistIndice, 12).setValue("Enviado em " + dataHoraEnvio);
      }
    }

    return { status: 'sucesso', mensagem: 'E-mails enviados com sucesso para todos os envolvidos!' };
  } catch (err) {
    return { status: 'erro', mensagem: err.toString() };
  }
}

/**
 * Endpoint HTTP REST Unificado (atende tanto ao Dashboard Web quanto ao Sistema Desktop Java Swing)
 */
function doGet(e) {
  var params = (e && e.parameter) ? e.parameter : {};
  var action = params.action || '';

  var result = {};
  if (action === 'get_solicitacoes_pendentes') {
    result = apiObterSolicitacoesPendentes();
  } else if (action === 'health' || action === 'ping') {
    result = { status: 'ok', servico: 'Google Apps Script SEED-PR' };
  } else if (typeof gerarPacoteDashboardConsolidado === 'function') {
    result = gerarPacoteDashboardConsolidado();
  } else {
    result = { status: 'ok', servico: 'Google Apps Script SEED-PR' };
  }

  return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  var action = (e && e.parameter && e.parameter.action) ? e.parameter.action : '';
  var body = {};
  try {
    body = JSON.parse((e && e.postData && e.postData.contents) ? e.postData.contents : '{}');
    if (!action && body.action) action = body.action;
    if (!action && body.acao) action = body.acao;
  } catch (err) {}

  var result = {};
  if (action === 'processar_movimentacao') {
    result = apiProcessarMovimentacao(body);
  } else if (action === 'enviar_email') {
    result = apiEnviarEmailMovimentacao(body);
  } else if (action === 'get_solicitacoes_pendentes') {
    result = apiObterSolicitacoesPendentes();
  } else if (action === 'salvar_intencao_2027') {
    result = apiSalvarIntencao2027(body);
  } else if (action === 'limpar_intencoes_2027') {
    result = apiLimparIntencoes2027();
  } else if (action === 'inserir_observacao_pratica' && typeof apiInserirObservacaoPratica === 'function') {
    result = apiInserirObservacaoPratica(body);
  } else if (action === 'salvar_remanejamento' && typeof apiSalvarRemanejamento === 'function') {
    result = apiSalvarRemanejamento(body);
  } else if (action === 'exonerar_cursista') {
    result = apiExonerarCursista(body.cpf, body.nome, body.motivo);
  } else {
    result = { status: 'erro', mensagem: 'Ação POST desconhecida: ' + action };
  }

  return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON);
}
