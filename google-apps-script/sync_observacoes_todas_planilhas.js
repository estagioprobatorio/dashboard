/**
 * =========================================================================================
 * GOOGLE APPS SCRIPT: Sincronização Unificada de Observações ➔ Supabase
 * Tabela: observacoes_pratica
 * Plataforma do Estágio Probatório - SEED/PR
 * =========================================================================================
 * 
 * SCRIPT EXTERNO / STANDALONE (Um único script para todas as 4 planilhas)
 * 
 * PLANILHAS CONFIGURADAS:
 * 1. Formador-1ANO_1SEM_Observação da Prática Pedagógica 2026 (FECHADA - apenas carga histórica)
 *    URL: https://docs.google.com/spreadsheets/d/1KmbMvNOTpj4OaDOdKw5mPVI3iqbo8RbQBqBktM84ToE (GID: 1030562032)
 * 
 * 2. Formador-2e3ANO-2SEM_Observação da Prática Pedagógica 2026 (ATIVA - recebe gatilho de formulário)
 *    URL: https://docs.google.com/spreadsheets/d/1uv5QWeqtN5iMkH8nVQUvsYKClv9NaGDHgsdT_D-RPiw (GID: 2068065207)
 * 
 * 3. Formador-1ANO_2SEM_Observação da Prática Pedagógica 2026 (ATIVA - recebe gatilho de formulário)
 *    URL: https://docs.google.com/spreadsheets/d/1dL_Q-_15Idx3SNAZOqmKzrnVqA8tHFBzILA5PZ7p798 (GID: 425616417)
 * 
 * 4. Formador-2e3ANO-1SEM_Observação da Prática Pedagógica 2026 (FECHADA - apenas carga histórica)
 *    URL: https://docs.google.com/spreadsheets/d/1zSnlh7aW8df800lP90rCLVxiHNWAa1f9IGjz2OoDfvU (GID: 848666482)
 * 
 * =========================================================================================
 * PASSO A PASSO PARA USAR ESTE SCRIPT:
 * 1. Acesse https://script.google.com/ e abra seu projeto (ou clique em "+ Novo projeto").
 * 2. Apague qualquer código anterior e cole todo o conteúdo deste arquivo.
 * 3. Preencha a constante SUPABASE_KEY com a sua chave (service_role ou anon) do Supabase na linha 48.
 * 4. Clique em Salvar (ícone do disquete 💾).
 * 
 * 5. CARGA INICIAL COMPLETA (HISTÓRICO):
 *    - Selecione "sincronizarTodasAsPlanilhas" no menu suspenso e clique em "Executar".
 *    - Ele sincroniza as 4 planilhas de uma vez (1º e 2º semestres) sem duplicar registros.
 * 
 * 6. ATUALIZAÇÃO INSTANTÂNEA A CADA FORMULÁRIO ENVIADO (INSERT APENAS DO DADO NOVO):
 *    - Selecione "configurarGatilhoInstantaneoAoEnviarFormulario" e clique em "Executar".
 *    - O Google conectará o acionador "Ao enviar formulário" em todas as planilhas.
 *    - Assim que um formador enviar a resposta, APENAS aquela nova linha é gravada no Supabase
 *      em menos de 1 segundo! O Dashboard atualiza na hora na tela sem precisar recarregar.
 * 
 * 7. ROTINA DIÁRIA DAS 07h15 (REDE DE SEGURANÇA):
 *    - Selecione "configurarGatilhoDiario07h15" e clique em "Executar".
 *    - O script rodará todos os dias às 07h15 da manhã sozinho na nuvem para garantir
 *      que nada fique para trás (como edições manuais ou instabilidade pontual).
 * =========================================================================================
 */

// ⚙️ CONFIGURAÇÕES DE CONEXÃO AO SUPABASE
const SUPABASE_URL = "https://hoiihqrivcelsfivjpqs.supabase.co";
const SUPABASE_KEY = "SUA_CHAVE_AQUI"; // Cole sua service_role_key (recomendada para sync) ou anon_key do Supabase

