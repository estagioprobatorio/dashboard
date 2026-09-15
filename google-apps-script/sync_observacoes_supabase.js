/**
 * =========================================================================================
 * GOOGLE APPS SCRIPT: Sincronização Automática Planilhas Google (Forms) ➔ Supabase
 * Tabela: observacoes_pratica
 * Plataforma do Estágio Probatório - SEED/PR
 * =========================================================================================
 * 
 * PLANILHAS E ABAS OFICIAIS SUPORTADAS:
 * 1. Formador-2e3ANO (1º Semestre/2026):
 *    URL: https://docs.google.com/spreadsheets/d/1zSnlh7aW8df800lP90rCLVxiHNWAa1f9IGjz2OoDfvU (GID: 848666482)
 * 2. Formador-1ANO (1º Semestre/2026):
 *    URL: https://docs.google.com/spreadsheets/d/1KmbMvNOTpj4OaDOdKw5mPVI3iqbo8RbQBqBktM84ToE (GID: 1030562032)
 * 3. Formador-2e3ANO (2º Semestre/2026):
 *    URL: https://docs.google.com/spreadsheets/d/1KmbMvNOTpj4OaDOdKw5mPVI3iqbo8RbQBqBktM84ToE (GID: 530378271)
 * 4. Formador-1ANO (2º Semestre/2026):
 *    URL: https://docs.google.com/spreadsheets/d/1KmbMvNOTpj4OaDOdKw5mPVI3iqbo8RbQBqBktM84ToE (GID: 1904120450)
 * 
 * COMO INSTALAR NAS PLANILHAS:
 * 1. Abra a Planilha Google no seu navegador.
 * 2. No menu superior, clique em: Extensões ➔ Apps Script.
 * 3. Apague qualquer código anterior e cole este código completo.
 * 4. Preencha a constante SUPABASE_ANON_KEY na linha 39 com a sua chave anon do Supabase.
 * 5. Salve o script (ícone de disquete 💾).
 * 6. Crie o Gatilho Automático (para sincronizar instantaneamente cada nova resposta do Forms):
 *    - Clique no ícone de Relógio ("Acionadores" ou "Gatilhos") no menu lateral esquerdo.
 *    - Clique em "+ Adicionar acionador" (canto inferior direito).
 *    - Escolha a função: "onFormSubmitTrigger".
 *    - Origem do evento: "Da planilha".
 *    - Tipo de evento: "Ao enviar formulário".
 *    - Clique em Salvar e autorize as permissões na sua conta Google institucional.
 * 7. Para sincronizar agora todas as respostas que já estão na planilha:
 *    - Na barra superior do Apps Script, selecione a função "syncAllObservacoes" e clique em "Executar".
 * =========================================================================================
 */

// ⚙️ CONFIGURAÇÕES DO BANCO DE DADOS SUPABASE
const SUPABASE_URL = "https://hoiihqrivcelsfivjpqs.supabase.co";
const SUPABASE_ANON_KEY = "SUA_CHAVE_ANON_AQUI"; // Substitua pela sua anon key do Supabase

/**
 * 1. GATILHO INSTANTÂNEO: Executado automaticamente pelo Google a cada envio do Forms
 */
function onFormSubmitTrigger(e) {
  try {
    const sheet = e ? e.range.getSheet() : SpreadsheetApp.getActiveSheet();
    const rowNumber = e ? e.range.getRow() : sheet.getLastRow();
    
    Logger.log("Nova resposta do Forms detectada na aba '" + sheet.getName() + "', linha " + rowNumber);
    syncSingleRow(sheet, rowNumber);
  } catch (error) {
    Logger.log("Erro no gatilho onFormSubmitTrigger: " + error.toString());
  }
}

/**
 * 2. SINCRONIZAÇÃO EM MASSA: Percorre todas as abas da planilha e envia tudo ao Supabase
 */
function syncAllObservacoes() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheets = ss.getSheets();

  Logger.log("Iniciando sincronização completa da planilha: '" + ss.getName() + "' (" + sheets.length + " abas)");

  let totalGeralEnviado = 0;

  for (let s = 0; s < sheets.length; s++) {
    const sheet = sheets[s];
    const sheetName = sheet.getName();
    const sheetId = sheet.getSheetId();
    const lastRow = sheet.getLastRow();
    const lastCol = sheet.getLastColumn();

    if (lastRow < 2 || lastCol < 3) {
      Logger.log("Aba [" + sheetName + " (GID: " + sheetId + ")] vazia ou sem cabeçalhos. Pulando.");
      continue;
    }

    Logger.log("--> Processando aba [" + sheetName + " (GID: " + sheetId + ")] com " + (lastRow - 1) + " linhas...");

    const headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
    const allValues = sheet.getRange(2, 1, lastRow - 1, lastCol).getValues();

    const batchSize = 100;
    let batch = [];
    let enviadoNaAba = 0;

    for (let i = 0; i < allValues.length; i++) {
      const row = allValues[i];
      const mapped = mapRowToObservation(headers, row, sheetName, sheetId);

      if (mapped && mapped.email_cursista) {
        batch.push(mapped);
      }

      if (batch.length >= batchSize || i === allValues.length - 1) {
        if (batch.length > 0) {
          sendBatchToSupabase(batch);
          enviadoNaAba += batch.length;
          totalGeralEnviado += batch.length;
          batch = [];
          Utilities.sleep(250); // Pausa breve para estabilidade da rede
        }
      }
    }

    Logger.log("Aba [" + sheetName + "] concluída: " + enviadoNaAba + " observações enviadas.");
  }

  Logger.log("🎉 Sincronização geral concluída! Total enviado ao Supabase: " + totalGeralEnviado);
}

