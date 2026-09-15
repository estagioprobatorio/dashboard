import React, { useState, useMemo } from 'react';
import ObservacaoModalDetalhes from './ObservacaoModalDetalhes';

export default function ObservacaoPratica({ observacoes = [], cursistas = [], tutores = [], userRole, userEmail }) {
  // Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [tutorFilter, setTutorFilter] = useState('');
  const [nreFilter, setNreFilter] = useState('');
  const [modalidadeFilter, setModalidadeFilter] = useState('');
  const [componenteFilter, setComponenteFilter] = useState('');
  const [anoFilter, setAnoFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState(''); // 'realizada', 'nao_realizada'
  const [nivelPlanejamentoFilter, setNivelPlanejamentoFilter] = useState('');
  const [nivelPraticaFilter, setNivelPraticaFilter] = useState('');

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

  // Lista de observações enriquecidas com NRE, Tutor e dados funcionais
  const enrichedObservacoes = useMemo(() => {
    return observacoes.map(obs => {
      const emailCursista = (obs.email_cursista || '').trim().toLowerCase();
      const cursistaInfo = cursistasMap.get(emailCursista);

      const tutorResponsavel = obs.tutor_responsavel || (cursistaInfo ? cursistaInfo.tutor_responsavel : null) || 'Não atribuído';
      const emailTutor = obs.email_tutor || (cursistaInfo ? cursistaInfo.email_tutor : null) || '';
      const nre = obs.nre_exe || (cursistaInfo ? (cursistaInfo.nre_exe || cursistaInfo.nre_tutor) : null) || 'NRE Não Identificado';
      const municipio = obs.munic_exe || (cursistaInfo ? cursistaInfo.munic_exe : null) || '';
      const modalidade = obs.modalidade || (cursistaInfo ? cursistaInfo.modalidade : null) || 'Docentes';
      const componente = obs.componente || (cursistaInfo ? cursistaInfo.componente : null) || '';
      const isRealizada = obs.is_realizada ?? (obs.observacao_realizada ? obs.observacao_realizada.toLowerCase().includes('sim') : true);

      return {
        ...obs,
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
    const tutoresSet = new Set();
    const nresSet = new Set();
    const modalidadesSet = new Set();
    const componentesSet = new Set();
    const anosSet = new Set();

    enrichedObservacoes.forEach(obs => {
      if (obs.tutor_responsavel && obs.tutor_responsavel !== 'Não atribuído') tutoresSet.add(obs.tutor_responsavel);
      if (obs.nre_exe && obs.nre_exe !== 'NRE Não Identificado') nresSet.add(obs.nre_exe);
      if (obs.modalidade) modalidadesSet.add(obs.modalidade);
      if (obs.componente) componentesSet.add(obs.componente);
      if (obs.ano_formativo) anosSet.add(obs.ano_formativo);
    });

    const sortPt = (set) => Array.from(set).sort((a, b) => a.localeCompare(b, 'pt-BR', { sensitivity: 'base' }));

    return {
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
        if (!nomeMatch && !emailMatch && !formadorMatch) return false;
      }

      // Tutor
      if (tutorFilter && obs.tutor_responsavel !== tutorFilter) return false;

      // NRE
      if (nreFilter && obs.nre_exe !== nreFilter) return false;

      // Modalidade
      if (modalidadeFilter && obs.modalidade !== modalidadeFilter) return false;

      // Componente
      if (componenteFilter && obs.componente !== componenteFilter) return false;

      // Ano Formativo
      if (anoFilter && obs.ano_formativo !== anoFilter) return false;

      // Status Realizada
      if (statusFilter === 'realizada' && !obs.is_realizada) return false;
      if (statusFilter === 'nao_realizada' && obs.is_realizada) return false;

      // Nível Planejamento
      if (nivelPlanejamentoFilter && obs.categoria_planejamento !== nivelPlanejamentoFilter) return false;

      // Nível Prática
      if (nivelPraticaFilter && obs.categoria_pratica !== nivelPraticaFilter) return false;

      return true;
    });
  }, [enrichedObservacoes, searchTerm, tutorFilter, nreFilter, modalidadeFilter, componenteFilter, anoFilter, statusFilter, nivelPlanejamentoFilter, nivelPraticaFilter]);

  // Indicadores (KPIs)
  const kpis = useMemo(() => {
    const total = filteredObservacoes.length;
    if (total === 0) {
      return { 
        total: 0, 
        realizadas: 0, 
        percentRealizadas: 0, 
        naoRealizadas: 0,
        dialogos: 0, 
        percentDialogos: 0, 
        superamPlan: 0,
        atingemPlan: 0,
        superamPrat: 0,
        atingemPrat: 0,
        percentExcelenciaPratica: 0 
      };
    }

    const realizadas = filteredObservacoes.filter(o => o.is_realizada).length;
    const naoRealizadas = total - realizadas;
    const dialogos = filteredObservacoes.filter(o => (o.modalidade_feedback || '').toLowerCase().includes('diálogo') || (o.modalidade_feedback || '').toLowerCase().includes('dialogo')).length;
    
    const superamPlan = filteredObservacoes.filter(o => o.categoria_planejamento === 'SUPERA').length;
    const atingemPlan = filteredObservacoes.filter(o => o.categoria_planejamento === 'ATINGE INTEGRALMENTE').length;
    const superamPrat = filteredObservacoes.filter(o => o.categoria_pratica === 'SUPERA').length;
    const atingemPrat = filteredObservacoes.filter(o => o.categoria_pratica === 'ATINGE INTEGRALMENTE').length;
    const totalPositivosPrat = superamPrat + atingemPrat;

    return {
      total,
      realizadas,
      percentRealizadas: Math.round((realizadas / total) * 100),
      naoRealizadas,
      dialogos,
      percentDialogos: realizadas > 0 ? Math.round((dialogos / realizadas) * 100) : 0,
      superamPlan,
      atingemPlan,
      superamPrat,
      atingemPrat,
      totalPositivosPrat,
      percentExcelenciaPratica: realizadas > 0 ? Math.round((totalPositivosPrat / realizadas) * 100) : 0
    };
  }, [filteredObservacoes]);

  // Paginação
  const totalPages = Math.ceil(filteredObservacoes.length / itemsPerPage) || 1;
  const paginatedObservacoes = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredObservacoes.slice(start, start + itemsPerPage);
  }, [filteredObservacoes, currentPage, itemsPerPage]);

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

  // Exportar para CSV
  const handleExportCSV = () => {
    if (filteredObservacoes.length === 0) return;

    const headers = ['Ano Formativo', 'Cursista', 'E-mail Cursista', 'NRE', 'Componente', 'Modalidade', 'Formador', 'Tutor', 'Status', 'Data Prática', 'Data Feedback', 'Feedback', 'Nível Planejamento', 'Nível Prática', 'Link Prática', 'Link PDP', 'Combinados'];
    const rows = filteredObservacoes.map(o => [
      `"${o.ano_formativo || ''}"`,
      `"${o.nome_cursista || ''}"`,
      `"${o.email_cursista || ''}"`,
      `"${o.nre_exe || ''}"`,
      `"${o.componente || ''}"`,
      `"${o.modalidade || ''}"`,
      `"${o.nome_formador || ''}"`,
      `"${o.tutor_responsavel || ''}"`,
      `"${o.is_realizada ? 'Realizada' : 'Não Realizada'}"`,
      `"${o.data_pratica || ''}"`,
      `"${o.data_feedback || ''}"`,
      `"${o.modalidade_feedback || ''}"`,
      `"${o.nivel_planejamento || ''}"`,
      `"${o.nivel_pratica || ''}"`,
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

      {/* Cards de Métricas (KPIs) - Design Moderno e Espaçoso */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
        gap: '1.25rem',
        marginBottom: '1.5rem'
      }}>
        {/* KPI 1: Volume Total & Execução */}
        <div className="glass-panel" style={{
          padding: '1.4rem 1.6rem',
          position: 'relative',
          overflow: 'hidden',
          borderLeft: '5px solid var(--color-primary-mid)',
          background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Volume de Avaliações
            </span>
            <span style={{ fontSize: '1.4rem' }}>📋</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '2.4rem', fontWeight: 800, color: 'var(--color-primary-dark)', fontFamily: 'var(--font-header)', lineHeight: 1 }}>
              {kpis.total.toLocaleString('pt-BR')}
            </span>
            <span style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>
              registros filtrados
            </span>
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #e2e8f0', paddingTop: '0.6rem', marginTop: '0.4rem' }}>
            <span>Base total: <b>{enrichedObservacoes.length.toLocaleString('pt-BR')}</b></span>
            <span>Realizadas: <b style={{ color: 'var(--color-accent-green)' }}>{kpis.realizadas.toLocaleString('pt-BR')}</b></span>
          </div>
        </div>

        {/* KPI 2: Taxa de Observações Concluídas */}
        <div className="glass-panel" style={{
          padding: '1.4rem 1.6rem',
          position: 'relative',
          overflow: 'hidden',
          borderLeft: '5px solid var(--color-accent-green)',
          background: 'linear-gradient(135deg, #ffffff 0%, #f0fdf4 100%)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-accent-green)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Taxa de Conclusão
            </span>
            <span style={{ fontSize: '1.4rem' }}>✅</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '2.4rem', fontWeight: 800, color: '#166534', fontFamily: 'var(--font-header)', lineHeight: 1 }}>
              {kpis.percentRealizadas}%
            </span>
            <span style={{ fontSize: '0.82rem', color: '#15803d', fontWeight: 700 }}>
              {kpis.realizadas} de {kpis.total}
            </span>
          </div>
          {/* Barra de Progresso Visual */}
          <div style={{ width: '100%', height: '7px', backgroundColor: '#dcfce7', borderRadius: '4px', overflow: 'hidden', margin: '0.4rem 0' }}>
            <div style={{ width: `${Math.min(kpis.percentRealizadas, 100)}%`, height: '100%', backgroundColor: 'var(--color-accent-green)', borderRadius: '4px', transition: 'width 0.4s ease' }} />
          </div>
          <div style={{ fontSize: '0.78rem', color: '#4b5563', display: 'flex', justifyContent: 'space-between', paddingTop: '0.2rem' }}>
            <span>Realizadas: <b>{kpis.realizadas}</b></span>
            <span style={{ color: '#b91c1c' }}>Pendentes/Justif: <b>{kpis.naoRealizadas}</b></span>
          </div>
        </div>

        {/* KPI 3: Desempenho na Prática (Supera + Integral) */}
        <div className="glass-panel" style={{
          padding: '1.4rem 1.6rem',
          position: 'relative',
          overflow: 'hidden',
          borderLeft: '5px solid var(--color-accent-blue)',
          background: 'linear-gradient(135deg, #ffffff 0%, #f0f9ff 100%)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-accent-blue)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Atingimento da Prática
            </span>
            <span style={{ fontSize: '1.4rem' }}>🌟</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '2.4rem', fontWeight: 800, color: 'var(--color-primary-dark)', fontFamily: 'var(--font-header)', lineHeight: 1 }}>
              {kpis.percentExcelenciaPratica}%
            </span>
            <span style={{ fontSize: '0.82rem', color: '#0369a1', fontWeight: 700 }}>
              Atingem ou Superam
            </span>
          </div>
          <div style={{ fontSize: '0.78rem', color: '#4b5563', display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #e2e8f0', paddingTop: '0.6rem', marginTop: '0.4rem' }}>
            <span>Supera: <b style={{ color: '#7c3aed' }}>{kpis.superamPrat}</b></span>
            <span>Integral: <b style={{ color: '#0284c7' }}>{kpis.atingemPrat}</b></span>
          </div>
        </div>

        {/* KPI 4: Diálogo Formativo / Vídeos */}
        <div className="glass-panel" style={{
          padding: '1.4rem 1.6rem',
          position: 'relative',
          overflow: 'hidden',
          borderLeft: '5px solid #8b5cf6',
          background: 'linear-gradient(135deg, #ffffff 0%, #faf5ff 100%)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#6d28d9', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Diálogo Formativo
            </span>
            <span style={{ fontSize: '1.4rem' }}>🗣️</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '2.4rem', fontWeight: 800, color: '#5b21b6', fontFamily: 'var(--font-header)', lineHeight: 1 }}>
              {kpis.percentDialogos}%
            </span>
            <span style={{ fontSize: '0.82rem', color: '#6d28d9', fontWeight: 700 }}>
              {kpis.dialogos} devolutivas
            </span>
          </div>
          <div style={{ fontSize: '0.78rem', color: '#4b5563', display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #e2e8f0', paddingTop: '0.6rem', marginTop: '0.4rem' }}>
            <span>Sessões síncronas / ao vivo gravadas</span>
          </div>
        </div>
      </div>

      {/* Barra de Filtros Avançados */}
      <div className="glass-panel" style={{ padding: '1.25rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <strong style={{ fontSize: '0.9rem', color: 'var(--color-primary-dark)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            🔍 Filtros de Consulta Pedagógica
          </strong>
          {(searchTerm || tutorFilter || nreFilter || modalidadeFilter || componenteFilter || anoFilter || statusFilter || nivelPlanejamentoFilter || nivelPraticaFilter) && (
            <button
              onClick={() => {
                setSearchTerm('');
                setTutorFilter('');
                setNreFilter('');
                setModalidadeFilter('');
                setComponenteFilter('');
                setAnoFilter('');
                setStatusFilter('');
                setNivelPlanejamentoFilter('');
                setNivelPraticaFilter('');
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
              Buscar Cursista ou Formador:
            </label>
            <input
              type="text"
              placeholder="Digite nome ou e-mail..."
              value={searchTerm}
              onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              style={{ width: '100%', padding: '0.45rem 0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
            />
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

          {/* Filtro por Modalidade */}
          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-muted)', display: 'block', marginBottom: '0.25rem' }}>
              Modalidade:
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

          {/* Filtro por Nível de Planejamento */}
          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-muted)', display: 'block', marginBottom: '0.25rem' }}>
              Nível Planejamento:
            </label>
            <select
              value={nivelPlanejamentoFilter}
              onChange={e => { setNivelPlanejamentoFilter(e.target.value); setCurrentPage(1); }}
              style={{ width: '100%', padding: '0.45rem 0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
            >
              <option value="">Todos os Níveis (Planejamento)</option>
              <option value="SUPERA">🌟 SUPERA</option>
              <option value="ATINGE INTEGRALMENTE">✓ ATINGE INTEGRALMENTE</option>
              <option value="ATINGE PARCIALMENTE">⚠️ ATINGE PARCIALMENTE</option>
              <option value="NÃO ATINGE">✕ NÃO ATINGE</option>
            </select>
          </div>

          {/* Filtro por Nível de Prática */}
          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-muted)', display: 'block', marginBottom: '0.25rem' }}>
              Nível Prática:
            </label>
            <select
              value={nivelPraticaFilter}
              onChange={e => { setNivelPraticaFilter(e.target.value); setCurrentPage(1); }}
              style={{ width: '100%', padding: '0.45rem 0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
            >
              <option value="">Todos os Níveis (Prática)</option>
              <option value="SUPERA">🌟 SUPERA</option>
              <option value="ATINGE INTEGRALMENTE">✓ ATINGE INTEGRALMENTE</option>
              <option value="ATINGE PARCIALMENTE">⚠️ ATINGE PARCIALMENTE</option>
              <option value="NÃO ATINGE">✕ NÃO ATINGE</option>
            </select>
          </div>
        </div>
      </div>

      {/* Dica de usabilidade */}
      <div style={{ marginBottom: '0.6rem', fontSize: '0.8rem', color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
        <span>💡</span> <i>Clique em qualquer linha da tabela para abrir a análise pedagógica completa e os feedbacks em modal.</i>
      </div>

      {/* Tabela de Observações (Sem coluna Ações, clique direto na linha) */}
      <div className="table-responsive glass-panel" style={{ padding: '0.5rem', marginBottom: '1rem' }}>
        <table className="custom-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ minWidth: '190px' }}>Cursista</th>
              <th>Ano / NRE</th>
              <th>Componente</th>
              <th>Formador / Tutor</th>
              <th>Data Prática</th>
              <th>Status / Feedback</th>
              <th style={{ minWidth: '180px' }}>Níveis Avaliados</th>
            </tr>
          </thead>
          <tbody>
            {paginatedObservacoes.length === 0 ? (
              <tr>
                <td colSpan="7" style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--color-text-muted)' }}>
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
                      <div style={{ fontSize: '0.78rem', marginTop: '0.2rem', color: 'var(--color-text-main)' }}>
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
                        {obs.data_pratica || obs.data_observacao || '-'}
                      </div>
                      {obs.data_feedback && (
                        <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>
                          Devol: {obs.data_feedback}
                        </div>
                      )}
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
                          {obs.nivel_planejamento && (
                            <span className={`badge-nivel ${getNivelBadgeClass(obs.nivel_planejamento)}`} style={{ fontSize: '0.68rem', padding: '0.15rem 0.45rem' }}>
                              Plan: {obs.categoria_planejamento}
                            </span>
                          )}
                          {obs.nivel_pratica && (
                            <span className={`badge-nivel ${getNivelBadgeClass(obs.nivel_pratica)}`} style={{ fontSize: '0.68rem', padding: '0.15rem 0.45rem' }}>
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
