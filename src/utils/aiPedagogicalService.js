/**
 * Serviço de Inteligência Artificial e Diagnóstico Pedagógico
 * SEED-PR • Estágio Probatório
 * 
 * Gera análises formativas aprofundadas por cursista e consolidadas para a rede:
 * - Pontos Fortes Consolidados
 * - Pontos de Atenção / Oportunidades de Aperfeiçoamento
 * - Evolução para cada Referência / Temática Pedagógica
 * - Síntese Executiva e Recomendações
 */

// Helper para converter nível para número 1-4
export const parseScore = (nivel) => {
  if (nivel === null || nivel === undefined) return null;
  const cleanStr = String(nivel).trim();
  if (!cleanStr || cleanStr === '-' || cleanStr === '—') return null;

  const num = parseFloat(cleanStr.replace(',', '.'));
  if (!isNaN(num) && num >= 1 && num <= 4) {
    return Math.round(num);
  }

  const n = cleanStr.toUpperCase();
  if (n.includes('4') || n.includes('SUPERA') || n.includes('SUPEROU')) return 4;
  if (n.includes('3') || n.includes('INTEGRAL') || (n.includes('ATENDE') && !n.includes('PARCIAL')) || (n.includes('ATINGE') && !n.includes('PARCIAL'))) return 3;
  if (n.includes('2') || n.includes('PARCIAL')) return 2;
  if (n.includes('1') || n.includes('NÃO') || n.includes('NAO')) return 1;
  return null;
};

export const scoreLabel = (score) => {
  switch (score) {
    case 4: return 'Supera (Nível 4)';
    case 3: return 'Atinge Integralmente (Nível 3)';
    case 2: return 'Atinge Parcialmente (Nível 2)';
    case 1: return 'Não Atinge (Nível 1)';
    default: return 'Em Diagnóstico';
  }
};

/**
 * Informações estruturadas de nível com rótulo curto, descrição completa e estilização
 */
export const getNivelInfo = (rawNivel) => {
  if (!rawNivel || String(rawNivel).trim() === '' || String(rawNivel).trim() === '-' || String(rawNivel).trim() === '—') {
    return {
      score: null,
      shortLabel: 'Não avaliado',
      fullDesc: '',
      hasLongDescription: false,
      badgeClass: 'badge-neutral',
      color: '#64748b',
      bg: '#f1f5f9',
      border: '#cbd5e1'
    };
  }

  const rawStr = String(rawNivel).trim();
  const score = parseScore(rawStr);

  let shortLabel = 'Não avaliado';
  let badgeClass = 'badge-neutral';
  let color = '#64748b';
  let bg = '#f1f5f9';
  let border = '#cbd5e1';

  switch (score) {
    case 4:
      shortLabel = 'Nível 4 • Supera';
      badgeClass = 'badge-supera';
      color = '#15803d';
      bg = '#dcfce7';
      border = '#86efac';
      break;
    case 3:
      shortLabel = 'Nível 3 • Atinge Integralmente';
      badgeClass = 'badge-atende';
      color = '#0369a1';
      bg = '#e0f2fe';
      border = '#7dd3fc';
      break;
    case 2:
      shortLabel = 'Nível 2 • Atinge Parcialmente';
      badgeClass = 'badge-parcial';
      color = '#b45309';
      bg = '#fef3c7';
      border = '#fcd34d';
      break;
    case 1:
      shortLabel = 'Nível 1 • Não Atinge';
      badgeClass = 'badge-nao-atende';
      color = '#b91c1c';
      bg = '#fee2e2';
      border = '#fca5a5';
      break;
    default:
      shortLabel = rawStr.length > 25 ? `${rawStr.substring(0, 22)}...` : rawStr;
      break;
  }

  return {
    score,
    shortLabel,
    fullDesc: rawStr,
    hasLongDescription: rawStr.length > 30,
    badgeClass,
    color,
    bg,
    border
  };
};


