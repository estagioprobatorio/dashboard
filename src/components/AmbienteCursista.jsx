import React, { useState, useEffect, useMemo } from 'react';
import FormularioRemanejamento from './FormularioRemanejamento';
import TurmaModal from './TurmaModal';

export default function AmbienteCursista({ userEmail, records, movimentacoes = [], onNovaMovimentacao, subTab = 'turma' }) {
  const [showModalForm, setShowModalForm] = useState(false);
  const [selectedTurma, setSelectedTurma] = useState(null);
  const [classmateSearch, setClassmateSearch] = useState('');
  const [deferredPrompt, setDeferredPrompt] = useState(null);

  // Escuta evento de instalação PWA
  useEffect(() => {
    const handleBeforeInstall = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
  }, []);

  const handleInstallPWA = async () => {
    if (!deferredPrompt) {
      alert("Para instalar no iPhone (iOS): Toque no botão Compartilhar ⬆️ do Safari e selecione 'Adicionar à Tela de Início'.\n\nNo Android/Chrome: Toque nos 3 pontos do navegador ➔ 'Instalar aplicativo'.");
      return;
    }
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
    }
  };

  // 1. Identificar o registro do Cursista Logado
  const cursistaRecord = useMemo(() => {
    if (!userEmail || !records) return null;
    const cleanEmail = userEmail.trim().toLowerCase();
    return records.find(item => {
      const email = (item['e-mail'] || item.email || item.email_cursista || '').trim().toLowerCase();
      return email === cleanEmail;
    }) || records[0]; // Fallback para dev/testes se necessário
  }, [userEmail, records]);

  // 2. Colegas da mesma turma
  const colegasTurma = useMemo(() => {
    if (!cursistaRecord || !cursistaRecord.turma) return [];
    const turmaKey = cursistaRecord.turma.trim();
    
    // Filtrar cursistas que pertencem à mesma turma (excluindo o próprio se desejar ou mantendo)
    const map = new Map();
    records.forEach(item => {
      if (item.turma && item.turma.trim() === turmaKey) {
        const key = item.cgm ? String(item.cgm) : (item.nome_cursista || Math.random().toString());
        if (!map.has(key)) {
          map.set(key, {
            nome: item.nome_cursista || 'Cursista',
            email: item['e-mail'] || item.email || item.email_cursista || '',
            cgm: item.cgm || '',
            municipio: item.munic_exe || item.municipios || '',
            telefone: item.telefone_cursista || ''
          });
        }
      }
    });

    return Array.from(map.values()).sort((a, b) => a.nome.localeCompare(b.nome));
  }, [cursistaRecord, records]);

  // Colegas filtrados pela busca
  const colegasFiltrados = useMemo(() => {
    if (!classmateSearch) return colegasTurma;
    const q = classmateSearch.toLowerCase();
    return colegasTurma.filter(c => c.nome.toLowerCase().includes(q) || c.email.toLowerCase().includes(q));
  }, [colegasTurma, classmateSearch]);

  // 3. Solicitações de remanejamento do Cursista
  const minhasSolicitacoes = useMemo(() => {
    if (!cursistaRecord) return movimentacoes;
    const cleanEmail = userEmail ? userEmail.trim().toLowerCase() : '';
    const cgmStr = cursistaRecord.cgm ? String(cursistaRecord.cgm) : '';

    return movimentacoes.filter(mov => {
      const movEmail = (mov.emailCursista || '').toLowerCase();
      const movCgm = mov.cgm ? String(mov.cgm) : '';
      return (cleanEmail && movEmail === cleanEmail) || (cgmStr && movCgm === cgmStr);
    });
  }, [movimentacoes, cursistaRecord, userEmail]);

  const formatWhatsAppLink = (phone, name) => {
    if (!phone) return null;
    const cleanPhone = phone.replace(/\D/g, '');
    if (!cleanPhone || cleanPhone.length < 8) return null;
    let formatted = cleanPhone;
    if (formatted.length <= 11 && !formatted.startsWith('55')) {
      formatted = '55' + formatted;
    }
    const message = encodeURIComponent(`Olá ${name}! Sou seu colega de turma no Estágio Probatório.`);
    return `https://wa.me/${formatted}?text=${message}`;
  };

  if (!cursistaRecord) {
    return (
      <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center' }}>
        <h2>Perfil de Cursista Não Localizado</h2>
        <p style={{ color: 'var(--color-text-muted)', marginTop: '0.5rem' }}>
          Não encontramos um cadastro associado ao e-mail <b>{userEmail}</b> na base de cursistas.
        </p>
      </div>
    );
  }

  return (
    <div className="tab-content animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      {/* Banner de Boas-Vindas */}
      <div className="glass-panel" style={{
        background: 'linear-gradient(135deg, var(--color-primary-dark) 0%, var(--color-primary-mid) 100%)',
        color: 'white',
        borderRadius: '16px',
        padding: '1.5rem 1.75rem',
        boxShadow: 'var(--shadow-md)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '1rem'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
            <span style={{ backgroundColor: 'var(--color-accent-green)', padding: '0.2rem 0.6rem', borderRadius: '6px', fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase' }}>
              Área do Cursista
            </span>
            <span style={{ fontSize: '0.8rem', opacity: 0.8 }}>CGM: {cursistaRecord.cgm || '-'}</span>
          </div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, fontFamily: 'var(--font-header)' }}>
            Olá, {cursistaRecord.nome_cursista}!
          </h1>
        </div>

        <button
          onClick={handleInstallPWA}
          style={{
            backgroundColor: 'rgba(255, 255, 255, 0.15)',
            color: '#fff',
            border: '1px solid rgba(255, 255, 255, 0.3)',
            borderRadius: '10px',
            padding: '0.55rem 1.1rem',
            fontSize: '0.85rem',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            backdropFilter: 'blur(4px)',
            transition: 'all 0.2s ease'
          }}
          onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.25)'}
          onMouseLeave={e => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.15)'}
        >
          <span>📲</span> Instalar App no Celular
        </button>
      </div>
         {/* BLOCO 1: MINHA TURMA */}
      {subTab === 'turma' && (
        <>
          {/* Cards da Turma, Formador e Tutor */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
            
            {/* Card 1: Sua Turma */}
            <div className="glass-panel" style={{ background: 'white', borderRadius: '14px', padding: '1.25rem', border: '1px solid var(--color-card-border)', boxShadow: 'var(--shadow-sm)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-primary-dark)', textTransform: 'uppercase' }}>
                  🏫 Sua Turma Atual
                </span>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, backgroundColor: '#e0f2fe', color: '#0369a1', padding: '0.15rem 0.5rem', borderRadius: '4px' }}>
                  {cursistaRecord.turno || 'Turno Geral'}
                </span>
              </div>

              <h3 style={{ fontSize: '1.15rem', color: 'var(--color-primary-dark)', fontWeight: 800, marginBottom: '0.75rem' }}>
                {cursistaRecord.turma || 'Não enturmado'}
              </h3>

              <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', display: 'flex', flexDirection: 'column', gap: '0.35rem', marginBottom: '1rem' }}>
                <div><b>Ano Formativo:</b> {cursistaRecord.ano_formativo || '1º Ano'}</div>
                <div><b>Componente:</b> {cursistaRecord.componente || cursistaRecord.componente_conc || 'Geral'}</div>
                <div><b>Encontro:</b> {cursistaRecord.dia_da_semana || 'Conforme cronograma'} {cursistaRecord.horario_inicial ? `(${cursistaRecord.horario_inicial} - ${cursistaRecord.horario_fim})` : ''}</div>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button 
                  onClick={() => setSelectedTurma(cursistaRecord.turma)}
                  className="btn-secondary" 
                  style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem', width: '100%' }}
                >
                  Ver Detalhes da Turma
                </button>
                {(cursistaRecord['Link Classroom'] || cursistaRecord.Link_Classroom || cursistaRecord.link_classroom) && (
                  <a 
                    href={cursistaRecord['Link Classroom'] || cursistaRecord.Link_Classroom || cursistaRecord.link_classroom} 
                    target="_blank" 
                    rel="noreferrer" 
                    className="action-btn classroom" 
                    style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >
                    Classroom
                  </a>
                )}
              </div>
            </div>

            {/* Card 2: Seu Formador */}
            <div className="glass-panel" style={{ background: 'white', borderRadius: '14px', padding: '1.25rem', border: '1px solid var(--color-card-border)', boxShadow: 'var(--shadow-sm)' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-primary-dark)', textTransform: 'uppercase', display: 'block', marginBottom: '0.75rem' }}>
                🎓 Seu Formador Responsável
              </span>

              <h3 style={{ fontSize: '1.1rem', color: 'var(--color-text-main)', fontWeight: 800, marginBottom: '0.5rem' }}>
                {cursistaRecord.nome_formador || 'Não informado'}
              </h3>

              <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginBottom: '1.2rem' }}>
                Responsável pelo acompanhamento das pautas formativas da sua turma.
              </p>

              {(cursistaRecord['e-mail_formador'] || cursistaRecord.e_mail_formador || cursistaRecord.email_formador) ? (
                <a 
                  href={`mailto:${cursistaRecord['e-mail_formador'] || cursistaRecord.e_mail_formador || cursistaRecord.email_formador}`}
                  className="action-btn email"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', textDecoration: 'none' }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
                  Enviar E-mail ao Formador
                </a>
              ) : (
                <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', fontStyle: 'italic' }}>E-mail do formador não informado</span>
              )}
            </div>

            {/* Card 3: Seu Tutor */}
            <div className="glass-panel" style={{ background: 'white', borderRadius: '14px', padding: '1.25rem', border: '1px solid var(--color-card-border)', boxShadow: 'var(--shadow-sm)' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-primary-dark)', textTransform: 'uppercase', display: 'block', marginBottom: '0.75rem' }}>
                👤 Seu Tutor Responsável
              </span>

              <h3 style={{ fontSize: '1.1rem', color: 'var(--color-text-main)', fontWeight: 800, marginBottom: '0.5rem' }}>
                {cursistaRecord.tutor_responsavel || 'Não Atribuído'}
              </h3>

              <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginBottom: '1rem' }}>
                {cursistaRecord.nre_tutor && <div><b>NRE:</b> {cursistaRecord.nre_tutor}</div>}
                {cursistaRecord.telefone_tutor && <div><b>Telefone:</b> {cursistaRecord.telefone_tutor}</div>}
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {cursistaRecord.email_tutor && (
                  <a 
                    href={`mailto:${cursistaRecord.email_tutor}`} 
                    className="action-btn email"
                    style={{ textDecoration: 'none' }}
                  >
                    E-mail Tutor
                  </a>
                )}
                {cursistaRecord.telefone_tutor && (
                  <a 
                    href={formatWhatsAppLink(cursistaRecord.telefone_tutor, cursistaRecord.tutor_responsavel)} 
                    target="_blank" 
                    rel="noreferrer" 
                    className="action-btn whatsapp"
                    style={{ textDecoration: 'none' }}
                  >
                    WhatsApp
                  </a>
                )}
              </div>
            </div>

          </div>

          {/* Tabela de Colegas de Turma */}
          <div className="glass-panel" style={{ padding: '1.25rem' }}>
            <div className="panel-header" style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
              <h2 className="panel-title">
                <i className="lucide-users"></i> Colegas da Sua Turma ({colegasTurma.length})
              </h2>
              <input 
                type="text" 
                placeholder="Buscar colega por nome..." 
                value={classmateSearch}
                onChange={e => setClassmateSearch(e.target.value)}
                style={{ padding: '0.45rem 0.8rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.82rem', width: '220px' }}
              />
            </div>

            <div className="table-responsive">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Nome do Colega</th>
                    <th>E-mail Institucional</th>
                    <th>Município</th>
                    <th>Contato</th>
                  </tr>
                </thead>
                <tbody>
                  {colegasFiltrados.length === 0 ? (
                    <tr>
                      <td colSpan="5" style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--color-text-muted)' }}>
                        Nenhum colega encontrado.
                      </td>
                    </tr>
                  ) : (
                    colegasFiltrados.map((c, idx) => {
                      const waLink = formatWhatsAppLink(c.telefone, c.nome);
                      const isSelf = cursistaRecord.cgm && String(cursistaRecord.cgm) === String(c.cgm);

                      return (
                        <tr key={idx} style={{ backgroundColor: isSelf ? '#f0fdf4' : 'transparent' }}>
                          <td style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>{idx + 1}</td>
                          <td style={{ fontWeight: isSelf ? 800 : 600, color: 'var(--color-primary-dark)' }}>
                            {c.nome} {isSelf && <span style={{ fontSize: '0.72rem', backgroundColor: 'var(--color-accent-green)', color: 'white', padding: '0.1rem 0.4rem', borderRadius: '4px', marginLeft: '0.3rem' }}>Você</span>}
                          </td>
                          <td>
                            {c.email ? (
                              <a href={`mailto:${c.email}`} style={{ color: 'var(--color-accent-blue)', textDecoration: 'none', fontSize: '0.85rem' }}>
                                {c.email}
                              </a>
                            ) : (
                              <span style={{ color: 'var(--color-text-muted)', fontStyle: 'italic', fontSize: '0.82rem' }}>-</span>
                            )}
                          </td>
                          <td style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>{c.municipio || '-'}</td>
                          <td>
                            <div className="actions-cell">
                              {c.email && (
                                <a href={`mailto:${c.email}`} className="action-btn email" style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem' }}>
                                  E-mail
                                </a>
                              )}
                              {waLink && (
                                <a href={waLink} target="_blank" rel="noreferrer" className="action-btn whatsapp" style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem' }}>
                                  WhatsApp
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
          </div>
        </>
      )}

      {/* BLOCO 2: MINHAS SOLICITAÇÕES */}
      {subTab === 'solicitacoes' && (
        <div className="glass-panel" style={{ padding: '1.25rem' }}>
          <div className="panel-header" style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
            <h2 className="panel-title">
              <i className="lucide-file-text"></i> Suas Solicitações de Remanejamento
            </h2>
            <button 
              className="btn-primary" 
              onClick={() => setShowModalForm(true)}
              style={{ 
                backgroundColor: '#fbbf24', 
                color: '#1e293b', 
                fontWeight: 800, 
                padding: '0.6rem 1.2rem', 
                fontSize: '0.88rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem'
              }}
            >
              <span>📝</span> Nova Solicitação
            </button>
          </div>

          {minhasSolicitacoes.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem 2rem', color: 'var(--color-text-muted)', backgroundColor: '#f8fafc', borderRadius: '10px', border: '1px dashed #cbd5e1' }}>
              <p style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--color-primary-dark)', marginBottom: '0.4rem' }}>
                Você ainda não realizou nenhuma solicitação de remanejamento.
              </p>
              <p style={{ fontSize: '0.85rem', marginBottom: '1.2rem' }}>
                Precisa alterar o horário ou turno da sua turma? Clique no botão abaixo para enviar o pedido.
              </p>
              <button className="btn-primary" onClick={() => setShowModalForm(true)} style={{ padding: '0.65rem 1.4rem', fontSize: '0.88rem' }}>
                Fazer uma Solicitação de Remanejamento
              </button>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Data/Hora</th>
                    <th>Turma Atual</th>
                    <th>Turno Pretendido</th>
                    <th>Motivo</th>
                    <th>Comprovante</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {minhasSolicitacoes.map((mov, idx) => (
                    <tr key={idx}>
                      <td style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)' }}>{mov.dataHora || mov.data || '-'}</td>
                      <td style={{ fontWeight: 600, fontSize: '0.85rem' }}>{mov.turmaOrigem || mov.turma_origem || '-'}</td>
                      <td style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--color-primary-dark)' }}>{mov.turnoDesejado || mov.turno_pretendido || '-'}</td>
                      <td style={{ fontSize: '0.85rem' }}>{mov.motivo || '-'}</td>
                      <td style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)' }}>{mov.comprovante || 'Sem anexo'}</td>
                      <td>
                        <span style={{
                          padding: '0.25rem 0.6rem',
                          borderRadius: '6px',
                          fontSize: '0.78rem',
                          fontWeight: 800,
                          backgroundColor: mov.status === 'Aprovado' ? '#dcfce7' : mov.status === 'Recusado' ? '#fee2e2' : '#fef3c7',
                          color: mov.status === 'Aprovado' ? '#15803d' : mov.status === 'Recusado' ? '#b91c1c' : '#b45309'
                        }}>
                          {mov.status || 'Pendente'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Modal Formulário */}
      {showModalForm && (
        <FormularioRemanejamento 
          cursistaData={cursistaRecord} 
          onClose={() => setShowModalForm(false)} 
          onSubmitSuccess={(novaSolicitacao) => {
            if (onNovaMovimentacao) onNovaMovimentacao(novaSolicitacao);
          }}
        />
      )}

      {/* Modal Detalhes da Turma */}
      {selectedTurma && (
        <TurmaModal 
          turmaName={selectedTurma} 
          data={records} 
          onClose={() => setSelectedTurma(null)} 
        />
      )}

    </div>
  );
}
