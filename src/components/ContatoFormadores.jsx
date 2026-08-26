import React, { useState, useMemo } from 'react';
import { exportToCSV, printReportPDF } from '../utils/exportUtils';

export default function ContatoFormadores({ data }) {
  // Filtros
  const [formadorSearch, setFormadorSearch] = useState('');
  const [turmaFilter, setTurmaFilter] = useState('');
  const [modalidadeFilter, setModalidadeFilter] = useState('');
  const [nreFilter, setNreFilter] = useState('');
  const [somenteNovos, setSomenteNovos] = useState(false);
  
  // Paginação
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(15);

  const formadorColumns = [
    { label: 'Nome do Formador', accessor: r => r.nome || '-' },
    { label: 'E-mail', accessor: r => r.email || '-' },
    { label: 'Telefone', accessor: r => r.telefone || '-' },
    { label: 'Turma Responsável', accessor: r => r.turma || '-' },
    { label: 'Componente Curricular', accessor: r => r.componente || '-' },
    { label: 'NRE', accessor: r => r.nre || '-' },
    { label: 'Modalidade', accessor: r => r.modalidade || '-' },
    { label: 'Qtd Cursistas', accessor: r => r.qtdCursistas || 0 }
  ];

  const handleExportCSV = () => {
    exportToCSV('Relatorio_Formadores', formadorColumns, filteredRecords);
  };

  const handlePrintPDF = () => {
    const filters = [
      formadorSearch && `Busca: "${formadorSearch}"`,
      turmaFilter && `Turma: ${turmaFilter}`,
      nreFilter && `NRE: ${nreFilter}`,
      modalidadeFilter && `Modalidade: ${modalidadeFilter}`
    ].filter(Boolean).join(' | ') || 'Nenhum filtro aplicado';

    printReportPDF({
      title: 'Relatório Oficial de Formadores - Estágio Probatório',
      subtitle: 'Listagem de Formadores e Turmas Atribuídas',
      columns: formadorColumns,
      data: filteredRecords,
      filterSummary: filters
    });
  };

  // Auxiliares de limpeza de WhatsApp
  const formatWhatsAppLink = (phone, name) => {
    if (!phone) return null;
    const cleanPhone = phone.replace(/\D/g, '');
    if (!cleanPhone || cleanPhone.length < 8) return null;
    
    let formatted = cleanPhone;
    if (formatted.length <= 11 && !formatted.startsWith('55')) {
      formatted = '55' + formatted;
    }
    const message = encodeURIComponent(`Olá, Formador ${name}! Gostaria de falar sobre o Estágio Probatório.`);
    return `https://wa.me/${formatted}?text=${message}`;
  };

  // Agrupar dados por combinação exclusiva de Formador + Turma
  const formadoresClasses = useMemo(() => {
    const map = new Map();
    data.forEach(item => {
      if (!item.nome_formador) return;
      const key = `${item.nome_formador}-${item.turmas}`;
      if (!map.has(key)) {
        map.set(key, {
          nome: item.nome_formador,
          email: item['e-mail_formador'] || item.e_mail_formador || item.email_formador || '',
          telefone: item.telefone_formador || '',
          turma: item.turmas || '',
          turmas: item.turmas || '',
          modalidade: item.modalidade || '',
          nre: item.nre_formador || item.nre_tutor || '',
          classroom: item.link || item['Link Classroom'] || item.link_classroom || '',
          diaSemana: item.dia_da_semana || '',
          horarioIni: item.horario_inicial || '',
          horarioFim: item.horario_fim || '',
          turno: item.turno || '',
          isNovo: item.novo_formador === 'SIM'
        });
      }
    });
    return Array.from(map.values()).sort((a, b) => a.nome.localeCompare(b.nome));
  }, [data]);

  // Opções para os Filtros
  const filterOptions = useMemo(() => {
    const turmas = new Set();
    const modalidades = new Set();
    const nres = new Set();

    formadoresClasses.forEach(item => {
      const tVal = item.turma || item.turmas;
      if (tVal) turmas.add(tVal);
      if (item.modalidade) modalidades.add(item.modalidade);
      if (item.nre) nres.add(item.nre);
    });

    return {
      turmas: Array.from(turmas).sort(),
      modalidades: Array.from(modalidades).sort(),
      nres: Array.from(nres).sort()
    };
  }, [formadoresClasses]);

  // Filtragem dos registros
  const filteredRecords = useMemo(() => {
    setCurrentPage(1); // Reseta para primeira página ao filtrar
    return formadoresClasses.filter(item => {
      if (formadorSearch) {
        const q = formadorSearch.trim().toLowerCase();
        const nomeMatch = String(item.nome || '').toLowerCase().includes(q);
        const emailMatch = String(item.email || '').toLowerCase().includes(q);
        const turmaMatch = String(item.turma || item.turmas || '').toLowerCase().includes(q);
        if (!nomeMatch && !emailMatch && !turmaMatch) return false;
      }
      if (turmaFilter && (item.turma || item.turmas) !== turmaFilter) return false;
      if (modalidadeFilter && item.modalidade !== modalidadeFilter) return false;
      if (nreFilter && item.nre !== nreFilter) return false;
      if (somenteNovos && !item.isNovo) return false;
      return true;
    });
  }, [formadoresClasses, formadorSearch, turmaFilter, modalidadeFilter, nreFilter, somenteNovos]);

  // Paginação - registros visíveis
  const paginatedRecords = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredRecords.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredRecords, currentPage, itemsPerPage]);

  const totalPages = Math.max(Math.ceil(filteredRecords.length / itemsPerPage), 1);

  return (
    <div className="glass-panel animate-fade-in">
      <div className="panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h2 className="panel-title">
            <i className="lucide-graduation-cap"></i> Contato dos Formadores
          </h2>
          <span className="kpi-label" style={{ fontSize: '0.85rem' }}>
            {filteredRecords.length} turmas encontradas
          </span>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button
            onClick={handleExportCSV}
            style={{
              backgroundColor: '#0b3c5d',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              padding: '0.45rem 0.9rem',
              fontSize: '0.82rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem'
            }}
          >
            <span>📊</span> Baixar CSV
          </button>
          
          <button
            onClick={handlePrintPDF}
            style={{
              backgroundColor: '#002d5c',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              padding: '0.45rem 0.9rem',
              fontSize: '0.82rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem'
            }}
          >
            <span>📄</span> Imprimir / PDF
          </button>
        </div>
      </div>

      {/* Grid de Filtros */}
      <div className="filter-grid">
        <div className="filter-group search-box-container">
          <span className="filter-label">Buscar Formador</span>
          <input 
            type="text" 
            placeholder="Nome ou e-mail..." 
            className="filter-input"
            value={formadorSearch}
            onChange={e => setFormadorSearch(e.target.value)}
          />
        </div>
        <div className="filter-group">
          <span className="filter-label">Filtrar Turma</span>
          <select className="filter-select" value={turmaFilter} onChange={e => setTurmaFilter(e.target.value)}>
            <option value="">Todas</option>
            {filterOptions.turmas.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div className="filter-group">
          <span className="filter-label">Modalidade</span>
          <select className="filter-select" value={modalidadeFilter} onChange={e => setModalidadeFilter(e.target.value)}>
            <option value="">Todas</option>
            {filterOptions.modalidades.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
        <div className="filter-group">
          <span className="filter-label">NRE</span>
          <select className="filter-select" value={nreFilter} onChange={e => setNreFilter(e.target.value)}>
            <option value="">Todos</option>
            {filterOptions.nres.map(n => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>
        <div className="filter-group">
          <span className="filter-label">Filtro de Entrada</span>
          <button
            onClick={() => setSomenteNovos(prev => !prev)}
            style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
              height: '42px', padding: '0 1rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-card-border)', cursor: 'pointer',
              fontWeight: 700, fontSize: '0.85rem', letterSpacing: '0.03em',
              transition: 'all 0.2s ease',
              background: somenteNovos
                ? 'linear-gradient(135deg, #f59e0b, #d97706)'
                : 'white',
              color: somenteNovos ? '#fff' : 'var(--color-text-main)',
              boxShadow: somenteNovos ? '0 2px 8px rgba(245,158,11,0.4)' : 'var(--shadow-sm)'
            }}
          >
            ⭐ {somenteNovos ? 'Somente Novos' : 'Todos os Formadores'}
          </button>
        </div>
      </div>

      {/* Tabela de Contatos */}
      <div className="table-responsive">
        <table className="custom-table">
          <thead>
            <tr>
              <th>Formador</th>
              <th>E-mail</th>
              <th>Turma</th>
              <th>Horário do Encontro</th>
              <th>Ações de Contato</th>
            </tr>
          </thead>
          <tbody>
            {paginatedRecords.length === 0 ? (
              <tr>
                <td colSpan="5" style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: '2rem' }}>
                  Nenhum formador encontrado com os filtros aplicados.
                </td>
              </tr>
            ) : (
              paginatedRecords.map((item, idx) => {
                const waLink = formatWhatsAppLink(item.telefone, item.nome);
                
                // Formatação do dia e horário
                let horarioDisplay = "Não definido";
                if (item.diaSemana) {
                  const diaClean = item.diaSemana.split(' - ')[1] || item.diaSemana;
                  horarioDisplay = `${diaClean} | ${item.horarioIni} - ${item.horarioFim}`;
                  if (item.turno) {
                    horarioDisplay += ` (${item.turno})`;
                  }
                }

                return (
                  <tr key={idx}>
                    <td style={{ fontWeight: 600, color: 'var(--color-primary-dark)' }}>
                      {item.isNovo && (
                        <span title="Formador Novo" style={{
                          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                          background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                          color: '#fff', fontSize: '0.6rem', fontWeight: 800,
                          padding: '1px 5px', borderRadius: '10px',
                          marginRight: '6px', verticalAlign: 'middle', letterSpacing: '0.03em'
                        }}>⭐ NOVO</span>
                      )}
                      {item.nome}
                    </td>
                    <td>
                      {item.email ? (
                        <a href={`mailto:${item.email}`} style={{ color: 'var(--color-accent-blue)', textDecoration: 'none' }}>
                          {item.email}
                        </a>
                      ) : (
                        <span style={{ color: 'var(--color-text-muted)', fontStyle: 'italic' }}>Não cadastrado</span>
                      )}
                    </td>
                    <td style={{ fontSize: '0.85rem' }}>{item.turma || item.turmas || 'Sem Turma'}</td>
                    <td style={{ fontSize: '0.85rem' }}>{horarioDisplay}</td>
                    <td>
                      <div className="actions-cell">
                        {waLink && (
                          <a href={waLink} target="_blank" rel="noopener noreferrer" className="action-btn whatsapp">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{marginRight: '2px'}}><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
                            WhatsApp
                          </a>
                        )}
                        {item.email && (
                          <a href={`mailto:${item.email}`} className="action-btn email">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{marginRight: '2px'}}><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
                            E-mail
                          </a>
                        )}
                        {item.classroom ? (
                          <a href={item.classroom} target="_blank" rel="noopener noreferrer" className="action-btn classroom">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{marginRight: '2px'}}><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
                            Classroom
                          </a>
                        ) : (
                          <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', padding: '0.4rem 0.5rem' }}>Sem Classroom</span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Controles de Paginação */}
      {filteredRecords.length > 0 && (
        <div className="pagination-container">
          <div>
            Mostrando <b>{Math.min(filteredRecords.length, (currentPage - 1) * itemsPerPage + 1)}</b> a <b>{Math.min(filteredRecords.length, currentPage * itemsPerPage)}</b> de <b>{filteredRecords.length}</b> turmas
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span>Por página:</span>
              <select 
                value={itemsPerPage} 
                onChange={e => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                style={{ padding: '0.25rem', borderRadius: '4px', border: '1px solid var(--color-card-border)' }}
              >
                <option value="10">10</option>
                <option value="15">15</option>
                <option value="25">25</option>
                <option value="50">50</option>
              </select>
            </div>
            <div className="pagination-buttons">
              <button className="page-btn" onClick={() => setCurrentPage(1)} disabled={currentPage === 1}>
                &lt;&lt;
              </button>
              <button className="page-btn" onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} disabled={currentPage === 1}>
                Anterior
              </button>
              <span style={{ display: 'flex', alignItems: 'center', padding: '0 0.5rem' }}>
                Página {currentPage} de {totalPages}
              </span>
              <button className="page-btn" onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} disabled={currentPage === totalPages}>
                Próxima
              </button>
              <button className="page-btn" onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages}>
                &gt;&gt;
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
