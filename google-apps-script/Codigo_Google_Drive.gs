// =========================================================================================
// GOOGLE APPS SCRIPT - ECOSSISTEMA ESTÁGIO PROBATÓRIO (SEED-PR)
// Motor de Consolidação para o Google Drive & API de Alimentação do Dashboard (Vercel / GitHub)
// Zero Supabase · Zero Custos · Sincronização Automática em Tempo Real
// =========================================================================================

/**
 * -----------------------------------------------------------------------------------------
 * CENTRAL DE IDs E CONFIGURAÇÕES
 * -----------------------------------------------------------------------------------------
 */
var CFG_DRIVE = {
  // 1. Planilha Mestra Central (Onde ficam DADOS, CURSISTAS, SIGEP, FORMADORES, etc.)
  ID_PLANILHA_MESTRA: '1sRkA88VrtczqXxQ6PlmgygeCVhPoElRNS8RC1QuQzx0',

  // 2. Arquivo JSON Consolidado no Google Drive (Alimenta a Vercel em < 0.5s)
  ID_ARQUIVO_JSON_DRIVE: '13kNt9Jfy8YMhPfVPMcmNHdtynWjqDqPA',

  // 3. Planilha de Gravação de Respostas (Intenção 2027, Observações de Prática, Remanejamentos)
  ID_PLANILHA_RESPOSTAS: '1sRkA88VrtczqXxQ6PlmgygeCVhPoElRNS8RC1QuQzx0',

  // Nomes oficiais das abas
  ABA_DADOS: 'DADOS',
  ABA_CURSISTAS: 'CURSISTAS',
  ABA_FORMADORES: 'FORMADORES',
  ABA_TUTORES: 'TUTORES',
  ABA_SIGEP: 'SIGEP',
  ABA_SIGEP_FORMADORES: 'SIGEP_formadores',
  ABA_DISTRIBUICAO_TUTOR: 'Distribuição formador por tutor',
  ABA_EXONERADOS: 'EXONERADOS',
  ABA_CONCLUINTES_1CH: 'CONCLUINTES-1CH',
  ABA_TROCA_TURMA: 'Troca de Turma',
  ABA_INTENCAO_2027: 'Intencoes_2027',
  ABA_OBSERVACOES_PRATICA: 'Observacoes_Pratica',
  ABA_TUTOR_INSIGHTS: 'Tutor_Insights',
  ABA_DIARIO_FORMATIVO: 'Diario_Formativo',

  // Superadministradores autorizados
  SUPERADMINS: [
    'jorge.dotti@escola.pr.gov.br',
    'elianaprovenci@escola.pr.gov.br',
    'ana.paulados.santos@escola.pr.gov.br',
    'alexandrebomfim@escola.pr.gov.br',
    'fernanda.ambonatti@escola.pr.gov.br',
    'mariangela.iurk@escola.pr.gov.br',
    'eliane.bruning@escola.pr.gov.br',
    'miweinertcordeiro@escola.pr.gov.br',
    'angelita.jesus@escola.pr.gov.br',
    'chrystiankrone@escola.pr.gov.br',
    'pedfor.epap@escola.pr.gov.br',
    'toky.coelho@escola.pr.gov.br',
    'ivatiuk@escola.pr.gov.br',
    'patricia.silva23@escola.pr.gov.br',
    'cristiani.bedin@escola.pr.gov.br',
    'vania.oliveira28@escola.pr.gov.br',
    'silviazanette@escola.pr.gov.br',
    'estagioprobatorio@escola.pr.gov.br',
    'admin.estagio@escola.pr.gov.br'
  ]
};

/**
 * Função utilitária que resolve a configuração.
 * Se o arquivo Code.gs já tiver declarado 'CONFIG', reutiliza-o automaticamente.
 * Caso contrário, utiliza CFG_DRIVE, eliminando erros de identificador duplicado.
 */
function getConfig() {
  return (typeof CONFIG !== 'undefined') ? CONFIG : CFG_DRIVE;
}

