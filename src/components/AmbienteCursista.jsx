import React, { useState, useEffect, useMemo } from 'react';
import FormularioRemanejamento from './FormularioRemanejamento';
import TurmaModal from './TurmaModal';
import ObservacaoModalDetalhes from './ObservacaoModalDetalhes';
import DossieCursistaModal from './DossieCursistaModal';
import CurvaEvolucaoPedagogica from './CurvaEvolucaoPedagogica';
import RadarCompetenciasCursista from './RadarCompetenciasCursista';
import IntencaoMatricula2027 from './IntencaoMatricula2027';
import { formatDatePtBr } from '../utils/dateUtils';
import { getObservacoes2024PorCursista } from '../utils/observacoes2024Service';
import { gerarDiagnosticoCursistaIA, parseScore, scoreLabel, getNivelInfo, normalizeString } from '../utils/aiPedagogicalService';
import { calcularMedalhaCursista } from '../utils/gamificacaoService';

export default function AmbienteCursista({ userEmail, records, observacoes = [], movimentacoes = [], onNovaMovimentacao, subTab = 'turma' }) {
  const [activeSubTab, setActiveSubTab] = useState(subTab);
  const [showModalForm, setShowModalForm] = useState(false);
  const [selectedTurma, setSelectedTurma] = useState(null);
  const [selectedObs, setSelectedObs] = useState(null);
  const [showDossieModal, setShowDossieModal] = useState(false);
  const [classmateSearch, setClassmateSearch] = useState('');
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [obs2024, setObs2024] = useState([]);
  const [rubricaModal, setRubricaModal] = useState(null);

  useEffect(() => {
    setActiveSubTab(subTab);
  }, [subTab]);

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

  // 1. Identificar TODOS os registros/vínculos do Cursista Logado (suporte a dois padrões)
  const cursistaRecords = useMemo(() => {
    if (!userEmail || !records || records.length === 0) return [];
    const cleanEmail = userEmail.trim().toLowerCase();

    // 1.1 Procura direta por e-mail
    const porEmail = records.filter(item => {
      const email = (item['e-mail'] || item.email || item.email_cursista || '').trim().toLowerCase();
      return email === cleanEmail;
    });

    if (porEmail.length > 0) {
      // 1.2 Se encontrou por e-mail, resgata outros vínculos do mesmo CGM se houver (caso de dois padrões)
      const cgms = new Set(porEmail.map(p => String(p.cgm || '').trim()).filter(Boolean));
      if (cgms.size > 0) {
        const todosDoCgm = records.filter(item => {
          const c = String(item.cgm || '').trim();
          return c && cgms.has(c);
        });
        const map = new Map();
        [...porEmail, ...todosDoCgm].forEach(r => {
          const k = r.id || `${r.cgm}_${r.turmas}_${r.componente}`;
          if (!map.has(k)) map.set(k, r);
        });
        return Array.from(map.values());
      }
      return porEmail;
    }

    return records[0] ? [records[0]] : [];
  }, [userEmail, records]);

  // Vínculo selecionado (para cursistas com dois padrões)
  const [selectedRecordIndex, setSelectedRecordIndex] = useState(0);

  const activeRecordIndex = (selectedRecordIndex >= 0 && selectedRecordIndex < cursistaRecords.length) ? selectedRecordIndex : 0;
  const cursistaRecord = cursistaRecords[activeRecordIndex] || cursistaRecords[0] || null;

  // Carregar histórico de 2024 do cursista (busca em todos os vínculos)
  useEffect(() => {
    let isMounted = true;
    if (cursistaRecords && cursistaRecords.length > 0) {
      Promise.all(cursistaRecords.map(rec => getObservacoes2024PorCursista(rec).catch(() => [])))
        .then(results => {
          if (!isMounted) return;
          const flat = results.flat();
          const map = new Map();
          flat.forEach(item => {
            const id = item.id || `${item.carimbo}_${item.data_feedback}`;
            if (!map.has(id)) map.set(id, item);
          });
          setObs2024(Array.from(map.values()));
        })
        .catch(err => {
          console.warn('Erro ao carregar histórico 2024 do cursista:', err);
        });
    }
    return () => { isMounted = false; };
  }, [cursistaRecords]);

  // 1.1 Identificar as Observações da Prática do Cursista Logado (2026 + 2024) para todos os seus vínculos
  const minhasObservacoes = useMemo(() => {
    if (!cursistaRecords || cursistaRecords.length === 0) return [];
    
    const emailsSet = new Set();
    const nomesNormSet = new Set();
    const cgmsSet = new Set();

    if (userEmail) emailsSet.add(userEmail.trim().toLowerCase());

    cursistaRecords.forEach(cr => {
      const em = (cr['e-mail'] || cr.email || cr.email_cursista || '').trim().toLowerCase();
      if (em) emailsSet.add(em);
      const nm = normalizeString(cr.nome_cursista || cr.nome || '');
      if (nm) nomesNormSet.add(nm);
      const c = String(cr.cgm || '').trim();
      if (c) cgmsSet.add(c);
    });

    const obsAtuais = (observacoes || []).filter(obs => {
      const oEmail = (obs.email_cursista || '').trim().toLowerCase();
      if (oEmail && emailsSet.has(oEmail)) return true;
      const oNomeNorm = normalizeString(obs.nome_cursista || '');
      if (oNomeNorm && nomesNormSet.has(oNomeNorm)) return true;
      const oCgm = String(obs.cgm || '').trim();
      if (oCgm && cgmsSet.has(oCgm)) return true;
      return false;
    });

    const todas = [...obsAtuais, ...obs2024];
    return todas.sort((a, b) => {
      const tA = (a.data_feedback || a.data_pratica || a.data_observacao || a.carimbo || a.created_at || '');
      const tB = (b.data_feedback || b.data_pratica || b.data_observacao || b.carimbo || b.created_at || '');
      return tB.localeCompare(tA);
    });
  }, [cursistaRecords, observacoes, userEmail, obs2024]);

  // Diagnóstico pedagógico gerado por IA
  const diagnosticoIA = useMemo(() => {
    if (!cursistaRecord) return null;
    return gerarDiagnosticoCursistaIA({
      cursista: cursistaRecord,
      observacoes: minhasObservacoes,
      turmaInfo: {
        turma: cursistaRecord.turmas,
        componente: cursistaRecord.componente || cursistaRecord.componente_conc,
        formador: cursistaRecord.nome_formador
      }
    });
  }, [cursistaRecord, minhasObservacoes]);

  // Gamificação Formativa com Medalhas (Bronze, Prata, Ouro, Diamante)
  const gamificacao = useMemo(() => {
    return calcularMedalhaCursista(minhasObservacoes);
  }, [minhasObservacoes]);


  // 2. Colegas da mesma turma
  const colegasTurma = useMemo(() => {
    if (!cursistaRecord || !cursistaRecord.turmas) return [];
    const turmaKey = cursistaRecord.turmas.trim();
    
    // Filtrar cursistas que pertencem à mesma turma (excluindo o próprio se desejar ou mantendo)
    const map = new Map();
    records.forEach(item => {
      if (item.turmas && item.turmas.trim() === turmaKey) {
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

    return Array.from(map.values()).sort((a, b) => (a.nome || '').localeCompare(b.nome || '', 'pt-BR', { sensitivity: 'base' }));
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

      {/* Seletor de Padrões/Vínculos para Cursistas com Múltiplos Vínculos (Dois Padrões) */}
      {cursistaRecords.length > 1 && (
        <div style={{
          backgroundColor: '#eff6ff',
          border: '1px solid #bfdbfe',
          borderRadius: '12px',
          padding: '0.85rem 1.25rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '0.75rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <span style={{ fontSize: '1.25rem' }}>🎓</span>
            <div>
              <strong style={{ fontSize: '0.88rem', color: '#1e3a8a', display: 'block' }}>
                Você possui {cursistaRecords.length} vínculos (dois padrões) ativos no programa:
              </strong>
              <span style={{ fontSize: '0.78rem', color: '#3b82f6' }}>
                Selecione abaixo o padrão desejado para alternar sua turma, formador e dados funcionais:
              </span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {cursistaRecords.map((rec, idx) => {
              const isSel = idx === activeRecordIndex;
              const comp = rec.componente || rec.componente_conc || 'Geral';
              const turno = rec.turmas?.toUpperCase().includes('MANHA') ? 'Manhã' : rec.turmas?.toUpperCase().includes('TARDE') ? 'Tarde' : rec.turmas?.toUpperCase().includes('NOITE') ? 'Noite' : '';
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setSelectedRecordIndex(idx)}
                  style={{
                    padding: '0.45rem 0.9rem',
                    borderRadius: '8px',
                    border: isSel ? '2px solid #2563eb' : '1px solid #cbd5e1',
                    backgroundColor: isSel ? '#2563eb' : '#ffffff',
                    color: isSel ? '#ffffff' : '#1e293b',
                    fontWeight: isSel ? 700 : 600,
                    fontSize: '0.82rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    boxShadow: isSel ? '0 2px 4px rgba(37,99,235,0.2)' : 'none',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <span>{isSel ? '✓' : '📌'}</span>
                  <span>Padrão {idx + 1}: {comp} {turno ? `(${turno})` : ''}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Navegação de Sub-abas Internas */}
      <div style={{
        display: 'flex',
        gap: '0.5rem',
        backgroundColor: '#ffffff',
        padding: '0.5rem',
        borderRadius: '12px',
        border: '1px solid var(--color-card-border)',
        boxShadow: 'var(--shadow-sm)',
        flexWrap: 'wrap'
      }}>
        <button
          onClick={() => setActiveSubTab('turma')}
          style={{
            flex: 1,
            minWidth: '140px',
            padding: '0.6rem 1rem',
            borderRadius: '8px',
            border: 'none',
            fontWeight: 700,
            fontSize: '0.88rem',
            cursor: 'pointer',
            backgroundColor: (activeSubTab === 'turma' || activeSubTab === 'geral') ? 'var(--color-primary-dark)' : 'transparent',
            color: (activeSubTab === 'turma' || activeSubTab === 'geral') ? '#ffffff' : 'var(--color-text-muted)',
            transition: 'all 0.2s ease'
          }}
        >
          🏫 Minha Turma
        </button>

        <button
          onClick={() => setActiveSubTab('observacoes')}
          style={{
            flex: 1,
            minWidth: '180px',
            padding: '0.6rem 1rem',
            borderRadius: '8px',
            border: 'none',
            fontWeight: 700,
            fontSize: '0.88rem',
            cursor: 'pointer',
            backgroundColor: activeSubTab === 'observacoes' ? 'var(--color-primary-dark)' : 'transparent',
            color: activeSubTab === 'observacoes' ? '#ffffff' : 'var(--color-text-muted)',
            transition: 'all 0.2s ease'
          }}
        >
          📈 Minha Evolução & Dossiê ({minhasObservacoes.length})
        </button>

        <button
          onClick={() => setActiveSubTab('solicitacoes')}
          style={{
            flex: 1,
            minWidth: '180px',
            padding: '0.6rem 1rem',
            borderRadius: '8px',
            border: 'none',
            fontWeight: 700,
            fontSize: '0.88rem',
            cursor: 'pointer',
            backgroundColor: activeSubTab === 'solicitacoes' ? 'var(--color-primary-dark)' : 'transparent',
            color: activeSubTab === 'solicitacoes' ? '#ffffff' : 'var(--color-text-muted)',
            transition: 'all 0.2s ease'
          }}
        >
          📝 Suas Solicitações & Movimentações
        </button>

        <button
          onClick={() => setActiveSubTab('matricula2027')}
          style={{
            flex: 1,
            minWidth: '170px',
            padding: '0.6rem 1rem',
            borderRadius: '8px',
            border: 'none',
            fontWeight: 700,
            fontSize: '0.88rem',
            cursor: 'pointer',
            backgroundColor: activeSubTab === 'matricula2027' ? '#007a33' : 'transparent',
            color: activeSubTab === 'matricula2027' ? '#ffffff' : 'var(--color-text-muted)',
            transition: 'all 0.2s ease'
          }}
        >
          📅 Intenção 2027
        </button>
      </div>

      {/* BLOCO 1: MINHA TURMA */}
      {(activeSubTab === 'turma' || activeSubTab === 'geral') && (
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
                {cursistaRecord.turmas || 'Não enturmado'}
              </h3>

              <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', display: 'flex', flexDirection: 'column', gap: '0.35rem', marginBottom: '1rem' }}>
                <div><b>Ano Formativo:</b> {cursistaRecord.ano_formativo || '1º Ano'}</div>
                <div><b>Componente:</b> {cursistaRecord.componente || cursistaRecord.componente_conc || 'Geral'}</div>
                <div><b>Encontro:</b> {cursistaRecord.dia_da_semana || 'Conforme cronograma'} {cursistaRecord.horario_inicial ? `(${cursistaRecord.horario_inicial} - ${cursistaRecord.horario_fim})` : ''}</div>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button 
                  onClick={() => setSelectedTurma(cursistaRecord.turmas)}
                  className="btn-secondary" 
                  style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem', width: '100%' }}
                >
                  Ver Detalhes da Turma
                </button>
                {(cursistaRecord.link || cursistaRecord['Link Classroom'] || cursistaRecord.link || cursistaRecord.link) && (
                  <a 
                    href={cursistaRecord.link || cursistaRecord['Link Classroom'] || cursistaRecord.link || cursistaRecord.link} 
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
      {activeSubTab === 'solicitacoes' && (
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

      {/* BLOCO 3: MINHAS OBSERVAÇÕES E COMBINADOS */}
      {activeSubTab === 'observacoes' && (
        <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Banner de Introdução com Botão de Dossiê */}
          <div className="glass-panel" style={{ 
            padding: '1.25rem 1.5rem', 
            backgroundColor: '#f0fdf4', 
            border: '1px solid #bbf7d0', 
            borderRadius: '14px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '1rem'
          }}>
            <div style={{ flex: '1 1 350px' }}>
              <h3 style={{ color: '#15803d', fontSize: '1.15rem', margin: '0 0 0.4rem 0', display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 800 }}>
                👁️ Seu Percurso Formativo de Observação da Prática
              </h3>
              <p style={{ margin: 0, fontSize: '0.85rem', color: '#166534', lineHeight: '1.5' }}>
                Aqui você acompanha as observações realizadas pelo seu formador, os diálogos formativos, o acesso rápido às gravações e os combinados pedagógicos firmados para o aperfeiçoamento contínuo da sua docência.
              </p>
            </div>
            <div>
              <button
                type="button"
                onClick={() => setShowDossieModal(true)}
                style={{
                  background: 'linear-gradient(135deg, #00984a 0%, #15803d 100%)',
                  color: '#ffffff',
                  border: 'none',
                  padding: '0.75rem 1.35rem',
                  borderRadius: '10px',
                  fontWeight: 800,
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  boxShadow: '0 4px 12px rgba(0, 152, 74, 0.25)',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
              >
                <span>📈</span> Ver Meu Dossiê Completo & Gráficos IA
              </button>
            </div>
          </div>

          {/* PAINEL DE EVOLUÇÃO PEDAGÓGICA & DIAGNÓSTICO IA */}
          {minhasObservacoes.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              
              {/* Card 0: Gamificação Formativa & Medalha de Reconhecimento Pedagógico */}
              {gamificacao && gamificacao.medalha && (
                <div className="glass-panel" style={{
                  background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
                  padding: '1.35rem',
                  borderRadius: '14px',
                  border: `2px solid ${gamificacao.medalha.borda}`,
                  boxShadow: '0 4px 15px rgba(0,0,0,0.06)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.85rem'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                      <div style={{
                        fontSize: '2.5rem',
                        backgroundColor: gamificacao.medalha.bgCor,
                        width: '60px',
                        height: '60px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderRadius: '50%',
                        border: `2px solid ${gamificacao.medalha.borda}`,
                        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                      }}>
                        {gamificacao.medalha.icone}
                      </div>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                          <span style={{
                            backgroundColor: gamificacao.medalha.cor,
                            color: gamificacao.medalha.id === 'ouro' ? '#1e293b' : '#ffffff',
                            fontWeight: 800,
                            fontSize: '0.75rem',
                            padding: '0.15rem 0.55rem',
                            borderRadius: '4px',
                            textTransform: 'uppercase'
                          }}>
                            Nível {gamificacao.nivel} Formativo
                          </span>
                          <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                            Média formativa: <b>{gamificacao.mediaGeral} / 3.0</b> • {gamificacao.totalObservacoes} observação(ões)
                          </span>
                        </div>
                        <h3 style={{ margin: '0.2rem 0 0 0', color: '#0f172a', fontSize: '1.25rem', fontWeight: 800 }}>
                          {gamificacao.medalha.nome} — {gamificacao.medalha.subtitulo}
                        </h3>
                        <p style={{ margin: '0.25rem 0 0 0', color: '#475569', fontSize: '0.85rem' }}>
                          {gamificacao.medalha.descricao}
                        </p>
                      </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <span style={{
                        fontSize: '0.75rem',
                        backgroundColor: '#f1f5f9',
                        color: '#64748b',
                        padding: '0.25rem 0.6rem',
                        borderRadius: '6px',
                        fontWeight: 600,
                        display: 'inline-block'
                      }}>
                        ℹ️ Reconhecimento Exclusivamente Formativo
                      </span>
                    </div>
                  </div>

                  {/* Barra de Progresso para a Próxima Medalha */}
                  {gamificacao.proximaMedalha && (
                    <div style={{ backgroundColor: '#f1f5f9', borderRadius: '8px', padding: '0.75rem 1rem', marginTop: '0.25rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: '#475569', fontWeight: 700, marginBottom: '0.35rem' }}>
                        <span>Rumo à {gamificacao.proximaMedalha.nome} {gamificacao.proximaMedalha.icone}</span>
                        <span>{gamificacao.progressoProximoNivel}%</span>
                      </div>
                      <div style={{ width: '100%', height: '8px', backgroundColor: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                        <div style={{
                          width: `${gamificacao.progressoProximoNivel}%`,
                          height: '100%',
                          backgroundColor: gamificacao.proximaMedalha.cor,
                          borderRadius: '4px',
                          transition: 'width 0.4s ease'
                        }} />
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.35rem' }}>
                        <b>Requisito:</b> {gamificacao.proximaMedalha.criterios}
                      </div>
                    </div>
                  )}

                  {/* Aviso de Não Impacto Somativo */}
                  <div style={{
                    fontSize: '0.72rem',
                    color: '#64748b',
                    backgroundColor: '#fffbeb',
                    border: '1px solid #fef3c7',
                    padding: '0.4rem 0.75rem',
                    borderRadius: '6px',
                    lineHeight: '1.4'
                  }}>
                    ⚠️ <b>Nota Legal:</b> As medalhas do programa são instrumentos de incentivo e autoavaliação formativa. Não interferem nem substituem as pontuações e pareceres somativos formais exigidos na avaliação do Estágio Probatório da SEED-PR.
                  </div>
                </div>
              )}

              {/* Card 1: Gráfico Curva de Evolução (Ampla e com rolagem fluida) */}
              <div className="glass-panel" style={{ background: '#ffffff', padding: '1.25rem', borderRadius: '14px', border: '1px solid var(--color-card-border)', boxShadow: 'var(--shadow-sm)' }}>
                <CurvaEvolucaoPedagogica
                  observacoes={minhasObservacoes}
                  title="Sua Curva de Evolução Pedagógica"
                  subtitle="Acompanhamento cronológico dos níveis de Prática Docente (Verde) e Planejamento (Azul)"
                />
              </div>

              {/* Card 1.5: Radar de Competências Docentes do Cursista */}
              <RadarCompetenciasCursista observacoes={minhasObservacoes} />

              {/* Card 2: Diagnóstico Pedagógico IA */}
              {diagnosticoIA && (
                <div className="glass-panel" style={{ background: '#ffffff', padding: '1.25rem', borderRadius: '14px', border: '1px solid var(--color-card-border)', borderTop: '4px solid #0072bc', boxShadow: 'var(--shadow-sm)', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontSize: '1.2rem' }}>✨</span>
                    <div>
                      <h4 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 800, color: 'var(--color-primary-dark)' }}>
                        Síntese Pedagógica por IA
                      </h4>
                      <span style={{ fontSize: '0.72rem', color: '#64748b' }}>Avaliação formativa personalizada</span>
                    </div>
                  </div>

                  <p style={{ margin: 0, fontSize: '0.82rem', color: '#334155', lineHeight: '1.5', backgroundColor: '#f8fafc', padding: '0.75rem', borderRadius: '8px', borderLeft: '3px solid #0072bc' }}>
                    {diagnosticoIA.sintese}
                  </p>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem' }}>
                    {/* Pontos Fortes */}
                    <div style={{ backgroundColor: '#f0fdf4', padding: '0.75rem', borderRadius: '8px', border: '1px solid #bbf7d0' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#15803d', display: 'flex', alignItems: 'center', gap: '0.3rem', marginBottom: '0.4rem' }}>
                        <span>🌟</span> Pontos Fortes
                      </span>
                      <ul style={{ margin: 0, paddingLeft: '1.1rem', fontSize: '0.76rem', color: '#166534', lineHeight: '1.4' }}>
                        {diagnosticoIA.pontosFortes.map((pf, idx) => (
                          <li key={idx} style={{ marginBottom: '0.25rem' }}>{pf}</li>
                        ))}
                      </ul>
                    </div>

                    {/* Pontos de Atenção */}
                    <div style={{ backgroundColor: '#fffbeb', padding: '0.75rem', borderRadius: '8px', border: '1px solid #fef3c7' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#b45309', display: 'flex', alignItems: 'center', gap: '0.3rem', marginBottom: '0.4rem' }}>
                        <span>🎯</span> Oportunidades de Aperfeiçoamento
                      </span>
                      <ul style={{ margin: 0, paddingLeft: '1.1rem', fontSize: '0.76rem', color: '#92400e', lineHeight: '1.4' }}>
                        {diagnosticoIA.pontosAtencao.map((pa, idx) => (
                          <li key={idx} style={{ marginBottom: '0.25rem' }}>{pa}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}

            </div>
          )}

          {minhasObservacoes.length === 0 ? (
            <div className="glass-panel" style={{ padding: '3rem 2rem', textAlign: 'center', backgroundColor: '#ffffff', borderRadius: '14px', border: '1px solid var(--color-card-border)' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>📋</div>
              <h4 style={{ color: 'var(--color-primary-dark)', marginBottom: '0.5rem' }}>Nenhuma Observação Registrada Ainda</h4>
              <p style={{ color: 'var(--color-text-muted)', fontSize: '0.88rem', maxWidth: '500px', margin: '0 auto' }}>
                Assim que o seu formador realizar a observação da sua prática pedagógica e conduzir o feedback formativo, os registros, links e combinados aparecerão automaticamente nesta aba.
              </p>
            </div>
          ) : (
            minhasObservacoes.map(obs => {
              const isRealizada = obs.is_realizada ?? (obs.observacao_realizada ? obs.observacao_realizada.toLowerCase().includes('sim') : true);
              
              return (
                <div 
                  key={obs.id} 
                  className="glass-panel" 
                  style={{ 
                    padding: '1.5rem', 
                    backgroundColor: '#ffffff', 
                    borderRadius: '14px', 
                    border: '1px solid var(--color-card-border)',
                    boxShadow: 'var(--shadow-sm)'
                  }}
                >
                  {/* Cabeçalho do Card */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '1rem', marginBottom: '1rem' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.3rem' }}>
                        <span className="logo-badge" style={{ backgroundColor: 'var(--color-primary-dark)', color: '#fff', fontSize: '0.72rem' }}>
                          {obs.ano_formativo || '1º ANO'}
                        </span>
                        <span className={`status-pill ${isRealizada ? 'status-active' : 'status-pending'}`} style={{ fontSize: '0.72rem' }}>
                          {isRealizada ? '✓ Observação Realizada' : '⚠️ Não Realizada'}
                        </span>
                        {obs.modalidade_feedback && (
                          <span className="logo-badge" style={{ backgroundColor: '#e0e7ff', color: '#3730a3', fontSize: '0.72rem' }}>
                            {obs.modalidade_feedback}
                          </span>
                        )}
                      </div>
                      <h4 style={{ color: 'var(--color-primary-dark)', margin: 0, fontSize: '1.1rem' }}>
                        {obs.tema || 'Tema Pedagógico Geral'}
                      </h4>
                      <div style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', marginTop: '0.2rem' }}>
                        Formador: <b>{obs.nome_formador || 'Não informado'}</b>
                        {(obs.data_pratica || obs.data_observacao) && ` • Data da Aula: ${formatDatePtBr(obs.data_pratica || obs.data_observacao)}`}
                        {obs.data_feedback && ` • Feedback: ${formatDatePtBr(obs.data_feedback)}`}
                      </div>
                    </div>

                    {/* Links de Vídeo e Planejamento */}
                    <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                      {obs.link_gravacao_pratica && (
                        <a 
                          href={obs.link_gravacao_pratica} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="btn-primary"
                          style={{ fontSize: '0.78rem', padding: '0.4rem 0.8rem', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}
                        >
                          ▶️ Gravação da Aula
                        </a>
                      )}
                      {obs.link_planejamento && (
                        <a 
                          href={obs.link_planejamento} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="btn-secondary"
                          style={{ fontSize: '0.78rem', padding: '0.4rem 0.8rem', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.3rem', backgroundColor: '#e2e8f0', color: '#1e293b' }}
                        >
                          📄 PDP (Plano)
                        </a>
                      )}
                      <button
                        className="btn-primary"
                        onClick={() => setSelectedObs(obs)}
                        style={{ fontSize: '0.78rem', padding: '0.4rem 0.8rem', display: 'inline-flex', alignItems: 'center', gap: '0.3rem', cursor: 'pointer' }}
                      >
                        👁️ Ver Parecer Completo
                      </button>
                    </div>
                  </div>

                  {/* Níveis Pedagógicos Avaliados */}
                  <div style={{ display: 'flex', gap: '0.85rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
                    {obs.nivel_planejamento && (() => {
                      const info = getNivelInfo(obs.nivel_planejamento);
                      return (
                        <div style={{ fontSize: '0.82rem', display: 'inline-flex', alignItems: 'center', flexWrap: 'wrap', gap: '0.35rem' }}>
                          <span style={{ color: 'var(--color-text-muted)', fontWeight: 600 }}>Planejamento:</span>
                          <span 
                            className={`badge-nivel ${info.badgeClass}`}
                            title={info.fullDesc || info.shortLabel}
                            style={{ cursor: info.hasLongDescription ? 'help' : 'default' }}
                          >
                            <span>{info.shortLabel}</span>
                            {info.hasLongDescription && (
                              <button
                                type="button"
                                className="btn-info-nivel"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setRubricaModal({
                                    tipo: 'Planejamento Pedagógico',
                                    info
                                  });
                                }}
                                title="Clique para ver a descrição completa deste critério"
                                aria-label="Ver descrição da rubrica"
                              >
                                ℹ️
                              </button>
                            )}
                          </span>
                        </div>
                      );
                    })()}
                    {obs.nivel_pratica && (() => {
                      const info = getNivelInfo(obs.nivel_pratica);
                      return (
                        <div style={{ fontSize: '0.82rem', display: 'inline-flex', alignItems: 'center', flexWrap: 'wrap', gap: '0.35rem' }}>
                          <span style={{ color: 'var(--color-text-muted)', fontWeight: 600 }}>Prática em Sala:</span>
                          <span 
                            className={`badge-nivel ${info.badgeClass}`}
                            title={info.fullDesc || info.shortLabel}
                            style={{ cursor: info.hasLongDescription ? 'help' : 'default' }}
                          >
                            <span>{info.shortLabel}</span>
                            {info.hasLongDescription && (
                              <button
                                type="button"
                                className="btn-info-nivel"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setRubricaModal({
                                    tipo: 'Prática em Sala de Aula',
                                    info
                                  });
                                }}
                                title="Clique para ver a descrição completa deste critério"
                                aria-label="Ver descrição da rubrica"
                              >
                                ℹ️
                              </button>
                            )}
                          </span>
                        </div>
                      );
                    })()}
                  </div>

                  {/* Combinados Formativos (Destaque Principal) */}
                  {obs.combinados && (
                    <div style={{ padding: '1rem 1.25rem', backgroundColor: '#ecfdf5', border: '1px solid #6ee7b7', borderRadius: '10px', marginBottom: '1rem' }}>
                      <strong style={{ color: '#065f46', fontSize: '0.88rem', display: 'block', marginBottom: '0.35rem' }}>
                        🤝 Seus Combinados de Prática Pedagógica:
                      </strong>
                      <p style={{ margin: 0, fontSize: '0.85rem', color: '#047857', whiteSpace: 'pre-wrap', lineHeight: '1.5' }}>
                        {obs.combinados}
                      </p>
                    </div>
                  )}

                  {/* Proposições do Formador */}
                  {obs.proposicoes_sugestoes && (
                    <div style={{ padding: '0.85rem 1.1rem', backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '10px' }}>
                      <strong style={{ color: '#1e40af', fontSize: '0.84rem', display: 'block', marginBottom: '0.25rem' }}>
                        💡 Proposições e Sugestões do Formador:
                      </strong>
                      <p style={{ margin: 0, fontSize: '0.82rem', color: '#1d4ed8', whiteSpace: 'pre-wrap', lineHeight: '1.4' }}>
                        {obs.proposicoes_sugestoes}
                      </p>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* BLOCO 4: INTENÇÃO DE MATRÍCULA 2027 */}
      {activeSubTab === 'matricula2027' && (
        <IntencaoMatricula2027
          cursista={cursistaRecord}
          records={records}
          userEmail={userEmail}
        />
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

      {/* Modal Detalhes da Observação */}
      {selectedObs && (
        <ObservacaoModalDetalhes 
          observacao={selectedObs} 
          onClose={() => setSelectedObs(null)} 
        />
      )}

      {/* Modal Dossiê do Cursista com Gráficos e Diagnóstico IA */}
      {showDossieModal && (
        <DossieCursistaModal
          cursista={cursistaRecord}
          turmaInfo={{
            turma: cursistaRecord.turmas,
            formador: cursistaRecord.formador || cursistaRecord.nome_formador || 'Formador(a)',
            emailFormador: cursistaRecord.email_formador || '',
            componente: cursistaRecord.componente || cursistaRecord.componente_conc || '',
            anoFormativo: cursistaRecord.ano_formativo || '1º Ano'
          }}
          observacoes={observacoes}
          onClose={() => setShowDossieModal(false)}
          readOnly={true}
        />
      )}

      {/* Modal de Detalhe da Rubrica / Descrição Completa do Nível */}
      {rubricaModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 29, 61, 0.72)',
            backdropFilter: 'blur(5px)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 10000,
            padding: '1.25rem'
          }}
          onClick={() => setRubricaModal(null)}
        >
          <div
            className="animate-fade-in"
            onClick={e => e.stopPropagation()}
            style={{
              background: '#ffffff',
              borderRadius: '16px',
              width: '100%',
              maxWidth: '560px',
              maxHeight: '85vh',
              overflowY: 'auto',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
              padding: '1.75rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '1.25rem'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-primary-dark)', letterSpacing: '0.04em' }}>
                  Rubrica Avaliativa • {rubricaModal.tipo}
                </span>
                <h3 style={{ margin: '0.35rem 0 0 0', fontSize: '1.2rem', color: '#0f172a' }}>
                  {rubricaModal.info.shortLabel}
                </h3>
              </div>
              <button
                onClick={() => setRubricaModal(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '1.4rem',
                  cursor: 'pointer',
                  color: '#64748b',
                  lineHeight: 1,
                  padding: '0.2rem'
                }}
                aria-label="Fechar modal"
              >
                ✕
              </button>
            </div>

            <div style={{
              backgroundColor: rubricaModal.info.bg || '#f8fafc',
              border: `1px solid ${rubricaModal.info.border || '#e2e8f0'}`,
              borderRadius: '12px',
              padding: '1.25rem',
              color: '#1e293b',
              fontSize: '0.92rem',
              lineHeight: 1.6,
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word'
            }}>
              <strong style={{ display: 'block', marginBottom: '0.5rem', color: rubricaModal.info.color || '#0f172a', fontSize: '0.82rem', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                📖 Descrição Completa do Critério Avaliado:
              </strong>
              {rubricaModal.info.fullDesc}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
              <button
                className="btn-primary"
                onClick={() => setRubricaModal(null)}
                style={{ fontSize: '0.88rem', padding: '0.5rem 1.4rem', cursor: 'pointer' }}
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

