/**
 * Serviço para carregamento sob demanda, cache e adequação estatístico-pedagógica
 * do histórico de observações de 2024 (1º Ano) e 2025 (2º Ano - Checklist PDP)
 * para a Rubrica Analítica de 2026 (SEED-PR • Estágio Probatório).
 *
 * Todos os dados de 2024 e 2025 permanecem armazenados em arquivos JSON estáticos
 * (/observacoes_2024.json e /observacoes_2025.json), sem necessidade de consulta à planilha.
 */

let historicoCache = null;
let carregarPromise = null;

function normalizeName(str) {
  if (!str) return '';
  return String(str)
    .trim()
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ');
}

// Expressões regulares calibradas e validadas estatisticamente (espelhando testes-estagio-main/src/process_csv.py)
const RE_SUPERA_QUALITATIVO = /protagonis|autonom|autoria|monitoria|monitor|investig|pesquis|criaram|produziram|construiram|elaboraram|boa pratica|boas praticas|excelencia|destaque|supera|inovad|lideran|engajamento total|participacao ativa de todos|debate rico|colaborac/i;
const RE_ATENCAO_FORTE = /nao realizou|ausencia de|sem planejamento|desconhec|nao utilizou|nao houve|dificuldade grave|dispersao generalizada|indisciplina sem intervencao/i;

/**
 * Converte um descritor bruto de 2024 (1º Ano) na escala da Rubrica Analítica 2026,
 * preservando integralmente o descritor original e gerando a justificativa pedagógica.
 */
