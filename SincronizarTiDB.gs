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
 * 5. Ao recarregar a planilha, surgirá o menu superior "⚡ ESTÁGIO PROBATÓRIO" com:
 *    • 🔄 Sincronizar Todas as Planilhas com TiDB Agora
 *    • ⏰ Ativar Atualização Automática Diária (07:00 da manhã)
 *    • 🔍 Testar Conexão com TiDB
 *
 * Sincronização automática às 07:00 da manhã:
 * - DADOS (Cursistas Ativos)
 * - CONCLUINTES-1CH (850+ Certificados do 1º Chamamento)
 * - TUTORES (Tutores Regionais)
 * - EXONERADOS (Servidores Exonerados)
 * - CURSISTAS NAO CONCLUINTES (Docentes Não Concluintes)
 * - MOVIMENTAÇÕES (Troca de Turma [Col O], Troca de Modalidade [Col M], Vínculos na AF [Col R])
 * - Observações de Prática
 * =========================================================================================
 */

// URL do Dashboard na Vercel (onde opera o gateway serverless /api/tidb)
var VERCEL_APP_URL = "https://dashboard-tawny-delta-96.vercel.app";

// ID da Planilha Mestra Central SEED/PR
var SPREADSHEET_ID_MESTRA_TIDB = "1sRkA88VrtczqXxQ6PlmgygeCVhPoElRNS8RC1QuQzx0";

/**
 * Helper resiliente para obter a planilha mestra ativa ou por ID
 */
function obterPlanilhaMestra() {
  try {
    var ativa = SpreadsheetApp.getActiveSpreadsheet();
    if (ativa) return ativa;
  } catch (e) {}
  return SpreadsheetApp.openById(SPREADSHEET_ID_MESTRA_TIDB);
}

/**
 * -----------------------------------------------------------------------------------------
 * 1. TESTE DE CONEXÃO COM O TIDB CLOUD
 * -----------------------------------------------------------------------------------------
 */
function testarConexaoTiDB() {
  var ui = SpreadsheetApp.getUi();
  var endpoint = VERCEL_APP_URL.replace(/\/$/, '') + '/api/tidb?action=test';

  try {
    var resp = UrlFetchApp.fetch(endpoint, {
      method: 'get',
      muteHttpExceptions: true
    });
    var code = resp.getResponseCode();
    var body = resp.getContentText();

    if (code === 200) {
      ui.alert(
        'Conexão Bem-Sucedida!',
        '✓ Conexão com TiDB Cloud Serverless operando com sucesso via Vercel Gateway.\n\nResposta do Servidor:\n' + body,
        ui.ButtonSet.OK
      );
    } else {
      ui.alert(
        'Aviso de Conexão (Código ' + code + ')',
        'O servidor retornou o seguinte status:\n\n' + body,
        ui.ButtonSet.OK
      );
    }
  } catch (err) {
    ui.alert(
      'Erro de Rede / Comunicação',
      'Não foi possível conectar ao endpoint do TiDB Cloud:\n\n' + err.toString(),
      ui.ButtonSet.OK
    );
  }
}

/**
 * -----------------------------------------------------------------------------------------
 * 2. CONFIGURADOR DO GATILHO MATINAL DAS 07:00 (HORÁRIO DE BRASÍLIA)
 * -----------------------------------------------------------------------------------------
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
 * -----------------------------------------------------------------------------------------
 * 3. MENU MANUAL DE ATUALIZAÇÃO IMEDIATA (Disparado pelo usuário a qualquer momento)
 * -----------------------------------------------------------------------------------------
 */
