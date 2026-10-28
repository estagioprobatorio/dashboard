/**
 * =========================================================================================
 * GOOGLE APPS SCRIPT: SINCRONIZAÇÃO AUTOMÁTICA PLANILHAS GOOGLE ➔ TiDB CLOUD (SERVERLESS)
 * Plataforma do Estágio Probatório - SEED/PR
 * =========================================================================================
 *
 * Como ativar a sincronização diária às 07:00 da manhã:
 * 1. Abra sua Planilha Mestra do Google (ou acesse https://script.google.com/)
 * 2. Acesse: Extensões ➔ Apps Script
 * 3. Cole o código deste arquivo (crie um arquivo chamado 'SincronizarTiDB.gs')
 * 4. Altere a variável VERCEL_URL com o endereço do seu dashboard na Vercel:
 *    Exemplo: const VERCEL_URL = "https://seu-dashboard.vercel.app";
 * 5. Selecione a função 'configurarGatilhoDiario7h' e clique em 'Executar'.
 *
 * Pronto! Todos os dias às 07:00 da manhã o Google Apps Script rodará nos servidores do Google,
 * lerá as abas atualizadas e carregará o banco de dados TiDB Cloud automaticamente.
 * =========================================================================================
 */

// URL do seu Dashboard na Vercel (onde está a API /api/tidb)
const VERCEL_URL = "https://dashboard-tawny-delta-96.vercel.app";

// ID da Planilha Mestra Central
const SPREADSHEET_ID_MESTRA = "1sRkA88VrtczqXxQ6PlmgygeCVhPoElRNS8RC1QuQzx0";

function obterPlanilhaMestra() {
  try {
    const ativa = SpreadsheetApp.getActiveSpreadsheet();
    if (ativa) return ativa;
  } catch (e) {}
  return SpreadsheetApp.openById(SPREADSHEET_ID_MESTRA);
}

/**
 * -----------------------------------------------------------------------------------------
 * 1. CONFIGURADOR DO GATILHO MATINAL DAS 07:00 (HORÁRIO DE BRASÍLIA)
 * -----------------------------------------------------------------------------------------
 */
function configurarGatilhoDiario7h() {
  // Remove gatilhos anteriores da mesma função para evitar duplicidades
  const triggers = ScriptApp.getProjectTriggers();
  for (let i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === 'executarSincronizacaoCompletaTiDB') {
      ScriptApp.deleteTrigger(triggers[i]);
    }
  }

  // Cria o novo gatilho diário às 07:00 da manhã
  ScriptApp.newTrigger('executarSincronizacaoCompletaTiDB')
    .timeBased()
    .atHour(7)
    .everyDays(1)
    .inTimezone('America/Sao_Paulo')
    .create();

  const msg = '✓ Gatilho automático configurado com sucesso! A atualização das planilhas para o TiDB será executada diariamente às 07:00.';
  Logger.log(msg);
  try {
    SpreadsheetApp.getUi().alert('Agendamento Concluído', msg, SpreadsheetApp.getUi().ButtonSet.OK);
  } catch (e) {}
}

/**
 * -----------------------------------------------------------------------------------------
 * 2. EXECUÇÃO DA SINCRONIZAÇÃO COMPLETA (RODA AUTOMATICAMENTE ÀS 7H OU MANUALMENTE)
 * -----------------------------------------------------------------------------------------
 */
function executarSincronizacaoCompletaTiDB() {
  Logger.log('Iniciando sincronização matinal das planilhas com o TiDB Cloud...');
  
  const resCursistas = sincronizarAbaDadosParaTiDB();
  Logger.log('Resultado Cursistas: ' + JSON.stringify(resCursistas));

  const resObservacoes = sincronizarAbaObservacoesParaTiDB();
  Logger.log('Resultado Observações: ' + JSON.stringify(resObservacoes));

  Logger.log('Sincronização matinal concluída!');
}

/**
 * 3. Sincroniza a aba DADOS (Cursistas)
 */
