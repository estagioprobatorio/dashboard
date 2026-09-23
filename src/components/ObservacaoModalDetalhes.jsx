import React from 'react';
import { formatDatePtBr } from '../utils/dateUtils';

export default function ObservacaoModalDetalhes({ observacao, onClose }) {
  if (!observacao) return null;

  const getNivelBadgeClass = (nivel) => {
    if (!nivel) return 'badge-neutral';
    const n = nivel.toUpperCase();
    if (n.includes('SUPERA')) return 'badge-supera';
    if (n.includes('INTEGRAL') || n.includes('ATENDE') || n.includes('ATINGE')) {
      if (n.includes('PARCIAL')) return 'badge-parcial';
      return 'badge-atende';
    }
    if (n.includes('NÃO') || n.includes('NAO')) return 'badge-nao-atende';
    return 'badge-neutral';
  };

  const formatNivelLabel = (nivel) => {
    if (!nivel) return 'NÃO INFORMADO';
    const t = String(nivel).toUpperCase();
    if (t.includes('SUPERA') || t.includes('SUPEROU')) return 'SUPERA';
    if (t.includes('INTEGRAL') || (t.includes('ATENDE') && !t.includes('PARCIAL') && !t.includes('NÃO') && !t.includes('NAO')) || (t.includes('ATINGE') && !t.includes('PARCIAL') && !t.includes('NÃO') && !t.includes('NAO'))) return 'ATINGE INTEGRALMENTE';
    if (t.includes('PARCIAL')) return 'ATINGE PARCIALMENTE';
    if (t.includes('NÃO') || t.includes('NAO')) return 'NÃO ATINGE';
    return nivel;
  };

  const isRealizada = observacao.is_realizada ?? (observacao.observacao_realizada?.toLowerCase().includes('sim'));

  return (
    <div 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 29, 61, 0.75)',
        backdropFilter: 'blur(6px)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 9999,
        padding: '1.5rem'
      }} 
      onClick={onClose}
    >
      <div 
        className="animate-fade-in" 
        onClick={e => e.stopPropagation()}
        style={{
          background: '#ffffff',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '920px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
          overflow: 'hidden',
          zIndex: 10000
        }}
      >
        {/* Modal Header com Gradiente */}
        <div style={{
          background: 'linear-gradient(135deg, var(--color-primary-dark) 0%, var(--color-primary-mid) 100%)',
          color: '#ffffff',
          padding: '1.25rem 1.75rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          borderBottom: '3px solid var(--color-accent-green)'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.35rem' }}>
              <span style={{ fontSize: '0.72rem', backgroundColor: 'var(--color-accent-green)', color: '#ffffff', padding: '0.15rem 0.55rem', borderRadius: '4px', textTransform: 'uppercase', fontWeight: 800 }}>
                {observacao.ano_formativo || 'Formação'}
              </span>
              {observacao.semestre && (
                <span style={{ fontSize: '0.72rem', backgroundColor: 'rgba(255,255,255,0.25)', color: '#ffffff', padding: '0.15rem 0.55rem', borderRadius: '4px', fontWeight: 700 }}>
                  📅 {observacao.semestre}
                </span>
              )}
              <span style={{ fontSize: '0.72rem', backgroundColor: isRealizada ? 'rgba(255,255,255,0.2)' : '#fee2e2', color: isRealizada ? '#ffffff' : '#b91c1c', padding: '0.15rem 0.55rem', borderRadius: '4px', fontWeight: 700 }}>
                {isRealizada ? '✓ Observação Realizada' : '⚠️ Não Realizada'}
              </span>
              {observacao.modalidade_feedback && (
                <span style={{ fontSize: '0.72rem', backgroundColor: 'rgba(255,255,255,0.15)', color: '#e0e7ff', padding: '0.15rem 0.55rem', borderRadius: '4px', fontWeight: 600 }}>
                  {observacao.modalidade_feedback}
                </span>
              )}
            </div>
            <h2 style={{ fontSize: '1.35rem', fontWeight: 700, margin: '0.2rem 0', color: '#ffffff' }}>
              {observacao.nome_cursista || 'Cursista'}
            </h2>
            <p style={{ margin: 0, color: 'rgba(255, 255, 255, 0.8)', fontSize: '0.82rem' }}>
              {observacao.email_cursista} • {observacao.componente || 'Componente'} (Modalidade da Observação: {observacao.modalidade || 'Docente'})
            </p>
          </div>

          <button 
            onClick={onClose}
            aria-label="Fechar"
            style={{ 
              background: 'rgba(255, 255, 255, 0.15)', 
              border: 'none', 
              color: '#ffffff', 
              borderRadius: '50%', 
              width: '34px', 
              height: '34px', 
              cursor: 'pointer', 
              fontSize: '1.25rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background 0.2s ease'
            }}
          >
            &times;
          </button>
        </div>

        {/* Modal Body com Rolagem Interna */}
        <div style={{ padding: '1.75rem', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '1.3rem' }}>
          
          {/* Destaque de Temática & Referência da Observação */}
          {observacao.tema && (
            <div style={{ backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '12px', padding: '1rem 1.25rem' }}>
              <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#1e40af', fontWeight: 800, marginBottom: '0.25rem' }}>
                🎯 Temática & Referência da Observação Pedagógica
              </div>
              <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--color-primary-dark)' }}>
                {observacao.tema}
              </div>
            </div>
          )}

          {/* Informações de Vínculo, Formulário e Datas */}
          <div style={{ backgroundColor: '#f8fafc', padding: '1rem 1.25rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.85rem', fontSize: '0.85rem' }}>
              <div>
                <span style={{ color: 'var(--color-text-muted)', display: 'block', fontSize: '0.75rem' }}>👨‍🏫 Formador Responsável:</span>
                <strong style={{ color: 'var(--color-primary-dark)' }}>{observacao.nome_formador || 'Não informado'}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--color-text-muted)', display: 'block', fontSize: '0.75rem' }}>🤝 Tutor / NRE:</span>
                <strong style={{ color: 'var(--color-primary-dark)' }}>
                  {observacao.tutor_responsavel ? (
                    <>
                      {observacao.tutor_responsavel}
                      {(observacao.nre_tutor || observacao.nre_exe) && (
                        <span style={{ fontWeight: 600, color: 'var(--color-text-muted)' }}>
                          {' '}({observacao.nre_tutor || observacao.nre_exe})
                        </span>
                      )}
                    </>
                  ) : (
                    observacao.nre_exe || 'NRE Geral'
                  )}
                </strong>
              </div>
              <div>
                <span style={{ color: 'var(--color-text-muted)', display: 'block', fontSize: '0.75rem' }}>📅 Data da Prática:</span>
                <strong>{formatDatePtBr(observacao.data_pratica || observacao.data_observacao)}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--color-text-muted)', display: 'block', fontSize: '0.75rem' }}>🗣️ Data do Feedback:</span>
                <strong>{formatDatePtBr(observacao.data_feedback)}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--color-text-muted)', display: 'block', fontSize: '0.75rem' }}>📝 Data/Hora de Preenchimento (Formulário):</span>
                <strong style={{ color: '#0369a1' }}>{formatDatePtBr(observacao.carimbo || observacao.data_observacao, true)}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--color-text-muted)', display: 'block', fontSize: '0.75rem' }}>🏷️ Modalidade da Observação:</span>
                <strong>{observacao.modalidade || 'Docentes'}</strong>
              </div>
            </div>
          </div>

          {/* Links de Vídeo e Planejamento */}
          <div>
            <h4 style={{ fontSize: '0.88rem', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '0.6rem', color: 'var(--color-primary-dark)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              🔗 Links & Evidências Audiovisuais
            </h4>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
              {observacao.link_gravacao_pratica ? (
                <a 
                  href={observacao.link_gravacao_pratica} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="btn-primary"
                  style={{ fontSize: '0.82rem', padding: '0.5rem 1rem', display: 'inline-flex', alignItems: 'center', gap: '0.4rem', textDecoration: 'none' }}
                >
                  ▶️ Assistir Gravação da Aula (YouTube)
                </a>
              ) : (
                <span style={{ fontSize: '0.8rem', color: '#94a3b8', fontStyle: 'italic', padding: '0.4rem 0' }}>Sem link de vídeo da aula</span>
              )}

              {observacao.link_planejamento && (
                <a 
                  href={observacao.link_planejamento} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="btn-secondary"
                  style={{ fontSize: '0.82rem', padding: '0.5rem 1rem', display: 'inline-flex', alignItems: 'center', gap: '0.4rem', textDecoration: 'none', backgroundColor: '#f1f5f9', color: '#1e293b' }}
                >
                  📄 Abrir Documento PDP (Planejamento)
                </a>
              )}

              {observacao.link_gravacao_feedback && (
                <a 
                  href={observacao.link_gravacao_feedback} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="btn-secondary"
                  style={{ fontSize: '0.82rem', padding: '0.5rem 1rem', display: 'inline-flex', alignItems: 'center', gap: '0.4rem', textDecoration: 'none', backgroundColor: '#e0e7ff', color: '#3730a3' }}
                >
                  🗣️ Gravação do Feedback Formativo
                </a>
              )}
            </div>
          </div>

          {/* Níveis Pedagógicos Avaliados */}
          {isRealizada ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1rem' }}>
              {/* Planejamento */}
              <div style={{ backgroundColor: '#ffffff', padding: '1.1rem', borderRadius: '10px', border: '1px solid #e2e8f0', borderLeft: '4px solid var(--color-accent-blue)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <strong style={{ fontSize: '0.88rem', color: 'var(--color-primary-dark)' }}>📝 Nível do Planejamento</strong>
                  <span className={`badge-nivel ${getNivelBadgeClass(observacao.nivel_planejamento)}`}>
                    {formatNivelLabel(observacao.nivel_planejamento)}
                  </span>
                </div>
                <p style={{ fontSize: '0.85rem', color: 'var(--color-text-main)', whiteSpace: 'pre-wrap', lineHeight: '1.5', margin: 0 }}>
                  {observacao.evidencias_planejamento || 'Nenhuma evidência textual detalhada registrada.'}
                </p>
              </div>

              {/* Prática */}
              <div style={{ backgroundColor: '#ffffff', padding: '1.1rem', borderRadius: '10px', border: '1px solid #e2e8f0', borderLeft: '4px solid var(--color-accent-green)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <strong style={{ fontSize: '0.88rem', color: 'var(--color-primary-dark)' }}>🏫 Nível da Prática em Sala</strong>
                  <span className={`badge-nivel ${getNivelBadgeClass(observacao.nivel_pratica)}`}>
                    {formatNivelLabel(observacao.nivel_pratica)}
                  </span>
                </div>
                <p style={{ fontSize: '0.85rem', color: 'var(--color-text-main)', whiteSpace: 'pre-wrap', lineHeight: '1.5', margin: 0 }}>
                  {observacao.evidencias_pratica || 'Nenhuma evidência textual detalhada registrada.'}
                </p>
              </div>
            </div>
          ) : (
            /* Justificativa caso Não Realizada */
            <div style={{ padding: '1.25rem', backgroundColor: '#fef2f2', borderRadius: '10px', borderLeft: '4px solid #ef4444' }}>
              <h4 style={{ color: '#b91c1c', marginBottom: '0.5rem', fontSize: '0.95rem' }}>⚠️ Observação Não Realizada</h4>
              <p style={{ fontSize: '0.85rem', color: '#7f1d1d', margin: '0 0 0.5rem 0' }}>
                <b>Justificativa:</b> {observacao.justificativa_nao_realizada || 'Sem justificativa preenchida.'}
              </p>
              {observacao.contexto_justificativa && (
                <p style={{ fontSize: '0.85rem', color: '#7f1d1d', margin: '0 0 0.5rem 0' }}>
                  <b>Contexto / Situação:</b> {observacao.contexto_justificativa}
                </p>
              )}
              {observacao.data_agendamento && (
                <p style={{ fontSize: '0.85rem', color: '#7f1d1d', margin: 0 }}>
                  <b>Data de Reagendamento:</b> {observacao.data_agendamento}
                </p>
              )}
            </div>
          )}

          {/* Combinados Formativos em Destaque Especial */}
          {observacao.combinados && (
            <div style={{ padding: '1.25rem', backgroundColor: '#ecfdf5', border: '1px solid #6ee7b7', borderRadius: '12px' }}>
              <h4 style={{ color: '#065f46', marginBottom: '0.4rem', fontSize: '0.92rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                🤝 Combinados Realizados no Feedback Formativo
              </h4>
              <p style={{ fontSize: '0.88rem', color: '#047857', whiteSpace: 'pre-wrap', lineHeight: '1.5', margin: 0 }}>
                {observacao.combinados}
              </p>
            </div>
          )}

          {/* Proposições e Sugestões do Formador */}
          {observacao.proposicoes_sugestoes && (
            <div style={{ padding: '1.1rem 1.25rem', backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '12px' }}>
              <h4 style={{ color: '#1e40af', marginBottom: '0.4rem', fontSize: '0.92rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                💡 Proposições & Sugestões para Aperfeiçoamento
              </h4>
              <p style={{ fontSize: '0.85rem', color: '#1d4ed8', whiteSpace: 'pre-wrap', lineHeight: '1.5', margin: 0 }}>
                {observacao.proposicoes_sugestoes}
              </p>
            </div>
          )}

          {/* Questionamentos Propositivos */}
          {observacao.questionamentos_propositivos && (
            <div style={{ padding: '1.1rem 1.25rem', backgroundColor: '#faf5ff', border: '1px solid #e9d5ff', borderRadius: '12px' }}>
              <h4 style={{ color: '#6b21a8', marginBottom: '0.4rem', fontSize: '0.92rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                ❓ Questionamentos Propositivos do Formador
              </h4>
              <p style={{ fontSize: '0.85rem', color: '#7e22ce', whiteSpace: 'pre-wrap', lineHeight: '1.5', margin: 0 }}>
                {observacao.questionamentos_propositivos}
              </p>
            </div>
          )}

          {/* Reflexões Gerais */}
          {observacao.reflexoes_gerais && (
            <div style={{ padding: '1rem 1.25rem', backgroundColor: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
              <h4 style={{ color: 'var(--color-primary-dark)', marginBottom: '0.4rem', fontSize: '0.88rem' }}>
                📝 Informações e Reflexões Adicionais
              </h4>
              <p style={{ fontSize: '0.85rem', color: 'var(--color-text-main)', whiteSpace: 'pre-wrap', lineHeight: '1.5', margin: 0 }}>
                {observacao.reflexoes_gerais}
              </p>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div style={{
          padding: '1rem 1.75rem',
          backgroundColor: '#f8fafc',
          borderTop: '1px solid #e2e8f0',
          display: 'flex',
          justifyContent: 'flex-end',
          gap: '0.75rem'
        }}>
          <button 
            className="btn-secondary" 
            onClick={onClose} 
            style={{ padding: '0.5rem 1.5rem', fontWeight: 600 }}
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
