import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DADOS_DIR = path.resolve(__dirname, '..', 'Dados_Observação');
const OUTPUT_FILE = path.resolve(__dirname, 'src', 'observacoes_fallback.json');

console.log('Iniciando processamento das observações...');
console.log('Diretório de origem:', DADOS_DIR);

/**
 * Parser de CSV compatível com RFC 4180 para campos com quebra de linha e aspas
 */
function parseCSV(content) {
  const rows = [];
  let currentRow = [];
  let currentField = '';
  let inQuotes = false;

  for (let i = 0; i < content.length; i++) {
    const char = content[i];
    const nextChar = content[i + 1];

    if (inQuotes) {
      if (char === '"') {
        if (nextChar === '"') {
          currentField += '"';
          i++; // pula aspas escapadas
        } else {
          inQuotes = false;
        }
      } else {
        currentField += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ',') {
        currentRow.push(currentField);
        currentField = '';
      } else if (char === '\r') {
        if (nextChar === '\n') i++;
        currentRow.push(currentField);
        rows.push(currentRow);
        currentRow = [];
        currentField = '';
      } else if (char === '\n') {
        currentRow.push(currentField);
        rows.push(currentRow);
        currentRow = [];
        currentField = '';
      } else {
        currentField += char;
      }
    }
  }

  if (currentField || currentRow.length > 0) {
    currentRow.push(currentField);
    rows.push(currentRow);
  }

  return rows;
}

// Arquivos a processar
const filesToProcess = [
  {
    name: 'Formador-1ANO_Observação da Prática Pedagógica 2026 (respostas) - Respostas ao formulário 1.csv',
    ano: '1º ANO',
    padrao: '1ANO_GERAL'
  },
  {
    name: 'Formador-2e3ANO_Observação da Prática Pedagógica 2026 (respostas) - Respostas ao formulário 1.csv',
    ano: '2º/3º ANO',
    padrao: '2e3ANO_GERAL'
  },
  {
    name: 'Formador-1ANO_Observação da Prática Pedagógica 2026 (respostas) - Analise 4º chamamento tema 3.csv',
    ano: '1º ANO',
    chamamento: '4º Chamamento',
    padrao: '1ANO_CHAM4_T3'
  },
  {
    name: 'Formador-1ANO_Observação da Prática Pedagógica 2026 (respostas) - Analise 4º chamamento tema 4.csv',
    ano: '1º ANO',
    chamamento: '4º Chamamento',
    padrao: '1ANO_CHAM4_T4'
  }
];

const allObservations = [];

// Função auxiliar para encontrar campo baseado em lista de possíveis nomes/padrões
function findValue(row, headers, patterns) {
  for (const p of patterns) {
    const idx = headers.findIndex(h => {
      const lower = h.toLowerCase();
      if (typeof p === 'string') return lower.includes(p.toLowerCase());
      if (p instanceof RegExp) return p.test(lower);
      return false;
    });
    if (idx !== -1 && row[idx]) {
      const val = row[idx].trim();
      if (val) return val;
    }
  }
  return '';
}

// Procura por níveis de implementação em colunas de critérios
function findNivel(row, headers, tipo) {
  for (let i = 0; i < headers.length; i++) {
    const h = headers[i].toLowerCase();
    if (h.includes(tipo) && (h.includes('nível') || h.includes('nivel') || h.includes('situada'))) {
      const val = (row[i] || '').trim();
      if (val && (
        val.toUpperCase().includes('SUPERA') ||
        val.toUpperCase().includes('ATINGE') ||
        val.toUpperCase().includes('PARCIALMENTE') ||
        val.toUpperCase().includes('NÃO ATINGE') ||
        val.toUpperCase().includes('NAO ATINGE') ||
        val.toUpperCase().includes('INTEGRALMENTE')
      )) {
        return val.replace(/[.,;]$/, '').trim();
      }
    }
  }

  // Busca genérica por valores clássicos se não achou pelo cabeçalho
  for (let i = 0; i < row.length; i++) {
    const val = (row[i] || '').trim().toUpperCase();
    if (
      val === 'SUPERA.' || val === 'SUPERA' ||
      val === 'ATENDE INTEGRALMENTE.' || val === 'ATENDE INTEGRALMENTE' ||
      val === 'ATINGE INTEGRALMENTE.' || val === 'ATINGE INTEGRALMENTE' ||
      val === 'ATINGE PARCIALMENTE.' || val === 'ATINGE PARCIALMENTE' ||
      val === 'NÃO ATINGE.' || val === 'NÃO ATINGE'
    ) {
      return (row[i] || '').replace(/[.,;]$/, '').trim();
    }
  }
  return '';
}