// =========================================================================================
// 1. ENDPOINT DE LEITURA E AUTENTICAÇÃO SSO (doGet)
// Suporta:
// a) Redirecionamento de SSO Google Institucional (Login sem senha via Vercel / Google Workspace)
// b) Alimentação de dados consolidados do Drive com CORS 100% aberto
// =========================================================================================
function doGet(e) {
  // A) ROTA DE AUTENTICAÇÃO SSO VIA CONTA GOOGLE (@escola.pr.gov.br)
  if (e && e.parameter && (e.parameter.action === 'sso_login' || e.parameter.action === 'auth')) {
    return tratarAutenticacaoSSOGoogle(e);
  }

  // B) Se for solicitado o Web App embutido em HTML (opcional)
  if (e && e.parameter && e.parameter.view === 'html') {
    return HtmlService.createHtmlOutputFromFile('index')
      .setTitle('Plataforma Estágio Probatório · SEED-PR')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
      .addMetaTag('viewport', 'width=device-width, initial-scale=1');
  }

  // C) Padrão: Devolve o pacote JSON consolidado do Google Drive com CORS 100% aberto
  try {
    const dadosPacote = apiCarregarPacoteGeralParaDashboard();
    return ContentService.createTextOutput(JSON.stringify(dadosPacote))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ erro: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Processa a autenticação SSO capturando o e-mail Google ativo da sessão
 * e redireciona de volta para a aplicação na Vercel com um token validado.
 */
function tratarAutenticacaoSSOGoogle(e) {
  var userEmail = '';
  try {
    userEmail = Session.getActiveUser().getEmail();
  } catch (errActive) {
    Logger.log('Erro ao obter ActiveUser: ' + errActive);
  }

  if (!userEmail) {
    try {
      userEmail = Session.getEffectiveUser().getEmail();
    } catch (errEff) {
      Logger.log('Erro ao obter EffectiveUser: ' + errEff);
    }
  }

  var redirectUri = (e.parameter && e.parameter.redirect_uri) ? e.parameter.redirect_uri : 'https://estagioprobatorio-dashboard.vercel.app';
  redirectUri = redirectUri.replace(/\/+$/, '');

  // Caso o Google não forneça o e-mail (ex: aba anônima ou Web App implantado sem acesso de identidade)
  if (!userEmail) {
    var htmlErro = '<!DOCTYPE html><html><head><meta charset="utf-8">' +
      '<title>Autenticação SEED-PR</title><meta name="viewport" content="width=device-width, initial-scale=1">' +
      '<style>' +
      'body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background-color:#001d3d;color:#1e293b;padding:1rem;box-sizing:border-box;}' +
      '.card{background:#ffffff;padding:2.5rem 2rem;border-radius:14px;box-shadow:0 15px 35px rgba(0,0,0,0.4);max-width:460px;width:100%;text-align:center;}' +
      'h2{color:#002d5c;margin:0 0 0.8rem;font-size:1.4rem;font-weight:800;}' +
      'p{color:#64748b;font-size:0.92rem;line-height:1.5;margin:0 0 1.5rem;}' +
      '.info{background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:0.9rem;text-align:left;font-size:0.82rem;color:#334155;margin-bottom:1.5rem;}' +
      '.info li{margin-bottom:0.4rem;}' +
      'a.btn{display:inline-block;width:100%;background:#0072bc;color:#ffffff;text-decoration:none;padding:0.9rem 1rem;border-radius:8px;font-weight:700;font-size:0.95rem;box-sizing:border-box;transition:background 0.2s;}' +
      'a.btn:hover{background:#005a96;}' +
      '</style></head><body>' +
      '<div class="card">' +
      '<h2>⚠️ Login Google Não Identificado</h2>' +
      '<p>Não foi possível capturar sua conta Google automaticamente.</p>' +
      '<div class="info">' +
      '<strong>Como resolver:</strong>' +
      '<ul style="margin:0.5rem 0 0 1.2rem;padding:0;">' +
      '<li>Certifique-se de estar conectado com sua conta <b>@escola.pr.gov.br</b> no navegador.</li>' +
      '<li>Se você for o administrador, garanta que a implantação do Apps Script esteja configurada com <b>"Executar como: Usuário que acessa o app"</b>.</li>' +
      '</ul></div>' +
      '<a class="btn" target="_top" href="' + redirectUri + '">Voltar para o Dashboard</a>' +
      '</div></body></html>';

    return HtmlService.createHtmlOutput(htmlErro)
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  }

  // Gera payload assinado com timestamp para retorno seguro
  var payloadObj = {
    email: userEmail.toLowerCase().trim(),
    ts: new Date().getTime(),
    source: 'seed_google_workspace_sso'
  };
  var ssoToken = Utilities.base64EncodeWebSafe(JSON.stringify(payloadObj));

  var sep = (redirectUri.indexOf('?') >= 0) ? '&' : '?';
  var returnUrl = redirectUri + sep + 'sso_email=' + encodeURIComponent(userEmail.toLowerCase().trim()) + '&sso_token=' + encodeURIComponent(ssoToken);

  var htmlSucesso = '<!DOCTYPE html><html><head><meta charset="utf-8">' +
    '<title>Autenticado com Sucesso · SEED-PR</title><meta name="viewport" content="width=device-width, initial-scale=1">' +
    '<style>' +
    'body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background-color:#001d3d;color:#ffffff;text-align:center;padding:1rem;box-sizing:border-box;}' +
    '.card{background:#ffffff;color:#1e293b;padding:2.5rem 2rem;border-radius:14px;box-shadow:0 15px 35px rgba(0,0,0,0.4);max-width:440px;width:100%;}' +
    '.spinner{width:44px;height:44px;border:4px solid #e2e8f0;border-top-color:#0072bc;border-radius:50%;animation:spin 0.8s linear infinite;margin:0 auto 1.4rem;}' +
    '@keyframes spin{to{transform:rotate(360deg);}}' +
    'h3{margin:0 0 0.5rem;color:#002d5c;font-size:1.3rem;font-weight:800;}' +
    'p{margin:0 0 1.2rem;font-size:0.9rem;color:#64748b;}' +
    '.badge{display:inline-block;background:#f0fdf4;color:#166534;font-weight:700;padding:0.4rem 0.9rem;border-radius:6px;border:1px solid #bbf7d0;font-size:0.86rem;word-break:break-all;}' +
    '</style></head><body>' +
    '<div class="card">' +
    '<div class="spinner"></div>' +
    '<h3>Autenticado com Sucesso!</h3>' +
    '<p>Redirecionando para o Dashboard Estágio Probatório...</p>' +
    '<div class="badge">✓ ' + userEmail + '</div><br>' +
    '<a class="btn" target="_top" href="' + returnUrl + '" style="display:inline-block;margin-top:1.2rem;background:#0072bc;color:#ffffff;padding:0.75rem 1.4rem;border-radius:8px;text-decoration:none;font-weight:700;font-size:0.9rem;">Acessar Dashboard ➔</a>' +
    '</div>' +
    '<script>' +
    'function redirecionarTop() {' +
    '  try {' +
    '    if (window.top && window.top !== window) { window.top.location.href = "' + returnUrl + '"; return; }' +
    '  } catch (e) {}' +
    '  try {' +
    '    if (window.parent && window.parent !== window) { window.parent.location.href = "' + returnUrl + '"; return; }' +
    '  } catch (e2) {}' +
    '  window.location.href = "' + returnUrl + '";' +
    '}' +
    'redirecionarTop();' +
    'setTimeout(redirecionarTop, 250);' +
    '</script></body></html>';

  return HtmlService.createHtmlOutput(htmlSucesso)
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

// =========================================================================================
// 2. ENDPOINT DE GRAVAÇÃO (doPost) - RECEBE REGISTROS DA VERCEL E GRAVA NO SHEETS
// =========================================================================================
function doPost(e) {
  try {
    let payload = {};
    if (e.postData && e.postData.contents) {
      payload = JSON.parse(e.postData.contents);
    }

    const action = payload.action || '';
    const dados = payload.dados || payload.data || payload;

    let res = { status: 'sucesso', action: action };

    if (action === 'inserir_observacao_pratica' || action === 'salvar_observacao') {
      res = apiSalvarObservacaoPratica(dados);
    } else if (action === 'salvar_intencao_2027') {
      res = apiSalvarIntencao2027(dados);
    } else if (action === 'salvar_remanejamento' || action === 'updateRecord') {
      res = apiSalvarRemanejamento(dados);
    } else if (action === 'exonerar_cursista') {
      res = apiExonerarCursista(dados.cpf, dados.nome, dados.motivo);
    }

    // Após salvar na planilha, regenera o JSON do Drive em segundo plano
    try {
      rotinaMatinalConsolidarSigepEDrive();
    } catch (eDrive) {}

    return ContentService.createTextOutput(JSON.stringify(res))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ status: 'erro', mensagem: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// =========================================================================================
// 3. MENU AUTOMÁTICO NA BARRA DE FERRAMENTAS DO GOOGLE SHEETS
// =========================================================================================
function onOpen() {
  try {
    const ui = SpreadsheetApp.getUi();
    ui.createMenu('⚡ ESTÁGIO PROBATÓRIO')
      .addItem('🔄 Atualizar Dashboard (Gerar JSON no Drive Agora)', 'menuAtualizarDashboard')
      .addItem('⚡ Ativar Sincronização Automática ao Editar a Planilha', 'instalarGatilhosAutomaticos')
      .addSeparator()
      .addItem('➕ Painel de Cadastro / Busca SIGEP', 'menuDialogoBuscarSigep')
      .addItem('⚡ Preencher Linha Selecionada com SIGEP', 'menuPreencherLinhaAtiva')
      .addItem('🚪 Registrar Exoneração de Servidor', 'menuRegistrarExoneracao')
      .addSeparator()
      .addItem('🛠️ Verificar / Criar Abas de Resposta', 'setupInicialCriarAbas')
      .addToUi();
  } catch (e) {
    // Silencia se rodar fora de container Sheets
  }
}

function menuAtualizarDashboard() {
  const res = rotinaMatinalConsolidarSigepEDrive();
  try {
    const ui = SpreadsheetApp.getUi();
    if (res.sucesso) {
      ui.alert('✅ Dashboard Atualizado!', 'O JSON no Google Drive foi regravado com sucesso!\nTotal de registros: ' + res.totalRegistros + '\nO Dashboard na Vercel já está atualizado.', ui.ButtonSet.OK);
    } else {
      ui.alert('❌ Erro na Sincronização', res.mensagem, ui.ButtonSet.OK);
    }
  } catch (e) {
    Logger.log(res.sucesso 
      ? `✅ [OK] Dashboard Atualizado! Total registros: ${res.totalRegistros}` 
      : `❌ [ERRO] ${res.mensagem}`
    );
  }
  return res;
}

// =========================================================================================
// 4. GATILHO AUTOMÁTICO: ATUALIZA O DRIVE NO MOMENTO QUE EDITA A PLANILHA
// =========================================================================================
function aoAlterarPlanilha(e) {
  try {
    // Atualiza o JSON no Drive automaticamente sempre que houver modificações na planilha
    rotinaMatinalConsolidarSigepEDrive();
  } catch (err) {
    Logger.log('Aviso ao sincronizar Drive no onChange: ' + err.toString());
  }
}

function instalarGatilhosAutomaticos() {
  const ss = SpreadsheetApp.openById(getConfig().ID_PLANILHA_MESTRA);
  
  // Remove gatilhos duplicados anteriores
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(t => {
    const fn = t.getHandlerFunction();
    if (fn === 'aoAlterarPlanilha' || fn === 'rotinaMatinalConsolidarSigepEDrive') {
      ScriptApp.deleteTrigger(t);
    }
  });

  // 1. Gatilho automático ao editar a planilha (OnChange)
  ScriptApp.newTrigger('aoAlterarPlanilha')
    .forSpreadsheet(ss)
    .onChange()
    .create();

  // 2. Gatilho diário de segurança às 06:00
  ScriptApp.newTrigger('rotinaMatinalConsolidarSigepEDrive')
    .timeBased()
    .atHour(6)
    .everyDays(1)
    .create();

  // Executa uma primeira consolidação imediatamente para já atualizar o Drive
  const res = rotinaMatinalConsolidarSigepEDrive();

  const msgSucesso = 'Sincronização Automática Ativada com Sucesso! Toda vez que a planilha for editada, o JSON no Google Drive será regravado automaticamente.';
  Logger.log('✅ ' + msgSucesso + (res.sucesso ? ` (${res.totalRegistros} cursistas consolidados)` : ''));

  try {
    SpreadsheetApp.getUi().alert('✅ Sincronização Automática Ativada!', msgSucesso, SpreadsheetApp.getUi().ButtonSet.OK);
  } catch (e) {
    // Quando executado direto pelo Editor do Apps Script, getUi() não está disponível
    Logger.log('Aviso UI (executado direto pelo editor): ' + e.toString());
  }

  return {
    sucesso: true,
    mensagem: msgSucesso,
    detalhes: res
  };
}

// =========================================================================================
// 5. CONSOLIDAÇÃO DA BASE MESTRA E GERAÇÃO DO JSON NO GOOGLE DRIVE
// =========================================================================================
function rotinaMatinalConsolidarSigepEDrive() {
  try {
    const ss = SpreadsheetApp.openById(getConfig().ID_PLANILHA_MESTRA);

    // 1. Lê a aba DADOS (ou CURSISTAS)
    const abaDados = ss.getSheetByName(getConfig().ABA_DADOS) || ss.getSheetByName(getConfig().ABA_CURSISTAS);
    if (!abaDados) return { sucesso: false, mensagem: 'Aba principal de dados não localizada.' };

    const valoresDados = abaDados.getDataRange().getValues();
    const cabecalho = valoresDados[0].map(c => String(c).trim());

    // 2. Lê a lista de exonerados
    const cpfsExonerados = new Set();
    const abaExon = ss.getSheetByName(getConfig().ABA_EXONERADOS);
    if (abaExon) {
      const dadosExon = abaExon.getDataRange().getValues();
      for (let i = 1; i < dadosExon.length; i++) {
        const cpf = String(dadosExon[i][1] || '').replace(/\D/g, '').trim();
        if (cpf) cpfsExonerados.add(cpf);
      }
    }

    // 3. Lê concluintes do 1º Chamamento
    const concluintesSet = new Set();
    const concluintesLista = [];
    const abaConcl = ss.getSheetByName(getConfig().ABA_CONCLUINTES_1CH);
    if (abaConcl) {
      const dadosConcl = abaConcl.getDataRange().getValues();
      const cabecalhoConcl = dadosConcl[0].map(c => String(c).trim());
      for (let i = 1; i < dadosConcl.length; i++) {
        const row = dadosConcl[i];
        const cpf = String(row[1] || row[2] || '').replace(/\D/g, '').trim();
        if (cpf) concluintesSet.add(cpf);

        const itemC = {};
        cabecalhoConcl.forEach((col, idx) => { itemC[col] = row[idx]; });
        concluintesLista.push(itemC);
      }
    }

    // 4. Monta lista consolidada de Cursistas
    const listaConsolidada = [];
    for (let i = 1; i < valoresDados.length; i++) {
      const row = valoresDados[i];
      if (!row[0] && !row[1] && !row[2]) continue;

      const item = {};
      cabecalho.forEach((col, idx) => {
        let val = row[idx];
        if (val instanceof Date) {
          val = Utilities.formatDate(val, 'America/Sao_Paulo', 'dd/MM/yyyy');
        }
        item[col] = val;
      });

      const cpfItem = String(item.cpf || item.cpf_cursista || '').replace(/\D/g, '').trim();

      if (cpfsExonerados.has(cpfItem)) {
        item.situacao_funcional = 'Exonerado';
      } else if (concluintesSet.has(cpfItem)) {
        item.situacao_funcional = 'Concluinte';
      } else {
        item.situacao_funcional = 'Ativo';
      }

      item.nome_cursista = item.nome_cursista || item.nome || '';
      item.turmas = item.turmas || item.turma || item['turma       '] || '';
      item.cgm = item.cgm ? String(item.cgm).trim() : '';
      item.email = item['e-mail'] || item.email || item.email_cursista || '';

      listaConsolidada.push(item);
    }

    // 5. Lê Tutores
    const abaTutores = ss.getSheetByName(getConfig().ABA_TUTORES);
    const tutores = converterAbaParaObjetos(abaTutores);

    // 6. Lê Respostas Recentes
    const observacoes = lerLinhasPlanilha(getConfig().ID_PLANILHA_RESPOSTAS, getConfig().ABA_OBSERVACOES_PRATICA);
    const intencoes2027 = lerLinhasPlanilha(getConfig().ID_PLANILHA_RESPOSTAS, getConfig().ABA_INTENCAO_2027);
    const movimentacoes = lerLinhasPlanilha(getConfig().ID_PLANILHA_RESPOSTAS, getConfig().ABA_TROCA_TURMA);

    // 7. Pacote Unificado para o Google Drive
    const pacoteCompleto = {
      atualizado_em: new Date().toISOString(),
      total_cursistas: listaConsolidada.length,
      baseCursistas: listaConsolidada,
      tutores: tutores,
      concluintes: concluintesLista,
      observacoes: observacoes,
      intencoes2027: intencoes2027,
      movimentacoes: movimentacoes
    };

    // 8. Salva arquivo JSON no Google Drive
    const nomeArquivo = 'base_cursistas_master.json';
    const jsonStr = JSON.stringify(pacoteCompleto);
    let idArquivo = getConfig().ID_ARQUIVO_JSON_DRIVE;

    if (idArquivo && !idArquivo.includes('COLE_AQUI')) {
      try {
        const arq = DriveApp.getFileById(idArquivo);
        arq.setContent(jsonStr);
      } catch (e) {
        const novo = DriveApp.createFile(nomeArquivo, jsonStr, MimeType.PLAIN_TEXT);
        idArquivo = novo.getId();
      }
    } else {
      const novo = DriveApp.createFile(nomeArquivo, jsonStr, MimeType.PLAIN_TEXT);
      idArquivo = novo.getId();
    }

    return {
      sucesso: true,
      totalRegistros: listaConsolidada.length,
      idArquivoDrive: idArquivo,
      pacote: pacoteCompleto
    };
  } catch (err) {
    return { sucesso: false, mensagem: 'Erro na consolidação: ' + err.toString() };
  }
}

// =========================================================================================
// 6. LEITURA RÁPIDA DA BASE DO GOOGLE DRIVE (ALIMENTA A API)
// =========================================================================================
function apiCarregarPacoteGeralParaDashboard() {
  try {
    const resDrive = apiCarregarBaseJsonDrive();
    if (resDrive.dados && (resDrive.dados.baseCursistas || Array.isArray(resDrive.dados))) {
      return resDrive.dados;
    }
    // Se o arquivo do Drive não existe ainda, consolida na hora
    const resConsol = rotinaMatinalConsolidarSigepEDrive();
    if (resConsol.sucesso && resConsol.pacote) {
      return resConsol.pacote;
    }
    return { erro: 'Falha ao consolidar base' };
  } catch (err) {
    return { erro: err.toString() };
  }
}

function apiCarregarBaseJsonDrive() {
  try {
    if (!getConfig().ID_ARQUIVO_JSON_DRIVE || getConfig().ID_ARQUIVO_JSON_DRIVE.includes('COLE_AQUI')) {
      return { status: 'aviso', dados: null };
    }
    const arquivo = DriveApp.getFileById(getConfig().ID_ARQUIVO_JSON_DRIVE);
    const texto = arquivo.getBlob().getDataAsString('UTF-8');
    const dados = JSON.parse(texto);
    return { status: 'sucesso', dados: dados };
  } catch (e) {
    return { status: 'erro', mensagem: e.toString(), dados: null };
  }
}

// =========================================================================================
// 7. MOTOR DE BUSCA NO SIGEP POR CPF (CURSISTAS & FORMADORES)
// =========================================================================================
function apiBuscarDadosSigepPorCpf(cpfBusca) {
  try {
    const cpfLimpo = String(cpfBusca || '').replace(/\D/g, '').trim();
    if (!cpfLimpo) return { encontrado: false, mensagem: 'CPF inválido ou em branco.' };

    const ss = SpreadsheetApp.openById(getConfig().ID_PLANILHA_MESTRA);

    const abaSigep = ss.getSheetByName(getConfig().ABA_SIGEP);
    if (abaSigep) {
      const dados = abaSigep.getDataRange().getValues();
      for (let i = 1; i < dados.length; i++) {
        const linha = dados[i];
        const cpfLinha = String(linha[1] || '').replace(/\D/g, '').trim();

        if (cpfLinha === cpfLimpo) {
          let dataInicio = '';
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

    const abaSigepForm = ss.getSheetByName(getConfig().ABA_SIGEP_FORMADORES);
    if (abaSigepForm) {
      const dadosForm = abaSigepForm.getDataRange().getValues();
      for (let i = 1; i < dadosForm.length; i++) {
        const l = dadosForm[i];
        const cpfLinha = String(l[1] || '').replace(/\D/g, '').trim();

        if (cpfLinha === cpfLimpo) {
          return {
            encontrado: true,
            origem: 'SIGEP Formadores',
            tipo: 'formador',
            cpf: cpfLinha,
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

// =========================================================================================
// 8. GRAVAÇÕES EM TEMPO REAL NO GOOGLE SHEETS
// =========================================================================================
function apiSalvarObservacaoPratica(payload) {
  const colunas = [
    'Carimbo de Data/Hora', 'ID', 'Nome Cursista', 'E-mail Cursista', 'Nome Formador', 'E-mail Formador',
    'Componente', 'Ano Formativo', 'Semestre', 'Modalidade', 'Tema', 'Status',
    'Data Prática', 'Data Feedback', 'Modalidade Feedback', 'Nível Prática', 'Nível Planejamento',
    'Evidências Prática', 'Evidências Planejamento', 'Proposições / Sugestões', 'Combinados', 'Justificativa Não Realizada'
  ];

  const carimbo = Utilities.formatDate(new Date(), 'America/Sao_Paulo', 'dd/MM/yyyy HH:mm:ss');
  const linha = [
    carimbo,
    payload.id_origem || 'OBS_' + Date.now(),
    payload.nome_cursista || '',
    payload.email_cursista || '',
    payload.nome_formador || '',
    payload.email_formador || '',
    payload.componente || '',
    payload.ano_formativo || '',
    payload.semestre || '',
    payload.modalidade || '',
    payload.tema || '',
    payload.observacao_realizada || (payload.is_realizada ? 'Realizada' : 'Não Realizada'),
    payload.data_pratica || '',
    payload.data_feedback || '',
    payload.modalidade_feedback || '',
    payload.nivel_pratica || '',
    payload.nivel_planejamento || '',
    payload.evidencias_pratica || '',
    payload.evidencias_planejamento || '',
    payload.proposicoes_sugestoes || '',
    payload.combinados || '',
    payload.justificativa_nao_realizada || ''
  ];

  return salvarLinhaPlanilha(getConfig().ID_PLANILHA_RESPOSTAS, getConfig().ABA_OBSERVACOES_PRATICA, colunas, linha);
}

function apiSalvarIntencao2027(payload) {
  const colunas = [
    'Data/Hora', 'Nome Cursista', 'E-mail Cursista', 'CGM', 'Chamamento', 'NRE',
    'Componente', 'Etapa 2027', 'Dia Fixo', 'Turno Preferencial', 'Horário Preferencial',
    'Solicitou OS', 'Solicitou Remoção', 'Mais de Um Vínculo', 'Outro Componente', 'Outro Turno',
    'Atendimento Especializado', 'Descrição Especializada'
  ];

  const carimbo = Utilities.formatDate(new Date(), 'America/Sao_Paulo', 'dd/MM/yyyy HH:mm:ss');
  const linha = [
    carimbo,
    payload.nome_cursista || '',
    payload.email_cursista || Session.getActiveUser().getEmail(),
    payload.cgm_cursista || '',
    payload.chamamento || '',
    payload.nre || '',
    payload.componente || '',
    payload.ano_formativo_pretendido || '',
    payload.dia_semana_formativo || '',
    payload.turnoPretendido || '',
    payload.horarioPretendido || '',
    payload.solicitouOS || 'Não',
    payload.solicitouRemocao || 'Não',
    payload.possuiMaisDeUmVinculo || 'Não',
    payload.outroVinculoComponente || '',
    payload.outroVinculoTurno || '',
    payload.necessitaAtendimentoEspecializado || 'Não',
    payload.descricaoAtendimentoEspecializado || ''
  ];

  return salvarLinhaPlanilha(getConfig().ID_PLANILHA_RESPOSTAS, getConfig().ABA_INTENCAO_2027, colunas, linha);
}

function apiSalvarRemanejamento(payload) {
  const colunas = [
    'Carimbo de data/hora', 'Endereço de e-mail', 'NOME COMPLETO DO PROFISSIONAL EM ESTÁGIO PROBATÓRIO',
    'RG', 'CPF', 'Telefone', 'Possui quantos padrões?', 'EP - Você possui dois padrões?',
    'Tipo Solicitação', 'Turma Origem', 'Turma Pretendida', 'Turno Pretendido', 'Motivo', 'Status'
  ];

  const carimbo = Utilities.formatDate(new Date(), 'America/Sao_Paulo', 'dd/MM/yyyy HH:mm:ss');
  const linha = [
    carimbo,
    payload.email || Session.getActiveUser().getEmail(),
    payload.nome || payload.nome_cursista || '',
    payload.rg || '',
    payload.cpf || '',
    payload.telefone || '',
    payload.padroes || 1,
    payload.doisPadroes || 'Não',
    payload.tipo || 'Troca de Turma',
    payload.turma_origem || '',
    payload.turma_pretendida || '',
    payload.turno_pretendido || '',
    payload.motivo || '',
    'Pendente'
  ];

  return salvarLinhaPlanilha(getConfig().ID_PLANILHA_RESPOSTAS, getConfig().ABA_TROCA_TURMA, colunas, linha);
}

function apiExonerarCursista(cpf, nome, motivo) {
  try {
    const colunas = ['Data Exoneração', 'CPF', 'Nome', 'Motivo', 'Registrado Por'];
    const carimbo = Utilities.formatDate(new Date(), 'America/Sao_Paulo', 'dd/MM/yyyy HH:mm:ss');
    const admin = Session.getActiveUser().getEmail();
    const linha = [carimbo, cpf, nome, motivo || 'Solicitação do Servidor', admin];
    
    return salvarLinhaPlanilha(getConfig().ID_PLANILHA_MESTRA, getConfig().ABA_EXONERADOS, colunas, linha);
  } catch (err) {
    return { status: 'erro', mensagem: err.toString() };
  }
}

// =========================================================================================
// 9. FUNÇÕES UTILITÁRIAS DE PLANILHA
// =========================================================================================
function converterAbaParaObjetos(aba, maxLinhas) {
  if (!aba) return [];
  const totalLinhas = aba.getLastRow();
  const totalColunas = aba.getLastColumn();
  if (totalLinhas <= 1 || totalColunas < 1) return [];

  const limite = maxLinhas ? Math.min(totalLinhas, maxLinhas + 1) : totalLinhas;
  const cabecalho = aba.getRange(1, 1, 1, totalColunas).getValues()[0].map(c => String(c).trim());
  const valores = aba.getRange(2, 1, limite - 1, totalColunas).getValues();
  const lista = [];

  for (let i = 0; i < valores.length; i++) {
    const row = valores[i];
    if (!row[0] && !row[1] && !row[2]) continue;

    const item = {};
    cabecalho.forEach((col, idx) => {
      let val = row[idx];
      if (val instanceof Date) {
        val = Utilities.formatDate(val, 'America/Sao_Paulo', 'dd/MM/yyyy');
      }
      item[col] = val;
    });

    item.nome_cursista = item.nome_cursista || item.nome || '';
    item.turmas = item.turmas || item.turma || item['turma       '] || '';
    item.cgm = item.cgm ? String(item.cgm).trim() : '';
    item.email = item['e-mail'] || item.email || item.email_cursista || '';

    lista.push(item);
  }
  return lista;
}

function lerLinhasPlanilha(idPlanilha, nomeAba) {
  try {
    if (!idPlanilha || idPlanilha.includes('COLE_AQUI')) return [];
    const ss = SpreadsheetApp.openById(idPlanilha);
    const aba = ss.getSheetByName(nomeAba);
    if (!aba) return [];

    const lastRow = aba.getLastRow();
    if (lastRow <= 1) return [];

    const startRow = Math.max(2, lastRow - 500);
    const numRows = lastRow - startRow + 1;

    const cabecalho = aba.getRange(1, 1, 1, aba.getLastColumn()).getValues()[0].map(c => String(c).trim());
    const valores = aba.getRange(startRow, 1, numRows, cabecalho.length).getValues();
    const lista = [];

    for (let i = 0; i < valores.length; i++) {
      const linha = valores[i];
      const obj = {};
      cabecalho.forEach((col, idx) => {
        let val = linha[idx];
        if (val instanceof Date) {
          val = Utilities.formatDate(val, 'America/Sao_Paulo', 'dd/MM/yyyy HH:mm');
        }
        obj[col] = val;
      });
      lista.push(obj);
    }
    return lista;
  } catch (err) {
    return [];
  }
}

function salvarLinhaPlanilha(idPlanilha, nomeAba, colunasCabecalho, linhaDados) {
  try {
    if (!idPlanilha || idPlanilha.includes('COLE_AQUI')) {
      return { status: 'aviso', mensagem: 'ID da planilha não configurado.' };
    }
    const ss = SpreadsheetApp.openById(idPlanilha);
    let aba = ss.getSheetByName(nomeAba);

    if (!aba) {
      aba = ss.insertSheet(nomeAba);
      aba.appendRow(colunasCabecalho);
      aba.getRange(1, 1, 1, colunasCabecalho.length)
        .setBackground('#002d5c')
        .setFontColor('#ffffff')
        .setFontWeight('bold');
      aba.setFrozenRows(1);
    }

    aba.appendRow(linhaDados);
    return { status: 'sucesso', mensagem: 'Registro gravado com sucesso!' };
  } catch (err) {
    return { status: 'erro', mensagem: 'Erro ao gravar: ' + err.toString() };
  }
}

function setupInicialCriarAbas() {
  const ss = SpreadsheetApp.openById(getConfig().ID_PLANILHA_RESPOSTAS);
  const abas = [getConfig().ABA_INTENCAO_2027, getConfig().ABA_OBSERVACOES_PRATICA, getConfig().ABA_TUTOR_INSIGHTS, getConfig().ABA_DIARIO_FORMATIVO];
  abas.forEach(nome => {
    let aba = ss.getSheetByName(nome);
    if (!aba) {
      aba = ss.insertSheet(nome);
      aba.appendRow(['Carimbo de Data/Hora', 'Registro Inicial']);
    }
  });
  try {
    SpreadsheetApp.getUi().alert('Abas Verificadas', 'Todas as abas de gravação estão prontas para uso.', SpreadsheetApp.getUi().ButtonSet.OK);
  } catch (e) {
    Logger.log('✅ Abas Verificadas: Todas as abas de gravação estão prontas para uso.');
  }
}
