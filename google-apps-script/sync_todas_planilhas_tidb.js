/**
 * =========================================================================================
 * GOOGLE APPS SCRIPT: SINCRONIZAÇÃO AUTOMÁTICA PLANILHAS GOOGLE ➔ TiDB CLOUD (SERVERLESS)
 * Plataforma do Estágio Probatório - SEED/PR
 * =========================================================================================
 *
 * Como instalar e ativar no Google Sheets:
 * 1. Abra sua Planilha Mestra do Google (ou acesse https://script.google.com/)
 * 2. Acesse no menu: Extensões ➔ Apps Script
 * 3. Cole o código deste arquivo (crie um arquivo chamado 'SincronizarTiDB.gs')
 * 4. Salve com Ctrl+S
 * 5. Ao recarregar a planilha, surgirá o menu superior "⚡ TiDB Cloud" com:
 *    • 🔄 Sincronizar Tudo com TiDB Agora (Manual a qualquer momento)
 *    • ⏰ Ativar Atualização Automática Diária (07:00 da manhã)
 *    • 🔍 Testar Conexão com TiDB
 *
 * Pronto! Todos os dias às 07:00 da manhã o Google Apps Script executará a sincronização
 * completa de todas as abas para o TiDB Cloud Serverless sem qualquer intervenção manual.
 * =========================================================================================
 */

// URL do Dashboard na Vercel (onde opera o gateway serverless /api/tidb)
var VERCEL_URL = "https://dashboard-tawny-delta-96.vercel.app";

// ID da Planilha Mestra Central SEED/PR
var SPREADSHEET_ID_MESTRA = "1sRkA88VrtczqXxQ6PlmgygeCVhPoElRNS8RC1QuQzx0";

/**
 * Helper resiliente para obter a planilha mestra ativa ou por ID
 */
function obterPlanilhaMestra() {
  try {
    var ativa = SpreadsheetApp.getActiveSpreadsheet();
    if (ativa) return ativa;
  } catch (e) {}
  return SpreadsheetApp.openById(SPREADSHEET_ID_MESTRA);
}

/**
 * -----------------------------------------------------------------------------------------
 * MENU PERSONALIZADO NO GOOGLE SHEETS
 * Aparece automaticamente na barra superior da planilha para qualquer usuário autorizado
 * -----------------------------------------------------------------------------------------
 */
function onOpen() {
  try {
    SpreadsheetApp.getUi()
      .createMenu('⚡ TiDB Cloud')
      .addItem('🔄 Sincronizar Tudo com TiDB Agora (Manual)', 'sincronizarManualComAlerta')
      .addSeparator()
      .addItem('⏰ Ativar Atualização Automática Diária (07:00)', 'configurarGatilhoDiario7h')
      .addItem('🔍 Testar Conexão com TiDB', 'testarConexaoTiDB')
      .addToUi();
  } catch (e) {
    Logger.log('Interface de planilha indisponível (modo headless): ' + e.toString());
  }
}

/**
 * -----------------------------------------------------------------------------------------
 * 1. TESTE DE CONEXÃO COM O TIDB CLOUD
 * -----------------------------------------------------------------------------------------
 */
function testarConexaoTiDB() {
  var endpoint = VERCEL_URL.replace(/\/$/, '') + '/api/tidb?action=ping';
  try {
    var resp = UrlFetchApp.fetch(endpoint, { muteHttpExceptions: true });
    var json = JSON.parse(resp.getContentText());
    if (json.status === 'ok') {
      var msg = '✓ Conexão com TiDB Serverless Cloud bem-sucedida!\n\nEngine: ' + json.engine + '\nServidor Operante: ' + JSON.stringify(json.result);
      Logger.log(msg);
      try {
        SpreadsheetApp.getUi().alert('Teste de Conexão TiDB', msg, SpreadsheetApp.getUi().ButtonSet.OK);
      } catch (e) {}
    } else {
      throw new Error(resp.getContentText());
    }
  } catch (err) {
    var erroMsg = 'Falha ao conectar com TiDB via Vercel:\n' + err.toString();
    Logger.log(erroMsg);
    try {
      SpreadsheetApp.getUi().alert('Erro de Conexão', erroMsg, SpreadsheetApp.getUi().ButtonSet.OK);
    } catch (e) {}
  }
}

/**
 * -----------------------------------------------------------------------------------------
 * 2. CONFIGURADOR DO GATILHO MATINAL DAS 07:00 (HORÁRIO DE BRASÍLIA)
 * -----------------------------------------------------------------------------------------
 */
