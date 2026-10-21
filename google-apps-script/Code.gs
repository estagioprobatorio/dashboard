/**
 * GOOGLE APPS SCRIPT - SINCRONIZAÇÃO DA PLANILHA GOOGLE COM O SUPABASE
 * 
 * Versão atualizada para o novo schema do CSV "planilha-dados-atualizado":
 *   - turma   → turmas
 *   - Link Classroom / ID_classroom → link / id_classroom  
 *   - cpf_cursista → cpf
 *   - Campos novos: periodo_ini, nre_exe, munic_exe, componente_formador,
 *                   componente_turma-suprida, rg_formador, telefone_formador,
 *                   nre_formador, telefone_tutor, observacoes_*
 * 
 * Instalação:
 * 1. Abra sua planilha Google com os dados.
 * 2. Clique em Extensões -> Apps Script.
 * 3. Substitua todo o conteúdo pelo código abaixo.
 * 4. Salve, publique como App Web e recarregue a planilha.
 *
 * REGISTRO DE MOVIMENTAÇÕES DE TURMA:
 * Requer o arquivo adicional "Movimentacoes.gs" (registrar_movimentacoes_turma.js)
 * no mesmo projeto. Ele fornece:
 *   - registrarMovimentacoesDeTurma()      (chamada no syncAllData)
 *   - registrarMovimentoPorEdicao_(...)    (chamada no handleEdit)
 */

// ==============================================================================
// CONFIGURAÇÕES DO SUPABASE
// ==============================================================================
const SUPABASE_URL = "https://hoiihqrivcelsfivjpqs.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhvaWlocXJpdmNlbHNmaXZqcHFzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU4NTcyNjcsImV4cCI6MjEwMTQzMzI2N30.HELd7SnBkp7f8JhAVusY-KiKCJ7Uum8-qndRMYk-3Is"; 

const SHEET_DADOS = "DADOS";
const SHEET_TUTORES = "TUTORES";

// ==============================================================================
// 1. MENU
// ==============================================================================
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('Funções Admin')
    .addItem('Atualizar Dashboard (Cursistas)', 'syncAllData')
    .addItem('Atualizar Tutores', 'syncTutoresData')
    .addToUi();
}

// ==============================================================================
// 2. GATILHO DE EDIÇÃO (Instalável)
//    Só funciona quando disparado por uma edição real na planilha.
//    NÃO execute pelo botão "Executar" do editor (o parâmetro "e" virá vazio).
// ==============================================================================
function handleEdit(e) {
  try {
    if (!e || !e.range) return; // protege contra execução manual pelo editor

    const sheet = e.range.getSheet();
    if (sheet.getName() !== SHEET_DADOS) return;
    const row = e.range.getRow();
    if (row <= 1) return;

    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    const rowValues = sheet.getRange(row, 1, 1, sheet.getLastColumn()).getValues()[0];

    const record = {};
    headers.forEach((header, index) => {
      if (header) record[String(header).trim()] = rowValues[index];
    });

    // Registra remanejamento de turma (se a célula editada for da coluna "turmas")
    try {
      registrarMovimentoPorEdicao_(e, headers, record);
    } catch (errMov) {
      Logger.log("Aviso: movimentação não registrada na edição: " + errMov.toString());
    }

    const payload = mapToSupabaseSchema(record);
    sendBatchToSupabaseTable([payload], "cursistas", "chave_matricula");
  } catch (err) {
    Logger.log("Erro no handleEdit: " + err.toString());
  }
}

