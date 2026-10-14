/**
 * =========================================================================================
 * GOOGLE APPS SCRIPT: Sincronização da aba CONCLUINTES-1CH ➔ Supabase
 * Tabela: cursistas_concluintes
 * Plataforma do Estágio Probatório - SEED/PR
 * =========================================================================================
 * 
 * Como usar:
 * 1. Abra a Planilha do Google que contém a aba "CONCLUINTES-1CH".
 * 2. Acesse: Extensões ➔ Apps Script.
 * 3. Cole esta função no projeto.
 * 4. Execute "sincronizarConcluintesParaSupabase" para importar os dados para o Supabase.
 */

function sincronizarConcluintesParaSupabase() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const aba = ss.getSheetByName("CONCLUINTES-1CH");
  if (!aba) {
    Logger.log("ERRO: Aba 'CONCLUINTES-1CH' não foi encontrada nesta planilha.");
    return;
  }

  const dados = aba.getDataRange().getValues();
  if (dados.length < 2) {
    Logger.log("Aba CONCLUINTES-1CH vazia ou sem dados de cursistas.");
    return;
  }

  const cabecalho = dados[0].map(c => String(c).trim().toLowerCase());
  
  // Localiza dinamicamente as colunas
  const idxNome = cabecalho.findIndex(c => c.includes("nome"));
  const idxEmail = cabecalho.findIndex(c => c.includes("e-mail") || c.includes("email"));
  const idxCgm = cabecalho.findIndex(c => c.includes("cgm"));
  const idxCpf = cabecalho.findIndex(c => c.includes("cpf"));
  const idxRg = cabecalho.findIndex(c => c.includes("rg"));
  const idxComponente = cabecalho.findIndex(c => c.includes("componente") || c.includes("disciplina"));
  const idxNre = cabecalho.findIndex(c => c.includes("nre"));
  const idxMunic = cabecalho.findIndex(c => c.includes("munic"));
  const idxTurma = cabecalho.findIndex(c => c.includes("turma"));
  const idxAno = cabecalho.findIndex(c => c.includes("ano"));
  const idxMod = cabecalho.findIndex(c => c.includes("modalidade"));
  const idxDataConc = cabecalho.findIndex(c => c.includes("conclus") || c.includes("data"));

  const concluintes = [];
  for (let i = 1; i < dados.length; i++) {
    const row = dados[i];
    const nome = idxNome !== -1 ? String(row[idxNome]).trim() : "";
    if (!nome) continue;

    concluintes.push({
      nome_cursista: nome,
      email: idxEmail !== -1 && row[idxEmail] ? String(row[idxEmail]).trim().toLowerCase() : null,
      cgm: idxCgm !== -1 && row[idxCgm] ? String(row[idxCgm]).trim() : null,
      cpf: idxCpf !== -1 && row[idxCpf] ? String(row[idxCpf]).trim() : null,
      rg: idxRg !== -1 && row[idxRg] ? String(row[idxRg]).trim() : null,
      componente: idxComponente !== -1 && row[idxComponente] ? String(row[idxComponente]).trim() : null,
      nre_exe: idxNre !== -1 && row[idxNre] ? String(row[idxNre]).trim() : null,
      munic_exe: idxMunic !== -1 && row[idxMunic] ? String(row[idxMunic]).trim() : null,
      turmas: idxTurma !== -1 && row[idxTurma] ? String(row[idxTurma]).trim() : null,
      ano_formativo: idxAno !== -1 && row[idxAno] ? String(row[idxAno]).trim() : "1º ANO",
      modalidade: idxMod !== -1 && row[idxMod] ? String(row[idxMod]).trim() : "Docentes",
      data_conclusao: idxDataConc !== -1 && row[idxDataConc] ? String(row[idxDataConc]).trim() : null,
      chamamento: "1º Chamamento",
      situacao: "CONCLUÍDO"
    });
  }

  Logger.log("Total de cursistas concluintes identificados: " + concluintes.length);

  // Envio para o Supabase em lotes de 100
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
      Logger.log("Lote " + (Math.floor(i / loteTamanho) + 1) + " gravado com sucesso! Progresso: " + totalGravados + "/" + concluintes.length);
    } else {
      Logger.log("Aviso ao gravar lote " + (Math.floor(i / loteTamanho) + 1) + " - Status: " + code + " - Erro: " + res.getContentText());
    }
  }

  Logger.log("Processo concluído com sucesso! Total gravado no Supabase: " + totalGravados);
}
