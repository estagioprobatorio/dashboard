/**
 * Definições oficiais das Temáticas, Referências, Critérios e Rubricas
 * para o 1º Ano Formativo e 2º/3º Anos Formativos.
 * Organizadas rigorosamente em ordem numérica (Tema 1 ao Tema 7).
 */

export const TEMATICAS_1ANO = [
  {
    id: 'T1',
    numero: 1,
    nome: 'Tema 1: Referência 1 - Currículo e Materiais de Apoio',
    titulo: 'Currículo e Materiais de Apoio Pedagógico',
    referenciaTexto: 'Referência Docente 1 - Utilizar o currículo estadual e os materiais pedagógicos oficiais (RCO+Aulas, Livro Didático e trilhas de aprendizagem) com intencionalidade formativa e alinhamento pedagógico.',
    criterioTexto: 'Compreender a matriz curricular e planejar a aula mobilizando recursos e materiais didáticos adequados aos objetivos de aprendizagem previstos para a turma.',
    rubricas: {
      planejamento: {
        SUPEROU: 'Articula de forma primorosa a proposta curricular aos materiais de apoio, apresentando adaptações intencionais que enriquecem o objetivo de aprendizagem da aula.',
        ATINGE_INTEGRALMENTE: 'Seleciona materiais e conteúdos do RCO+Aulas adequados ao currículo e aos objetivos da aula com intencionalidade clara.',
        ATINGE_PARCIALMENTE: 'Utiliza os materiais de apoio de maneira fragmentada ou pouco articulada aos objetivos de aprendizagem planejados.',
        NAO_ATINGE: 'Planejamento desvinculado das referências curriculares ou materiais oficiais de apoio.'
      },
      pratica: {
        SUPEROU: 'Mobiliza os materiais pedagógicos com maestria, integrando intervenções formativas que potencializam a apreensão dos conceitos pelos estudantes.',
        ATINGE_INTEGRALMENTE: 'Executa a aula em consonância com o currículo e materiais previstos, garantindo clareza conceitual aos estudantes.',
        ATINGE_PARCIALMENTE: 'Apresenta os materiais de apoio mas com mediação mecânica ou sem aprofundamento das noções curriculares.',
        NAO_ATINGE: 'Divergência expressiva entre os materiais oficiais previstos e a condução da aula.'
      }
    }
  },
  {
    id: 'T2',
    numero: 2,
    nome: 'Tema 2: Referência 2 - Gestão de Sala de Aula',
    titulo: 'Gestão de Sala de Aula e Clima Escolar',
    referenciaTexto: 'Referência Docente 2 - Implementar técnicas de gestão de sala de aula para gerar um ambiente propício à aprendizagem dos estudantes.',
    criterioTexto: 'Conhecer o conceito de gestão de sala de aula, sua intencionalidade pedagógica e implementar técnicas de gestão que maximizem o tempo útil de aprendizagem.',
    rubricas: {
      planejamento: {
        SUPEROU: 'Descreve as características da turma, seleciona mais de uma técnica de gestão, indica alteração de layout e articula técnicas ao objetivo com passo a passo minucioso.',
        ATINGE_INTEGRALMENTE: 'Descreve características da turma, seleciona técnicas de gestão adequadas e detalha passo a passo justificando a intencionalidade pedagógica.',
        ATINGE_PARCIALMENTE: 'Seleciona técnica de gestão adequada mas descreve superficialmente a implementação sem detalhar a intencionalidade.',
        NAO_ATINGE: 'Seleciona técnica aleatoriamente sem intencionalidade ou não descreve sua implementação.'
      },
      pratica: {
        SUPEROU: 'Orienta claramente a dinâmica, layout adaptado ao objetivo, técnicas executadas em totalidade articuladas com maestria propiciando ambiente altamente favorável.',
        ATINGE_INTEGRALMENTE: 'Orienta os estudantes conforme o planejamento, executa as técnicas com intencionalidade clara e atende às características da turma.',
        ATINGE_PARCIALMENTE: 'Orientação aos estudantes superficial, técnica executada mas sem evidência de considerar o perfil da turma ou o objetivo da aula.',
        NAO_ATINGE: 'Técnica não é executada ou ocorre de forma parcial, sem evidência de orientação aos estudantes.'
      }
    }
  },
  {
    id: 'T3',
    numero: 3,
    nome: 'Tema 3: Referência 3 - Estratégias de Ensino',
    titulo: 'Estratégias de Ensino e Mediação Pedagógica',
    referenciaTexto: 'Referência Docente 3 - Diversificar estratégias de ensino que promovam a participação ativa e o raciocínio crítico dos estudantes.',
    criterioTexto: 'Mobilizar metodologias ativas e mediação pedagógica intencional promovendo protagonismo e construção de conhecimento pelos estudantes.',
    rubricas: {
      planejamento: {
        SUPEROU: 'Estrutura sequência didática diversificada com momentos de trabalho autônomo, em pares e coletivo, com intencionalidade primorosa.',
        ATINGE_INTEGRALMENTE: 'Articula metodologia ativa aos objetivos da aula com clareza nos comandos e momentos planejados.',
        ATINGE_PARCIALMENTE: 'Propõe atividades com pouca variação de estratégias ou dependência excessiva de aula expositiva tradicional.',
        NAO_ATINGE: 'Planejamento desprovido de estratégias didáticas claras.'
      },
      pratica: {
        SUPEROU: 'Mediação reflexiva que estimula perguntas profundas dos alunos, debate colaborativo e aplicação prática do conhecimento.',
        ATINGE_INTEGRALMENTE: 'Conduz as atividades estimulando a participação dos estudantes e intervindo para consolidar os conceitos.',
        ATINGE_PARCIALMENTE: 'Condução mecânica das atividades, com pouca mediação reflexiva ou engajamento desigual.',
        NAO_ATINGE: 'Não estabelece dinâmica de aprendizagem ativa em sala.'
      }
    }
  },
  {
    id: 'T4',
    numero: 4,
    nome: 'Tema 4: Referência 6 - Avaliação Externa',
    titulo: 'Avaliação Externa e Acompanhamento da Aprendizagem',
    referenciaTexto: 'Referência Docente 6 - Utilizar os resultados das avaliações externas (SAEB, Prova Paraná) como subsídio pedagógico para planejamento, replanejamento e intervenção focada no desenvolvimento das aprendizagens.',
    criterioTexto: 'Analisar e mobilizar os dados das avaliações de larga escala para orientar estratégias metodológicas de superação das fragilidades diagnosticadas dos estudantes.',
    rubricas: {
      planejamento: {
        SUPEROU: 'Mobiliza os descritores e matriz de referência da avaliação com intencionalidade clara, elaborando atividades diferenciadas e intervenções pontuais articuladas ao perfil da turma.',
        ATINGE_INTEGRALMENTE: 'Articula o conteúdo da aula aos descritores da avaliação diagnóstica com intencionalidade pedagógica evidenciada.',
        ATINGE_PARCIALMENTE: 'Menciona itens da avaliação diagnóstica, mas de forma fragmentada ou sem alinhamento direto aos objetivos da aula.',
        NAO_ATINGE: 'Não contempla os dados ou descritores das avaliações nos momentos planejados.'
      },
      pratica: {
        SUPEROU: 'Conduz a prática promovendo metacognição, retomada fundamentada de itens de menor proficiência e mediação interativa que assegura engajamento integral.',
        ATINGE_INTEGRALMENTE: 'Aplica estratégias coerentes com o planejamento, assegurando intervenção direcionada aos descritores e tempo de aprendizagem ativo dos estudantes.',
        ATINGE_PARCIALMENTE: 'Executa a aula com pouca mediação sobre as dificuldades mapeadas ou mantém dinâmica centrada apenas na exposição superficial.',
        NAO_ATINGE: 'A prática observada diverge do planejamento ou desconsidera a intencionalidade formativa diagnóstica.'
      }
    }
  },
  {
    id: 'T5',
    numero: 5,
    nome: 'Tema 5: Referência 7 - Instâncias Colegiadas',
    titulo: 'Instâncias Colegiadas e Gestão Democrática',
    referenciaTexto: 'Referência 7 - Integrar ações pedagógicas e participativas que articulem as decisões formativas às instâncias colegiadas da escola e ao engajamento comunitário.',
    criterioTexto: 'Promover a participação ativa dos estudantes e da comunidade na construção de combinados, projetos interdisciplinares e corresponsabilidade escolar.',
    rubricas: {
      planejamento: {
        SUPEROU: 'Estrutura momentos de corresponsabilidade e protagonismo estudantil, integrando combinados e devolutivas coletivas de forma colaborativa e contínua.',
        ATINGE_INTEGRALMENTE: 'Preveem momentos estruturados de escuta, definição de papéis e colaboração ativa entre os estudantes na aula.',
        ATINGE_PARCIALMENTE: 'Preveem trabalho coletivo apenas nominal, sem intencionalidade de protagonismo ou responsabilidade compartilhada.',
        NAO_ATINGE: 'Não contempla estratégias participativas ou integradoras.'
      },
      pratica: {
        SUPEROU: 'Demonstra mediação horizontal exemplar, estimulando autonomia crítica e liderança dos estudantes na resolução colaborativa das tarefas.',
        ATINGE_INTEGRALMENTE: 'Favorece o diálogo construtivo, cumprimento de combinados de convivência e participação equitativa dos alunos.',
        ATINGE_PARCIALMENTE: 'Coordena grupos com mediação frágil, havendo dispersão ou desequilíbrio na participação dos alunos.',
        NAO_ATINGE: 'Não estabelece clima propício à colaboração e ao diálogo.'
      }
    }
  },
  {
    id: 'T6',
    numero: 6,
    nome: 'Tema 6: Referência 4 - Programas de Educação Digital',
    titulo: 'Tecnologias Educacionais e Educação Digital',
    referenciaTexto: 'Referência Docente 4 - Incorporar plataformas e recursos tecnológicos digitais (RCO+Aulas, plataformas gamificadas e ferramentas educacionais) com intencionalidade pedagógica.',
    criterioTexto: 'Mobilizar recursos digitais e ambientes virtuais potencializando a personalização da aprendizagem e a interatividade dos estudantes.',
    rubricas: {
      planejamento: {
        SUPEROU: 'Integra ferramentas digitais de forma inovadora e diversificada, assegurando acessibilidade, acompanhamento individualizado e engajamento dinâmico.',
        ATINGE_INTEGRALMENTE: 'Seleciona ferramentas tecnológicas alinhadas aos objetivos de aprendizagem, com orientações transparentes para os estudantes.',
        ATINGE_PARCIALMENTE: 'Utiliza recursos digitais como mero substituto passivo de texto sem exploração interativa ou intencional.',
        NAO_ATINGE: 'Planejamento desprovido de intencionalidade quanto ao uso de recursos digitais propostos.'
      },
      pratica: {
        SUPEROU: 'Orienta com maestria a navegação e autonomia digital dos alunos, intervindo prontamente com feedbacks imediatos.',
        ATINGE_INTEGRALMENTE: 'Garante que os estudantes utilizem os recursos digitais de forma focada e produtiva durante o tempo pedagógico.',
        ATINGE_PARCIALMENTE: 'Ocorre dispersão no uso dos aparelhos/plataformas ou atrasos técnicos que comprometem o objetivo.',
        NAO_ATINGE: 'Uso ineficaz dos recursos tecnológicos com perda do foco de ensino.'
      }
    }
  },
  {
    id: 'T7',
    numero: 7,
    nome: 'Tema 7: Referência 5 - Avaliação Interna',
    titulo: 'Avaliação Formativa e Processual Interna',
    referenciaTexto: 'Referência Docente 5 - Implementar processos sistemáticos de avaliação formativa, autoavaliação e feedback contínuo ao longo da aula.',
    criterioTexto: 'Verificar a compreensão da turma em tempo real mediante perguntas orais, tarefas rápidas e critérios claros compartilhados.',
    rubricas: {
      planejamento: {
        SUPEROU: 'Define múltiplos pontos de checagem formativa, rubricas autoavaliativas para os estudantes e plano de ação imediato para dificuldades imprevistas.',
        ATINGE_INTEGRALMENTE: 'Planeja instrumentos ou técnicas claras de verificação de aprendizagem (ex: bilhete de saída, checagem oral, quiz formativo).',
        ATINGE_PARCIALMENTE: 'Prevê checagem superficial de entendimento (ex: apenas perguntar genericamente "entenderam?").',
        NAO_ATINGE: 'Não contempla nenhum mecanismo de avaliação formativa ao longo da aula.'
      },
      pratica: {
        SUPEROU: 'Realiza checagem diagnóstica contínua, ajusta o ritmo e estratégias didáticas em tempo real a partir das respostas dos alunos.',
        ATINGE_INTEGRALMENTE: 'Verifica o entendimento de grande parte da turma e devolve orientações pontuais de aprimoramento.',
        ATINGE_PARCIALMENTE: 'Realiza perguntas pontuais para apenas 1 ou 2 estudantes sem verificar o nível de apreensão da totalidade da turma.',
        NAO_ATINGE: 'Segue a aula sem verificar se os estudantes aprenderam ou se há dúvidas remanescentes.'
      }
    }
  }
];

