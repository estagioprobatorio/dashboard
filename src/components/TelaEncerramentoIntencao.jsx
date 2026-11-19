import React, { useState } from 'react';
import brasaoParana from '../assets/brasao_parana.svg';

export default function TelaEncerramentoIntencao({ userEmail, onLogout }) {
  const [copiado, setCopiado] = useState(false);

  const emailDestino = 'estagioprobatorio@escola.pr.gov.br';
  const assunto = encodeURIComponent('[Estágio Probatório] Dúvida / Solicitação - Intenção de Vagas 2027');
  const corpo = encodeURIComponent(
    `Prezada Coordenação do Estágio Probatório,\n\n` +
    `Gostaria de registrar uma solicitação referente à Intenção de Vagas 2027.\n\n` +
    `-- DADOS DO CURSISTA --\n` +
    `E-mail institucional: ${userEmail || ''}\n` +
    `Nome Completo: \n` +
    `CPF: \n` +
    `RG: \n` +
    `Linha Funcional (LF): \n` +
    `Município / NRE: \n` +
    `Componente Curricular: \n\n` +
    `-- DÚVIDA / JUSTIFICATIVA --\n` +
    `[Descreva aqui sua dúvida, justificativa ou pedido de ajuste]\n`
  );

  const mailtoLink = `mailto:${emailDestino}?subject=${assunto}&body=${corpo}`;

  const handleCopiarEmail = async () => {
    try {
      await navigator.clipboard.writeText(emailDestino);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 3000);
    } catch (e) {
      // Fallback simples
      const textArea = document.createElement('textarea');
      textArea.value = emailDestino;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 3000);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1.5rem',
      backgroundColor: '#f1f5f9',
      fontFamily: 'Inter, system-ui, -apple-system, sans-serif'
    }}>
      <div style={{
        maxWidth: '680px',
        width: '100%',
        backgroundColor: '#ffffff',
        borderRadius: '16px',
        boxShadow: '0 10px 30px -5px rgba(0, 0, 0, 0.08), 0 4px 12px -2px rgba(0, 0, 0, 0.04)',
        border: '1px solid #e2e8f0',
        overflow: 'hidden'
      }}>
        {/* Top Header Institucional */}
        <div style={{
          backgroundColor: '#0c2340',
          padding: '1.5rem 2rem',
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
          borderBottom: '3px solid #00984a'
        }}>
          {brasaoParana && (
            <img 
              src={brasaoParana} 
              alt="Brasão do Paraná" 
              style={{ width: '48px', height: 'auto', filter: 'brightness(0) invert(1)' }} 
            />
          )}
          <div>
            <h1 style={{
              margin: 0,
              color: '#ffffff',
              fontSize: '1.15rem',
              fontWeight: 700,
              letterSpacing: '-0.01em'
            }}>
              Governo do Estado do Paraná · SEED/PR
            </h1>
            <p style={{
              margin: '0.2rem 0 0 0',
              color: '#94a3b8',
              fontSize: '0.85rem'
            }}>
              Diretoria de Educação · Programa de Estágio Probatório Docente
            </p>
          </div>
        </div>

        {/* Corpo Principal */}
        <div style={{ padding: '2.5rem 2rem' }}>
          {/* Badge de Status */}
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.4rem 0.9rem',
            backgroundColor: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: '9999px',
            color: '#b91c1c',
            fontSize: '0.82rem',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
            marginBottom: '1.25rem'
          }}>
            <span style={{ fontSize: '1rem' }}>🔒</span> Prazo Encerrado
          </div>

          <h2 style={{
            margin: '0 0 0.75rem 0',
            color: '#0f172a',
            fontSize: '1.65rem',
            fontWeight: 800,
            lineHeight: 1.25
          }}>
            Sistema de Intenção de Vagas Encerrado
          </h2>

          <p style={{
            margin: '0 0 1.5rem 0',
            color: '#475569',
            fontSize: '1rem',
            lineHeight: 1.6
          }}>
            O prazo oficial para manifestação de preferência de turno e horário formativo para o 
            <strong> 1º Semestre de 2027</strong> foi encerrado em 
            <strong style={{ color: '#0f172a' }}> 19 de novembro de 2026, pontualmente às 12h00</strong>.
          </p>

          {/* Card Informativo com Garantia */}
          <div style={{
            backgroundColor: '#f0fdf4',
            border: '1px solid #bbf7d0',
            borderRadius: '12px',
            padding: '1rem 1.25rem',
            marginBottom: '1.75rem',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '0.75rem'
          }}>
            <span style={{ fontSize: '1.35rem', lineHeight: 1 }}>✅</span>
            <div style={{ fontSize: '0.88rem', color: '#166534', lineHeight: 1.55 }}>
              <strong>Já realizou o envio antes das 12h00?</strong><br />
              Sua intenção de vaga está gravada e confirmada na base oficial da SEED-PR. Ela será considerada integralmente para o planejamento das turmas de 2027.
            </div>
          </div>

          {/* Seção de Contato e Dúvidas */}
          <div style={{
            backgroundColor: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            padding: '1.5rem',
            marginBottom: '1.5rem'
          }}>
            <h3 style={{
              margin: '0 0 0.5rem 0',
              color: '#1e293b',
              fontSize: '1.05rem',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              <span>✉️</span> Precisa de suporte ou ficou com alguma dúvida?
            </h3>
            <p style={{
              margin: '0 0 1rem 0',
              color: '#64748b',
              fontSize: '0.9rem',
              lineHeight: 1.5
            }}>
              Caso não tenha conseguido realizar sua opção dentro do prazo ou precise de orientações sobre sua vida funcional no Estágio Probatório, entre em contato diretamente com a equipe responsável:
            </p>

            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: '#ffffff',
              border: '1px solid #cbd5e1',
              borderRadius: '8px',
              padding: '0.65rem 0.9rem',
              marginBottom: '1.25rem',
              flexWrap: 'wrap',
              gap: '0.5rem'
            }}>
              <span style={{
                fontFamily: 'monospace',
                fontSize: '0.95rem',
                fontWeight: 700,
                color: '#0f2d59'
              }}>
                {emailDestino}
              </span>
              <button
                type="button"
                onClick={handleCopiarEmail}
                style={{
                  padding: '0.4rem 0.8rem',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  backgroundColor: copiado ? '#16a34a' : '#e2e8f0',
                  color: copiado ? '#ffffff' : '#334155',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                {copiado ? '✓ Copiado!' : 'Copiar e-mail'}
              </button>
            </div>

            {/* Botão de Enviar E-mail Direto */}
            <a
              href={mailtoLink}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                width: '100%',
                boxSizing: 'border-box',
                padding: '0.85rem 1.25rem',
                backgroundColor: '#00984a',
                color: '#ffffff',
                textDecoration: 'none',
                fontWeight: 700,
                fontSize: '0.95rem',
                borderRadius: '8px',
                textAlign: 'center',
                boxShadow: '0 2px 8px rgba(0, 152, 74, 0.25)',
                transition: 'background-color 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#007a3b'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#00984a'}
            >
              <span>📧</span> Abrir Aplicativo de E-mail para Enviar Solicitação
            </a>

            <div style={{
              marginTop: '0.85rem',
              fontSize: '0.78rem',
              color: '#94a3b8',
              textAlign: 'center'
            }}>
              Ao enviar o e-mail, informe: Nome Completo, CPF, RG, Linha Funcional e Município/NRE.
            </div>
          </div>

          {/* Rodapé do Usuário Logado */}
          {userEmail && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingTop: '1rem',
              borderTop: '1px solid #f1f5f9',
              fontSize: '0.82rem',
              color: '#64748b'
            }}>
              <div>
                Conectado como: <strong style={{ color: '#334155' }}>{userEmail}</strong>
              </div>
              {onLogout && (
                <button
                  type="button"
                  onClick={onLogout}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#dc2626',
                    cursor: 'pointer',
                    fontSize: '0.82rem',
                    fontWeight: 600,
                    textDecoration: 'underline'
                  }}
                >
                  Sair / Trocar de conta
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
