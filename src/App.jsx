import React, { useState, useEffect, useMemo } from 'react';
import { database, auth, isConfigured } from './firebase';
import { ref, onValue } from 'firebase/database';
import { onAuthStateChanged, signOut } from 'firebase/auth';

// Importando Listas de Permissões Estáticas
import { DEFAULT_ADMINS, DEFAULT_TECNICOS } from './config_roles';

// Importando componentes
import Login from './components/Login';
import Panorama from './components/Panorama';
import ContatoFormadores from './components/ContatoFormadores';
import ContatoCursistas from './components/ContatoCursistas';
import DadosTutoria from './components/DadosTutoria';
import AdminPanel from './components/AdminPanel';
import Movimentacoes from './components/Movimentacoes';

// Importando dados iniciais locais
import fallbackData from './data_fallback.json';

export default function App() {
  const [activeTab, setActiveTab] = useState('panorama');
  const [records, setRecords] = useState(fallbackData);
  const [isLoading, setIsLoading] = useState(false);
  const [firebaseActive, setFirebaseActive] = useState(false);

  // Estados de Autenticação e RBAC
  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState(null); // 'admin', 'tecnico', 'tutor', 'formador', 'unauthorized'
  const [authLoading, setAuthLoading] = useState(isConfigured ? true : false);

  // 1. Resolver o papel (Role) do usuário com base no e-mail
  const resolveUserRole = (email, dataBase) => {
    if (!email) return 'unauthorized';
    const cleanEmail = email.trim().toLowerCase();

    // Regra 1: Administradores Padrão
    if (DEFAULT_ADMINS.map(e => e.toLowerCase()).includes(cleanEmail)) {
      return 'admin';
    }

    // Regra 2: Técnicos Padrão
    if (DEFAULT_TECNICOS.map(e => e.toLowerCase()).includes(cleanEmail)) {
      return 'tecnico';
    }

    // Regra 3: Tutores (Verifica se está cadastrado como email_tutor na base)
    const isTutor = dataBase.some(item => 
      item.email_tutor && item.email_tutor.trim().toLowerCase() === cleanEmail
    );
    if (isTutor) return 'tutor';

    // Regra 4: Formadores (Verifica se está cadastrado como e-mail_formador na base)
    const isFormador = dataBase.some(item => 
      (item['e-mail_formador'] || item.e_mail_formador || '').trim().toLowerCase() === cleanEmail
    );
    if (isFormador) return 'formador';

    return 'unauthorized';
  };

  // 2. Efeito para monitorar autenticação real no Firebase
  useEffect(() => {
    if (isConfigured && auth) {
      const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
        if (firebaseUser && firebaseUser.email) {
          setUser({
            email: firebaseUser.email,
            displayName: firebaseUser.displayName || 'Usuário Google',
            photoURL: firebaseUser.photoURL || ''
          });
          
          // Resolve papel com base no e-mail e nos dados atualmente carregados
          const role = resolveUserRole(firebaseUser.email, records);
          setUserRole(role);
        } else {
          setUser(null);
          setUserRole(null);
        }
        setAuthLoading(false);
      });

      return () => unsubscribe();
    }
  }, [records]);

  // 3. Efeito para assinar banco de dados em tempo real
  useEffect(() => {
    if (isConfigured && database) {
      setIsLoading(true);
      const dbRef = ref(database, 'cursistas');
      
      const unsubscribe = onValue(dbRef, (snapshot) => {
        const val = snapshot.val();
        if (val) {
          const firebaseRecords = Object.values(val);
          setRecords(firebaseRecords);
          setFirebaseActive(true);
        } else {
          setRecords(fallbackData);
          setFirebaseActive(false);
        }
        setIsLoading(false);
      }, (error) => {
        console.error("Erro ao escutar Firebase:", error);
        setFirebaseActive(false);
        setIsLoading(false);
      });

      return () => unsubscribe();
    }
  }, []);

  // Handler para Login Simulado (Local Mode) ou Callback de Login Real
  const handleLoginSuccess = (authenticatedUser) => {
    setUser(authenticatedUser);
    const role = resolveUserRole(authenticatedUser.email, records);
    setUserRole(role);
  };

  // Logout
  const handleLogout = async () => {
    if (isConfigured && auth) {
      await signOut(auth);
    }
    setUser(null);
    setUserRole(null);
    setActiveTab('panorama');
  };

  // Callback de edição local do Admin
  const handleLocalUpdate = (updatedRecord) => {
    setRecords(prev => {
      return prev.map(item => {
        const itemKey = `${item.cgm}_${item.turma}`;
        const updatedKey = `${updatedRecord.cgm}_${updatedRecord.turma}`;
        if (itemKey === updatedKey) {
          return updatedRecord;
        }
        return item;
      });
    });
  };

  // 4. Filtrar Registros Dinamicamente para as abas baseado no Perfil (RBAC)
  const filteredRecordsForView = useMemo(() => {
    if (!user || !userRole) return [];
    
    // Admins e Técnicos veem tudo sem filtros
    if (userRole === 'admin' || userRole === 'tecnico') {
      return records;
    }

    const email = user.email.toLowerCase();

    // Formadores veem apenas registros pertencentes a eles
    if (userRole === 'formador') {
      return records.filter(item => {
        const formadorEmail = (item['e-mail_formador'] || item.e_mail_formador || '').trim().toLowerCase();
        return formadorEmail === email;
      });
    }

    // Tutores veem apenas registros pertencentes a eles
    if (userRole === 'tutor') {
      return records.filter(item => {
        const tutorEmail = (item.email_tutor || '').trim().toLowerCase();
        return tutorEmail === email;
      });
    }

    return [];
  }, [records, user, userRole]);

  // Carregamento da autenticação
  if (authLoading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--color-bg-light)', gap: '1rem' }}>
        <div className="pulse-dot" style={{ width: '30px', height: '30px' }}></div>
        <span style={{ fontWeight: 600, color: 'var(--color-primary-dark)', fontFamily: 'var(--font-header)' }}>Verificando autenticação Google...</span>
      </div>
    );
  }

  // 5. Se não estiver logado, exibe tela de login
  if (!user) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  // 6. Se e-mail logado for não autorizado, exibe bloqueio
  if (userRole === 'unauthorized') {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #001d3d 0%, #002d5c 100%)', padding: '2rem' }}>
        <div className="glass-panel animate-fade-in" style={{ maxWidth: '500px', padding: '3rem 2.5rem', textAlign: 'center', color: '#fff', background: 'rgba(255, 255, 255, 0.08)' }}>
          <div className="kpi-icon-container" style={{ margin: '0 auto 1.5rem', width: '70px', height: '70px', backgroundColor: 'rgba(229, 62, 62, 0.2)', color: '#feb2b2' }}>
            <i className="lucide-shield-x" style={{ fontSize: '1.8rem' }}></i>
          </div>
          <h2 style={{ fontFamily: 'var(--font-header)', marginBottom: '1rem' }}>Acesso Não Autorizado</h2>
          <p style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '0.95rem', lineHeight: '1.5', marginBottom: '2rem' }}>
            O seu e-mail do Google <b style={{ color: '#fff' }}>{user.email}</b> não foi encontrado no cadastro de Formadores, Tutores ou administradores do programa.
          </p>
          <button className="btn-secondary" onClick={handleLogout} style={{ width: '100%', padding: '0.8rem', fontWeight: 700 }}>
            Fazer Logout / Trocar de Conta
          </button>
        </div>
      </div>
    );
  }

  // Renderizar aba ativa com dados filtrados
  const renderTabContent = () => {
    if (isLoading) {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '400px', gap: '1rem' }}>
          <div className="pulse-dot" style={{ width: '25px', height: '25px' }}></div>
          <span style={{ fontWeight: 600, color: 'var(--color-primary-dark)' }}>Sincronizando banco de dados...</span>
        </div>
      );
    }

    switch (activeTab) {
      case 'panorama':
        return <Panorama data={filteredRecordsForView} />;
      case 'formadores':
        return <ContatoFormadores data={filteredRecordsForView} />;
      case 'cursistas':
        return <ContatoCursistas data={filteredRecordsForView} />;
      case 'tutoria':
        return <DadosTutoria data={filteredRecordsForView} />;
      case 'movimentacoes':
        return <Movimentacoes userEmail={user.email} userRole={userRole} />;
      case 'admin':
        // Apenas Admin acessa o painel completo e envia dados completos (unfiltered) para buscas globais
        return userRole === 'admin' 
          ? <AdminPanel data={records} onLocalUpdate={handleLocalUpdate} userRole={userRole} /> 
          : <Panorama data={filteredRecordsForView} />;
      default:
        return <Panorama data={filteredRecordsForView} />;
    }
  };

  return (
    <div className="app-container">
      {/* Banner Superior */}
      <header className="header-banner">
        <div className="banner-content">
          <div className="banner-title-area">
            <span className="logo-badge">Estágio Probatório</span>
            <h1 className="banner-title">Painel de Gestão de Turmas</h1>
            <span className="banner-subtitle">
              Ambiente de Monitoramento e Acompanhamento
            </span>
          </div>
          
          {/* Perfil do Usuário Logado */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: 'rgba(255,255,255,0.06)', padding: '0.75rem 1.25rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }}>
            {user.photoURL && (
              <img 
                src={user.photoURL} 
                alt="Foto de perfil" 
                style={{ width: '38px', height: '38px', borderRadius: '50%', border: '2px solid var(--color-accent-green)' }} 
              />
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.1rem' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#fff' }}>{user.displayName}</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <span className="logo-badge" style={{ fontSize: '0.65rem', padding: '0.1rem 0.4rem', backgroundColor: userRole === 'admin' ? '#e53e3e' : userRole === 'tecnico' ? 'var(--color-primary-mid)' : 'var(--color-accent-green)' }}>
                  {userRole.toUpperCase()}
                </span>
                <span style={{ fontSize: '0.75rem', opacity: 0.7 }}>{user.email}</span>
              </div>
            </div>
            <button 
              onClick={handleLogout} 
              style={{
                background: 'none',
                border: 'none',
                color: '#feb2b2',
                cursor: 'pointer',
                padding: '0.25rem',
                fontSize: '0.8rem',
                fontWeight: 600,
                marginLeft: '0.5rem',
                textDecoration: 'underline'
              }}
            >
              Sair
            </button>
          </div>
        </div>
      </header>

      {/* Menu de Abas baseadas em permissões */}
      <nav className="tab-navigation">
        <div className="tabs-container">
          <button 
            className={`tab-btn ${activeTab === 'panorama' ? 'active' : ''}`}
            onClick={() => setActiveTab('panorama')}
          >
            📊 Panorama Geral
          </button>
          
          <button 
            className={`tab-btn ${activeTab === 'formadores' ? 'active' : ''}`}
            onClick={() => setActiveTab('formadores')}
          >
            🎓 Contato Formadores
          </button>
          
          <button 
            className={`tab-btn ${activeTab === 'cursistas' ? 'active' : ''}`}
            onClick={() => setActiveTab('cursistas')}
          >
            👥 Contato Cursistas
          </button>
          
          <button 
            className={`tab-btn ${activeTab === 'tutoria' ? 'active' : ''}`}
            onClick={() => setActiveTab('tutoria')}
          >
            🤝 Dados Tutoria/Turmas
          </button>
          
          {/* Aba de Movimentações: Escondida de Formadores */}
          {userRole !== 'formador' && (
            <button 
              className={`tab-btn ${activeTab === 'movimentacoes' ? 'active' : ''}`}
              onClick={() => setActiveTab('movimentacoes')}
            >
              🔄 Movimentações
            </button>
          )}

          {/* Aba de Admin: Apenas Administradores */}
          {userRole === 'admin' && (
            <button 
              className={`tab-btn ${activeTab === 'admin' ? 'active' : ''}`}
              onClick={() => setActiveTab('admin')}
              style={{ marginLeft: 'auto', borderLeft: '1px solid var(--color-card-border)', backgroundColor: 'rgba(229, 62, 62, 0.05)' }}
            >
              🛡️ Painel Admin
            </button>
          )}
        </div>
      </nav>

      {/* Área Principal de Conteúdo */}
      <main className="main-content">
        {renderTabContent()}
      </main>

      {/* Rodapé */}
      <footer style={{ backgroundColor: 'var(--color-primary-dark)', color: 'rgba(255,255,255,0.6)', padding: '1.5rem', textAlign: 'center', fontSize: '0.8rem', marginTop: 'auto', borderTop: '4px solid var(--color-accent-green)' }}>
        <p>© 2026 Estágio Probatório - Secretaria da Educação do Paraná (SEED-PR)</p>
        <p style={{ marginTop: '0.25rem', fontSize: '0.75rem' }}>Acesso controlado via Google Workspace (RBAC) & Sincronização em Tempo Real</p>
      </footer>
    </div>
  );
}