export const TEMATICAS_2_3_ANO = [
  {
    id: 'T1',
    numero: 1,
    nome: 'Tema 1: Referência 1 - Currículo e Materiais de Apoio',
    titulo: 'Currículo e Materiais de Apoio Pedagógico',
    propostas: {
      'Proposta I': {
        titulo: 'Proposta I - Alinhamento Curricular e Uso Estratégico de Recursos Didáticos',
        criterio1: 'Critério 1: Planejamento articulado aos descritores curriculares e materiais oficiais',
        criterio2: 'Critério 2: Mediação prática integrando recursos pedagógicos diversificados'
      },
      'Proposta II': {
        titulo: 'Proposta II - Customização Curricular e Aprofundamento Metodológico',
        criterio1: 'Critério 1: Adaptação intencional dos conteúdos ao diagnóstico da turma',
        criterio2: 'Critério 2: Acompanhamento da aprendizagem com intervenções estruturadas'
      }
    }
  },
  {
    id: 'T2',
    numero: 2,
    nome: 'Tema 2: Referência 2 - Gestão de Sala de Aula',
    titulo: 'Gestão de Sala de Aula e Clima Escolar',
    propostas: {
      'Proposta I': {
        titulo: 'Proposta I - Aplicação e Monitoramento de Técnicas de Gestão de Sala',
        criterio1: 'Critério 1: Estruturação de rotinas, comandos e combinados de convivência',
        criterio2: 'Critério 2: Otimização do tempo de aprendizagem e mediação ativa do engajamento'
      },
      'Proposta II': {
        titulo: 'Proposta II - Reconfiguração de Layout e Dinâmicas Colaborativas',
        criterio1: 'Critério 1: Organização do espaço físico alinhada à intencionalidade pedagógica',
        criterio2: 'Critério 2: Intervenção preventiva e regulação do clima de aprendizagem'
      }
    }
  },
  {
    id: 'T3',
    numero: 3,
    nome: 'Tema 3: Referência 3 - Estratégias de Ensino',
    titulo: 'Estratégias de Ensino e Mediação Pedagógica',
    propostas: {
      'Proposta I': {
        titulo: 'Proposta I - Implementação de Metodologias Ativas e Trabalho em Pares',
        criterio1: 'Critério 1: Sequenciamento didático que estimula o protagonismo estudantil',
        criterio2: 'Critério 2: Mediação reflexiva com perguntas desafiadoras e checagem contínua'
      },
      'Proposta II': {
        titulo: 'Proposta II - Resolução de Problemas e Aprendizagem Investigativa',
        criterio1: 'Critério 1: Formulação de situações-problema articuladas à realidade dos estudantes',
        criterio2: 'Critério 2: Condução de sínteses conceituais e consolidação da aprendizagem'
      }
    }
  },
  {
    id: 'T4',
    numero: 4,
    nome: 'Tema 4: Referência 6 - Avaliação Externa',
    titulo: 'Acompanhamento de Metas e Avaliação Externa',
    propostas: {
      'Proposta I': {
        titulo: 'Proposta I - Análise e Intervenção Pedagógica a partir de Dados',
        criterio1: 'Critério 1: Mobilização e Análise Diagnóstica dos Resultados de Aprendizagem',
        criterio2: 'Critério 2: Implementação de Ações Formativas Diferenciadas para Superação de Defasagens'
      },
      'Proposta II': {
        titulo: 'Proposta II - Monitoramento Contínuo e Feedback Formativo aos Estudantes',
        criterio1: 'Critério 1: Sistemática de Acompanhamento das Metas de Proficiência',
        criterio2: 'Critério 2: Devolutivas Formativas Individuais e em Grupo com Planos de Recuperação'
      }
    }
  },
  {
    id: 'T5',
    numero: 5,
    nome: 'Tema 5: Referência 7 - Instâncias Colegiadas',
    titulo: 'Articulação Institucional e Gestão Democrática',
    propostas: {
      'Proposta I': {
        titulo: 'Proposta I - Fortalecimento da Gestão Democrática e Participação Estudantil',
        criterio1: 'Critério 1: Planejamento Participativo e Engajamento da Comunidade Escolar',
        criterio2: 'Critério 2: Implementação e Acompanhamento de Combinados e Ações Coletivas'
      },
      'Proposta II': {
        titulo: 'Proposta II - Liderança Pedagógica e Integração de Colegiados',
        criterio1: 'Critério 1: Mediação e Articulação com Conselho Escolar / Grêmio / APMF',
        criterio2: 'Critério 2: Impacto das Deliberações Coletivas no Clima e Desempenho Escolar'
      }
    }
  },
  {
    id: 'T6',
    numero: 6,
    nome: 'Tema 6: Referência 4 - Programas de Educação Digital',
    titulo: 'Inovação e Gestão de Tecnologias Educacionais',
    propostas: {
      'Proposta I': {
        titulo: 'Proposta I - Integração de Plataformas e Metodologias Digitais Ativas',
        criterio1: 'Critério 1: Planejamento e Intencionalidade no Uso de Recursos Digitais',
        criterio2: 'Critério 2: Mediação Pedagógica com Foco em Aprendizagem Personalizada'
      },
      'Proposta II': {
        titulo: 'Proposta II - Gestão de Dispositivos e Produção Autoral Digital',
        criterio1: 'Critério 1: Organização do Espaço e Mediação do Uso Responsável de Tecnologia',
        criterio2: 'Critério 2: Avaliação e Acompanhamento do Desempenho em Ambientes Digitais'
      }
    }
  },
  {
    id: 'T7',
    numero: 7,
    nome: 'Tema 7: Referência 5 - Avaliação Interna',
    titulo: 'Sistematização da Avaliação Formativa e Critérios',
    propostas: {
      'Proposta I': {
        titulo: 'Proposta I - Alinhamento de Critérios Avaliativos e Rubricas Claras',
        criterio1: 'Critério 1: Construção e Comunicação Transparente de Critérios aos Estudantes',
        criterio2: 'Critério 2: Aplicação de Instrumentos Diversificados com Feedback Oportuno'
      },
      'Proposta II': {
        titulo: 'Proposta II - Autoavaliação e Regulação da Aprendizagem',
        criterio1: 'Critério 1: Promoção de Estratégias Sistemáticas de Autoavaliação e Coavaliação',
        criterio2: 'Critério 2: Reorientação das Práticas Pedagógicas a partir das Evidências de Sala'
      }
    }
  }
];

export const ETAPAS_PDP_PROPOSTA = [
  { id: '1', label: '1 - Diagnóstico e levantamento de necessidades pedagógicas' },
  { id: '2', label: '2 - Planejamento detalhado das ações e recursos necessários' },
  { id: '3', label: '3 - Implementação prática com mediação pedagógica' },
  { id: '4', label: '4 - Acompanhamento e verificação dos resultados com estudantes' },
  { id: '5', label: '5 - Socialização e reflexão sobre a prática realizada' }
];

export const ESCALA_BOAS_PRATICAS = [
  { valor: 4, label: 'Supera as expectativas de boas práticas com autonomia e inovação', tag: 'Destaque' },
  { valor: 3, label: 'Atende integralmente aos padrões formativos e boas práticas', tag: 'Consolidado' },
  { valor: 2, label: 'Atende parcialmente, com aspectos essenciais em desenvolvimento', tag: 'Em evolução' },
  { valor: 1, label: 'Não atende aos critérios fundamentais das boas práticas', tag: 'Atenção prioritária' }
];
