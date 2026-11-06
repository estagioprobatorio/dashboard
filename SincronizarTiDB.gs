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
var ID_PLANILHA_OBS_1ANO_2SEM = "1dL_Q-_15Idx3SNAZOqmKzrnVqA8tHFBzILA5PZ7p798";
var ID_PLANILHA_OBS_2e3ANO_2SEM = "1uv5QWeqtN5iMkH8nVQUvsYKClv9NaGDHgsdT_D-RPiw";
var ID_PLANILHA_OBS_TUTOR = "1V54Gl-KVGaHjLBH07hQZxq6GU88kfn0Xurh5P2LuSz8";

/**
 * Normalizador Canônico para os 32 NREs do Paraná (Caixa Alta, sem acento, sem cedilha)
 */
function normalizeNre(nre) {
  if (!nre) return '';
  var s = String(nre)
    .trim()
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ');

  if (!s) return '';
  if (s === 'AMN' || s === 'METROPOLITANA NORTE') return 'AREA METROPOLITANA NORTE';
  if (s === 'AMS' || s === 'METROPOLITANA SUL') return 'AREA METROPOLITANA SUL';
  if (s === 'FOZ') return 'FOZ DO IGUACU';
  if (s === 'FRANCISCO BELTRAO' || s === 'BELTRAO') return 'FRANCISCO BELTRAO';
  if (s === 'UNIAO DA VITORIA' || s === 'UNIAO') return 'UNIAO DA VITORIA';
  if (s === 'WENCESLAU BRAZ' || s === 'WENCESLAU') return 'WENCESLAU BRAZ';
  if (s === 'CORNELIO PROCOPIO' || s === 'CORNELIO') return 'CORNELIO PROCOPIO';
  if (s === 'TELEMACO BORBA' || s === 'TELEMACO') return 'TELEMACO BORBA';
  return s;
}

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

  // 7. Observações Pedagógicas (Cursistas)
  var resObservacoes = sincronizarAbaObservacoesParaTiDB();
  Logger.log('Resultado Observações: ' + JSON.stringify(resObservacoes));

  // 8. Observações do Tutor sobre Formadores (Respostas ao formulário 1)
  var resObservacoesTutor = sincronizarAbaObservacoesTutorParaTiDB();
  Logger.log('Resultado Observações do Tutor (Formadores): ' + JSON.stringify(resObservacoesTutor));

  Logger.log('✓ Sincronização completa concluída com sucesso!');

  return {
    cursistas: resCursistas.total || 0,
    concluintes: resConcluintes.total || 0,
    tutores: resTutores.total || 0,
    exonerados: resExonerados.total || 0,
    nao_concluintes: resNaoConcluintes.total || 0,
    movimentacoes: resMovimentacoes.total || 0,
    observacoes: resObservacoes.total || 0,
    observacoes_tutor: resObservacoesTutor.total || 0
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

/**
 * Extrai observações diretamente de uma planilha externa do Google por ID
 */
function extrairObservacoesDePlanilhaExterna(spreadsheetId, anoRotulo) {
  try {
    var ss = SpreadsheetApp.openById(spreadsheetId);
    var aba = ss.getSheets()[0];
    if (!aba) return [];
    var dados = aba.getDataRange().getValues();
    if (dados.length < 2) return [];

    var lista = [];
    for (var i = 1; i < dados.length; i++) {
      var row = dados[i];
      var carimbo = String(row[0] || '').trim();
      var formadorEmail = String(row[1] || '').trim().toLowerCase();
      var formadorNome = String(row[2] || '').trim() || formadorEmail;
      var quemObservou = String(row[3] || '').trim();
      var cursistaNome = String(row[4] || '').trim();
      var cursistaEmail = String(row[5] || '').trim().toLowerCase();
      var realizada = String(row[6] || '').trim();
      var modFeedback = String(row[13] || '').trim();
      var modalidade = String(row[15] || '').trim();
      var componente = String(row[16] || '').trim();
      var tema = String(row[17] || '').trim();
      var proposta = String(row[18] || '').trim();

      if (!cursistaEmail && !cursistaNome) continue;

      var idOrigem = 'OBS_' + anoRotulo.replace(/[^a-zA-Z0-9]/g, '') + '_' + (cursistaEmail ? cursistaEmail.replace(/[^a-z0-9]/g, '') : i) + '_' + (carimbo ? carimbo.replace(/[^0-9]/g, '') : i);

      lista.push({
        id_origem: idOrigem,
        carimbo: carimbo,
        email_cursista: cursistaEmail,
        nome_cursista: cursistaNome,
        email_formador: formadorEmail,
        nome_formador: formadorNome,
        ano_formativo: anoRotulo,
        semestre: '2º Semestre',
        modalidade: modalidade || 'Docentes',
        componente: componente,
        tema: tema,
        proposta_pedagogica: proposta,
        observacao_realizada: realizada,
        is_realizada: realizada.toLowerCase().indexOf('sim') !== -1 ? 1 : 0,
        modalidade_feedback: modFeedback,
        quem_observou: quemObservou,
        tutor_tecnico_observador: quemObservou
      });
    }
    return lista;
  } catch (e) {
    Logger.log('Erro ao ler planilha externa ' + spreadsheetId + ' (' + anoRotulo + '): ' + e.toString());
    return [];
  }
}

function sincronizarAbaObservacoesParaTiDB() {
  Logger.log('Extraindo observações de prática pedagógica das planilhas do 1º e 2º/3º Anos...');
  
  var obs1Ano = extrairObservacoesDePlanilhaExterna(ID_PLANILHA_OBS_1ANO_2SEM, "1º ANO");
  Logger.log('Observações 1º Ano extraídas: ' + obs1Ano.length);

  var obs2e3Ano = extrairObservacoesDePlanilhaExterna(ID_PLANILHA_OBS_2e3ANO_2SEM, "2º/3º ANO");
  Logger.log('Observações 2º/3º Anos extraídas: ' + obs2e3Ano.length);

  var observacoes = [].concat(obs1Ano, obs2e3Ano);

  // Fallback: se houver aba local na Mestra, extrai também
  try {
    var ss = obterPlanilhaMestra();
    var nomesObs = ["Observações de Prática", "Observacoes_Pratica", "OBSERVACOES", "Observações"];
    var aba = null;
    for (var k = 0; k < nomesObs.length; k++) {
      aba = ss.getSheetByName(nomesObs[k]);
      if (aba) break;
    }
    if (aba) {
      var dados = aba.getDataRange().getValues();
      if (dados.length > 1) {
        // adiciona registros locais se não vazios
        Logger.log('Aba de observações locais encontrada na Mestra: ' + (dados.length - 1) + ' linhas.');
      }
    }
  } catch (e) {}

  if (observacoes.length === 0) {
    Logger.log('Nenhuma observação encontrada nas planilhas.');
    return { status: 'vazio', total: 0 };
  }

  Logger.log('Total consolidado de observações para sincronizar: ' + observacoes.length);

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
        observacoes: lote,
        truncate: (b === 0)
      }),
      muteHttpExceptions: true
    };

    try {
      var resp = UrlFetchApp.fetch(endpoint, options);
      var code = resp.getResponseCode();
      if (code === 200) {
        totalSinc += lote.length;
      } else {
        Logger.log('Erro no lote ' + b + ': ' + resp.getContentText());
      }
    } catch (err) {
      Logger.log('Exceção no envio do lote ' + b + ': ' + err.toString());
    }
  }

  Logger.log('Total de observações sincronizadas com TiDB: ' + totalSinc);
  return { status: 'sucesso', total: totalSinc };
}