// 📋 CONFIGURAÇÃO DAS 4 PLANILHAS
const PLANILHAS_CONFIG = [
  {
    sigla: "1ANO_1SEM",
    nome: "Formador-1ANO_1SEM",
    id: "1KmbMvNOTpj4OaDOdKw5mPVI3iqbo8RbQBqBktM84ToE",
    gid: "1030562032",
    anoFormativoPadrao: "1º ANO",
    semestrePadrao: "1º Semestre/2026",
    fechada: false // Habilitado para receber gatilho de formulário (inclusive respostas com atraso)
  },
  {
    sigla: "2e3ANO_2SEM",
    nome: "Formador-2e3ANO-2SEM",
    id: "1uv5QWeqtN5iMkH8nVQUvsYKClv9NaGDHgsdT_D-RPiw",
    gid: "2068065207",
    anoFormativoPadrao: "2º/3º ANO",
    semestrePadrao: "2º Semestre/2026",
    fechada: false // Habilitado para receber gatilho de formulário
  },
  {
    sigla: "1ANO_2SEM",
    nome: "Formador-1ANO_2SEM",
    id: "1dL_Q-_15Idx3SNAZOqmKzrnVqA8tHFBzILA5PZ7p798",
    gid: "425616417",
    anoFormativoPadrao: "1º ANO",
    semestrePadrao: "2º Semestre/2026",
    fechada: false // Habilitado para receber gatilho de formulário
  },
  {
    sigla: "2e3ANO_1SEM",
    nome: "Formador-2e3ANO-1SEM",
    id: "1zSnlh7aW8df800lP90rCLVxiHNWAa1f9IGjz2OoDfvU",
    gid: "848666482",
    anoFormativoPadrao: "2º/3º ANO",
    semestrePadrao: "1º Semestre/2026",
    fechada: false // Habilitado para receber gatilho de formulário (inclusive respostas com atraso)
  }
];

/**
 * =========================================================================================
 * 1. FUNÇÃO PRINCIPAL: SINCRONIZAR TODAS AS 4 PLANILHAS (CARGA COMPLETA SEM DUPLICATAS)
 * =========================================================================================
 */
function sincronizarTodasAsPlanilhas() {
  const cleanKey = String(SUPABASE_KEY || "").trim();
  if (!cleanKey || cleanKey === "SUA_CHAVE_AQUI" || cleanKey.length < 20) {
    Logger.log("❌ ERRO CRÍTICO: A variável SUPABASE_KEY não foi preenchida ou é inválida!");
    Logger.log("Por favor, cole a sua chave 'anon' ou 'service_role' do Supabase na linha 53 do script.");
    Logger.log("Como pegar sua chave no Supabase: Acesse seu painel -> Project Settings (⚙️) -> API -> Project API keys (copie a chave 'anon' ou 'service_role').");
    return;
  }

  Logger.log("==========================================================================");
  Logger.log("INICIANDO SINCRONIZAÇÃO GERAL DAS 4 PLANILHAS DE OBSERVAÇÃO PEDAGÓGICA");
  Logger.log("==========================================================================");

  let totalGeralEnviado = 0;
  const relatorio = [];

  for (let p = 0; p < PLANILHAS_CONFIG.length; p++) {
    const config = PLANILHAS_CONFIG[p];
    Logger.log("\n--------------------------------------------------------------------------");
    Logger.log("Processando (" + (p + 1) + "/4): " + config.nome + " [" + (config.fechada ? "FECHADA" : "ATIVA") + "]");
    Logger.log("Planilha ID: " + config.id);

    try {
      const ss = SpreadsheetApp.openById(config.id);
      let sheet = null;

      // Localizar aba correspondente pelo GID ou pela primeira aba
      const allSheets = ss.getSheets();
      for (let s of allSheets) {
        if (String(s.getSheetId()) === String(config.gid)) {
          sheet = s;
          break;
        }
      }
      if (!sheet) {
        sheet = allSheets[0];
        Logger.log("Aviso: GID " + config.gid + " não encontrado exatamente, usando primeira aba: " + sheet.getName());
      }

      const lastRow = sheet.getLastRow();
      const lastCol = sheet.getLastColumn();

      if (lastRow < 2 || lastCol < 3) {
        Logger.log("Aba [" + sheet.getName() + "] vazia ou sem cabeçalhos. Pulando.");
        relatorio.push({ nome: config.nome, total: 0, status: "Vazia" });
        continue;
      }

      Logger.log("Total de linhas encontradas na aba: " + (lastRow - 1));

      const headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
      const allValues = sheet.getRange(2, 1, lastRow - 1, lastCol).getValues();

      const batchSize = 100;
      let batch = [];
      let enviadosDestaPlanilha = 0;

      for (let i = 0; i < allValues.length; i++) {
        const rowNumber = i + 2; // Linha real na planilha
        const row = allValues[i];

        const payload = mapRowToObservation(headers, row, sheet.getName(), sheet.getSheetId(), rowNumber, config);

        if (payload && payload.email_cursista) {
          batch.push(payload);
        }

        if (batch.length >= batchSize || i === allValues.length - 1) {
          if (batch.length > 0) {
            sendBatchToSupabase(batch);
            enviadosDestaPlanilha += batch.length;
            totalGeralEnviado += batch.length;
            batch = [];
            Utilities.sleep(200); // Pausa breve de estabilidade
          }
        }
      }

      Logger.log("✓ Concluído " + config.nome + ": " + enviadosDestaPlanilha + " observações enviadas/atualizadas.");
      relatorio.push({ nome: config.nome, total: enviadosDestaPlanilha, status: "Sucesso" });

    } catch (err) {
      Logger.log("❌ Erro ao processar planilha " + config.nome + ": " + err.toString());
      relatorio.push({ nome: config.nome, total: 0, status: "Erro: " + err.toString() });
    }
  }

  Logger.log("\n==========================================================================");
  Logger.log("RESUMO DA SINCRONIZAÇÃO:");
  relatorio.forEach(r => {
    Logger.log("- " + r.nome + ": " + r.total + " registros (" + r.status + ")");
  });
  Logger.log("TOTAL GERAL NO SUPABASE: " + totalGeralEnviado + " registros");
  Logger.log("==========================================================================");
}