function configurarGatilhoDiario7h() {
  // Remove gatilhos anteriores da mesma função para evitar duplicidades
  var triggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === 'executarSincronizacaoCompletaTiDB') {
      ScriptApp.deleteTrigger(triggers[i]);
    }
  }

  // Cria o novo gatilho diário às 07:00 da manhã (Horário de Brasília)
  ScriptApp.newTrigger('executarSincronizacaoCompletaTiDB')
    .timeBased()
    .atHour(7)
    .everyDays(1)
    .inTimezone('America/Sao_Paulo')
    .create();

  var msg = '✓ Gatilho automático configurado com sucesso!\n\nA atualização das planilhas para o TiDB Cloud será executada diariamente às 07:00 da manhã.';
  Logger.log(msg);
  try {
    SpreadsheetApp.getUi().alert('Agendamento Diário Concluído', msg, SpreadsheetApp.getUi().ButtonSet.OK);
  } catch (e) {}
}

/**
 * -----------------------------------------------------------------------------------------
 * 3. SINCRONIZAÇÃO MANUAL COM ALERTA VISUAL NO GOOGLE SHEETS
 * -----------------------------------------------------------------------------------------
 */
function sincronizarManualComAlerta() {
  try {
    var res = executarSincronizacaoCompletaTiDB();
    var msg = '✓ Sincronização com o TiDB Cloud finalizada com sucesso!\n\n' +
              '• Cursistas Ativos (DADOS): ' + (res.cursistas || 0) + '\n' +
              '• Concluintes (1º Chamamento): ' + (res.concluintes || 0) + '\n' +
              '• Tutores: ' + (res.tutores || 0) + '\n' +
              '• Exonerados: ' + (res.exonerados || 0) + '\n' +
              '• Observações Pedagógicas: ' + (res.observacoes || 0);
    SpreadsheetApp.getUi().alert('Sincronização TiDB Concluída', msg, SpreadsheetApp.getUi().ButtonSet.OK);
  } catch (err) {
    try {
      SpreadsheetApp.getUi().alert('Erro na Sincronização', err.toString(), SpreadsheetApp.getUi().ButtonSet.OK);
    } catch (e) {}
  }
}

/**
 * -----------------------------------------------------------------------------------------
 * 4. EXECUÇÃO DA SINCRONIZAÇÃO COMPLETA (RODA AUTOMATICAMENTE ÀS 7H OU MANUALMENTE)
 * -----------------------------------------------------------------------------------------
 */
function executarSincronizacaoCompletaTiDB() {
  Logger.log('Iniciando sincronização das planilhas com o TiDB Cloud...');
  
  // 1. Cursistas Ativos (DADOS)
  var resCursistas = sincronizarAbaDadosParaTiDB();
  Logger.log('Resultado Cursistas (DADOS): ' + JSON.stringify(resCursistas));

  // 2. Concluintes do 1º Chamamento (CONCLUINTES-1CH)
  var resConcluintes = sincronizarAbaConcluintesParaTiDB();
  Logger.log('Resultado Concluintes (CONCLUINTES-1CH): ' + JSON.stringify(resConcluintes));

  // 3. Tutores
  var resTutores = sincronizarAbaTutoresParaTiDB();
  Logger.log('Resultado Tutores: ' + JSON.stringify(resTutores));

  // 4. Servidores Exonerados (EXONERADOS)
  var resExonerados = sincronizarAbaExoneradosParaTiDB();
  Logger.log('Resultado Exonerados: ' + JSON.stringify(resExonerados));

  // 5. Observações Pedagógicas
  var resObservacoes = sincronizarAbaObservacoesParaTiDB();
  Logger.log('Resultado Observações: ' + JSON.stringify(resObservacoes));

  Logger.log('✓ Sincronização completa concluída com sucesso!');

  return {
    cursistas: resCursistas.total || 0,
    concluintes: resConcluintes.total || 0,
    tutores: resTutores.total || 0,
    exonerados: resExonerados.total || 0,
    observacoes: resObservacoes.total || 0
  };
}

/**
 * -----------------------------------------------------------------------------------------
 * 5. Sincroniza a aba DADOS (Cursistas Ativos)
 * -----------------------------------------------------------------------------------------
 */