export function adequarNivel2024ParaRubrica2026(rawNivel, textoQualitativo = '', tipo = 'pratica') {
  if (!rawNivel) {
    return {
      nivelCalibrado: '',
      scoreCalibrado: null,
      nivelOriginal: '',
      foiCalibrado: false,
      justificativaEquiparacao: ''
    };
  }

  const s = String(rawNivel).trim();
  const sUpper = s.toUpperCase();
  const textoNorm = normalizeName(textoQualitativo).toLowerCase();

  let scoreOrig = null;
  if (sUpper.includes('NIVEL 4') || sUpper.includes('NÍVEL 4') || sUpper.startsWith('4')) scoreOrig = 4;
  else if (sUpper.includes('NIVEL 3') || sUpper.includes('NÍVEL 3') || sUpper.startsWith('3')) scoreOrig = 3;
  else if (sUpper.includes('NIVEL 2') || sUpper.includes('NÍVEL 2') || sUpper.startsWith('2')) scoreOrig = 2;
  else if (sUpper.includes('NIVEL 1') || sUpper.includes('NÍVEL 1') || sUpper.startsWith('1')) scoreOrig = 1;

  if (scoreOrig === null) {
    return {
      nivelCalibrado: s,
      scoreCalibrado: null,
      nivelOriginal: s,
      foiCalibrado: false,
      justificativaEquiparacao: ''
    };
  }

  const temEvidenciaSupera = RE_SUPERA_QUALITATIVO.test(textoNorm);
  const temFalhaGrave = RE_ATENCAO_FORTE.test(textoNorm);

  // Regra de Equiparação 2024 (1º Ano) -> Rubrica Analítica 2026:
  // Em 2024 (ingresso no 1º Ano), cumprir o protocolo básico da aula atribuía "NÍVEL 4" a 58% da rede.
  // Na Rubrica 2026, cumprir integralmente os requisitos da aula equivale a "Atende integralmente (Nível 3)",
  // enquanto "Supera (Nível 4)" exige evidência qualitativa de protagonismo, autoria discente, monitoria ou boa prática.
  if (scoreOrig === 4) {
    if (temEvidenciaSupera && !temFalhaGrave) {
      return {
        nivelCalibrado: 'SUPERA. (Nível 4 - Rubrica 2026)',
        scoreCalibrado: 4,
        nivelOriginal: s,
        foiCalibrado: false,
        justificativaEquiparacao:
          'Manteve Nível 4 (Supera) na Rubrica 2026: além de cumprir todos os passos da aula do 1º Ano (2024), o relato do formador comprova protagonismo, autoria dos estudantes ou recomendação de boa prática.'
      };
    }
    return {
      nivelCalibrado: 'ATENDE INTEGRALMENTE. (Nível 3 - Equiparado Rubrica 2026)',
      scoreCalibrado: 3,
      nivelOriginal: s,
      foiCalibrado: true,
      justificativaEquiparacao:
        'Equiparado de Nível 4 (1º Ano 2024) para Nível 3 (Atende Integralmente - Rubrica 2026): em 2024, cumprir o roteiro básico da aula recebia Nível 4. Na régua de 2026, cumprir 100% do esperado na aula corresponde ao nível "Atende Integralmente (3)", evitando falsa queda na evolução do professor.'
    };
  }

  if (scoreOrig === 3) {
    if (temFalhaGrave) {
      return {
        nivelCalibrado: 'ATENDE PARCIALMENTE. (Nível 2 - Equiparado Rubrica 2026)',
        scoreCalibrado: 2,
        nivelOriginal: s,
        foiCalibrado: true,
        justificativaEquiparacao:
          'Calibrado para Atende Parcialmente (Nível 2) devido a lacunas estruturais apontadas nas evidências qualitativas de 2024.'
      };
    }
    return {
      nivelCalibrado: 'ATENDE INTEGRALMENTE. (Nível 3 - Rubrica 2026)',
      scoreCalibrado: 3,
      nivelOriginal: s,
      foiCalibrado: false,
      justificativaEquiparacao:
        'Consolidado como Nível 3 (Atende Integralmente): o registro de 2024 demonstra atendimento satisfatório aos objetivos pedagógicos da sessão.'
    };
  }

  if (scoreOrig === 2) {
    return {
      nivelCalibrado: 'ATENDE PARCIALMENTE. (Nível 2 - Rubrica 2026)',
      scoreCalibrado: 2,
      nivelOriginal: s,
      foiCalibrado: false,
      justificativaEquiparacao:
        'Mantido no Nível 2 (Atende Parcialmente): necessidade de ajustes no fechamento da aula ou na mediação ativa com os estudantes.'
    };
  }

  return {
    nivelCalibrado: 'NÃO ATENDE. (Nível 1 - Rubrica 2026)',
    scoreCalibrado: 1,
    nivelOriginal: s,
    foiCalibrado: false,
    justificativaEquiparacao:
      'Mantido no Nível 1 (Não Atende): ausência de evidências mínimas dos critérios previstos para a etapa.'
  };
}

/**
 * Formata um item de 2024 expandido com a adequação da Rubrica 2026
 */
function expandirItem2024(item) {
  const textoQualitativo = `${item.ev || ''} ${item.qp || ''} ${item.ps || ''}`;
  const adeqPratica = adequarNivel2024ParaRubrica2026(item.npr, textoQualitativo, 'pratica');
  const adeqPlan = adequarNivel2024ParaRubrica2026(item.npl, textoQualitativo, 'planejamento');

  return {
    id: item.id,
    id_origem: item.id,
    ano_letivo: '2024',
    ano_formativo: '1º ANO (2024)',
    ciclo_historico: '2024',
    semestre: 'Histórico 2024 (1º Ano)',
    carimbo: item.dp || item.do || item.df || '2024',
    nome_cursista: item.nc,
    nome_norm: item.nk || normalizeName(item.nc),
    email_cursista: (item.ec || '').trim().toLowerCase(),
    nome_formador: item.nf,
    email_formador: item.ef,
    componente: item.cp,
    tema: item.tm || 'Metodologias e Gestão de Sala (1º Ano 2024)',
    is_realizada: Boolean(item.ir),
    observacao_realizada: item.ir ? 'Sim' : 'Não Realizada',
    data_pratica: item.dp,
    data_observacao: item.do,
    data_feedback: item.df,
    modalidade_feedback: item.mf,
    link_gravacao_pratica: item.lp,
    link_gravacao_feedback: item.lf,
    evidencias_pratica: item.ev,
    questionamentos_propositivos: item.qp,
    proposicoes_sugestoes: item.ps,
    nivel_planejamento: adeqPlan.nivelCalibrado || item.npl,
    nivel_pratica: adeqPratica.nivelCalibrado || item.npr,
    nivel_planejamento_original: item.npl || '',
    nivel_pratica_original: item.npr || '',
    foi_calibrado_rubrica_2026: adeqPratica.foiCalibrado || adeqPlan.foiCalibrado,
    justificativa_rubrica_2026: adeqPratica.justificativaEquiparacao,
    justificativa_nao_realizada: item.jn
  };
}

