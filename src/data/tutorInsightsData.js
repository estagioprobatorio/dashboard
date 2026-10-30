/**
 * Base de Dados e Helpers do Portal Tutor Insights integrado.
 * Trata os 2 níveis superiores de observação formativa:
 * - Ação 1: Observação de Tutor pelo Técnico (Técnico avalia Tutor)
 * - Ação 2: Observação do Formador pelo Tutor (Tutor avalia Formador)
 * 
 * Conforme especificação em docs/DOCUMENTACAO_TECNICA_OBSERVACAO_TUTOR.md
 * Origem Google Sheets:
 * - SPREADSHEET_ID: 1V54Gl-KVGaHjLBH07hQZxq6GU88kfn0Xurh5P2LuSz8
 * - SHEET_NAME: Respostas ao formulário 1 (A2:AZ)
 */

export const SPREADSHEET_ID = "1V54Gl-KVGaHjLBH07hQZxq6GU88kfn0Xurh5P2LuSz8";
export const SHEET_NAME = "Respostas ao formulário 1";

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

export function stripAccents(s) {
  return (s || '').normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

export function normalizeStr(s) {
  return stripAccents((s || "").normalize("NFC").toLowerCase().trim());
}

export function scoreFor(v) {
  if (!v) return null;
  const u = v.normalize("NFC").toUpperCase();
  const plain = stripAccents(u);
  if (plain.includes("NAO ATENDEU") && !plain.includes("PARCIALMENTE")) return 0;
  if (plain.includes("PARCIALMENTE")) return 1;
  if (plain.includes("SUPEROU")) return 3;
  if (plain.includes("INTEGRALMENTE")) return 2;
  if (plain.includes("ATENDEU") && !plain.includes("PARCIALMENTE")) return 2;
  if (plain.includes("NAO OBSERVADO")) return null;
  return null;
}

export function classifyValue(v) {
  if (!v) return null;
  const plain = stripAccents(v.normalize("NFC").toUpperCase());
  if (plain.includes("SUPEROU")) return "superou";
  if (plain.includes("NAO OBSERVADO")) return null;
  if (plain.includes("PARCIALMENTE")) return "parcial";
  if (plain.includes("NAO ATENDEU")) return "nao";
  if (plain.includes("INTEGRALMENTE") || plain.includes("ATENDEU")) return "atendeu";
  return null;
}

export function detectModalidade(acaoObservada, acaoAcompanhamento) {
  const src = stripAccents((acaoObservada || acaoAcompanhamento || "").normalize("NFC").toLowerCase());
  if (src.includes("devolutiva")) return "Devolutiva";
  if (src.includes("encontro")) return "Encontro Formativo";
  return "Diálogo Formativo";
}

export const MOCK_TUTOR_OBSERVATIONS = [
  // ── Técnicos observando Tutores (Técnico avalia Tutor) ─────────────────────
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
    linksComplementares: "",
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
    linksComplementares: "",
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
    linksComplementares: "",
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
    timestamp: "2026-06-08 11:00:00",
    tutorEmail: "diego.costa@escola.pr.gov.br",
    tutor: "Diego Costa",
    formador: "Técnica Maria",
    formadorEmail: "tecnica.maria@escola.pr.gov.br",
    acaoAcompanhamento: "Observação de Tutor pelo Técnico",
    acaoObservada: "Diálogo Formativo",
    dataObservacao: "08/06/2026",
    linkAcaoObservada: "https://drive.google.com/file/d/demo-dialogo-4",
    dataFeedback: "09/06/2026",
    linkFeedback: "https://drive.google.com/file/d/demo-feedback-4",
    linksComplementares: "",
    modalidade: "Diálogo Formativo",
    rubrics: [
      { criterio: "Planejamento e prazo", value: "Atendeu integralmente", score: 2 },
      { criterio: "Etapas do diálogo formativo", value: "Atendeu integralmente", score: 2 },
      { criterio: "Materiais formativos", value: "Atendeu parcialmente", score: 1 },
      { criterio: "Questionamentos propositivos", value: "Não atendeu", score: 0 },
      { criterio: "Análise por evidências", value: "Atendeu parcialmente", score: 1 },
      { criterio: "Acolhimento e escuta ativa", value: "Atendeu integralmente", score: 2 },
      { criterio: "Mediação de conflitos", value: "Não observado", score: null },
      { criterio: "Sugestão de materiais e repertório", value: "Atendeu integralmente", score: 2 },
      { criterio: "Construção conjunta de combinados", value: "Atendeu integralmente", score: 2 },
      { criterio: "Gestão do tempo (10 a 20 min)", value: "Atendeu parcialmente", score: 1 },
    ],
    avgScore: 1.44,
    checklistRealizadas: "Acolhimento adequado, Construiu combinados claros",
    checklistNaoRealizadas: "Faltou propor questionamentos reflexivos profundos, Ultrapassou tempo limite",
    outrosRegistros: "Diego precisa incentivar mais a autoavaliação do professor e evitar dar respostas prontas.",
    destaques: "Acolhimento e mediação básica.",
    desenvolver: "Elaboração de perguntas reflexivas (maiêutica pedagógica) e gestão de tempo.",
    encaminhamentos: "Estudo sobre técnicas de questionamento reflexivo e prática assistida.",
    nre: "NRE Cascavel",
    tema: "Clima Escolar e Convivência",
  },

  // ── Tutores observando Formadores (Tutor avalia Formador) ────────────────
  {
    id: "obs-tut-5",
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
    linksComplementares: "",
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
    id: "obs-tut-6",
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
    linksComplementares: "",
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
    id: "obs-tut-7",
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
    linksComplementares: "",
    modalidade: "Diálogo Formativo",
    rubrics: [
      { criterio: "Planejamento e prazo", value: "Atendeu integralmente", score: 2 },
      { criterio: "Etapas do diálogo formativo", value: "Atendeu parcialmente", score: 1 },
      { criterio: "Materiais formativos", value: "Atendeu integralmente", score: 2 },
      { criterio: "Questionamentos propositivos", value: "Atendeu integralmente", score: 2 },
      { criterio: "Análise por evidências", value: "Atendeu integralmente", score: 2 },
      { criterio: "Acolhimento e escuta ativa", value: "Atendeu integralmente", score: 2 },
      { criterio: "Mediação de conflitos", value: "Não observado", score: null },
      { criterio: "Sugestão de materiais e repertório", value: "Atendeu integralmente", score: 2 },
      { criterio: "Construção conjunta de combinados", value: "Atendeu integralmente", score: 2 },
      { criterio: "Gestão do tempo (10 a 20 min)", value: "Atendeu integralmente", score: 2 },
    ],
    avgScore: 1.89,
    checklistRealizadas: "Estimulou a autoavaliação, Boas sugestões de encaminhamento",
    checklistNaoRealizadas: "Algumas etapas do diálogo formativo foram puladas ou aceleradas",
    outrosRegistros: "Daniela conduz bem, mas o diálogo pareceu um pouco apressado.",
    destaques: "Acolhimento, sugestão de materiais e combinados robustos.",
    desenvolver: "Aprofundar a mediação nas etapas iniciais de problematização.",
    encaminhamentos: "Alinhar o fluxo do diálogo com o roteiro pedagógico oficial no próximo encontro.",
    nre: "NRE Londrina",
    tema: "Metodologias Ativas",
  },
  {
    id: "obs-tut-8",
    timestamp: "2026-06-13 14:00:00",
    tutorEmail: "camila.lima@escola.pr.gov.br",
    tutor: "Camila Lima",
    formador: "Eduardo Formador",
    formadorEmail: "eduardo.formador@escola.pr.gov.br",
    acaoAcompanhamento: "Observação do Formador pelo Tutor",
    acaoObservada: "Diálogo Formativo",
    dataObservacao: "13/06/2026",
    linkAcaoObservada: "https://drive.google.com/file/d/demo-formador-4",
    dataFeedback: "14/06/2026",
    linkFeedback: "",
    linksComplementares: "",
    modalidade: "Diálogo Formativo",
    rubrics: [
      { criterio: "Planejamento e prazo", value: "Atendeu integralmente", score: 2 },
      { criterio: "Etapas do diálogo formativo", value: "Superou", score: 3 },
      { criterio: "Materiais formativos", value: "Superou", score: 3 },
      { criterio: "Questionamentos propositivos", value: "Superou", score: 3 },
      { criterio: "Análise por evidências", value: "Superou", score: 3 },
      { criterio: "Acolhimento e escuta ativa", value: "Superou", score: 3 },
      { criterio: "Mediação de conflitos", value: "Atendeu integralmente", score: 2 },
      { criterio: "Sugestão de materiais e repertório", value: "Superou", score: 3 },
      { criterio: "Construção conjunta de combinados", value: "Superou", score: 3 },
      { criterio: "Gestão do tempo (10 a 20 min)", value: "Superou", score: 3 },
    ],
    avgScore: 2.8,
    checklistRealizadas: "Excelente condução do diálogo, escuta atenta, sugestões muito úteis e práticas de artigos e atividades",
    checklistNaoRealizadas: "",
    outrosRegistros: "Eduardo foi extremamente inspirador e prático nas ideias que trouxe.",
    destaques: "Materiais didáticos enriquecedores, escuta ativa e mediação perfeita.",
    desenvolver: "Manter a alta qualidade do atendimento.",
    encaminhamentos: "Colocar em prática os novos métodos de engajamento sugeridos pelo Eduardo.",
    nre: "NRE Maringá",
    tema: "Planejamento Pedagógico",
  },
  {
    id: "obs-tut-9",
    timestamp: "2026-06-14 10:00:00",
    tutorEmail: "diego.costa@escola.pr.gov.br",
    tutor: "Diego Costa",
    formador: "Eduardo Formador",
    formadorEmail: "eduardo.formador@escola.pr.gov.br",
    acaoAcompanhamento: "Observação do Formador pelo Tutor",
    acaoObservada: "Devolutiva",
    dataObservacao: "14/06/2026",
    linkAcaoObservada: "https://drive.google.com/file/d/demo-formador-5",
    dataFeedback: "14/06/2026",
    linkFeedback: "",
    linksComplementares: "",
    modalidade: "Devolutiva",
    rubrics: [
      { criterio: "Planejamento e prazo", value: "Atendeu integralmente", score: 2 },
      { criterio: "Etapas da devolutiva", value: "Atendeu integralmente", score: 2 },
      { criterio: "Materiais formativos", value: "Atendeu parcialmente", score: 1 },
      { criterio: "Análise por evidências", value: "Atendeu integralmente", score: 2 },
      { criterio: "Sugestão de materiais e repertório", value: "Atendeu parcialmente", score: 1 },
      { criterio: "Gestão do tempo (5 a 10 min)", value: "Atendeu integralmente", score: 2 },
    ],
    avgScore: 1.67,
    checklistRealizadas: "Retorno respeitoso e pontual, Análise adequada de dados",
    checklistNaoRealizadas: "Materiais indicados foram genéricos",
    outrosRegistros: "Eduardo fez uma boa devolutiva, mas poderia trazer materiais de apoio mais práticos.",
    destaques: "Pontualidade e análise fundamentada de evidências.",
    desenvolver: "Aprofundar na seleção e sugestão de leituras e recursos práticos.",
    encaminhamentos: "Pesquisar materiais adicionais na biblioteca digital da SEED sobre o tema discutido.",
    nre: "NRE Cascavel",
    tema: "Avaliação da Aprendizagem",
  }
];

