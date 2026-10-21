/**
 * =========================================================================================
 * MÓDULO: Registro de remanejamentos de turma feitos na planilha  ➔  Supabase.movimentacoes
 * Cole como um NOVO arquivo (ex.: "Movimentacoes.gs") no MESMO projeto do Code.gs.
 * Usa as constantes do Code.gs: SUPABASE_URL, SUPABASE_ANON_KEY e SHEET_DADOS.
 * =========================================================================================
 *
 * DUAS FORMAS DE DETECÇÃO (complementares, sem duplicar registros):
 *
 * A) Na edição (handleEdit): se a célula editada é da coluna "turmas", registra na hora
 *    usando e.oldValue (turma antiga) e o novo valor.
 *
 * B) Na sincronização (syncAllData): ANTES de apagar a tabela cursistas, compara a planilha
 *    com o que está no Supabase (foto anterior) e registra o que mudou. Cobre colagens e
 *    edições em bloco, onde o e.oldValue não existe.
 *
 * Teste sem gravar nada: execute  simularMovimentacoesDeTurma()  e leia o Log.
 */

var REGISTRAR_SAIDAS = false; // true: cursista que sumiu da planilha vira "Saída"

// ---------------------------------------------------------------------------------------
// B) Chamada pelo syncAllData (antes do truncateTable)
// ---------------------------------------------------------------------------------------
function registrarMovimentacoesDeTurma() {
  return processarMovimentacoesDeTurma_(true);
}

function simularMovimentacoesDeTurma() {
  return processarMovimentacoesDeTurma_(false);
}

function processarMovimentacoesDeTurma_(gravar) {
  var planilha = lerTurmasDaPlanilha_();
  if (!planilha) return 0;
  var supabase = lerTurmasDoSupabase_();
  var jaRegistrados = lerMovimentosExistentes_();

  var novos = [];
  var agora = new Date().toISOString();

  Object.keys(planilha).forEach(function (cgm) {
    var p = planilha[cgm];
    var s = supabase[cgm];
    if (!s) return; // cursista novo: não é remanejamento

    var removidas = Object.keys(s.turmas).filter(function (t) { return !p.turmas[t]; });
    var adicionadas = Object.keys(p.turmas).filter(function (t) { return !s.turmas[t]; });
    if (removidas.length !== 1 || adicionadas.length !== 1) return;

    var chave = cgm + "|" + removidas[0] + "|" + adicionadas[0];
    if (jaRegistrados[chave]) return;

    novos.push(montarMovimento_(p, cgm, removidas[0], adicionadas[0], "Transferência", agora));
  });

  if (REGISTRAR_SAIDAS) {
    Object.keys(supabase).forEach(function (cgm) {
      if (planilha[cgm]) return;
      Object.keys(supabase[cgm].turmas).forEach(function (t) {
        if (jaRegistrados[cgm + "|" + t + "|"]) return;
        novos.push(montarMovimento_(supabase[cgm], cgm, t, "", "Saída", agora));
      });
    });
  }

  Logger.log("Movimentações de turma detectadas: " + novos.length);
  novos.forEach(function (m) {
    Logger.log("  " + m.nome_cursista + " (CGM " + m.cgm + "): " + m.turma_anterior + " ➔ " + (m.turma_nova || "SAÍDA"));
  });

  if (!gravar || novos.length === 0) return novos.length;

  for (var i = 0; i < novos.length; i += 100) {
    inserirMovimentos_(novos.slice(i, i + 100));
  }
  Logger.log("Movimentações gravadas no Supabase: " + novos.length);
  return novos.length;
}

// ---------------------------------------------------------------------------------------
// A) Chamada pelo handleEdit
// ---------------------------------------------------------------------------------------
function registrarMovimentoPorEdicao_(e, headers, record) {
  // Só edição de uma única célula traz e.oldValue confiável
  if (!e || !e.range || e.range.getNumRows() !== 1 || e.range.getNumColumns() !== 1) return;
  var idxTurmas = headers.map(norm_).indexOf("turmas");
  if (idxTurmas === -1 || e.range.getColumn() - 1 !== idxTurmas) return;

  var anterior = String(e.oldValue == null ? "" : e.oldValue).trim();
  var nova = String(e.value == null ? "" : e.value).trim();
  if (!anterior || !nova || anterior === nova) return;

  var cgm = String(record["cgm"] || "").replace(/\D/g, "");
  if (!cgm) return;

  var reg = {
    nome: String(record["nome_cursista"] || "").trim(),
    tutor: String(record["tutor_responsavel"] || "").trim(),
    emailTutor: String(record["email_tutor"] || "").trim(),
    nre: String(record["nre_tutor"] || "").trim()
  };
  inserirMovimentos_([montarMovimento_(reg, cgm, anterior, nova, "Transferência", new Date().toISOString())]);
}