// ==============================================================================
// 3. RECEBIMENTO DE DADOS DO DASHBOARD (Dashboard → Planilha)
// ==============================================================================
function doPost(e) {
  try {
    const postData = JSON.parse(e.postData.contents);
    const action = postData.action;
    
    if (action === 'inviteTeacher') {
      const res = inviteTeacher(postData.courseId, postData.email);
      return ContentService.createTextOutput(JSON.stringify(res))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    if (action === 'updateRecord') {
      const data = postData.data;
      // ⚠️ turma_anterior agora vem como o valor da coluna "turmas" anterior
      const turmasAnterior = postData.turma_anterior;
      
      const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_DADOS);
      if (!sheet) {
        return ContentService.createTextOutput(JSON.stringify({ status: "error", message: "Aba DADOS não encontrada" }))
          .setMimeType(ContentService.MimeType.JSON);
      }
      
      const lastRow = sheet.getLastRow();
      const lastCol = sheet.getLastColumn();
      if (lastRow <= 1) {
        return ContentService.createTextOutput(JSON.stringify({ status: "error", message: "Nenhum dado na planilha" }))
          .setMimeType(ContentService.MimeType.JSON);
      }
      
      const headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
      const allData = sheet.getRange(2, 1, lastRow - 1, lastCol).getValues();
      
      // Encontra índices das colunas essenciais
      let cgmColIndex = -1;
      let turmasColIndex = -1;  // ← agora procura 'turmas' (não 'turma')
      
      headers.forEach((header, index) => {
        const cleanHeader = String(header).trim().toLowerCase();
        if (cleanHeader === 'cgm') cgmColIndex = index;
        if (cleanHeader === 'turmas') turmasColIndex = index;  // ← campo renomeado
      });
      
      let targetRowIndex = -1;
      
      // 1ª tentativa: CGM + turma anterior ou nova
      for (let i = 0; i < allData.length; i++) {
        const row = allData[i];
        const rowCgm = cgmColIndex !== -1 ? String(row[cgmColIndex]).trim() : '';
        const rowTurmas = turmasColIndex !== -1 ? String(row[turmasColIndex]).trim() : '';
        
        const matchCgm = data.cgm && String(data.cgm).trim() === rowCgm;
        
        if (matchCgm) {
          const checkTurmas = 
            (turmasAnterior && rowTurmas === String(turmasAnterior).trim()) || 
            (data.turmas && rowTurmas === String(data.turmas).trim());
          if (checkTurmas) {
            targetRowIndex = i;
            break;
          }
        }
      }
      
      // 2ª tentativa (fallback): apenas CGM
      if (targetRowIndex === -1) {
        for (let i = 0; i < allData.length; i++) {
          const row = allData[i];
          const rowCgm = cgmColIndex !== -1 ? String(row[cgmColIndex]).trim() : '';
          if (data.cgm && String(data.cgm).trim() === rowCgm) {
            targetRowIndex = i;
            break;
          }
        }
      }
      
      if (targetRowIndex === -1) {
        return ContentService.createTextOutput(JSON.stringify({ status: "error", message: "Cursista não encontrado na planilha" }))
          .setMimeType(ContentService.MimeType.JSON);
      }
      
      const sheetRow = targetRowIndex + 2;
      const newRowValues = [];
      headers.forEach((header) => {
        newRowValues.push(getValueForHeader(data, header));
      });
      
      sheet.getRange(sheetRow, 1, 1, lastCol).setValues([newRowValues]);
      
      return ContentService.createTextOutput(JSON.stringify({ status: "success", message: "Planilha atualizada com sucesso!" }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: "Ação desconhecida" }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// Helper para traduzir campos do payload de volta para cabeçalhos da planilha
function getValueForHeader(record, header) {
  if (!header) return '';
  const cleanHeader = String(header).trim();
  
  // Correspondência direta
  if (record[cleanHeader] !== undefined && record[cleanHeader] !== null) {
    return record[cleanHeader];
  }
  
  const lowerHeader = cleanHeader.toLowerCase();

  // e-mail do cursista
  if (['e-mail', 'email', 'e_mail'].includes(lowerHeader)) {
    return record['email'] || record['e-mail'] || '';
  }
  // e-mail do formador
  if (['e-mail_formador', 'email_formador', 'e_mail_formador'].includes(lowerHeader)) {
    return record['email_formador'] || record['e-mail_formador'] || '';
  }
  // e-mail do NRE
  if (['e-mail_nre', 'email_nre', 'e_mail_nre'].includes(lowerHeader)) {
    return record['email_nre'] || record['e-mail_nre'] || '';
  }
  // link do Classroom (novo campo: 'link')
  if (['link', 'link classroom', 'link_classroom'].includes(lowerHeader)) {
    return record['link'] || record['Link Classroom'] || record['link_classroom'] || '';
  }
  // id do Classroom (novo campo: 'id-classroom')
  if (['id-classroom', 'id_classroom', 'idclassroom'].includes(lowerHeader)) {
    return record['id_classroom'] || record['id-classroom'] || '';
  }
  // turmas (novo campo: 'turmas')
  if (['turmas', 'turma'].includes(lowerHeader)) {
    return record['turmas'] || record['turma'] || '';
  }
  // cpf do cursista
  if (['cpf', 'cpf_cursista'].includes(lowerHeader)) {
    return record['cpf'] || record['cpf_cursista'] || '';
  }
  
  return '';
}

// ==============================================================================
// 4. SINCRONIZAÇÃO COMPLETA: CURSISTAS
// ==============================================================================
function syncAllData() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_DADOS);
  if (!sheet) {
    SpreadsheetApp.getUi().alert("Aba '" + SHEET_DADOS + "' não encontrada!");
    return;
  }

  const ui = SpreadsheetApp.getUi();
  const resp = ui.alert(
    'Aviso de Sincronização de Cursistas',
    'Isso apagará os dados antigos de Cursistas no Supabase e subirá os dados da planilha. Deseja continuar?',
    ui.ButtonSet.YES_NO
  );
  if (resp !== ui.Button.YES) return;

  // Registra remanejamentos de turma ANTES de apagar os dados antigos do Supabase
  // (o Supabase é a "foto anterior" usada na comparação com a planilha)
  let movRegistradas = 0;
  try {
    movRegistradas = registrarMovimentacoesDeTurma();
  } catch (errMov) {
    Logger.log("Aviso: não foi possível registrar movimentações de turma: " + errMov.toString());
  }

  Logger.log("Limpando dados antigos de Cursistas...");
  truncateTable("cursistas", "nome_cursista=not.is.null");
  Utilities.sleep(2000);

  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const rows = data.slice(1);

  const seenEnrollments = {};
  let duplicateCount = 0;

  const payloadList = rows.map(rowValues => {
    const record = {};
    headers.forEach((header, index) => {
      if (header) record[String(header).trim()] = rowValues[index];
    });
    return mapToSupabaseSchema(record);
  }).filter(r => {
    const isValid = r.cgm || r.nome_cursista;
    if (!isValid) return false;
    
    if (r.chave_matricula) {
      if (seenEnrollments[r.chave_matricula]) {
        duplicateCount++;
        return false;
      }
      seenEnrollments[r.chave_matricula] = true;
    }
    return true;
  });

  Logger.log("Total de cursistas para sincronizar: " + payloadList.length);

  const batchSize = 100;
  for (let i = 0; i < payloadList.length; i += batchSize) {
    const batch = payloadList.slice(i, i + batchSize);
    sendBatchToSupabaseTable(batch, "cursistas", "chave_matricula");
    Utilities.sleep(1500); 
  }

  SpreadsheetApp.getUi().alert(
    "Sincronização de Cursistas concluída!\n\n" +
    "Enviados: " + payloadList.length + "\n" +
    "Duplicados ignorados: " + duplicateCount + "\n" +
    "Movimentações de turma registradas: " + movRegistradas
  );
}

// ==============================================================================
// 5. SINCRONIZAÇÃO COMPLETA: TUTORES
// ==============================================================================
function syncTutoresData() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_TUTORES);
  if (!sheet) {
    SpreadsheetApp.getUi().alert("Aba '" + SHEET_TUTORES + "' não encontrada!");
    return;
  }

  const ui = SpreadsheetApp.getUi();
  const resp = ui.alert(
    'Aviso de Sincronização de Tutores',
    'Isso apagará os dados antigos de Tutores no Supabase. Deseja continuar?',
    ui.ButtonSet.YES_NO
  );
  if (resp !== ui.Button.YES) return;

  Logger.log("Limpando dados antigos de Tutores...");
  truncateTable("tutores", "email_educ=not.is.null");
  Utilities.sleep(2000);

  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const rows = data.slice(1);

  const seenEmails = {};
  let duplicateCount = 0;

  const payloadList = rows.map(rowValues => {
    const record = {};
    headers.forEach((header, index) => {
      if (header) record[String(header).trim()] = rowValues[index];
    });
    return mapToTutorSchema(record);
  }).filter(t => {
    const isValid = t.email_educ && t.email_educ.includes('@');
    if (!isValid) return false;
    if (seenEmails[t.email_educ]) {
      duplicateCount++;
      return false;
    }
    seenEmails[t.email_educ] = true;
    return true;
  });

  const batchSize = 100;
  for (let i = 0; i < payloadList.length; i += batchSize) {
    sendBatchToSupabaseTable(payloadList.slice(i, i + batchSize), "tutores", "email_educ");
    Utilities.sleep(1500);
  }

  SpreadsheetApp.getUi().alert(
    "Sincronização de Tutores concluída!\n\n" +
    "Enviados: " + payloadList.length + "\n" +
    "Duplicados ignorados: " + duplicateCount
  );
}

