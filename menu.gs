// =========================================================================================
// GOOGLE APPS SCRIPT - MENU CENTRAL UNIFICADO (SEED-PR)
// Gestão do Estágio Probatório, Integrações SIGEP, Remanejamento e Banco TiDB Cloud
// =========================================================================================

// IDs Oficiais das Planilhas do Google Sheets (SEED-PR)
var SPREADSHEET_ID_MESTRA_TIDB = "1sRkA88VrtczqXxQ6PlmgygeCVhPoElRNS8RC1QuQzx0";

/**
 * Helper global e resiliente para obter a planilha mestra ativa ou por ID
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

/**
 * -----------------------------------------------------------------------------------------
 * 1. GATILHO AUTOMÁTICO DE ABERTURA DA PLANILHA (onOpen)
 * Centraliza e constrói todos os menus na barra de ferramentas do Google Sheets.
 * -----------------------------------------------------------------------------------------
 */
function onOpen() {
  try {
    const ui = SpreadsheetApp.getUi();

    // Menu 1: Operações Gerais do Estágio Probatório & SIGEP
    ui.createMenu('⚡ ESTÁGIO PROBATÓRIO')
      .addItem('🔄 Atualizar Dashboard (Gerar JSON no Drive Agora)', 'menuAtualizarDashboard')
      .addItem('⚡ Ativar Sincronização Automática ao Editar a Planilha', 'instalarGatilhosAutomaticos')
      .addSeparator()
      .addItem('🔍 Painel de Busca no SIGEP (Cursistas / Formadores)', 'menuDialogoBuscarSigep')
      .addItem('⚡ Preencher Linha Selecionada com Dados SIGEP', 'menuPreencherLinhaAtiva')
      .addItem('🚪 Registrar Exoneração de Servidor', 'menuRegistrarExoneracao')
      .addSeparator()
      .addItem('📧 Gerador de E-mails aos Cursistas', 'menuAbrirGeradorEmails')
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
    // Silencia caso executado fora de container Sheets (modo headless/triggers de API)
    Logger.log('Aviso onOpen: ' + e.toString());
  }
}

/**
 * -----------------------------------------------------------------------------------------
 * 2. FUNÇÕES DO MENU: BUSCA E INTEGRAÇÃO COM O SIGEP
 * -----------------------------------------------------------------------------------------
 */

/**
 * Abre um diálogo visual moderno para consultar dados de qualquer Cursista ou Formador no SIGEP.
 */