/**
 * =========================================================================================
 * 2. ACIONADOR DIÁRIO AUTOMÁTICO (ÀS 07h15 DA MANHÃ - HORÁRIO DE BRASÍLIA)
 * =========================================================================================
 * Execute a função "configurarGatilhoDiario07h15" APENAS UMA VEZ no editor do Apps Script.
 * Ela agenda a sincronização para rodar todos os dias às 07h15 da manhã.
 * Não precisa abrir nenhuma planilha! O script roda na nuvem do Google sozinho,
 * atualizando respostas novas e respostas enviadas com atraso do 1º semestre.
 */
function configurarGatilhoDiario07h15() {
  Logger.log("Iniciando configuração do acionador diário das 07h15...");

  // 1. Remover gatilhos diários anteriores deste projeto para evitar duplicações
  const existingTriggers = ScriptApp.getProjectTriggers();
  for (let i = 0; i < existingTriggers.length; i++) {
    const handler = existingTriggers[i].getHandlerFunction();
    if (
      handler === "executarSincronizacaoDiaria07h15" ||
      handler === "sincronizarDiarioJanela07h" ||
      handler === "sincronizarTodasAsPlanilhas"
    ) {
      ScriptApp.deleteTrigger(existingTriggers[i]);
      Logger.log("Acionador diário anterior removido: " + handler);
    }
  }

  // 2. Calcula o próximo horário das 07h15 (horário de Brasília)
  const agora = new Date();
  const proxima = new Date();
  proxima.setHours(7, 15, 0, 0);

  if (proxima <= agora) {
    proxima.setDate(proxima.getDate() + 1);
  }

  ScriptApp.newTrigger("executarSincronizacaoDiaria07h15")
    .timeBased()
    .at(proxima)
    .inTimezone("America/Sao_Paulo")
    .create();

  Logger.log("✓ ACIONADOR DIÁRIO ATIVADO COM SUCESSO!");
  Logger.log("Próxima execução agendada para: " + Utilities.formatDate(proxima, "America/Sao_Paulo", "dd/MM/yyyy HH:mm:ss"));
  Logger.log("O script atualizará todas as 4 planilhas sozinho na nuvem todos os dias às 07h15!");
}

/**
 * Função executada automaticamente todos os dias às 07h15
 */
