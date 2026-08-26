import React, { useState, useMemo } from 'react';
import { exportToCSV, printReportPDF } from '../utils/exportUtils';

export default function TurmaModal({ turmaName, data, onClose }) {
  const [cursistaSearch, setCursistaSearch] = useState('');

  const turmaInfo = useMemo(() => {
    if (!turmaName || !data) return null;
    const turmaKey = String(turmaName).trim();
    const matching = data.filter(item => {
      const t = item.turmas || item.turma || '';
      return String(t).trim().toLowerCase() === turmaKey.toLowerCase();
    });
    if (matching.length === 0) return null;

    const first = matching[0];
    const fullTurmaName = first.turmas || first.turma || turmaKey;
    
    // Agrupar cursistas únicos por CGM ou Nome
    const cursistasMap = new Map();
    matching.forEach(item => {
      const cgmKey = item.cgm ? String(item.cgm).trim() : (item.nome_cursista ? String(item.nome_cursista).trim() : Math.random().toString());
      if (!cursistasMap.has(cgmKey)) {
        cursistasMap.set(cgmKey, {
          nome: item.nome_cursista || 'NÃO INFORMADO',
          email: item['e-mail'] || item.email || item.email_cursista || '',
          cgm: item.cgm || '',
          rg: item.rg || '',
          municipios: item.munic_exe || item.municipios || '',
          telefone: item.telefone_cursista || ''
        });
      }
    });

    return {
      turma: fullTurmaName,
      anoFormativo: first.ano_formativo || 'Não informado',
      componente: first.componente || first.componente_conc || 'Não informado',
      modalidade: first.modalidade || '',
      turno: first.turno || '',
      diaSemana: first.dia_da_semana || '',
      horarioInicial: first.horario_inicial || '',
      horarioFim: first.horario_fim || '',
      formador: first.nome_formador || 'SEM FORMADOR',
      emailFormador: first['e-mail_formador'] || first.e_mail_formador || first.email_formador || '',
      tutor: first.tutor_responsavel || 'Não Atribuído',
      emailTutor: first.email_tutor || '',
      nreTutor: first.nre_tutor || '',
      linkClassroom: first.link || first['Link Classroom'] || first.link_classroom || '',
      cursistas: Array.from(cursistasMap.values()).sort((a, b) => a.nome.localeCompare(b.nome))
    };
  }, [turmaName, data]);

  if (!turmaInfo) return null;

  const filteredCursistas = turmaInfo.cursistas.filter(c => {
    if (!cursistaSearch) return true;
    const q = cursistaSearch.toLowerCase();
    return (
      (c.nome || '').toLowerCase().includes(q) ||
      (c.email || '').toLowerCase().includes(q) ||
      String(c.cgm || '').includes(q)
    );
  });

  const modalColumns = [
    { label: '#', accessor: (r, idx) => idx + 1, align: 'center' },
    { label: 'Nome do Cursista', accessor: r => r.nome || '-' },
    { label: 'E-mail', accessor: r => r.email || '-' },
    { label: 'CGM', accessor: r => r.cgm || '-' },
    { label: 'Município', accessor: r => r.municipios || '-' }
  ];

  const handlePrintPDF = () => {
    if (!turmaInfo) return;
    const filterInfo = cursistaSearch ? `Filtro de busca: "${cursistaSearch}"` : 'Todos os cursistas da turma';
    const subtitleText = `Componente: ${turmaInfo.componente} | Formador: ${turmaInfo.formador} | Tutor: ${turmaInfo.tutor} | NRE: ${turmaInfo.nreTutor || '-'}`;

    printReportPDF({
      title: `Lista de Cursistas - Turma ${turmaInfo.turma}`,
      subtitle: subtitleText,
      columns: modalColumns,
      data: filteredCursistas,
      filterSummary: filterInfo
    });
  };

  const handleExportCSV = () => {
    if (!turmaInfo) return;
    exportToCSV(`Cursistas_Turma_${turmaInfo.turma}`, modalColumns, filteredCursistas);
  };

  return (
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
    }} onClick={onClose}>
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
      }} onClick={e => e.stopPropagation()}>
        
        {/* Modal Header */}
        <div style={{
          background: 'linear-gradient(135deg, var(--color-primary-dark) 0%, var(--color-primary-mid) 100%)',
          color: 'white',
          padding: '1.25rem 1.5rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <span style={{ fontSize: '0.75rem', backgroundColor: 'var(--color-accent-green)', color: 'white', padding: '0.2rem 0.6rem', borderRadius: '4px', textTransform: 'uppercase', fontWeight: 800, letterSpacing: '0.5px' }}>
              🏫 {turmaInfo.turma}
            </span>
            <h2 style={{ fontSize: '1.2rem', marginTop: '0.4rem', fontWeight: 700, color: '#f1f5f9' }}>
              {turmaInfo.componente} • {turmaInfo.anoFormativo} {turmaInfo.turno ? `(${turmaInfo.turno})` : ''}
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
                {turmaInfo.formador}
              </div>
              {turmaInfo.emailFormador ? (
                <div style={{ marginTop: '0.3rem', fontSize: '0.82rem' }}>
                  <a href={`mailto:${turmaInfo.emailFormador}`} style={{ color: 'var(--color-accent-blue)', textDecoration: 'none', wordBreak: 'break-all' }}>
                    ✉️ {turmaInfo.emailFormador}
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
                {turmaInfo.tutor}
              </div>
              {turmaInfo.emailTutor ? (
                <div style={{ marginTop: '0.3rem', fontSize: '0.82rem' }}>
                  <a href={`mailto:${turmaInfo.emailTutor}`} style={{ color: 'var(--color-accent-blue)', textDecoration: 'none', wordBreak: 'break-all' }}>
                    ✉️ {turmaInfo.emailTutor}
                  </a>
                </div>
              ) : (
                <span style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', fontStyle: 'italic' }}>Sem e-mail cadastrado</span>
              )}
              {turmaInfo.nreTutor && (
                <div style={{ marginTop: '0.2rem', fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>
                  📍 NRE: {turmaInfo.nreTutor}
                </div>
              )}
            </div>

            {/* Dados da Turma */}
            <div style={{ backgroundColor: '#f8fafc', padding: '1rem', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
              <h4 style={{ fontSize: '0.85rem', color: 'var(--color-primary-dark)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                📅 Horário & Sala
              </h4>
              <div style={{ fontSize: '0.85rem', color: 'var(--color-text-main)' }}>
                <b>Dia:</b> {turmaInfo.diaSemana || 'Não informado'}
              </div>
              <div style={{ fontSize: '0.85rem', color: 'var(--color-text-main)', marginTop: '0.2rem' }}>
                <b>Horário:</b> {turmaInfo.horarioInicial ? `${turmaInfo.horarioInicial} às ${turmaInfo.horarioFim}` : 'Não informado'}
              </div>
              {turmaInfo.linkClassroom && (
                <div style={{ marginTop: '0.5rem' }}>
                  <a
                    href={turmaInfo.linkClassroom}
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
                👥 Cursistas da Turma ({turmaInfo.cursistas.length})
              </h3>
              
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                <input
                  type="text"
                  placeholder="Filtrar aluno por nome ou e-mail..."
                  value={cursistaSearch}
                  onChange={(e) => setCursistaSearch(e.target.value)}
                  style={{ padding: '0.45rem 0.8rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.82rem', width: '220px' }}
                />

                <button
                  onClick={handleExportCSV}
                  title="Baixar lista em CSV"
                  style={{
                    backgroundColor: '#0b3c5d',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '0.45rem 0.75rem',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.3rem'
                  }}
                >
                  <span>📊</span> CSV
                </button>

                <button
                  onClick={handlePrintPDF}
                  title="Imprimir lista de alunos em PDF"
                  style={{
                    backgroundColor: '#002d5c',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '0.45rem 0.75rem',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.3rem'
                  }}
                >
                  <span>📄</span> Imprimir (PDF)
                </button>
              </div>
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
                  {filteredCursistas.length === 0 ? (
                    <tr>
                      <td colSpan="5" style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--color-text-muted)' }}>
                        Nenhum cursista encontrado.
                      </td>
                    </tr>
                  ) : (
                    filteredCursistas.map((c, idx) => (
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
        <div style={{ padding: '1rem 1.5rem', backgroundColor: '#f1f5f9', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              onClick={handleExportCSV}
              style={{
                backgroundColor: '#0b3c5d',
                color: '#ffffff',
                border: 'none',
                borderRadius: '6px',
                padding: '0.5rem 0.9rem',
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
                borderRadius: '6px',
                padding: '0.5rem 0.9rem',
                fontSize: '0.82rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem'
              }}
            >
              <span>📄</span> Imprimir Lista (PDF)
            </button>
          </div>

          <button
            onClick={onClose}
            className="btn-secondary"
            style={{ padding: '0.5rem 1.2rem', fontWeight: 600 }}
          >
            Fechar
          </button>
        </div>

      </div>
    </div>
  );
}
