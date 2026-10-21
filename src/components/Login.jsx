import React, { useState } from 'react';
import { auth, googleProvider, isConfigured as isFirebaseConfigured } from '../firebase';
import { supabase, isConfigured as isSupabaseConfigured } from '../supabase';
import { signInWithPopup } from 'firebase/auth';

export default function Login({ onLoginSuccess }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Executar Login Real com a Conta Institucional Google
  const handleGoogleLogin = async () => {
    setLoading(true);
    setError('');
    try {
      if (isSupabaseConfigured && supabase) {
        const { error: supAuthErr } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            queryParams: {
              hd: 'escola.pr.gov.br'
            },
            redirectTo: window.location.origin
          }
        });
        if (supAuthErr) throw supAuthErr;
        return;
      }

      if (isFirebaseConfigured && auth) {
        const result = await signInWithPopup(auth, googleProvider);
        const user = result.user;
        
        if (user && user.email) {
          onLoginSuccess({
            email: user.email,
            displayName: user.displayName || 'Usuário Google',
            photoURL: user.photoURL || '',
            uid: user.uid
          });
        } else {
          throw new Error("Não foi possível obter o e-mail institucional do Google.");
        }
      } else {
        throw new Error("Provedor de Autenticação não configurado.");
      }
    } catch (err) {
      console.error("Erro no login:", err);
      if (err.code === 'auth/popup-blocked') {
        setError('O pop-up de login foi bloqueado pelo seu navegador. Por favor, libere pop-ups para este site.');
      } else if (err.code === 'auth/popup-closed-by-user') {
        setError('A janela de login foi fechada antes de concluir o processo.');
      } else {
        setError(err.message || 'Falha ao conectar com o Google Auth institucional.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      width: '100vw',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#001d3d',
      backgroundImage: `
        radial-gradient(circle at 15% 20%, rgba(0, 114, 188, 0.35) 0%, transparent 45%),
        radial-gradient(circle at 85% 80%, rgba(0, 152, 74, 0.25) 0%, transparent 45%),
        radial-gradient(circle at 50% 50%, rgba(0, 45, 92, 0.8) 0%, transparent 70%),
        linear-gradient(135deg, #001226 0%, #001d3d 50%, #002d5c 100%)
      `,
      padding: '1.5rem',
      position: 'relative',
      overflow: 'hidden',
      boxSizing: 'border-box',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif'
    }}>

      {/* ── GRÁFICOS EDUCACIONAIS NO FUNDO (SVG) ────────────────── */}
      
      {/* 1. Gráfico de Evolução Pedagógica e Curvas de Desempenho (Topo Direito) */}
      <svg
        style={{
          position: 'absolute',
          top: '-5%',
          right: '-5%',
          width: '520px',
          height: '520px',
          opacity: 0.16,
          pointerEvents: 'none'
        }}
        viewBox="0 0 500 500"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <circle cx="250" cy="250" r="220" stroke="#0072bc" strokeWidth="2" strokeDasharray="6 6" />
        <circle cx="250" cy="250" r="160" stroke="#00984a" strokeWidth="1.5" />
        <circle cx="250" cy="250" r="100" stroke="#ffffff" strokeWidth="1" strokeDasharray="4 4" />
        {/* Curva de gráfico de aprendizagem */}
        <path d="M 50 400 Q 150 380 220 280 T 380 180 T 450 110" stroke="#0072bc" strokeWidth="4" fill="none" />
        <path d="M 50 420 Q 180 390 260 250 T 420 120" stroke="#00984a" strokeWidth="3" fill="none" strokeDasharray="8 4" />
        {/* Pontos de dados nos picos */}
        <circle cx="220" cy="280" r="6" fill="#0072bc" />
        <circle cx="380" cy="180" r="7" fill="#00984a" />
        <circle cx="450" cy="110" r="8" fill="#f59e0b" />
      </svg>

      {/* 2. Gráfico de Barras Educacionais e Métricas (Fundo Inferior Esquerdo) */}
      <svg
        style={{
          position: 'absolute',
          bottom: '-6%',
          left: '-4%',
          width: '480px',
          height: '420px',
          opacity: 0.14,
          pointerEvents: 'none'
        }}
        viewBox="0 0 450 400"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Eixo de coordenadas */}
        <line x1="40" y1="340" x2="420" y2="340" stroke="#ffffff" strokeWidth="2" />
        <line x1="40" y1="50" x2="40" y2="340" stroke="#ffffff" strokeWidth="2" />
        {/* Barras estatísticas crescentes */}
        <rect x="70" y="240" width="34" height="100" rx="4" fill="#0072bc" />
        <rect x="130" y="190" width="34" height="150" rx="4" fill="#00984a" />
        <rect x="190" y="140" width="34" height="200" rx="4" fill="#0072bc" />
        <rect x="250" y="90" width="34" height="250" rx="4" fill="#f59e0b" />
        <rect x="310" y="60" width="34" height="280" rx="4" fill="#00984a" />
        {/* Malha pontilhada (dot matrix pedagógica) */}
        <g opacity="0.6">
          <circle cx="70" cy="60" r="3" fill="#ffffff" />
          <circle cx="100" cy="60" r="3" fill="#ffffff" />
          <circle cx="130" cy="60" r="3" fill="#ffffff" />
          <circle cx="70" cy="90" r="3" fill="#ffffff" />
          <circle cx="100" cy="90" r="3" fill="#ffffff" />
          <circle cx="130" cy="90" r="3" fill="#ffffff" />
        </g>
      </svg>

      {/* 3. Ícones Educacionais Flutuantes em Vetor (Capelo, Livro, Bússola) */}
      <div style={{
        position: 'absolute',
        top: '12%',
        left: '8%',
        fontSize: '2.8rem',
        opacity: 0.12,
        pointerEvents: 'none',
        transform: 'rotate(-12deg)'
      }}>
        🎓
      </div>

      <div style={{
        position: 'absolute',
        bottom: '15%',
        right: '10%',
        fontSize: '3.2rem',
        opacity: 0.12,
        pointerEvents: 'none',
        transform: 'rotate(15deg)'
      }}>
        📖
      </div>

      <div style={{
        position: 'absolute',
        top: '25%',
        right: '25%',
        fontSize: '2.4rem',
        opacity: 0.1,
        pointerEvents: 'none'
      }}>
        📈
      </div>

      {/* ── CARD PRINCIPAL (SPLIT CARD - MODELO IMAGEM 4) ────────── */}
      <div style={{
        width: '100%',
        maxWidth: '960px',
        backgroundColor: '#ffffff',
        borderRadius: '20px',
        boxShadow: '0 25px 60px -15px rgba(0, 18, 38, 0.6), 0 0 0 1px rgba(255, 255, 255, 0.15)',
        overflow: 'hidden',
        display: 'flex',
        flexWrap: 'wrap',
        minHeight: '500px',
        position: 'relative',
        zIndex: 10
      }}>

        {/* ── METADE ESQUERDA: APRESENTAÇÃO INSTITUCIONAL & DESIGN ──── */}
        <div style={{
          flex: '1 1 420px',
          background: 'linear-gradient(135deg, #001d3d 0%, #002d5c 55%, #0072bc 100%)',
          color: '#ffffff',
          padding: '2.75rem 2.5rem',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          position: 'relative',
          overflow: 'hidden'
        }}>
          {/* Círculos e grafismos translúcidos no interior do card esquerdo */}
          <div style={{
            position: 'absolute',
            top: '-60px',
            right: '-60px',
            width: '220px',
            height: '220px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(255, 255, 255, 0.15) 0%, transparent 70%)',
            pointerEvents: 'none'
          }} />
          <div style={{
            position: 'absolute',
            bottom: '-40px',
            left: '-40px',
            width: '180px',
            height: '180px',
            borderRadius: '50%',
            border: '2px solid rgba(255, 255, 255, 0.08)',
            pointerEvents: 'none'
          }} />

          {/* Topo: Brasão / Logo Institucional */}
          <div style={{ position: 'relative', zIndex: 2 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
              <img
                src="/brasao_parana.svg"
                alt="Brasão do Paraná"
                style={{ width: '42px', height: 'auto', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))' }}
                onError={(e) => { e.currentTarget.style.display = 'none'; }}
              />
              <div>
                <div style={{ fontSize: '0.82rem', fontWeight: 800, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                  Governo do Estado do Paraná
                </div>
                <div style={{ fontSize: '0.72rem', color: 'rgba(255, 255, 255, 0.85)', letterSpacing: '0.02em' }}>
                  Secretaria de Estado da Educação · SEED/PR
                </div>
              </div>
            </div>
          </div>

          {/* Centro: Boas-vindas e Identidade da Plataforma */}
          <div style={{ margin: '2rem 0', position: 'relative', zIndex: 2 }}>
            <h1 style={{
              margin: '0 0 0.75rem 0',
              fontSize: '2.1rem',
              fontWeight: 800,
              lineHeight: 1.15,
              letterSpacing: '-0.02em'
            }}>
              Olá, seja bem-vindo!
            </h1>
            <p style={{
              margin: '0 0 1.25rem 0',
              fontSize: '0.92rem',
              color: 'rgba(255, 255, 255, 0.9)',
              lineHeight: 1.5,
              maxWidth: '360px'
            }}>
              Plataforma Integrada de Gestão e Acompanhamento Pedagógico do Estágio Probatório Docente.
            </p>

            {/* Badges de Destaque das Ferramentas */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.8rem', color: 'rgba(255,255,255,0.92)' }}>
                <span style={{ backgroundColor: 'rgba(0, 152, 74, 0.35)', color: '#4ade80', padding: '0.2rem 0.5rem', borderRadius: '6px', fontWeight: 700 }}>✓</span>
                <span>Acompanhamento Pedagógico dos Cursistas</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.8rem', color: 'rgba(255,255,255,0.92)' }}>
                <span style={{ backgroundColor: 'rgba(0, 114, 188, 0.35)', color: '#60a5fa', padding: '0.2rem 0.5rem', borderRadius: '6px', fontWeight: 700 }}>✓</span>
                <span>Observação do Tutor e Ações Formativas</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.8rem', color: 'rgba(255,255,255,0.92)' }}>
                <span style={{ backgroundColor: 'rgba(245, 158, 11, 0.35)', color: '#fcd34d', padding: '0.2rem 0.5rem', borderRadius: '6px', fontWeight: 700 }}>✓</span>
                <span>Ensalamento, Turmas e Remanejamentos</span>
              </div>
            </div>
          </div>

          {/* Rodapé do Painel Esquerdo */}
          <div style={{ fontSize: '0.72rem', color: 'rgba(255, 255, 255, 0.7)', position: 'relative', zIndex: 2 }}>
            Coordenação de Formação de Docentes e Equipe Gestoras (DAP/CFDEG)
          </div>
        </div>

        {/* ── METADE DIREITA: AÇÃO DE LOGIN & AUTENTICAÇÃO ─────────── */}
        <div style={{
          flex: '1 1 420px',
          backgroundColor: '#ffffff',
          padding: '3rem 2.5rem',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          boxSizing: 'border-box'
        }}>
          
          <div style={{ marginBottom: '2rem' }}>
            <h2 style={{
              margin: '0 0 0.5rem 0',
              fontSize: '1.6rem',
              fontWeight: 800,
              color: '#001d3d',
              letterSpacing: '-0.02em'
            }}>
              Acesso à Plataforma
            </h2>
            <p style={{
              margin: 0,
              fontSize: '0.88rem',
              color: '#64748b',
              lineHeight: 1.5
            }}>
              Utilize sua conta institucional educacional para entrar no sistema com segurança.
            </p>
          </div>

          {/* Mensagens de Erro / Alerta */}
          {error && (
            <div style={{
              backgroundColor: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: '8px',
              padding: '0.85rem 1rem',
              marginBottom: '1.5rem',
              fontSize: '0.82rem',
              color: '#b91c1c',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '0.5rem'
            }}>
              <span>⚠️</span>
              <span style={{ flex: 1, lineHeight: 1.4 }}>{error}</span>
            </div>
          )}

          {/* ── BOTÃO PRINCIPAL: LOGIN INSTITUCIONAL ───────────────── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <button
              onClick={handleGoogleLogin}
              disabled={loading}
              style={{
                width: '100%',
                backgroundColor: '#002d5c',
                backgroundImage: 'linear-gradient(135deg, #002d5c 0%, #001d3d 100%)',
                color: '#ffffff',
                border: 'none',
                borderRadius: '10px',
                padding: '1rem 1.4rem',
                fontSize: '0.98rem',
                fontWeight: 700,
                cursor: loading ? 'wait' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.85rem',
                boxShadow: '0 8px 20px rgba(0, 45, 92, 0.3)',
                transition: 'all 0.2s ease-in-out'
              }}
              onMouseEnter={(e) => {
                if (!loading) {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 10px 24px rgba(0, 45, 92, 0.4)';
                }
              }}
              onMouseLeave={(e) => {
                if (!loading) {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 8px 20px rgba(0, 45, 92, 0.3)';
                }
              }}
            >
              {/* Ícone oficial do Google */}
              <svg width="22" height="22" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
                />
                <path
                  fill="#34A853"
                  d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 10.04 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
                />
                <path
                  fill="#EA4335"
                  d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                />
              </svg>
              <span>{loading ? 'Conectando...' : 'Faça Login com sua Conta Institucional'}</span>
            </button>
            
            <div style={{ textAlign: 'center', fontSize: '0.78rem', color: '#64748b', marginTop: '0.4rem', lineHeight: 1.4 }}>
              Acesso exclusivo para contas autorizadas com domínio <strong>@escola.pr.gov.br</strong>
            </div>
          </div>

          {/* Informações Institucionais no Rodapé */}
          <div style={{ marginTop: '2.5rem', paddingTop: '1.25rem', borderTop: '1px solid #f1f5f9', textAlign: 'center' }}>
            <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
              Secretaria de Estado da Educação do Paraná · DDI/EPAP
            </span>
          </div>

        </div>

      </div>
    </div>
  );
}
