/**
 * Base de Dados e Helpers do Portal Tutor Insights integrado.
 * Trata os 2 níveis superiores de observação formativa:
 * - Ação 1: Observação de Tutor pelo Técnico (Técnico avalia Tutor)
 * - Ação 2: Observação do Formador pelo Tutor (Tutor avalia Formador)
 */

export const MODALIDADES_TUTORIA = [
  "Diálogo Formativo",
  "Devolutiva",
  "Encontro Formativo"
];

export const CRITERIOS_POR_MODALIDADE = {
  "Diálogo Formativo": [
    "Planejamento e prazo",
    "Etapas do diálogo formativo",
    "Materiais formativos",
    "Questionamentos propositivos",
    "Análise por evidências",
    "Acolhimento e escuta ativa",
    "Mediação de conflitos",
    "Sugestão de materiais e repertório",
    "Construção conjunta de combinados",
    "Gestão do tempo (10 a 20 min)"
  ],
  "Devolutiva": [
    "Planejamento e prazo",
    "Etapas da devolutiva",
    "Materiais formativos",
    "Análise por evidências",
    "Sugestão de materiais e repertório",
    "Gestão do tempo (5 a 10 min)"
  ],
  "Encontro Formativo": [
    "Condução a partir do roteiro",
    "Orientação por PDP e rubrica",
    "Transposição didática e contextualização",
    "Gestão da interação",
    "Comunicação e clima formativo",
    "Competência digital",
    "Gestão do tempo"
  ]
};

