import React, { useState, useMemo } from 'react';

export default function Panorama({ data }) {
  // Estados para Filtros
  const [nreFilter, setNreFilter] = useState('');
  const [chamamentoFilter, setChamamentoFilter] = useState('');
  const [modalidadeFilter, setModalidadeFilter] = useState('');
  const [componenteFilter, setComponenteFilter] = useState('');
  const [turnoFilter, setTurnoFilter] = useState('');

  // Extrair opções únicas para os selects dos filtros (baseado em todos os dados originais)
  const filterOptions = useMemo(() => {
    const nres = new Set();
    const chamamentos = new Set();
    const modalidades = new Set();
    const componentes = new Set();
    const turnos = new Set();

    data.forEach(item => {
      if (item.nre_tutor) nres.add(item.nre_tutor);
      if (item.chamamento) chamamentos.add(item.chamamento);
      if (item.modalidade) modalidades.add(item.modalidade);
      if (item.componente) componentes.add(item.componente);
      if (item.turno) turnos.add(item.turno);
    });

    return {
      nres: Array.from(nres).sort(),
      chamamentos: Array.from(chamamentos).sort(),
      modalidades: Array.from(modalidades).sort(),
      componentes: Array.from(componentes).sort(),
      turnos: Array.from(turnos).sort()
    };
  }, [data]);

  // Filtrar dados reativamente
  const filteredData = useMemo(() => {
    return data.filter(item => {
      if (nreFilter && item.nre_tutor !== nreFilter) return false;
      if (chamamentoFilter && item.chamamento !== chamamentoFilter) return false;
      if (modalidadeFilter && item.modalidade !== modalidadeFilter) return false;
      if (componenteFilter && item.componente !== componenteFilter) return false;
      if (turnoFilter && item.turno !== turnoFilter) return false;
      return true;
    });
  }, [data, nreFilter, chamamentoFilter, modalidadeFilter, componenteFilter, turnoFilter]);

  // Cálculos de Métricas
  const metrics = useMemo(() => {
    const totalCursistas = filteredData.length;
    
    const uniqueFormadores = new Set();
    const uniqueTutores = new Set();
    
    filteredData.forEach(item => {
      if (item.cpf_formador || item.nome_formador) {
        uniqueFormadores.add(item.cpf_formador || item.nome_formador);
      }
      if (item.email_tutor || item.tutor_responsavel) {
        uniqueTutores.add(item.email_tutor || item.tutor_responsavel);
      }
    });

    return {
      cursistas: totalCursistas,
      formadores: uniqueFormadores.size,
      tutores: uniqueTutores.size
    };
  }, [filteredData]);

  // Dados para Gráfico 1: Cursistas por NRE (Top 8)
  const nreChartData = useMemo(() => {
    const counts = {};
    filteredData.forEach(item => {
      const nre = item.nre_tutor || 'Não Informado';
      counts[nre] = (counts[nre] || 0) + 1;
    });
    
    return Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
  }, [filteredData]);

  // Dados para Gráfico 2: Cursistas por Formador (Média de Alunos - Top 8 formadores por quantidade)
  const formadorChartData = useMemo(() => {
    const counts = {};
    filteredData.forEach(item => {
      const formador = item.nome_formador || 'Sem Formador';
      counts[formador] = (counts[formador] || 0) + 1;
    });

    return Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
  }, [filteredData]);

  // Limpar todos os filtros
  const clearFilters = () => {
    setNreFilter('');
    setChamamentoFilter('');
    setModalidadeFilter('');
    setComponenteFilter('');
    setTurnoFilter('');
  };

  // Helper para renderizar gráfico de barra SVG horizontal
  const renderHorizontalBarChart = (chartData, title) => {
    const width = 500;
    const height = 300;
    const paddingLeft = 140;
    const paddingRight = 40;
    const paddingTop = 20;
    const paddingBottom = 20;
    const chartWidth = width - paddingLeft - paddingRight;
    const chartHeight = height - paddingTop - paddingBottom;
    
    const maxVal = chartData.length > 0 ? Math.max(...chartData.map(d => d.count)) : 10;
    const rowHeight = chartHeight / Math.max(chartData.length, 1);

    return (
      <div className="chart-card">
        <h3 className="chart-title">{title}</h3>
        {chartData.length === 0 ? (
          <div style={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-muted)' }}>
            Nenhum dado encontrado para os filtros selecionados
          </div>
        ) : (
          <svg viewBox={`0 0 ${width} ${height}`} className="svg-chart">
            {/* Gridlines */}
            {[0, 0.25, 0.5, 0.75, 1].map((ratio, idx) => {
              const x = paddingLeft + ratio * chartWidth;
              const val = Math.round(ratio * maxVal);
              return (
                <g key={idx}>
                  <line 
                    x1={x} 
                    y1={paddingTop} 
                    x2={x} 
                    y2={height - paddingBottom} 
                    className="svg-grid-line" 
                  />
                  <text 
                    x={x} 
                    y={height - 5} 
                    textAnchor="middle" 
                    className="svg-text"
                  >
                    {val}
                  </text>
                </g>
              );
            })}

            {/* Bars */}
            {chartData.map((d, idx) => {
              const y = paddingTop + idx * rowHeight + (rowHeight * 0.15);
              const barHeight = rowHeight * 0.7;
              const barWidth = maxVal > 0 ? (d.count / maxVal) * chartWidth : 0;
              
              // Limita o nome para não estourar a caixa
              const displayName = d.name.length > 20 ? d.name.slice(0, 18) + '...' : d.name;

              return (
                <g key={idx} className="horizontal-bar-group">
                  {/* Label do Item */}
                  <text 
                    x={paddingLeft - 10} 
                    y={y + barHeight / 2 + 4} 
                    textAnchor="end" 
                    className="svg-text label"
                  >
                    {displayName}
                  </text>
                  
                  {/* Barra */}
                  <rect 
                    x={paddingLeft} 
                    y={y} 
                    width={Math.max(barWidth, 2)} 
                    height={barHeight} 
                    rx="4"
                    className="horizontal-bar"
                  />
                  
                  {/* Valor na ponta da barra */}
                  <text 
                    x={paddingLeft + barWidth + 8} 
                    y={y + barHeight / 2 + 4} 
                    textAnchor="start" 
                    className="svg-text" 
                    style={{ fontWeight: 600, fill: 'var(--color-primary-dark)' }}
                  >
                    {d.count}
                  </text>
                </g>
              );
            })}

            {/* Eixo Vertical */}
            <line 
              x1={paddingLeft} 
              y1={paddingTop} 
              x2={paddingLeft} 
              y2={height - paddingBottom} 
              className="svg-axis-line" 
            />
          </svg>
        )}
      </div>
    );
  };

  return (
    <>
      {/* Cards de Métricas Quantitativas */}
      <div className="kpi-grid">
        <div className="kpi-card cursistas animate-fade-in">
          <div className="kpi-info">
            <span className="kpi-label">Cursistas</span>
            <span className="kpi-value">{metrics.cursistas}</span>
          </div>
          <div className="kpi-icon-container">
            <i className="lucide-users"></i>
          </div>
        </div>
        <div className="kpi-card formadores animate-fade-in">
          <div className="kpi-info">
            <span className="kpi-label">Formadores</span>
            <span className="kpi-value">{metrics.formadores}</span>
          </div>
          <div className="kpi-icon-container">
            <i className="lucide-graduation-cap"></i>
          </div>
        </div>
        <div className="kpi-card tutores animate-fade-in">
          <div className="kpi-info">
            <span className="kpi-label">Tutores</span>
            <span className="kpi-value">{metrics.tutores}</span>
          </div>
          <div className="kpi-icon-container">
            <i className="lucide-user-check"></i>
          </div>
        </div>
      </div>

      {/* Painel de Filtros */}
      <div className="glass-panel">
        <div className="panel-header">
          <h2 className="panel-title">
            <i className="lucide-sliders-horizontal"></i> Filtros Panorama do Programa
          </h2>
          {(nreFilter || chamamentoFilter || modalidadeFilter || componenteFilter || turnoFilter) && (
            <button className="btn-secondary" onClick={clearFilters} style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}>
              Limpar Filtros
            </button>
          )}
        </div>
        <div className="filter-grid">
          <div className="filter-group">
            <span className="filter-label">NRE Cursista</span>
            <select className="filter-select" value={nreFilter} onChange={e => setNreFilter(e.target.value)}>
              <option value="">Todos</option>
              {filterOptions.nres.map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>
          </div>
          <div className="filter-group">
            <span className="filter-label">Chamamento</span>
            <select className="filter-select" value={chamamentoFilter} onChange={e => setChamamentoFilter(e.target.value)}>
              <option value="">Todos</option>
              {filterOptions.chamamentos.map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>
          </div>
          <div className="filter-group">
            <span className="filter-label">Modalidade</span>
            <select className="filter-select" value={modalidadeFilter} onChange={e => setModalidadeFilter(e.target.value)}>
              <option value="">Todas</option>
              {filterOptions.modalidades.map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>
          </div>
          <div className="filter-group">
            <span className="filter-label">Componente</span>
            <select className="filter-select" value={componenteFilter} onChange={e => setComponenteFilter(e.target.value)}>
              <option value="">Todos</option>
              {filterOptions.componentes.map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>
          </div>
          <div className="filter-group">
            <span className="filter-label">Turno</span>
            <select className="filter-select" value={turnoFilter} onChange={e => setTurnoFilter(e.target.value)}>
              <option value="">Todos</option>
              {filterOptions.turnos.map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>
          </div>
        </div>

        {/* Seção de Gráficos */}
        <div className="chart-container-grid">
          {renderHorizontalBarChart(nreChartData, "Cursistas por NRE (Top 8)")}
          {renderHorizontalBarChart(formadorChartData, "Cursistas por Formador (Média de Alunos - Top 8)")}
        </div>
      </div>
    </>
  );
}