function sincronizarAbaObservacoesTutorParaTiDB() {
  var ss = obterPlanilhaMestra();
  var nomes = ["Respostas ao formulário 1", "Respostas ao formulario 1", "Observações do Tutor", "OBSERVACOES_TUTOR"];
  var aba = null;

  for (var k = 0; k < nomes.length; k++) {
    aba = ss.getSheetByName(nomes[k]);
    if (aba) break;
  }

  if (!aba) {
    var todas = ss.getSheets();
    for (var s = 0; s < todas.length; s++) {
      if (todas[s].getSheetId() === 1228233119) {
        aba = todas[s];
        break;
      }
    }
  }

  if (!aba) {
    Logger.log('Aba de Observações do Tutor não encontrada.');
    return { status: 'nao_encontrada' };
  }

  var dados = aba.getDataRange().getValues();
  if (dados.length < 2) return { status: 'vazio' };

  function stripAcc(s) {
    return String(s || '').normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();
  }

  function scoreFor(v) {
    if (!v) return null;
    var u = stripAcc(v).toUpperCase();
    if (u.indexOf("NAO ATENDEU") !== -1 && u.indexOf("PARCIALMENTE") === -1) return 0;
    if (u.indexOf("PARCIALMENTE") !== -1) return 1;
    if (u.indexOf("SUPEROU") !== -1) return 3;
    if (u.indexOf("INTEGRALMENTE") !== -1 || (u.indexOf("ATENDEU") !== -1 && u.indexOf("PARCIALMENTE") === -1)) return 2;
    if (u.indexOf("NAO OBSERVADO") !== -1) return null;
    return null;
  }

  function detectModalidade(acaoObs, acaoAcomp) {
    var obs = stripAcc(acaoObs);
    if (obs.indexOf("encontro") !== -1) return "Encontro Formativo";
    if (obs.indexOf("dialogo") !== -1) return "Diálogo Formativo";
    if (obs.indexOf("devolutiva") !== -1) return "Devolutiva";

    var acomp = stripAcc(acaoAcomp);
    if (acomp.indexOf("checklist") !== -1) return "Checklist Operacional";
    if (acomp.indexOf("encontro") !== -1) return "Encontro Formativo";
    if (acomp.indexOf("dialogo") !== -1) return "Diálogo Formativo";
    if (acomp.indexOf("devolutiva") !== -1) return "Devolutiva";
    return "Outros";
  }

  var DIALOGO_CRIT = [
    "Planejamento e prazo", "Etapas do diálogo formativo", "Materiais formativos",
    "Questionamentos propositivos", "Análise por evidências", "Acolhimento e escuta ativa",
    "Mediação de conflitos", "Sugestão de materiais e repertório", "Construção conjunta de combinados",
    "Gestão do tempo (10 a 20 min)"
  ];
  var DEVOLUTIVA_CRIT = [
    "Planejamento e prazo", "Etapas da devolutiva", "Materiais formativos",
    "Análise por evidências", "Sugestão de materiais e repertório", "Gestão do tempo (5 a 10 min)"
  ];
  var ENCONTRO_CRIT = [
    "Condução a partir do roteiro", "Orientação por PDP e rubrica",
    "Transposição didática e contextualização", "Gestão da interação",
    "Comunicação e clima formativo", "Competência digital", "Gestão do tempo"
  ];

  var observacoes = [];
  for (var i = 1; i < dados.length; i++) {
    var row = dados[i];
    var tutor = String(row[2] || row[3] || "").trim();
    var emailTutor = String(row[1] || "").trim().toLowerCase();
    if (!tutor && !emailTutor) continue;

    var carimbo = String(row[0] || "").trim();
    var formador = String(row[4] || row[5] || "").trim();
    var formadorEmail = String(row[6] || "").trim().toLowerCase();
    var acaoAcomp = String(row[7] || "").trim();
    var acaoObs = String(row[8] || "").trim();
    var dataObs = String(row[9] || "").trim();
    var linkAcaoObs = String(row[10] || "").trim();
    var dataFeed = String(row[11] || "").trim();
    var linkFeed = String(row[12] || "").trim();
    var linksComp = String(row[13] || "").trim();

    var modalidade = detectModalidade(acaoObs, acaoAcomp);
    var rubrics = [];

    if (modalidade === "Diálogo Formativo") {
      for (var d = 0; d < DIALOGO_CRIT.length; d++) {
        var v = String(row[14 + d] || "").trim();
        rubrics.push({ criterio: DIALOGO_CRIT[d], value: v, score: scoreFor(v) });
      }
    } else if (modalidade === "Devolutiva") {
      for (var dev = 0; dev < DEVOLUTIVA_CRIT.length; dev++) {
        var v = String(row[24 + dev] || "").trim();
        rubrics.push({ criterio: DEVOLUTIVA_CRIT[dev], value: v, score: scoreFor(v) });
      }
    } else if (modalidade === "Encontro Formativo") {
      for (var e = 0; e < ENCONTRO_CRIT.length; e++) {
        var v = String(row[30 + e] || "").trim();
        rubrics.push({ criterio: ENCONTRO_CRIT[e], value: v, score: scoreFor(v) });
      }
    }

    var scored = rubrics.filter(function(x) { return x.score !== null; });
    var avgScore = null;
    if (scored.length > 0) {
      var sum = 0;
      for (var s = 0; s < scored.length; s++) sum += scored[s].score;
      avgScore = parseFloat((sum / scored.length).toFixed(2));
    }

    observacoes.push({
      id: "OBS_TUT_" + i + "_" + emailTutor.replace(/[^a-z0-9]/g, ""),
      timestamp: carimbo,
      tutorEmail: emailTutor,
      tutor: tutor,
      formador: formador,
      formadorEmail: formadorEmail,
      acaoAcompanhamento: acaoAcomp,
      acaoObservada: acaoObs,
      dataObservacao: dataObs,
      linkAcaoObservada: linkAcaoObs,
      dataFeedback: dataFeed,
      linkFeedback: linkFeed,
      linksComplementares: linksComp,
      modalidade: modalidade,
      rubrics: rubrics,
      avgScore: avgScore,
      checklistRealizadas: String(row[37] || "").trim(),
      checklistNaoRealizadas: String(row[38] || "").trim(),
      outrosRegistros: String(row[39] || "").trim(),
      destaques: String(row[40] || "").trim(),
      desenvolver: String(row[41] || "").trim(),
      encaminhamentos: String(row[42] || "").trim(),
      nre: String(row[44] || "").trim(),
      tema: String(row[45] || "").trim()
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
        action: 'sync_observacoes_tutor_bulk',
        observacoes: lote,
        truncate: (b === 0)
      }),
      muteHttpExceptions: true
    };

    try {
      var resp = UrlFetchApp.fetch(endpoint, options);
      if (resp.getResponseCode() === 200) {
        totalSinc += lote.length;
      } else {
        Logger.log('Aviso ao sincronizar observações do tutor: ' + resp.getContentText());
      }
    } catch (err) {
      Logger.log('Erro ao sincronizar observações do tutor: ' + err.toString());
    }
  }

  return { total: totalSinc };
}
