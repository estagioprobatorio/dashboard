/**
 * =========================================================================================
 * GOOGLE APPS SCRIPT: Sincronização da aba DADOS (Cursistas) + CONCLUINTES-1CH ➔ Supabase
 * Tabelas: cursistas e cursistas_concluintes
 * Plataforma do Estágio Probatório - SEED/PR
 * =========================================================================================
 *
 * Como usar:
 * 1. Abra a Planilha de Gestão de Turmas (que contém a aba "DADOS" / "CONCLUINTES-1CH")
 *    ou abra seu projeto em https://script.google.com/
 * 2. Acesse: Extensões ➔ Apps Script.
 * 3. Cole este código no projeto e salve (💾).
 * 4. Selecione "sincronizarAbaDadosParaSupabase" no menu superior e clique em "Executar".
 */

const SUPABASE_BASE_URL = "https://apebaoinlopybfgvhudf.supabase.co";
const SUPABASE_API_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFwZWJhb2lubG9weWJmZ3ZodWRmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTMwOTUwOTQsImV4cCI6MjEwODY3MTA5NH0.WlEm896zVOrqYks0Nco1_Plku-d1ksdJ-oBJM0W-JJg";
const SPREADSHEET_ID_GESTAO_TURMAS = "1sRkA88VrtczqXxQ6PlmgygeCVhPoElRNS8RC1QuQzx0";

function obterPlanilhaGestao() {
  try {
    const active = SpreadsheetApp.getActiveSpreadsheet();
    if (active) return active;
  } catch (e) {}
  return SpreadsheetApp.openById(SPREADSHEET_ID_GESTAO_TURMAS);
}

/**
 * Sincroniza a aba "DADOS" (ou "Dados") com a tabela 'cursistas' no Supabase
 */