// ==============================================================================
// HELPERS DE API
// ==============================================================================
function truncateTable(tableName, filterQuery) {
  const url = SUPABASE_URL + "/rest/v1/" + tableName + "?" + filterQuery;
  UrlFetchApp.fetch(url, {
    method: "delete",
    headers: { "apikey": SUPABASE_ANON_KEY, "Authorization": "Bearer " + SUPABASE_ANON_KEY },
    muteHttpExceptions: true
  });
}

function sendBatchToSupabaseTable(batch, tableName, conflictCol) {
  const url = SUPABASE_URL + "/rest/v1/" + tableName + "?on_conflict=" + conflictCol;
  const response = UrlFetchApp.fetch(url, {
    method: "post",
    contentType: "application/json",
    headers: {
      "apikey": SUPABASE_ANON_KEY,
      "Authorization": "Bearer " + SUPABASE_ANON_KEY,
      "Prefer": "resolution=merge-duplicates"
    },
    payload: JSON.stringify(batch),
    muteHttpExceptions: true
  });
  Logger.log("Supabase (" + tableName + "): " + response.getContentText());
}

// ==============================================================================
// MAPEADORES DE SCHEMA
// ==============================================================================
function mapToSupabaseSchema(item) {
  const clean = (val) => {
    if (val === undefined || val === null) return null;
    const str = String(val).trim();
    if (["#REF!", "#N/A", "#VALUE!", "#DIV/0!", "#NAME?"].includes(str)) return null;
    return str === "" ? null : str;
  };

  const cgmVal    = clean(item['cgm']) || '';
  const emailVal  = clean(item['e-mail'] || item['email']) || '';
  const nomeVal   = clean(item['nome_cursista'] || item['NOME_CURSISTA']) || '';
  
  // ── CAMPO RENOMEADO: turmas (era turma) ──────────────────────────────────
  const turmasVal = clean(item['turmas'] || item['turma']) || '';

  // Chave única de matrícula baseada em turmas
  const uniqueKey   = (cgmVal || emailVal || nomeVal).replace(/[^a-zA-Z0-9]/g, "");
  const uniqueTurma = turmasVal.replace(/[^a-zA-Z0-9]/g, "");
  const chaveMatricula = "EP-" + uniqueKey + "_" + uniqueTurma;

  return {
    chave_matricula:        chaveMatricula,
    cgm:                    cgmVal || null,
    nome_cursista:          nomeVal || 'CURSISTA',
    email:                  emailVal || null,
    // ── cpf (era cpf_cursista) ───────────────────────────────────────────
    cpf:                    clean(item['cpf'] || item['cpf_cursista']),
    rg:                     clean(item['rg']),
    periodo_ini:            clean(item['periodo_ini']),
    telefone_cursista:      clean(item['telefone_cursista']),
    chamamento:             clean(item['chamamento']),
    nre_exe:                clean(item['nre_exe']),
    munic_exe:              clean(item['munic_exe']),
    modalidade:             clean(item['modalidade']),
    componente:             clean(item['componente']),
    // ── CAMPO RENOMEADO: turmas (era turma) ──────────────────────────────
    turmas:                 turmasVal || null,
    dia_da_semana:          clean(item['dia_da_semana']),
    horario_inicial:        clean(item['horario_inicial']),
    horario_fim:            clean(item['horario_fim']),
    turno:                  clean(item['turno']),
    ano_formativo:          clean(item['ano_formativo']),
    nome_formador:          clean(item['nome_formador']),
    componente_formador:    clean(item['componente_formador']),
    componente_conc:        clean(item['componente_turma-suprida'] || item['componente_conc']),
    cpf_formador:           clean(item['cpf_formador']),
    rg_formador:            clean(item['rg_formador']),
    email_formador:         clean(item['e-mail_formador'] || item['email_formador']),
    telefone_formador:      clean(item['telefone_formador']),
    nre_formador:           clean(item['nre_formador']),
    tutor_responsavel:      clean(item['tutor_responsavel']),
    email_tutor:            clean(item['email_tutor']),
    telefone_tutor:         clean(item['telefone_tutor']),
    nre_tutor:              clean(item['nre_tutor']),
    email_nre:              clean(item['e-mail_nre'] || item['email_nre']),
    // ── link (era Link Classroom / link_classroom) ────────────────────────
    link:                   clean(item['link'] || item['Link Classroom'] || item['link_classroom']),
    // ── id_classroom (era ID_classroom) ──────────────────────────────────
    id_classroom:           clean(item['id-classroom'] || item['ID_classroom'] || item['id_classroom']),
    observacoes_cursista:   clean(item['observacoes_cursista']),
    observacoes_formador:   clean(item['observacoes_formador']),
    observacoes_tutor:      clean(item['observacoes_tutor']),
    observacoes_turma:      clean(item['observacoes_turma'])
  };
}