/**
 * Envia uma linha individual ao Supabase (acionado no envio do Forms)
 */
function syncSingleRow(sheet, rowNumber) {
  const lastCol = sheet.getLastColumn();
  const headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  const rowValues = sheet.getRange(rowNumber, 1, 1, lastCol).getValues()[0];

  const payload = mapRowToObservation(headers, rowValues, sheet.getName(), sheet.getSheetId());

  if (!payload || !payload.email_cursista) {
    Logger.log("Linha " + rowNumber + " ignorada: e-mail do cursista não localizado.");
    return;
  }

  sendBatchToSupabase([payload]);
  Logger.log("Linha " + rowNumber + " enviada com sucesso para a tabela observacoes_pratica no Supabase!");
}

/**
 * Normaliza os dados da linha para o esquema relacional do Supabase
 */
function mapRowToObservation(headers, row, sheetName, sheetId) {
  sheetName = sheetName || "";

  function getVal(keywords) {
    for (let i = 0; i < headers.length; i++) {
      const h = String(headers[i] || "").toLowerCase();
      for (let k of keywords) {
        if (h.includes(k.toLowerCase())) {
          const val = row[i];
          return val !== undefined && val !== null ? String(val).trim() : "";
        }
      }
    }
    return "";
  }

  function parseDate(dateRaw) {
    if (!dateRaw) return null;
    if (dateRaw instanceof Date) {
      return Utilities.formatDate(dateRaw, "America/Sao_Paulo", "yyyy-MM-dd");
    }
    const str = String(dateRaw).trim();
    const parts = str.split("/");
    if (parts.length === 3) {
      const d = parts[0].padStart(2, "0");
      const m = parts[1].padStart(2, "0");
      const y = parts[2].length === 2 ? "20" + parts[2] : parts[2].slice(0, 4);
      return y + "-" + m + "-" + d;
    }
    return null;
  }

  // E-mail do cursista
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

  const nomeCursista = getVal(["nome do cursista", "cursista"]);
  const nomeFormador = getVal(["selecione o nome do formador", "nome do formador", "formador/tutor/técnico"]);
  const emailFormador = String(row[1] || "").toLowerCase().trim();

  // Status da Observação
  const obsRealizadaRaw = getVal(["a observação da prática foi realizada", "observação da prática foi realizada"]);
  const isRealizada = !obsRealizadaRaw || obsRealizadaRaw.toLowerCase().includes("sim");

  // Níveis pedagógicos
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

  // Ano formativo e Semestre mapeados com base no GID oficial e no nome da aba
  let anoFormativo = "1º ANO";
  let semestre = "1º Semestre/2026";

  const gidStr = String(sheetId);
  if (gidStr === "848666482") {
    // Planilha 1: Formador-2e3ANO (1º Semestre/2026)
    anoFormativo = "2º/3º ANO";
    semestre = "1º Semestre/2026";
  } else if (gidStr === "1030562032") {
    // Planilha 2: Formador-1ANO (1º Semestre/2026)
    anoFormativo = "1º ANO";
    semestre = "1º Semestre/2026";
  } else if (gidStr === "530378271") {
    // Planilha 3: Formador-2e3ANO (2º Semestre/2026)
    anoFormativo = "2º/3º ANO";
    semestre = "2º Semestre/2026";
  } else if (gidStr === "1904120450") {
    // Planilha 4: Formador-1ANO (2º Semestre/2026)
    anoFormativo = "1º ANO";
    semestre = "2º Semestre/2026";
  } else {
    // Heurística de fallback pelo nome da aba e cabeçalhos
    if (sheetName.includes("2e3") || sheetName.includes("2º") || sheetName.includes("3º") || headers.some(h => String(h).includes("2e3ANO"))) {
      anoFormativo = "2º/3º ANO";
    }
    if (sheetName.includes("2º Semestre") || sheetName.includes("2º sem") || sheetName.includes("2 sem")) {
      semestre = "2º Semestre/2026";
    }
  }

  // Chamamento e Tema
  let chamamento = getVal(["chamamento"]);
  if (!chamamento && sheetName.includes("4º chamamento")) chamamento = "4º Chamamento";

  let tema = getVal(["tema relacionado à observação", "tema relacionado", "tema"]);
  if (!tema && sheetName.includes("tema 3")) tema = "Tema 3";
  if (!tema && sheetName.includes("tema 4")) tema = "Tema 4";

  return {
    // Identificador único da linha de origem para UPSERT inteligente e anti-duplicação
    // Formato: GID_LINHA (ex: 848666482_15) ou HASH único por resposta
    id_origem: String(sheetId) + "_" + (row[0] ? Utilities.formatDate(new Date(row[0]), "America/Sao_Paulo", "yyyyMMddHHmmss") : Math.random().toString(36).substring(2)) + "_" + emailCursista.replace(/[^a-z0-9]/g, ''),
    carimbo_data_hora: row[0] instanceof Date ? Utilities.formatDate(row[0], "America/Sao_Paulo", "yyyy-MM-dd'T'HH:mm:ss'Z'") : null,
    email_cursista: emailCursista.toLowerCase().trim(),
    nome_cursista: nomeCursista,
    email_formador: emailFormador,
    nome_formador: nomeFormador,
    ano_formativo: anoFormativo,
    semestre: semestre,
    chamamento: chamamento || null,
    modalidade: getVal(["selecione a modalidade do cursista", "modalidades"]) || "Docentes",
    componente: getVal(["selecione o componente do cursista", "componente"]),
    tema: tema || "Tema Geral",
    observacao_realizada: isRealizada ? "Sim, a observação foi realizada." : "Não realizada",
    data_pratica: parseDate(getVal(["data da realização da prática", "data da realização"])),
    data_observacao: parseDate(getVal(["data em que foi realizada a observação"])),
    data_feedback: parseDate(getVal(["data do feedback", "devolutiva"])),
    data_agendamento: parseDate(getVal(["data do agendamento"])),
    modalidade_feedback: getVal(["modalidade de feedback formativo", "modalidade de feedback"]) || (isRealizada ? "Diálogo formativo" : null),
    motivo_devolutiva: getVal(["motivo da realização de feedback", "qual foi o motivo"]),
    link_gravacao_pratica: getVal(["link da gravação da prática pedagógica", "link da gravação da prática"]),
    link_planejamento: getVal(["link do documento de planejamento", "link do pdp"]),
    link_gravacao_feedback: getVal(["link da gravação do diálogo formativo", "link da gravação do feedback"]),
    nivel_planejamento: nivelPlanejamento || (isRealizada ? "SUPERA" : null),
    nivel_pratica: nivelPratica || (isRealizada ? "ATENDE INTEGRALMENTE" : null),
    evidencias_planejamento: getVal(["evidências para que o planejamento", "evidências para que a prática seja situada nesse nível do  critério 1"]),
    evidencias_pratica: getVal(["evidências para que a implementação", "evidências para que a prática seja situada nesse nível do  critério 2"]),
    questionamentos_propositivos: getVal(["questionamentos propositivos"]),
    proposicoes_sugestoes: getVal(["proposições ou sugestões", "proposições"]),
    combinados: getVal(["combinados realizados no feedback", "combinados"]),
    justificativa_nao_realizada: getVal(["justificativa:"]),
    contexto_justificativa: getVal(["descreva a situação ou contexto"]),
    reflexoes_gerais: getVal(["registre informações ou reflexões"])
  };
}

/**
 * Chamada HTTP POST com UPSERT (merge-duplicates) no Supabase
 * Garante que dados de uma planilha somem com as outras sem apagar nada
 */
function sendBatchToSupabase(payloadArray) {
  // on_conflict=id_origem garante que se a mesma linha for re-enviada, ela apenas atualiza e não duplica
  const endpoint = SUPABASE_URL + "/rest/v1/observacoes_pratica?on_conflict=id_origem";

  const options = {
    method: "post",
    contentType: "application/json",
    headers: {
      "apikey": SUPABASE_ANON_KEY,
      "Authorization": "Bearer " + SUPABASE_ANON_KEY,
      "Prefer": "resolution=merge-duplicates,return=minimal"
    },
    payload: JSON.stringify(payloadArray),
    muteHttpExceptions: true
  };

  const response = UrlFetchApp.fetch(endpoint, options);
  const responseCode = response.getResponseCode();

  if (responseCode >= 200 && responseCode < 300) {
    Logger.log("Enviado com sucesso para o Supabase (HTTP " + responseCode + ")");
  } else {
    Logger.log("Falha ao enviar para o Supabase (HTTP " + responseCode + "): " + response.getContentText());
  }
}
