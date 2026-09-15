import React, { useState, useMemo } from 'react';

export default function ObservacoesOverview({ observacoes = [], cursistas = [], tutores = [] }) {
  // Filtros Globais do Overview
  const [anoFilter, setAnoFilter] = useState('');
  const [modalidadeFilter, setModalidadeFilter] = useState('');
  const [nreFilter, setNreFilter] = useState('');
  const [componenteFilter, setComponenteFilter] = useState('');

  // Normalização de níveis
  const parseLevel = (text) => {
    if (!text) return 'NÃO INFORMADO';
    const t = String(text).toUpperCase();
    if (t.includes('SUPERA') || t.includes('SUPEROU')) return 'SUPERA';
    if (t.includes('INTEGRAL') || (t.includes('ATENDE') && !t.includes('PARCIAL') && !t.includes('NÃO') && !t.includes('NAO')) || (t.includes('ATINGE') && !t.includes('PARCIAL') && !t.includes('NÃO') && !t.includes('NAO'))) return 'ATINGE INTEGRALMENTE';
    if (t.includes('PARCIAL')) return 'ATINGE PARCIALMENTE';
    if (t.includes('NÃO') || t.includes('NAO')) return 'NÃO ATINGE';
    return 'NÃO INFORMADO';
  };

  // Mapa de enriquecimento por cursista
  const cursistasMap = useMemo(() => {
    const map = new Map();
    cursistas.forEach(c => {
      const email = (c['e-mail'] || c.email || c.email_cursista || '').trim().toLowerCase();
      if (email) map.set(email, c);
    });
    return map;
  }, [cursistas]);

  // Base enriquecida
  const enrichedData = useMemo(() => {
    return observacoes.map(obs => {
      const emailCursista = (obs.email_cursista || '').trim().toLowerCase();
      const cursistaInfo = cursistasMap.get(emailCursista);

      const nre = obs.nre_exe || (cursistaInfo ? (cursistaInfo.nre_exe || cursistaInfo.nre_tutor) : null) || 'NRE Não Identificado';
      const modalidade = obs.modalidade || (cursistaInfo ? cursistaInfo.modalidade : null) || 'Docentes';
      const componente = obs.componente || (cursistaInfo ? cursistaInfo.componente : null) || 'Geral';
      const anoFormativo = obs.ano_formativo || '1º ANO';
      const isRealizada = obs.is_realizada ?? (obs.observacao_realizada ? obs.observacao_realizada.toLowerCase().includes('sim') : true);

      return {
        ...obs,
        nre_exe: nre,
        modalidade,
        componente,
        ano_formativo: anoFormativo,
        is_realizada: isRealizada,
        cat_planejamento: parseLevel(obs.nivel_planejamento),
        cat_pratica: parseLevel(obs.nivel_pratica)
      };
    });
  }, [observacoes, cursistasMap]);

  // Opções de Filtro
  const filterOptions = useMemo(() => {
    const anos = new Set();
    const modalidades = new Set();
    const nres = new Set();
    const componentes = new Set();

    enrichedData.forEach(o => {
      if (o.ano_formativo) anos.add(o.ano_formativo);
      if (o.modalidade) modalidades.add(o.modalidade);
      if (o.nre_exe && o.nre_exe !== 'NRE Não Identificado') nres.add(o.nre_exe);
      if (o.componente) componentes.add(o.componente);
    });

    const sortPt = (set) => Array.from(set).sort((a, b) => a.localeCompare(b, 'pt-BR', { sensitivity: 'base' }));

    return {
      anos: sortPt(anos),
      modalidades: sortPt(modalidades),
      nres: sortPt(nres),
      componentes: sortPt(componentes)
    };
  }, [enrichedData]);

  // Dados filtrados
  const filtered = useMemo(() => {
    return enrichedData.filter(o => {
      if (anoFilter && o.ano_formativo !== anoFilter) return false;
      if (modalidadeFilter && o.modalidade !== modalidadeFilter) return false;
      if (nreFilter && o.nre_exe !== nreFilter) return false;
      if (componenteFilter && o.componente !== componenteFilter) return false;
      return true;
    });
  }, [enrichedData, anoFilter, modalidadeFilter, nreFilter, componenteFilter]);

  // Estatísticas e Agregações Executivas
  const stats = useMemo(() => {
    const total = filtered.length;
    if (total === 0) {
      return {
        total: 0,
        realizadas: 0,
        percRealizadas: 0,
        naoRealizadas: 0,
        percNaoRealizadas: 0,
        dialogos: 0,
        percDialogos: 0,
        countPrat: {},
        countPlan: {},
        nreDistribution: [],
        compDistribution: []
      };
    }

    let realizadas = 0;
    let dialogos = 0;

    const countPrat = { SUPERA: 0, 'ATINGE INTEGRALMENTE': 0, 'ATINGE PARCIALMENTE': 0, 'NÃO ATINGE': 0, 'NÃO INFORMADO': 0 };
    const countPlan = { SUPERA: 0, 'ATINGE INTEGRALMENTE': 0, 'ATINGE PARCIALMENTE': 0, 'NÃO ATINGE': 0, 'NÃO INFORMADO': 0 };
    const nreMap = {};
    const compMap = {};

    filtered.forEach(o => {
      if (o.is_realizada) realizadas++;
      if ((o.modalidade_feedback || '').toLowerCase().includes('diálogo') || (o.modalidade_feedback || '').toLowerCase().includes('dialogo')) {
        dialogos++;
      }

      if (countPrat[o.cat_pratica] !== undefined) countPrat[o.cat_pratica]++;
      if (countPlan[o.cat_planejamento] !== undefined) countPlan[o.cat_planejamento]++;

      // NRE
      const n = o.nre_exe || 'Não informado';
      if (!nreMap[n]) nreMap[n] = { total: 0, realizadas: 0, superaPrat: 0, atendePrat: 0 };
      nreMap[n].total++;
      if (o.is_realizada) nreMap[n].realizadas++;
      if (o.cat_pratica === 'SUPERA') nreMap[n].superaPrat++;
      if (o.cat_pratica === 'ATINGE INTEGRALMENTE') nreMap[n].atendePrat++;

      // Componente
      const c = o.componente || 'Não informado';
      if (!compMap[c]) compMap[c] = { total: 0, realizadas: 0, superam: 0 };
      compMap[c].total++;
      if (o.is_realizada) compMap[c].realizadas++;
      if (o.cat_pratica === 'SUPERA' || o.cat_pratica === 'ATINGE INTEGRALMENTE') compMap[c].superam++;
    });

    const nreDistribution = Object.entries(nreMap)
      .map(([name, data]) => ({
        name,
        ...data,
        percRealizadas: data.total > 0 ? Math.round((data.realizadas / data.total) * 100) : 0,
        percExcelencia: data.realizadas > 0 ? Math.round(((data.superaPrat + data.atendePrat) / data.realizadas) * 100) : 0
      }))
      .sort((a, b) => b.total - a.total);

    const compDistribution = Object.entries(compMap)
      .map(([name, data]) => ({
        name,
        ...data,
        percAtingimento: data.realizadas > 0 ? Math.round((data.superam / data.realizadas) * 100) : 0
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 8);

    return {
      total,
      realizadas,
      percRealizadas: Math.round((realizadas / total) * 100),
      naoRealizadas: total - realizadas,
      percNaoRealizadas: Math.round(((total - realizadas) / total) * 100),
      dialogos,
      percDialogos: realizadas > 0 ? Math.round((dialogos / realizadas) * 100) : 0,
      countPrat,
      countPlan,
      nreDistribution,
      compDistribution
    };
  }, [filtered]);

  // Cálculos percentuais para as barras do gráfico
  const basePrat = stats.realizadas || 1;
  const percSuperaPrat = Math.round(((stats.countPrat?.SUPERA || 0) / basePrat) * 100);
  const percIntegralPrat = Math.round(((stats.countPrat?.['ATINGE INTEGRALMENTE'] || 0) / basePrat) * 100);
  const percParcialPrat = Math.round(((stats.countPrat?.['ATINGE PARCIALMENTE'] || 0) / basePrat) * 100);
  const percNaoAtingePrat = Math.round(((stats.countPrat?.['NÃO ATINGE'] || 0) / basePrat) * 100);

  const percSuperaPlan = Math.round(((stats.countPlan?.SUPERA || 0) / basePrat) * 100);
  const percIntegralPlan = Math.round(((stats.countPlan?.['ATINGE INTEGRALMENTE'] || 0) / basePrat) * 100);
  const percParcialPlan = Math.round(((stats.countPlan?.['ATINGE PARCIALMENTE'] || 0) / basePrat) * 100);
  const percNaoAtingePlan = Math.round(((stats.countPlan?.['NÃO ATINGE'] || 0) / basePrat) * 100);

  return (
    <div className="section-container animate-fade-in" style={{ paddingBottom: '2.5rem' }}>
      {/* Header Executivo */}
      <div className="glass-panel" style={{
        padding: '1.5rem 2rem',
        marginBottom: '1.5rem',
        borderLeft: '5px solid var(--color-primary-mid)',
        background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '1rem'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.3rem' }}>
            <h2 style={{ fontSize: '1.5rem', color: 'var(--color-primary-dark)', margin: 0, fontWeight: 800 }}>
              📈 Observações - Overview
            </h2>
            <span className="logo-badge" style={{ backgroundColor: 'var(--color-primary-dark)', color: '#fff' }}>
              Painel Geral de Redes & Níveis
            </span>
          </div>
          <p style={{ margin: 0, fontSize: '0.88rem', color: 'var(--color-text-muted)' }}>
            Consolidação analítica das observações da prática pedagógica no Estado do Paraná, sem detalhamento formador por formador.
          </p>
        </div>

        {/* Botão limpar filtros */}
        {(anoFilter || modalidadeFilter || nreFilter || componenteFilter) && (
          <button
            onClick={() => { setAnoFilter(''); setModalidadeFilter(''); setNreFilter(''); setComponenteFilter(''); }}
            style={{
              backgroundColor: '#fee2e2',
              color: '#b91c1c',
              border: '1px solid #fca5a5',
              padding: '0.45rem 0.9rem',
              borderRadius: '8px',
              fontWeight: 700,
              fontSize: '0.8rem',
              cursor: 'pointer'
            }}
          >
            ✕ Limpar Filtros
          </button>
        )}
      </div>

      {/* Barra de Filtros Globais */}
      <div className="glass-panel" style={{ padding: '1rem 1.5rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', alignItems: 'flex-end' }}>
          <div>
            <label style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--color-primary-dark)', display: 'block', marginBottom: '0.3rem' }}>
              Ano Formativo:
            </label>
            <select
              value={anoFilter}
              onChange={e => setAnoFilter(e.target.value)}
              style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
            >
              <option value="">Todos os Anos</option>
              {filterOptions.anos.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>

          <div>
            <label style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--color-primary-dark)', display: 'block', marginBottom: '0.3rem' }}>
              Modalidade:
            </label>
            <select
              value={modalidadeFilter}
              onChange={e => setModalidadeFilter(e.target.value)}
              style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
            >
              <option value="">Todas as Modalidades</option>
              {filterOptions.modalidades.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>

          <div>
            <label style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--color-primary-dark)', display: 'block', marginBottom: '0.3rem' }}>
              NRE:
            </label>
            <select
              value={nreFilter}
              onChange={e => setNreFilter(e.target.value)}
              style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
            >
              <option value="">Todos os NREs ({filterOptions.nres.length})</option>
              {filterOptions.nres.map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>

          <div>
            <label style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--color-primary-dark)', display: 'block', marginBottom: '0.3rem' }}>
              Componente Curricular:
            </label>
            <select
              value={componenteFilter}
              onChange={e => setComponenteFilter(e.target.value)}
              style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
            >
              <option value="">Todos os Componentes</option>
              {filterOptions.componentes.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* 4 KPIs de Alto Impacto Executivo */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem', marginBottom: '1.5rem' }}>
        {/* KPI 1 */}
        <div className="glass-panel" style={{ padding: '1.5rem', borderTop: '4px solid var(--color-primary-mid)', background: '#fff' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>
              Total de Observações
            </span>
            <span style={{ fontSize: '1.3rem' }}>📊</span>
          </div>
          <div style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--color-primary-dark)', fontFamily: 'var(--font-header)' }}>
            {stats.total.toLocaleString('pt-BR')}
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: '0.3rem' }}>
            {stats.realizadas.toLocaleString('pt-BR')} realizadas ({stats.percRealizadas}%)
          </div>
        </div>

        {/* KPI 2 */}
        <div className="glass-panel" style={{ padding: '1.5rem', borderTop: '4px solid var(--color-accent-green)', background: '#fff' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--color-accent-green)', textTransform: 'uppercase' }}>
              Superação da Prática
            </span>
            <span style={{ fontSize: '1.3rem' }}>🌟</span>
          </div>
          <div style={{ fontSize: '2.5rem', fontWeight: 800, color: '#15803d', fontFamily: 'var(--font-header)' }}>
            {percSuperaPrat}%
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: '0.3rem' }}>
            <b>{stats.countPrat?.SUPERA?.toLocaleString('pt-BR')}</b> cursistas no nível máximo
          </div>
        </div>

        {/* KPI 3 */}
        <div className="glass-panel" style={{ padding: '1.5rem', borderTop: '4px solid var(--color-accent-blue)', background: '#fff' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--color-accent-blue)', textTransform: 'uppercase' }}>
              Atendimento Integral
            </span>
            <span style={{ fontSize: '1.3rem' }}>🎯</span>
          </div>
          <div style={{ fontSize: '2.5rem', fontWeight: 800, color: '#0369a1', fontFamily: 'var(--font-header)' }}>
            {percIntegralPrat}%
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: '0.3rem' }}>
            <b>{stats.countPrat?.['ATINGE INTEGRALMENTE']?.toLocaleString('pt-BR')}</b> atingem integralmente
          </div>
        </div>

        {/* KPI 4 */}
        <div className="glass-panel" style={{ padding: '1.5rem', borderTop: '4px solid #8b5cf6', background: '#fff' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#7c3aed', textTransform: 'uppercase' }}>
              Devolutivas Gravadas
            </span>
            <span style={{ fontSize: '1.3rem' }}>🗣️</span>
          </div>
          <div style={{ fontSize: '2.5rem', fontWeight: 800, color: '#6d28d9', fontFamily: 'var(--font-header)' }}>
            {stats.percDialogos}%
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: '0.3rem' }}>
            <b>{stats.dialogos.toLocaleString('pt-BR')}</b> diálogos formativos realizados
          </div>
        </div>
      </div>

      {/* Grid Principal: Gráficos de Níveis (Planejamento vs Prática) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
        
        {/* Gráfico 1: Níveis de Prática */}
        <div className="glass-panel" style={{ padding: '1.5rem', background: '#fff' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <h3 style={{ fontSize: '1.05rem', color: 'var(--color-primary-dark)', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span>🎯</span> Níveis de Desempenho na Prática Observada
            </h3>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text-muted)', backgroundColor: '#f1f5f9', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>
              Base: {stats.realizadas} Aulas
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {/* Supera */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: '0.3rem' }}>
                <span style={{ fontWeight: 700, color: '#7c3aed' }}>🌟 SUPERA ({percSuperaPrat}%)</span>
                <span style={{ fontWeight: 700 }}>{stats.countPrat?.SUPERA?.toLocaleString('pt-BR')}</span>
              </div>
              <div style={{ width: '100%', height: '14px', backgroundColor: '#f1f5f9', borderRadius: '8px', overflow: 'hidden' }}>
                <div style={{ width: `${percSuperaPrat}%`, height: '100%', background: 'linear-gradient(90deg, #7c3aed, #a855f7)', borderRadius: '8px', transition: 'width 0.5s ease' }} />
              </div>
            </div>

            {/* Atinge Integralmente */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: '0.3rem' }}>
                <span style={{ fontWeight: 700, color: '#0284c7' }}>✓ ATINGE INTEGRALMENTE ({percIntegralPrat}%)</span>
                <span style={{ fontWeight: 700 }}>{stats.countPrat?.['ATINGE INTEGRALMENTE']?.toLocaleString('pt-BR')}</span>
              </div>
              <div style={{ width: '100%', height: '14px', backgroundColor: '#f1f5f9', borderRadius: '8px', overflow: 'hidden' }}>
                <div style={{ width: `${percIntegralPrat}%`, height: '100%', background: 'linear-gradient(90deg, #0284c7, #38bdf8)', borderRadius: '8px', transition: 'width 0.5s ease' }} />
              </div>
            </div>

            {/* Atinge Parcialmente */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: '0.3rem' }}>
                <span style={{ fontWeight: 700, color: '#d97706' }}>⚠️ ATINGE PARCIALMENTE ({percParcialPrat}%)</span>
                <span style={{ fontWeight: 700 }}>{stats.countPrat?.['ATINGE PARCIALMENTE']?.toLocaleString('pt-BR')}</span>
              </div>
              <div style={{ width: '100%', height: '14px', backgroundColor: '#f1f5f9', borderRadius: '8px', overflow: 'hidden' }}>
                <div style={{ width: `${percParcialPrat}%`, height: '100%', background: 'linear-gradient(90deg, #f59e0b, #fbbf24)', borderRadius: '8px', transition: 'width 0.5s ease' }} />
              </div>
            </div>

            {/* Não Atinge */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: '0.3rem' }}>
                <span style={{ fontWeight: 700, color: '#dc2626' }}>✕ NÃO ATINGE ({percNaoAtingePrat}%)</span>
                <span style={{ fontWeight: 700 }}>{stats.countPrat?.['NÃO ATINGE']?.toLocaleString('pt-BR')}</span>
              </div>
              <div style={{ width: '100%', height: '14px', backgroundColor: '#f1f5f9', borderRadius: '8px', overflow: 'hidden' }}>
                <div style={{ width: `${percNaoAtingePrat}%`, height: '100%', background: 'linear-gradient(90deg, #dc2626, #f87171)', borderRadius: '8px', transition: 'width 0.5s ease' }} />
              </div>
            </div>
          </div>
        </div>

        {/* Gráfico 2: Níveis de Planejamento */}
        <div className="glass-panel" style={{ padding: '1.5rem', background: '#fff' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <h3 style={{ fontSize: '1.05rem', color: 'var(--color-primary-dark)', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span>📝</span> Níveis de Desempenho no Planejamento (PDP)
            </h3>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text-muted)', backgroundColor: '#f1f5f9', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>
              Base: {stats.realizadas} Planos
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {/* Supera */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: '0.3rem' }}>
                <span style={{ fontWeight: 700, color: '#7c3aed' }}>🌟 SUPERA ({percSuperaPlan}%)</span>
                <span style={{ fontWeight: 700 }}>{stats.countPlan?.SUPERA?.toLocaleString('pt-BR')}</span>
              </div>
              <div style={{ width: '100%', height: '14px', backgroundColor: '#f1f5f9', borderRadius: '8px', overflow: 'hidden' }}>
                <div style={{ width: `${percSuperaPlan}%`, height: '100%', background: 'linear-gradient(90deg, #7c3aed, #a855f7)', borderRadius: '8px', transition: 'width 0.5s ease' }} />
              </div>
            </div>

            {/* Atinge Integralmente */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: '0.3rem' }}>
                <span style={{ fontWeight: 700, color: '#0284c7' }}>✓ ATINGE INTEGRALMENTE ({percIntegralPlan}%)</span>
                <span style={{ fontWeight: 700 }}>{stats.countPlan?.['ATINGE INTEGRALMENTE']?.toLocaleString('pt-BR')}</span>
              </div>
              <div style={{ width: '100%', height: '14px', backgroundColor: '#f1f5f9', borderRadius: '8px', overflow: 'hidden' }}>
                <div style={{ width: `${percIntegralPlan}%`, height: '100%', background: 'linear-gradient(90deg, #0284c7, #38bdf8)', borderRadius: '8px', transition: 'width 0.5s ease' }} />
              </div>
            </div>

            {/* Atinge Parcialmente */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: '0.3rem' }}>
                <span style={{ fontWeight: 700, color: '#d97706' }}>⚠️ ATINGE PARCIALMENTE ({percParcialPlan}%)</span>
                <span style={{ fontWeight: 700 }}>{stats.countPlan?.['ATINGE PARCIALMENTE']?.toLocaleString('pt-BR')}</span>
              </div>
              <div style={{ width: '100%', height: '14px', backgroundColor: '#f1f5f9', borderRadius: '8px', overflow: 'hidden' }}>
                <div style={{ width: `${percParcialPlan}%`, height: '100%', background: 'linear-gradient(90deg, #f59e0b, #fbbf24)', borderRadius: '8px', transition: 'width 0.5s ease' }} />
              </div>
            </div>

            {/* Não Atinge */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: '0.3rem' }}>
                <span style={{ fontWeight: 700, color: '#dc2626' }}>✕ NÃO ATINGE ({percNaoAtingePlan}%)</span>
                <span style={{ fontWeight: 700 }}>{stats.countPlan?.['NÃO ATINGE']?.toLocaleString('pt-BR')}</span>
              </div>
              <div style={{ width: '100%', height: '14px', backgroundColor: '#f1f5f9', borderRadius: '8px', overflow: 'hidden' }}>
                <div style={{ width: `${percNaoAtingePlan}%`, height: '100%', background: 'linear-gradient(90deg, #dc2626, #f87171)', borderRadius: '8px', transition: 'width 0.5s ease' }} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Gráfico 3: Distribuição por Componentes Curriculares */}
      {stats.compDistribution.length > 0 && (
        <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '1.5rem', background: '#fff' }}>
          <h3 style={{ fontSize: '1.05rem', color: 'var(--color-primary-dark)', fontWeight: 800, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span>📚</span> Desempenho por Principais Componentes Curriculares
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
            {stats.compDistribution.map(comp => (
              <div key={comp.name} style={{ backgroundColor: '#f8fafc', padding: '0.9rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.3rem' }}>
                  <span style={{ color: 'var(--color-primary-dark)' }}>{comp.name}</span>
                  <span style={{ color: 'var(--color-accent-blue)' }}>{comp.percAtingimento}%</span>
                </div>
                <div style={{ width: '100%', height: '6px', backgroundColor: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
                  <div style={{ width: `${comp.percAtingimento}%`, height: '100%', backgroundColor: 'var(--color-accent-blue)', borderRadius: '3px' }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.35rem' }}>
                  <span>Total: <b>{comp.total}</b></span>
                  <span>Superam/Atingem: <b>{comp.superam}</b></span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tabela Agregada Executiva por Núcleo Regional de Educação (NRE) */}
      <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '1.5rem', background: '#fff' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <h3 style={{ fontSize: '1.1rem', color: 'var(--color-primary-dark)', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span>🏫</span> Indicadores Agregados por Núcleo Regional de Educação (NRE)
          </h3>
          <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
            Total de <b>{stats.nreDistribution.length}</b> NREs contemplados
          </span>
        </div>

        <div className="table-responsive">
          <table className="custom-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ minWidth: '180px' }}>Núcleo Regional (NRE)</th>
                <th style={{ textAlign: 'center' }}>Total Cursistas</th>
                <th style={{ textAlign: 'center' }}>Realizadas</th>
                <th style={{ textAlign: 'center', minWidth: '160px' }}>Taxa de Conclusão</th>
                <th style={{ textAlign: 'center' }}>Supera (🌟)</th>
                <th style={{ textAlign: 'center' }}>Atende (✓)</th>
                <th style={{ textAlign: 'center' }}>Índice de Atingimento</th>
              </tr>
            </thead>
            <tbody>
              {stats.nreDistribution.map(nre => (
                <tr key={nre.name} className="table-row-hover">
                  <td style={{ fontWeight: 700, color: 'var(--color-primary-dark)' }}>{nre.name}</td>
                  <td style={{ textAlign: 'center', fontWeight: 600 }}>{nre.total}</td>
                  <td style={{ textAlign: 'center', color: 'var(--color-accent-green)', fontWeight: 700 }}>{nre.realizadas}</td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <div style={{ flex: 1, height: '8px', backgroundColor: '#f1f5f9', borderRadius: '4px', overflow: 'hidden' }}>
                        <div style={{ width: `${nre.percRealizadas}%`, height: '100%', backgroundColor: 'var(--color-accent-green)', borderRadius: '4px' }} />
                      </div>
                      <span style={{ fontSize: '0.78rem', fontWeight: 700, minWidth: '35px' }}>{nre.percRealizadas}%</span>
                    </div>
                  </td>
                  <td style={{ textAlign: 'center', color: '#7c3aed', fontWeight: 700 }}>{nre.superaPrat}</td>
                  <td style={{ textAlign: 'center', color: '#0284c7', fontWeight: 700 }}>{nre.atendePrat}</td>
                  <td style={{ textAlign: 'center' }}>
                    <span className="status-pill status-active" style={{ fontSize: '0.75rem', fontWeight: 800 }}>
                      {nre.percExcelencia}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}