/**
 * Serviço de Gamificação Formativa do Estágio Probatório
 * 
 * ATENÇÃO: As medalhas e níveis aqui calculados são estritamente FORMATIVOS e MOTIVACIONAIS,
 * servindo como reconhecimento do engajamento e desenvolvimento pedagógico contínuo.
 * NÃO possuem qualquer efeito somativo ou caráter punitivo na avaliação formal do estágio probatório.
 */

export const MEDALHAS_FORMATIVAS = {
  BRONZE: {
    id: 'bronze',
    nome: 'Medalha de Bronze',
    subtitulo: 'Início da Jornada Formativa',
    icone: '🥉',
    cor: '#cd7f32',
    bgCor: 'rgba(205, 127, 50, 0.15)',
    borda: '#b87333',
    descricao: 'Ingresso no ciclo formativo com registro de observação inicial ou diagnóstico de planejamento pedagógico.',
    criterios: 'Pelo menos 1 observação pedagógica registrada.'
  },
  PRATA: {
    id: 'prata',
    nome: 'Medalha de Prata',
    subtitulo: 'Participação & Desenvolvimento',
    icone: '🥈',
    cor: '#94a3b8',
    bgCor: 'rgba(148, 163, 184, 0.18)',
    borda: '#64748b',
    descricao: 'Engajamento consistente no ciclo com evolução em práticas essenciais de planejamento e sala de aula.',
    criterios: 'Pelo menos 2 observações pedagógicas com menção predominante "Atendeu integralmente" ou média ≥ 1.8.'
  },
  OURO: {
    id: 'ouro',
    nome: 'Medalha de Ouro',
    subtitulo: 'Consistência & Domínio da Prática',
    icone: '🥇',
    cor: '#f59e0b',
    bgCor: 'rgba(245, 158, 11, 0.18)',
    borda: '#d97706',
    descricao: 'Domínio consolidado dos critérios curriculares, gestão de sala assertiva e mediação pedagógica propositiva.',
    criterios: 'Pelo menos 3 observações pedagógicas com média formativa ≥ 2.3.'
  },
  DIAMANTE: {
    id: 'diamante',
    nome: 'Medalha Diamante',
    subtitulo: 'Excelência & Prática Inspiradora',
    icone: '💎',
    cor: '#0ea5e9',
    bgCor: 'rgba(14, 165, 233, 0.18)',
    borda: '#0284c7',
    descricao: 'Práticas pedagógicas exemplares com alta superação de expectativas, transposição inovadora e clima inspirador.',
    criterios: 'Pelo menos 3 observações com notas "Superou" frequentes e média formativa ≥ 2.7.'
  }
};

/**
 * Converte menções textuais em pontuação numérica de 0 a 3
 */
export function converterMencaoParaScore(mencao) {
  if (!mencao) return null;
  const texto = String(mencao).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
  if (texto.includes("SUPEROU")) return 3.0;
  if (texto.includes("PARCIAL")) return 1.0;
  if (texto.includes("NAO ATENDEU") || texto.includes("NAO ATINGE")) return 0.0;
  if (texto.includes("INTEGRALMENTE") || texto.includes("ATENDEU") || texto.includes("ATINGE")) return 2.0;
  return null;
}

/**
 * Calcula o nível de medalha formativa para um cursista com base no histórico de observações
 * @param {Array} observacoesDoCursista 
 * @returns {Object} Objeto com medalha, score, total de observações e progresso para o próximo nível
 */