function sincronizarAbaDadosParaTiDB() {
  var ss = obterPlanilhaMestra();
  var aba = ss.getSheetByName("DADOS") || ss.getSheetByName("CURSISTAS") || ss.getSheets()[0];
  if (!aba) return { status: 'erro', mensagem: 'Aba DADOS não encontrada.' };

  var dados = aba.getDataRange().getValues();
  if (dados.length < 2) return { status: 'vazio' };

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
    var cod = cgm ? (cgm + "_" + turmas) : ("CURS_" + i);

    cursistas.push({
      cod_cursista: cod,
      cgm: cgm || null,
      nome_cursista: nome,
      email: idxEmail !== -1 ? String(row[idxEmail] || "").trim() : null,
      cpf_cursista: idxCpf !== -1 ? String(row[idxCpf] || "").trim() : null,
      turmas: turmas || null,
      modalidade: idxModalidade !== -1 ? String(row[idxModalidade] || "").trim() : null,
      componente: idxComponente !== -1 ? String(row[idxComponente] || "").trim() : null,
      dia_da_semana: idxDiaSemana !== -1 ? String(row[idxDiaSemana] || "").trim() : null,
      turno: idxTurno !== -1 ? String(row[idxTurno] || "").trim() : null,
      nome_formador: idxFormador !== -1 ? String(row[idxFormador] || "").trim() : null,
      email_formador: idxEmailFormador !== -1 ? String(row[idxEmailFormador] || "").trim() : null,
      tutor_responsavel: idxTutor !== -1 ? String(row[idxTutor] || "").trim() : null,
      email_tutor: idxEmailTutor !== -1 ? String(row[idxEmailTutor] || "").trim() : null
    });
  }

  var BATCH_SIZE = 200;
  var totalSinc = 0;
  for (var b = 0; b < cursistas.length; b += BATCH_SIZE) {
    var lote = cursistas.slice(b, b + BATCH_SIZE);
    var endpoint = VERCEL_URL.replace(/\/$/, '') + '/api/tidb';
    
    var options = {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify({
        action: 'sync_cursistas_bulk',
        cursistas: lote
      }),
      muteHttpExceptions: true
    };

    try {
      var resp = UrlFetchApp.fetch(endpoint, options);
      if (resp.getResponseCode() === 200) {
        totalSinc += lote.length;
      } else {
        Logger.log('Aviso ao sincronizar lote cursistas: ' + resp.getContentText());
      }
    } catch (err) {
      Logger.log('Erro de conexão com API Vercel: ' + err.toString());
    }
  }

  return { total: totalSinc };
}

/**
 * -----------------------------------------------------------------------------------------
 * 6. Sincroniza a aba CONCLUINTES-1CH (Certificados na Avaliação Formativa)
 * -----------------------------------------------------------------------------------------
 */