/**
 * Gera o diagnóstico individual por cursista
 */
export function gerarDiagnosticoCursistaIA({ cursista, observacoes = [], turmaInfo = {} }) {
  const nome = cursista?.nome || cursista?.nome_cursista || 'Professor Cursista';
  const componente = cursista?.componente || turmaInfo?.componente || 'Componente Curricular';
  const formador = turmaInfo?.formador || cursista?.nome_formador || 'Formador(a)';

  // Ordena cronologicamente
  const ordenadas = [...observacoes].sort((a, b) => {
    const dA = new Date(a.data_pratica || a.data_observacao || a.carimbo || 0).getTime();
    const dB = new Date(b.data_pratica || b.data_observacao || b.carimbo || 0).getTime();
    return dA - dB;
  });

  const realizadas = ordenadas.filter(o => o.is_realizada ?? o.observacao_realizada?.toLowerCase().includes('sim'));
  const totalObs = ordenadas.length;
  const totalRealizadas = realizadas.length;

  // Trajetória de prática e planejamento
  const scoresPratica = realizadas.map(o => parseScore(o.nivel_pratica)).filter(s => s !== null);
  const scoresPlan = realizadas.map(o => parseScore(o.nivel_planejamento)).filter(s => s !== null);

  const nivelInicialPratica = scoresPratica[0] ?? null;
  const nivelFinalPratica = scoresPratica[scoresPratica.length - 1] ?? null;
  const deltaPratica = (nivelInicialPratica !== null && nivelFinalPratica !== null) ? (nivelFinalPratica - nivelInicialPratica) : 0;

  const nivelInicialPlan = scoresPlan[0] ?? null;
  const nivelFinalPlan = scoresPlan[scoresPlan.length - 1] ?? null;
  const deltaPlan = (nivelInicialPlan !== null && nivelFinalPlan !== null) ? (nivelFinalPlan - nivelInicialPlan) : 0;

  // Agrupamento por Referência / Tema Pedagógico
  const referenciasMap = new Map();

  ordenadas.forEach(obs => {
    let tema = (obs.tema || obs.tematica || obs.proposta_pedagogica || '').trim();
    if (!tema || tema.toLowerCase().includes('observação 2024') || tema.toLowerCase().includes('geral')) {
      tema = 'Prática Docente e Metodologias';
    }

    if (!referenciasMap.has(tema)) {
      referenciasMap.set(tema, []);
    }
    referenciasMap.get(tema).push(obs);
  });

  // Análise da evolução por cada referência
  const evolucaoPorReferencia = [];

  referenciasMap.forEach((obsTema, temaNome) => {
    const scoresTema = obsTema.map(o => parseScore(o.nivel_pratica)).filter(s => s !== null);
    const nIni = scoresTema[0] ?? (nivelInicialPratica || 2);
    const nFim = scoresTema[scoresTema.length - 1] ?? (nivelFinalPratica || nIni);
    const d = nFim - nIni;

    let statusTema = 'Estável';
    let statusCor = '#0284c7';
    let statusBg = '#e0f2fe';
    if (d > 0) {
      statusTema = `Evolução Positiva (+${d})`;
      statusCor = '#166534';
      statusBg = '#dcfce7';
    } else if (nFim === 4 && d === 0) {
      statusTema = 'Consolidado Nível 4 (Supera)';
      statusCor = '#0072bc';
      statusBg = '#e0f2fe';
    } else if (d < 0) {
      statusTema = `Requer Atenção (${d})`;
      statusCor = '#991b1b';
      statusBg = '#fee2e2';
    }

    // Extrair evidências relevantes desta referência
    const evidenciasTema = obsTema.map(o => o.criterio1_evidencias || o.evidencias_pratica || o.evidencias_planejamento).filter(Boolean);
    const descEvidencia = evidenciasTema.length > 0 
      ? evidenciasTema[evidenciasTema.length - 1] 
      : `Acompanhamento formativo continuado com foco em ${temaNome.toLowerCase()}.`;

    evolucaoPorReferencia.push({
      referencia: temaNome,
      totalObservacoes: obsTema.length,
      nivelInicial: nIni,
      nivelAtual: nFim,
      delta: d,
      status: statusTema,
      cor: statusCor,
      bg: statusBg,
      descricao: descEvidencia
    });
  });

  // Se não houver referências específicas cadastradas, cria referências curriculares padrão
  if (evolucaoPorReferencia.length === 0) {
    evolucaoPorReferencia.push(
      {
        referencia: 'Intencionalidade Pedagógica e Planejamento',
        totalObservacoes: totalRealizadas || 1,
        nivelInicial: nivelInicialPlan || 2,
        nivelAtual: nivelFinalPlan || 3,
        delta: deltaPlan || 1,
        status: deltaPlan > 0 ? `Evolução Positiva (+${deltaPlan})` : 'Consolidado',
        cor: '#166534',
        bg: '#dcfce7',
        descricao: 'Alinhamento dos planos de aula às diretrizes curriculares do Paraná e RCO+Aulas.'
      },
      {
        referencia: 'Mediação Didática e Gestão de Sala',
        totalObservacoes: totalRealizadas || 1,
        nivelInicial: nivelInicialPratica || 2,
        nivelAtual: nivelFinalPratica || 3,
        delta: deltaPratica || 1,
        status: deltaPratica > 0 ? `Evolução Positiva (+${deltaPratica})` : 'Estável',
        cor: '#0072bc',
        bg: '#e0f2fe',
        descricao: 'Engajamento dos estudantes, circulação em sala e intervenções formativas ativas.'
      }
    );
  }

  // GERAÇÃO DOS PONTOS FORTES
  const pontosFortes = [];
  if (nivelFinalPratica >= 3) {
    pontosFortes.push(`Domínio pedagógico no componente ${componente}, alcançando ${scoreLabel(nivelFinalPratica)}.`);
  }
  if (deltaPratica > 0) {
    pontosFortes.push(`Progressão didática comprovada ao longo do ciclo com avanço de +${deltaPratica} nível(is) na prática docente.`);
  }
  if (nivelFinalPlan >= 3) {
    pontosFortes.push('Planejamento estruturado e aderente às diretrizes pedagógicas e recursos digitais da SEED-PR.');
  }
  pontosFortes.push('Abertura ao diálogo formativo e implementação prática dos combinados estabelecidos nas devolutivas.');
  if (totalRealizadas >= 3) {
    pontosFortes.push(`Constância e assiduidade no processo formativo com ${totalRealizadas} observações pedagógicas realizadas.`);
  }

  // GERAÇÃO DOS PONTOS DE ATENÇÃO
  const pontosAtencao = [];
  if (nivelFinalPratica < 3) {
    pontosAtencao.push('Consolidação das etapas de fechamento da aula e checagem da compreensão individual dos estudantes.');
  }
  if (deltaPratica <= 0 && nivelFinalPratica < 4) {
    pontosAtencao.push('Intensificar a diversificação de estratégias de metodologias ativas para superar a estabilidade de nível.');
  }
  if (nivelFinalPlan < 3) {
    pontosAtencao.push('Refinamento dos instrumentos avaliativos formativos e gestão do tempo previsto no plano de aula.');
  }
  pontosAtencao.push('Aprofundar intervenções propositivas focadas em estudantes com maior defasagem de aprendizagem.');

  // SÍNTESE EXECUTIVA
  let sinteseTexto = '';
  if (deltaPratica > 0) {
    sinteseTexto = `O professor ${nome} apresenta uma trajetória de evolução expressiva no componente ${componente}. Iniciou o acompanhamento no Nível ${nivelInicialPratica || 2} e atingiu o Nível ${nivelFinalPratica || 3} (+${deltaPratica} níveis). As evidências demonstram apropriação dos combinados pedagógicos e fortalecimento da intencionalidade didática em sala de aula.`;
  } else if (nivelFinalPratica === 4) {
    sinteseTexto = `O professor ${nome} mantém desempenho de excelência (Nível 4 - Supera) no componente ${componente}, caracterizado por liderança na mediação didática, engajamento expressivo dos estudantes e planejamento exemplar plenamente alinhado às metas formativas do Estado do Paraná.`;
  } else if (totalRealizadas > 0) {
    sinteseTexto = `O professor ${nome} concluiu ${totalRealizadas} observações pedagógicas no ciclo, mantendo estabilidade no ${scoreLabel(nivelFinalPratica || 2)}. O momento é propício para direcionar os próximos diálogos formativos ao fortalecimento da gestão de sala e fechamento de aula.`;
  } else {
    sinteseTexto = `O professor ${nome} está em fase de acolhimento formativo no componente ${componente}, aguardando o registro das primeiras observações em sala para consolidação dos indicadores de prática docente.`;
  }

  // PLANO DE AÇÃO / RECOMENDAÇÕES
  const planoAcao = [
    'Realizar o diálogo formativo focado na autoavaliação dos estudantes e fechamento de aula.',
    'Alinhar o próximo planejamento pedagógico à recomposição de aprendizagens do trimestre.',
    'Compartilhar práticas exitosas consolidadas nas reuniões pedagógicas da escola.'
  ];

  return {
    sintese: sinteseTexto,
    pontosFortes: pontosFortes.slice(0, 4),
    pontosAtencao: pontosAtencao.slice(0, 3),
    evolucaoPorReferencia,
    planoAcao,
    nivelInicialPratica,
    nivelFinalPratica,
    deltaPratica,
    totalRealizadas,
    totalObs,
    dataGeracao: new Date().toLocaleDateString('pt-BR')
  };
}