export function calcularMedalhaCursista(observacoesDoCursista = []) {
  const total = observacoesDoCursista.length;

  if (total === 0) {
    return {
      medalha: null,
      nivel: 0,
      totalObservacoes: 0,
      mediaGeral: 0,
      progressoProximoNivel: 0,
      proximaMedalha: MEDALHAS_FORMATIVAS.BRONZE,
      mensagem: 'Aguardando o primeiro registro de observação pedagógica para desbloquear a Medalha de Bronze.'
    };
  }

  // Extrai notas das observações
  const scores = [];
  let qtdSuperou = 0;

  observacoesDoCursista.forEach(obs => {
    // Avalia campos de nota conhecidos (planejamento, prática, nota final ou critérios de rubricas)
    const notaPlan = converterMencaoParaScore(obs.planejamento || obs.planejamento_conceito);
    const notaPrat = converterMencaoParaScore(obs.pratica || obs.pratica_conceito);
    
    if (notaPlan !== null) {
      scores.push(notaPlan);
      if (notaPlan === 3) qtdSuperou++;
    }
    if (notaPrat !== null) {
      scores.push(notaPrat);
      if (notaPrat === 3) qtdSuperou++;
    }

    // Se for observação com rubricas aninhadas
    if (Array.isArray(obs.rubrics)) {
      obs.rubrics.forEach(r => {
        const s = r.score !== undefined ? r.score : converterMencaoParaScore(r.value);
        if (s !== null) {
          scores.push(s);
          if (s === 3) qtdSuperou++;
        }
      });
    }

    // Se tiver avgScore numérico direto
    if (typeof obs.avgScore === 'number' && !isNaN(obs.avgScore)) {
      scores.push(obs.avgScore);
      if (obs.avgScore >= 2.8) qtdSuperou++;
    }
  });

  const media = scores.length > 0
    ? (scores.reduce((acc, curr) => acc + curr, 0) / scores.length)
    : 2.0; // Fallback se tiver observações mas sem campos parseáveis

  // Regras de concessão
  if (total >= 3 && media >= 2.65 && qtdSuperou >= 3) {
    return {
      medalha: MEDALHAS_FORMATIVAS.DIAMANTE,
      nivel: 4,
      totalObservacoes: total,
      mediaGeral: Number(media.toFixed(2)),
      progressoProximoNivel: 100,
      proximaMedalha: null,
      mensagem: 'Parabéns! Você alcançou o nível Diamante com excelência e práticas pedagógicas inspiradoras.'
    };
  }

  if (total >= 3 && media >= 2.25) {
    const progressoDiamante = Math.min(95, Math.round(((media - 2.25) / 0.45) * 50 + (total >= 4 ? 40 : 20)));
    return {
      medalha: MEDALHAS_FORMATIVAS.OURO,
      nivel: 3,
      totalObservacoes: total,
      mediaGeral: Number(media.toFixed(2)),
      progressoProximoNivel: progressoDiamante,
      proximaMedalha: MEDALHAS_FORMATIVAS.DIAMANTE,
      mensagem: 'Excelente consistência pedagógica! Continue aprofundando suas práticas para alcançar a medalha Diamante.'
    };
  }

  if (total >= 2 && media >= 1.7) {
    const progressoOuro = Math.min(90, Math.round(((media - 1.7) / 0.6) * 60 + (total >= 3 ? 30 : 15)));
    return {
      medalha: MEDALHAS_FORMATIVAS.PRATA,
      nivel: 2,
      totalObservacoes: total,
      mediaGeral: Number(media.toFixed(2)),
      progressoProximoNivel: progressoOuro,
      proximaMedalha: MEDALHAS_FORMATIVAS.OURO,
      mensagem: 'Ótima evolução formativa! Você está consolidando seu domínio pedagógico rumo à medalha de Ouro.'
    };
  }

  // Caso contrário, Bronze
  const progressoPrata = Math.min(85, Math.round((total / 2) * 50 + (media >= 1.5 ? 30 : 10)));
  return {
    medalha: MEDALHAS_FORMATIVAS.BRONZE,
    nivel: 1,
    totalObservacoes: total,
    mediaGeral: Number(media.toFixed(2)),
    progressoProximoNivel: progressoPrata,
    proximaMedalha: MEDALHAS_FORMATIVAS.PRATA,
    mensagem: 'Jornada formativa iniciada com sucesso! Continue participando das observações para avançar de nível.'
  };
}
