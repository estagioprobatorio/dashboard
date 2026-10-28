import React, { useState, useMemo } from 'react';
import { exportToCSV } from '../utils/exportUtils';

export default function Exonerados({ exonerados = [], userRole = null }) {
  const isAdmin = userRole === 'admin';
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedNre, setSelectedNre] = useState('');
  const [selectedComponente, setSelectedComponente] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(15);

  // Normalizador de texto para busca flexível
  const normalize = (str) => {
    if (!str) return '';
    return String(str).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
  };

  // Listas para filtros dinâmicos
  const nresUnicos = useMemo(() => {
    const set = new Set();
    exonerados.forEach(e => {
      const n = (e.nre || e.nre_exe || '').trim();
      if (n) set.add(n);
    });
    return Array.from(set).sort();
  }, [exonerados]);

  const componentesUnicos = useMemo(() => {
    const set = new Set();
    exonerados.forEach(e => {
      const c = (e.componente || '').trim();
      if (c) set.add(c);
    });
    return Array.from(set).sort();
  }, [exonerados]);

  // Filtro dos registros
  const exoneradosFiltrados = useMemo(() => {
    const term = normalize(searchTerm);

    return exonerados.filter(item => {
      if (selectedNre) {
        const itemNre = (item.nre || item.nre_exe || '').trim();
        if (itemNre !== selectedNre) return false;
      }

      if (selectedComponente) {
        const itemComp = (item.componente || '').trim();
        if (itemComp !== selectedComponente) return false;
      }

      if (!term) return true;

      const nome = normalize(item.nome_cursista || item.nome || '');
      const cpf = String(item.cpf || '').replace(/\D/g, '');
      const cgm = String(item.cgm || '').replace(/\D/g, '');
      const portaria = normalize(item.portaria || '');
      const motivo = normalize(item.motivo || '');
      const escola = normalize(item.escola || '');

      return (
        nome.includes(term) ||
        cpf.includes(term) ||
        cgm.includes(term) ||
        portaria.includes(term) ||
        motivo.includes(term) ||
        escola.includes(term)
      );
    });
  }, [exonerados, searchTerm, selectedNre, selectedComponente]);

  // Paginação
  const totalPages = Math.ceil(exoneradosFiltrados.length / itemsPerPage) || 1;
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return exoneradosFiltrados.slice(start, start + itemsPerPage);
  }, [exoneradosFiltrados, currentPage, itemsPerPage]);

  const handleExportCSV = () => {
    const dataToExport = exoneradosFiltrados.map(e => ({
      Nome: e.nome_cursista || e.nome || '',
      CGM: e.cgm || '',
      CPF: e.cpf || '',
      RG: e.rg || '',
      'E-mail': e.email || '',
      Portaria: e.portaria || '',
      'Data Exoneração': e.data_exoneracao || '',
      Motivo: e.motivo || '',
      NRE: e.nre || '',
      Município: e.municipio || '',
      Escola: e.escola || '',
      Componente: e.componente || '',
      Observações: e.observacoes || ''
    }));
    exportToCSV(dataToExport, `relatorio_exonerados_${new Date().toISOString().split('T')[0]}.csv`);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', animation: 'fadeIn 0.3s ease-in-out' }}>
      
      {/* CABEÇALHO */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.4rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#dc2626', backgroundColor: '#fee2e2', padding: '0.2rem 0.6rem', borderRadius: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              SEED/PR · Estágio Probatório
            </span>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', backgroundColor: '#f1f5f9', padding: '0.2rem 0.6rem', borderRadius: '4px' }}>
              Aba: EXONERADOS
            </span>
          </div>
          <h2 style={{ fontSize: '1.5rem', color: '#002d5c', margin: 0, fontWeight: 800 }}>
            🚪 Servidores Exonerados / Desligados
          </h2>
          <p style={{ margin: '0.3rem 0 0 0', fontSize: '0.9rem', color: '#475569', lineHeight: 1.5 }}>
            Registro oficial dos servidores que foram exonerados ou desligados do Programa de Acompanhamento do Estágio Probatório.
          </p>
        </div>

        <button
          onClick={handleExportCSV}
          disabled={exoneradosFiltrados.length === 0}
          style={{
            backgroundColor: '#002d5c',
            color: '#ffffff',
            border: 'none',
            borderRadius: '8px',
            padding: '0.65rem 1.1rem',
            fontSize: '0.85rem',
            fontWeight: 700,
            cursor: exoneradosFiltrados.length === 0 ? 'not-allowed' : 'pointer',
            opacity: exoneradosFiltrados.length === 0 ? 0.6 : 1,
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            boxShadow: '0 2px 6px rgba(0, 45, 92, 0.15)'
          }}
        >
          <span>📥</span>
          <span>Exportar Planilha (CSV)</span>
        </button>
      </div>

      {/* CARDS DE RESUMO */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
        <div style={{ padding: '1.2rem', borderRadius: '12px', backgroundColor: '#ffffff', border: '1px solid #fee2e2', borderLeft: '4px solid #ef4444', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#dc2626', textTransform: 'uppercase' }}>
            Total de Exonerados
          </span>
          <div style={{ fontSize: '1.9rem', fontWeight: 800, color: '#b91c1c', margin: '0.25rem 0' }}>
            {exonerados.length.toLocaleString('pt-BR')}
          </div>
          <span style={{ fontSize: '0.76rem', color: '#64748b' }}>
            Registros cadastrados na base master
          </span>
        </div>

        <div style={{ padding: '1.2rem', borderRadius: '12px', backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderLeft: '4px solid #0072bc', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#0072bc', textTransform: 'uppercase' }}>
            Registros Filtrados
          </span>
          <div style={{ fontSize: '1.9rem', fontWeight: 800, color: '#002d5c', margin: '0.25rem 0' }}>
            {exoneradosFiltrados.length.toLocaleString('pt-BR')}
          </div>
          <span style={{ fontSize: '0.76rem', color: '#64748b' }}>
            Resultado dos filtros ativos
          </span>
        </div>

        <div style={{ padding: '1.2rem', borderRadius: '12px', backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderLeft: '4px solid #10b981', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#059669', textTransform: 'uppercase' }}>
            NREs com Ocorrências
          </span>
          <div style={{ fontSize: '1.9rem', fontWeight: 800, color: '#047857', margin: '0.25rem 0' }}>
            {nresUnicos.length}
          </div>
          <span style={{ fontSize: '0.76rem', color: '#64748b' }}>
            Núcleos Regionais de Educação
          </span>
        </div>
      </div>

      {/* FILTROS E BUSCA */}
      <div style={{ backgroundColor: '#ffffff', padding: '1.2rem 1.4rem', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          
          {/* Campo de Busca Livre */}
          <div style={{ flex: '1 1 300px', position: 'relative' }}>
            <span style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}>🔍</span>
            <input
              type="text"
              placeholder="Buscar por nome, CPF, CGM, portaria ou escola..."
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              style={{
                width: '100%',
                padding: '0.65rem 0.85rem 0.65rem 2.4rem',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '0.88rem',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
          </div>

          {/* Filtro por NRE */}
          {nresUnicos.length > 0 && (
            <select
              value={selectedNre}
              onChange={(e) => { setSelectedNre(e.target.value); setCurrentPage(1); }}
              style={{ padding: '0.65rem 0.9rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', backgroundColor: '#ffffff', outline: 'none' }}
            >
              <option value="">Todos os NREs ({nresUnicos.length})</option>
              {nresUnicos.map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          )}

          {/* Filtro por Componente */}
          {componentesUnicos.length > 0 && (
            <select
              value={selectedComponente}
              onChange={(e) => { setSelectedComponente(e.target.value); setCurrentPage(1); }}
              style={{ padding: '0.65rem 0.9rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', backgroundColor: '#ffffff', outline: 'none' }}
            >
              <option value="">Todos os Componentes ({componentesUnicos.length})</option>
              {componentesUnicos.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          )}

          {(searchTerm || selectedNre || selectedComponente) && (
            <button
              onClick={() => { setSearchTerm(''); setSelectedNre(''); setSelectedComponente(''); setCurrentPage(1); }}
              style={{ padding: '0.65rem 0.9rem', borderRadius: '8px', border: '1px solid #e2e8f0', backgroundColor: '#f8fafc', fontSize: '0.82rem', fontWeight: 700, color: '#64748b', cursor: 'pointer' }}
            >
              ✕ Limpar Filtros
            </button>
          )}
        </div>
      </div>

      {/* TABELA DE EXONERADOS */}
      <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                <th style={{ padding: '0.85rem 1rem' }}>Servidor / Cursista</th>
                <th style={{ padding: '0.85rem 1rem' }}>Identificação (CGM / CPF)</th>
                <th style={{ padding: '0.85rem 1rem' }}>NRE / Município</th>
                <th style={{ padding: '0.85rem 1rem' }}>Componente / Cargo</th>
                <th style={{ padding: '0.85rem 1rem' }}>Portaria / Data</th>
                <th style={{ padding: '0.85rem 1rem' }}>Motivo / Observações</th>
              </tr>
            </thead>
            <tbody>
              {paginatedData.length > 0 ? (
                paginatedData.map((item, idx) => (
                  <tr 
                    key={item.id || item.cpf || idx}
                    style={{ 
                      borderBottom: '1px solid #f1f5f9',
                      backgroundColor: idx % 2 === 0 ? '#ffffff' : '#fafafa',
                      transition: 'background-color 0.15s'
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#fef2f2'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = idx % 2 === 0 ? '#ffffff' : '#fafafa'; }}
                  >
                    <td style={{ padding: '0.9rem 1rem', fontWeight: 700, color: '#002d5c' }}>
                      <div>{item.nome_cursista || item.nome || 'NÃO INFORMADO'}</div>
                      {item.email && (
                        <div style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 400 }}>
                          {item.email}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '0.9rem 1rem', color: '#334155' }}>
                      {item.cgm && <div><b style={{ color: '#64748b', fontSize: '0.72rem' }}>CGM:</b> {item.cgm}</div>}
                      {item.cpf && <div><b style={{ color: '#64748b', fontSize: '0.72rem' }}>CPF:</b> {item.cpf}</div>}
                    </td>
                    <td style={{ padding: '0.9rem 1rem', color: '#334155' }}>
                      <div style={{ fontWeight: 600 }}>{item.nre || item.nre_exe || '—'}</div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{item.municipio || item.munic_exe || '—'}</div>
                    </td>
                    <td style={{ padding: '0.9rem 1rem', color: '#334155' }}>
                      <span style={{ backgroundColor: '#f1f5f9', color: '#334155', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600 }}>
                        {item.componente || 'Geral'}
                      </span>
                    </td>
                    <td style={{ padding: '0.9rem 1rem', color: '#334155' }}>
                      <div style={{ fontWeight: 700, color: '#b91c1c' }}>{item.portaria || '—'}</div>
                      <div style={{ fontSize: '0.74rem', color: '#64748b' }}>{item.data_exoneracao || '—'}</div>
                    </td>
                    <td style={{ padding: '0.9rem 1rem', color: '#475569', maxWidth: '320px', lineHeight: 1.4 }}>
                      {item.motivo && <div style={{ fontWeight: 600, color: '#0f172a' }}>{item.motivo}</div>}
                      {item.observacoes && <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{item.observacoes}</div>}
                      {!item.motivo && !item.observacoes && <span style={{ color: '#94a3b8' }}>—</span>}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '3rem 1rem', color: '#64748b' }}>
                    <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>📋</div>
                    <div style={{ fontWeight: 700, fontSize: '1rem', color: '#002d5c' }}>
                      Nenhum servidor exonerado encontrado
                    </div>
                    <div style={{ fontSize: '0.85rem', marginTop: '0.3rem' }}>
                      {exonerados.length === 0 
                        ? 'A tabela de exonerados será sincronizada diretamente da aba EXONERADOS da planilha master.'
                        : 'Nenhum registro corresponde aos filtros selecionados.'}
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* PAGINAÇÃO */}
        {exoneradosFiltrados.length > 0 && (
          <div style={{ padding: '0.9rem 1.2rem', backgroundColor: '#f8fafc', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
              Mostrando <b>{Math.min(exoneradosFiltrados.length, (currentPage - 1) * itemsPerPage + 1)}</b> a <b>{Math.min(exoneradosFiltrados.length, currentPage * itemsPerPage)}</b> de <b>{exoneradosFiltrados.length}</b> servidores
            </span>

            <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                style={{ padding: '0.4rem 0.8rem', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: '#ffffff', cursor: currentPage === 1 ? 'not-allowed' : 'pointer', opacity: currentPage === 1 ? 0.5 : 1, fontSize: '0.8rem', fontWeight: 600 }}
              >
                Anterior
              </button>
              <span style={{ fontSize: '0.8rem', color: '#334155', fontWeight: 700, margin: '0 0.4rem' }}>
                {currentPage} / {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                style={{ padding: '0.4rem 0.8rem', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: '#ffffff', cursor: currentPage === totalPages ? 'not-allowed' : 'pointer', opacity: currentPage === totalPages ? 0.5 : 1, fontSize: '0.8rem', fontWeight: 600 }}
              >
                Próxima
              </button>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