// ---------------------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------------------
function montarMovimento_(reg, cgm, turmaAnterior, turmaNova, tipo, agoraIso) {
  return {
    timestamp: agoraIso,
    nome_cursista: reg.nome,
    cgm: cgm,
    turma_anterior: turmaAnterior,
    turma_nova: turmaNova,
    tipo_acao: tipo,
    email_tutor_responsavel: reg.emailTutor || "",
    tutor: reg.tutor || "",
    nre: reg.nre || "",
    status: "Resolvido",
    nota_resolucao: "Alteração manual na planilha: " + turmaAnterior + " ➔ " + (turmaNova || "saída"),
    data_atendimento: agoraIso
  };
}

function norm_(v) {
  return String(v == null ? "" : v).trim().toLowerCase();
}

function inserirMovimentos_(lote) {
  var res = UrlFetchApp.fetch(SUPABASE_URL + "/rest/v1/movimentacoes", {
    method: "post",
    contentType: "application/json",
    headers: {
      "apikey": SUPABASE_ANON_KEY,
      "Authorization": "Bearer " + SUPABASE_ANON_KEY,
      "Prefer": "return=minimal"
    },
    payload: JSON.stringify(lote),
    muteHttpExceptions: true
  });
  var code = res.getResponseCode();
  if (code < 200 || code >= 300) {
    throw new Error("Falha ao gravar em movimentacoes (" + code + "): " + res.getContentText());
  }
}

function lerTurmasDaPlanilha_() {
  var aba = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_DADOS);
  if (!aba) { Logger.log("Aba '" + SHEET_DADOS + "' não encontrada."); return null; }
  var dados = aba.getDataRange().getValues();
  var cab = dados[0].map(norm_);
  var iCgm = cab.indexOf("cgm");
  var iTurma = cab.indexOf("turmas");
  var iNome = cab.indexOf("nome_cursista");
  var iTutor = cab.indexOf("tutor_responsavel");
  var iEmailTutor = cab.indexOf("email_tutor");
  var iNre = cab.indexOf("nre_tutor");
  if (iCgm === -1 || iTurma === -1) {
    Logger.log("Colunas 'cgm' e/ou 'turmas' não encontradas. Cabeçalho: " + cab.join(" | "));
    return null;
  }
  var mapa = {};
  for (var i = 1; i < dados.length; i++) {
    var r = dados[i];
    var cgm = String(r[iCgm]).replace(/\D/g, "");
    var turma = String(r[iTurma]).trim();
    if (!cgm || !turma) continue;
    if (!mapa[cgm]) {
      mapa[cgm] = {
        nome: iNome !== -1 ? String(r[iNome]).trim() : "",
        tutor: iTutor !== -1 ? String(r[iTutor]).trim() : "",
        emailTutor: iEmailTutor !== -1 ? String(r[iEmailTutor]).trim() : "",
        nre: iNre !== -1 ? String(r[iNre]).trim() : "",
        turmas: {}
      };
    }
    mapa[cgm].turmas[turma] = true;
  }
  return mapa;
}

function getTodosSupabase_(pathComQuery) {
  var todos = [];
  var pagina = 1000;
  for (var off = 0; ; off += pagina) {
    var sep = pathComQuery.indexOf("?") === -1 ? "?" : "&";
    var res = UrlFetchApp.fetch(
      SUPABASE_URL + "/rest/v1" + pathComQuery + sep + "limit=" + pagina + "&offset=" + off,
      { headers: { "apikey": SUPABASE_ANON_KEY, "Authorization": "Bearer " + SUPABASE_ANON_KEY }, muteHttpExceptions: true }
    );
    if (res.getResponseCode() !== 200) {
      throw new Error("Falha ao ler " + pathComQuery + " (" + res.getResponseCode() + "): " + res.getContentText());
    }
    var lote = JSON.parse(res.getContentText());
    todos = todos.concat(lote);
    if (lote.length < pagina) break;
  }
  return todos;
}

function lerTurmasDoSupabase_() {
  var linhas = getTodosSupabase_("/cursistas?select=chave_matricula,cgm,turmas,nome_cursista,tutor_responsavel,email_tutor,nre_tutor&order=chave_matricula");
  var mapa = {};
  linhas.forEach(function (l) {
    var cgm = String(l.cgm || "").replace(/\D/g, "");
    var turma = String(l.turmas || "").trim();
    if (!cgm || !turma) return;
    if (!mapa[cgm]) {
      mapa[cgm] = {
        nome: l.nome_cursista || "",
        tutor: l.tutor_responsavel || "",
        emailTutor: l.email_tutor || "",
        nre: l.nre_tutor || "",
        turmas: {}
      };
    }
    mapa[cgm].turmas[turma] = true;
  });
  return mapa;
}

function lerMovimentosExistentes_() {
  var linhas = getTodosSupabase_("/movimentacoes?select=cgm,turma_anterior,turma_nova&turma_anterior=not.is.null&order=timestamp");
  var set = {};
  linhas.forEach(function (l) {
    var cgm = String(l.cgm || "").replace(/\D/g, "");
    set[cgm + "|" + (l.turma_anterior || "") + "|" + (l.turma_nova || "")] = true;
  });
  return set;
}