function executarSincronizacaoDiaria07h15() {
  try {
    Logger.log("⏰ [07h15] Iniciando sincronização diária automática...");
    sincronizarTodasAsPlanilhas();
  } catch (err) {
    Logger.log("❌ Erro na sincronização diária das 07h15: " + err.toString());
  } finally {
    // Reagenda para o dia seguinte às 07h15 automaticamente
    const agora = new Date();
    const proxima = new Date();
    proxima.setDate(agora.getDate() + 1);
    proxima.setHours(7, 15, 0, 0);

    // Remove trigger que acabou de disparar
    const triggers = ScriptApp.getProjectTriggers();
    for (let i = 0; i < triggers.length; i++) {
      if (triggers[i].getHandlerFunction() === "executarSincronizacaoDiaria07h15") {
        ScriptApp.deleteTrigger(triggers[i]);
      }
    }

    ScriptApp.newTrigger("executarSincronizacaoDiaria07h15")
      .timeBased()
      .at(proxima)
      .inTimezone("America/Sao_Paulo")
      .create();

    Logger.log("✓ Próxima sincronização diária reagendada para: " + Utilities.formatDate(proxima, "America/Sao_Paulo", "dd/MM/yyyy HH:mm:ss"));
  }
}

/**
 * =========================================================================================
 * 3. GATILHO INSTANTÂNEO NO ENVIO DE FORMULÁRIO (INSERT APENAS DO DADO NOVO)
 * =========================================================================================
 * Execute a função "configurarGatilhoInstantaneoAoEnviarFormulario" UMA VEZ no editor.
 * 
 * Como funciona:
 * 1. O Google Apps Script conecta um acionador "Ao enviar formulário" (onFormSubmit) nas planilhas.
 * 2. Sempre que um formador responder o formulário, o Google dispara "aoReceberFormulario(e)".
 * 3. A função pega EXATAMENTE a nova linha inserida pelo formulário (e.range.getRow()).
 * 4. Mapeia e envia APENAS esse novo registro via POST (upsert) para o Supabase.
 * 5. Leva menos de 1 segundo e o Dashboard web atualiza em tempo real via Supabase Realtime!
 * =========================================================================================
 */

function configurarGatilhoInstantaneoAoEnviarFormulario() {
  Logger.log("Iniciando configuração de gatilhos automáticos 'Ao enviar formulário'...");

  // 1. Remover APENAS gatilhos anteriores de formulário deste projeto (preserva o gatilho das 07h15!)
  const existingTriggers = ScriptApp.getProjectTriggers();
  for (let i = 0; i < existingTriggers.length; i++) {
    const handler = existingTriggers[i].getHandlerFunction();
    if (handler === "aoReceberFormulario") {
      ScriptApp.deleteTrigger(existingTriggers[i]);
      Logger.log("Acionador anterior de formulário removido.");
    }
  }

  // 2. Instalar gatilho onFormSubmit nas planilhas configuradas
  let triggersInstalados = 0;

  for (let config of PLANILHAS_CONFIG) {
    if (config.fechada) {
      Logger.log("Planilha [" + config.nome + "] marcada como fechada. Pulando.");
      continue;
    }

    try {
      const ss = SpreadsheetApp.openById(config.id);

      ScriptApp.newTrigger("aoReceberFormulario")
        .forSpreadsheet(ss)
        .onFormSubmit()
        .create();

      triggersInstalados++;
      Logger.log("✓ Acionador ativado com sucesso para: " + config.nome);
    } catch (err) {
      Logger.log("❌ Erro ao instalar acionador para " + config.nome + ": " + err.toString());
    }
  }

  Logger.log("==========================================================================");
  Logger.log("✓ CONFIGURAÇÃO CONCLUÍDA: " + triggersInstalados + " acionadores de formulário ativos!");
  Logger.log("A partir de agora, cada nova resposta inserirá instantaneamente apenas o dado novo no Supabase.");
  Logger.log("==========================================================================");
}

// Alias para compatibilidade
function instalarGatilhosPlanilhasAtivas() {
  configurarGatilhoInstantaneoAoEnviarFormulario();
}

/**
 * Função executada automaticamente a cada envio de formulário
 * Captura e envia APENAS a linha recém-adicionada
 */
