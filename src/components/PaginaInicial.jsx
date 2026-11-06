import React, { useState, useMemo } from 'react';

/**
 * Componente: PaginaInicial (Home / Portal de Ferramentas)
 * Apresenta a visão inicial da plataforma com cards interativos para cada módulo/ferramenta,
 * respeitando os perfis de acesso (RBAC) e proporcionando navegação intuitiva.
 */
export default function PaginaInicial({
  user,
  userRole,
  isSuperAdminTutor,
  recordsCount = 0,
  observacoesCount = 0,
  movimentacoesCount = 0,
  movimentacoesPendentesCount = 0,
  tutoresCount = 0,
  concluintesCount = 0,
  exoneradosCount = 0,
  onNavigate
}) {
  const [searchTerm, setSearchTerm] = useState('');

  // Nome do usuário para a saudação
  const userName = user?.displayName || user?.name || 'Servidor(a)';
  const primeiroNome = userName.split(' ')[0];

  // Ferramentas da Gestão Pedagógica
  const ferramentasPedagogicas = useMemo(() => [
    {
      id: 'observacoes_overview',
      tab: 'observacoes_overview',
      macroPilar: 'pedagogica',
      titulo: 'Panorama Geral das Observações',
      categoria: 'Estatísticas & Gráficos',
      subtitulo: 'Observações 2026',
      descricao: 'Visão consolidada dos registros de prática pedagógica por Núcleo Regional (NRE), etapa formativa, formador e gráficos analíticos.',
      icone: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="20" x2="18" y2="10"></line>
          <line x1="12" y1="20" x2="12" y2="4"></line>
          <line x1="6" y1="20" x2="6" y2="14"></line>
        </svg>
      ),
      corDestaque: '#0284c7',
      bgIcone: 'rgba(2, 132, 199, 0.1)',
      badge: observacoesCount > 0 ? `${observacoesCount.toLocaleString('pt-BR')} registros` : '1º e 2º Sem.',
      badgeCor: '#0284c7',
      disponivel: true
    },
    {
      id: 'observacoes',
      tab: 'observacoes',
      macroPilar: 'pedagogica',
      titulo: 'Observação por Cursista',
      categoria: 'Prática Pedagógica',
      subtitulo: 'Observações 2026',
      descricao: 'Consulta detalhada das observações individuais da prática docente em sala de aula, feedbacks pontuais e temas trabalhados.',
      icone: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
          <polyline points="14 2 14 8 20 8"></polyline>
          <line x1="16" y1="13" x2="8" y2="13"></line>
          <line x1="16" y1="17" x2="8" y2="17"></line>
          <polyline points="10 9 9 9 8 9"></polyline>
        </svg>
      ),
      corDestaque: '#0ea5e9',
      bgIcone: 'rgba(14, 165, 233, 0.1)',
      badge: 'Individual',
      badgeCor: '#0284c7',
      disponivel: true
    },
    {
      id: 'acompanhamento_cards',
      tab: 'acompanhamento_cards',
      macroPilar: 'pedagogica',
      titulo: 'Acompanhamento do Cursista',
      categoria: 'Desenvolvimento Docente',
      subtitulo: 'Radar & Metas',
      descricao: 'Visão em cartões dos cursistas com radar de competências docentes, status de observações realizadas e dossiê formativo completo.',
      icone: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"></circle>
          <circle cx="12" cy="12" r="6"></circle>
          <circle cx="12" cy="12" r="2"></circle>
        </svg>
      ),
      corDestaque: '#10b981',
      bgIcone: 'rgba(16, 185, 129, 0.1)',
      badge: 'Radar & Gamificação',
      badgeCor: '#059669',
      disponivel: true
    },
    {
      id: 'tutor_insights',
      tab: 'tutor_insights',
      macroPilar: 'pedagogica',
      titulo: 'Observação do Tutor',
      categoria: 'Supervisão Formativa',
      subtitulo: 'Acompanhamento aos Formadores',
      descricao: 'Dashboard de supervisão e acompanhamento pedagógico realizado pelos tutores junto aos formadores das turmas.',
      icone: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
        </svg>
      ),
      corDestaque: '#8b5cf6',
      bgIcone: 'rgba(139, 92, 246, 0.1)',
      badge: 'Supervisão',
      badgeCor: '#7c3aed',
      disponivel: userRole === 'admin' || userRole === 'tecnico' || isSuperAdminTutor
    },
    {
      id: 'diario_formativo',
      tab: 'diario_formativo',
      macroPilar: 'pedagogica',
      titulo: 'Diário Formativo',
      categoria: 'Registro Reflexivo',
      subtitulo: 'Caderno Pedagógico',
      descricao: 'Espaço formativo para registro de reflexões pedagógicas, desafios enfrentados e acompanhamento da evolução profissional.',
      icone: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
          <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
        </svg>
      ),
      corDestaque: '#f59e0b',
      bgIcone: 'rgba(245, 158, 11, 0.1)',
      badge: 'Reflexões',
      badgeCor: '#d97706',
      disponivel: true
    },
    {
      id: 'documentos_pedagogicos',
      tab: 'documentos_pedagogicos',
      macroPilar: 'pedagogica',
      titulo: 'Central de Documentos',
      categoria: 'Normativas & Manuais',
      subtitulo: 'Repositório Oficial',
      descricao: 'Acesso rápido a resoluções, cronogramas, critérios de avaliação e manuais de orientação do Estágio Probatório.',
      icone: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
        </svg>
      ),
      corDestaque: '#64748b',
      bgIcone: 'rgba(100, 116, 139, 0.1)',
      badge: 'SEED-PR',
      badgeCor: '#475569',
      disponivel: true
    }
  ], [observacoesCount, userRole, isSuperAdminTutor]);

  // Ferramentas da Gestão Administrativa
  const ferramentasAdministrativas = useMemo(() => [
    {
      id: 'panorama',
      tab: 'panorama',
      macroPilar: 'administrativa',
      titulo: 'Panorama Geral da Rede',
      categoria: 'Métricas da Rede',
      subtitulo: 'Visão Estratégica',
      descricao: 'Painel com quantitativo global de cursistas, distribuição por turnos, modalidades, status e cruzamentos estatísticos por NRE.',
      icone: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="7" height="7"></rect>
          <rect x="14" y="3" width="7" height="7"></rect>
          <rect x="14" y="14" width="7" height="7"></rect>
          <rect x="3" y="14" width="7" height="7"></rect>
        </svg>
      ),
      corDestaque: '#002d5c',
      bgIcone: 'rgba(0, 45, 92, 0.1)',
      badge: recordsCount > 0 ? `${recordsCount.toLocaleString('pt-BR')} cursistas` : 'Consolidado',
      badgeCor: '#002d5c',
      disponivel: true
    },
    {
      id: 'turmas',
      tab: 'turmas',
      macroPilar: 'administrativa',
      titulo: 'Gestão de Turmas',
      categoria: 'Quadro Formativo',
      subtitulo: 'Enturmações & Salas',
      descricao: 'Visão completa de todas as turmas de formação, vagas preenchidas, horários, links de videoconferência e formadores responsáveis.',
      icone: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
          <polyline points="9 22 9 12 15 12 15 22"></polyline>
        </svg>
      ),
      corDestaque: '#0284c7',
      bgIcone: 'rgba(2, 132, 199, 0.1)',
      badge: 'Quadro Geral',
      badgeCor: '#0284c7',
      disponivel: true
    },
    {
      id: 'remanejamentos',
      tab: 'remanejamentos',
      macroPilar: 'administrativa',
      titulo: 'Movimentações dos Cursistas',
      categoria: 'Fluxo Operacional',
      subtitulo: 'Trocas de Turma & Remanejamentos',
      descricao: 'Histórico auditável de trocas de turma, solicitações de remanejamento entre polos e novos vínculos formativos.',
      icone: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="17 1 21 5 17 9"></polyline>
          <path d="M3 11V9a4 4 0 0 1 4-4h14"></path>
          <polyline points="7 23 3 19 7 15"></polyline>
          <path d="M21 13v2a4 4 0 0 1-4 4H3"></path>
        </svg>
      ),
      corDestaque: '#ea580c',
      bgIcone: 'rgba(234, 88, 12, 0.1)',
      badge: movimentacoesPendentesCount > 0 ? `${movimentacoesPendentesCount} pendentes` : `${movimentacoesCount} trocas`,
      badgeCor: movimentacoesPendentesCount > 0 ? '#dc2626' : '#ea580c',
      disponivel: true
    },
    {
      id: 'cursistas',
      tab: 'cursistas',
      macroPilar: 'administrativa',
      titulo: 'Contato Cursistas',
      categoria: 'Comunicação',
      subtitulo: 'Diretório da Rede',
      descricao: 'Diretório completo de cursistas com CGM, e-mail institucional @escola.pr.gov.br, NRE, polo de atendimento e WhatsApp.',
      icone: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
          <circle cx="9" cy="7" r="4"></circle>
          <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
          <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
        </svg>
      ),
      corDestaque: '#2563eb',
      bgIcone: 'rgba(37, 99, 235, 0.1)',
      badge: 'Diretório',
      badgeCor: '#2563eb',
      disponivel: true
    },
    {
      id: 'formadores',
      tab: 'formadores',
      macroPilar: 'administrativa',
      titulo: 'Contato Formadores',
      categoria: 'Corpo Docente Formador',
      subtitulo: 'Formadores Responsáveis',
      descricao: 'Relação e canais de comunicação com os professores formadores responsáveis pelas turmas de Estágio Probatório.',
      icone: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
          <circle cx="12" cy="7" r="4"></circle>
        </svg>
      ),
      corDestaque: '#059669',
      bgIcone: 'rgba(5, 150, 105, 0.1)',
      badge: 'Formadores',
      badgeCor: '#059669',
      disponivel: userRole !== 'formador'
    },
    {
      id: 'tutoria',
      tab: 'tutoria',
      macroPilar: 'administrativa',
      titulo: 'Dados de Tutoria',
      categoria: 'Equipe de Tutores',
      subtitulo: 'Supervisão Regional',
      descricao: 'Quadro de distribuição dos 52 tutores pedagógicos responsáveis pelos polos regionais e alinhamento com formadores.',
      icone: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
          <circle cx="9" cy="7" r="4"></circle>
          <line x1="19" y1="8" x2="19" y2="14"></line>
          <line x1="22" y1="11" x2="16" y2="11"></line>
        </svg>
      ),
      corDestaque: '#d97706',
      bgIcone: 'rgba(217, 119, 6, 0.1)',
      badge: tutoresCount > 0 ? `${tutoresCount} tutores` : '52 tutores',
      badgeCor: '#d97706',
      disponivel: userRole !== 'formador'
    },
    {
      id: 'concluintes',
      tab: 'concluintes',
      macroPilar: 'administrativa',
      titulo: 'Concluintes (1º Chamamento)',
      categoria: 'Integralização',
      subtitulo: 'Aptos & Finalizados',
      descricao: 'Controle dos cursistas que já integralizaram todas as horas formativas e requisitos do 1º Chamamento.',
      icone: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 10v6M2 10l10-5 10 5-10 5z"></path>
          <path d="M6 12v5c3 3 9 3 12 0v-5"></path>
        </svg>
      ),
      corDestaque: '#16a34a',
      bgIcone: 'rgba(22, 163, 74, 0.1)',
      badge: concluintesCount > 0 ? `${concluintesCount} aptos` : '1º Chamamento',
      badgeCor: '#16a34a',
      disponivel: userRole === 'admin' || userRole === 'tecnico'
    },
    {
      id: 'exonerados',
      tab: 'exonerados',
      macroPilar: 'administrativa',
      titulo: 'Servidores Exonerados',
      categoria: 'Desligamentos',
      subtitulo: 'Controle SIGEP',
      descricao: 'Registro e histórico oficial de exonerações e desligamentos de servidores em estágio probatório.',
      icone: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="15" y1="9" x2="9" y2="15"></line>
          <line x1="9" y1="9" x2="15" y2="15"></line>
        </svg>
      ),
      corDestaque: '#dc2626',
      bgIcone: 'rgba(220, 38, 38, 0.1)',
      badge: exoneradosCount > 0 ? `${exoneradosCount} registros` : 'Desligamentos',
      badgeCor: '#dc2626',
      disponivel: userRole === 'admin' || userRole === 'tecnico'
    },
    {
      id: 'intencao_vagas_2027',
      tab: 'intencao_vagas_2027',
      macroPilar: 'administrativa',
      titulo: 'Intenção de Vagas 2027',
      categoria: 'Planejamento Futuro',
      subtitulo: 'Projeção de Turmas',
      descricao: 'Painel estratégico de projeção de novas turmas e intenções registradas para o próximo ciclo formativo de 2027.',
      icone: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
          <line x1="16" y1="2" x2="16" y2="6"></line>
          <line x1="8" y1="2" x2="8" y2="6"></line>
          <line x1="3" y1="10" x2="21" y2="10"></line>
        </svg>
      ),
      corDestaque: '#4f46e5',
      bgIcone: 'rgba(79, 70, 229, 0.1)',
      badge: 'Ciclo 2027',
      badgeCor: '#4f46e5',
      disponivel: userRole === 'admin' || userRole === 'tecnico' || isSuperAdminTutor
    },
    {
      id: 'admin',
      tab: 'admin',
      macroPilar: 'administrativa',
      titulo: 'Painel Administrativo',
      categoria: 'Controle Master',
      subtitulo: 'Modo Gestão Avançada',
      descricao: 'Configurações de sistema, simulação de perfis de usuário, auditoria de permissões e governança da base de dados.',
      icone: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="3"></circle>
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
        </svg>
      ),
      corDestaque: '#0f172a',
      bgIcone: 'rgba(15, 23, 42, 0.1)',
      badge: 'Admin Only',
      badgeCor: '#0f172a',
      disponivel: userRole === 'admin'
    }
  ], [recordsCount, movimentacoesCount, movimentacoesPendentesCount, tutoresCount, concluintesCount, exoneradosCount, userRole, isSuperAdminTutor]);

  // Ferramentas do Cursista
  const ferramentasCursista = useMemo(() => [
    {
      id: 'cursista_turma',
      tab: 'cursista_turma',
      macroPilar: 'pedagogica',
      titulo: 'Minha Turma de Formação',
      categoria: 'Enturmação',
      subtitulo: 'Ambiente do Cursista',
      descricao: 'Informações da sua turma, formador(a), horários de encontro e links de acesso ao Google Classroom e reuniões Meet.',
      icone: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
          <polyline points="9 22 9 12 15 12 15 22"></polyline>
        </svg>
      ),
      corDestaque: '#0284c7',
      bgIcone: 'rgba(2, 132, 199, 0.1)',
      badge: 'Minha Sala',
      badgeCor: '#0284c7',
      disponivel: true
    },
    {
      id: 'cursista_observacoes',
      tab: 'cursista_observacoes',
      macroPilar: 'pedagogica',
      titulo: 'Meu Acompanhamento & Medalhas',
      categoria: 'Minha Evolução',
      subtitulo: 'Radar de Prática',
      descricao: 'Consulte os feedbacks das suas observações pedagógicas, pontos fortes, dimensões desenvolvidas e conquistas.',
      icone: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"></circle>
          <circle cx="12" cy="12" r="6"></circle>
          <circle cx="12" cy="12" r="2"></circle>
        </svg>
      ),
      corDestaque: '#10b981',
      bgIcone: 'rgba(16, 185, 129, 0.1)',
      badge: 'Feedbacks',
      badgeCor: '#059669',
      disponivel: true
    },
    {
      id: 'cursista_diario',
      tab: 'cursista_diario',
      macroPilar: 'pedagogica',
      titulo: 'Meu Diário Formativo',
      categoria: 'Caderno Pessoal',
      subtitulo: 'Reflexões da Docência',
      descricao: 'Seu caderno pessoal para anotar planos de aula, reflexões da prática diária e anotações para discussões com seu formador.',
      icone: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
          <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
        </svg>
      ),
      corDestaque: '#f59e0b',
      bgIcone: 'rgba(245, 158, 11, 0.1)',
      badge: 'Caderno',
      badgeCor: '#d97706',
      disponivel: true
    },
    {
      id: 'cursista_solicitacoes',
      tab: 'cursista_solicitacoes',
      macroPilar: 'pedagogica',
      titulo: 'Minhas Solicitações de Movimentação',
      categoria: 'Remanejamentos',
      subtitulo: 'Troca de Turma',
      descricao: 'Solicite troca de turno, horário ou polo de formação de acordo com a sua compatibilidade de carga horária na escola.',
      icone: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="17 1 21 5 17 9"></polyline>
          <path d="M3 11V9a4 4 0 0 1 4-4h14"></path>
          <polyline points="7 23 3 19 7 15"></polyline>
          <path d="M21 13v2a4 4 0 0 1-4 4H3"></path>
        </svg>
      ),
      corDestaque: '#ea580c',
      bgIcone: 'rgba(234, 88, 12, 0.1)',
      badge: 'Requerimentos',
      badgeCor: '#ea580c',
      disponivel: true
    },
    {
      id: 'cursista_documentos',
      tab: 'cursista_documentos',
      macroPilar: 'pedagogica',
      titulo: 'Documentos Formativos',
      categoria: 'Orientações',
      subtitulo: 'Materiais de Apoio',
      descricao: 'Acesse resoluções, cronogramas do estágio, critérios avaliativos e materiais didáticos oficiais da SEED-PR.',
      icone: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
        </svg>
      ),
      corDestaque: '#64748b',
      bgIcone: 'rgba(100, 116, 139, 0.1)',
      badge: 'Repositório',
      badgeCor: '#475569',
      disponivel: true
    }
  ], []);

  // Filtro de pesquisa
  const filterList = (list) => {
    if (!searchTerm.trim()) return list.filter(i => i.disponivel);
    const termo = searchTerm.toLowerCase();
    return list.filter(i => i.disponivel && (
      i.titulo.toLowerCase().includes(termo) ||
      i.descricao.toLowerCase().includes(termo) ||
      i.categoria.toLowerCase().includes(termo) ||
      i.subtitulo.toLowerCase().includes(termo)
    ));
  };

  const pedFiltradas = filterList(ferramentasPedagogicas);
  const admFiltradas = filterList(ferramentasAdministrativas);
  const cursistaFiltradas = filterList(ferramentasCursista);

  const totalDisponiveis = userRole === 'cursista' 
    ? cursistaFiltradas.length 
    : (pedFiltradas.length + admFiltradas.length);

  return (
    <div className="pagina-inicial-container" style={{ padding: '1.5rem 2rem 3rem', maxWidth: '1440px', margin: '0 auto' }}>
      
      {/* BANNER HERO DE BOAS-VINDAS */}
      <div style={{
        background: 'linear-gradient(135deg, #002d5c 0%, #004b99 100%)',
        borderRadius: '16px',
        padding: '2rem 2.25rem',
        color: '#ffffff',
        marginBottom: '2rem',
        boxShadow: '0 10px 25px -5px rgba(0, 45, 92, 0.25)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Detalhe estético de fundo */}
        <div style={{
          position: 'absolute',
          right: '-40px',
          bottom: '-40px',
          width: '240px',
          height: '240px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0) 70%)',
          pointerEvents: 'none'
        }} />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1.25rem' }}>
          <div>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              backgroundColor: 'rgba(255, 255, 255, 0.15)',
              padding: '0.25rem 0.75rem',
              borderRadius: '999px',
              fontSize: '0.78rem',
              fontWeight: 600,
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
              marginBottom: '0.75rem'
            }}>
              <span>🏛️ SEED-PR</span>
              <span>•</span>
              <span>DAP / CFDEG</span>
              <span>•</span>
              <span style={{ color: '#86efac' }}>Perfil: {userRole ? userRole.toUpperCase() : 'ACESSO'}</span>
            </div>

            <h1 style={{ fontSize: '1.85rem', fontWeight: 800, margin: '0 0 0.5rem', letterSpacing: '-0.02em', lineHeight: 1.2 }}>
              Olá, {primeiroNome}! Bem-vindo(a) à Plataforma.
            </h1>
            <p style={{ margin: 0, fontSize: '0.98rem', opacity: 0.9, maxWidth: '680px', lineHeight: 1.5 }}>
              Central unificada de acompanhamento pedagógico, gestão de turmas e movimentações do <strong>Estágio Probatório Docente</strong> do Estado do Paraná.
            </p>
          </div>

          {/* Quick Stats Pills */}
          <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{
              backgroundColor: 'rgba(255, 255, 255, 0.12)',
              backdropFilter: 'blur(8px)',
              padding: '0.6rem 1rem',
              borderRadius: '12px',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#38bdf8' }}>
                {recordsCount > 0 ? recordsCount.toLocaleString('pt-BR') : '5.000+'}
              </div>
              <div style={{ fontSize: '0.72rem', opacity: 0.85, textTransform: 'uppercase' }}>Cursistas Ativos</div>
            </div>

            <div style={{
              backgroundColor: 'rgba(255, 255, 255, 0.12)',
              backdropFilter: 'blur(8px)',
              padding: '0.6rem 1rem',
              borderRadius: '12px',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#4ade80' }}>
                {observacoesCount > 0 ? observacoesCount.toLocaleString('pt-BR') : '19.968'}
              </div>
              <div style={{ fontSize: '0.72rem', opacity: 0.85, textTransform: 'uppercase' }}>Observações 2026</div>
            </div>

            <div style={{
              backgroundColor: 'rgba(255, 255, 255, 0.12)',
              backdropFilter: 'blur(8px)',
              padding: '0.6rem 1rem',
              borderRadius: '12px',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#fbbf24' }}>32</div>
              <div style={{ fontSize: '0.72rem', opacity: 0.85, textTransform: 'uppercase' }}>NREs Atendidos</div>
            </div>
          </div>
        </div>

        {/* BARRA DE PESQUISA RÁPIDA DE FERRAMENTAS */}
        <div style={{ marginTop: '1.5rem', position: 'relative', maxWidth: '540px' }}>
          <span style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', opacity: 0.7, pointerEvents: 'none' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
          </span>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Filtrar ferramentas por nome, objetivo ou categoria..."
            style={{
              width: '100%',
              padding: '0.75rem 1rem 0.75rem 2.8rem',
              borderRadius: '10px',
              border: '1px solid rgba(255, 255, 255, 0.3)',
              backgroundColor: 'rgba(255, 255, 255, 0.95)',
              color: '#0f172a',
              fontSize: '0.92rem',
              outline: 'none',
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
            }}
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              style={{
                position: 'absolute',
                right: '0.75rem',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                color: '#64748b',
                cursor: 'pointer',
                fontSize: '0.85rem'
              }}
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* FEEDBACK CASO NÃO ENCONTRE NADA NA BUSCA */}
      {totalDisponiveis === 0 && (
        <div style={{
          padding: '3rem',
          textAlign: 'center',
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          border: '1px solid #e2e8f0',
          color: '#64748b'
        }}>
          <p style={{ fontSize: '1.1rem', margin: '0 0 0.5rem', fontWeight: 600, color: '#1e293b' }}>
            Nenhuma ferramenta encontrada para "{searchTerm}"
          </p>
          <p style={{ margin: 0, fontSize: '0.9rem' }}>Tente outro termo ou limpe o filtro de busca.</p>
          <button
            type="button"
            onClick={() => setSearchTerm('')}
            style={{
              marginTop: '1rem',
              padding: '0.5rem 1rem',
              backgroundColor: '#002d5c',
              color: '#ffffff',
              border: 'none',
              borderRadius: '6px',
              fontSize: '0.85rem',
              cursor: 'pointer'
            }}
          >
            Limpar Busca
          </button>
        </div>
      )}

      {/* SE FOR CURSISTA: EXIBE OS CARDS DO CURSISTA */}
      {userRole === 'cursista' ? (
        cursistaFiltradas.length > 0 && (
          <section style={{ marginBottom: '2.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
              <span style={{ fontSize: '1.3rem' }}>🎓</span>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#002d5c', margin: 0 }}>
                Espaço do Cursista
              </h2>
              <span style={{ fontSize: '0.8rem', color: '#64748b', marginLeft: '0.5rem' }}>
                ({cursistaFiltradas.length} módulos disponíveis)
              </span>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
              gap: '1.25rem'
            }}>
              {cursistaFiltradas.map((card) => (
                <CardItem key={card.id} card={card} onNavigate={onNavigate} />
              ))}
            </div>
          </section>
        )
      ) : (
        <>
          {/* SEÇÃO 1: GESTÃO PEDAGÓGICA */}
          {pedFiltradas.length > 0 && (
            <section style={{ marginBottom: '2.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    backgroundColor: 'rgba(2, 132, 199, 0.1)',
                    color: '#0284c7',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700
                  }}>
                    📘
                  </div>
                  <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#002d5c', margin: 0 }}>
                    Gestão Pedagógica
                  </h2>
                  <span style={{ fontSize: '0.8rem', color: '#64748b', marginLeft: '0.25rem' }}>
                    ({pedFiltradas.length} ferramentas)
                  </span>
                </div>
                <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                  Observações de sala, feedbacks formativos e acompanhamento
                </span>
              </div>

              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
                gap: '1.25rem'
              }}>
                {pedFiltradas.map((card) => (
                  <CardItem key={card.id} card={card} onNavigate={onNavigate} />
                ))}
              </div>
            </section>
          )}

          {/* SEÇÃO 2: GESTÃO ADMINISTRATIVA */}
          {admFiltradas.length > 0 && (
            <section style={{ marginBottom: '2.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    backgroundColor: 'rgba(0, 45, 92, 0.1)',
                    color: '#002d5c',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700
                  }}>
                    🏢
                  </div>
                  <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#002d5c', margin: 0 }}>
                    Gestão Administrativa
                  </h2>
                  <span style={{ fontSize: '0.8rem', color: '#64748b', marginLeft: '0.25rem' }}>
                    ({admFiltradas.length} ferramentas)
                  </span>
                </div>
                <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                  Controle de turmas, rede escolar, remanejamentos e dados de contato
                </span>
              </div>

              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
                gap: '1.25rem'
              }}>
                {admFiltradas.map((card) => (
                  <CardItem key={card.id} card={card} onNavigate={onNavigate} />
                ))}
              </div>
            </section>
          )}
        </>
      )}

      {/* RODA-PÉ DISCRETO DA HOME */}
      <div style={{
        marginTop: '2rem',
        padding: '1.25rem',
        backgroundColor: '#f8fafc',
        borderRadius: '12px',
        border: '1px solid #e2e8f0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1rem',
        fontSize: '0.82rem',
        color: '#64748b'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span style={{ fontSize: '1.2rem' }}>💡</span>
          <span>
            <strong>Dica de Produtividade:</strong> Use o atalho <code>Ctrl + K</code> em qualquer tela para abrir a busca global de pessoas (cursistas, formadores e tutores).
          </span>
        </div>
        <div>
          <span>Plataforma integrada com <strong>TiDB Cloud Serverless</strong></span>
        </div>
      </div>

    </div>
  );
}

/**
 * Subcomponente: CardItem individual de cada ferramenta
 */
function CardItem({ card, onNavigate }) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      onClick={() => onNavigate(card.tab, card.macroPilar)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onNavigate(card.tab, card.macroPilar);
        }
      }}
      style={{
        backgroundColor: '#ffffff',
        borderRadius: '14px',
        border: `1.5px solid ${isHovered ? card.corDestaque : '#e2e8f0'}`,
        padding: '1.5rem',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        cursor: 'pointer',
        transition: 'all 0.22s ease-in-out',
        transform: isHovered ? 'translateY(-4px)' : 'translateY(0)',
        boxShadow: isHovered
          ? '0 12px 24px -6px rgba(0, 45, 92, 0.12), 0 4px 8px -2px rgba(0, 0, 0, 0.04)'
          : '0 1px 3px rgba(0, 0, 0, 0.05)',
        position: 'relative',
        outline: 'none'
      }}
    >
      {/* Topo do Card: Ícone e Badge */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <div style={{
            width: '46px',
            height: '46px',
            borderRadius: '12px',
            backgroundColor: card.bgIcone,
            color: card.corDestaque,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'transform 0.2s ease',
            transform: isHovered ? 'scale(1.08)' : 'scale(1)'
          }}>
            {card.icone}
          </div>

          {card.badge && (
            <span style={{
              fontSize: '0.72rem',
              fontWeight: 700,
              padding: '0.25rem 0.6rem',
              borderRadius: '999px',
              backgroundColor: isHovered ? card.corDestaque : '#f1f5f9',
              color: isHovered ? '#ffffff' : card.badgeCor || '#334155',
              transition: 'all 0.2s ease',
              letterSpacing: '0.02em'
            }}>
              {card.badge}
            </span>
          )}
        </div>

        {/* Categoria / Subtítulo */}
        <div style={{
          fontSize: '0.74rem',
          fontWeight: 700,
          color: card.corDestaque,
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          marginBottom: '0.35rem'
        }}>
          {card.categoria}
        </div>

        {/* Título da Ferramenta */}
        <h3 style={{
          fontSize: '1.1rem',
          fontWeight: 700,
          color: '#0f172a',
          margin: '0 0 0.5rem',
          lineHeight: 1.3
        }}>
          {card.titulo}
        </h3>

        {/* Descrição do Módulo */}
        <p style={{
          fontSize: '0.86rem',
          color: '#64748b',
          margin: '0 0 1.25rem',
          lineHeight: 1.45
        }}>
          {card.descricao}
        </p>
      </div>

      {/* Botão de Rodapé do Card */}
      <div style={{
        borderTop: '1px solid #f1f5f9',
        paddingTop: '0.85rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        fontSize: '0.84rem',
        fontWeight: 600,
        color: isHovered ? card.corDestaque : '#475569'
      }}>
        <span>Acessar ferramenta</span>
        <span style={{
          transition: 'transform 0.2s ease',
          transform: isHovered ? 'translateX(4px)' : 'translateX(0)'
        }}>
          →
        </span>
      </div>
    </div>
  );
}