function sincronizarAbaDadosParaTiDB() {
  const ss = obterPlanilhaMestra();
  const aba = ss.getSheetByName("DADOS") || ss.getSheetByName("CURSISTAS") || ss.getSheets()[0];
  if (!aba) return { status: 'erro', mensagem: 'Aba DADOS não encontrada.' };

  const dados = aba.getDataRange().getValues();
  if (dados.length < 2) return { status: 'vazio' };

  const cabecalho = dados[0].map(c => String(c || "").trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""));

  function getIdx(keywords) {
    for (let kw of keywords) {
      let idx = cabecalho.indexOf(kw.toLowerCase());
      if (idx !== -1) return idx;
    }
    for (let kw of keywords) {
      let idx = cabecalho.findIndex(c => c.includes(kw.toLowerCase()));
      if (idx !== -1) return idx;
    }
    return -1;
  }

  const idxCgm = getIdx(["cgm"]);
  const idxNome = getIdx(["nome cursista", "nome do cursista", "cursista", "nome"]);
  const idxEmail = getIdx(["e-mail", "email cursista", "email"]);
  const idxCpf = getIdx(["cpf cursista", "cpf"]);
  const idxTurma = getIdx(["turmas", "turma"]);
  const idxModalidade = getIdx(["modalidade"]);
  const idxComponente = getIdx(["componente"]);
  const idxDiaSemana = getIdx(["dia da semana", "dia_da_semana"]);
  const idxTurno = getIdx(["turno"]);
  const idxFormador = getIdx(["nome formador", "formador"]);
  const idxEmailFormador = getIdx(["e-mail formador", "email formador"]);
  const idxTutor = getIdx(["tutor responsavel", "tutor"]);
  const idxEmailTutor = getIdx(["e-mail tutor", "email tutor"]);

  const cursistas = [];
  for (let i = 1; i < dados.length; i++) {
    const row = dados[i];
    const nome = idxNome !== -1 ? String(row[idxNome] || "").trim() : "";
    if (!nome) continue;

    const cgm = idxCgm !== -1 ? String(row[idxCgm] || "").trim() : "";
    const turmas = idxTurma !== -1 ? String(row[idxTurma] || "").trim() : "";
    const cod = cgm ? `${cgm}_${turmas}` : `CURS_${i}`;

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

  // Envia em lotes de 200 para a API TiDB da Vercel
  const BATCH_SIZE = 200;
  let totalSinc = 0;
  for (let i = 0; i < cursistas.length; i += BATCH_SIZE) {
    const lote = cursistas.slice(i, i + BATCH_SIZE);
    const endpoint = VERCEL_URL.replace(/\/$/, '') + '/api/tidb';
    
    const options = {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify({
        action: 'sync_cursistas_bulk',
        cursistas: lote
      }),
      muteHttpExceptions: true
    };

    try {
      const resp = UrlFetchApp.fetch(endpoint, options);
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
 * 4. Sincroniza a aba Observações de Prática
 */
function sincronizarAbaObservacoesParaTiDB() {
  const ss = obterPlanilhaMestra();
  const nomesObs = ["Observações de Prática", "Observacoes_Pratica", "OBSERVACOES", "Observações"];
  let aba = null;
  for (let nome of nomesObs) {
    aba = ss.getSheetByName(nome);
    if (aba) break;
  }
  if (!aba) return { status: 'nao_encontrada' };

  const dados = aba.getDataRange().getValues();
  if (dados.length < 2) return { status: 'vazio' };

  const cabecalho = dados[0].map(c => String(c || "").trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""));

  function getIdx(keywords) {
    for (let kw of keywords) {
      let idx = cabecalho.indexOf(kw.toLowerCase());
      if (idx !== -1) return idx;
    }
    for (let kw of keywords) {
      let idx = cabecalho.findIndex(c => c.includes(kw.toLowerCase()));
      if (idx !== -1) return idx;
    }
    return -1;
  }

  const idxCarimbo = getIdx(["carimbo", "data e hora", "timestamp"]);
  const idxEmailCursista = getIdx(["e-mail cursista", "email cursista", "email"]);
  const idxNomeCursista = getIdx(["nome cursista", "cursista"]);
  const idxEmailFormador = getIdx(["e-mail formador", "email formador"]);
  const idxNomeFormador = getIdx(["nome formador", "formador"]);
  const idxTema = getIdx(["tema"]);
  const idxDataPratica = getIdx(["data pratica", "data da pratica", "data implementacao"]);
  const idxDataFeedback = getIdx(["data feedback", "data do feedback"]);
  const idxNivelPlan = getIdx(["nivel planejamento", "planejamento"]);
  const idxNivelPratica = getIdx(["nivel pratica", "pratica"]);

  const observacoes = [];
  for (let i = 1; i < dados.length; i++) {
    const row = dados[i];
    const emailCursista = idxEmailCursista !== -1 ? String(row[idxEmailCursista] || "").trim() : "";
    if (!emailCursista) continue;

    const carimbo = idxCarimbo !== -1 ? String(row[idxCarimbo] || "").trim() : "";
    const idOrig = `OBS_PLAN_${i}_${carimbo.replace(/\D/g, '')}`;

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

  // Envia em lotes de 200 para a API TiDB da Vercel
  const BATCH_SIZE = 200;
  let totalSinc = 0;
  for (let i = 0; i < observacoes.length; i += BATCH_SIZE) {
    const lote = observacoes.slice(i, i + BATCH_SIZE);
    const endpoint = VERCEL_URL.replace(/\/$/, '') + '/api/tidb';

    const options = {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify({
        action: 'sync_observacoes_bulk',
        observacoes: lote
      }),
      muteHttpExceptions: true
    };

    try {
      const resp = UrlFetchApp.fetch(endpoint, options);
      if (resp.getResponseCode() === 200) {
        totalSinc += lote.length;
      }
    } catch (err) {
      Logger.log('Erro de envio observações: ' + err.toString());
    }
  }

  return { total: totalSinc };
}