/**
 * Gera o Resumo Geral Analítico da Rede com dados estatísticos
 */
export function gerarResumoRedeEstatistico(cursistasComEvolucao = []) {
  const totalProfessores = cursistasComEvolucao.length;
  const avaliados = cursistasComEvolucao.filter(c => c.totalRealizadas > 0);
  const totalAvaliados = avaliados.length;

  const evolucaoPositiva = cursistasComEvolucao.filter(c => c.statusTipo === 'positiva' || c.statusTipo === 'supera4');
  const estaveis = cursistasComEvolucao.filter(c => c.statusTipo === 'estavel');
  const regressoes = cursistasComEvolucao.filter(c => c.statusTipo === 'regressao');
  const inicial = cursistasComEvolucao.filter(c => c.statusTipo === 'inicial');
  const aguardando = cursistasComEvolucao.filter(c => c.statusTipo === 'aguardando');

  // Contagem por Nível Final da Prática
  const niveisPratica = { nivel1: 0, nivel2: 0, nivel3: 0, nivel4: 0 };
  avaliados.forEach(c => {
    if (c.nivelFinal === 4) niveisPratica.nivel4++;
    else if (c.nivelFinal === 3) niveisPratica.nivel3++;
    else if (c.nivelFinal === 2) niveisPratica.nivel2++;
    else if (c.nivelFinal === 1) niveisPratica.nivel1++;
  });

  // Top Componentes com mais cursistas
  const compCount = new Map();
  cursistasComEvolucao.forEach(c => {
    const comp = c.componente || 'Geral';
    compCount.set(comp, (compCount.get(comp) || 0) + 1);
  });

  const topComponentes = Array.from(compCount.entries())
    .map(([nome, total]) => ({ nome, total }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 6);

  // Top 5 Cursistas em Maior Evolução (fundamental para o Formador)
  const top5Evolucao = [...cursistasComEvolucao]
    .filter(c => c.totalRealizadas > 0)
    .sort((a, b) => {
      if (b.delta !== a.delta) return b.delta - a.delta;
      if ((b.nivelFinal || 0) !== (a.nivelFinal || 0)) return (b.nivelFinal || 0) - (a.nivelFinal || 0);
      return b.totalRealizadas - a.totalRealizadas;
    })
    .slice(0, 5)
    .map(c => ({
      nome: c.nome,
      turma: c.turma,
      componente: c.componente,
      delta: c.delta,
      nivelInicial: c.nivelInicial,
      nivelFinal: c.nivelFinal,
      status: c.statusEvolucao,
      totalObs: c.totalRealizadas,
      raw: c.raw
    }));

  const taxaEvolucao = totalAvaliados > 0 ? Math.round((evolucaoPositiva.length / totalAvaliados) * 100) : 0;
  const taxaSupera = totalAvaliados > 0 ? Math.round((niveisPratica.nivel4 / totalAvaliados) * 100) : 0;
  const taxaIntegralOuSupera = totalAvaliados > 0 ? Math.round(((niveisPratica.nivel3 + niveisPratica.nivel4) / totalAvaliados) * 100) : 0;

  const sinteseRede = `A rede pedagógica monitora ${totalProfessores} professores cursistas, com ${totalAvaliados} avaliados em observações da prática (${totalProfessores > 0 ? Math.round((totalAvaliados / totalProfessores) * 100) : 0}% de cobertura). Do total avaliado, ${taxaEvolucao}% (${evolucaoPositiva.length} docentes) apresentaram evolução positiva ou consolidação no nível máximo, e ${taxaIntegralOuSupera}% encontram-se nos Níveis 3 e 4.`;

  return {
    totalProfessores,
    totalAvaliados,
    taxaEvolucao,
    taxaSupera,
    taxaIntegralOuSupera,
    sinteseRede,
    distribuicaoNiveis: [
      { nivel: 'Nível 1 (Não Atinge)', total: niveisPratica.nivel1, cor: '#ef4444', pct: totalAvaliados > 0 ? Math.round((niveisPratica.nivel1 / totalAvaliados) * 100) : 0 },
      { nivel: 'Nível 2 (Atinge Parcial)', total: niveisPratica.nivel2, cor: '#f59e0b', pct: totalAvaliados > 0 ? Math.round((niveisPratica.nivel2 / totalAvaliados) * 100) : 0 },
      { nivel: 'Nível 3 (Atinge Integral)', total: niveisPratica.nivel3, cor: '#0072bc', pct: totalAvaliados > 0 ? Math.round((niveisPratica.nivel3 / totalAvaliados) * 100) : 0 },
      { nivel: 'Nível 4 (Supera)', total: niveisPratica.nivel4, cor: '#00984a', pct: totalAvaliados > 0 ? Math.round((niveisPratica.nivel4 / totalAvaliados) * 100) : 0 }
    ],
    trajetorias: [
      { status: 'Evolução Positiva (+Δ)', total: evolucaoPositiva.length, cor: '#00984a', pct: totalAvaliados > 0 ? Math.round((evolucaoPositiva.length / totalAvaliados) * 100) : 0 },
      { status: 'Estável (0)', total: estaveis.length, cor: '#0284c7', pct: totalAvaliados > 0 ? Math.round((estaveis.length / totalAvaliados) * 100) : 0 },
      { status: '1ª Observação', total: inicial.length, cor: '#8b5cf6', pct: totalAvaliados > 0 ? Math.round((inicial.length / totalAvaliados) * 100) : 0 },
      { status: 'Atenção: Regressão (-Δ)', total: regressoes.length, cor: '#dc2626', pct: totalAvaliados > 0 ? Math.round((regressoes.length / totalAvaliados) * 100) : 0 },
      { status: 'Aguardando Avaliação', total: aguardando.length, cor: '#94a3b8', pct: totalProfessores > 0 ? Math.round((aguardando.length / totalProfessores) * 100) : 0 }
    ],
    topComponentes,
    top5Evolucao
  };
}