function sincronizarAbaConcluintesParaTiDB() {
  var ss = obterPlanilhaMestra();
  var nomesPossiveis = ["CONCLUINTES-1CH", "CONCLUINTES", "Concluintes-1CH", "Concluintes"];
  var aba = null;
  for (var k = 0; k < nomesPossiveis.length; k++) {
    aba = ss.getSheetByName(nomesPossiveis[k]);
    if (aba) break;
  }
  if (!aba) return { status: 'nao_encontrada', mensagem: 'Aba CONCLUINTES-1CH não encontrada.' };

  var dados = aba.getDataRange().getValues();
  if (dados.length < 2) return { status: 'vazio' };

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
  var idxRg = getIdx(["rg"]);
  var idxComponente = getIdx(["componente", "disciplina"]);
  var idxNre = getIdx(["nre"]);
  var idxMunic = getIdx(["munic"]);
  var idxTurma = getIdx(["turmas", "turma"]);
  var idxModalidade = getIdx(["modalidade"]);
  var idxDataConc = getIdx(["conclus", "data"]);

  var concluintes = [];
  var cpfsVistos = new Set();

  for (var i = 1; i < dados.length; i++) {
    var row = dados[i];
    var nome = idxNome !== -1 ? String(row[idxNome] || "").trim() : "";
    if (!nome) continue;

    var cpf = idxCpf !== -1 ? String(row[idxCpf] || "").replace(/\D/g, "").trim() : "";
    if (cpf && cpfsVistos.has(cpf)) continue;
    if (cpf) cpfsVistos.add(cpf);

    concluintes.push({
      cod_cursista: cpf ? ("CONC_" + cpf) : ("CONC_" + i),
      cgm: idxCgm !== -1 ? String(row[idxCgm] || "").trim() : null,
      nome_cursista: nome,
      email: idxEmail !== -1 ? String(row[idxEmail] || "").trim().toLowerCase() : null,
      cpf: cpf || null,
      rg: idxRg !== -1 ? String(row[idxRg] || "").trim() : null,
      componente: idxComponente !== -1 ? String(row[idxComponente] || "").trim() : null,
      nre_exe: idxNre !== -1 ? String(row[idxNre] || "").trim() : null,
      munic_exe: idxMunic !== -1 ? String(row[idxMunic] || "").trim() : null,
      turmas: idxTurma !== -1 ? String(row[idxTurma] || "").trim() : null,
      ano_formativo: "1º ANO",
      modalidade: idxModalidade !== -1 ? String(row[idxModalidade] || "").trim() : "Docentes",
      chamamento: "1º Chamamento",
      situacao: "CONCLUÍDO",
      data_conclusao: idxDataConc !== -1 ? String(row[idxDataConc] || "").trim() : null
    });
  }

  var BATCH_SIZE = 200;
  var totalSinc = 0;
  for (var b = 0; b < concluintes.length; b += BATCH_SIZE) {
    var lote = concluintes.slice(b, b + BATCH_SIZE);
    var endpoint = VERCEL_URL.replace(/\/$/, '') + '/api/tidb';

    var options = {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify({
        action: 'sync_concluintes_bulk',
        concluintes: lote
      }),
      muteHttpExceptions: true
    };

    try {
      var resp = UrlFetchApp.fetch(endpoint, options);
      if (resp.getResponseCode() === 200) {
        totalSinc += lote.length;
      } else {
        Logger.log('Aviso ao sincronizar concluintes: ' + resp.getContentText());
      }
    } catch (err) {
      Logger.log('Erro ao sincronizar concluintes: ' + err.toString());
    }
  }

  return { total: totalSinc };
}

/**
 * -----------------------------------------------------------------------------------------
 * 7. Sincroniza a aba TUTORES da Planilha Master
 * -----------------------------------------------------------------------------------------
 */
function sincronizarAbaTutoresParaTiDB() {
  var ss = obterPlanilhaMestra();
  var nomesTutores = ["TUTORES", "Tutores", "tutores", "TUTOR", "Tutor"];
  var aba = null;
  for (var i = 0; i < nomesTutores.length; i++) {
    aba = ss.getSheetByName(nomesTutores[i]);
    if (aba) break;
  }
  if (!aba) return { status: 'nao_encontrada', mensagem: 'Aba TUTORES não encontrada.' };

  var dados = aba.getDataRange().getValues();
  if (dados.length < 2) return { status: 'vazio' };

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

  var idxTutor = getIdx(["tutor responsavel", "tutor", "nome tutor", "nome"]);
  var idxEmailEduc = getIdx(["email educ", "e-mail educ", "email @escola", "email institucional", "email"]);
  var idxEmailAdm = getIdx(["email adm", "e-mail adm", "email administrativo"]);
  var idxTelefone = getIdx(["telefone", "celular", "fone", "contato"]);
  var idxNre = getIdx(["nre tutor", "nre"]);
  var idxEmailNre = getIdx(["email nre", "e-mail nre"]);

  var tutores = [];
  var nomesVistos = new Set();

  for (var rowIdx = 1; rowIdx < dados.length; rowIdx++) {
    var row = dados[rowIdx];
    var nomeTutor = idxTutor !== -1 ? String(row[idxTutor] || "").trim() : "";
    if (!nomeTutor) continue;

    var chave = nomeTutor.toUpperCase();
    if (nomesVistos.has(chave)) continue;
    nomesVistos.add(chave);

    tutores.push({
      tutor_responsavel: nomeTutor,
      email_educ: idxEmailEduc !== -1 ? String(row[idxEmailEduc] || "").trim().toLowerCase() : null,
      email_adm: idxEmailAdm !== -1 ? String(row[idxEmailAdm] || "").trim().toLowerCase() : null,
      telefone: idxTelefone !== -1 ? String(row[idxTelefone] || "").trim() : null,
      nre_tutor: idxNre !== -1 ? String(row[idxNre] || "").trim() : null,
      email_nre: idxEmailNre !== -1 ? String(row[idxEmailNre] || "").trim().toLowerCase() : null
    });
  }

  var BATCH_SIZE = 100;
  var totalSinc = 0;
  for (var b = 0; b < tutores.length; b += BATCH_SIZE) {
    var lote = tutores.slice(b, b + BATCH_SIZE);
    var endpoint = VERCEL_URL.replace(/\/$/, '') + '/api/tidb';

    var options = {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify({
        action: 'sync_tutores_bulk',
        tutores: lote
      }),
      muteHttpExceptions: true
    };

    try {
      var resp = UrlFetchApp.fetch(endpoint, options);
      if (resp.getResponseCode() === 200) {
        totalSinc += lote.length;
      } else {
        Logger.log('Aviso ao sincronizar tutores: ' + resp.getContentText());
      }
    } catch (err) {
      Logger.log('Erro ao sincronizar tutores: ' + err.toString());
    }
  }

  return { total: totalSinc };
}

