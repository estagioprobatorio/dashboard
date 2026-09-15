import React, { useState } from 'react';
import { auth, googleProvider, isConfigured } from '../firebase';
import { signInWithPopup } from 'firebase/auth';

export default function Login({ onLoginSuccess }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Para modo simulado (local offline)
  const [simulatedEmail, setSimulatedEmail] = useState('diretoria@escola.pr.gov.br');
  const [customEmail, setCustomEmail] = useState('');
  const [useCustom, setUseCustom] = useState(false);

  // Executar Login Real com o Google
  const handleGoogleLogin = async () => {
    setLoading(true);
    setError('');
    try {
      if (!isConfigured || !auth) {
        throw new Error("Firebase não configurado corretamente.");
      }
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      
      if (user && user.email) {
        // Envia o usuário autenticado para a App
        onLoginSuccess({
          email: user.email,
          displayName: user.displayName || 'Usuário Google',
          photoURL: user.photoURL || '',
          uid: user.uid
        });
      } else {
        throw new Error("Não foi possível obter o e-mail do Google.");
      }
    } catch (err) {
      console.error("Erro no login:", err);
      // Tratamento de mensagens de erro comuns do Firebase Auth
      if (err.code === 'auth/popup-blocked') {
        setError('O pop-up de login foi bloqueado pelo seu navegador. Por favor, libere pop-ups para este site.');
      } else if (err.code === 'auth/popup-closed-by-user') {
        setError('A janela de login foi fechada antes de concluir o processo.');
      } else {
        setError(err.message || 'Falha ao conectar com o Google Auth.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Executar Login Simulado (Local Dev)
  const handleSimulatedLogin = (e) => {
    e.preventDefault();
    const emailToUse = useCustom ? customEmail : simulatedEmail;
    
    if (!emailToUse || !emailToUse.includes('@')) {
      setError('Por favor, digite um e-mail válido.');
      return;
    }

    onLoginSuccess({
      email: emailToUse.trim().toLowerCase(),
      displayName: 'Simulado (' + emailToUse.split('@')[0] + ')',
      photoURL: '',
      uid: 'simulated-uid-123',
      isSimulated: true
    });
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #001d3d 0%, #002d5c 50%, #0b3c5d 100%)',
      padding: '2rem',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Círculos decorativos de gradiente no fundo */}
      <div style={{ position: 'absolute', width: '400px', height: '400px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(50, 130, 184, 0.2) 0%, transparent 70%)', top: '-10%', left: '-10%', pointerEvents: 'none' }}></div>
      <div style={{ position: 'absolute', width: '500px', height: '500px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(15, 155, 15, 0.12) 0%, transparent 70%)', bottom: '-15%', right: '-10%', pointerEvents: 'none' }}></div>

      <div className="glass-panel animate-fade-in" style={{
        maxWidth: '480px',
        width: '100%',
        padding: '3rem 2.5rem',
        textAlign: 'center',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        background: 'rgba(255, 255, 255, 0.08)',
        boxShadow: '0 20px 50px rgba(0, 0, 0, 0.3)',
        borderRadius: '16px',
        backdropFilter: 'blur(20px)'
      }}>
        {/* Logo/Badge */}
        <span className="logo-badge" style={{ margin: '0 auto 1.5rem', display: 'block', backgroundColor: 'var(--color-accent-green)' }}>
          Estágio Probatório
        </span>

        {/* Título Principal */}
        <h1 style={{
          fontFamily: 'var(--font-header)',
          fontSize: '1.8rem',
          fontWeight: 800,
          color: 'var(--color-text-white)',
          lineHeight: '1.3',
          marginBottom: '0.75rem',
          textTransform: 'uppercase',
          letterSpacing: '-0.5px'
        }}>
          Painel de Gestão de Turmas
        </h1>
        
        <p style={{
          color: 'rgba(255, 255, 255, 0.7)',
          fontSize: '0.95rem',
          marginBottom: '2.5rem',
          fontWeight: 400
        }}>
          Portal de contatos e acompanhamento em tempo real para Formadores, Tutores, Técnicos e Administradores.
        </p>

        {error && (
          <div style={{
            backgroundColor: 'rgba(229, 62, 62, 0.15)',
            border: '1px solid rgba(229, 62, 62, 0.4)',
            color: '#feb2b2',
            padding: '0.75rem 1rem',
            borderRadius: '8px',
            fontSize: '0.85rem',
            fontWeight: 500,
            marginBottom: '1.5rem',
            textAlign: 'left'
          }}>
            {error}
          </div>
        )}

        {/* Seção de Login Online (Firebase Configurado) */}
        {isConfigured ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <button
              onClick={handleGoogleLogin}
              disabled={loading}
              className="btn-primary"
              style={{
                width: '100%',
                justifyContent: 'center',
                padding: '1rem',
                fontSize: '1rem',
                borderRadius: '8px',
                backgroundColor: 'var(--color-text-white)',
                color: 'var(--color-primary-dark)',
                border: 'none',
                boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#f1f5f9'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
              onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'var(--color-text-white)'; e.currentTarget.style.transform = 'translateY(0)'; }}
            >
              {loading ? (
                <span>Conectando...</span>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  {/* Ícone Simplificado do Google em SVG */}
                  <svg width="20" height="20" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                  </svg>
                  Entrar com o Google
                </div>
              )}
            </button>
            <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)' }}>
              Utilize o e-mail institucional para ter acesso automático às suas turmas.
            </span>
          </div>
        ) : (
          /* Modo de Simulação Local (Firebase Desconfigurado) */
          <div style={{
            backgroundColor: 'rgba(255,255,255,0.05)',
            border: '1px dashed rgba(255,255,255,0.15)',
            borderRadius: '10px',
            padding: '1.5rem',
            textAlign: 'left'
          }}>
            <h3 style={{ fontSize: '0.95rem', color: '#ffb300', marginBottom: '1rem', fontFamily: 'var(--font-header)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              ⚠️ MODO OFFLINE / LOCAL
            </h3>
            
            <form onSubmit={handleSimulatedLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                <span style={{ fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.75)', fontWeight: 600 }}>Escolha uma Função para Simular:</span>
                <select 
                  className="filter-select"
                  value={simulatedEmail}
                  onChange={e => {
                    setSimulatedEmail(e.target.value);
                    setUseCustom(false);
                    setError('');
                  }}
                  style={{ backgroundColor: '#1a334e', border: '1px solid rgba(255,255,255,0.2)', color: '#fff' }}
                >
                  <option value="diretoria@escola.pr.gov.br">Admin (Visualiza e Edita Tudo)</option>
                  <option value="liziani_scariot@escola.pr.gov.br">Técnico (Visualiza Tudo)</option>
                  
                  {/* Exemplos de Tutores da planilha original */}
                  <option value="dulce.carpes@escola.pr.gov.br">Tutor: Dulce Carpes</option>
                  <option value="sirleyjeremias@escola.pr.gov.br">Tutor: Sirley Jeremias</option>
                  
                  {/* Exemplos de Formadores da planilha original */}
                  <option value="osmar.bugalski@escola.pr.gov.br">Formador: Osmar Bugalski</option>
                  <option value="carolina.linhar@escola.pr.gov.br">Formador: Carolina Linhar</option>
                  <option value="lucilene.kunhavalik@escola.pr.gov.br">Formador: Lucilene Kunhavalik</option>
                </select>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: '0.2rem 0' }}>
                <input 
                  type="checkbox" 
                  id="custom" 
                  checked={useCustom}
                  onChange={e => { setUseCustom(e.target.checked); setError(''); }}
                  style={{ cursor: 'pointer' }}
                />
                <label htmlFor="custom" style={{ fontSize: '0.75rem', color: '#fff', cursor: 'pointer' }}>Outro e-mail específico (Simulador RBAC):</label>
              </div>

              {useCustom && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                  <input 
                    type="text" 
                    placeholder="Digite qualquer e-mail da planilha..." 
                    className="filter-input"
                    value={customEmail}
                    onChange={e => setCustomEmail(e.target.value)}
                    style={{ backgroundColor: '#1a334e', border: '1px solid rgba(255,255,255,0.2)', color: '#fff' }}
                  />
                </div>
              )}

              <button 
                type="submit" 
                className="btn-primary" 
                style={{
                  width: '100%',
                  justifyContent: 'center',
                  backgroundColor: 'var(--color-accent-green)',
                  color: '#fff',
                  padding: '0.8rem',
                  borderRadius: '6px',
                  border: 'none',
                  fontWeight: 700,
                  marginTop: '0.5rem'
                }}
              >
                Simular Acesso
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
