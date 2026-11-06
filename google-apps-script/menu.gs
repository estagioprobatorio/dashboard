// =========================================================================================
// GOOGLE APPS SCRIPT - MENU CENTRAL UNIFICADO (SEED-PR)
// Gestão do Estágio Probatório, Integrações SIGEP, Remanejamento e Banco TiDB Cloud
// =========================================================================================

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
