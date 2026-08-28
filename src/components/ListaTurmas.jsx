import React, { useState, useMemo } from 'react';
import { exportToCSV, printReportPDF } from '../utils/exportUtils';

export default function ListaTurmas({ data }) {
  // Filtros de seleção e busca
  const [tutorFilter, setTutorFilter] = useState('');
  const [formadorFilter, setFormadorFilter] = useState('');
  const [turmaSearch, setTurmaSearch] = useState('');

  // Modal de Detalhes da Turma
  const [selectedTurma, setSelectedTurma] = useState(null);
  const [cursistaSearch, setCursistaSearch] = useState('');

  // Paginação
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;

  // Agrupar dados por TURMA única
  const turmasList = useMemo(() => {
    const map = new Map();

    data.forEach(item => {
      if (!item.turmas) return;
      const turmaKey = item.turmas.trim();

      if (!map.has(turmaKey)) {
        map.set(turmaKey, {
          turma: turmaKey,
          turmas: turmaKey,
          anoFormativo: item.ano_formativo || 'Não informado',
          componente: item.componente || item.componente_conc || 'Não informado',
          modalidade: item.modalidade || '',
          turno: item.turno || '',
          diaSemana: item.dia_da_semana || '',
          horarioInicial: item.horario_inicial || '',
          horarioFim: item.horario_fim || '',
          formador: item.nome_formador || 'SEM FORMADOR',
          emailFormador: item['e-mail_formador'] || item.e_mail_formador || item.email_formador || '',
          tutor: item.tutor_responsavel || 'Não Atribuído',
          emailTutor: item.email_tutor || '',
          nreTutor: item.nre_tutor || '',
          linkClassroom: item['Link Classroom'] || item.link || item.link || '',
          idClassroom: item.id_classroom || item.id_classroom || '',
          cursistas: []
        });
      }

      // Adicionar cursista à lista da turma
      const record = map.get(turmaKey);
      record.cursistas.push({
        nome: item.nome_cursista || 'NÃO INFORMADO',
        email: item['e-mail'] || item.email || item.email_cursista || '',
        cgm: item.cgm || '',
        rg: item.rg || '',
        municipios: item.munic_exe || item.municipios || '',
        telefone: item.telefone_cursista || ''
      });
    // Ordena cursistas de cada turma por nome
    map.forEach(record => {
      record.cursistas.sort((a, b) => (a.nome || '').localeCompare(b.nome || '', 'pt-BR', { sensitivity: 'base' }));
    });

    return Array.from(map.values()).sort((a, b) => (a.turma || '').localeCompare(b.turma || '', 'pt-BR', { sensitivity: 'base' }));
  }, [data]);

  // Obter listas únicas para popular os seletores dos Filtros (Filtro cascateado: Tutor -> Formadores)
  const filterOptions = useMemo(() => {
    const tutoresSet = new Set();
    const formadoresSet = new Set();

    turmasList.forEach(item => {
      if (item.tutor && item.tutor !== 'Não Atribuído') {
        tutoresSet.add(item.tutor);
      }
      // Se um tutor estiver selecionado, exibe apenas os formadores que possuem turmas com esse tutor
      if (!tutorFilter || item.tutor === tutorFilter) {
        if (item.formador && item.formador !== 'SEM FORMADOR') {
          formadoresSet.add(item.formador);
        }
      }
    });

    const sortPtBR = (arr) => Array.from(arr).sort((a, b) => a.localeCompare(b, 'pt-BR', { sensitivity: 'base' }));

    return {
      tutores: sortPtBR(tutoresSet),
      formadores: sortPtBR(formadoresSet)
    };
  }, [turmasList, tutorFilter]);

  // Aplicar filtros com tratamento seguro contra nulos e ordenação alfabética
  const filteredTurmas = useMemo(() => {
    setCurrentPage(1); // Reseta para a primeira página ao alterar o filtro
    return turmasList.filter(item => {
      if (tutorFilter && (item.tutor || '') !== tutorFilter) return false;
      if (formadorFilter && (item.formador || '') !== formadorFilter) return false;
      if (turmaSearch) {
        const query = turmaSearch.trim().toLowerCase();
        const turmaMatch = String(item.turma || item.turmas || '').toLowerCase().includes(query);
        const compMatch = String(item.componente || '').toLowerCase().includes(query);
        const formadorMatch = String(item.formador || '').toLowerCase().includes(query);
        if (!turmaMatch && !compMatch && !formadorMatch) return false;
      }
      return true;
    }).sort((a, b) => (a.turma || '').localeCompare(b.turma || '', 'pt-BR', { sensitivity: 'base' }));
  }, [turmasList, tutorFilter, formadorFilter, turmaSearch]);

  // Turmas da página atual
  const paginatedTurmas = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredTurmas.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredTurmas, currentPage]);

  const totalPages = Math.max(Math.ceil(filteredTurmas.length / itemsPerPage), 1);

  // Limpar filtros
  const handleClearFilters = () => {
    setTutorFilter('');
    setFormadorFilter('');
    setTurmaSearch('');
  };

  // Cursistas filtrados dentro do Modal de Detalhes (ordenados alfabeticamente)
  const filteredCursistasInModal = useMemo(() => {
    if (!selectedTurma) return [];
    const list = cursistaSearch
      ? selectedTurma.cursistas.filter(c => 
          c.nome.toLowerCase().includes(cursistaSearch.toLowerCase()) || 
          c.email.toLowerCase().includes(cursistaSearch.toLowerCase()) || 
          c.cgm.includes(cursistaSearch)
        )
      : selectedTurma.cursistas;
    return [...list].sort((a, b) => (a.nome || '').localeCompare(b.nome || '', 'pt-BR', { sensitivity: 'base' }));
  }, [selectedTurma, cursistaSearch]);

  const ensalamentoColumns = [
    { label: 'Turma', accessor: r => r.turma || '-' },
    { label: 'Componente Curricular', accessor: r => r.componente || '-' },
    { label: 'Turno', accessor: r => r.turno || '-' },
    { label: 'Dia / Horário', accessor: r => `${r.diaSemana || ''} ${r.horarioInicial ? '('+r.horarioInicial+'-'+r.horarioFim+')' : ''}`.trim() || '-' },
    { label: 'Formador Responsável', accessor: r => r.formador || '-' },
    { label: 'Tutor Responsável', accessor: r => r.tutor || '-' },
    { label: 'NRE', accessor: r => r.nreTutor || '-' },
    { label: 'Total Cursistas Enturmados', accessor: r => r.cursistas ? r.cursistas.length : 0 }
  ];

  const handleExportCSV = () => {
    exportToCSV('Relatorio_Ensalamento_Turmas', ensalamentoColumns, filteredTurmas);
  };

  const handlePrintPDF = () => {
    const filters = [
      tutorFilter && `Tutor: ${tutorFilter}`,
      formadorFilter && `Formador: ${formadorFilter}`,
      turmaSearch && `Busca: "${turmaSearch}"`
    ].filter(Boolean).join(' | ') || 'Todas as Turmas';

    printReportPDF({
      title: 'Relatório Oficial de Ensalamento - Turmas, Formadores e Cursistas',
      subtitle: 'Distribuição e Ensalamento Geral - SEED-PR',
      columns: ensalamentoColumns,
      data: filteredTurmas,
      filterSummary: filters
    });
  };

  return (
    <div className="tab-content animate-fade-in" style={{ padding: '0.5rem 0' }}>
      
      {/* Banner da Seção */}
      <div className="section-header" style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.4rem', color: 'var(--color-primary-dark)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '1.5rem' }}>🏫</span> Ensalamento e Lista de Turmas
          </h2>
          <p style={{ fontSize: '0.88rem', color: 'var(--color-text-muted)', marginTop: '0.25rem' }}>
            Visualização e exportação do ensalamento de cursistas e formadores por turma, disciplina e turno.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            onClick={handleExportCSV}
            style={{
              backgroundColor: '#0b3c5d',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              padding: '0.5rem 1rem',
              fontSize: '0.82rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem'
            }}
          >
            <span>📊</span> Exportar Ensalamento (CSV)
          </button>
          
          <button
            onClick={handlePrintPDF}
            style={{
              backgroundColor: '#002d5c',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              padding: '0.5rem 1rem',
              fontSize: '0.82rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem'
            }}
          >
            <span>📄</span> Imprimir Ensalamento (PDF)
          </button>

          <div className="kpi-card" style={{ padding: '0.5rem 1rem', minWidth: 'auto', background: 'white', borderRadius: '10px', boxShadow: 'var(--shadow-sm)', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '0.1rem' }}>
            <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total de Turmas</span>
            <span style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--color-primary-dark)', fontFamily: 'var(--font-header)' }}>{filteredTurmas.length}</span>
          </div>
        </div>
      </div>

      {/* Painel de Filtros */}
      <div className="glass-panel" style={{ padding: '1.25rem', marginBottom: '1.5rem', borderRadius: '14px', background: 'white', border: '1px solid var(--color-card-border)', boxShadow: 'var(--shadow-sm)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem', alignItems: 'flex-end' }}>
          
          {/* Filtro por Tutor */}
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--color-primary-dark)', marginBottom: '0.4rem' }}>
              👤 Filtrar por Tutor Responsável:
            </label>
            <select
              value={tutorFilter}
              onChange={(e) => {
                setTutorFilter(e.target.value);
                setFormadorFilter('');
              }}
              style={{ width: '100%', padding: '0.65rem 0.8rem', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#f8fafc', fontSize: '0.88rem' }}
            >
              <option value="">-- Todos os Tutores ({filterOptions.tutores.length}) --</option>
              {filterOptions.tutores.map(tutor => (
                <option key={tutor} value={tutor}>{tutor}</option>
              ))}
            </select>
          </div>

          {/* Filtro por Formador */}
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--color-primary-dark)', marginBottom: '0.4rem' }}>
              🎓 Filtrar por Formador:
            </label>
            <select
              value={formadorFilter}
              onChange={(e) => setFormadorFilter(e.target.value)}
              style={{ width: '100%', padding: '0.65rem 0.8rem', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#f8fafc', fontSize: '0.88rem' }}
            >
              <option value="">-- Todos os Formadores ({filterOptions.formadores.length}) --</option>
              {filterOptions.formadores.map(formador => (
                <option key={formador} value={formador}>{formador}</option>
              ))}
            </select>
          </div>

          {/* Busca por Turma / Componente */}
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--color-primary-dark)', marginBottom: '0.4rem' }}>
              🔍 Buscar por Nome da Turma / Componente:
            </label>
            <input
              type="text"
              placeholder="Ex: FORM-ARTE EST PROB I TARDE..."
              value={turmaSearch}
              onChange={(e) => setTurmaSearch(e.target.value)}
              style={{ width: '100%', padding: '0.65rem 0.8rem', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#f8fafc', fontSize: '0.88rem' }}
            />
          </div>

          {/* Botão de Limpar */}
          <div>
            <button
              onClick={handleClearFilters}
              className="btn-secondary"
              style={{ width: '100%', padding: '0.65rem', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}
            >
              🧹 Limpar Filtros
            </button>
          </div>

        </div>
      </div>

      {/* Grid de Cards de Turmas */}
      {paginatedTurmas.length === 0 ? (
        <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-text-muted)', background: 'white', borderRadius: '12px' }}>
          <p style={{ fontSize: '1.1rem', fontWeight: 600 }}>Nenhuma turma encontrada com os filtros selecionados.</p>
          <button onClick={handleClearFilters} className="btn-primary" style={{ marginTop: '1rem', padding: '0.6rem 1.2rem' }}>
            Ver Todas as Turmas
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '1.2rem' }}>
          {paginatedTurmas.map((tItem) => (
            <div
              key={tItem.turma || tItem.turmas}
              className="glass-panel"
              onClick={() => { setSelectedTurma(tItem); setCursistaSearch(''); }}
              style={{
                background: 'white',
                borderRadius: '14px',
                padding: '1.25rem',
                border: '1px solid var(--color-card-border)',
                boxShadow: 'var(--shadow-sm)',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                display: 'flex',
                flexDirection: 'column',
                justify: 'space-between',
                position: 'relative',
                overflow: 'hidden'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-3px)';
                e.currentTarget.style.boxShadow = 'var(--shadow-md)';
                e.currentTarget.style.borderColor = 'var(--color-accent-blue)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
                e.currentTarget.style.borderColor = 'var(--color-card-border)';
              }}
            >
              {/* Header do Card */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem', marginBottom: '0.75rem' }}>
                  <span style={{ fontSize: '0.7rem', fontWeight: 700, padding: '0.2rem 0.59rem', borderRadius: '6px', backgroundColor: tItem.turno === 'MANHA' ? '#e0f2fe' : tItem.turno === 'TARDE' ? '#fef3c7' : '#f3e8ff', color: tItem.turno === 'MANHA' ? '#0369a1' : tItem.turno === 'TARDE' ? '#b45309' : '#6b21a8', textTransform: 'uppercase' }}>
                    {tItem.turno || 'GERAL'} • {tItem.anoFormativo}
                  </span>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-accent-green)', backgroundColor: 'rgba(15, 155, 15, 0.1)', padding: '0.2rem 0.5rem', borderRadius: '6px' }}>
                    👥 {tItem.cursistas.length} Cursistas
                  </span>
                </div>

                <h3 style={{ fontSize: '1.05rem', color: 'var(--color-primary-dark)', marginBottom: '0.6rem', fontWeight: 800, lineHeight: 1.3 }}>
                  {tItem.turma || tItem.turmas}
                </h3>

                <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', display: 'flex', flexDirection: 'column', gap: '0.35rem', marginBottom: '1rem' }}>
                  <div>
                    <strong style={{ color: 'var(--color-text-main)' }}>🎓 Formador:</strong> {tItem.formador}
                  </div>
                  <div>
                    <strong style={{ color: 'var(--color-text-main)' }}>👤 Tutor:</strong> {tItem.tutor}
                  </div>
                  {tItem.diaSemana && (
                    <div style={{ fontSize: '0.8rem', opacity: 0.9 }}>
                      🗓️ {tItem.diaSemana} {tItem.horarioInicial ? `(${tItem.horarioInicial} - ${tItem.horarioFim})` : ''}
                    </div>
                  )}
                </div>
              </div>

              {/* Botão de Ação */}
              <div style={{ paddingTop: '0.75rem', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.78rem', color: 'var(--color-accent-blue)', fontWeight: 700 }}>
                  Clique para ver cursistas ➔
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Controle de Paginação */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.75rem', marginTop: '2rem' }}>
          <button
            onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
            disabled={currentPage === 1}
            className="btn-secondary"
            style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}
          >
            ◀ Anterior
          </button>

          <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>
            Página <b style={{ color: 'var(--color-primary-dark)' }}>{currentPage}</b> de <b>{totalPages}</b>
          </span>

          <button
            onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
            disabled={currentPage === totalPages}
            className="btn-secondary"
            style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}
          >
            Próxima ▶
          </button>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL DE DETALHES DA TURMA & LISTA DE CURSISTAS */}
      {/* ======================================================== */}
      {selectedTurma && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 29, 61, 0.65)',
          backdropFilter: 'blur(5px)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000,
          padding: '1.5rem'
        }}>
          <div className="animate-fade-in" style={{
            background: 'white',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '900px',
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: 'var(--shadow-lg)',
            overflow: 'hidden'
          }}>
            
            {/* Modal Header */}
            <div style={{
              background: 'linear-gradient(135deg, var(--color-primary-dark) 0%, var(--color-primary-mid) 100%)',
              color: 'white',
              padding: '1.25rem 1.5rem',
              display: 'flex',
              justify: 'space-between',
              alignItems: 'center'
            }}>
              <div>
                <span style={{ fontSize: '0.75rem', backgroundColor: 'var(--color-accent-green)', color: 'white', padding: '0.2rem 0.6rem', borderRadius: '4px', textTransform: 'uppercase', fontWeight: 800 }}>
                  🏫 {selectedTurma.turma || selectedTurma.turmas}
                </span>
                <h2 style={{ fontSize: '1.2rem', marginTop: '0.4rem', fontWeight: 700, color: '#f1f5f9' }}>
                  {selectedTurma.componente} • {selectedTurma.anoFormativo} {selectedTurma.turno ? `(${selectedTurma.turno})` : ''}
                </h2>
              </div>
            </div>

            {/* Modal Content - Body com rolagem */}
            <div style={{ padding: '1.5rem', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              
              {/* Bloco de Informações da Turma, Formador e Tutor */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem' }}>
                
                {/* Formador */}
                <div style={{ backgroundColor: '#f8fafc', padding: '1rem', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                  <h4 style={{ fontSize: '0.85rem', color: 'var(--color-primary-dark)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    🎓 Formador Responsável
                  </h4>
                  <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--color-text-main)' }}>
                    {selectedTurma.formador}
                  </div>
                  {selectedTurma.emailFormador ? (
                    <div style={{ marginTop: '0.3rem', fontSize: '0.82rem' }}>
                      <a href={`mailto:${selectedTurma.emailFormador}`} style={{ color: 'var(--color-accent-blue)', textDecoration: 'none', wordBreak: 'break-all' }}>
                        ✉️ {selectedTurma.emailFormador}
                      </a>
                    </div>
                  ) : (
                    <span style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', fontStyle: 'italic' }}>Sem e-mail cadastrado</span>
                  )}
                </div>

                {/* Tutor */}
                <div style={{ backgroundColor: '#f8fafc', padding: '1rem', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                  <h4 style={{ fontSize: '0.85rem', color: 'var(--color-primary-dark)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    👤 Tutor Responsável
                  </h4>
                  <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--color-text-main)' }}>
                    {selectedTurma.tutor}
                  </div>
                  {selectedTurma.emailTutor ? (
                    <div style={{ marginTop: '0.3rem', fontSize: '0.82rem' }}>
                      <a href={`mailto:${selectedTurma.emailTutor}`} style={{ color: 'var(--color-accent-blue)', textDecoration: 'none', wordBreak: 'break-all' }}>
                        ✉️ {selectedTurma.emailTutor}
                      </a>
                    </div>
                  ) : (
                    <span style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', fontStyle: 'italic' }}>Sem e-mail cadastrado</span>
                  )}
                  {selectedTurma.nreTutor && (
                    <div style={{ marginTop: '0.2rem', fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>
                      📍 NRE: {selectedTurma.nreTutor}
                    </div>
                  )}
                </div>

                {/* Dados da Turma */}
                <div style={{ backgroundColor: '#f8fafc', padding: '1rem', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                  <h4 style={{ fontSize: '0.85rem', color: 'var(--color-primary-dark)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    📅 Horário & Sala
                  </h4>
                  <div style={{ fontSize: '0.85rem', color: 'var(--color-text-main)' }}>
                    <b>Dia:</b> {selectedTurma.diaSemana || 'Não informado'}
                  </div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--color-text-main)', marginTop: '0.2rem' }}>
                    <b>Horário:</b> {selectedTurma.horarioInicial ? `${selectedTurma.horarioInicial} às ${selectedTurma.horarioFim}` : 'Não informado'}
                  </div>
                  {selectedTurma.linkClassroom && (
                    <div style={{ marginTop: '0.5rem' }}>
                      <a
                        href={selectedTurma.linkClassroom}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          display: 'inline-block',
                          backgroundColor: 'var(--color-accent-green)',
                          color: 'white',
                          padding: '0.3rem 0.7rem',
                          borderRadius: '6px',
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          textDecoration: 'none'
                        }}
                      >
                        🔗 Acessar Google Classroom
                      </a>
                    </div>
                  )}
                </div>

              </div>

              {/* Seção da Lista de Cursistas */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <h3 style={{ fontSize: '1.1rem', color: 'var(--color-primary-dark)', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    👥 Cursistas da Turma ({selectedTurma.cursistas.length})
                  </h3>
                  
                  {/* Busca rápida na lista de cursistas do modal */}
                  <input
                    type="text"
                    placeholder="Filtrar aluno por nome ou e-mail..."
                    value={cursistaSearch}
                    onChange={(e) => setCursistaSearch(e.target.value)}
                    style={{ padding: '0.45rem 0.8rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.82rem', width: '260px' }}
                  />
                </div>

                <div className="table-responsive" style={{ maxHeight: '350px', overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: '10px' }}>
                  <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                    <thead>
                      <tr style={{ backgroundColor: 'var(--color-primary-dark)', color: 'white', textAlign: 'left', position: 'sticky', top: 0, zIndex: 10 }}>
                        <th style={{ padding: '0.65rem 0.8rem', width: '40px' }}>#</th>
                        <th style={{ padding: '0.65rem 0.8rem' }}>Nome do Cursista</th>
                        <th style={{ padding: '0.65rem 0.8rem' }}>E-mail</th>
                        <th style={{ padding: '0.65rem 0.8rem' }}>CGM</th>
                        <th style={{ padding: '0.65rem 0.8rem' }}>Município</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredCursistasInModal.length === 0 ? (
                        <tr>
                          <td colSpan="5" style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--color-text-muted)' }}>
                            Nenhum cursista encontrado.
                          </td>
                        </tr>
                      ) : (
                        filteredCursistasInModal.map((c, idx) => (
                          <tr key={idx} style={{ backgroundColor: idx % 2 === 0 ? 'white' : '#f8fafc', borderBottom: '1px solid #edf2f7' }}>
                            <td style={{ padding: '0.6rem 0.8rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>{idx + 1}</td>
                            <td style={{ padding: '0.6rem 0.8rem', fontWeight: 700, color: 'var(--color-text-main)' }}>{c.nome}</td>
                            <td style={{ padding: '0.6rem 0.8rem' }}>
                              {c.email ? (
                                <a href={`mailto:${c.email}`} style={{ color: 'var(--color-accent-blue)', textDecoration: 'none' }}>
                                  {c.email}
                                </a>
                              ) : (
                                <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>-</span>
                              )}
                            </td>
                            <td style={{ padding: '0.6rem 0.8rem', color: 'var(--color-text-muted)' }}>{c.cgm || '-'}</td>
                            <td style={{ padding: '0.6rem 0.8rem', color: 'var(--color-text-muted)' }}>{c.municipios || '-'}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>

            {/* Modal Footer */}
            <div style={{ padding: '1rem 1.5rem', backgroundColor: '#f1f5f9', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setSelectedTurma(null)}
                className="btn-secondary"
                style={{ padding: '0.5rem 1.2rem', fontWeight: 600 }}
              >
                Fechar
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