/**
 * Formata um item de 2025 (2º Ano - Checklist PDP validado em testes-estagio-main)
 */
function expandirItem2025(item) {
  const mapNivel2025 = (n) => {
    const u = String(n || '').toUpperCase();
    if (u.includes('SUPERA')) return 'SUPERA. (Nível 4 - Rubrica 2026)';
    if (u.includes('INTEGRAL')) return 'ATENDE INTEGRALMENTE. (Nível 3 - Rubrica 2026)';
    if (u.includes('PARCIAL')) return 'ATENDE PARCIALMENTE. (Nível 2 - Rubrica 2026)';
    if (u.includes('NÃO') || u.includes('NAO')) return 'NÃO ATENDE. (Nível 1 - Rubrica 2026)';
    return 'ATENDE INTEGRALMENTE. (Nível 3 - Rubrica 2026)';
  };

  const nivelPratFormatado = item.ir ? mapNivel2025(item.npr) : '';
  const nivelPlanFormatado = item.ir ? mapNivel2025(item.npl) : '';

  const descOriginalPrat = item.ir
    ? `Checklist PDP 2025 (${item.te || 'Tema I'}): ${item.qpr || 0}/7 ações evidenciadas`
    : 'Não realizada';
  const descOriginalPlan = item.ir
    ? `Checklist Planejamento 2025 (${item.te || 'Tema I'}): ${item.qpl || 0}/6 itens`
    : 'Não realizada';

  const isSupera = String(item.npr || '').toUpperCase().includes('SUPERA');
  const justificativa2025 = isSupera
    ? `Adequação PDP 2025 (${item.te || 'Tema I'} - Referência Docente 4): cumpriu os 2 requisitos-chave da Rubrica 2026 (${item.qpr || 6}/7 ações do checklist) + evidências qualitativas de protagonismo/autoria nos Pontos Fortes, alcançando Nível 4 (Supera).`
    : `Adequação PDP 2025 (${item.te || 'Tema I'} - Referência Docente 4): checklist de ${item.qpr || 5}/7 ações e relato do formador agrupados nos 2 requisitos da Rubrica 2026 (Articulação Curricular + Uso Ativo de Recursos Digitais), consolidando ${item.npr || 'Atende integralmente'}.`;

  // Combina Pontos Fortes e Pontos de Melhoria para exibição rica no dossiê
  const evidenciasCombinadas = [
    item.pf ? `✅ Pontos Fortes: ${item.pf}` : '',
    item.pm ? `🔧 Pontos de Melhoria: ${item.pm}` : '',
    item.rf ? `💭 Reflexões: ${item.rf}` : ''
  ].filter(Boolean).join('\n\n');

  return {
    id: item.id,
    id_origem: item.id,
    ano_letivo: '2025',
    ano_formativo: item.af || '2º ANO (2025)',
    ciclo_historico: '2025',
    semestre: 'Histórico 2025 (2º Ano PDP)',
    carimbo: item.dp || item.do || item.df || item.ca || '2025',
    nome_cursista: item.nc,
    nome_norm: item.nk || normalizeName(item.nc),
    email_cursista: (item.ec || '').trim().toLowerCase(),
    cgm: item.cgm || '',
    nome_formador: item.nf,
    email_formador: item.ef,
    modalidade: item.md || 'Docentes',
    componente: item.cp,
    tema: `${item.tm || 'Referência Docente 4 - Ferramentas Educacionais'} (${item.te || 'Tema I'})`,
    proposta_pedagogica: item.te === 'Tema II'
      ? 'Tema II - Recursos Digitais na Prática Pedagógica'
      : 'Tema I - Uso de Plataformas Educacionais',
    is_realizada: Boolean(item.ir),
    observacao_realizada: item.ir ? 'Sim' : 'Não Realizada',
    data_pratica: item.dp,
    data_observacao: item.do,
    data_feedback: item.df,
    modalidade_feedback: item.mf,
    link_gravacao_pratica: item.lp,
    link_gravacao_feedback: item.lf,
    link_pdp: item.lpdp,
    evidencias_pratica: evidenciasCombinadas || item.cpr,
    evidencias_planejamento: item.cpl,
    questionamentos_propositivos: item.qp,
    proposicoes_sugestoes: item.cb,
    escala_boas_praticas: item.bp,
    nivel_planejamento: nivelPlanFormatado,
    nivel_pratica: nivelPratFormatado,
    nivel_planejamento_original: descOriginalPlan,
    nivel_pratica_original: descOriginalPrat,
    foi_calibrado_rubrica_2026: true,
    justificativa_rubrica_2026: justificativa2025
  };
}