function menuDialogoBuscarSigep() {
  const ui = SpreadsheetApp.getUi();
  const htmlContent = `
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
  const htmlOutput = HtmlService.createHtmlOutput(htmlContent).setWidth(520).setHeight(480);
  ui.showModalDialog(htmlOutput, 'Busca Oficial no SIGEP · SEED-PR');
}

/**
 * Preenche automaticamente campos vazios da linha selecionada na planilha ativa com dados do SIGEP.
 */
function menuPreencherLinhaAtiva() {
  const ui = SpreadsheetApp.getUi();
  try {
    const sheet = SpreadsheetApp.getActiveSheet();
    const activeRange = sheet.getActiveRange();
    if (!activeRange) {
      ui.alert('Atenção', 'Selecione uma linha ou célula contendo o CPF para preencher.', ui.ButtonSet.OK);
      return;
    }

    const row = activeRange.getRow();
    if (row === 1) {
      ui.alert('Atenção', 'Você está selecionando a linha de cabeçalho. Selecione uma linha de dados.', ui.ButtonSet.OK);
      return;
    }

    const lastCol = sheet.getLastColumn();
    const headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0].map(h => String(h).trim().toLowerCase());
    const rowValues = sheet.getRange(row, 1, 1, lastCol).getValues()[0];

    // Localiza a coluna do CPF
    let colCpfIdx = headers.findIndex(h => h === 'cpf' || h.indexOf('cpf') !== -1);
    let cpfValor = '';

    if (colCpfIdx !== -1 && rowValues[colCpfIdx]) {
      cpfValor = String(rowValues[colCpfIdx]).replace(/\D/g, '').trim();
    }

    // Se não encontrou na coluna, tenta ler da célula selecionada diretamente
    if (!cpfValor) {
      const valSel = String(activeRange.getValue() || '').replace(/\D/g, '').trim();
      if (valSel.length === 11) {
        cpfValor = valSel;
      }
    }

    // Se ainda não tem CPF, solicita ao usuário
    if (!cpfValor) {
      const prompt = ui.prompt('Preenchimento SIGEP', 'Informe o CPF do cursista/servidor a preencher nesta linha:', ui.ButtonSet.OK_CANCEL);
      if (prompt.getSelectedButton() !== ui.Button.OK) return;
      cpfValor = String(prompt.getResponseText() || '').replace(/\D/g, '').trim();
    }

    if (!cpfValor) {
      ui.alert('CPF não informado.');
      return;
    }

    const dadosSigep = apiBuscarDadosSigepPorCpf(cpfValor);
    if (!dadosSigep || !dadosSigep.encontrado) {
      ui.alert('Não localizado', 'O CPF ' + cpfValor + ' não foi localizado nas abas SIGEP da planilha.', ui.ButtonSet.OK);
      return;
    }

    // Mapeamento de colunas da planilha para dados do SIGEP
    const mapaCampos = {
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

    let camposPreenchidos = 0;
    headers.forEach((h, idx) => {
      if (mapaCampos[h] !== undefined && (rowValues[idx] === '' || rowValues[idx] === null)) {
        sheet.getRange(row, idx + 1).setValue(mapaCampos[h]);
        camposPreenchidos++;
      }
    });

    // Se a coluna de CPF estiver em branco na linha, preenche também
    if (colCpfIdx !== -1 && (!rowValues[colCpfIdx] || String(rowValues[colCpfIdx]).trim() === '')) {
      sheet.getRange(row, colCpfIdx + 1).setValue(cpfValor);
    }

    SpreadsheetApp.getActiveSpreadsheet().toast('Linha ' + row + ' atualizada (' + camposPreenchidos + ' campos preenchidos)', '✅ SIGEP Integrado');
  } catch (err) {
    ui.alert('Erro ao preencher linha', err.toString(), ui.ButtonSet.OK);
  }
}

/**
 * Registra a exoneração de um cursista/servidor, salva na aba EXONERADOS e regrava o JSON do Drive.
 */
function menuRegistrarExoneracao() {
  const ui = SpreadsheetApp.getUi();
  try {
    const promptCpf = ui.prompt('Registrar Exoneração', 'Informe o CPF do servidor a ser exonerado:', ui.ButtonSet.OK_CANCEL);
    if (promptCpf.getSelectedButton() !== ui.Button.OK) return;

    const cpf = String(promptCpf.getResponseText() || '').replace(/\D/g, '').trim();
    if (!cpf) {
      ui.alert('CPF inválido.');
      return;
    }

    // Busca o nome do servidor no SIGEP para conferência
    const busca = apiBuscarDadosSigepPorCpf(cpf);
    const nomePadrao = (busca && busca.encontrado) ? busca.nome : '';

    const promptNome = ui.prompt(
      'Confirmar Nome do Servidor',
      'Confirme ou informe o nome completo do servidor:\n(CPF: ' + cpf + ')',
      ui.ButtonSet.OK_CANCEL
    );
    if (promptNome.getSelectedButton() !== ui.Button.OK) return;
    const nome = String(promptNome.getResponseText() || nomePadrao).trim();

    const promptMotivo = ui.prompt(
      'Motivo da Exoneração',
      'Informe o motivo da exoneração (ou deixe padrão):',
      ui.ButtonSet.OK_CANCEL
    );
    if (promptMotivo.getSelectedButton() !== ui.Button.OK) return;
    const motivo = String(promptMotivo.getResponseText() || 'Solicitação do Servidor').trim();

    const conf = ui.alert(
      'Confirmar Exoneração',
      'Deseja realmente registrar a exoneração de:\n\n' +
      'Nome: ' + nome + '\n' +
      'CPF: ' + cpf + '\n' +
      'Motivo: ' + motivo + '\n\n' +
      'O registro será gravado na aba EXONERADOS e a base sincronizada.',
      ui.ButtonSet.YES_NO
    );
    if (conf !== ui.Button.YES) return;

    const res = apiExonerarCursista(cpf, nome, motivo);
    if (res.status === 'sucesso') {
      // Atualiza imediatamente a base do Drive e do TiDB
      if (typeof executarSincronizacaoCompletaTiDB === 'function') {
        try { executarSincronizacaoCompletaTiDB(); } catch (e) {}
      }
      if (typeof rotinaMatinalConsolidarSigepEDrive === 'function') {
        try { rotinaMatinalConsolidarSigepEDrive(); } catch (e) {}
      }
      ui.alert('✅ Exoneração Registrada!', 'O servidor ' + nome + ' foi registrado como Exonerado com sucesso.', ui.ButtonSet.OK);
    } else {
      ui.alert('❌ Erro ao Registrar', res.mensagem || 'Falha desconhecida.', ui.ButtonSet.OK);
    }
  } catch (err) {
    ui.alert('Erro ao registrar exoneração', err.toString(), ui.ButtonSet.OK);
  }
}

/**
 * -----------------------------------------------------------------------------------------
 * 3. DIÁLOGO EXPLICATIVO DAS DIRETRIZES DO REMANEJAMENTO
 * -----------------------------------------------------------------------------------------
 */
function menuSobreRemanejamento() {
  const ui = SpreadsheetApp.getUi();
  const msg =
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

// =========================================================================================
// MÓDULO INTEGRADO: SINCRONIZAÇÃO COM O BANCO TIDB CLOUD SERVERLESS
// =========================================================================================

// URL do Gateway na Vercel
var VERCEL_APP_URL = "https://dashboard-tawny-delta-96.vercel.app";

// IDs Oficiais das Planilhas do Google Sheets (SEED-PR)
var SPREADSHEET_ID_MESTRA_TIDB = "1sRkA88VrtczqXxQ6PlmgygeCVhPoElRNS8RC1QuQzx0";

// Observações da Prática Pedagógica - 1º SEMESTRE
var ID_PLANILHA_OBS_1ANO_1SEM = "1KmbMvNOTpj4OaDOdKw5mPVI3iqbo8RbQBqBktM84ToE";
var ID_PLANILHA_OBS_2e3ANO_1SEM = "1zSnlh7aW8df800lP90rCLVxiHNWAa1f9IGjz2OoDfvU";

// Observações da Prática Pedagógica - 2º SEMESTRE
var ID_PLANILHA_OBS_1ANO_2SEM = "1dL_Q-_15Idx3SNAZOqmKzrnVqA8tHFBzILA5PZ7p798";
var ID_PLANILHA_OBS_2e3ANO_2SEM = "1uv5QWeqtN5iMkH8nVQUvsYKClv9NaGDHgsdT_D-RPiw";

// Compilado Geral das Observações (Histórico 2024 a 2026)
var ID_PLANILHA_OBS_COMPILADO_2024_2026 = "1IounMidMLxawnYaSGTgrhWJk0DbKrbNWH2YmuONDvVQ";

// Observações do Tutor (Acompanhamento aos Formadores)
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
    .replace(/^NRE\s*(DE|DO|DA)?\s*[-:]?\s*/, '')
    .replace(/[.\-_/]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!s) return '';
  if (s === 'AMN' || /METROP\w*\s*NORTE/.test(s)) return 'AREA METROPOLITANA NORTE';
  if (s === 'AMS' || /METROP\w*\s*SUL/.test(s)) return 'AREA METROPOLITANA SUL';
  if (/^ASSIS\s*CHAT/.test(s)) return 'ASSIS CHATEAUBRIAND';
  if (s === 'FOZ') return 'FOZ DO IGUACU';
  if (s === 'FRANCISCO BELTRAO' || s === 'BELTRAO') return 'FRANCISCO BELTRAO';
  if (s === 'UNIAO DA VITORIA' || s === 'UNIAO') return 'UNIAO DA VITORIA';
  if (s === 'WENCESLAU BRAZ' || s === 'WENCESLAU') return 'WENCESLAU BRAZ';
  if (s === 'CORNELIO PROCOPIO' || s === 'CORNELIO') return 'CORNELIO PROCOPIO';
  if (s === 'TELEMACO BORBA' || s === 'TELEMACO') return 'TELEMACO BORBA';
  return s;
}



/**
 * 1. TESTE DE CONEXÃO COM O TIDB CLOUD
 */
function testarConexaoTiDB() {
  var ui = SpreadsheetApp.getUi();
  var endpoint = VERCEL_APP_URL.replace(/\/$/, '') + '/api/tidb?action=ping';

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
        'O servidor respondeu com status ' + code + ':\n' + body,
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
 * 2. CONFIGURADOR DO GATILHO MATINAL DAS 07:00 (HORÁRIO DE BRASÍLIA)
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
 * 3. MENU MANUAL DE ATUALIZAÇÃO IMEDIATA (Disparado pelo usuário a qualquer momento)
 */
function menuSincronizarTiDBAgora() {
  try {
    try {
      SpreadsheetApp.getActiveSpreadsheet().toast('Iniciando sincronização com TiDB Cloud...', 'TiDB Serverless', 5);
    } catch (e) {}

    var res = executarSincronizacaoCompletaTiDB();
    var msg = '✓ Sincronização com o TiDB Cloud finalizada com sucesso!\n\n' +
              '• Cursistas Ativos (DADOS): ' + (res.cursistas || 0) + '\n' +
              '• Concluintes (1º Chamamento): ' + (res.concluintes || 0) + '\n' +
              '• Tutores: ' + (res.tutores || 0) + '\n' +
              '• Exonerados: ' + (res.exonerados || 0) + '\n' +
              '• Não Concluintes: ' + (res.nao_concluintes || 0) + '\n' +
              '• Movimentações (Trocas & Vínculos): ' + (res.movimentacoes || 0) + '\n' +
              '• Observações da Prática: ' + (res.observacoes || 0) + (res.observacoes === 0 ? ' (Planilhas externas sem permissão no Drive)' : '') + '\n' +
              '• Observações do Tutor: ' + (res.observacoes_tutor || 0);

    try {
      SpreadsheetApp.getUi().alert('Sincronização TiDB Concluída', msg, SpreadsheetApp.getUi().ButtonSet.OK);
    } catch (uiErr) {
      Logger.log(msg);
    }
  } catch (err) {
    Logger.log('Erro na Sincronização: ' + err.toString());
    try {
      SpreadsheetApp.getUi().alert('Erro na Sincronização', err.toString(), SpreadsheetApp.getUi().ButtonSet.OK);
    } catch (e) {}
  }
}

function sincronizarManualComAlerta() {
  menuSincronizarTiDBAgora();
}

function sincronizarObservacoesPraticaMenu() {
  try {
    SpreadsheetApp.getActiveSpreadsheet().toast('Sincronizando observações do 1º e 2º/3º anos com TiDB...', 'TiDB Serverless', 5);
    var res = sincronizarAbaObservacoesParaTiDB();
    SpreadsheetApp.getUi().alert('Observações da Prática', '✓ Total de observações da prática pedagógica sincronizadas: ' + (res.total || 0), SpreadsheetApp.getUi().ButtonSet.OK);
  } catch (e) {
    SpreadsheetApp.getUi().alert('Erro', e.toString(), SpreadsheetApp.getUi().ButtonSet.OK);
  }
}

function sincronizarObservacoesTutorMenu() {
  try {
    SpreadsheetApp.getActiveSpreadsheet().toast('Sincronizando observações do tutor com TiDB...', 'TiDB Serverless', 5);
    var res = sincronizarAbaObservacoesTutorParaTiDB();
    SpreadsheetApp.getUi().alert('Observações do Tutor', '✓ Total de observações do tutor sincronizadas: ' + (res.total || 0), SpreadsheetApp.getUi().ButtonSet.OK);
  } catch (e) {
    SpreadsheetApp.getUi().alert('Erro', e.toString(), SpreadsheetApp.getUi().ButtonSet.OK);
  }
}

/**
 * 4. EXECUÇÃO DA SINCRONIZAÇÃO COMPLETA (RODA AUTOMATICAMENTE ÀS 7H OU MANUALMENTE)
 */
function executarSincronizacaoCompletaTiDB() {
  Logger.log('Iniciando sincronização das planilhas com o TiDB Cloud...');
  
  var resCursistas = sincronizarAbaDadosParaTiDB();
  var resConcluintes = sincronizarAbaConcluintesParaTiDB();
  var resTutores = sincronizarAbaTutoresParaTiDB();
  var resExonerados = sincronizarAbaExoneradosParaTiDB();
  var resNaoConcluintes = sincronizarAbaNaoConcluintesParaTiDB();
  var resMovimentacoes = sincronizarAbasMovimentacoesParaTiDB();
  var resObservacoes = sincronizarAbaObservacoesParaTiDB();
  var resObservacoesTutor = sincronizarAbaObservacoesTutorParaTiDB();

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
 * 5. Sincroniza a aba DADOS (Cursistas Ativos)
 */
function sincronizarAbaDadosParaTiDB() {
  var ss;
  try {
    ss = (typeof obterPlanilhaMestra === 'function') ? obterPlanilhaMestra() : SpreadsheetApp.getActiveSpreadsheet();
  } catch (e) {
    ss = SpreadsheetApp.getActiveSpreadsheet();
  }
  if (!ss) {
    try { ss = SpreadsheetApp.openById(SPREADSHEET_ID_MESTRA_TIDB); } catch(e) {}
  }
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

  var idxNome = getIdx(["nome_cursista", "nome cursista", "nome"]);
  var idxCgm = getIdx(["cgm"]);
  var idxEmail = getIdx(["e-mail", "email", "e-mail cursista", "email cursista"]);
  var idxCpf = getIdx(["cpf_cursista", "cpf"]);
  var idxRg = getIdx(["rg"]);
  var idxTelefone = getIdx(["telefone_cursista", "telefone", "fone"]);
  var idxModalidade = getIdx(["modalidade"]);
  var idxComponente = getIdx(["componente", "disciplina"]);
  var idxTurma = getIdx(["turmas", "turma"]);
  var idxDia = getIdx(["dia_da_semana", "dia da semana", "dia"]);
  var idxHorarioIni = getIdx(["horario_inicial", "horario inicial", "inicio"]);
  var idxHorarioFim = getIdx(["horario_fim", "horario fim", "fim"]);
  var idxTurno = getIdx(["turno"]);
  var idxAno = getIdx(["ano_formativo", "ano formativo", "ano"]);
  var idxFormador = getIdx(["nome_formador", "nome formador", "formador"]);
  var idxCpfFormador = getIdx(["cpf_formador", "cpf formador"]);
  var idxRgFormador = getIdx(["rg_formador", "rg formador"]);
  var idxEmailFormador = getIdx(["e-mail_formador", "email_formador", "email formador"]);
  var idxFoneFormador = getIdx(["telefone_formador", "telefone formador"]);
  var idxNreFormador = getIdx(["nre_formador", "nre formador"]);
  var idxCompFormador = getIdx(["componente_formador", "componente formador"]);
  var idxTutor = getIdx(["tutor_responsavel", "tutor responsavel", "tutor"]);
  var idxEmailTutor = getIdx(["email_tutor", "e-mail tutor", "email tutor"]);
  var idxFoneTutor = getIdx(["telefone_tutor", "telefone tutor"]);
  var idxNreTutor = getIdx(["nre_tutor", "nre tutor", "nre"]);
  var idxEmailNre = getIdx(["e-mail_nre", "email_nre", "email nre"]);
  var idxLink = getIdx(["link", "link classroom"]);
  var idxClassroomId = getIdx(["id_classroom", "id classroom"]);
  var idxPeriodoIni = getIdx(["periodo_ini", "periodo inicial"]);
  var idxChamamento = getIdx(["chamamento"]);
  var idxNreExe = getIdx(["nre_exe"]);
  var idxMunicExe = getIdx(["munic_exe", "municipio"]);
  var idxCompConc = getIdx(["componente_conc"]);

  var cursistas = [];
  for (var i = 1; i < dados.length; i++) {
    var row = dados[i];
    var nome = idxNome !== -1 ? String(row[idxNome] || "").trim() : "";
    var cgm = idxCgm !== -1 ? String(row[idxCgm] || "").trim() : "";
    if (!nome && !cgm) continue;

    var turma = idxTurma !== -1 ? String(row[idxTurma] || "").trim() : "";
    var cod = cgm ? (cgm + "_" + turma) : ("CURS_" + i);

    cursistas.push({
      cod_cursista: cod,
      cgm: cgm,
      nome_cursista: nome,
      email: idxEmail !== -1 ? String(row[idxEmail] || "").trim().toLowerCase() : null,
      cpf_cursista: idxCpf !== -1 ? String(row[idxCpf] || "").replace(/\D/g, "") : null,
      rg: idxRg !== -1 ? String(row[idxRg] || "").trim() : null,
      telefone_cursista: idxTelefone !== -1 ? String(row[idxTelefone] || "").trim() : null,
      modalidade: idxModalidade !== -1 ? String(row[idxModalidade] || "").trim() : null,
      componente: idxComponente !== -1 ? String(row[idxComponente] || "").trim() : null,
      turmas: turma,
      dia_da_semana: idxDia !== -1 ? String(row[idxDia] || "").trim() : null,
      horario_inicial: idxHorarioIni !== -1 ? String(row[idxHorarioIni] || "").trim() : null,
      horario_fim: idxHorarioFim !== -1 ? String(row[idxHorarioFim] || "").trim() : null,
      turno: idxTurno !== -1 ? String(row[idxTurno] || "").trim() : null,
      ano_formativo: idxAno !== -1 ? String(row[idxAno] || "").trim() : null,
      nome_formador: idxFormador !== -1 ? String(row[idxFormador] || "").trim() : null,
      cpf_formador: idxCpfFormador !== -1 ? String(row[idxCpfFormador] || "").replace(/\D/g, "") : null,
      rg_formador: idxRgFormador !== -1 ? String(row[idxRgFormador] || "").trim() : null,
      email_formador: idxEmailFormador !== -1 ? String(row[idxEmailFormador] || "").trim().toLowerCase() : null,
      telefone_formador: idxFoneFormador !== -1 ? String(row[idxFoneFormador] || "").trim() : null,
      nre_formador: idxNreFormador !== -1 ? normalizeNre(row[idxNreFormador]) : null,
      componente_formador: idxCompFormador !== -1 ? String(row[idxCompFormador] || "").trim() : null,
      tutor_responsavel: idxTutor !== -1 ? String(row[idxTutor] || "").trim() : null,
      email_tutor: idxEmailTutor !== -1 ? String(row[idxEmailTutor] || "").trim().toLowerCase() : null,
      telefone_tutor: idxFoneTutor !== -1 ? String(row[idxFoneTutor] || "").trim() : null,
      nre_tutor: idxNreTutor !== -1 ? normalizeNre(row[idxNreTutor]) : null,
      email_nre: idxEmailNre !== -1 ? String(row[idxEmailNre] || "").trim().toLowerCase() : null,
      link: idxLink !== -1 ? String(row[idxLink] || "").trim() : null,
      id_classroom: idxClassroomId !== -1 ? String(row[idxClassroomId] || "").trim() : null,
      periodo_ini: idxPeriodoIni !== -1 ? String(row[idxPeriodoIni] || "").trim() : null,
      chamamento: idxChamamento !== -1 ? String(row[idxChamamento] || "").trim() : null,
      nre_exe: idxNreExe !== -1 ? normalizeNre(row[idxNreExe]) : null,
      munic_exe: idxMunicExe !== -1 ? String(row[idxMunicExe] || "").trim() : null,
      componente_conc: idxCompConc !== -1 ? String(row[idxCompConc] || "").trim() : null
    });
  }

  var BATCH_SIZE = 100;
  var totalSinc = 0;
  for (var b = 0; b < cursistas.length; b += BATCH_SIZE) {
    var lote = cursistas.slice(b, b + BATCH_SIZE);
    var endpoint = VERCEL_APP_URL.replace(/\/$/, '') + '/api/tidb';

    var options = {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify({
        action: 'sync_cursistas_bulk',
        cursistas: lote,
        truncate: (b === 0)
      }),
      muteHttpExceptions: true
    };

    try {
      var resp = UrlFetchApp.fetch(endpoint, options);
      if (resp.getResponseCode() === 200) {
        totalSinc += lote.length;
      }
    } catch (err) {}
  }

  return { status: 'sucesso', total: totalSinc };
}

/**
 * 6. Sincroniza a aba CONCLUINTES-1CH
 */
function sincronizarAbaConcluintesParaTiDB() {
  var ss;
  try {
    ss = (typeof obterPlanilhaMestra === 'function') ? obterPlanilhaMestra() : SpreadsheetApp.getActiveSpreadsheet();
  } catch (e) {
    ss = SpreadsheetApp.getActiveSpreadsheet();
  }
  if (!ss) {
    try { ss = SpreadsheetApp.openById(SPREADSHEET_ID_MESTRA_TIDB); } catch(e) {}
  }
  var aba = ss.getSheetByName("CONCLUINTES-1CH") || ss.getSheetByName("CONCLUINTES");
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

  var idxNome = getIdx(["nome"]);
  var idxEmail = getIdx(["e-mail", "email"]);
  var idxCgm = getIdx(["cgm"]);
  var idxCpf = getIdx(["cpf"]);
  var idxRg = getIdx(["rg"]);
  var idxComponente = getIdx(["componente", "disciplina"]);
  var idxNre = getIdx(["nre"]);
  var idxMunic = getIdx(["munic"]);
  var idxTurma = getIdx(["turma"]);
  var idxAno = getIdx(["ano"]);
  var idxMod = getIdx(["modalidade"]);
  var idxDataConc = getIdx(["conclus", "data"]);

  var concluintes = [];
  for (var i = 1; i < dados.length; i++) {
    var row = dados[i];
    var nome = idxNome !== -1 ? String(row[idxNome] || "").trim() : "";
    if (!nome) continue;

    var cpf = idxCpf !== -1 ? String(row[idxCpf] || "").replace(/\D/g, "") : "";

    concluintes.push({
      cod_cursista: cpf ? ("CONC_" + cpf) : ("CONC_" + i),
      nome_cursista: nome,
      email: idxEmail !== -1 ? String(row[idxEmail] || "").trim().toLowerCase() : null,
      cgm: idxCgm !== -1 ? String(row[idxCgm] || "").trim() : null,
      cpf: cpf || null,
      rg: idxRg !== -1 ? String(row[idxRg] || "").trim() : null,
      componente: idxComponente !== -1 ? String(row[idxComponente] || "").trim() : null,
      nre_exe: idxNre !== -1 ? normalizeNre(row[idxNre]) : null,
      munic_exe: idxMunic !== -1 ? String(row[idxMunic] || "").trim() : null,
      turmas: idxTurma !== -1 ? String(row[idxTurma] || "").trim() : null,
      ano_formativo: idxAno !== -1 ? String(row[idxAno] || "").trim() : "1º ANO",
      modalidade: idxMod !== -1 ? String(row[idxMod] || "").trim() : "Docentes",
      data_conclusao: idxDataConc !== -1 ? String(row[idxDataConc] || "").trim() : null,
      chamamento: "1º Chamamento",
      situacao: "CONCLUÍDO"
    });
  }

  var BATCH_SIZE = 100;
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
        truncate: (b === 0)
      }),
      muteHttpExceptions: true
    };

    try {
      var resp = UrlFetchApp.fetch(endpoint, options);
      if (resp.getResponseCode() === 200) {
        totalSinc += lote.length;
      }
    } catch (err) {}
  }

  return { status: 'sucesso', total: totalSinc };
}

/**
 * 7. Sincroniza a aba TUTORES
 */
function sincronizarAbaTutoresParaTiDB() {
  var ss;
  try {
    ss = (typeof obterPlanilhaMestra === 'function') ? obterPlanilhaMestra() : SpreadsheetApp.getActiveSpreadsheet();
  } catch (e) {
    ss = SpreadsheetApp.getActiveSpreadsheet();
  }
  if (!ss) {
    try { ss = SpreadsheetApp.openById(SPREADSHEET_ID_MESTRA_TIDB); } catch(e) {}
  }
  var aba = ss.getSheetByName("TUTORES") || ss.getSheetByName("Tutores");
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

  var idxNome = getIdx(["tutor", "nome"]);
  var idxEmailEduc = getIdx(["email_educ", "email educ", "e-mail educ", "educ"]);
  var idxEmailAdm = getIdx(["email_adm", "email adm", "e-mail adm", "adm"]);
  var idxTelefone = getIdx(["telefone", "fone"]);
  var idxNre = getIdx(["nre_tutor", "nre"]);
  var idxEmailNre = getIdx(["email_nre", "e-mail nre", "email nre"]);

  var tutores = [];
  var vistos = {};
  for (var i = 1; i < dados.length; i++) {
    var row = dados[i];
    var nome = idxNome !== -1 ? String(row[idxNome] || "").trim() : "";
    if (!nome) continue;

    var emailEduc = idxEmailEduc !== -1 ? String(row[idxEmailEduc] || "").trim().toLowerCase() : "";
    var chave = nome + "|" + emailEduc;
    if (vistos[chave]) continue;
    vistos[chave] = true;

    tutores.push({
      tutor_responsavel: nome,
      email_educ: emailEduc || null,
      email_adm: idxEmailAdm !== -1 ? String(row[idxEmailAdm] || "").trim().toLowerCase() : null,
      telefone: idxTelefone !== -1 ? String(row[idxTelefone] || "").trim() : null,
      nre_tutor: idxNre !== -1 ? normalizeNre(row[idxNre]) : null,
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
        truncate: (b === 0)
      }),
      muteHttpExceptions: true
    };

    try {
      var resp = UrlFetchApp.fetch(endpoint, options);
      if (resp.getResponseCode() === 200) {
        totalSinc += lote.length;
      }
    } catch (err) {}
  }

  return { status: 'sucesso', total: totalSinc };
}

/**
 * 8. Sincroniza a aba EXONERADOS
 */
function sincronizarAbaExoneradosParaTiDB() {
  var ss;
  try {
    ss = (typeof obterPlanilhaMestra === 'function') ? obterPlanilhaMestra() : SpreadsheetApp.getActiveSpreadsheet();
  } catch (e) {
    ss = SpreadsheetApp.getActiveSpreadsheet();
  }
  if (!ss) {
    try { ss = SpreadsheetApp.openById(SPREADSHEET_ID_MESTRA_TIDB); } catch(e) {}
  }
  var aba = ss.getSheetByName("EXONERADOS") || ss.getSheetByName("Exonerados");
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

  var idxNome = getIdx(["nome", "nome_cursista", "servidor"]);
  var idxEmail = getIdx(["email", "e-mail"]);
  var idxCargo = getIdx(["cargo", "modalidade"]);
  var idxDisciplina = getIdx(["disciplina", "componente"]);
  var idxChamamento = getIdx(["chamamento"]);
  var idxStatus = getIdx(["status", "motivo", "situacao"]);

  var exonerados = [];
  for (var i = 1; i < dados.length; i++) {
    var row = dados[i];
    var nome = idxNome !== -1 ? String(row[idxNome] || "").trim() : "";
    if (!nome) continue;

    var cargoVal = idxCargo !== -1 ? String(row[idxCargo] || "").trim() : null;
    var discVal = idxDisciplina !== -1 ? String(row[idxDisciplina] || "").trim() : null;
    var chamVal = idxChamamento !== -1 ? String(row[idxChamamento] || "").trim() : null;
    var statVal = idxStatus !== -1 ? String(row[idxStatus] || "").trim() : null;

    exonerados.push({
      nome_cursista: nome,
      email: idxEmail !== -1 ? String(row[idxEmail] || "").trim().toLowerCase() : null,
      cargo: cargoVal,
      modalidade: cargoVal,
      disciplina: discVal,
      componente: discVal,
      chamamento: chamVal,
      status: statVal,
      motivo: statVal
    });
  }

  var endpoint = VERCEL_APP_URL.replace(/\/$/, '') + '/api/tidb';
  var options = {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify({
      action: 'sync_exonerados_bulk',
      exonerados: exonerados,
      truncate: true
    }),
    muteHttpExceptions: true
  };

  try {
    var resp = UrlFetchApp.fetch(endpoint, options);
    return { status: 'sucesso', total: exonerados.length };
  } catch (err) {
    return { status: 'erro', total: 0 };
  }
}

/**
 * 9. Sincroniza a aba CURSISTAS NAO CONCLUINTES
 */
function sincronizarAbaNaoConcluintesParaTiDB() {
  var ss;
  try {
    ss = (typeof obterPlanilhaMestra === 'function') ? obterPlanilhaMestra() : SpreadsheetApp.getActiveSpreadsheet();
  } catch (e) {
    ss = SpreadsheetApp.getActiveSpreadsheet();
  }
  if (!ss) {
    try { ss = SpreadsheetApp.openById(SPREADSHEET_ID_MESTRA_TIDB); } catch(e) {}
  }
  var aba = ss.getSheetByName("CURSISTAS NAO CONCLUINTES") || ss.getSheetByName("NAO CONCLUINTES");
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

  var idxNome = getIdx(["nome"]);
  var idxEmail = getIdx(["e-mail", "email"]);
  var idxModalidade = getIdx(["modalidade"]);
  var idxComponente = getIdx(["componente"]);
  var idxChamamento = getIdx(["chamamento"]);
  var idxMotivo = getIdx(["motivo"]);

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

  var endpoint = VERCEL_APP_URL.replace(/\/$/, '') + '/api/tidb';
  var options = {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify({
      action: 'sync_nao_concluintes_bulk',
      nao_concluintes: naoConcluintes,
      truncate: true
    }),
    muteHttpExceptions: true
  };

  try {
    var resp = UrlFetchApp.fetch(endpoint, options);
    return { status: 'sucesso', total: naoConcluintes.length };
  } catch (err) {
    return { status: 'erro', total: 0 };
  }
}

/**
 * 10. Sincroniza formulários de movimentações (Troca de Turma, Modalidade e AF)
 */
function sincronizarAbasMovimentacoesParaTiDB() {
  var ss;
  try {
    ss = (typeof obterPlanilhaMestra === 'function') ? obterPlanilhaMestra() : SpreadsheetApp.getActiveSpreadsheet();
  } catch (e) {
    ss = SpreadsheetApp.getActiveSpreadsheet();
  }
  if (!ss) {
    try { ss = SpreadsheetApp.openById(SPREADSHEET_ID_MESTRA_TIDB); } catch(e) {}
  }
  var movimentacoes = [];

  function processarAba(nomeAba, colStatusIdx, tipoPadrao) {
    var aba = ss.getSheetByName(nomeAba);
    if (!aba) return;
    var dados = aba.getDataRange().getValues();
    if (dados.length < 2) return;

    for (var i = 1; i < dados.length; i++) {
      var row = dados[i];
      var carimbo = String(row[0] || "").trim();
      var email = String(row[1] || "").trim().toLowerCase();
      var nome = String(row[2] || "").trim();
      if (!nome && !email) continue;

      var statusRaw = colStatusIdx < row.length ? String(row[colStatusIdx] || "").trim() : "";
      var status = "Pendente";
      if (statusRaw.match(/deferid|resolvid|atendid/i)) status = "Resolvido";
      else if (statusRaw.match(/indeferid|recusad/i)) status = "Indeferido";

      movimentacoes.push({
        id: "MOV_" + nomeAba.replace(/\s+/g, "_") + "_" + i,
        timestamp: carimbo,
        cgm: String(row[3] || "").trim(),
        nome_cursista: nome,
        email: email,
        tipo_acao: tipoPadrao,
        motivo: String(row[6] || row[5] || "").trim(),
        status: status,
        solicitadoPor: 'Google Forms'
      });
    }
  }

  processarAba("Troca de Turma", 14, "Troca de Turma");
  processarAba("Troca de Modalidade", 12, "Troca de Modalidade");
  processarAba("Vínculos na AF", 17, "Vínculos na AF");

  var BATCH_SIZE = 100;
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
      if (resp.getResponseCode() === 200) totalSinc += lote.length;
    } catch (err) {}
  }

  return { status: 'sucesso', total: totalSinc };
}

/**
 * 11. Extração direta das planilhas de observação (1º SEMESTRE, 2º SEMESTRE e COMPILADO)
 * Suporta leitura por ID externo ou por abas locais vinculadas (IMPORTRANGE)
 */
function extrairObservacoesDePlanilhaExterna(spreadsheetId, anoRotulo, semestreForcado) {
  var ss = null;
  // 1. Tentar ler da planilha externa via openById
  if (spreadsheetId) {
    try {
      ss = SpreadsheetApp.openById(spreadsheetId);
    } catch (e) {
      Logger.log('Aviso permissão ao ler planilha externa ' + spreadsheetId + ' (' + anoRotulo + ' ' + (semestreForcado || '') + '): ' + e.toString());
    }
  }

  // 2. Se não conseguiu abrir externa (por restrição de permissão do Drive), buscar aba local na Planilha Mestra
  var aba = null;
  if (ss) {
    aba = ss.getSheets()[0];
  } else {
    var ssLocal = null;
    try { ssLocal = SpreadsheetApp.getActiveSpreadsheet(); } catch (e) {}
    if (ssLocal) {
      var nomesLocais = [];
      if (semestreForcado === '1º Semestre') {
        nomesLocais = (anoRotulo && anoRotulo.indexOf('1') !== -1)
          ? ['OBSERVACOES_1ANO_1SEM', 'OBS_1ANO_1SEM', '1º ANO 1º SEM', 'OBS_1SEM', '1º ANO']
          : ['OBSERVACOES_2ANO_1SEM', 'OBS_2ANO_1SEM', '2º ANO 1º SEM', '2º/3º ANO 1º SEM', '2º/3º ANO'];
      } else if (semestreForcado === '2º Semestre') {
        nomesLocais = (anoRotulo && anoRotulo.indexOf('1') !== -1)
          ? ['OBSERVACOES_1ANO_2SEM', 'OBS_1ANO_2SEM', '1º ANO 2º SEM', 'OBS_2SEM', 'OBSERVACOES_1ANO']
          : ['OBSERVACOES_2ANO_2SEM', 'OBS_2ANO_2SEM', '2º ANO 2º SEM', '2º/3º ANO 2º SEM', 'OBSERVACOES_2ANO'];
      } else {
        nomesLocais = ['OBSERVACOES_COMPILADO', 'COMPILADO_OBSERVACOES', 'OBSERVACOES_2024_2026', 'OBSERVACOES'];
      }
      for (var n = 0; n < nomesLocais.length; n++) {
        aba = ssLocal.getSheetByName(nomesLocais[n]);
        if (aba) {
          Logger.log('✓ Utilizando aba local de observações: ' + nomesLocais[n]);
          break;
        }
      }
    }
  }

  if (!aba) return [];

  var dados = [];
  try {
    dados = aba.getDataRange().getValues();
  } catch (e) {
    return [];
  }
  if (dados.length < 2) return [];

  // Mapeamento dinâmico de colunas pelo cabeçalho (linha 0) para tolerar variações entre formulários
  var headers = dados[0].map(function(h) { return String(h || '').trim().toLowerCase(); });
  var idxCarimbo = -1, idxEmailFormador = -1, idxNomeFormador = -1, idxQuemObs = -1;
  var idxNomeCursista = -1, idxEmailCursista = -1, idxRealizada = -1, idxModFeedback = -1;
  var idxModalidade = -1, idxComponente = -1, idxTema = -1, idxProposta = -1;

  for (var c = 0; c < headers.length; c++) {
    var h = headers[c];
    if (idxCarimbo === -1 && (h.indexOf('carimbo') !== -1 || h.indexOf('data/hora') !== -1)) idxCarimbo = c;
    else if (idxEmailFormador === -1 && (h.indexOf('endereço de e-mail') !== -1 || h.indexOf('email formador') !== -1 || h.indexOf('e-mail formador') !== -1)) idxEmailFormador = c;
    else if (idxNomeFormador === -1 && (h === 'formador' || h.indexOf('nome do formador') !== -1 || h.indexOf('nome formador') !== -1)) idxNomeFormador = c;
    else if (idxQuemObs === -1 && (h.indexOf('quem observou') !== -1 || h.indexOf('observador') !== -1)) idxQuemObs = c;
    else if (idxNomeCursista === -1 && (h === 'cursista' || h.indexOf('nome do cursista') !== -1 || h.indexOf('nome cursista') !== -1)) idxNomeCursista = c;
    else if (idxEmailCursista === -1 && (h.indexOf('@escola cursista') !== -1 || h.indexOf('email cursista') !== -1 || h.indexOf('e-mail cursista') !== -1 || h.indexOf('@escola') !== -1)) idxEmailCursista = c;
    else if (idxRealizada === -1 && (h.indexOf('realizada') !== -1 || h.indexOf('observação realizada') !== -1)) idxRealizada = c;
    else if (idxModFeedback === -1 && (h.indexOf('modalidade de feedback') !== -1 || h.indexOf('devolutiva') !== -1)) idxModFeedback = c;
    else if (idxComponente === -1 && (h.indexOf('componente') !== -1 || h.indexOf('atuação') !== -1)) idxComponente = c;
    else if (idxTema === -1 && (h.indexOf('referência') !== -1 || h.indexOf('tema') !== -1)) idxTema = c;
    else if (idxProposta === -1 && (h.indexOf('proposta') !== -1 || h.indexOf('implementação') !== -1)) idxProposta = c;
    else if (idxModalidade === -1 && (h === 'modalidade' || h.indexOf('modalidade') !== -1)) idxModalidade = c;
  }

  // Fallbacks posicionais caso não haja cabeçalho identificado
  if (idxCarimbo === -1) idxCarimbo = 0;
  if (idxEmailFormador === -1) idxEmailFormador = 1;
  if (idxNomeFormador === -1) idxNomeFormador = 2;
  if (idxNomeCursista === -1) idxNomeCursista = 4;
  if (idxEmailCursista === -1) idxEmailCursista = 5;

  var lista = [];
  for (var i = 1; i < dados.length; i++) {
    var row = dados[i];
    var carimbo = String(row[idxCarimbo] || '').trim();

    // FILTRO RIGOROSO 2026: Não misturar anos anteriores no painel de observações vigentes de 2026
    if (carimbo.indexOf('2024') !== -1 || carimbo.indexOf('2025') !== -1) continue;

    var formadorEmail = String(row[idxEmailFormador] || '').trim().toLowerCase();
    var formadorNome = String(row[idxNomeFormador] || '').trim() || formadorEmail;
    var quemObservou = (idxQuemObs !== -1) ? String(row[idxQuemObs] || '').trim() : '';

    var cursistaNome = String(row[idxNomeCursista] || '').trim();
    var cursistaEmail = String(row[idxEmailCursista] || '').trim().toLowerCase();

    // Inversão de segurança: se o nome veio com arroba e o email sem arroba, desinverte
    if (cursistaNome && cursistaNome.indexOf('@') !== -1 && cursistaEmail && cursistaEmail.indexOf('@') === -1) {
      var tmp = cursistaEmail;
      cursistaEmail = cursistaNome;
      cursistaNome = tmp;
    }

    // Limpeza de caracteres residuais no nome
    cursistaNome = cursistaNome.replace(/^[-:\s]+/, '');

    var realizada = (idxRealizada !== -1) ? String(row[idxRealizada] || '').trim() : 'Sim, a observação foi realizada.';
    var modFeedback = (idxModFeedback !== -1) ? String(row[idxModFeedback] || '').trim() : 'Diálogo formativo';
    var modalidade = (idxModalidade !== -1) ? String(row[idxModalidade] || '').trim() : 'Docentes';
    var componente = (idxComponente !== -1) ? String(row[idxComponente] || '').trim() : '';
    var tema = (idxTema !== -1) ? String(row[idxTema] || '').trim() : '';
    var proposta = (idxProposta !== -1) ? String(row[idxProposta] || '').trim() : '';

    if (!cursistaEmail && !cursistaNome) continue;

    // Determina o semestre (1º Semestre ou 2º Semestre)
    var semestreEfetivo = semestreForcado;
    if (!semestreEfetivo) {
      var parts = carimbo.split(' ')[0].split('/');
      var mes = parseInt(parts[1], 10);
      semestreEfetivo = (mes && mes <= 6) ? '1º Semestre' : '2º Semestre';
    }

    var anoEfetivo = anoRotulo || '1º ANO';
    var idOrigem = 'OBS_' + anoEfetivo.replace(/[^a-zA-Z0-9]/g, '') + '_' + (semestreEfetivo.indexOf('1') !== -1 ? '1SEM' : '2SEM') + '_' + (cursistaEmail ? cursistaEmail.replace(/[^a-z0-9]/g, '') : i) + '_' + (carimbo ? carimbo.replace(/[^0-9]/g, '') : i);

    lista.push({
      id_origem: idOrigem,
      carimbo: carimbo,
      email_cursista: cursistaEmail,
      nome_cursista: cursistaNome,
      email_formador: formadorEmail,
      nome_formador: formadorNome,
      ano_formativo: anoEfetivo,
      semestre: semestreEfetivo,
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
}

/**
 * 12. Sincroniza as Observações de Prática (Exclusivamente do Ciclo 2026: 1º e 2º Semestres)
 */
function sincronizarAbaObservacoesParaTiDB() {
  Logger.log('Extraindo observações de prática pedagógica de 2026 (1º e 2º Semestres)...');
  
  // 1º Semestre 2026
  var obs1Ano1Sem = extrairObservacoesDePlanilhaExterna(ID_PLANILHA_OBS_1ANO_1SEM, "1º ANO", "1º Semestre");
  var obs2e3Ano1Sem = extrairObservacoesDePlanilhaExterna(ID_PLANILHA_OBS_2e3ANO_1SEM, "2º/3º ANO", "1º Semestre");

  // 2º Semestre 2026
  var obs1Ano2Sem = extrairObservacoesDePlanilhaExterna(ID_PLANILHA_OBS_1ANO_2SEM, "1º ANO", "2º Semestre");
  var obs2e3Ano2Sem = extrairObservacoesDePlanilhaExterna(ID_PLANILHA_OBS_2e3ANO_2SEM, "2º/3º ANO", "2º Semestre");

  // Apenas as observações de 2026 (1º e 2º Semestres) alimentam a base vigente de observações
  var observacoes = [].concat(obs1Ano1Sem, obs2e3Ano1Sem, obs1Ano2Sem, obs2e3Ano2Sem);

  if (observacoes.length === 0) {
    return { status: 'vazio', total: 0 };
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
        observacoes: lote,
        truncate: (b === 0)
      }),
      muteHttpExceptions: true
    };

    try {
      var resp = UrlFetchApp.fetch(endpoint, options);
      if (resp.getResponseCode() === 200) {
        totalSinc += lote.length;
      }
    } catch (err) {}
  }

  return { status: 'sucesso', total: totalSinc };
}

/**
 * 13. Sincroniza as Observações do Tutor
 */
function sincronizarAbaObservacoesTutorParaTiDB() {
  var ss;
  try {
    ss = (typeof obterPlanilhaMestra === 'function') ? obterPlanilhaMestra() : SpreadsheetApp.getActiveSpreadsheet();
  } catch (e) {
    ss = SpreadsheetApp.getActiveSpreadsheet();
  }
  if (!ss) {
    try { ss = SpreadsheetApp.openById(SPREADSHEET_ID_MESTRA_TIDB); } catch(e) {}
  }
  var aba = ss.getSheetByName("Respostas ao formulário 1") || ss.getSheetByName("Respostas ao formulario 1") || ss.getSheetByName("Observações do Tutor");

  if (!aba) {
    try {
      var ssTutor = SpreadsheetApp.openById(ID_PLANILHA_OBS_TUTOR);
      aba = ssTutor.getSheets()[0];
    } catch (e) {}
  }

  if (!aba) return { status: 'nao_encontrada' };

  var dados = aba.getDataRange().getValues();
  if (dados.length < 2) return { status: 'vazio' };

  var observacoes = [];
  for (var i = 1; i < dados.length; i++) {
    var row = dados[i];
    var tutor = String(row[2] || row[3] || "").trim();
    var emailTutor = String(row[1] || "").trim().toLowerCase();
    if (!tutor && !emailTutor) continue;

    var carimbo = String(row[0] || "").trim();
    var formador = String(row[4] || row[5] || "").trim();
    var formadorEmail = String(row[6] || "").trim().toLowerCase();
    var nre = normalizeNre(row[17] || "");

    observacoes.push({
      id_origem: "OBS_TUT_" + (emailTutor ? emailTutor.replace(/[^a-z0-9]/g, "") : i) + "_" + (carimbo ? carimbo.replace(/[^0-9]/g, "") : i),
      timestamp: carimbo,
      tutorEmail: emailTutor,
      tutor: tutor,
      formador: formador,
      formadorEmail: formadorEmail,
      acaoAcompanhamento: String(row[7] || "").trim(),
      acaoObservada: String(row[8] || "").trim(),
      dataObservacao: String(row[9] || "").trim(),
      linkAcaoObservada: String(row[10] || "").trim(),
      dataFeedback: String(row[11] || "").trim(),
      linkFeedback: String(row[12] || "").trim(),
      linksComplementares: String(row[13] || "").trim(),
      modalidade: String(row[14] || "").trim(),
      nre: nre,
      tema: String(row[18] || "").trim(),
      checklistRealizadas: String(row[15] || "").trim(),
      checklistNaoRealizadas: String(row[16] || "").trim(),
      destaques: String(row[19] || "").trim(),
      desenvolver: String(row[20] || "").trim(),
      encaminhamentos: String(row[21] || "").trim(),
      rubrics: []
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
      if (resp.getResponseCode() === 200) totalSinc += lote.length;
    } catch (err) {}
  }

  return { status: 'sucesso', total: totalSinc };
}
