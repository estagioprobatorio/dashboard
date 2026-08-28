import React, { useState, useEffect, useMemo } from 'react';
import { database, auth, isConfigured as isFirebaseConfigured } from './firebase';
import { supabase, isConfigured as isSupabaseConfigured } from './supabase';
import { ref, onValue } from 'firebase/database';
import { onAuthStateChanged, signOut } from 'firebase/auth';

// Importando Listas de Permissões Estáticas
import { DEFAULT_ADMINS, DEFAULT_TECNICOS, DEFAULT_TUTORES } from './config_roles';

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
import tutoresFallback from './tutores_fallback.json';

export default function App() {
  const [activeTab, setActiveTab] = useState('panorama');
  const [records, setRecords] = useState(fallbackData);
  const [tutoresList, setTutoresList] = useState(tutoresFallback);
  const [movimentacoesList, setMovimentacoesList] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [firebaseActive, setFirebaseActive] = useState(false);

  // Estados de Autenticação, RBAC e Simulação
  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState(null); // 'admin', 'tecnico', 'tutor', 'formador', 'cursista', 'unauthorized'
  const [simulatedRole, setSimulatedRole] = useState(null); // Para Admin simular outros perfis
  const [authLoading, setAuthLoading] = useState(isFirebaseConfigured || isSupabaseConfigured ? true : false);

  // Papel ativo (Real ou Simulado)
  const effectiveRole = simulatedRole || userRole;

  // 2. Enriquecer os registros de cursistas com os dados da tabela de tutores se estiverem em branco na planilha de origem
  const enrichedRecords = useMemo(() => {
    const tutoresMap = new Map();
    tutoresList.forEach(t => {
      if (t.tutor_responsavel) {
        tutoresMap.set(t.tutor_responsavel.trim().toUpperCase(), t);
      }
    });

    const formatTimeOnly = (timeStr) => {
      if (!timeStr) return null;
      const str = String(timeStr).trim();
      const match = str.match(/\b\d{2}:\d{2}(:\d{2})?\b/);
      return match ? match[0].slice(0, 5) : str;
    };

    return records.map(r => {
      const tutorName = r.tutor_responsavel ? r.tutor_responsavel.trim().toUpperCase() : '';
      const tutorInfo = tutoresMap.get(tutorName);
      
      return {
        ...r,
        horario_inicial: formatTimeOnly(r.horario_inicial),
        horario_fim: formatTimeOnly(r.horario_fim),
        email_tutor: r.email_tutor || (tutorInfo ? tutorInfo.email_educ : null),
        telefone_tutor: r.telefone_tutor || (tutorInfo ? tutorInfo.telefone : null),
        nre_tutor: r.nre_tutor || (tutorInfo ? tutorInfo.nre_tutor : null),
        email_nre: r.email_nre || (tutorInfo ? tutorInfo.email_nre : null)
      };
    });
  }, [records, tutoresList]);

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

    // Regra 2.5: Tutores Padrão Estáticos (Fallback quando a planilha/banco está vazia de tutores)
    if (DEFAULT_TUTORES.map(e => e.toLowerCase()).includes(cleanEmail)) {
      return 'tutor';
    }

    // Regra 3: Tutores (Verifica se está cadastrado como email_educ na tabela/lista de tutores)
    const isTutor = tutoresList.some(item => 
      item.email_educ && item.email_educ.trim().toLowerCase() === cleanEmail
    );
    if (isTutor) return 'tutor';

    // Regra 4: Formadores (Verifica se está cadastrado como e-mail_formador na base)
    const isFormador = dataBase.some(item => 
      (item['e-mail_formador'] || item.e_mail_formador || item.email_formador || '').trim().toLowerCase() === cleanEmail
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

  // 2. Efeito para monitorar autenticação real no Firebase / Supabase
  useEffect(() => {
    if (isSupabaseConfigured && supabase) {
      // Supabase Auth Session
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session && session.user && session.user.email) {
          setUser({
            email: session.user.email,
            displayName: session.user.user_metadata?.full_name || 'Usuário Google',
            photoURL: session.user.user_metadata?.avatar_url || ''
          });
          setUserRole(resolveUserRole(session.user.email, enrichedRecords));
        }
        setAuthLoading(false);
      });

      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        if (session && session.user && session.user.email) {
          setUser({
            email: session.user.email,
            displayName: session.user.user_metadata?.full_name || 'Usuário Google',
            photoURL: session.user.user_metadata?.avatar_url || ''
          });
          setUserRole(resolveUserRole(session.user.email, enrichedRecords));
        } else if (!isFirebaseConfigured) {
          setUser(null);
          setUserRole(null);
        }
        setAuthLoading(false);
      });

      return () => subscription.unsubscribe();
    } else if (isFirebaseConfigured && auth) {
      const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
        if (firebaseUser && firebaseUser.email) {
          setUser({
            email: firebaseUser.email,
            displayName: firebaseUser.displayName || 'Usuário Google',
            photoURL: firebaseUser.photoURL || ''
          });
          setUserRole(resolveUserRole(firebaseUser.email, enrichedRecords));
        } else {
          setUser(null);
          setUserRole(null);
        }
        setAuthLoading(false);
      });

      return () => unsubscribe();
    }
  }, [enrichedRecords, tutoresList]);

  // 3. Efeito para carregar e assinar banco de dados (Prioridade: Supabase > Firebase > Fallback Local)
  useEffect(() => {
    if (isSupabaseConfigured && supabase) {
      setIsLoading(true);

      const fetchSupabaseRecords = async () => {
        try {
          let allData = [];
          let page = 0;
          const pageSize = 1000;
          let hasMore = true;

          // Criamos a Promise de busca paginada
          const fetchPromise = (async () => {
            while (hasMore) {
              const from = page * pageSize;
              const to = from + pageSize - 1;

              const { data, error } = await supabase
                .from('cursistas')
                .select('*')
                .range(from, to);

              if (error) throw error;

              if (data && data.length > 0) {
                allData = allData.concat(data);
                if (data.length < pageSize) {
                  hasMore = false;
                } else {
                  page++;
                }
              } else {
                hasMore = false;
              }
            }
            return allData;
          })();

          // Promise de Timeout (5 segundos)
          const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error("Timeout de conexão com o banco de dados (5s)")), 5000)
          );

          // Corrida entre a requisição e o timeout
          const resultData = await Promise.race([fetchPromise, timeoutPromise]);

          if (resultData && resultData.length > 0) {
            setRecords(resultData);
            setFirebaseActive(true); // Indica banco online ativo
          } else {
            console.log("Supabase vazio, mantendo dados locais/fallback.");
            setRecords(fallbackData);
          }
        } catch (err) {
          console.error("Erro ao carregar dados do Supabase:", err);
          console.warn("Usando banco de dados local/fallback devido ao erro/timeout.");
          setRecords(fallbackData);
        } finally {
          setIsLoading(false);
        }
      };

      const fetchSupabaseTutores = async () => {
        try {
          const { data, error } = await supabase
            .from('tutores')
            .select('*');
          if (error) throw error;
          if (data && data.length > 0) {
            setTutoresList(data);
          }
        } catch (err) {
          console.error("Erro ao carregar tutores do Supabase, usando fallback local:", err);
        }
      };

      fetchSupabaseRecords();
      fetchSupabaseTutores();

      // Assinatura de alterações em Tempo Real (PostgreSQL CDC) com Debounce de 2 segundos
      let debounceTimeout = null;
      const channel = supabase
        .channel('cursistas-realtime-changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'cursistas' }, (payload) => {
          console.log("Supabase Realtime event recebido (cursistas):", payload);
          if (debounceTimeout) clearTimeout(debounceTimeout);
          debounceTimeout = setTimeout(() => {
            fetchSupabaseRecords();
          }, 2000);
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'tutores' }, (payload) => {
          console.log("Supabase Realtime event recebido (tutores):", payload);
          fetchSupabaseTutores();
        })
        .subscribe();

      return () => {
        if (debounceTimeout) clearTimeout(debounceTimeout);
        supabase.removeChannel(channel);
      };
    } else if (isFirebaseConfigured && database) {
      setIsLoading(true);
      const dbRef = ref(database, 'cursistas');
      
      const unsubscribe = onValue(dbRef, (snapshot) => {
        const val = snapshot.val();
        if (val) {
          const rawRecords = Object.values(val).filter(r => r && (r.cgm || r.cod_cursista || r['e-mail'] || r.e_mail));
          const seenKeys = new Map();
          rawRecords.forEach(r => {
            const key = r.cgm ? String(r.cgm).replace(/\D/g, '').trim() : (r.cod_cursista || r['e-mail'] || r.e_mail);
            if (key && !seenKeys.has(key)) {
              seenKeys.set(key, r);
            }
          });
          setRecords(Array.from(seenKeys.values()));
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


  const handleLoginSuccess = (authenticatedUser) => {
    setUser(authenticatedUser);
    const role = resolveUserRole(authenticatedUser.email, enrichedRecords);
    setUserRole(role);
  };

  const handleLogout = async () => {
    if (isFirebaseConfigured && auth) {
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
      const updatedKey = `${updatedRecord.cgm}_${updatedRecord.turmas}`;

      // Se a turma mudou, remove o registro antigo pela oldKey antes de atualizar
      let filtered = prev;
      if (oldKey && oldKey !== updatedKey) {
        filtered = prev.filter(item => `${item.cgm}_${item.turmas}` !== oldKey);
      }

      // Atualiza o registro pela nova chave (ou adiciona se não existia ainda)
      const exists = filtered.some(item => `${item.cgm}_${item.turmas}` === updatedKey);
      if (exists) {
        return filtered.map(item => {
          if (`${item.cgm}_${item.turmas}` === updatedKey) return updatedRecord;
          return item;
        });
      } else {
        // Remanejamento: o registro passou a ter uma chave nova — insere no lugar certo
        return [...filtered, updatedRecord];
      }
    });
  };

  const [simulatedEmail, setSimulatedEmail] = useState('');

  const formadoresExemplo = useMemo(() => {
    const map = new Map();
    enrichedRecords.forEach(r => {
      const email = (r['e-mail_formador'] || r.e_mail_formador || r.email_formador || '').trim().toLowerCase();
      const nome = r.nome_formador;
      if (email && email.includes('@') && nome && !map.has(email)) {
        map.set(email, { email, nome });
      }
    });
    return Array.from(map.values()).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR', { sensitivity: 'base' }));
  }, [enrichedRecords]);

  const tutoresExemplo = useMemo(() => {
    const map = new Map();
    tutoresList.forEach(t => {
      const email = (t.email_educ || '').trim().toLowerCase();
      const rawName = t.tutor_responsavel || '';
      
      // Formata "NOME SOBRENOME" para "Nome Sobrenome" (Title Case)
      const nome = rawName
        .toLowerCase()
        .split(' ')
        .map(part => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ');

      if (email && email.includes('@') && nome && !map.has(email)) {
        map.set(email, { email, nome });
      }
    });
    return Array.from(map.values()).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR', { sensitivity: 'base' }));
  }, [tutoresList]);

  const cursistasExemplo = useMemo(() => {
    const map = new Map();
    enrichedRecords.forEach(r => {
      const email = (r['e-mail'] || r.email || r.email_cursista || '').trim().toLowerCase();
      const nome = r.nome_cursista;
      if (email && email.includes('@') && nome && !map.has(email)) {
        map.set(email, { email, nome });
      }
    });
    return Array.from(map.values()).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR', { sensitivity: 'base' }));
  }, [enrichedRecords]);

  // E-mail efetivo (Real ou do Exemplo Simulado)
  const effectiveEmail = useMemo(() => {
    if (!user) return '';
    if (!simulatedRole) return user.email;
    if (simulatedEmail) return simulatedEmail;
    
    if (simulatedRole === 'formador') return formadoresExemplo[0]?.email || user.email;
    if (simulatedRole === 'tutor') return tutoresExemplo[0]?.email || user.email;
    if (simulatedRole === 'cursista') return cursistasExemplo[0]?.email || user.email;
    
    return user.email;
  }, [user, simulatedRole, simulatedEmail, formadoresExemplo, tutoresExemplo, cursistasExemplo]);

  // 4. Filtrar Registros Dinamicamente para as abas baseado no Perfil Ativo (Real ou Simulado)
  const filteredRecordsForView = useMemo(() => {
    if (!user || !effectiveRole) return [];
    
    let result = [];

    // Admins, Técnicos e Tutores no seu login real (sem simulação ativa) possuem acesso a todas as informações
    if (!simulatedRole && (userRole === 'admin' || userRole === 'tecnico' || userRole === 'tutor')) {
      result = enrichedRecords;
    } else {
      const email = effectiveEmail.toLowerCase();

      // Formadores veem apenas registros pertencentes a eles
      if (effectiveRole === 'formador') {
        result = enrichedRecords.filter(item => {
          const formadorEmail = (item['e-mail_formador'] || item.e_mail_formador || item.email_formador || '').trim().toLowerCase();
          return formadorEmail === email;
        });
      }
      // Simulação do ambiente do Tutor: exibe apenas os cursistas/formadores pertencentes a esse tutor
      else if (effectiveRole === 'tutor') {
        const matchingTutores = tutoresList.filter(t => 
          (t.email_educ && t.email_educ.trim().toLowerCase() === email) ||
          (t.email_adm && t.email_adm.trim().toLowerCase() === email)
        );
        const tutorNames = new Set(matchingTutores.map(t => (t.tutor_responsavel || '').trim().toUpperCase()).filter(Boolean));

        result = enrichedRecords.filter(item => {
          const tutorEmail = (item.email_tutor || '').trim().toLowerCase();
          const tutorName = (item.tutor_responsavel || '').trim().toUpperCase();
          return tutorEmail === email || tutorNames.has(tutorName);
        });
      }
      // Cursistas (real ou simulado) veem apenas seus próprios registros
      else if (effectiveRole === 'cursista') {
        result = enrichedRecords.filter(item => {
          const cursistaEmail = (item['e-mail'] || item.email || item.email_cursista || '').trim().toLowerCase();
          return cursistaEmail === email;
        });
      }
    }

    // Sempre organizar os dados em ordem alfabética por nome do cursista
    return [...result].sort((a, b) => 
      (a.nome_cursista || '').localeCompare(b.nome_cursista || '', 'pt-BR', { sensitivity: 'base' })
    );
  }, [enrichedRecords, tutoresList, user, userRole, simulatedRole, effectiveRole, effectiveEmail]);

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

    // Se o perfil ativo for Cursista ou se a aba for de Cursista
    if (effectiveRole === 'cursista' || activeTab.startsWith('cursista_')) {
      const subTab = activeTab === 'cursista_solicitacoes' ? 'solicitacoes' : 'turma';
      return (
        <AmbienteCursista 
          userEmail={effectiveEmail} 
          records={enrichedRecords} 
          movimentacoes={movimentacoesList}
          onNovaMovimentacao={handleNovaMovimentacao}
          subTab={subTab}
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
        return <Movimentacoes userEmail={effectiveEmail} userRole={effectiveRole} tutorData={enrichedRecords.find(r => (r.email_tutor || '').toLowerCase() === effectiveEmail.toLowerCase())} />;
      case 'admin':
        return (userRole === 'admin' || userRole === 'tecnico')
          ? <AdminPanel data={enrichedRecords} onLocalUpdate={handleLocalUpdate} userRole={userRole} /> 
          : <Panorama data={filteredRecordsForView} />;
      default:
        return <Panorama data={filteredRecordsForView} />;
    }
  };

  return (
    <div className="app-container">
      {/* Banner Superior com Logo do Brasão do Paraná alinhado ao texto */}
      <header className="header-banner">
        <div className="banner-content">
          <div className="banner-brand-area">
            <img 
              src="/brasao_parana.svg" 
              alt="Brasão do Estado do Paraná" 
              style={{ height: '58px', width: 'auto', flexShrink: 0, filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))' }} 
            />
            <div className="banner-title-area">
              <span className="logo-badge">Secretaria da Educação do Paraná • SEED/PR</span>
              <h1 className="banner-title">Estágio Probatório - Gestão de Turmas</h1>
              <span className="banner-subtitle">
                Ambiente de Acompanhamento, Formadores, Tutores & Cursistas
              </span>
            </div>
          </div>
          
          {/* Perfil do Usuário Logado */}
          <div className="banner-user-card">
            {user.photoURL && (
              <img 
                src={user.photoURL} 
                alt="Foto de perfil" 
                style={{ width: '38px', height: '38px', borderRadius: '50%', border: '2px solid var(--color-accent-green)' }} 
              />
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.1rem' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#fff' }}>{user.displayName}</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                <span className="logo-badge" style={{ fontSize: '0.65rem', padding: '0.1rem 0.4rem', backgroundColor: userRole === 'admin' ? '#e53e3e' : userRole === 'tecnico' ? 'var(--color-primary-mid)' : userRole === 'cursista' ? '#fbbf24' : 'var(--color-accent-green)', color: userRole === 'cursista' ? '#1e293b' : '#fff' }}>
                  {userRole.toUpperCase()}
                </span>
                <span style={{ fontSize: '0.75rem', opacity: 0.8, wordBreak: 'break-all' }}>{user.email}</span>
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
                marginLeft: 'auto',
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
        <div className="simulator-bar">
          <div className="simulator-controls">
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              🎭 <b>Simular Visualização:</b>
            </span>
            <select
              value={simulatedRole || ''}
              onChange={e => {
                const role = e.target.value;
                setSimulatedRole(role || null);
                
                // Define um e-mail de exemplo padrão para evitar dropdown vazio/desalinhado
                if (role === 'formador' && formadoresExemplo.length > 0) {
                  setSimulatedEmail(formadoresExemplo[0].email);
                  setActiveTab('panorama');
                } else if (role === 'tutor' && tutoresExemplo.length > 0) {
                  setSimulatedEmail(tutoresExemplo[0].email);
                  setActiveTab('panorama');
                } else if (role === 'cursista' && cursistasExemplo.length > 0) {
                  setSimulatedEmail(cursistasExemplo[0].email);
                  setActiveTab('cursista_turma');
                } else {
                  setSimulatedEmail('');
                  setActiveTab('panorama');
                }
              }}
              style={{
                padding: '0.35rem 0.7rem',
                borderRadius: '6px',
                border: '1px solid #f59e0b',
                backgroundColor: 'white',
                fontSize: '0.82rem',
                fontWeight: 700,
                color: '#92400e',
                cursor: 'pointer',
                maxWidth: '100%'
              }}
            >
              <option value="">-- Visão Admin Real (Painel Completo) --</option>
              <option value="formador">🎓 Simular Ambiente do Formador</option>
              <option value="tutor">👤 Simular Ambiente do Tutor</option>
              <option value="cursista">🧑‍🎓 Simular Ambiente do Cursista</option>
            </select>

            {/* Seleção do Exemplo Específico de Formador, Tutor ou Cursista */}
            {simulatedRole === 'formador' && formadoresExemplo.length > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap', maxWidth: '100%' }}>
                <span style={{ fontSize: '0.8rem' }}>Exemplo:</span>
                <select
                  value={effectiveEmail}
                  onChange={e => setSimulatedEmail(e.target.value)}
                  style={{ padding: '0.3rem 0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.8rem', fontWeight: 600, maxWidth: '100%' }}
                >
                  {formadoresExemplo.map(f => (
                    <option key={f.email} value={f.email}>{f.nome} ({f.email})</option>
                  ))}
                </select>
              </div>
            )}

            {simulatedRole === 'tutor' && tutoresExemplo.length > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap', maxWidth: '100%' }}>
                <span style={{ fontSize: '0.8rem' }}>Exemplo:</span>
                <select
                  value={effectiveEmail}
                  onChange={e => setSimulatedEmail(e.target.value)}
                  style={{ padding: '0.3rem 0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.8rem', fontWeight: 600, maxWidth: '100%' }}
                >
                  {tutoresExemplo.map(t => (
                    <option key={t.email} value={t.email}>{t.nome} ({t.email})</option>
                  ))}
                </select>
              </div>
            )}

            {simulatedRole === 'cursista' && cursistasExemplo.length > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap', maxWidth: '100%' }}>
                <span style={{ fontSize: '0.8rem' }}>Exemplo:</span>
                <select
                  value={effectiveEmail}
                  onChange={e => setSimulatedEmail(e.target.value)}
                  style={{ padding: '0.3rem 0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.8rem', fontWeight: 600, maxWidth: '100%' }}
                >
                  {cursistasExemplo.slice(0, 50).map(c => (
                    <option key={c.email} value={c.email}>{c.nome} ({c.email})</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {simulatedRole && (
            <div className="simulator-info" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.8rem', color: '#b45309', wordBreak: 'break-all' }}>
                Simulando: <b>{simulatedRole.toUpperCase()}</b> ({effectiveEmail})
              </span>
              <button
                onClick={() => { setSimulatedRole(null); setSimulatedEmail(''); setActiveTab('panorama'); }}
                style={{
                  backgroundColor: '#92400e',
                  color: 'white',
                  border: 'none',
                  padding: '0.3rem 0.75rem',
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
                className={`tab-btn ${activeTab === 'cursista_turma' ? 'active' : ''}`}
                onClick={() => setActiveTab('cursista_turma')}
              >
                🏫 Minha Turma
              </button>
              <button 
                className={`tab-btn ${activeTab === 'cursista_solicitacoes' ? 'active' : ''}`}
                onClick={() => setActiveTab('cursista_solicitacoes')}
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
              
              {effectiveRole !== 'formador' && (
                <button 
                  className={`tab-btn ${activeTab === 'formadores' ? 'active' : ''}`}
                  onClick={() => setActiveTab('formadores')}
                >
                  🎓 Contato Formadores
                </button>
              )}
              
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