function mapToTutorSchema(item) {
  const clean = (val) => {
    if (val === undefined || val === null) return null;
    const str = String(val).trim();
    if (["#REF!", "#N/A", "#VALUE!"].includes(str)) return null;
    return str === "" ? null : str;
  };

  return {
    tutor_responsavel: clean(item['tutor_responsavel'] || item['TUTOR'] || item['nome_tutor']),
    rg:               clean(item['rg']),
    cpf:              clean(item['cpf']),
    email_adm:        clean(item['email_adm']),
    email_educ:       clean(item['email_educ']),
    nre_tutor:        clean(item['nre_tutor']),
    email_nre:        clean(item['email_nre'] || item['e-mail_nre']),
    telefone:         clean(item['telefone']),
    observacoes:      clean(item['observacoes'])
  };
}

// ==============================================================================
// GOOGLE CLASSROOM - CONVITE DE PROFESSORES
// ==============================================================================
function inviteTeacher(courseId, email) {
  if (!courseId) return { status: "error", message: "ID do Classroom não informado." };
  if (!email || !email.includes('@')) return { status: "error", message: "E-mail inválido." };

  const cleanCourseId = String(courseId).trim();
  const cleanEmail = String(email).trim().toLowerCase();

  try {
    try {
      const teacher = Classroom.Courses.Teachers.get(cleanCourseId, cleanEmail);
      if (teacher) return { status: "already_member", message: "Usuário já é professor nesta turma." };
    } catch (e) { /* não é professor, prosseguir */ }

    let invitations = [];
    try {
      const response = Classroom.Invitations.list({ courseId: cleanCourseId, userId: cleanEmail });
      invitations = response.invitations || [];
    } catch (e) { /* ignorar */ }

    const pendingInvite = invitations.find(inv => 
      inv.userId.toLowerCase() === cleanEmail && inv.role === "TEACHER"
    );
    if (pendingInvite) return { status: "already_invited", message: "Convite já está pendente." };

    const invitation = Classroom.Invitations.create({
      userId: cleanEmail,
      courseId: cleanCourseId,
      role: "TEACHER"
    });
    return { status: "success", invitationId: invitation.id, message: "Convite enviado com sucesso!" };
  } catch (err) {
    return { status: "error", message: "Erro na API do Classroom: " + err.toString() };
  }
}