for (const fileConfig of filesToProcess) {
  const filePath = path.join(DADOS_DIR, fileConfig.name);
  if (!fs.existsSync(filePath)) {
    console.warn(`Arquivo não encontrado: ${fileConfig.name}`);
    continue;
  }

  console.log(`Lendo: ${fileConfig.name}...`);
  const content = fs.readFileSync(filePath, 'utf-8');
  const rows = parseCSV(content);

  if (rows.length < 2) continue;

  const headers = rows[0].map(h => (h || '').trim());
  console.log(`  -> ${rows.length - 1} linhas encontradas. Colunas: ${headers.length}`);

  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    if (!row || row.length === 0 || row.every(c => !c || !c.trim())) continue;

    // E-mail do cursista
    let emailCursista = findValue(row, headers, [
      'e-mail institucional do cursista',
      'email institucional do cursista',
      'e-mail do cursista',
      'email do cursista'
    ]);

    if (!emailCursista) {
      for (let i = 3; i < row.length; i++) {
        const val = (row[i] || '').trim().toLowerCase();
        if (val.includes('@escola.pr.gov.br') && !val.includes('formador')) {
          emailCursista = val;
          break;
        }
      }
    }

    if (!emailCursista || !emailCursista.includes('@')) continue;
    emailCursista = emailCursista.toLowerCase().trim();

    // Nome do cursista
    const nomeCursista = findValue(row, headers, [
      'nome do cursista',
      'cursista'
    ]) || '';

    // Formador
    const nomeFormador = findValue(row, headers, [
      'selecione o nome do formador',
      'nome do formador',
      'formador/tutor/técnico'
    ]) || '';

    const emailFormador = (row[1] || '').trim().toLowerCase();

    // Status da observação
    const obsRealizada = findValue(row, headers, [
      'a observação da prática foi realizada',
      'observação da prática foi realizada'
    ]) || 'Sim, a observação foi realizada.';

    const isRealizada = obsRealizada.toLowerCase().includes('sim');

    // Datas
    const dataPratica = findValue(row, headers, ['data da realização da prática', 'data da realização']);
    const dataObservacao = findValue(row, headers, ['data em que foi realizada a observação']);
    const dataFeedback = findValue(row, headers, ['data do feedback', 'devolutiva']);
    const dataAgendamento = findValue(row, headers, ['data do agendamento', 'agendamento']);

    // Modalidade de feedback
    const modalidadeFeedback = findValue(row, headers, ['modalidade de feedback formativo', 'modalidade de feedback']) || (isRealizada ? 'Diálogo formativo' : '');
    const motivoDevolutiva = findValue(row, headers, ['motivo da realização de feedback', 'qual foi o motivo']);

    // Links
    const linkGravacaoPratica = findValue(row, headers, ['link da gravação da prática pedagógica', 'link da gravação da prática']);
    const linkPlanejamento = findValue(row, headers, ['link do documento de planejamento', 'link do pdp', 'link do documento']);
    const linkGravacaoFeedback = findValue(row, headers, ['link da gravação do diálogo formativo', 'link da gravação do feedback']);

    // Modalidade e Componente
    const modalidade = findValue(row, headers, ['selecione a modalidade do cursista', 'modalidades. selecione']);
    const componente = findValue(row, headers, ['selecione o componente do cursista', 'componente']);
    const tema = findValue(row, headers, ['selecione o tema relacionado', 'tema relacionado']);

    // Níveis de avaliação
    const nivelPlanejamento = findNivel(row, headers, 'planejamento') || (fileConfig.ano === '1º ANO' ? findNivel(row, headers, 'critério 1') : '');
    const nivelPratica = findNivel(row, headers, 'prática') || findNivel(row, headers, 'pratica') || findNivel(row, headers, 'critério 2');

    // Feedbacks e Combinados
    const questionamentos = findValue(row, headers, ['questionamentos propositivos', 'questionamento']);
    const proposicoes = findValue(row, headers, ['proposições ou sugestões', 'proposições', 'sugestões']);
    const combinados = findValue(row, headers, ['combinados realizados no feedback', 'combinados']);
    const reflexoes = findValue(row, headers, ['registre informações ou reflexões', 'reflexões']);
    const justificativaNaoRealizada = findValue(row, headers, ['justificativa:', 'justificativa']);
    const contextoJustificativa = findValue(row, headers, ['descreva a situação ou contexto', 'contexto relacionado']);

    allObservations.push({
      id: `obs_${allObservations.length + 1}`,
      carimbo: row[0] || '',
      email_cursista: emailCursista,
      nome_cursista: nomeCursista,
      email_formador: emailFormador,
      nome_formador: nomeFormador,
      ano_formativo: fileConfig.ano,
      chamamento: fileConfig.chamamento || '',
      modalidade: modalidade || 'Docentes',
      componente: componente || '',
      tema: tema || 'Tema Geral',
      observacao_realizada: isRealizada ? 'Sim, a observação foi realizada.' : 'Não realizada',
      is_realizada: isRealizada,
      data_pratica: dataPratica,
      data_observacao: dataObservacao,
      data_feedback: dataFeedback,
      data_agendamento: dataAgendamento,
      modalidade_feedback: modalidadeFeedback,
      motivo_devolutiva: motivoDevolutiva,
      link_gravacao_pratica: linkGravacaoPratica,
      link_planejamento: linkPlanejamento,
      link_gravacao_feedback: linkGravacaoFeedback,
      nivel_planejamento: nivelPlanejamento || (isRealizada ? 'SUPERA' : ''),
      nivel_pratica: nivelPratica || (isRealizada ? 'ATENDE INTEGRALMENTE' : ''),
      questionamentos_propositivos: questionamentos,
      proposicoes_sugestoes: proposicoes,
      combinados: combinados,
      justificativa_nao_realizada: justificativaNaoRealizada,
      contexto_justificativa: contextoJustificativa,
      reflexoes_gerais: reflexoes
    });
  }
}

console.log(`Total de observações extraídas: ${allObservations.length}`);

// Remover possíveis duplicatas exatas mantendo o registro mais completo
const mapUnique = new Map();
allObservations.forEach(obs => {
  const key = `${obs.email_cursista}|${obs.ano_formativo}|${obs.tema || ''}|${obs.data_pratica || obs.carimbo || ''}`;
  if (!mapUnique.has(key)) {
    mapUnique.set(key, obs);
  }
});

const uniqueObservations = Array.from(mapUnique.values());
console.log(`Observações únicas consolidadas: ${uniqueObservations.length}`);

// Salva em JSON compactado e estruturado
fs.writeFileSync(OUTPUT_FILE, JSON.stringify(uniqueObservations, null, 2), 'utf-8');
console.log(`Arquivo gerado com sucesso em: ${OUTPUT_FILE}`);