function sincronizarAbaDadosParaSupabase() {
  const ss = obterPlanilhaGestao();
  const nomesPossiveis = ["DADOS", "Dados", "dados", "CURSISTAS", "Cursistas"];
  let aba = null;

  for (let nome of nomesPossiveis) {
    aba = ss.getSheetByName(nome);
    if (aba) break;
  }

  if (!aba) {
    aba = ss.getSheets()[0];
    Logger.log("Aviso: Aba 'DADOS' não encontrada pelo nome exato. Usando a primeira aba: " + aba.getName());
  }

  const dados = aba.getDataRange().getValues();
  if (dados.length < 2) {
    Logger.log("Aba vazia ou sem registros.");
    return;
  }

  const cabecalho = dados[0].map(c =>
    String(c || "")
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
  );

  function findColIndex(exactNames, partialKeywords) {
    for (let ex of exactNames) {
      const idx = cabecalho.indexOf(ex);
      if (idx !== -1) return idx;
    }
    for (let kw of partialKeywords) {
      const idx = cabecalho.findIndex(c => c.includes(kw));
      if (idx !== -1) return idx;
    }
    return -1;
  }

  const idxCod = findColIndex(["cod_cursista", "codigo"], ["cod_cursista"]);
  const idxNome = findColIndex(["nome_cursista", "nome do cursista", "cursista"], ["nome_cursista", "nome do cursista"]);
  const idxPeriodo = findColIndex(["periodo_ini", "periodo inicial"], ["periodo"]);
  const idxCpf = findColIndex(["cpf_cursista", "cpf"], ["cpf"]);
  const idxRg = findColIndex(["rg", "rg_cursista"], ["rg"]);
  const idxCgm = findColIndex(["cgm"], ["cgm"]);
  const idxEmail = findColIndex(["e-mail", "email", "email_cursista"], ["e-mail", "email"]);
  const idxTelCursista = findColIndex(["telefone_cursista", "telefone"], ["telefone_cursista"]);
  const idxChamamento = findColIndex(["chamamento"], ["chamamento"]);
  const idxNreExe = findColIndex(["nre_exe", "nre"], ["nre_exe"]);
  const idxMunicExe = findColIndex(["munic_exe", "municipio"], ["munic_exe", "munic"]);
  const idxModalidade = findColIndex(["modalidade"], ["modalidade"]);
  const idxComponente = findColIndex(["componente", "disciplina"], ["componente"]);
  const idxTurmas = findColIndex(["turmas", "turma"], ["turma"]);
  const idxIdClassroom = findColIndex(["id_classroom"], ["id_classroom"]);
  const idxLink = findColIndex(["link", "link classroom", "link_classroom"], ["link"]);
  const idxDiaSemana = findColIndex(["dia_da_semana", "dia da semana"], ["dia_da_semana", "dia"]);
  const idxHoraIni = findColIndex(["horario_inicial", "horario inicial"], ["horario_ini", "inicial"]);
  const idxHoraFim = findColIndex(["horario_fim", "horario final"], ["horario_fim", "final"]);
  const idxTurno = findColIndex(["turno"], ["turno"]);
  const idxAnoForm = findColIndex(["ano_formativo", "ano formativo"], ["ano_formativo", "ano"]);
  const idxNomeForm = findColIndex(["nome_formador", "formador"], ["nome_formador"]);
  const idxCompForm = findColIndex(["componente_formador"], ["componente_formador"]);
  const idxCpfForm = findColIndex(["cpf_formador"], ["cpf_formador"]);
  const idxRgForm = findColIndex(["rg_formador"], ["rg_formador"]);
  const idxEmailForm = findColIndex(["e-mail_formador", "email_formador"], ["mail_formador"]);
  const idxTelForm = findColIndex(["telefone_formador"], ["telefone_formador"]);
  const idxNreForm = findColIndex(["nre_formador"], ["nre_formador"]);
  const idxTutor = findColIndex(["tutor_responsavel", "tutor"], ["tutor_responsavel", "tutor"]);
  const idxEmailTutor = findColIndex(["email_tutor", "e-mail_tutor"], ["mail_tutor"]);
  const idxNreTutor = findColIndex(["nre_tutor"], ["nre_tutor"]);
  const idxEmailNre = findColIndex(["e-mail_nre", "email_nre"], ["mail_nre"]);
  const idxTelTutor = findColIndex(["telefone_tutor"], ["telefone_tutor"]);
  const idxObsCursista = findColIndex(["observacoes_cursista"], ["observacoes_cursista"]);
  const idxObsFormador = findColIndex(["observacoes_formador"], ["observacoes_formador"]);
  const idxObsTutor = findColIndex(["observacoes_tutor"], ["observacoes_tutor"]);

  function val(row, idx) {
    if (idx === -1 || row[idx] === undefined || row[idx] === null) return null;
    const s = String(row[idx]).trim();
    return s === "" ? null : s;
  }

  function formatHora(raw) {
    if (!raw) return null;
    if (raw instanceof Date) {
      return Utilities.formatDate(raw, "America/Sao_Paulo", "HH:mm");
    }
    const str = String(raw).trim();
    const match = str.match(/\b\d{2}:\d{2}/);
    return match ? match[0] : str;
  }

  const registros = [];
  const codigosVistos = {};

  for (let i = 1; i < dados.length; i++) {
    const row = dados[i];
    const nome = val(row, idxNome);
    const cgm = val(row, idxCgm);
    const email = val(row, idxEmail);

    if (!nome && !cgm && !email) continue;

    const turma = val(row, idxTurmas) || "";
    let cod = val(row, idxCod) || (cgm ? cgm + "_" + turma : "CURS_L" + (i + 1));
    if (codigosVistos[cod]) {
      cod = cod + "_L" + (i + 1);
    }
    codigosVistos[cod] = true;

    registros.push({
      cod_cursista: cod,
      cgm: cgm,
      nome_cursista: nome || "CURSISTA",
      email: email ? email.toLowerCase() : null,
      cpf_cursista: val(row, idxCpf),
      rg: val(row, idxRg),
      telefone_cursista: val(row, idxTelCursista),
      periodo_ini: val(row, idxPeriodo),
      chamamento: val(row, idxChamamento),
      nre_exe: val(row, idxNreExe),
      munic_exe: val(row, idxMunicExe),
      modalidade: val(row, idxModalidade),
      componente: val(row, idxComponente),
      turmas: turma || null,
      id_classroom: val(row, idxIdClassroom),
      link: val(row, idxLink),
      dia_da_semana: val(row, idxDiaSemana),
      horario_inicial: formatHora(row[idxHoraIni]),
      horario_fim: formatHora(row[idxHoraFim]),
      turno: val(row, idxTurno),
      ano_formativo: val(row, idxAnoForm),
      nome_formador: val(row, idxNomeForm),
      componente_formador: val(row, idxCompForm),
      cpf_formador: val(row, idxCpfForm),
      rg_formador: val(row, idxRgForm),
      email_formador: val(row, idxEmailForm) ? val(row, idxEmailForm).toLowerCase() : null,
      telefone_formador: val(row, idxTelForm),
      nre_formador: val(row, idxNreForm),
      tutor_responsavel: val(row, idxTutor),
      email_tutor: val(row, idxEmailTutor) ? val(row, idxEmailTutor).toLowerCase() : null,
      nre_tutor: val(row, idxNreTutor),
      email_nre: val(row, idxEmailNre) ? val(row, idxEmailNre).toLowerCase() : null,
      telefone_tutor: val(row, idxTelTutor),
      observacoes_cursista: val(row, idxObsCursista),
      observacoes_formador: val(row, idxObsFormador),
      observacoes_tutor: val(row, idxObsTutor),
      updated_at: new Date().toISOString()
    });
  }

  Logger.log("Total de cursistas lidos da aba DADOS: " + registros.length);

  const endpoint = SUPABASE_BASE_URL + "/rest/v1/cursistas?on_conflict=cod_cursista";
  const loteTamanho = 200;
  let totalGravados = 0;

  for (let i = 0; i < registros.length; i += loteTamanho) {
    const lote = registros.slice(i, i + loteTamanho);
    const options = {
      method: "post",
      headers: {
        "apikey": SUPABASE_API_KEY,
        "Authorization": "Bearer " + SUPABASE_API_KEY,
        "Content-Type": "application/json",
        "Prefer": "resolution=merge-duplicates,return=minimal"
      },
      payload: JSON.stringify(lote),
      muteHttpExceptions: true
    };

    const res = UrlFetchApp.fetch(endpoint, options);
    const code = res.getResponseCode();
    if (code >= 200 && code < 300) {
      totalGravados += lote.length;
      Logger.log("Lote " + (Math.floor(i / loteTamanho) + 1) + " gravado! Progresso: " + totalGravados + "/" + registros.length);
    } else {
      Logger.log("Erro ao gravar lote (Status " + code + "): " + res.getContentText());
    }
    Utilities.sleep(150);
  }

  Logger.log("✅ Sincronização da aba DADOS concluída! Total enviado ao Supabase: " + totalGravados);
}
