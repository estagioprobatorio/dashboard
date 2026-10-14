import React, { useState, useMemo } from 'react';
import { exportToCSV, printReportPDF } from '../utils/exportUtils';

export default function PanoramaDetalheModal({ tipo, titulo, filteredData = [], activeFilters = {}, onClose }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState('count');
  const [sortOrder, setSortOrder] = useState('desc'); // 'asc' | 'desc'

  const totalCursistasGeral = filteredData.length;

  // Processamento e Agregação de Dados baseado no tipo
  const aggregatedData = useMemo(() => {
    if (!filteredData || filteredData.length === 0) return [];

    if (tipo === 'formador') {
      const map = new Map();
      filteredData.forEach(item => {
        const key = (item.nome_formador || 'Sem Formador Atribuído').trim();
        if (!map.has(key)) {
          map.set(key, {
            nome: key,
            email: item.email_formador || item['e-mail_formador'] || '',
            nres: new Set(),
            componentes: new Set(),
            turmas: new Set(),
            count: 0
          });
        }
        const ref = map.get(key);
        ref.count += 1;
        if (item.nre_tutor) ref.nres.add(item.nre_tutor.trim());
        if (item.componente) ref.componentes.add(item.componente.trim());
        if (item.turmas || item.turma) ref.turmas.add((item.turmas || item.turma).trim());
        if (!ref.email && (item.email_formador || item['e-mail_formador'])) {
          ref.email = item.email_formador || item['e-mail_formador'];
        }
      });

      return Array.from(map.values()).map(item => ({
        nome: item.nome,
        email: item.email,
        detalheSecundario: Array.from(item.componentes).slice(0, 3).join(', ') || 'Geral',
        nre: Array.from(item.nres).join(', ') || 'NRE Não Informado',
        turmasCount: item.turmas.size,
        count: item.count,
        percent: totalCursistasGeral > 0 ? ((item.count / totalCursistasGeral) * 100) : 0
      }));
    }

    if (tipo === 'nre') {
      const map = new Map();
      filteredData.forEach(item => {
        const key = (item.nre_tutor || 'Não Informado').trim();
        if (!map.has(key)) {
          map.set(key, {
            nome: key,
            formadores: new Set(),
            turmas: new Set(),
            municipios: new Set(),
            count: 0
          });
        }
        const ref = map.get(key);
        ref.count += 1;
        if (item.nome_formador) ref.formadores.add(item.nome_formador.trim());
        if (item.turmas || item.turma) ref.turmas.add((item.turmas || item.turma).trim());
        if (item.munic_exe) ref.municipios.add(item.munic_exe.trim());
      });

      return Array.from(map.values()).map(item => ({
        nome: item.nome,
        formadoresCount: item.formadores.size,
        turmasCount: item.turmas.size,
        municipiosCount: item.municipios.size,
        count: item.count,
        percent: totalCursistasGeral > 0 ? ((item.count / totalCursistasGeral) * 100) : 0
      }));
    }

    if (tipo === 'chamamento') {
      const map = new Map();
      filteredData.forEach(item => {
        const key = (item.chamamento || 'Não Informado').trim();
        if (!map.has(key)) {
          map.set(key, {
            nome: key,
            docentes: 0,
            gestores: 0,
            count: 0
          });
        }
        const ref = map.get(key);
        ref.count += 1;
        const mod = (item.modalidade || '').toLowerCase();
        if (mod.includes('gestor') || mod.includes('pedagog')) {
          ref.gestores += 1;
        } else {
          ref.docentes += 1;
        }
      });

      return Array.from(map.values()).map(item => ({
        nome: item.nome,
        docentes: item.docentes,
        gestores: item.gestores,
        count: item.count,
        percent: totalCursistasGeral > 0 ? ((item.count / totalCursistasGeral) * 100) : 0
      }));
    }

    if (tipo === 'turno') {
      const map = new Map();
      filteredData.forEach(item => {
        let val = (item.turno || 'Não Informado').trim().toUpperCase();
        if (val.startsWith('MANH')) val = 'MANHÃ';
        else if (val.startsWith('TARD')) val = 'TARDE';
        else if (val.startsWith('NOIT')) val = 'NOITE';

        if (!map.has(val)) {
          map.set(val, {
            nome: val,
            turmas: new Set(),
            count: 0
          });
        }
        const ref = map.get(val);
        ref.count += 1;
        if (item.turmas || item.turma) ref.turmas.add((item.turmas || item.turma).trim());
      });

      return Array.from(map.values()).map(item => ({
        nome: item.nome,
        turmasCount: item.turmas.size,
        count: item.count,
        percent: totalCursistasGeral > 0 ? ((item.count / totalCursistasGeral) * 100) : 0
      }));
    }

    if (tipo === 'modalidade') {
      const map = new Map();
      filteredData.forEach(item => {
        const key = (item.modalidade || 'Não Informada').trim();
        if (!map.has(key)) {
          map.set(key, {
            nome: key,
            componentes: new Set(),
            count: 0
          });
        }
        const ref = map.get(key);
        ref.count += 1;
        if (item.componente) ref.componentes.add(item.componente.trim());
      });

      return Array.from(map.values()).map(item => ({
        nome: item.nome,
        componentesCount: item.componentes.size,
        count: item.count,
        percent: totalCursistasGeral > 0 ? ((item.count / totalCursistasGeral) * 100) : 0
      }));
    }

    return [];
  }, [tipo, filteredData, totalCursistasGeral]);

  // Filtragem pela busca textual
  const filteredList = useMemo(() => {
    if (!searchTerm) return aggregatedData;
    const q = searchTerm.trim().toLowerCase();
    return aggregatedData.filter(item => {
      const mNome = (item.nome || '').toLowerCase().includes(q);
      const mEmail = (item.email || '').toLowerCase().includes(q);
      const mNre = (item.nre || '').toLowerCase().includes(q);
      const mDet = (item.detalheSecundario || '').toLowerCase().includes(q);
      return mNome || mEmail || mNre || mDet;
    });
  }, [aggregatedData, searchTerm]);

  // Ordenação
  const sortedList = useMemo(() => {
    const list = [...filteredList];
    list.sort((a, b) => {
      let valA = a[sortField];
      let valB = b[sortField];

      if (typeof valA === 'string') {
        const comp = valA.localeCompare(valB, 'pt-BR', { sensitivity: 'base' });
        return sortOrder === 'asc' ? comp : -comp;
      }

      valA = Number(valA) || 0;
      valB = Number(valB) || 0;
      return sortOrder === 'asc' ? valA - valB : valB - valA;
    });
    return list;
  }, [filteredList, sortField, sortOrder]);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder(field === 'nome' ? 'asc' : 'desc');
    }
  };

  // Definição de Colunas para Exibição, CSV e PDF
  const reportColumns = useMemo(() => {
    if (tipo === 'formador') {
      return [
        { label: '#', accessor: (r, idx) => idx + 1, align: 'center', width: '50px' },
        { label: 'Formador(a)', accessor: r => r.nome, sortable: true, field: 'nome' },
        { label: 'NRE', accessor: r => r.nre, sortable: true, field: 'nre' },
        { label: 'Componente(s)', accessor: r => r.detalheSecundario },
        { label: 'Turmas', accessor: r => r.turmasCount, align: 'center', sortable: true, field: 'turmasCount' },
        { label: 'Cursistas', accessor: r => r.count, align: 'right', sortable: true, field: 'count' },
        { label: '% Total', accessor: r => `${r.percent.toFixed(1)}%`, align: 'right', sortable: true, field: 'percent' }
      ];
    }

    if (tipo === 'nre') {
      return [
        { label: '#', accessor: (r, idx) => idx + 1, align: 'center', width: '50px' },
        { label: 'NRE (Núcleo Regional)', accessor: r => r.nome, sortable: true, field: 'nome' },
        { label: 'Formadores Atuantes', accessor: r => r.formadoresCount, align: 'center', sortable: true, field: 'formadoresCount' },
        { label: 'Turmas', accessor: r => r.turmasCount, align: 'center', sortable: true, field: 'turmasCount' },
        { label: 'Municípios', accessor: r => r.municipiosCount, align: 'center', sortable: true, field: 'municipiosCount' },
        { label: 'Cursistas', accessor: r => r.count, align: 'right', sortable: true, field: 'count' },
        { label: '% Total', accessor: r => `${r.percent.toFixed(1)}%`, align: 'right', sortable: true, field: 'percent' }
      ];
    }

    if (tipo === 'chamamento') {
      return [
        { label: '#', accessor: (r, idx) => idx + 1, align: 'center', width: '50px' },
        { label: 'Chamamento', accessor: r => r.nome, sortable: true, field: 'nome' },
        { label: 'Docentes', accessor: r => r.docentes, align: 'right', sortable: true, field: 'docentes' },
        { label: 'Equipe Gestora', accessor: r => r.gestores, align: 'right', sortable: true, field: 'gestores' },
        { label: 'Total Cursistas', accessor: r => r.count, align: 'right', sortable: true, field: 'count' },
        { label: '% Total', accessor: r => `${r.percent.toFixed(1)}%`, align: 'right', sortable: true, field: 'percent' }
      ];
    }

    if (tipo === 'turno') {
      return [
        { label: '#', accessor: (r, idx) => idx + 1, align: 'center', width: '50px' },
        { label: 'Turno', accessor: r => r.nome, sortable: true, field: 'nome' },
        { label: 'Qtd. Turmas', accessor: r => r.turmasCount, align: 'center', sortable: true, field: 'turmasCount' },
        { label: 'Total Cursistas', accessor: r => r.count, align: 'right', sortable: true, field: 'count' },
        { label: '% Total', accessor: r => `${r.percent.toFixed(1)}%`, align: 'right', sortable: true, field: 'percent' }
      ];
    }

    // Modalidade
    return [
      { label: '#', accessor: (r, idx) => idx + 1, align: 'center', width: '50px' },
      { label: 'Modalidade', accessor: r => r.nome, sortable: true, field: 'nome' },
      { label: 'Componentes Distintos', accessor: r => r.componentesCount, align: 'center', sortable: true, field: 'componentesCount' },
      { label: 'Total Cursistas', accessor: r => r.count, align: 'right', sortable: true, field: 'count' },
      { label: '% Total', accessor: r => `${r.percent.toFixed(1)}%`, align: 'right', sortable: true, field: 'percent' }
    ];
  }, [tipo]);

  // Exportação CSV
  const handleExportCSV = () => {
    const filename = `relatorio_panorama_${tipo}`;
    exportToCSV(filename, reportColumns, sortedList);
  };

  // Impressão PDF
  const handlePrintPDF = () => {
    const activeFiltersList = [];
    if (activeFilters.nre) activeFiltersList.push(`NRE: ${activeFilters.nre}`);
    if (activeFilters.chamamento) activeFiltersList.push(`Chamamento: ${activeFilters.chamamento}`);
    if (activeFilters.modalidade) activeFiltersList.push(`Modalidade: ${activeFilters.modalidade}`);
    if (activeFilters.componente) activeFiltersList.push(`Componente: ${activeFilters.componente}`);
    if (activeFilters.turno) activeFiltersList.push(`Turno: ${activeFilters.turno}`);

    const filterSummary = activeFiltersList.length > 0 
      ? `Filtros Aplicados: ${activeFiltersList.join(' | ')} • Total de Cursistas Filtrados: ${totalCursistasGeral}`
      : `Base Completa do Programa • Total de Cursistas: ${totalCursistasGeral}`;

    printReportPDF({
      title: `${titulo} • SEED-PR`,
      subtitle: `Relatório Consolidado de Distribuição • Estágio Probatório`,
      columns: reportColumns,
      data: sortedList,
      filterSummary
    });
  };

  // Máximo valor para cálculo de barra visual
  const maxVal = useMemo(() => {
    return Math.max(...sortedList.map(item => item.count), 1);
  }, [sortedList]);

  // Cálculos do resumo superior
  const totalItens = aggregatedData.length;
  const mediaPorEntidade = totalItens > 0 ? (totalCursistasGeral / totalItens).toFixed(1) : 0;

  return (
    <div 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 29, 61, 0.75)',
        backdropFilter: 'blur(5px)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 9999,
        padding: '1.25rem'
      }} 
      onClick={onClose}
    >
      <div 
        className="animate-fade-in" 
        onClick={e => e.stopPropagation()}
        style={{
          background: '#ffffff',
          borderRadius: '16px',
          width: '98%',
          maxWidth: '1240px',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.4)',
          overflow: 'hidden'
        }}
      >
        {/* Cabeçalho do Modal */}
        <div style={{
          background: 'linear-gradient(135deg, var(--color-primary-dark, #002d5c) 0%, #0c4a6e 100%)',
          color: '#ffffff',
          padding: '1.2rem 1.75rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <span style={{ fontSize: '1.4rem' }}>📊</span>
              <div>
                <span style={{ fontSize: '0.72rem', backgroundColor: 'rgba(255, 255, 255, 0.2)', padding: '0.15rem 0.55rem', borderRadius: '4px', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>
                  Visão Analítica Completa (Sem Limite de Top 8)
                </span>
                <h2 style={{ margin: '0.25rem 0 0 0', fontSize: '1.25rem', fontWeight: 800, color: '#ffffff' }}>
                  {titulo}
                </h2>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <button
              type="button"
              onClick={handleExportCSV}
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.15)',
                color: '#ffffff',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                padding: '0.5rem 0.95rem',
                borderRadius: '8px',
                fontSize: '0.82rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.25)'}
              onMouseLeave={e => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.15)'}
              title="Baixar planilha compatível com Excel e Google Sheets"
            >
              <span>📥</span> Exportar CSV
            </button>

            <button
              type="button"
              onClick={handlePrintPDF}
              style={{
                backgroundColor: '#00984a',
                color: '#ffffff',
                border: 'none',
                padding: '0.5rem 1.1rem',
                borderRadius: '8px',
                fontSize: '0.82rem',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.45rem',
                boxShadow: '0 2px 8px rgba(0, 152, 74, 0.35)',
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={e => e.currentTarget.style.backgroundColor = '#15803d'}
              onMouseLeave={e => e.currentTarget.style.backgroundColor = '#00984a'}
              title="Abrir tela de impressão oficial em PDF (SEED-PR)"
            >
              <span>🖨️</span> Imprimir Relatório PDF
            </button>

            <button
              type="button"
              onClick={onClose}
              style={{
                background: 'rgba(255, 255, 255, 0.15)',
                border: 'none',
                color: 'white',
                borderRadius: '50%',
                width: '34px',
                height: '34px',
                fontSize: '1.1rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.15s ease',
                marginLeft: '0.5rem'
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.8)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)'}
              title="Fechar"
              aria-label="Fechar modal"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Barra de KPIs Resumo + Busca Rápida */}
        <div style={{
          backgroundColor: '#f8fafc',
          borderBottom: '1px solid #e2e8f0',
          padding: '1rem 1.75rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem'
        }}>
          {/* Métricas Rápidas */}
          <div style={{ display: 'flex', gap: '1.25rem', flexWrap: 'wrap' }}>
            <div style={{ backgroundColor: '#ffffff', padding: '0.45rem 0.9rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <span style={{ fontSize: '0.72rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 700, display: 'block' }}>Total de Cursistas</span>
              <strong style={{ fontSize: '1.1rem', color: '#002d5c' }}>{totalCursistasGeral.toLocaleString('pt-BR')}</strong>
            </div>

            <div style={{ backgroundColor: '#ffffff', padding: '0.45rem 0.9rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <span style={{ fontSize: '0.72rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 700, display: 'block' }}>Total de Registros</span>
              <strong style={{ fontSize: '1.1rem', color: '#0369a1' }}>{totalItens} {tipo === 'formador' ? 'formadores' : tipo === 'nre' ? 'NREs' : 'categorias'}</strong>
            </div>

            <div style={{ backgroundColor: '#ffffff', padding: '0.45rem 0.9rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <span style={{ fontSize: '0.72rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 700, display: 'block' }}>Média de Cursistas</span>
              <strong style={{ fontSize: '1.1rem', color: '#15803d' }}>{mediaPorEntidade} / {tipo === 'formador' ? 'formador' : tipo === 'nre' ? 'NRE' : 'categoria'}</strong>
            </div>
          </div>

          {/* Campo de Busca Rápida */}
          <div style={{ position: 'relative', width: '100%', maxWidth: '320px' }}>
            <span style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: '0.9rem' }}>🔍</span>
            <input
              type="text"
              placeholder={`Filtrar por nome, NRE...`}
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                padding: '0.55rem 0.8rem 0.55rem 2.2rem',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '0.85rem',
                outline: 'none',
                backgroundColor: '#ffffff'
              }}
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                style={{
                  position: 'absolute',
                  right: '0.6rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#94a3b8',
                  fontWeight: 700
                }}
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Corpo com Tabela Estilizada */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '1.25rem 1.75rem' }}>
          {sortedList.length === 0 ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
              <span style={{ fontSize: '2.5rem', display: 'block', marginBottom: '0.5rem' }}>🔎</span>
              <p style={{ margin: 0, fontWeight: 600 }}>Nenhum registro encontrado com o termo "{searchTerm}".</p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto', borderRadius: '10px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.84rem' }}>
                <thead>
                  <tr style={{ backgroundColor: '#002d5c', color: '#ffffff' }}>
                    {reportColumns.map((col, idx) => {
                      const isSorted = sortField === col.field;
                      return (
                        <th
                          key={idx}
                          onClick={() => col.sortable && col.field && handleSort(col.field)}
                          style={{
                            padding: '0.75rem 0.9rem',
                            fontWeight: 700,
                            fontSize: '0.75rem',
                            textTransform: 'uppercase',
                            letterSpacing: '0.04em',
                            cursor: col.sortable ? 'pointer' : 'default',
                            userSelect: 'none',
                            textAlign: col.align || 'left',
                            whiteSpace: 'nowrap',
                            width: col.width || 'auto'
                          }}
                        >
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                            <span>{col.label}</span>
                            {col.sortable && (
                              <span style={{ fontSize: '0.7rem', opacity: isSorted ? 1 : 0.4 }}>
                                {isSorted ? (sortOrder === 'asc' ? '▲' : '▼') : '⇅'}
                              </span>
                            )}
                          </div>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {sortedList.map((row, idx) => {
                    const barWidthPercent = maxVal > 0 ? (row.count / maxVal) * 100 : 0;
                    const isEven = idx % 2 === 0;

                    return (
                      <tr 
                        key={idx}
                        style={{
                          backgroundColor: isEven ? '#ffffff' : '#f8fafc',
                          borderBottom: '1px solid #e2e8f0',
                          transition: 'background-color 0.15s ease'
                        }}
                        onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f1f5f9'}
                        onMouseLeave={e => e.currentTarget.style.backgroundColor = isEven ? '#ffffff' : '#f8fafc'}
                      >
                        {/* Posição */}
                        <td style={{ padding: '0.65rem 0.9rem', textAlign: 'center', fontWeight: 700, color: '#64748b' }}>
                          #{idx + 1}
                        </td>

                        {/* Nome Principal */}
                        <td style={{ padding: '0.65rem 0.9rem' }}>
                          <strong style={{ color: '#0f172a', display: 'block', fontSize: '0.86rem' }}>
                            {row.nome}
                          </strong>
                          {row.email && (
                            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                              ✉️ {row.email}
                            </span>
                          )}
                        </td>

                        {/* Colunas específicas por tipo */}
                        {tipo === 'formador' && (
                          <>
                            <td style={{ padding: '0.65rem 0.9rem', color: '#334155' }}>
                              {row.nre}
                            </td>
                            <td style={{ padding: '0.65rem 0.9rem', color: '#334155' }}>
                              {row.detalheSecundario}
                            </td>
                            <td style={{ padding: '0.65rem 0.9rem', textAlign: 'center', fontWeight: 600, color: '#0369a1' }}>
                              {row.turmasCount}
                            </td>
                          </>
                        )}

                        {tipo === 'nre' && (
                          <>
                            <td style={{ padding: '0.65rem 0.9rem', textAlign: 'center', fontWeight: 600, color: '#0369a1' }}>
                              {row.formadoresCount}
                            </td>
                            <td style={{ padding: '0.65rem 0.9rem', textAlign: 'center', fontWeight: 600, color: '#475569' }}>
                              {row.turmasCount}
                            </td>
                            <td style={{ padding: '0.65rem 0.9rem', textAlign: 'center', color: '#475569' }}>
                              {row.municipiosCount}
                            </td>
                          </>
                        )}

                        {tipo === 'chamamento' && (
                          <>
                            <td style={{ padding: '0.65rem 0.9rem', textAlign: 'right', fontWeight: 600, color: '#0369a1' }}>
                              {row.docentes}
                            </td>
                            <td style={{ padding: '0.65rem 0.9rem', textAlign: 'right', fontWeight: 600, color: '#15803d' }}>
                              {row.gestores}
                            </td>
                          </>
                        )}

                        {tipo === 'turno' && (
                          <td style={{ padding: '0.65rem 0.9rem', textAlign: 'center', fontWeight: 600, color: '#0369a1' }}>
                            {row.turmasCount}
                          </td>
                        )}

                        {tipo === 'modalidade' && (
                          <td style={{ padding: '0.65rem 0.9rem', textAlign: 'center', fontWeight: 600, color: '#0369a1' }}>
                            {row.componentesCount}
                          </td>
                        )}

                        {/* Quantidade de Cursistas com Barra Visual */}
                        <td style={{ padding: '0.65rem 0.9rem', textAlign: 'right', minWidth: '160px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.75rem' }}>
                            <div style={{ flex: 1, height: '8px', backgroundColor: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                              <div 
                                style={{ 
                                  height: '100%', 
                                  width: `${barWidthPercent}%`, 
                                  backgroundColor: 'var(--color-accent-blue, #0072bc)',
                                  borderRadius: '4px' 
                                }} 
                              />
                            </div>
                            <span style={{ fontWeight: 800, color: '#002d5c', minWidth: '40px', fontSize: '0.9rem' }}>
                              {row.count}
                            </span>
                          </div>
                        </td>

                        {/* Percentual */}
                        <td style={{ padding: '0.65rem 0.9rem', textAlign: 'right', fontWeight: 700, color: '#0369a1', minWidth: '70px' }}>
                          {row.percent.toFixed(1)}%
                        </td>
                      </tr>
                    );
                  })}
                </tbody>

                {/* Linha de Totais no Rodapé */}
                <tfoot>
                  <tr style={{ backgroundColor: '#f1f5f9', borderTop: '2px solid #002d5c', fontWeight: 800 }}>
                    <td colSpan={reportColumns.length - 2} style={{ padding: '0.8rem 1rem', color: '#002d5c' }}>
                      TOTAL CONSOLIDADO ({sortedList.length} itens listados):
                    </td>
                    <td style={{ padding: '0.8rem 0.9rem', textAlign: 'right', color: '#002d5c', fontSize: '0.95rem' }}>
                      {sortedList.reduce((acc, curr) => acc + curr.count, 0).toLocaleString('pt-BR')}
                    </td>
                    <td style={{ padding: '0.8rem 0.9rem', textAlign: 'right', color: '#002d5c', fontSize: '0.95rem' }}>
                      {sortedList.reduce((acc, curr) => acc + curr.percent, 0).toFixed(1)}%
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>

        {/* Rodapé do Modal */}
        <div style={{
          backgroundColor: '#ffffff',
          borderTop: '1px solid #e2e8f0',
          padding: '0.9rem 1.75rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '0.5rem'
        }}>
          <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
            💡 Dica: Você pode ordenar clicando no cabeçalho de qualquer coluna e imprimir o relatório pronto em formato A4 Paisagem.
          </span>
          <button
            type="button"
            className="btn-primary"
            onClick={onClose}
            style={{ fontSize: '0.85rem', padding: '0.45rem 1.4rem' }}
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