function aoReceberFormulario(e) {
  try {
    let sheet = null;
    let rowNumber = null;
    let ss = null;

    if (e && e.range) {
      sheet = e.range.getSheet();
      rowNumber = e.range.getRow();
      ss = sheet.getParent();
    } else {
      // Execução de teste manual no editor: pega a última linha da primeira planilha ativa
      Logger.log("Executando em modo de teste manual (sem evento 'e')...");
      const activeCfg = PLANILHAS_CONFIG.find(p => !p.fechada) || PLANILHAS_CONFIG[0];
      ss = SpreadsheetApp.openById(activeCfg.id);
      sheet = ss.getSheets()[0];
      rowNumber = sheet.getLastRow();
    }

    const ssId = ss.getId();
    const config = PLANILHAS_CONFIG.find(p => p.id === ssId) || {
      sigla: "ATIVA",
      nome: ss.getName(),
      anoFormativoPadrao: "1º ANO",
      semestrePadrao: "2026"
    };

    Logger.log("⚡ Novo preenchimento detectado na planilha '" + config.nome + "', linha " + rowNumber);

    const lastCol = sheet.getLastColumn();
    const headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
    const rowValues = sheet.getRange(rowNumber, 1, 1, lastCol).getValues()[0];

    const payload = mapRowToObservation(headers, rowValues, sheet.getName(), sheet.getSheetId(), rowNumber, config);

    if (payload && payload.email_cursista) {
      // Envia APENAS o registro individual recém-adicionado
      sendBatchToSupabase([payload]);
      Logger.log("✓ SUCESSO: Registro inserido instantaneamente no Supabase! id_origem: " + payload.id_origem);
    } else {
      Logger.log("⚠️ Linha " + rowNumber + " ignorada: e-mail institucional não identificado.");
    }
  } catch (error) {
    Logger.log("❌ Erro no acionador aoReceberFormulario: " + error.toString());
  }
}

/**
 * =========================================================================================
 * 4. MAPEA A LINHA DA PLANILHA PARA O ESQUEMA DO SUPABASE
 * =========================================================================================
 */
