import React, { useState, useMemo } from 'react';

export default function DadosTutoria({ data }) {
  // Filtros
  const [cursistaSearch, setCursistaSearch] = useState(''); // Filtro por Cursista
  const [formadorFilter, setFormadorFilter] = useState('');
  const [modalidadeFilter, setModalidadeFilter] = useState('');
  const [chamamentoFilter, setChamamentoFilter] = useState('');

  // Paginação
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(15);

  // Auxiliares de link
  const formatWhatsAppLink = (phone, name) => {
    if (!phone) return null;
    const cleanPhone = phone.replace(/\D/g, '');
    if (!cleanPhone || cleanPhone.length < 8) return null;
    
    let formatted = cleanPhone;
    if (formatted.length <= 11 && !formatted.startsWith('55')) {
      formatted = '55' + formatted;
    }
    const message = encodeURIComponent(`Olá, Tutor ${name}! Gostaria de falar sobre o Estágio Probatório.`);
    return `https://wa.me/${formatted}?text=${message}`;
  };

  // Agrupar dados por combinação exclusiva de Turma + Tutor
  // Guardamos também uma lista dos cursistas pertencentes a essa turma para poder fazer a busca "Por Cursista"
  const tutorRecords = useMemo(() => {
    const map = new Map();
    
    data.forEach(item => {
      if (!item.turma) return;
      const key = `${item.turma}-${item.tutor_responsavel || ''}`;
      
      const cursistaName = item.nome_cursista ? item.nome_cursista.toLowerCase() : '';
      
      if (!map.has(key)) {
        map.set(key, {
          turma: item.turma,
          tutor: item.tutor_responsavel || 'Não Atribuído',
          emailTutor: item.email_tutor || '',
          telefoneTutor: item.telefone_tutor || '',
          emailNre: item['e-mail_nre'] || item.email_nre || '',
          nre: item.nre_tutor || '',
          modalidade: item.modalidade || '',
          chamamento: item.chamamento || '',
          formador: item.nome_formador || '',
          cursistas: [cursistaName]
        });
      } else {
        const record = map.get(key);
        if (!record.cursistas.includes(cursistaName)) {
          record.cursistas.push(cursistaName);
        }
      }
    });

    return Array.from(map.values()).sort((a, b) => a.turma.localeCompare(b.turma));
  }, [data]);

  // Opções para Filtros
  const filterOptions = useMemo(() => {
    const formadores = new Set();
    const modalidades = new Set();
    const chamamentos = new Set();

    tutorRecords.forEach(item => {
      if (item.formador) formadores.add(item.formador);
      if (item.modalidade) modalidades.add(item.modalidade);
      if (item.chamamento) chamamentos.add(item.chamamento);
    });

    return {
      formadores: Array.from(formadores).sort(),
      modalidades: Array.from(modalidades).sort(),
      chamamentos: Array.from(chamamentos).sort()
    };
  }, [tutorRecords]);

  // Filtragem dos registros
  const filteredRecords = useMemo(() => {
    setCurrentPage(1); // Reseta a paginação
    return tutorRecords.filter(item => {
      // Filtro por Cursista (busca se o nome de algum cursista na turma bate)
      if (cursistaSearch) {
        const query = cursistaSearch.toLowerCase();
        const hasCursista = item.cursistas.some(name => name.includes(query));
        if (!hasCursista) return false;
      }
      
      if (formadorFilter && item.formador !== formadorFilter) return false;
      if (modalidadeFilter && item.modalidade !== modalidadeFilter) return false;
      if (chamamentoFilter && item.chamamento !== chamamentoFilter) return false;

      return true;
    });
  }, [tutorRecords, cursistaSearch, formadorFilter, modalidadeFilter, chamamentoFilter]);

  // Paginação
  const paginatedRecords = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredRecords.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredRecords, currentPage, itemsPerPage]);

  const totalPages = Math.max(Math.ceil(filteredRecords.length / itemsPerPage), 1);

  // Limpar todos os filtros
  const clearFilters = () => {
    setCursistaSearch('');
    setFormadorFilter('');
    setModalidadeFilter('');
    setChamamentoFilter('');
  };

  return (
    <div className="glass-panel animate-fade-in">
      <div className="panel-header">
        <h2 className="panel-title">
          <i className="lucide-user-check"></i> Dados da Tutoria por Turma
        </h2>
        <span className="kpi-label" style={{ fontSize: '0.85rem' }}>
          {filteredRecords.length} turmas listadas
        </span>
      </div>

      {/* Grid de Filtros */}
      <div className="filter-grid">
        <div className="filter-group search-box-container">
          <span className="filter-label">Buscar Cursista na Turma</span>
          <input 
            type="text" 
            placeholder="Nome do cursista..." 
            className="filter-input"
            value={cursistaSearch}
            onChange={e => setCursistaSearch(e.target.value)}
          />
        </div>
        <div className="filter-group">
          <span className="filter-label">Por Formador</span>
          <select className="filter-select" value={formadorFilter} onChange={e => setFormadorFilter(e.target.value)}>
            <option value="">Todos</option>
            {filterOptions.formadores.map(f => <option key={f} value={f}>{f}</option>)}
          </select>
        </div>
        <div className="filter-group">
          <span className="filter-label">Por Modalidade</span>
          <select className="filter-select" value={modalidadeFilter} onChange={e => setModalidadeFilter(e.target.value)}>
            <option value="">Todas</option>
            {filterOptions.modalidades.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
        <div className="filter-group">
          <span className="filter-label">Por Chamamento</span>
          <select className="filter-select" value={chamamentoFilter} onChange={e => setChamamentoFilter(e.target.value)}>
            <option value="">Todos</option>
            {filterOptions.chamamentos.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
        {(cursistaSearch || formadorFilter || modalidadeFilter || chamamentoFilter) && (
          <button className="btn-secondary" onClick={clearFilters} style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}>
            Limpar Filtros
          </button>
        )}
      </div>

      {/* Tabela de Contatos */}
      <div className="table-responsive">
        <table className="custom-table">
          <thead>
            <tr>
              <th>Turma</th>
              <th>Tutor Responsável</th>
              <th>Telefone Tutor</th>
              <th>E-mail Tutor</th>
              <th>E-mail NRE</th>
              <th>Ações de Contato</th>
            </tr>
          </thead>
          <tbody>
            {paginatedRecords.length === 0 ? (
              <tr>
                <td colSpan="6" style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: '2rem' }}>
                  Nenhuma tutoria encontrada com os filtros aplicados.
                </td>
              </tr>
            ) : (
              paginatedRecords.map((item, idx) => {
                const waLink = formatWhatsAppLink(item.telefoneTutor, item.tutor);

                return (
                  <tr key={idx}>
                    <td style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--color-primary-dark)' }}>{item.turma}</td>
                    <td style={{ fontWeight: 500 }}>{item.tutor}</td>
                    <td>
                      {item.telefoneTutor ? (
                        <span style={{ fontSize: '0.85rem' }}>{item.telefoneTutor}</span>
                      ) : (
                        <span style={{ color: 'var(--color-text-muted)', fontStyle: 'italic', fontSize: '0.85rem' }}>Não cadastrado</span>
                      )}
                    </td>
                    <td>
                      {item.emailTutor ? (
                        <a href={`mailto:${item.emailTutor}`} style={{ color: 'var(--color-accent-blue)', textDecoration: 'none', fontSize: '0.85rem' }}>
                          {item.emailTutor}
                        </a>
                      ) : (
                        <span style={{ color: 'var(--color-text-muted)', fontStyle: 'italic', fontSize: '0.85rem' }}>Não informado</span>
                      )}
                    </td>
                    <td>
                      {item.emailNre ? (
                        <a href={`mailto:${item.emailNre}`} style={{ color: 'var(--color-text-muted)', textDecoration: 'none', fontSize: '0.85rem' }}>
                          {item.emailNre}
                        </a>
                      ) : (
                        <span style={{ color: 'var(--color-text-muted)', fontStyle: 'italic', fontSize: '0.85rem' }}>Não informado</span>
                      )}
                    </td>
                    <td>
                      <div className="actions-cell">
                        {waLink && (
                          <a href={waLink} target="_blank" rel="noopener noreferrer" className="action-btn whatsapp">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{marginRight: '2px'}}><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
                            WhatsApp
                          </a>
                        )}
                        {item.emailTutor && (
                          <a href={`mailto:${item.emailTutor}`} className="action-btn email">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{marginRight: '2px'}}><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
                            Tutor
                          </a>
                        )}
                        {item.emailNre && (
                          <a href={`mailto:${item.emailNre}`} className="action-btn email" style={{ backgroundColor: 'var(--color-primary-mid)' }}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{marginRight: '2px'}}><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
                            NRE
                          </a>
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

      {/* Paginação */}
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