/**
 * -----------------------------------------------------------------------------------------
 * 8. Sincroniza a aba EXONERADOS da Planilha Master
 * -----------------------------------------------------------------------------------------
 */
function sincronizarAbaExoneradosParaTiDB() {
  var ss = obterPlanilhaMestra();
  var nomesPossiveis = ["EXONERADOS", "Exonerados", "exonerados", "DESLIGADOS", "Desligados"];
  var aba = null;
  for (var k = 0; k < nomesPossiveis.length; k++) {
    aba = ss.getSheetByName(nomesPossiveis[k]);
    if (aba) break;
  }
  if (!aba) return { status: 'nao_encontrada', mensagem: 'Aba EXONERADOS não encontrada.' };

  var dados = aba.getDataRange().getValues();
  if (dados.length < 2) return { status: 'vazio' };

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

  var idxNome = getIdx(["nome", "servidor", "cursista"]);
  var idxCgm = getIdx(["cgm"]);
  var idxCpf = getIdx(["cpf"]);
  var idxRg = getIdx(["rg"]);
  var idxEmail = getIdx(["e-mail", "email"]);
  var idxMotivo = getIdx(["motivo", "tipo", "situacao"]);
  var idxPortaria = getIdx(["portaria", "resolucao", "decreto", "termo"]);
  var idxData = getIdx(["data", "data exoneracao", "data desligamento"]);
  var idxNre = getIdx(["nre"]);
  var idxMunic = getIdx(["municipio", "munic"]);
  var idxEscola = getIdx(["escola", "colegio", "estabelecimento"]);
  var idxComp = getIdx(["componente", "disciplina", "cargo"]);
  var idxObs = getIdx(["observacao", "observacoes", "obs"]);

  var exonerados = [];
  var cpfsVistos = new Set();

  for (var i = 1; i < dados.length; i++) {
    var row = dados[i];
    var nome = idxNome !== -1 ? String(row[idxNome] || "").trim() : "";
    if (!nome) continue;

    var cpf = idxCpf !== -1 ? String(row[idxCpf] || "").replace(/\D/g, "").trim() : "";
    if (cpf && cpfsVistos.has(cpf)) continue;
    if (cpf) cpfsVistos.add(cpf);

    exonerados.push({
      nome_cursista: nome,
      cgm: idxCgm !== -1 ? String(row[idxCgm] || "").trim() : null,
      cpf: cpf || null,
      rg: idxRg !== -1 ? String(row[idxRg] || "").trim() : null,
      email: idxEmail !== -1 ? String(row[idxEmail] || "").trim().toLowerCase() : null,
      motivo: idxMotivo !== -1 ? String(row[idxMotivo] || "").trim() : null,
      portaria: idxPortaria !== -1 ? String(row[idxPortaria] || "").trim() : null,
      data_exoneracao: idxData !== -1 ? String(row[idxData] || "").trim() : null,
      nre: idxNre !== -1 ? String(row[idxNre] || "").trim() : null,
      municipio: idxMunic !== -1 ? String(row[idxMunic] || "").trim() : null,
      escola: idxEscola !== -1 ? String(row[idxEscola] || "").trim() : null,
      componente: idxComp !== -1 ? String(row[idxComp] || "").trim() : null,
      observacoes: idxObs !== -1 ? String(row[idxObs] || "").trim() : null
    });
  }

  var BATCH_SIZE = 200;
  var totalSinc = 0;
  for (var b = 0; b < exonerados.length; b += BATCH_SIZE) {
    var lote = exonerados.slice(b, b + BATCH_SIZE);
    var endpoint = VERCEL_URL.replace(/\/$/, '') + '/api/tidb';

    var options = {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify({
        action: 'sync_exonerados_bulk',
        exonerados: lote
      }),
      muteHttpExceptions: true
    };

    try {
      var resp = UrlFetchApp.fetch(endpoint, options);
      if (resp.getResponseCode() === 200) {
        totalSinc += lote.length;
      } else {
        Logger.log('Aviso ao sincronizar exonerados: ' + resp.getContentText());
      }
    } catch (err) {
      Logger.log('Erro ao sincronizar exonerados: ' + err.toString());
    }
  }

  return { total: totalSinc };
}

