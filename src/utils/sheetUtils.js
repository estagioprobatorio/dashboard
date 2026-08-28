/**
 * Utilitário para Leitura e Sincronização em Tempo Real com Planilhas do Google Sheets
 * SEED-PR - Estágio Probatório
 * 
 * Planilhas Integradas:
 * 1. Planilha REQUERIMENTOS ADMINISTRATIVOS - 2026 (respostas) -> Aba "Respostas ao formulário 1" (Tutores)
 * 2. Planilha Estágio Probatório - Gestão de turmas - 2026 (respostas) -> Abas "Troca de Turma", "Troca de Modalidade", "Vínculo na AF"
 */

// Converte texto CSV em array de objetos
export function parseCSV(csvText) {
  if (!csvText || typeof csvText !== 'string') return [];

  const lines = [];
  let currentLine = [];
  let currentField = '';
  let inQuotes = false;

  for (let i = 0; i < csvText.length; i++) {
    const char = csvText[i];
    const nextChar = csvText[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentField += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if ((char === ',' || char === ';') && !inQuotes) {
      currentLine.push(currentField.trim());
      currentField = '';
    } else if ((char === '\r' || char === '\n') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') i++;
      currentLine.push(currentField.trim());
      if (currentLine.some(f => f !== '')) {
        lines.push(currentLine);
      }
      currentLine = [];
      currentField = '';
    } else {
      currentField += char;
    }
  }

  if (currentField || currentLine.length > 0) {
    currentLine.push(currentField.trim());
    lines.push(currentLine);
  }

  if (lines.length < 2) return [];

  const rawHeaders = lines[0].map(h => h.replace(/^"|"$/g, '').trim());
  const dataRows = lines.slice(1);

  return dataRows.map((row, idx) => {
    const obj = {};
    rawHeaders.forEach((header, hIdx) => {
      let val = row[hIdx] ? row[hIdx].replace(/^"|"$/g, '').trim() : '';
      obj[header] = val;
    });
    obj._rowIndex = idx;
    return obj;
  });
}

// Mapeia colunas da planilha do Google Forms para o formato interno de Movimentações
export function mapSheetRowToMovement(row, idx, tabName = '') {
  const findValue = (keywords) => {
    for (const key of Object.keys(row)) {
      const lowerKey = key.toLowerCase();
      if (keywords.some(kw => lowerKey.includes(kw.toLowerCase()))) {
        return row[key];
      }
    }
    return '';
  };

  const timestamp = findValue(['carimbo', 'data/hora', 'timestamp']) || new Date().toISOString();
  const email = findValue(['endereço de e-mail', 'e-mail do tutor', 'email']) || '';
  const nre = findValue(['nre']) || '';
  const tutor = findValue(['nome do(a) tutor(a)', 'tutor']) || '';
  const emailTutor = findValue(['institucional', 'email do tutor']) || email;
  const motivo = findValue(['motivo do requerimento', 'motivo']) || 'Requerimento';
  const situacao = findValue(['situação relacionada', 'situação']) || '';
  const nomeCursista = findValue(['nome do cursista', 'formador', 'nome']) || '';
  const anoFormacao = findValue(['ano de formação']) || '';
  const chamamento = findValue(['chamamento']) || '';
  const modalidade = findValue(['modalidade']) || '';
  const turmaDetails = findValue(['turma']) || '';
  const descricao = findValue(['descreva com detalhes', 'descrição', 'justificativa']) || '';
  const comprovante = findValue(['anexe imagem', 'documento', 'comprovante']) || 'Sem anexo';

  // Identificar o Tipo de Ação com base na Aba ou no Motivo
  let tipoAcao = 'Chamado Tutor';
  const lowerTab = tabName.toLowerCase();
  const lowerMotivo = motivo.toLowerCase();

  if (lowerTab.includes('turma') || lowerMotivo.includes('turma')) {
    tipoAcao = 'Troca de Turma';
  } else if (lowerTab.includes('modalidade') || lowerMotivo.includes('modalidade')) {
    tipoAcao = 'Troca de Modalidade';
  } else if (lowerTab.includes('vínculo') || lowerTab.includes('vinculo') || lowerTab.includes('af') || lowerMotivo.includes('vínculo') || lowerMotivo.includes('af')) {
    tipoAcao = 'Vínculo na AF';
  } else if (lowerTab.includes('respostas') || lowerTab.includes('tutor')) {
    tipoAcao = 'Chamado Tutor';
  }

  const isTutorForm = lowerTab.includes('respostas') || lowerMotivo.includes('tutor');

  return {
    id: `GSHEET-${tabName.replace(/\s+/g, '')}-${idx}-${Date.now()}`,
    timestamp: timestamp,
    dataHora: timestamp,
    cgm: findValue(['cgm']) || '',
    nome_cursista: nomeCursista || 'NOME NÃO INFORMADO',
    nomeCursista: nomeCursista || 'NOME NÃO INFORMADO',
    email: email,
    emailCursista: email,
    nre: nre,
    tutor: tutor,
    tutor_responsavel: tutor,
    email_tutor_responsavel: emailTutor,
    tipo_acao: tipoAcao,
    motivo: `${tipoAcao} - ${motivo}`,
    situacao_relacionada: situacao,
    ano_formacao: anoFormacao,
    chamamento: chamamento,
    modalidade_detalhes: modalidade,
    turma_detalhes: turmaDetails,
    justificativa: descricao,
    descricao: descricao,
    comprovante: comprovante,
    status: 'Pendente',
    solicitadoPor: isTutorForm ? 'Google Forms (Tutor)' : 'Google Forms (Cursista)'
  };
}

// Spreadsheet ID da Planilha Oficial
export const SPREADSHEET_ID_GESTAO_TURMAS = "1sRkA88VrtczqXxQ6PlmgygeCVhPoElRNS8RC1QuQzx0";

// Faz o fetch de todas as Abas indicadas pelo usuário
export async function fetchAllGoogleSheetsData() {
  const targetSheets = [
    { name: 'Respostas ao formulário 1', spreadsheetId: SPREADSHEET_ID_GESTAO_TURMAS, gid: '277467342' },
    { name: 'Troca de Turma', spreadsheetId: SPREADSHEET_ID_GESTAO_TURMAS },
    { name: 'Troca de Modalidade', spreadsheetId: SPREADSHEET_ID_GESTAO_TURMAS },
    { name: 'Vínculo na AF', spreadsheetId: SPREADSHEET_ID_GESTAO_TURMAS }
  ];

  const allMovements = [];

  for (const item of targetSheets) {
    const urls = [];
    if (item.gid) {
      urls.push(`https://docs.google.com/spreadsheets/d/${item.spreadsheetId}/gviz/tq?tqx=out:csv&gid=${item.gid}`);
      urls.push(`https://docs.google.com/spreadsheets/d/${item.spreadsheetId}/export?format=csv&gid=${item.gid}`);
    }
    urls.push(`https://docs.google.com/spreadsheets/d/${item.spreadsheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(item.name)}`);
    urls.push(`https://docs.google.com/spreadsheets/d/${item.spreadsheetId}/export?format=csv&sheet=${encodeURIComponent(item.name)}`);

    for (const url of urls) {
      try {
        const response = await fetch(url);
        if (response.ok) {
          const text = await response.text();
          if (text && text.trim().length > 0 && !text.includes('<!DOCTYPE html>')) {
            const rawRows = parseCSV(text);
            const mapped = rawRows.map((r, idx) => mapSheetRowToMovement(r, idx, item.name));
            allMovements.push(...mapped);
            break; // se obteve sucesso para esta aba, pula para a próxima aba
          }
        }
      } catch (e) {
        // tenta a próxima URL
      }
    }
  }

  return allMovements;
}