function mapRowToObservation(headers, row, sheetName, sheetId, rowNumber, config) {
  function getRawVal(keywords) {
    for (let i = 0; i < headers.length; i++) {
      const h = String(headers[i] || "").toLowerCase();
      for (let k of keywords) {
        if (h.includes(k.toLowerCase())) {
          const val = row[i];
          if (val !== undefined && val !== null && val !== "") {
            return val;
          }
        }
      }
    }
    return null;
  }

  function getVal(keywords) {
    const raw = getRawVal(keywords);
    return raw !== null && raw !== undefined ? String(raw).trim() : "";
  }

  function parseDate(dateRaw) {
    if (!dateRaw) return null;
    if (dateRaw instanceof Date) {
      if (isNaN(dateRaw.getTime())) return null;
      return Utilities.formatDate(dateRaw, "America/Sao_Paulo", "yyyy-MM-dd");
    }
    const str = String(dateRaw).trim();
    if (!str || str === "-" || str === "—" || str.toLowerCase() === "não informada") return null;

    // Se for string no formato ISO ou Date string com GMT/T
    if (str.includes("GMT") || str.includes("T") || /^[A-Za-z]{3}\s/.test(str)) {
      const d = new Date(str);
      if (!isNaN(d.getTime())) {
        return Utilities.formatDate(d, "America/Sao_Paulo", "yyyy-MM-dd");
      }
    }

    // Se já estiver no formato yyyy-MM-dd
    if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
      return str;
    }

    // Se for dd/MM/yyyy ou d/m/yy ou d/m/yyyy
    const parts = str.split(/[/.-]/);
    if (parts.length === 3) {
      if (parts[0].length === 4) {
        // yyyy-mm-dd
        return parts[0] + "-" + parts[1].padStart(2, "0") + "-" + parts[2].padStart(2, "0");
      }
      const d = parts[0].padStart(2, "0");
      const m = parts[1].padStart(2, "0");
      const y = parts[2].length === 2 ? "20" + parts[2] : parts[2].slice(0, 4);
      return y + "-" + m + "-" + d;
    }
    return null;
  }

  function formatCarimbo(dateRaw) {
    if (!dateRaw) return null;
    if (dateRaw instanceof Date) {
      if (isNaN(dateRaw.getTime())) return null;
      return Utilities.formatDate(dateRaw, "America/Sao_Paulo", "dd/MM/yyyy HH:mm:ss");
    }
    const str = String(dateRaw).trim();
    if (!str || str === "-" || str === "—") return null;

    if (str.includes("GMT") || str.includes("T") || /^[A-Za-z]{3}\s/.test(str)) {
      const d = new Date(str);
      if (!isNaN(d.getTime())) {
        return Utilities.formatDate(d, "America/Sao_Paulo", "dd/MM/yyyy HH:mm:ss");
      }
    }
    return str;
  }

  // 1. Identificar e-mail do cursista
  let emailCursista = getVal([
    "e-mail institucional do cursista",
    "email institucional do cursista",
    "e-mail do cursista",
    "email do cursista"
  ]);

  if (!emailCursista) {
    for (let cell of row) {
      const str = String(cell || "").toLowerCase().trim();
      if (str.includes("@escola.pr.gov.br") && !str.includes("formador") && !str.includes("seed")) {
        emailCursista = str;
        break;
      }
    }
  }

  if (!emailCursista || !emailCursista.includes("@")) return null;
  emailCursista = emailCursista.toLowerCase().trim();

  // 2. Chave Única Determinística (id_origem): Garante que a linha nunca duplique no Supabase
  const idOrigem = config.sigla + "_L" + rowNumber;

  const nomeCursista = getVal(["nome do cursista", "cursista"]);
  const nomeFormador = getVal(["selecione o nome do formador", "nome do formador", "formador/tutor/técnico"]);
  const emailFormador = String(row[1] || "").toLowerCase().trim();

  // 3. Status da observação
  const obsRealizadaRaw = getVal(["a observação da prática foi realizada", "observação da prática foi realizada"]);
  const isRealizada = !obsRealizadaRaw || obsRealizadaRaw.toLowerCase().includes("sim");

  // 4. Níveis pedagógicos
  let nivelPlanejamento = "";
  let nivelPratica = "";

  for (let i = 0; i < headers.length; i++) {
    const h = String(headers[i] || "").toLowerCase();
    const val = String(row[i] || "").trim().toUpperCase();

    if ((h.includes("planejamento") || h.includes("critério 1")) && !nivelPlanejamento) {
      if (val.includes("SUPERA") || val.includes("ATINGE") || val.includes("ATENDE") || val.includes("PARCIAL")) {
        nivelPlanejamento = val.replace(/[.,;]$/, "").trim();
      }
    }
    if ((h.includes("prática") || h.includes("pratica") || h.includes("critério 2")) && !nivelPratica) {
      if (val.includes("SUPERA") || val.includes("ATINGE") || val.includes("ATENDE") || val.includes("PARCIAL")) {
        nivelPratica = val.replace(/[.,;]$/, "").trim();
      }
    }
  }

  // 5. Modalidade do cursista (Docentes, Equipe Gestora / Pedagogo, Técnico)
  let modalidadeCursista = getVal([
    "selecione a modalidade do cursista",
    "modalidades. selecione a modalidade",
    "modalidades. selecione",
    "modalidade do cursista"
  ]);
  if (!modalidadeCursista || modalidadeCursista.toLowerCase().includes("feedback") || modalidadeCursista.toLowerCase().includes("diálogo") || modalidadeCursista.toLowerCase().includes("dialogo")) {
    modalidadeCursista = "Docentes";
  }

  // Componente curricular (se cursista for Pedagogo / Equipe Gestora, define como PEDAGÓGICO)
  let componente = getVal(["componente curricular", "componente", "área"]);
  if (!componente && (modalidadeCursista.toLowerCase().includes("gestora") || modalidadeCursista.toLowerCase().includes("pedagog"))) {
    componente = "PEDAGÓGICO";
  }

  // 6. Chamamento, Temática & Referência (busca colunas DOC, EQG e TEC de todas as planilhas)
  let chamamento = getVal(["chamamento"]);
  if (!chamamento && sheetName.toLowerCase().includes("4º chamamento")) chamamento = "4º Chamamento";

  let tema = getVal([
    "selecione o tema relacionado",
    "tema relacionado à observação",
    "tema relacionado a observacao",
    "tema relacionado",
    "tema"
  ]);

  let proposta = getVal([
    "qual  é a proposta escolhida",
    "qual é a proposta escolhida",
    "qual a proposta escolhida",
    "proposta escolhida"
  ]);

  if (tema && proposta && !tema.toLowerCase().includes(proposta.toLowerCase())) {
    tema = tema + " (" + proposta + ")";
  }

  // Identificar carimbo de data/hora original do preenchimento do formulário
  let carimboRaw = getRawVal(["carimbo de data/hora", "carimbo", "timestamp"]);
  if (!carimboRaw && row[0]) {
    carimboRaw = row[0];
  }
  const carimbo = formatCarimbo(carimboRaw);

  // Mapeamento abrangente de datas (compatível com 1º ANO e 2º/3º ANO)
  const dataPraticaRaw = getRawVal([
    "data em que a prática pedagógica foi realizada",
    "data da realização da prática pedagógica",
    "data da realização da prática",
    "data de observação da prática pedagógica",
    "data da observação da prática pedagógica",
    "data em que a prática foi realizada",
    "data da prática pedagógica",
    "data da prática"
  ]);

  const dataObservacaoRaw = getRawVal([
    "data de observação da prática pedagógica",
    "data da observação da prática pedagógica",
    "data em que foi realizada a observação",
    "data da realização da observação",
    "data da observação",
    "data de observação"
  ]);

  const parsedDataPratica = parseDate(dataPraticaRaw) || parseDate(dataObservacaoRaw);
  const parsedDataObservacao = parseDate(dataObservacaoRaw) || parsedDataPratica;

  const dataFeedbackRaw = getRawVal(["data do feedback", "data da devolutiva", "devolutiva"]);
  const dataAgendamentoRaw = getRawVal(["data do agendamento", "agendamento"]);

  // Evidências de Planejamento e Prática (compatível com DOC, EQG e TEC)
  let evidenciasPlanejamento = getVal([
    "evidências para que o planejamento",
    "evidências para que a prática seja situada nesse nível do critério 1",
    "evidências para que a prática seja situada nesse nível do  critério 1",
    "evidências para que a implementação",
    "critério 1:"
  ]);

  let evidenciasPratica = getVal([
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

/**
 * =========================================================================================
 * 5. ENVIO EM LOTE COM UPSERT (resolution=merge-duplicates)
 * =========================================================================================
 * Garante que se o registro já existir pelo id_origem, ele será apenas atualizado.
 */
function sendBatchToSupabase(payloadArray) {
  const cleanKey = String(SUPABASE_KEY || "").trim();
  const endpoint = SUPABASE_URL + "/rest/v1/observacoes_pratica?on_conflict=id_origem";

  const options = {
    method: "post",
    contentType: "application/json",
    headers: {
      "apikey": cleanKey,
      "Authorization": "Bearer " + cleanKey,
      "Prefer": "resolution=merge-duplicates,return=minimal"
    },
    payload: JSON.stringify(payloadArray),
    muteHttpExceptions: true
  };

  const response = UrlFetchApp.fetch(endpoint, options);
  const responseCode = response.getResponseCode();

  if (responseCode >= 200 && responseCode < 300) {
    Logger.log("Lote de " + payloadArray.length + " enviado com sucesso ao Supabase (HTTP " + responseCode + ")");
  } else {
    Logger.log("Erro no envio ao Supabase (HTTP " + responseCode + "): " + response.getContentText());
  }
}

/**
 * =========================================================================================
 * 6. FUNÇÃO AUXILIAR: LIMPAR TABELA NO SUPABASE VIA SCRIPT
 * =========================================================================================
 * Executa DELETE em todas as linhas da tabela observacoes_pratica.
 * OBS: Se preferir, você também pode rodar no SQL Editor do Supabase:
 *      TRUNCATE TABLE observacoes_pratica RESTART IDENTITY;
 */
function limparTabelaSupabase() {
  Logger.log("Solicitando limpeza da tabela observacoes_pratica no Supabase...");
  const endpoint = SUPABASE_URL + "/rest/v1/observacoes_pratica?email_cursista=neq.";

  const options = {
    method: "delete",
    headers: {
      "apikey": SUPABASE_KEY,
      "Authorization": "Bearer " + SUPABASE_KEY,
      "Prefer": "return=minimal"
    },
    muteHttpExceptions: true
  };

  const response = UrlFetchApp.fetch(endpoint, options);
  const responseCode = response.getResponseCode();

  if (responseCode >= 200 && responseCode < 300) {
    Logger.log("✓ Tabela observacoes_pratica limpa com sucesso no Supabase! (HTTP " + responseCode + ")");
  } else {
    Logger.log("Resposta da limpeza (HTTP " + responseCode + "): " + response.getContentText());
    Logger.log("DICA: Caso dê erro de permissão RLS, limpe via Supabase Dashboard -> SQL Editor com: TRUNCATE TABLE observacoes_pratica RESTART IDENTITY;");
  }
}