/**
 * -----------------------------------------------------------------------------------------
 * 9. Sincroniza a aba Observações de Prática
 * -----------------------------------------------------------------------------------------
 */
function sincronizarAbaObservacoesParaTiDB() {
  var ss = obterPlanilhaMestra();
  var nomesObs = ["Observações de Prática", "Observacoes_Pratica", "OBSERVACOES", "Observações"];
  var aba = null;
  for (var k = 0; k < nomesObs.length; k++) {
    aba = ss.getSheetByName(nomesObs[k]);
    if (aba) break;
  }
  if (!aba) return { status: 'nao_encontrada' };

  var dados = aba.getDataRange().getValues();
  if (dados.length < 2) return { status: 'vazio' };

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

  var idxCarimbo = getIdx(["carimbo", "data e hora", "timestamp"]);
  var idxEmailCursista = getIdx(["e-mail cursista", "email cursista", "email"]);
  var idxNomeCursista = getIdx(["nome cursista", "cursista"]);
  var idxEmailFormador = getIdx(["e-mail formador", "email formador"]);
  var idxNomeFormador = getIdx(["nome formador", "formador"]);
  var idxTema = getIdx(["tema"]);
  var idxDataPratica = getIdx(["data pratica", "data da pratica", "data implementacao"]);
  var idxDataFeedback = getIdx(["data feedback", "data do feedback"]);
  var idxNivelPlan = getIdx(["nivel planejamento", "planejamento"]);
  var idxNivelPratica = getIdx(["nivel pratica", "pratica"]);

  var observacoes = [];
  for (var i = 1; i < dados.length; i++) {
    var row = dados[i];
    var emailCursista = idxEmailCursista !== -1 ? String(row[idxEmailCursista] || "").trim() : "";
    if (!emailCursista) continue;

    var carimbo = idxCarimbo !== -1 ? String(row[idxCarimbo] || "").trim() : "";
    var idOrig = "OBS_PLAN_" + i + "_" + carimbo.replace(/\D/g, '');

    observacoes.push({
      id_origem: idOrig,
      carimbo: carimbo || null,
      email_cursista: emailCursista,
      nome_cursista: idxNomeCursista !== -1 ? String(row[idxNomeCursista] || "").trim() : "",
      email_formador: idxEmailFormador !== -1 ? String(row[idxEmailFormador] || "").trim() : null,
      nome_formador: idxNomeFormador !== -1 ? String(row[idxNomeFormador] || "").trim() : null,
      tema: idxTema !== -1 ? String(row[idxTema] || "").trim() : null,
      data_pratica: idxDataPratica !== -1 ? String(row[idxDataPratica] || "").trim() : null,
      data_feedback: idxDataFeedback !== -1 ? String(row[idxDataFeedback] || "").trim() : null,
      nivel_planejamento: idxNivelPlan !== -1 ? String(row[idxNivelPlan] || "").trim() : null,
      nivel_pratica: idxNivelPratica !== -1 ? String(row[idxNivelPratica] || "").trim() : null
    });
  }

  var BATCH_SIZE = 200;
  var totalSinc = 0;
  for (var b = 0; b < observacoes.length; b += BATCH_SIZE) {
    var lote = observacoes.slice(b, b + BATCH_SIZE);
    var endpoint = VERCEL_URL.replace(/\/$/, '') + '/api/tidb';

    var options = {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify({
        action: 'sync_observacoes_bulk',
        observacoes: lote
      }),
      muteHttpExceptions: true
    };

    try {
      var resp = UrlFetchApp.fetch(endpoint, options);
      if (resp.getResponseCode() === 200) {
        totalSinc += lote.length;
      }
    } catch (err) {
      Logger.log('Erro de envio observações: ' + err.toString());
    }
  }

  return { total: totalSinc };
}