function menuSincronizarTiDBAgora() {
  try {
    SpreadsheetApp.getActiveSpreadsheet().toast('Iniciando sincronização com TiDB Cloud...', 'TiDB Serverless', 5);
    var res = executarSincronizacaoCompletaTiDB();
    var msg = '✓ Sincronização com o TiDB Cloud finalizada com sucesso!\n\n' +
              '• Cursistas Ativos (DADOS): ' + (res.cursistas || 0) + '\n' +
              '• Concluintes (1º Chamamento): ' + (res.concluintes || 0) + '\n' +
              '• Tutores: ' + (res.tutores || 0) + '\n' +
              '• Exonerados: ' + (res.exonerados || 0) + '\n' +
              '• Não Concluintes: ' + (res.nao_concluintes || 0) + '\n' +
              '• Movimentações (Trocas & Vínculos): ' + (res.movimentacoes || 0) + '\n' +
              '• Observações Pedagógicas: ' + (res.observacoes || 0);
    SpreadsheetApp.getUi().alert('Sincronização TiDB Concluída', msg, SpreadsheetApp.getUi().ButtonSet.OK);
  } catch (err) {
    try {
      SpreadsheetApp.getUi().alert('Erro na Sincronização', err.toString(), SpreadsheetApp.getUi().ButtonSet.OK);
    } catch (e) {}
  }
}