/**
 * Converte matriz bruta do Google Sheets (A2:AZ) em objetos ObservationRow estruturados.
 */
export function parseGoogleSheetsValues(values) {
  if (!Array.isArray(values) || values.length === 0) return [];

  return values
    .filter(r => r && r.length > 2 && (r[2] || "").toString().trim())
    .map((r, idx) => {
      const get = (i) => (r[i] !== undefined && r[i] !== null ? r[i].toString().trim() : "");

      const acaoObservada = get(6);
      const acaoAcompanhamento = get(5);
      const modalidade = detectModalidade(acaoObservada, acaoAcompanhamento);

      let rubrics = [];
      if (modalidade === "Diálogo Formativo") {
        rubrics = CRITERIOS_POR_MODALIDADE["Diálogo Formativo"].map((c, i) => ({
          criterio: c,
          value: get(12 + i),
          score: scoreFor(get(12 + i)),
        }));
      } else if (modalidade === "Devolutiva") {
        rubrics = CRITERIOS_POR_MODALIDADE["Devolutiva"].map((c, i) => ({
          criterio: c,
          value: get(22 + i),
          score: scoreFor(get(22 + i)),
        }));
      } else if (modalidade === "Encontro Formativo") {
        rubrics = CRITERIOS_POR_MODALIDADE["Encontro Formativo"].map((c, i) => ({
          criterio: c,
          value: get(28 + i),
          score: scoreFor(get(28 + i)),
        }));
      }

      const scored = rubrics.filter(x => x.score !== null);
      const avg = scored.length > 0
        ? parseFloat((scored.reduce((s, x) => s + (x.score || 0), 0) / scored.length).toFixed(2))
        : null;

      return {
        id: `obs-sheet-${idx + 1}`,
        timestamp: get(0),
        tutorEmail: get(1),
        tutor: get(2),
        formador: get(3),
        formadorEmail: get(4),
        acaoAcompanhamento,
        acaoObservada,
        dataObservacao: get(7),
        linkAcaoObservada: get(8),
        dataFeedback: get(9),
        linkFeedback: get(10),
        linksComplementares: get(11),
        modalidade,
        rubrics,
        avgScore: avg,
        checklistRealizadas: get(35),
        checklistNaoRealizadas: get(36),
        outrosRegistros: get(37),
        destaques: get(38),
        desenvolver: get(39),
        encaminhamentos: get(40),
        nre: get(42) || "NRE Curitiba",
        tema: get(43) || "Prática Pedagógica",
        formadorConfirmado: get(44) || undefined,
        tutorConfirmado: get(45) || undefined,
      };
    });
}

/**
 * Busca observações do Google Sheets com fallback para mock data estruturado.
 */
export async function fetchObservacoesTutor() {
  try {
    const url = `/api/sheets?sheetId=${SPREADSHEET_ID}&range=${encodeURIComponent(SHEET_NAME + '!A2:AZ')}`;
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      if (data && Array.isArray(data.values) && data.values.length > 0) {
        const parsed = parseGoogleSheetsValues(data.values);
        if (parsed.length > 0) {
          return parsed;
        }
      }
    }
  } catch (e) {
    console.warn("[TutorInsights] Consulta remota Google Sheets indisponível, utilizando base consolidada:", e);
  }

  return getTutorObservacoesLocais();
}

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
