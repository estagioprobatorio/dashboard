import React, { useState, useMemo } from 'react';

export default function ContatoCursistas({ data }) {
  // Filtros de texto/busca
  const [generalSearch, setGeneralSearch] = useState(''); // Nome ou CGM
  const [cpfCursistaSearch, setCpfCursistaSearch] = useState('');
  const [cpfFormadorSearch, setCpfFormadorSearch] = useState('');
  
  // Filtros de seleção
  const [formadorFilter, setFormadorFilter] = useState('');
  const [tutorFilter, setTutorFilter] = useState('');
  const [nreFilter, setNreFilter] = useState('');
  const [modalidadeFilter, setModalidadeFilter] = useState('');
  const [turnoFilter, setTurnoFilter] = useState('');
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
    const message = encodeURIComponent(`Olá, Cursista ${name}! Gostaria de falar sobre o Estágio Probatório.`);
    return `https://wa.me/${formatted}?text=${message}`;
  };

  // Opções para Filtros
  const filterOptions = useMemo(() => {
    const formadores = new Set();
    const tutores = new Set();
    const nres = new Set();
    const modalidades = new Set();
    const turnos = new Set();
    const chamamentos = new Set();

    data.forEach(item => {
      if (item.nome_formador) formadores.add(item.nome_formador);
      if (item.tutor_responsavel) tutores.add(item.tutor_responsavel);
      if (item.nre_tutor) nres.add(item.nre_tutor);
      if (item.modalidade) modalidades.add(item.modalidade);
      if (item.turno) turnos.add(item.turno);
      if (item.chamamento) chamamentos.add(item.chamamento);
    });

    return {
      formadores: Array.from(formadores).sort(),
      tutores: Array.from(tutores).sort(),
      nres: Array.from(nres).sort(),
      modalidades: Array.from(modalidades).sort(),
      turnos: Array.from(turnos).sort(),
      chamamentos: Array.from(chamamentos).sort()
    };
  }, [data]);

  // Filtragem dos registros
  const filteredRecords = useMemo(() => {
    setCurrentPage(1); // Reseta a paginação ao filtrar
    return data.filter(item => {
      // Filtros de busca digitada
      if (generalSearch) {
        const query = generalSearch.toLowerCase();
        const nomeMatch = item.nome_cursista && item.nome_cursista.toLowerCase().includes(query);
        const cgmMatch = item.cgm && item.cgm.toLowerCase().includes(query);
        if (!nomeMatch && !cgmMatch) return false;
      }
      if (cpfCursistaSearch) {
        const cleanQuery = cpfCursistaSearch.replace(/\D/g, '');
        const cleanCpf = item.cpf_cursista ? item.cpf_cursista.replace(/\D/g, '') : '';
        if (!cleanCpf.includes(cleanQuery)) return false;
      }
      if (cpfFormadorSearch) {
        const cleanQuery = cpfFormadorSearch.replace(/\D/g, '');
        const cleanCpf = item.cpf_formador ? item.cpf_formador.replace(/\D/g, '') : '';
        if (!cleanCpf.includes(cleanQuery)) return false;
      }

      // Filtros dropdown
      if (formadorFilter && item.nome_formador !== formadorFilter) return false;
      if (tutorFilter && item.tutor_responsavel !== tutorFilter) return false;
      if (nreFilter && item.nre_tutor !== nreFilter) return false;
      if (modalidadeFilter && item.modalidade !== modalidadeFilter) return false;
      if (turnoFilter && item.turno !== turnoFilter) return false;
      if (chamamentoFilter && item.chamamento !== chamamentoFilter) return false;

      return true;
    });
  }, [data, generalSearch, cpfCursistaSearch, cpfFormadorSearch, formadorFilter, tutorFilter, nreFilter, modalidadeFilter, turnoFilter, chamamentoFilter]);

  // Paginação
  const paginatedRecords = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredRecords.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredRecords, currentPage, itemsPerPage]);

  const totalPages = Math.max(Math.ceil(filteredRecords.length / itemsPerPage), 1);

  // Limpar todos os filtros
  const clearAllFilters = () => {
    setGeneralSearch('');
    setCpfCursistaSearch('');
    setCpfFormadorSearch('');
    setFormadorFilter('');
    setTutorFilter('');
    setNreFilter('');
    setModalidadeFilter('');
    setTurnoFilter('');
    setChamamentoFilter('');
  };

  return (
    <div className="glass-panel animate-fade-in">
      <div className="panel-header">
        <h2 className="panel-title">
          <i className="lucide-users"></i> Contato dos Cursistas
        </h2>
        <span className="kpi-label" style={{ fontSize: '0.85rem' }}>
          {filteredRecords.length} cursistas encontrados
        </span>
      </div>

      {/* Grid de Filtros */}
      <div className="filter-grid">
        {/* Busca por Nome ou CGM */}
        <div className="filter-group search-box-container">
          <span className="filter-label">Buscar Cursista</span>
          <input 
            type="text" 
            placeholder="Nome ou CGM..." 
            className="filter-input"
            value={generalSearch}
            onChange={e => setGeneralSearch(e.target.value)}
          />
        </div>

        {/* Busca por CPF Cursista */}
        <div className="filter-group">
          <span className="filter-label">CPF Cursista</span>
          <input 
            type="text" 
            placeholder="Apenas números..." 
            className="filter-input"
            value={cpfCursistaSearch}
            onChange={e => setCpfCursistaSearch(e.target.value)}
          />
          <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', marginTop: '2px' }}>Ex: 00000000000</span>
        </div>

        {/* Busca por CPF Formador */}
        <div className="filter-group">
          <span className="filter-label">CPF Formador</span>
          <input 
            type="text" 
            placeholder="Buscar por CPF do Formador..." 
            className="filter-input"
            value={cpfFormadorSearch}
            onChange={e => setCpfFormadorSearch(e.target.value)}
          />
        </div>

        {/* Dropdown Formador */}
        <div className="filter-group">
          <span className="filter-label">Formador</span>
          <select className="filter-select" value={formadorFilter} onChange={e => setFormadorFilter(e.target.value)}>
            <option value="">Todos</option>
            {filterOptions.formadores.map(f => <option key={f} value={f}>{f}</option>)}
          </select>
        </div>

        {/* Dropdown Tutor */}
        <div className="filter-group">
          <span className="filter-label">Tutor</span>
          <select className="filter-select" value={tutorFilter} onChange={e => setTutorFilter(e.target.value)}>
            <option value="">Todos</option>
            {filterOptions.tutores.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>

        {/* Dropdown NRE */}
        <div className="filter-group">
          <span className="filter-label">NRE</span>
          <select className="filter-select" value={nreFilter} onChange={e => setNreFilter(e.target.value)}>
            <option value="">Todos</option>
            {filterOptions.nres.map(n => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>

        {/* Dropdown Modalidade */}
        <div className="filter-group">
          <span className="filter-label">Modalidade</span>
          <select className="filter-select" value={modalidadeFilter} onChange={e => setModalidadeFilter(e.target.value)}>
            <option value="">Todas</option>
            {filterOptions.modalidades.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>

        {/* Dropdown Turno */}
        <div className="filter-group">
          <span className="filter-label">Turno</span>
          <select className="filter-select" value={turnoFilter} onChange={e => setTurnoFilter(e.target.value)}>
            <option value="">Todos</option>
            {filterOptions.turnos.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>

        {/* Dropdown Chamamento */}
        <div className="filter-group">
          <span className="filter-label">Chamamento</span>
          <select className="filter-select" value={chamamentoFilter} onChange={e => setChamamentoFilter(e.target.value)}>
            <option value="">Todos</option>
            {filterOptions.chamamentos.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
        {(generalSearch || cpfCursistaSearch || cpfFormadorSearch || formadorFilter || tutorFilter || nreFilter || modalidadeFilter || turnoFilter || chamamentoFilter) && (
          <button className="btn-secondary" onClick={clearAllFilters} style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}>
            Limpar Todos os Filtros
          </button>
        )}
      </div>

      {/* Tabela */}
      <div className="table-responsive">
        <table className="custom-table">
          <thead>
            <tr>
              <th>CGM</th>
              <th>Cursista</th>
              <th>Chamamento</th>
              <th>E-mail</th>
              <th>Turma</th>
              <th>Formador</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {paginatedRecords.length === 0 ? (
              <tr>
                <td colSpan="7" style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: '2rem' }}>
                  Nenhum cursista encontrado.
                </td>
              </tr>
            ) : (
              paginatedRecords.map((item, idx) => {
                const waLink = formatWhatsAppLink(item.telefone_cursista, item.nome_cursista);

                return (
                  <tr key={idx}>
                    <td style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>{item.cgm || '-'}</td>
                    <td style={{ fontWeight: 600, color: 'var(--color-primary-dark)' }}>{item.nome_cursista}</td>
                    <td style={{ fontSize: '0.85rem' }}>{item.chamamento || '-'}</td>
                    <td>
                      {item['e-mail'] || item.email ? (
                        <a href={`mailto:${item['e-mail'] || item.email}`} style={{ color: 'var(--color-accent-blue)', textDecoration: 'none' }}>
                          {item['e-mail'] || item.email}
                        </a>
                      ) : (
                        <span style={{ color: 'var(--color-text-muted)', fontStyle: 'italic' }}>Não informado</span>
                      )}
                    </td>
                    <td style={{ fontSize: '0.85rem' }}>{item.turma || '-'}</td>
                    <td style={{ fontSize: '0.85rem', fontWeight: 500 }}>{item.nome_formador || '-'}</td>
                    <td>
                      <div className="actions-cell">
                        {waLink && (
                          <a href={waLink} target="_blank" rel="noopener noreferrer" className="action-btn whatsapp">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{marginRight: '2px'}}><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
                            WhatsApp
                          </a>
                        )}
                        {(item['e-mail'] || item.email) && (
                          <a href={`mailto:${item['e-mail'] || item.email}`} className="action-btn email">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{marginRight: '2px'}}><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
                            E-mail
                          </a>
                        )}
                        {item['Link Classroom'] || item.Link_Classroom ? (
                          <a href={item['Link Classroom'] || item.Link_Classroom} target="_blank" rel="noopener noreferrer" className="action-btn classroom">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{marginRight: '2px'}}><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
                            Classroom
                          </a>
                        ) : (
                          <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Sem sala</span>
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
            Mostrando <b>{Math.min(filteredRecords.length, (currentPage - 1) * itemsPerPage + 1)}</b> a <b>{Math.min(filteredRecords.length, currentPage * itemsPerPage)}</b> de <b>{filteredRecords.length}</b> cursistas
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
