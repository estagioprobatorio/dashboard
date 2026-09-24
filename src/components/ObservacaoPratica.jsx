import React, { useState, useMemo } from 'react';
import ObservacaoModalDetalhes from './ObservacaoModalDetalhes';
import { normalizeComponente, getSemestre } from './ObservacoesOverview';
import { formatDatePtBr } from '../utils/dateUtils';

export default function ObservacaoPratica({ observacoes = [], cursistas = [], tutores = [], userRole, userEmail }) {
  // Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [semestreFilter, setSemestreFilter] = useState('');
  const [tutorFilter, setTutorFilter] = useState('');
  const [nreFilter, setNreFilter] = useState('');
  const [modalidadeFilter, setModalidadeFilter] = useState('');
  const [componenteFilter, setComponenteFilter] = useState('');
  const [anoFilter, setAnoFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState(''); // 'realizada', 'nao_realizada'

  // Ordenação de colunas
  const [sortField, setSortField] = useState('cursista');
  const [sortDirection, setSortDirection] = useState('asc'); // 'asc' ou 'desc'

  // Paginação
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(15);

  // Modal de Detalhes
  const [selectedObs, setSelectedObs] = useState(null);

  // Helper para normalizar nível pedagógico
  const parseLevel = (text) => {
    if (!text) return 'NÃO INFORMADO';
    const t = String(text).toUpperCase();
    if (t.includes('SUPERA') || t.includes('SUPEROU')) return 'SUPERA';
    if (t.includes('INTEGRAL') || (t.includes('ATENDE') && !t.includes('PARCIAL') && !t.includes('NÃO') && !t.includes('NAO')) || (t.includes('ATINGE') && !t.includes('PARCIAL') && !t.includes('NÃO') && !t.includes('NAO'))) return 'ATINGE INTEGRALMENTE';
    if (t.includes('PARCIAL')) return 'ATINGE PARCIALMENTE';
    if (t.includes('NÃO') || t.includes('NAO')) return 'NÃO ATINGE';
    return 'NÃO INFORMADO';
  };

  // Mapa de enriquecimento: email_cursista -> cursista info (NRE, Tutor, Município)
  const cursistasMap = useMemo(() => {
    const map = new Map();
    cursistas.forEach(c => {
      const email = (c['e-mail'] || c.email || c.email_cursista || '').trim().toLowerCase();
      if (email) {
        map.set(email, c);
      }
    });
    return map;
  }, [cursistas]);

  // Lista de observações enriquecidas com NRE, Tutor, Semestre e Componente Normalizado
  const enrichedObservacoes = useMemo(() => {
    return observacoes.map(obs => {
      const emailCursista = (obs.email_cursista || '').trim().toLowerCase();
      const cursistaInfo = cursistasMap.get(emailCursista);

      const tutorResponsavel = obs.tutor_responsavel || (cursistaInfo ? cursistaInfo.tutor_responsavel : null) || 'Não atribuído';
      const emailTutor = obs.email_tutor || (cursistaInfo ? cursistaInfo.email_tutor : null) || '';
      const nre = obs.nre_exe || (cursistaInfo ? (cursistaInfo.nre_exe || cursistaInfo.nre_tutor) : null) || 'NRE Não Identificado';
      const municipio = obs.munic_exe || (cursistaInfo ? cursistaInfo.munic_exe : null) || '';
      let modalidade = obs.modalidade || (cursistaInfo ? cursistaInfo.modalidade : null) || 'Docentes';
      if (modalidade.toLowerCase().includes('feedback') || modalidade.toLowerCase().includes('diálogo') || modalidade.toLowerCase().includes('dialogo')) {
        modalidade = cursistaInfo?.modalidade || 'Docentes';
      }
      if (modalidade.toUpperCase().includes('GESTORA') || modalidade.toUpperCase().includes('PEDAGOG')) {
        modalidade = 'Equipe Gestora';
      }
      const rawComp = obs.componente || (cursistaInfo ? cursistaInfo.componente : null) || (modalidade === 'Equipe Gestora' ? 'PEDAGÓGICO' : '');
      const componente = normalizeComponente(rawComp);
      const isRealizada = obs.is_realizada ?? (obs.observacao_realizada ? obs.observacao_realizada.toLowerCase().includes('sim') : true);
      const semestre = getSemestre(obs);

      return {
        ...obs,
        semestre,
        tutor_responsavel: tutorResponsavel,
        email_tutor: emailTutor,
        nre_tutor: (cursistaInfo ? (cursistaInfo.nre_tutor || cursistaInfo.nre_exe) : null) || obs.nre_tutor || '',
        nre_exe: nre,
        munic_exe: municipio,
        modalidade: modalidade,
        componente: componente,
        is_realizada: isRealizada,
        categoria_planejamento: parseLevel(obs.nivel_planejamento),
        categoria_pratica: parseLevel(obs.nivel_pratica)
      };
    });
  }, [observacoes, cursistasMap]);

  // Opções para dropdowns de filtros
  const filterOptions = useMemo(() => {
    const semestresSet = new Set();
    const tutoresSet = new Set();
    const nresSet = new Set();
    const modalidadesSet = new Set();
    const componentesSet = new Set();
    const anosSet = new Set();

    enrichedObservacoes.forEach(obs => {
      if (obs.semestre) semestresSet.add(obs.semestre);
      if (obs.tutor_responsavel && obs.tutor_responsavel !== 'Não atribuído') tutoresSet.add(obs.tutor_responsavel);
      if (obs.nre_exe && obs.nre_exe !== 'NRE Não Identificado') nresSet.add(obs.nre_exe);
      if (obs.modalidade) modalidadesSet.add(obs.modalidade);
      if (obs.componente) componentesSet.add(obs.componente);
      if (obs.ano_formativo) anosSet.add(obs.ano_formativo);
    });

    const sortPt = (set) => Array.from(set).sort((a, b) => a.localeCompare(b, 'pt-BR', { sensitivity: 'base' }));

    return {
      semestres: sortPt(semestresSet),
      tutores: sortPt(tutoresSet),
      nres: sortPt(nresSet),
      modalidades: sortPt(modalidadesSet),
      componentes: sortPt(componentesSet),
      anos: sortPt(anosSet)
    };
  }, [enrichedObservacoes]);

  // Filtragem dos registros
  const filteredObservacoes = useMemo(() => {
    return enrichedObservacoes.filter(obs => {
      // Busca geral
      if (searchTerm) {
        const q = searchTerm.trim().toLowerCase();
        const nomeMatch = (obs.nome_cursista || '').toLowerCase().includes(q);
        const emailMatch = (obs.email_cursista || '').toLowerCase().includes(q);
        const formadorMatch = (obs.nome_formador || '').toLowerCase().includes(q);
        const temaMatch = (obs.tema || '').toLowerCase().includes(q);
        if (!nomeMatch && !emailMatch && !formadorMatch && !temaMatch) return false;
      }

      // Semestre
      if (semestreFilter && obs.semestre !== semestreFilter) return false;

      // Tutor
      if (tutorFilter && obs.tutor_responsavel !== tutorFilter) return false;

      // NRE
      if (nreFilter && obs.nre_exe !== nreFilter) return false;

      // Modalidade
      if (modalidadeFilter && obs.modalidade !== modalidadeFilter) return false;

      // Componente Curricular
      if (componenteFilter && obs.componente !== componenteFilter) return false;

      // Ano Formativo
      if (anoFilter && obs.ano_formativo !== anoFilter) return false;

      // Status Realizada
      if (statusFilter === 'realizada' && !obs.is_realizada) return false;
      if (statusFilter === 'nao_realizada' && obs.is_realizada) return false;

      return true;
    });
  }, [enrichedObservacoes, searchTerm, semestreFilter, tutorFilter, nreFilter, modalidadeFilter, componenteFilter, anoFilter, statusFilter]);

  // Indicadores (KPIs)
  const kpis = useMemo(() => {
    const total = filteredObservacoes.length;
    if (total === 0) {
      return { 
        total: 0, 
        realizadas: 0, 
        percentRealizadas: 0, 
        naoRealizadas: 0,
        percentNaoRealizadas: 0,
        dialogos: 0, 
        percentDialogos: 0, 
        devolutivasGravadas: 0,
        percentDevolutivas: 0,
        superamPlan: 0,
        atingemPlan: 0,
        superamPrat: 0,
        atingemPrat: 0,
        percentSuperaPrat: 0,
        percentIntegralPrat: 0
      };
    }

    const realizadas = filteredObservacoes.filter(o => o.is_realizada).length;
    const naoRealizadas = total - realizadas;
    const dialogos = filteredObservacoes.filter(o => (o.modalidade_feedback || '').toLowerCase().includes('diálogo') || (o.modalidade_feedback || '').toLowerCase().includes('dialogo')).length;
    const devolutivasGravadas = filteredObservacoes.filter(o => o.link_gravacao_feedback || o.data_feedback).length;
    
    const superamPlan = filteredObservacoes.filter(o => o.categoria_planejamento === 'SUPERA').length;
    const atingemPlan = filteredObservacoes.filter(o => o.categoria_planejamento === 'ATINGE INTEGRALMENTE').length;
    const superamPrat = filteredObservacoes.filter(o => o.categoria_pratica === 'SUPERA').length;
    const atingemPrat = filteredObservacoes.filter(o => o.categoria_pratica === 'ATINGE INTEGRALMENTE').length;

    return {
      total,
      realizadas,
      percentRealizadas: Math.round((realizadas / total) * 100),
      naoRealizadas,
      percentNaoRealizadas: Math.round((naoRealizadas / total) * 100),
      dialogos,
      percentDialogos: total > 0 ? Math.round((dialogos / total) * 100) : 0,
      devolutivasGravadas,
      percentDevolutivas: realizadas > 0 ? Math.round((devolutivasGravadas / realizadas) * 100) : 0,
      superamPlan,
      atingemPlan,
      superamPrat,
      atingemPrat,
      percentSuperaPrat: realizadas > 0 ? Math.round((superamPrat / realizadas) * 100) : 0,
      percentIntegralPrat: realizadas > 0 ? Math.round((atingemPrat / realizadas) * 100) : 0
    };
  }, [filteredObservacoes]);

  // Alternância de ordenação por coluna (ascendente / descendente)
  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
    setCurrentPage(1);
  };

  // Ordenação dos registros filtrados
  const sortedObservacoes = useMemo(() => {
    if (!sortField) return filteredObservacoes;

    const parseDateToTimestamp = (d) => {
      if (!d) return 0;
      if (d instanceof Date) return isNaN(d.getTime()) ? 0 : d.getTime();
      const str = String(d).trim();
      if (!str || str === '-' || str === '—') return 0;

      const brMatch = str.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})(?:\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?/);
      if (brMatch) {
        const day = parseInt(brMatch[1], 10);
        const month = parseInt(brMatch[2], 10) - 1;
        let year = parseInt(brMatch[3], 10);
        if (year < 100) year += 2000;
        const hour = brMatch[4] ? parseInt(brMatch[4], 10) : 0;
        const min = brMatch[5] ? parseInt(brMatch[5], 10) : 0;
        const sec = brMatch[6] ? parseInt(brMatch[6], 10) : 0;
        return new Date(year, month, day, hour, min, sec).getTime();
      }

      const parsed = Date.parse(str);
      return !isNaN(parsed) ? parsed : 0;
    };

    return [...filteredObservacoes].sort((a, b) => {
      let comparison = 0;

      if (sortField === 'data_pratica') {
        const timeA = parseDateToTimestamp(a.data_pratica || a.data_observacao);
        const timeB = parseDateToTimestamp(b.data_pratica || b.data_observacao);
        comparison = timeA - timeB;
      } else if (sortField === 'data_formulario') {
        const timeA = parseDateToTimestamp(a.carimbo || a.data_observacao);
        const timeB = parseDateToTimestamp(b.carimbo || b.data_observacao);
        comparison = timeA - timeB;
      } else {
        let valA = '';
        let valB = '';

        switch (sortField) {
          case 'cursista':
            valA = a.nome_cursista || a.email_cursista || '';
            valB = b.nome_cursista || b.email_cursista || '';
            break;
          case 'ano_semestre':
            valA = `${a.ano_formativo || ''} ${a.semestre || ''} ${a.nre_exe || ''}`;
            valB = `${b.ano_formativo || ''} ${b.semestre || ''} ${b.nre_exe || ''}`;
            break;
          case 'componente':
            valA = `${a.componente || ''} ${a.modalidade || ''}`;
            valB = `${b.componente || ''} ${b.modalidade || ''}`;
            break;
          case 'tematica':
            valA = a.tema || '';
            valB = b.tema || '';
            break;
          case 'formador_tutor':
            valA = `${a.nome_formador || ''} ${a.tutor_responsavel || ''}`;
            valB = `${b.nome_formador || ''} ${b.tutor_responsavel || ''}`;
            break;
          case 'status':
            valA = `${a.is_realizada ? 'Realizada' : 'Não Realizada'} ${a.modalidade_feedback || ''}`;
            valB = `${b.is_realizada ? 'Realizada' : 'Não Realizada'} ${b.modalidade_feedback || ''}`;
            break;
          case 'niveis':
            valA = `${a.categoria_planejamento || ''} ${a.categoria_pratica || ''}`;
            valB = `${b.categoria_planejamento || ''} ${b.categoria_pratica || ''}`;
            break;
          default:
            valA = a[sortField] || '';
            valB = b[sortField] || '';
        }

        comparison = String(valA).localeCompare(String(valB), 'pt-BR', { sensitivity: 'base', numeric: true });
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [filteredObservacoes, sortField, sortDirection]);

  // Paginação sobre os dados ordenados
  const totalPages = Math.ceil(sortedObservacoes.length / itemsPerPage) || 1;
  const paginatedObservacoes = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return sortedObservacoes.slice(start, start + itemsPerPage);
  }, [sortedObservacoes, currentPage, itemsPerPage]);

  const handlePageChange = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const getNivelBadgeClass = (nivel) => {
    if (!nivel) return 'badge-neutral';
    const n = nivel.toUpperCase();
    if (n.includes('SUPERA')) return 'badge-supera';
    if (n.includes('INTEGRAL') || n.includes('ATENDE') || n.includes('ATINGE')) {
      if (n.includes('PARCIAL')) return 'badge-parcial';
      return 'badge-atende';
    }
    if (n.includes('NÃO') || n.includes('NAO')) return 'badge-nao-atende';
    return 'badge-neutral';
  };

  // Exportar para CSV (respeitando a ordenação ativa)
  const handleExportCSV = () => {
    if (sortedObservacoes.length === 0) return;

    const headers = ['Semestre', 'Ano Formativo', 'Data Formulário (Carimbo)', 'Cursista', 'E-mail Cursista', 'NRE', 'Componente', 'Modalidade da Observação', 'Temática / Referência', 'Formador', 'Tutor', 'Status', 'Data Prática', 'Data Feedback', 'Feedback', 'Nível Planejamento', 'Nível Prática', 'Link Prática', 'Link PDP', 'Combinados'];
    const rows = sortedObservacoes.map(o => [
      `"${o.semestre || ''}"`,
      `"${o.ano_formativo || ''}"`,
      `"${formatDatePtBr(o.carimbo, true)}"`,
      `"${o.nome_cursista || ''}"`,
      `"${o.email_cursista || ''}"`,
      `"${o.nre_exe || ''}"`,
      `"${o.componente || ''}"`,
      `"${o.modalidade || ''}"`,
      `"${(o.tema || '').replace(/"/g, '""')}"`,
      `"${o.nome_formador || ''}"`,
      `"${o.tutor_responsavel || ''}"`,
      `"${o.is_realizada ? 'Realizada' : 'Não Realizada'}"`,
      `"${formatDatePtBr(o.data_pratica || o.data_observacao)}"`,
      `"${formatDatePtBr(o.data_feedback)}"`,
      `"${o.modalidade_feedback || ''}"`,
      `"${o.categoria_planejamento || ''}"`,
      `"${o.categoria_pratica || ''}"`,
      `"${o.link_gravacao_pratica || ''}"`,
      `"${o.link_planejamento || ''}"`,
      `"${(o.combinados || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = '\uFEFF' + [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `observacoes_pratica_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Helper para renderizar cabeçalhos de coluna ordenáveis
  const renderSortableTh = (field, label, style = {}) => {
    const isActive = sortField === field;
    return (
      <th
        onClick={() => handleSort(field)}
        className="sortable-th"
        style={{
          cursor: 'pointer',
          userSelect: 'none',
          backgroundColor: isActive ? 'rgba(0, 45, 92, 0.08)' : undefined,
          ...style
        }}
        title={`Clique para ordenar por ${label} (${isActive && sortDirection === 'asc' ? 'Decrescente Z-A' : 'Crescente A-Z'})`}
      >
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', justifyContent: 'space-between', width: '100%' }}>
          <span>{label}</span>
          <span 
            style={{ 
              fontSize: '0.78rem', 
              color: isActive ? 'var(--color-accent-blue)' : '#94a3b8', 
              fontWeight: isActive ? 800 : 400,
              display: 'inline-flex',
              alignItems: 'center'
            }}
          >
            {isActive ? (sortDirection === 'asc' ? '▲' : '▼') : '⇅'}
          </span>
        </div>
      </th>
    );
  };

  return (
    <div className="section-container animate-fade-in">
      {/* Top Banner Informativo com Resumo de Contexto */}
      <div className="glass-panel" style={{ padding: '1.25rem 1.5rem', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', borderLeft: '4px solid var(--color-accent-green)' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
            <h2 style={{ fontSize: '1.35rem', color: 'var(--color-primary-dark)', margin: 0 }}>
              👁️ Observação da Prática Pedagógica
            </h2>
            <span className="logo-badge" style={{ backgroundColor: 'var(--color-primary-dark)', color: '#fff' }}>
              Ciclo 2026
            </span>
          </div>
          <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
            Painel pedagógico de acompanhamento das aulas observadas, diálogos formativos e combinados de desenvolvimento profissional.
          </p>
        </div>

        <button 
          className="btn-secondary" 
          onClick={handleExportCSV}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.82rem', padding: '0.5rem 1rem' }}
        >
          📥 Exportar Relatório CSV
        </button>
      </div>

      {/* Cards de Métricas (KPIs) - Reformulados conforme Documento 23-09 */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
        gap: '1.25rem',
        marginBottom: '1.5rem'
      }}>
        {/* KPI 1: Registros Efetuados */}
        <div className="glass-panel" style={{
          padding: '1.4rem 1.6rem',
          position: 'relative',
          overflow: 'hidden',
          borderLeft: '5px solid var(--color-primary-mid)',
          background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Registros Efetuados
            </span>
            <span style={{ fontSize: '1.4rem' }}>📋</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '2.4rem', fontWeight: 800, color: 'var(--color-primary-dark)', fontFamily: 'var(--font-header)', lineHeight: 1 }}>
              {kpis.total.toLocaleString('pt-BR')}
            </span>
            <span style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>
              registros observados
            </span>
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', display: 'flex', flexDirection: 'column', gap: '0.2rem', borderTop: '1px solid #e2e8f0', paddingTop: '0.6rem', marginTop: '0.4rem' }}>
            <div>Registros: <b>{kpis.total.toLocaleString('pt-BR')}</b></div>
            <div>Observações Realizadas: <b style={{ color: 'var(--color-accent-green)' }}>{kpis.realizadas.toLocaleString('pt-BR')}</b></div>
            <div>Observações Não Realizadas: <b style={{ color: '#b91c1c' }}>{kpis.naoRealizadas.toLocaleString('pt-BR')}</b></div>
          </div>
        </div>

        {/* KPI 2: % Observações Realizadas e % Não Realizadas */}
        <div className="glass-panel" style={{
          padding: '1.4rem 1.6rem',
          position: 'relative',
          overflow: 'hidden',
          borderLeft: '5px solid var(--color-accent-green)',
          background: 'linear-gradient(135deg, #ffffff 0%, #f0fdf4 100%)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-accent-green)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              % Realizadas & Não Realizadas
            </span>
            <span style={{ fontSize: '1.4rem' }}>📊</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '2.4rem', fontWeight: 800, color: '#166534', fontFamily: 'var(--font-header)', lineHeight: 1 }}>
              {kpis.percentRealizadas}%
            </span>
            <span style={{ fontSize: '0.82rem', color: '#15803d', fontWeight: 700 }}>
              realizadas
            </span>
          </div>
          {/* Barra de Progresso Visual */}
          <div style={{ width: '100%', height: '8px', backgroundColor: '#fee2e2', borderRadius: '4px', overflow: 'hidden', margin: '0.4rem 0' }}>
            <div style={{ width: `${Math.min(kpis.percentRealizadas, 100)}%`, height: '100%', backgroundColor: 'var(--color-accent-green)', borderRadius: '4px', transition: 'width 0.4s ease' }} />
          </div>
          <div style={{ fontSize: '0.78rem', color: '#4b5563', display: 'flex', justifyContent: 'space-between', paddingTop: '0.3rem' }}>
            <span>% Realizadas: <b style={{ color: '#166534' }}>{kpis.percentRealizadas}%</b> ({kpis.realizadas})</span>
            <span>% Não Realizadas: <b style={{ color: '#b91c1c' }}>{kpis.percentNaoRealizadas}%</b> ({kpis.naoRealizadas})</span>
          </div>
        </div>

        {/* KPI 3: Supera & Atinge Integralmente */}
        <div className="glass-panel" style={{
          padding: '1.4rem 1.6rem',
          position: 'relative',
          overflow: 'hidden',
          borderLeft: '5px solid var(--color-accent-blue)',
          background: 'linear-gradient(135deg, #ffffff 0%, #f0f9ff 100%)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-accent-blue)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Supera & Atinge Integralmente
            </span>
            <span style={{ fontSize: '1.4rem' }}>🌟</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '2.4rem', fontWeight: 800, color: '#7c3aed', fontFamily: 'var(--font-header)', lineHeight: 1 }}>
              {kpis.percentSuperaPrat}%
            </span>
            <span style={{ fontSize: '0.82rem', color: '#7c3aed', fontWeight: 700 }}>
              Supera ({kpis.superamPrat})
            </span>
          </div>
          <div style={{ fontSize: '0.78rem', color: '#4b5563', display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #e2e8f0', paddingTop: '0.6rem', marginTop: '0.4rem' }}>
            <span>Atinge Integralmente: <b style={{ color: '#0284c7' }}>{kpis.percentIntegralPrat}%</b> ({kpis.atingemPrat})</span>
          </div>
        </div>

        {/* KPI 4: Diálogo Formativo & Devolutivas */}
        <div className="glass-panel" style={{
          padding: '1.4rem 1.6rem',
          position: 'relative',
          overflow: 'hidden',
          borderLeft: '5px solid #8b5cf6',
          background: 'linear-gradient(135deg, #ffffff 0%, #faf5ff 100%)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#6d28d9', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Diálogo & Devolutivas
            </span>
            <span style={{ fontSize: '1.4rem' }}>🗣️</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '2.4rem', fontWeight: 800, color: '#5b21b6', fontFamily: 'var(--font-header)', lineHeight: 1 }}>
              {kpis.percentDialogos}%
            </span>
            <span style={{ fontSize: '0.82rem', color: '#6d28d9', fontWeight: 700 }}>
              diálogos formativos
            </span>
          </div>
          <div style={{ fontSize: '0.78rem', color: '#4b5563', display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #e2e8f0', paddingTop: '0.6rem', marginTop: '0.4rem' }}>
            <span>% Devolutivas Gravadas: <b style={{ color: '#4338ca' }}>{kpis.percentDevolutivas}%</b> ({kpis.devolutivasGravadas})</span>
          </div>
        </div>
      </div>

      {/* Barra de Filtros Avançados */}
      <div className="glass-panel" style={{ padding: '1.25rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <strong style={{ fontSize: '0.9rem', color: 'var(--color-primary-dark)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            🔍 Filtros de Consulta Pedagógica
          </strong>
          {(searchTerm || semestreFilter || tutorFilter || nreFilter || modalidadeFilter || componenteFilter || anoFilter || statusFilter) && (
            <button
              onClick={() => {
                setSearchTerm('');
                setSemestreFilter('');
                setTutorFilter('');
                setNreFilter('');
                setModalidadeFilter('');
                setComponenteFilter('');
                setAnoFilter('');
                setStatusFilter('');
                setCurrentPage(1);
              }}
              style={{ background: 'none', border: 'none', color: '#e53e3e', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}
            >
              ✕ Limpar Filtros
            </button>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.85rem' }}>
          {/* Campo de Busca Texto */}
          <div style={{ gridColumn: 'span 2' }}>
            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-muted)', display: 'block', marginBottom: '0.25rem' }}>
              Buscar Cursista, Formador ou Tema:
            </label>
            <input
              type="text"
              placeholder="Digite nome, e-mail ou temática..."
              value={searchTerm}
              onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              style={{ width: '100%', padding: '0.45rem 0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
            />
          </div>

          {/* Filtro por Semestre */}
          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-muted)', display: 'block', marginBottom: '0.25rem' }}>
              Semestre:
            </label>
            <select
              value={semestreFilter}
              onChange={e => { setSemestreFilter(e.target.value); setCurrentPage(1); }}
              style={{ width: '100%', padding: '0.45rem 0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
            >
              <option value="">Todos os Semestres</option>
              <option value="1º Semestre">1º Semestre</option>
              <option value="2º Semestre">2º Semestre</option>
            </select>
          </div>

          {/* Filtro por Ano Formativo */}
          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-muted)', display: 'block', marginBottom: '0.25rem' }}>
              Ano Formativo:
            </label>
            <select
              value={anoFilter}
              onChange={e => { setAnoFilter(e.target.value); setCurrentPage(1); }}
              style={{ width: '100%', padding: '0.45rem 0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
            >
              <option value="">Todos os Anos</option>
              {filterOptions.anos.map(a => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          </div>

          {/* Filtro por NRE */}
          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-muted)', display: 'block', marginBottom: '0.25rem' }}>
              NRE:
            </label>
            <select
              value={nreFilter}
              onChange={e => { setNreFilter(e.target.value); setCurrentPage(1); }}
              style={{ width: '100%', padding: '0.45rem 0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
            >
              <option value="">Todos os NREs ({filterOptions.nres.length})</option>
              {filterOptions.nres.map(n => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </div>

          {/* Filtro por Componente Curricular */}
          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-muted)', display: 'block', marginBottom: '0.25rem' }}>
              Componente Curricular:
            </label>
            <select
              value={componenteFilter}
              onChange={e => { setComponenteFilter(e.target.value); setCurrentPage(1); }}
              style={{ width: '100%', padding: '0.45rem 0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
            >
              <option value="">Todos os Componentes</option>
              {filterOptions.componentes.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Filtro por Modalidade da Observação */}
          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-muted)', display: 'block', marginBottom: '0.25rem' }}>
              Modalidade da Observação:
            </label>
            <select
              value={modalidadeFilter}
              onChange={e => { setModalidadeFilter(e.target.value); setCurrentPage(1); }}
              style={{ width: '100%', padding: '0.45rem 0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
            >
              <option value="">Todas as Modalidades</option>
              {filterOptions.modalidades.map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>

          {/* Filtro por Tutor */}
          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-muted)', display: 'block', marginBottom: '0.25rem' }}>
              Tutor Responsável:
            </label>
            <select
              value={tutorFilter}
              onChange={e => { setTutorFilter(e.target.value); setCurrentPage(1); }}
              style={{ width: '100%', padding: '0.45rem 0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
            >
              <option value="">Todos os Tutores ({filterOptions.tutores.length})</option>
              {filterOptions.tutores.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          {/* Filtro por Status da Observação */}
          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-muted)', display: 'block', marginBottom: '0.25rem' }}>
              Status da Prática:
            </label>
            <select
              value={statusFilter}
              onChange={e => { setStatusFilter(e.target.value); setCurrentPage(1); }}
              style={{ width: '100%', padding: '0.45rem 0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
            >
              <option value="">Todos os Status</option>
              <option value="realizada">✓ Observação Realizada</option>
              <option value="nao_realizada">⚠️ Não Realizada / Justificada</option>
            </select>
          </div>
        </div>
      </div>

      {/* Dica de usabilidade */}
      <div style={{ marginBottom: '0.6rem', fontSize: '0.8rem', color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
        <span>💡</span> <i>Clique no nome de qualquer coluna para ordenar (A-Z ou Z-A). Clique em qualquer linha para abrir a análise pedagógica completa em modal.</i>
      </div>

      {/* Tabela de Observações com Temática e Data do Formulário */}
      <div className="table-responsive glass-panel" style={{ padding: '0.5rem', marginBottom: '1rem' }}>
        <table className="custom-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              {renderSortableTh('cursista', 'Cursista', { minWidth: '180px' })}
              {renderSortableTh('ano_semestre', 'Ano / Semestre')}
              {renderSortableTh('componente', 'Componente')}
              {renderSortableTh('tematica', 'Temática & Referência')}
              {renderSortableTh('formador_tutor', 'Formador / Tutor')}
              {renderSortableTh('data_pratica', 'Data Prática')}
              {renderSortableTh('data_formulario', 'Data Formulário')}
              {renderSortableTh('status', 'Status / Feedback')}
              {renderSortableTh('niveis', 'Níveis Avaliados', { minWidth: '170px' })}
            </tr>
          </thead>
          <tbody>
            {paginatedObservacoes.length === 0 ? (
              <tr>
                <td colSpan="9" style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--color-text-muted)' }}>
                  Nenhuma observação encontrada com os filtros selecionados.
                </td>
              </tr>
            ) : (
              paginatedObservacoes.map(obs => {
                const isRealizada = obs.is_realizada;
                return (
                  <tr 
                    key={obs.id} 
                    className="table-row-hover"
                    onClick={() => setSelectedObs(obs)}
                    style={{ cursor: 'pointer', transition: 'background-color 0.15s ease' }}
                    title="Clique para abrir os detalhes completos da observação em modal"
                  >
                    <td>
                      <div style={{ fontWeight: 700, color: 'var(--color-primary-dark)', fontSize: '0.88rem' }}>
                        {obs.nome_cursista || 'Cursista sem nome'}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                        {obs.email_cursista}
                      </div>
                    </td>

                    <td>
                      <span className="logo-badge" style={{ backgroundColor: '#e2e8f0', color: '#1e293b', fontSize: '0.7rem' }}>
                        {obs.ano_formativo || '1º ANO'}
                      </span>
                      <div style={{ fontSize: '0.75rem', color: 'var(--color-accent-blue)', fontWeight: 600, marginTop: '0.2rem' }}>
                        {obs.semestre}
                      </div>
                      <div style={{ fontSize: '0.75rem', marginTop: '0.1rem', color: 'var(--color-text-muted)' }}>
                        {obs.nre_exe}
                      </div>
                    </td>

                    <td>
                      <div style={{ fontSize: '0.82rem', fontWeight: 600 }}>
                        {obs.componente || 'Docente'}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>
                        {obs.modalidade}
                      </div>
                    </td>

                    {/* Temática e Referência da Observação */}
                    <td style={{ maxWidth: '220px' }}>
                      <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-primary-dark)', lineHeight: '1.25' }}>
                        {obs.tema ? (
                          <span>🎯 {obs.tema}</span>
                        ) : (
                          <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>Não especificado</span>
                        )}
                      </div>
                    </td>

                    <td>
                      <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--color-primary-mid)' }}>
                        👨‍🏫 {obs.nome_formador || 'Formador não inf.'}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.1rem' }}>
                        🤝 {obs.tutor_responsavel || 'Tutor não inf.'}
                      </div>
                    </td>

                    <td>
                      <div style={{ fontSize: '0.82rem', fontWeight: 600 }}>
                        {formatDatePtBr(obs.data_pratica || obs.data_observacao)}
                      </div>
                      {obs.data_feedback && (
                        <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>
                          Devol: {formatDatePtBr(obs.data_feedback)}
                        </div>
                      )}
                    </td>

                    {/* Data/Carimbo de preenchimento do formulário */}
                    <td>
                      <div style={{ fontSize: '0.78rem', color: 'var(--color-text-main)', fontWeight: 600 }}>
                        {formatDatePtBr(obs.carimbo || obs.data_observacao, true)}
                      </div>
                    </td>

                    <td>
                      <span className={`status-pill ${isRealizada ? 'status-active' : 'status-pending'}`} style={{ fontSize: '0.7rem' }}>
                        {isRealizada ? '✓ Realizada' : '⚠️ Não Realizada'}
                      </span>
                      {obs.modalidade_feedback && (
                        <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', marginTop: '0.2rem' }}>
                          {obs.modalidade_feedback}
                        </div>
                      )}
                    </td>

                    <td>
                      {isRealizada ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                          {obs.categoria_planejamento && (
                            <span className={`badge-nivel ${getNivelBadgeClass(obs.categoria_planejamento)}`} style={{ fontSize: '0.68rem', padding: '0.15rem 0.45rem' }}>
                              Plan: {obs.categoria_planejamento}
                            </span>
                          )}
                          {obs.categoria_pratica && (
                            <span className={`badge-nivel ${getNivelBadgeClass(obs.categoria_pratica)}`} style={{ fontSize: '0.68rem', padding: '0.15rem 0.45rem' }}>
                              Prát: {obs.categoria_pratica}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span style={{ fontSize: '0.75rem', color: '#b91c1c', fontStyle: 'italic' }}>
                          {obs.justificativa_nao_realizada ? 'Com justificativa' : 'Sem justificativa'}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Paginação */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
            Exibindo <b>{(currentPage - 1) * itemsPerPage + 1}</b> a <b>{Math.min(currentPage * itemsPerPage, filteredObservacoes.length)}</b> de <b>{filteredObservacoes.length}</b> registros
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <button
              className="btn-secondary"
              disabled={currentPage === 1}
              onClick={() => handlePageChange(currentPage - 1)}
              style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}
            >
              Anterior
            </button>
            
            <span style={{ fontSize: '0.85rem', margin: '0 0.5rem' }}>
              Página <b>{currentPage}</b> de <b>{totalPages}</b>
            </span>

            <button
              className="btn-secondary"
              disabled={currentPage === totalPages}
              onClick={() => handlePageChange(currentPage + 1)}
              style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}
            >
              Próxima
            </button>
          </div>
        </div>
      )}

      {/* Modal de Detalhes da Observação */}
      {selectedObs && (
        <ObservacaoModalDetalhes 
          observacao={selectedObs} 
          onClose={() => setSelectedObs(null)} 
        />
      )}
    </div>
  );
}