function sincronizarManualComAlerta() {
  menuSincronizarTiDBAgora();
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

  // 5. Cursistas Não Concluintes (CURSISTAS NAO CONCLUINTES)
  var resNaoConcluintes = sincronizarAbaNaoConcluintesParaTiDB();
  Logger.log('Resultado Não Concluintes: ' + JSON.stringify(resNaoConcluintes));

  // 6. Formulários de Troca de Turma, Troca de Modalidade e Vínculos na AF
  var resMovimentacoes = sincronizarAbasMovimentacoesParaTiDB();
  Logger.log('Resultado Movimentações: ' + JSON.stringify(resMovimentacoes));

  // 7. Observações Pedagógicas
  var resObservacoes = sincronizarAbaObservacoesParaTiDB();
  Logger.log('Resultado Observações: ' + JSON.stringify(resObservacoes));

  Logger.log('✓ Sincronização completa concluída com sucesso!');

  return {
    cursistas: resCursistas.total || 0,
    concluintes: resConcluintes.total || 0,
    tutores: resTutores.total || 0,
    exonerados: resExonerados.total || 0,
    nao_concluintes: resNaoConcluintes.total || 0,
    movimentacoes: resMovimentacoes.total || 0,
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
  for (var b = 0; b < cursistas.length; b += BATCH_SIZE) {
    var lote = cursistas.slice(b, b + BATCH_SIZE);
    var endpoint = VERCEL_APP_URL.replace(/\/$/, '') + '/api/tidb';

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
 * 6. Sincroniza a aba CONCLUINTES-1CH (Certificados na Avaliação Formativa)
 * -----------------------------------------------------------------------------------------
 */
function sincronizarAbaConcluintesParaTiDB() {
  var ss = obterPlanilhaMestra();
  var nomesPossiveis = ["CONCLUINTES-1CH", "CONCLUINTES", "Concluintes-1CH", "Concluintes"];
  var aba = null;
  for (var i = 0; i < nomesPossiveis.length; i++) {
    aba = ss.getSheetByName(nomesPossiveis[i]);
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
  var idxCgm = getIdx(["cgm"]);
  var idxCpf = getIdx(["cpf"]);
  var idxRg = getIdx(["rg"]);
  var idxEmail = getIdx(["e-mail", "email"]);
  var idxModalidade = getIdx(["modalidade"]);
  var idxComponente = getIdx(["componente"]);
  var idxNre = getIdx(["nre exe", "nre"]);
  var idxMunic = getIdx(["munic exe", "municipio"]);
  var idxTurma = getIdx(["turmas", "turma"]);
  var idxChamamento = getIdx(["chamamento"]);
  var idxAno = getIdx(["ano formativo", "ano"]);
  var idxDataConc = getIdx(["data conclusao", "conclusao"]);

  var concluintes = [];
  var cpfsVistos = new Set();

  for (var i = 1; i < dados.length; i++) {
    var row = dados[i];
    var nome = idxNome !== -1 ? String(row[idxNome] || "").trim() : "";
    if (!nome) continue;

    var cpf = idxCpf !== -1 ? String(row[idxCpf] || "").replace(/\D/g, "").trim() : "";
    if (cpf && cpfsVistos.has(cpf)) continue;
    if (cpf) cpfsVistos.add(cpf);

    var cgm = idxCgm !== -1 ? String(row[idxCgm] || "").trim() : "";

    concluintes.push({
      cod_cursista: cpf ? ("CONC_" + cpf) : (cgm ? ("CONC_" + cgm) : ("CONC_" + i)),
      cgm: cgm || null,
      nome_cursista: nome,
      email: idxEmail !== -1 ? String(row[idxEmail] || "").trim().toLowerCase() : null,
      cpf: cpf || null,
      rg: idxRg !== -1 ? String(row[idxRg] || "").trim() : null,
      modalidade: idxModalidade !== -1 ? String(row[idxModalidade] || "").trim() : "Docentes",
      componente: idxComponente !== -1 ? String(row[idxComponente] || "").trim() : null,
      nre_exe: idxNre !== -1 ? String(row[idxNre] || "").trim() : null,
      munic_exe: idxMunic !== -1 ? String(row[idxMunic] || "").trim() : null,
      turmas: idxTurma !== -1 ? String(row[idxTurma] || "").trim() : null,
      chamamento: idxChamamento !== -1 ? String(row[idxChamamento] || "").trim() : "1º Chamamento",
      ano_formativo: idxAno !== -1 ? String(row[idxAno] || "").trim() : "1º ANO",
      situacao: "CONCLUÍDO",
      data_conclusao: idxDataConc !== -1 ? String(row[idxDataConc] || "").trim() : null
    });
  }

  var BATCH_SIZE = 200;
  var totalSinc = 0;
  for (var b = 0; b < concluintes.length; b += BATCH_SIZE) {
    var lote = concluintes.slice(b, b + BATCH_SIZE);
    var endpoint = VERCEL_APP_URL.replace(/\/$/, '') + '/api/tidb';

    var options = {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify({
        action: 'sync_concluintes_bulk',
        concluintes: lote,
        truncate: (b === 0),
        batch_index: b
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

  var idxNome = getIdx(["tutor responsavel", "nome tutor", "tutor", "nome"]);
  var idxEmailEduc = getIdx(["e-mail educ", "email educ", "e-mail institucional", "email"]);
  var idxEmailAdm = getIdx(["e-mail adm", "email adm"]);
  var idxTelefone = getIdx(["telefone", "celular", "fone"]);
  var idxNre = getIdx(["nre tutor", "nre"]);
  var idxEmailNre = getIdx(["e-mail nre", "email nre"]);

  var tutores = [];
  var emailsVistos = new Set();

  for (var i = 1; i < dados.length; i++) {
    var row = dados[i];
    var nome = idxNome !== -1 ? String(row[idxNome] || "").trim() : "";
    if (!nome) continue;

    var emailEduc = idxEmailEduc !== -1 ? String(row[idxEmailEduc] || "").trim().toLowerCase() : "";
    if (emailEduc && emailsVistos.has(emailEduc)) continue;
    if (emailEduc) emailsVistos.add(emailEduc);

    tutores.push({
      tutor_responsavel: nome,
      email_educ: emailEduc || null,
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
    var endpoint = VERCEL_APP_URL.replace(/\/$/, '') + '/api/tidb';

    var options = {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify({
        action: 'sync_tutores_bulk',
        tutores: lote,
        truncate: (b === 0),
        batch_index: b
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
 * 8. Sincroniza a aba EXONERADOS
 * Colunas Oficiais: Nome, Email, Modalidade, Componente, Chamamento, Motivo
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
  var idxEmail = getIdx(["e-mail", "email"]);
  var idxModalidade = getIdx(["modalidade"]);
  var idxComponente = getIdx(["componente", "disciplina"]);
  var idxChamamento = getIdx(["chamamento"]);
  var idxMotivo = getIdx(["motivo", "tipo", "situacao"]);
  var idxCgm = getIdx(["cgm"]);
  var idxCpf = getIdx(["cpf"]);

  var exonerados = [];

  for (var i = 1; i < dados.length; i++) {
    var row = dados[i];
    var nome = idxNome !== -1 ? String(row[idxNome] || "").trim() : "";
    if (!nome) continue;

    exonerados.push({
      nome_cursista: nome,
      email: idxEmail !== -1 ? String(row[idxEmail] || "").trim().toLowerCase() : null,
      modalidade: idxModalidade !== -1 ? String(row[idxModalidade] || "").trim() : null,
      componente: idxComponente !== -1 ? String(row[idxComponente] || "").trim() : null,
      chamamento: idxChamamento !== -1 ? String(row[idxChamamento] || "").trim() : null,
      motivo: idxMotivo !== -1 ? String(row[idxMotivo] || "").trim() : null,
      cgm: idxCgm !== -1 ? String(row[idxCgm] || "").trim() : null,
      cpf: idxCpf !== -1 ? String(row[idxCpf] || "").replace(/\D/g, "").trim() : null
    });
  }

  var BATCH_SIZE = 200;
  var totalSinc = 0;
  for (var b = 0; b < exonerados.length; b += BATCH_SIZE) {
    var lote = exonerados.slice(b, b + BATCH_SIZE);
    var endpoint = VERCEL_APP_URL.replace(/\/$/, '') + '/api/tidb';

    var options = {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify({
        action: 'sync_exonerados_bulk',
        exonerados: lote,
        truncate: (b === 0),
        batch_index: b
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
 * 9. Sincroniza a aba CURSISTAS NAO CONCLUINTES
 * Colunas Oficiais: Nome, Email, Modalidade, Componente, Chamamento, Motivo
 * -----------------------------------------------------------------------------------------
 */
function sincronizarAbaNaoConcluintesParaTiDB() {
  var ss = obterPlanilhaMestra();
  var nomesPossiveis = ["CURSISTAS NAO CONCLUINTES", "CURSISTAS NÃO CONCLUINTES", "NAO CONCLUINTES", "NÃO CONCLUINTES"];
  var aba = null;
  for (var k = 0; k < nomesPossiveis.length; k++) {
    aba = ss.getSheetByName(nomesPossiveis[k]);
    if (aba) break;
  }
  if (!aba) return { status: 'nao_encontrada', mensagem: 'Aba CURSISTAS NAO CONCLUINTES não encontrada.' };

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
  var idxEmail = getIdx(["e-mail", "email"]);
  var idxModalidade = getIdx(["modalidade"]);
  var idxComponente = getIdx(["componente", "disciplina"]);
  var idxChamamento = getIdx(["chamamento"]);
  var idxMotivo = getIdx(["motivo", "tipo", "situacao"]);

  var naoConcluintes = [];

  for (var i = 1; i < dados.length; i++) {
    var row = dados[i];
    var nome = idxNome !== -1 ? String(row[idxNome] || "").trim() : "";
    if (!nome) continue;

    naoConcluintes.push({
      nome_cursista: nome,
      email: idxEmail !== -1 ? String(row[idxEmail] || "").trim().toLowerCase() : null,
      modalidade: idxModalidade !== -1 ? String(row[idxModalidade] || "").trim() : null,
      componente: idxComponente !== -1 ? String(row[idxComponente] || "").trim() : null,
      chamamento: idxChamamento !== -1 ? String(row[idxChamamento] || "").trim() : null,
      motivo: idxMotivo !== -1 ? String(row[idxMotivo] || "").trim() : null
    });
  }

  var BATCH_SIZE = 200;
  var totalSinc = 0;
  for (var b = 0; b < naoConcluintes.length; b += BATCH_SIZE) {
    var lote = naoConcluintes.slice(b, b + BATCH_SIZE);
    var endpoint = VERCEL_APP_URL.replace(/\/$/, '') + '/api/tidb';

    var options = {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify({
        action: 'sync_nao_concluintes_bulk',
        nao_concluintes: lote,
        truncate: (b === 0),
        batch_index: b
      }),
      muteHttpExceptions: true
    };

    try {
      var resp = UrlFetchApp.fetch(endpoint, options);
      if (resp.getResponseCode() === 200) {
        totalSinc += lote.length;
      } else {
        Logger.log('Aviso ao sincronizar não concluintes: ' + resp.getContentText());
      }
    } catch (err) {
      Logger.log('Erro ao sincronizar não concluintes: ' + err.toString());
    }
  }

  return { total: totalSinc };
}

/**
 * -----------------------------------------------------------------------------------------
 * 10. Sincroniza as abas de Formulários de Troca e Vínculos
 * - "Troca de Turma" (Coluna O = Defererido?)
 * - "Troca de Modalidade" (Coluna M = Defererido?)
 * - "Vínculos na AF" (Coluna R = Defererido?)
 * Se a coluna estiver preenchida com Deferido, Indeferido ou Resolvido -> status registrado.
 * Se estiver vazia -> Nova solicitação ('Pendente').
 * -----------------------------------------------------------------------------------------
 */
function sincronizarAbasMovimentacoesParaTiDB() {
  var ss = obterPlanilhaMestra();
  var movimentacoes = [];

  function normalizarStatus(val) {
    var s = String(val || "").trim().toLowerCase();
    if (s.includes('indeferid')) return 'Indeferido';
    if (s.includes('deferid')) return 'Deferido';
    if (s.includes('resolvid')) return 'Resolvido';
    if (s.includes('analis') || s.includes('andament')) return 'Em Análise';
    return 'Pendente';
  }

  function formatarTimestamp(carimbo) {
    if (!carimbo) return new Date().toISOString().slice(0, 19).replace('T', ' ');
    if (carimbo instanceof Date) {
      return Utilities.formatDate(carimbo, "America/Sao_Paulo", "yyyy-MM-dd HH:mm:ss");
    }
    var str = String(carimbo).trim();
    var match = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?/);
    if (match) {
      var d = match[1].length === 1 ? '0' + match[1] : match[1];
      var m = match[2].length === 1 ? '0' + match[2] : match[2];
      var y = match[3];
      var h = (match[4] || '00').length === 1 ? '0' + match[4] : (match[4] || '00');
      var min = (match[5] || '00').length === 1 ? '0' + match[5] : (match[5] || '00');
      var sec = (match[6] || '00').length === 1 ? '0' + match[6] : (match[6] || '00');
      return y + '-' + m + '-' + d + ' ' + h + ':' + min + ':' + sec;
    }
    return str;
  }

  // 1. Aba: Troca de Turma
  var abaTT = ss.getSheetByName("Troca de Turma");
  if (abaTT) {
    var dadosTT = abaTT.getDataRange().getValues();
    for (var i = 1; i < dadosTT.length; i++) {
      var r = dadosTT[i];
      var carimbo = String(r[0] || "");
      var email = String(r[1] || "").trim().toLowerCase();
      var nome = String(r[2] || "").trim();
      if (!nome && !email) continue;

      var statusRaw = r[14]; // Coluna O (Index 14)
      var status = normalizarStatus(statusRaw);
      var cgm = String(r[24] || "").trim(); // Coluna Y (Index 24)
      var turmaAnt = String(r[18] || "").trim(); // Coluna S (Index 18)
      var turmaNova = String(r[19] || "").trim(); // Coluna T (Index 19)
      var justificativa = String(r[11] || r[15] || "").trim();

      var movId = "MOV_TT_" + (cgm ? cgm : email.replace(/[^a-z0-9]/g, '')) + "_" + i;

      movimentacoes.push({
        id: movId,
        timestamp: formatarTimestamp(carimbo),
        cgm: cgm || null,
        nome_cursista: nome,
        email: email || null,
        turma_anterior: turmaAnt || null,
        turma_nova: turmaNova || null,
        tipo_acao: 'Troca de Turma',
        motivo: 'Solicitação via Formulário Google (Troca de Turma)',
        justificativa: justificativa || null,
        status: status,
        nota_resolucao: statusRaw ? String(r[15] || statusRaw) : null,
        solicitadoPor: 'Google Forms'
      });
    }
  }

  // 2. Aba: Troca de Modalidade
  var abaTM = ss.getSheetByName("Troca de Modalidade");
  if (abaTM) {
    var dadosTM = abaTM.getDataRange().getValues();
    for (var j = 1; j < dadosTM.length; j++) {
      var rm = dadosTM[j];
      var carimboM = String(rm[0] || "");
      var emailM = String(rm[1] || "").trim().toLowerCase();
      var nomeM = String(rm[2] || "").trim();
      if (!nomeM && !emailM) continue;

      var statusRawM = rm[12]; // Coluna M (Index 12)
      var statusM = normalizarStatus(statusRawM);
      var cgmM = String(rm[22] || "").trim(); // Coluna W (Index 22)
      var modAtual = String(rm[7] || "").trim(); // Coluna H
      var modNova = String(rm[8] || "").trim(); // Coluna I
      var turmaAntM = String(rm[15] || "").trim(); // Coluna P
      var turmaNovaM = String(rm[16] || "").trim(); // Coluna Q

      var movIdM = "MOV_TM_" + (cgmM ? cgmM : emailM.replace(/[^a-z0-9]/g, '')) + "_" + j;

      movimentacoes.push({
        id: movIdM,
        timestamp: formatarTimestamp(carimboM),
        cgm: cgmM || null,
        nome_cursista: nomeM,
        email: emailM || null,
        turma_anterior: turmaAntM || null,
        turma_nova: turmaNovaM || null,
        tipo_acao: 'Troca de Modalidade',
        modalidade_detalhes: modAtual + ' -> ' + modNova,
        motivo: 'Solicitação de ' + modAtual + ' para ' + modNova,
        status: statusM,
        nota_resolucao: statusRawM ? String(rm[13] || statusRawM) : null,
        solicitadoPor: 'Google Forms'
      });
    }
  }

  // 3. Aba: Vínculos na AF
  var abaVF = ss.getSheetByName("Vínculos na AF") || ss.getSheetByName("Vinculos na AF");
  if (abaVF) {
    var dadosVF = abaVF.getDataRange().getValues();
    for (var k = 1; k < dadosVF.length; k++) {
      var rv = dadosVF[k];
      var carimboV = String(rv[0] || "");
      var emailV = String(rv[1] || "").trim().toLowerCase();
      var nomeV = String(rv[2] || "").trim();
      if (!nomeV && !emailV) continue;

      var statusRawV = rv[17]; // Coluna R (Index 17)
      var statusV = normalizarStatus(statusRawV);
      var cgmV = String(rv[25] || "").trim(); // Coluna Z (Index 25)
      var turmaAntV = String(rv[20] || "").trim(); // Coluna U (Index 20)
      var turmaNovaV = String(rv[21] || "").trim(); // Coluna V (Index 21)

      var movIdV = "MOV_VF_" + (cgmV ? cgmV : emailV.replace(/[^a-z0-9]/g, '')) + "_" + k;

      movimentacoes.push({
        id: movIdV,
        timestamp: formatarTimestamp(carimboV),
        cgm: cgmV || null,
        nome_cursista: nomeV,
        email: emailV || null,
        turma_anterior: turmaAntV || null,
        turma_nova: turmaNovaV || null,
        tipo_acao: 'Vínculo na AF',
        motivo: 'Solicitação de Vínculos em Avaliação Formativa',
        status: statusV,
        nota_resolucao: statusRawV ? String(rv[18] || statusRawV) : null,
        solicitadoPor: 'Google Forms'
      });
    }
  }

  if (movimentacoes.length === 0) return { status: 'vazio', total: 0 };

  var BATCH_SIZE = 150;
  var totalSinc = 0;
  for (var b = 0; b < movimentacoes.length; b += BATCH_SIZE) {
    var lote = movimentacoes.slice(b, b + BATCH_SIZE);
    var endpoint = VERCEL_APP_URL.replace(/\/$/, '') + '/api/tidb';

    var options = {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify({
        action: 'sync_movimentacoes_bulk',
        movimentacoes: lote,
        truncate: (b === 0)
      }),
      muteHttpExceptions: true
    };

    try {
      var resp = UrlFetchApp.fetch(endpoint, options);
      if (resp.getResponseCode() === 200) {
        totalSinc += lote.length;
      } else {
        Logger.log('Aviso ao sincronizar movimentações: ' + resp.getContentText());
      }
    } catch (err) {
      Logger.log('Erro ao sincronizar movimentações: ' + err.toString());
    }
  }

  return { total: totalSinc };
}

/**
 * -----------------------------------------------------------------------------------------
 * 11. Sincroniza a aba Observações de Prática
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

  var idxCarimbo = getIdx(["carimbo", "data hora", "timestamp"]);
  var idxEmailCursista = getIdx(["e-mail cursista", "email cursista", "e-mail", "email"]);
  var idxNomeCursista = getIdx(["nome cursista", "cursista", "nome"]);
  var idxEmailFormador = getIdx(["e-mail formador", "email formador"]);
  var idxNomeFormador = getIdx(["nome formador", "formador"]);
  var idxAno = getIdx(["ano formativo", "ano"]);
  var idxSemestre = getIdx(["semestre"]);
  var idxChamamento = getIdx(["chamamento"]);
  var idxModalidade = getIdx(["modalidade"]);
  var idxComponente = getIdx(["componente"]);
  var idxTema = getIdx(["tema"]);
  var idxObsRealizada = getIdx(["observacao realizada", "realizada"]);
  var idxDataPratica = getIdx(["data pratica", "data da pratica"]);
  var idxLinkGravacao = getIdx(["link gravacao", "gravacao"]);
  var idxLinkPlanejamento = getIdx(["link planejamento", "planejamento"]);
  var idxLinkFeedback = getIdx(["link gravacao feedback", "link feedback"]);

  var observacoes = [];
  for (var i = 1; i < dados.length; i++) {
    var row = dados[i];
    var emailCur = idxEmailCursista !== -1 ? String(row[idxEmailCursista] || "").trim().toLowerCase() : "";
    if (!emailCur) continue;

    var carimbo = idxCarimbo !== -1 ? String(row[idxCarimbo] || "").trim() : "";
    var idOrigem = "OBS_" + emailCur.replace(/[^a-z0-9]/g, "") + "_" + (carimbo ? carimbo.replace(/[^0-9]/g, "") : i);

    observacoes.push({
      id_origem: idOrigem,
      carimbo: carimbo,
      email_cursista: emailCur,
      nome_cursista: idxNomeCursista !== -1 ? String(row[idxNomeCursista] || "").trim() : null,
      email_formador: idxEmailFormador !== -1 ? String(row[idxEmailFormador] || "").trim().toLowerCase() : null,
      nome_formador: idxNomeFormador !== -1 ? String(row[idxNomeFormador] || "").trim() : null,
      ano_formativo: idxAno !== -1 ? String(row[idxAno] || "").trim() : null,
      semestre: idxSemestre !== -1 ? String(row[idxSemestre] || "").trim() : null,
      chamamento: idxChamamento !== -1 ? String(row[idxChamamento] || "").trim() : null,
      modalidade: idxModalidade !== -1 ? String(row[idxModalidade] || "").trim() : null,
      componente: idxComponente !== -1 ? String(row[idxComponente] || "").trim() : null,
      tema: idxTema !== -1 ? String(row[idxTema] || "").trim() : null,
      observacao_realizada: idxObsRealizada !== -1 ? String(row[idxObsRealizada] || "").trim() : "Sim",
      data_pratica: idxDataPratica !== -1 ? String(row[idxDataPratica] || "").trim() : null,
      link_gravacao_pratica: idxLinkGravacao !== -1 ? String(row[idxLinkGravacao] || "").trim() : null,
      link_planejamento: idxLinkPlanejamento !== -1 ? String(row[idxLinkPlanejamento] || "").trim() : null,
      link_gravacao_feedback: idxLinkFeedback !== -1 ? String(row[idxLinkFeedback] || "").trim() : null
    });
  }

  var BATCH_SIZE = 100;
  var totalSinc = 0;
  for (var b = 0; b < observacoes.length; b += BATCH_SIZE) {
    var lote = observacoes.slice(b, b + BATCH_SIZE);
    var endpoint = VERCEL_APP_URL.replace(/\/$/, '') + '/api/tidb';

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
      } else {
        Logger.log('Aviso ao sincronizar observações: ' + resp.getContentText());
      }
    } catch (err) {
      Logger.log('Erro ao sincronizar observações: ' + err.toString());
    }
  }

  return { total: totalSinc };
}