function sincronizarConcluintesParaSupabase() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const aba = ss.getSheetByName("CONCLUINTES-1CH");
  if (!aba) {
    Logger.log("Aba CONCLUINTES-1CH não encontrada!");
    return;
  }
  
  const dados = aba.getDataRange().getValues();
  if (dados.length < 2) return;
  
  const cabecalho = dados[0].map(c => String(c).trim().toLowerCase());
  const idxNome = cabecalho.findIndex(c => c.includes("nome"));
  const idxEmail = cabecalho.findIndex(c => c.includes("e-mail") || c.includes("email"));
  const idxCgm = cabecalho.findIndex(c => c.includes("cgm"));
  const idxComponente = cabecalho.findIndex(c => c.includes("componente") || c.includes("disciplina"));
  const idxNre = cabecalho.findIndex(c => c.includes("nre"));
  const idxTurma = cabecalho.findIndex(c => c.includes("turma"));
  
  const concluintes = [];
  for (let i = 1; i < dados.length; i++) {
    const row = dados[i];
    const nome = idxNome !== -1 ? String(row[idxNome]).trim() : "";
    if (!nome) continue;
    
    concluintes.push({
      nome_cursista: nome,
      email: idxEmail !== -1 && row[idxEmail] ? String(row[idxEmail]).trim().toLowerCase() : null,
      cgm: idxCgm !== -1 && row[idxCgm] ? String(row[idxCgm]).trim() : null,
      componente: idxComponente !== -1 && row[idxComponente] ? String(row[idxComponente]).trim() : null,
      nre_exe: idxNre !== -1 && row[idxNre] ? String(row[idxNre]).trim() : null,
      turmas: idxTurma !== -1 && row[idxTurma] ? String(row[idxTurma]).trim() : null,
      chamamento: "1º Chamamento",
      situacao: "CONCLUÍDO"
    });
  }
  
  Logger.log("Total de cursistas lidos na planilha: " + concluintes.length);

  // Envio em lotes de 100 registros para garantir 100% de sucesso
  const SUPABASE_URL = "https://hoiihqrivcelsfivjpqs.supabase.co/rest/v1/cursistas_concluintes";
  const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhvaWlocXJpdmNlbHNmaXZqcHFzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU4NTcyNjcsImV4cCI6MjEwMTQzMzI2N30.HELd7SnBkp7f8JhAVusY-KiKCJ7Uum8-qndRMYk-3Is";
  
  const loteTamanho = 100;
  let totalGravados = 0;

  for (let i = 0; i < concluintes.length; i += loteTamanho) {
    const lote = concluintes.slice(i, i + loteTamanho);
    
    const options = {
      method: "post",
      headers: {
        "apikey": SUPABASE_KEY,
        "Authorization": "Bearer " + SUPABASE_KEY,
        "Content-Type": "application/json",
        "Prefer": "return=minimal"
      },
      payload: JSON.stringify(lote),
      muteHttpExceptions: true
    };

    const res = UrlFetchApp.fetch(SUPABASE_URL, options);
    const code = res.getResponseCode();
    if (code >= 200 && code < 300) {
      totalGravados += lote.length;
      Logger.log("Progresso: " + totalGravados + " de " + concluintes.length + " cursistas gravados...");
    } else {
      Logger.log("Erro no lote: Código HTTP " + code + " - Detalhe: " + res.getContentText());
    }
  }

  Logger.log("✅ Concluído! Total gravado no Supabase: " + totalGravados);
}
