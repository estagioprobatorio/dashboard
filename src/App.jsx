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
import ListaTurmas from './components/ListaTurmas';
import AmbienteCursista from './components/AmbienteCursista';

// Importando dados iniciais locais
import fallbackData from './data_fallback.json';

export default function App() {
  const [activeTab, setActiveTab] = useState('panorama');
  const [records, setRecords] = useState(fallbackData);
  const [movimentacoesList, setMovimentacoesList] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [firebaseActive, setFirebaseActive] = useState(false);

  // Estados de Autenticação, RBAC e Simulação
  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState(null); // 'admin', 'tecnico', 'tutor', 'formador', 'cursista', 'unauthorized'
  const [simulatedRole, setSimulatedRole] = useState(null); // Para Admin simular outros perfis
  const [authLoading, setAuthLoading] = useState(isConfigured ? true : false);

  // Papel ativo (Real ou Simulado)
  const effectiveRole = simulatedRole || userRole;

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

    // Regra 5: Cursistas (Verifica se está cadastrado como e-mail do cursista)
    const isCursista = dataBase.some(item => {
      const cursistaEmail = (item['e-mail'] || item.email || item.email_cursista || '').trim().toLowerCase();
      return cursistaEmail === cleanEmail;
    });
    if (isCursista) return 'cursista';

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
          // Constrói lista a partir do Firebase usando os VALORES do snapshot
          // A chave de cada nó já é EP-[cgm]_[turma], então Object.values é seguro
          const rawRecords = Object.values(val).filter(r => r && (r.cgm || r.cod_cursista || r['e-mail'] || r.e_mail));

          // Deduplicação por chave única (CGM, Código do Cursista ou E-mail)
          const seenKeys = new Map();
          rawRecords.forEach(r => {
            const key = r.cgm ? String(r.cgm).replace(/\D/g, '').trim() : (r.cod_cursista || r['e-mail'] || r.e_mail);
            if (key && !seenKeys.has(key)) {
              seenKeys.set(key, r);
            }
          });

          const firebaseRecords = Array.from(seenKeys.values());
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
  // oldKey: chave "cgm_turma" do registro ANTES da edição — necessário para remanejamentos
  const handleLocalUpdate = (updatedRecord, oldKey = null) => {
    setRecords(prev => {
      const updatedKey = `${updatedRecord.cgm}_${updatedRecord.turma}`;

      // Se a turma mudou, remove o registro antigo pela oldKey antes de atualizar
      let filtered = prev;
      if (oldKey && oldKey !== updatedKey) {
        filtered = prev.filter(item => `${item.cgm}_${item.turma}` !== oldKey);
      }

      // Atualiza o registro pela nova chave (ou adiciona se não existia ainda)
      const exists = filtered.some(item => `${item.cgm}_${item.turma}` === updatedKey);
      if (exists) {
        return filtered.map(item => {
          if (`${item.cgm}_${item.turma}` === updatedKey) return updatedRecord;
          return item;
        });
      } else {
        // Remanejamento: o registro passou a ter uma chave nova — insere no lugar certo
        return [...filtered, updatedRecord];
      }
    });
  };

  // 4. Filtrar Registros Dinamicamente para as abas baseado no Perfil Ativo (Real ou Simulado)
  const filteredRecordsForView = useMemo(() => {
    if (!user || !effectiveRole) return [];
    
    // Admins e Técnicos na visão real veem tudo
    if (effectiveRole === 'admin' || effectiveRole === 'tecnico') {
      return records;
    }

    const email = user.email.toLowerCase();

    // Formadores veem apenas registros pertencentes a eles
    if (effectiveRole === 'formador') {
      return records.filter(item => {
        const formadorEmail = (item['e-mail_formador'] || item.e_mail_formador || '').trim().toLowerCase();
        return formadorEmail === email;
      });
    }

    // Tutores veem apenas registros pertencentes a eles
    if (effectiveRole === 'tutor') {
      return records.filter(item => {
        const tutorEmail = (item.email_tutor || '').trim().toLowerCase();
        return tutorEmail === email;
      });
    }

    // Cursistas veem seus próprios registros
    if (effectiveRole === 'cursista') {
      return records.filter(item => {
        const cursistaEmail = (item['e-mail'] || item.email || item.email_cursista || '').trim().toLowerCase();
        return cursistaEmail === email;
      });
    }

    return [];
  }, [records, user, effectiveRole]);

  // Handler para novas solicitações enviadas pelo Cursista
  const handleNovaMovimentacao = (novaSolicitacao) => {
    setMovimentacoesList(prev => [novaSolicitacao, ...prev]);
  };

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
            O seu e-mail do Google <b style={{ color: '#fff' }}>{user.email}</b> não foi encontrado no cadastro de Formadores, Tutores, Cursistas ou Administradores do programa.
          </p>
          <button className="btn-secondary" onClick={handleLogout} style={{ width: '100%', padding: '0.8rem', fontWeight: 700 }}>
            Fazer Logout / Trocar de Conta
          </button>
        </div>
      </div>
    );
  }

  // Renderizar aba ativa com dados filtrados pelo perfil ativo
  const renderTabContent = () => {
    if (isLoading) {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '400px', gap: '1rem' }}>
          <div className="pulse-dot" style={{ width: '25px', height: '25px' }}></div>
          <span style={{ fontWeight: 600, color: 'var(--color-primary-dark)' }}>Sincronizando banco de dados...</span>
        </div>
      );
    }

    // Se o perfil ativo for Cursista e a aba ativa não for uma das abas permitidas, renderiza o Ambiente Cursista
    if (effectiveRole === 'cursista' || activeTab === 'cursista_ambiente') {
      return (
        <AmbienteCursista 
          userEmail={user.email} 
          records={records} 
          movimentacoes={movimentacoesList}
          onNovaMovimentacao={handleNovaMovimentacao}
        />
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
      case 'turmas':
        return <ListaTurmas data={filteredRecordsForView} />;
      case 'movimentacoes':
        return <Movimentacoes userEmail={user.email} userRole={effectiveRole} />;
      case 'admin':
        return (userRole === 'admin' || userRole === 'tecnico')
          ? <AdminPanel data={records} onLocalUpdate={handleLocalUpdate} userRole={userRole} /> 
          : <Panorama data={filteredRecordsForView} />;
      default:
        return <Panorama data={filteredRecordsForView} />;
    }
  };

  return (
    <div className="app-container">
      {/* Banner Superior com Logo do Brasão do Paraná */}
      <header className="header-banner">
        <div className="banner-content">
          <div className="banner-title-area" style={{ display: 'flex', alignItems: 'center', gap: '1.2rem' }}>
            <img 
              src="/brasao_parana.svg" 
              alt="Brasão do Estado do Paraná" 
              style={{ height: '62px', width: 'auto', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))' }} 
            />
            <div>
              <span className="logo-badge">Secretaria da Educação do Paraná • SEED/PR</span>
              <h1 className="banner-title" style={{ marginTop: '0.2rem' }}>Estágio Probatório - Gestão de Turmas</h1>
              <span className="banner-subtitle">
                Ambiente de Acompanhamento, Formadores, Tutores & Cursistas
              </span>
            </div>
          </div>
          
          {/* Perfil do Usuário Logado */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: 'rgba(255,255,255,0.08)', padding: '0.75rem 1.25rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.12)' }}>
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
                <span className="logo-badge" style={{ fontSize: '0.65rem', padding: '0.1rem 0.4rem', backgroundColor: userRole === 'admin' ? '#e53e3e' : userRole === 'tecnico' ? 'var(--color-primary-mid)' : userRole === 'cursista' ? '#fbbf24' : 'var(--color-accent-green)', color: userRole === 'cursista' ? '#1e293b' : '#fff' }}>
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

      {/* Barra de Simulação de Papel para Administradores / Técnicos */}
      {(userRole === 'admin' || userRole === 'tecnico') && (
        <div style={{
          backgroundColor: '#fffbeb',
          color: '#92400e',
          borderBottom: '2px solid #fde68a',
          padding: '0.5rem 1.5rem',
          display: 'flex',
          alignItems: 'center',
          justify: 'space-between',
          fontSize: '0.85rem',
          fontWeight: 600,
          boxShadow: '0 2px 4px rgba(0,0,0,0.03)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              🎭 <b>Simular Visualização de Perfil:</b>
            </span>
            <select
              value={simulatedRole || ''}
              onChange={e => {
                const role = e.target.value;
                setSimulatedRole(role || null);
                if (role === 'cursista') setActiveTab('cursista_ambiente');
                else if (role === 'formador' || role === 'tutor') setActiveTab('panorama');
                else setActiveTab('panorama');
              }}
              style={{
                padding: '0.3rem 0.7rem',
                borderRadius: '6px',
                border: '1px solid #f59e0b',
                backgroundColor: 'white',
                fontSize: '0.82rem',
                fontWeight: 700,
                color: '#92400e',
                cursor: 'pointer'
              }}
            >
              <option value="">-- Visão Admin Real (Painel Completo) --</option>
              <option value="formador">🎓 Simular Ambiente do Formador</option>
              <option value="tutor">👤 Simular Ambiente do Tutor</option>
              <option value="cursista">🧑‍🎓 Simular Ambiente do Cursista</option>
            </select>
          </div>

          {simulatedRole && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <span style={{ fontSize: '0.8rem', color: '#b45309' }}>
                Exibindo dashboard filtrado como: <b>{simulatedRole.toUpperCase()}</b>
              </span>
              <button
                onClick={() => { setSimulatedRole(null); setActiveTab('panorama'); }}
                style={{
                  backgroundColor: '#92400e',
                  color: 'white',
                  border: 'none',
                  padding: '0.25rem 0.75rem',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '0.78rem',
                  fontWeight: 700
                }}
              >
                Voltar à Visão Admin Real
              </button>
            </div>
          )}
        </div>
      )}

      {/* Menu de Abas adaptado ao Perfil Ativo */}
      <nav className="tab-navigation">
        <div className="tabs-container">
          {effectiveRole === 'cursista' ? (
            <>
              <button 
                className={`tab-btn ${activeTab === 'cursista_ambiente' ? 'active' : ''}`}
                onClick={() => setActiveTab('cursista_ambiente')}
              >
                🎓 Minha Turma & Remanejamento
              </button>
              <button 
                className={`tab-btn ${activeTab === 'movimentacoes' ? 'active' : ''}`}
                onClick={() => setActiveTab('movimentacoes')}
              >
                🔄 Minhas Solicitações
              </button>
            </>
          ) : (
            <>
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
              
              {effectiveRole !== 'formador' && (
                <button 
                  className={`tab-btn ${activeTab === 'tutoria' ? 'active' : ''}`}
                  onClick={() => setActiveTab('tutoria')}
                >
                  🤝 Dados Tutoria
                </button>
              )}

              <button 
                className={`tab-btn ${activeTab === 'turmas' ? 'active' : ''}`}
                onClick={() => setActiveTab('turmas')}
              >
                🏫 Lista de Turmas
              </button>
              
              <button 
                className={`tab-btn ${activeTab === 'movimentacoes' ? 'active' : ''}`}
                onClick={() => setActiveTab('movimentacoes')}
              >
                🔄 Movimentações
              </button>

              {/* Aba de Admin: Apenas para Admin Real */}
              {userRole === 'admin' && !simulatedRole && (
                <button 
                  className={`tab-btn ${activeTab === 'admin' ? 'active' : ''}`}
                  onClick={() => setActiveTab('admin')}
                  style={{ marginLeft: 'auto', borderLeft: '1px solid var(--color-card-border)', backgroundColor: 'rgba(229, 62, 62, 0.05)' }}
                >
                  🛡️ Painel Admin
                </button>
              )}
            </>
          )}
        </div>
      </nav>

      {/* Área Principal de Conteúdo */}
      <main className="main-content">
        {renderTabContent()}
      </main>

      {/* Rodapé com o Brasão do Paraná */}
      <footer style={{ backgroundColor: 'var(--color-primary-dark)', color: 'rgba(255,255,255,0.7)', padding: '1.5rem', textAlign: 'center', fontSize: '0.8rem', marginTop: 'auto', borderTop: '4px solid var(--color-accent-green)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
        <img src="/brasao_parana.svg" alt="Brasão do Paraná" style={{ height: '36px', width: 'auto', opacity: 0.9 }} />
        <p>© 2026 Estágio Probatório - Secretaria da Educação do Estado do Paraná (SEED-PR)</p>
        <p style={{ fontSize: '0.75rem', opacity: 0.6 }}>Ambientes de Acesso por Perfil (RBAC Google Workspace) & Sincronização de Turmas</p>
      </footer>
    </div>
  );
}