export const MOCK_TUTOR_OBSERVATIONS = [
  {
    id: "obs-tut-1",
    timestamp: "2026-06-01 10:00:00",
    tutorEmail: "ana.silva@escola.pr.gov.br",
    tutor: "Ana Silva",
    formador: "Técnico João",
    formadorEmail: "tecnico.joao@escola.pr.gov.br",
    acaoAcompanhamento: "Observação de Tutor pelo Técnico",
    acaoObservada: "Diálogo Formativo",
    dataObservacao: "01/06/2026",
    linkAcaoObservada: "https://drive.google.com/file/d/demo-dialogo-1",
    dataFeedback: "02/06/2026",
    linkFeedback: "https://drive.google.com/file/d/demo-feedback-1",
    modalidade: "Diálogo Formativo",
    rubrics: [
      { criterio: "Planejamento e prazo", value: "Superou", score: 3 },
      { criterio: "Etapas do diálogo formativo", value: "Atendeu integralmente", score: 2 },
      { criterio: "Materiais formativos", value: "Atendeu integralmente", score: 2 },
      { criterio: "Questionamentos propositivos", value: "Atendeu integralmente", score: 2 },
      { criterio: "Análise por evidências", value: "Atendeu integralmente", score: 2 },
      { criterio: "Acolhimento e escuta ativa", value: "Superou", score: 3 },
      { criterio: "Mediação de conflitos", value: "Atendeu integralmente", score: 2 },
      { criterio: "Sugestão de materiais e repertório", value: "Atendeu parcialmente", score: 1 },
      { criterio: "Construção conjunta de combinados", value: "Atendeu integralmente", score: 2 },
      { criterio: "Gestão do tempo (10 a 20 min)", value: "Superou", score: 3 },
    ],
    avgScore: 2.2,
    checklistRealizadas: "Acolhimento realizado com empatia, Escuta ativa durante o relato, Combinados estabelecidos com prazos",
    checklistNaoRealizadas: "Não sugeriu materiais complementares de forma robusta",
    outrosRegistros: "Ana demonstrou excelente postura reflexiva.",
    destaques: "Acolhimento, escuta ativa e gestão do tempo excelentes.",
    desenvolver: "Indicação de repertório teórico e sugestão de novos materiais pedagógicos.",
    encaminhamentos: "Realizar novos estudos dirigidos sobre a temática e repassar referências no próximo encontro.",
    nre: "NRE Curitiba",
    tema: "Gestão de Sala de Aula",
  },
  {
    id: "obs-tut-2",
    timestamp: "2026-06-03 14:30:00",
    tutorEmail: "bruno.santos@escola.pr.gov.br",
    tutor: "Bruno Santos",
    formador: "Técnica Maria",
    formadorEmail: "tecnica.maria@escola.pr.gov.br",
    acaoAcompanhamento: "Observação de Tutor pelo Técnico",
    acaoObservada: "Devolutiva",
    dataObservacao: "03/06/2026",
    linkAcaoObservada: "https://drive.google.com/file/d/demo-devolutiva-2",
    dataFeedback: "03/06/2026",
    linkFeedback: "https://drive.google.com/file/d/demo-feedback-2",
    modalidade: "Devolutiva",
    rubrics: [
      { criterio: "Planejamento e prazo", value: "Atendeu parcialmente", score: 1 },
      { criterio: "Etapas da devolutiva", value: "Atendeu integralmente", score: 2 },
      { criterio: "Materiais formativos", value: "Atendeu integralmente", score: 2 },
      { criterio: "Análise por evidências", value: "Não atendeu", score: 0 },
      { criterio: "Sugestão de materiais e repertório", value: "Atendeu parcialmente", score: 1 },
      { criterio: "Gestão do tempo (5 a 10 min)", value: "Atendeu integralmente", score: 2 },
    ],
    avgScore: 1.33,
    checklistRealizadas: "Cumpriu o tempo previsto, Uso de materiais didáticos oficiais",
    checklistNaoRealizadas: "Não utilizou evidências de sala de aula, Prazos de planejamento estourados",
    outrosRegistros: "Necessita focar mais em dados empíricos da atuação do docente.",
    destaques: "Didática na explicação dos critérios.",
    desenvolver: "Coleta e análise de evidências reais durante a observação de aula.",
    encaminhamentos: "Agendar sessão de mentoria com coordenador pedagógico sobre análise de evidências.",
    nre: "NRE Londrina",
    tema: "Metodologias Ativas",
  },
  {
    id: "obs-tut-3",
    timestamp: "2026-06-05 09:15:00",
    tutorEmail: "camila.lima@escola.pr.gov.br",
    tutor: "Camila Lima",
    formador: "Técnico João",
    formadorEmail: "tecnico.joao@escola.pr.gov.br",
    acaoAcompanhamento: "Observação de Tutor pelo Técnico",
    acaoObservada: "Encontro Formativo",
    dataObservacao: "05/06/2026",
    linkAcaoObservada: "https://drive.google.com/file/d/demo-encontro-3",
    dataFeedback: "06/06/2026",
    linkFeedback: "https://drive.google.com/file/d/demo-feedback-3",
    modalidade: "Encontro Formativo",
    rubrics: [
      { criterio: "Condução a partir do roteiro", value: "Superou", score: 3 },
      { criterio: "Orientação por PDP e rubrica", value: "Superou", score: 3 },
      { criterio: "Transposição didática e contextualização", value: "Atendeu integralmente", score: 2 },
      { criterio: "Gestão da interação", value: "Superou", score: 3 },
      { criterio: "Comunicação e clima formativo", value: "Superou", score: 3 },
      { criterio: "Competência digital", value: "Atendeu integralmente", score: 2 },
      { criterio: "Gestão do tempo", value: "Atendeu integralmente", score: 2 },
    ],
    avgScore: 2.57,
    checklistRealizadas: "Excelente engajamento do grupo, Roteiro seguido à risca, Domínio das plataformas digitais",
    checklistNaoRealizadas: "",
    outrosRegistros: "Encontro muito produtivo. Camila tem excelente oratória e controle de grupo.",
    destaques: "Gestão da interação, clima formativo acolhedor e comunicação clara.",
    desenvolver: "Estimular ainda mais a participação dos formadores mais tímidos.",
    encaminhamentos: "Continuar mantendo as boas práticas de moderação de fórum observadas.",
    nre: "NRE Maringá",
    tema: "Avaliação da Aprendizagem",
  },
  {
    id: "obs-tut-4",
    timestamp: "2026-06-10 15:00:00",
    tutorEmail: "ana.silva@escola.pr.gov.br",
    tutor: "Ana Silva",
    formador: "Carlos Formador",
    formadorEmail: "carlos.formador@escola.pr.gov.br",
    acaoAcompanhamento: "Observação do Formador pelo Tutor",
    acaoObservada: "Encontro Formativo",
    dataObservacao: "10/06/2026",
    linkAcaoObservada: "https://drive.google.com/file/d/demo-formador-1",
    dataFeedback: "11/06/2026",
    linkFeedback: "https://drive.google.com/file/d/demo-feedback-f1",
    modalidade: "Encontro Formativo",
    rubrics: [
      { criterio: "Condução a partir do roteiro", value: "Superou", score: 3 },
      { criterio: "Orientação por PDP e rubrica", value: "Atendeu integralmente", score: 2 },
      { criterio: "Transposição didática e contextualização", value: "Superou", score: 3 },
      { criterio: "Gestão da interação", value: "Superou", score: 3 },
      { criterio: "Comunicação e clima formativo", value: "Superou", score: 3 },
      { criterio: "Competência digital", value: "Superou", score: 3 },
      { criterio: "Gestão do tempo", value: "Atendeu integralmente", score: 2 },
    ],
    avgScore: 2.71,
    checklistRealizadas: "Excelente domínio de conteúdo, Comunicação extremamente acolhedora e inspiradora",
    checklistNaoRealizadas: "",
    outrosRegistros: "Carlos é um formador fantástico, muito atencioso e claro nas orientações.",
    destaques: "Clima formativo excelente, domínio absoluto do conteúdo e condução dinâmica.",
    desenvolver: "Ajustar levemente a transição entre tópicos para otimizar o tempo final.",
    encaminhamentos: "Manter o ritmo dos encontros. Excelente mentoria.",
    nre: "NRE Curitiba",
    tema: "Planejamento Pedagógico",
  },
  {
    id: "obs-tut-5",
    timestamp: "2026-06-11 16:00:00",
    tutorEmail: "ana.silva@escola.pr.gov.br",
    tutor: "Ana Silva",
    formador: "Daniela Formadora",
    formadorEmail: "daniela.formadora@escola.pr.gov.br",
    acaoAcompanhamento: "Observação do Formador pelo Tutor",
    acaoObservada: "Devolutiva",
    dataObservacao: "11/06/2026",
    linkAcaoObservada: "https://drive.google.com/file/d/demo-formador-2",
    dataFeedback: "12/06/2026",
    linkFeedback: "",
    modalidade: "Devolutiva",
    rubrics: [
      { criterio: "Planejamento e prazo", value: "Atendeu integralmente", score: 2 },
      { criterio: "Etapas da devolutiva", value: "Atendeu integralmente", score: 2 },
      { criterio: "Materiais formativos", value: "Atendeu integralmente", score: 2 },
      { criterio: "Análise por evidências", value: "Atendeu integralmente", score: 2 },
      { criterio: "Sugestão de materiais e repertório", value: "Atendeu integralmente", score: 2 },
      { criterio: "Gestão do tempo (5 a 10 min)", value: "Atendeu integralmente", score: 2 },
    ],
    avgScore: 2.0,
    checklistRealizadas: "Pontualidade nas entregas, Clareza nos apontamentos de melhoria",
    checklistNaoRealizadas: "",
    outrosRegistros: "Daniela deu um retorno muito estruturado e útil para o trabalho dos cursistas.",
    destaques: "Retornos organizados e análise precisa de evidências.",
    desenvolver: "Poderia indicar leituras complementares mais específicas da área.",
    encaminhamentos: "Aplicar as sugestões pedagógicas fornecidas na próxima aula prática.",
    nre: "NRE Ponta Grossa",
    tema: "Gestão de Sala de Aula",
  },
  {
    id: "obs-tut-6",
    timestamp: "2026-06-12 09:00:00",
    tutorEmail: "bruno.santos@escola.pr.gov.br",
    tutor: "Bruno Santos",
    formador: "Daniela Formadora",
    formadorEmail: "daniela.formadora@escola.pr.gov.br",
    acaoAcompanhamento: "Observação do Formador pelo Tutor",
    acaoObservada: "Diálogo Formativo",
    dataObservacao: "12/06/2026",
    linkAcaoObservada: "https://drive.google.com/file/d/demo-formador-3",
    dataFeedback: "12/06/2026",
    linkFeedback: "",
    modalidade: "Diálogo Formativo",
    rubrics: [
      { criterio: "Planejamento e prazo", value: "Atendeu parcialmente", score: 1 },
      { criterio: "Etapas do diálogo formativo", value: "Atendeu integralmente", score: 2 },
      { criterio: "Materiais formativos", value: "Atendeu integralmente", score: 2 },
      { criterio: "Questionamentos propositivos", value: "Atendeu parcialmente", score: 1 },
      { criterio: "Análise por evidências", value: "Atendeu integralmente", score: 2 },
      { criterio: "Acolhimento e escuta ativa", value: "Atendeu integralmente", score: 2 },
      { criterio: "Mediação de conflitos", value: "Não observado", score: null },
      { criterio: "Sugestão de materiais e repertório", value: "Não atendeu", score: 0 },
      { criterio: "Construção conjunta de combinados", value: "Atendeu integralmente", score: 2 },
      { criterio: "Gestão do tempo (10 a 20 min)", value: "Atendeu parcialmente", score: 1 },
    ],
    avgScore: 1.44,
    checklistRealizadas: "Acolhimento empático",
    checklistNaoRealizadas: "Faltou sugestão de repertório pedagógico",
    outrosRegistros: "Estimular o docente a fundamentar melhor a literatura pedagógica.",
    destaques: "Acolhimento e escuta.",
    desenvolver: "Indicação de referências teóricas e metodológicas.",
    encaminhamentos: "Encaminhar link do repositório da SEED com os cadernos formativos.",
    nre: "NRE Cascavel",
    tema: "Currículo e Materiais",
  }
];

export function getTutorObservacoesLocais() {
  try {
    const raw = localStorage.getItem('tutor_insights_observacoes');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return [...parsed, ...MOCK_TUTOR_OBSERVATIONS];
      }
    }
  } catch (e) {
    console.error('Erro ao ler localStorage de observações de tutoria:', e);
  }
  return MOCK_TUTOR_OBSERVATIONS;
}

export function salvarNovaObservacaoTutoria(novaObs) {
  try {
    const raw = localStorage.getItem('tutor_insights_observacoes');
    const atuais = raw ? JSON.parse(raw) : [];
    const id = `obs-tut-local-${Date.now()}`;
    const obsCompleta = { ...novaObs, id, timestamp: new Date().toISOString() };
    atuais.unshift(obsCompleta);
    localStorage.setItem('tutor_insights_observacoes', JSON.stringify(atuais));
    return obsCompleta;
  } catch (e) {
    console.error('Erro ao salvar no localStorage:', e);
    return novaObs;
  }
}