/**
 * Carrega os arquivos estáticos /observacoes_2024.json e /observacoes_2025.json
 * de forma assíncrona com cache em memória (sem chamadas ao Google Sheets).
 */
export async function carregarObservacoes2024() {
  if (historicoCache) {
    return historicoCache;
  }

  if (carregarPromise) {
    return carregarPromise;
  }

  carregarPromise = (async () => {
    try {
      const [res2024, res2025] = await Promise.all([
        fetch('/observacoes_2024.json').catch(() => null),
        fetch('/observacoes_2025.json').catch(() => null)
      ]);

      let lista2024 = [];
      let lista2025 = [];

      if (res2024 && res2024.ok) {
        const data2024 = await res2024.json();
        if (Array.isArray(data2024)) {
          lista2024 = data2024.map(expandirItem2024);
        }
      }

      if (res2025 && res2025.ok) {
        const data2025 = await res2025.json();
        if (Array.isArray(data2025)) {
          lista2025 = data2025.map(expandirItem2025);
        }
      }

      const consolidado = [...lista2024, ...lista2025];
      historicoCache = consolidado;
      return consolidado;
    } catch (err) {
      console.warn('Erro ao carregar histórico 2024/2025:', err);
      return [];
    } finally {
      carregarPromise = null;
    }
  })();

  return carregarPromise;
}

/**
 * Retorna as observações históricas (2024 e 2025) correspondentes a um cursista específico (por e-mail, CGM ou nome)
 */
export async function getObservacoes2024PorCursista(cursista) {
  if (!cursista) return [];
  const todas = await carregarObservacoes2024();

  const emailCursista = (cursista.email || cursista.email_cursista || cursista['e-mail'] || '').trim().toLowerCase();
  const cgmCursista = String(cursista.cgm || '').trim();
  const nomeNorm = normalizeName(cursista.nome || cursista.nome_cursista || '');

  return todas.filter(obs => {
    if (emailCursista && obs.email_cursista && obs.email_cursista === emailCursista) {
      return true;
    }
    if (cgmCursista && obs.cgm && String(obs.cgm).trim() === cgmCursista) {
      return true;
    }
    if (nomeNorm && obs.nome_norm && obs.nome_norm === nomeNorm) {
      return true;
    }
    return false;
  });
}
