import React, { useState, useEffect, useMemo } from 'react';
import { database, auth, isConfigured as isFirebaseConfigured } from './firebase';
import { supabase, isConfigured as isSupabaseConfigured } from './supabase';
import { ref, onValue } from 'firebase/database';
import { onAuthStateChanged, signOut } from 'firebase/auth';

// Importando Listas de Permissões Estáticas
import { DEFAULT_ADMINS, DEFAULT_TECNICOS, DEFAULT_TUTORES, SUPERADMINS_TUTOR_INSIGHTS } from './config_roles';

// Importando componentes
import Login from './components/Login';
import Panorama from './components/Panorama';
import ContatoFormadores from './components/ContatoFormadores';
import ContatoCursistas from './components/ContatoCursistas';
import DadosTutoria from './components/DadosTutoria';
import AdminPanel from './components/AdminPanel';
import ListaTurmas from './components/ListaTurmas';
import AmbienteCursista from './components/AmbienteCursista';
import ObservacaoPratica from './components/ObservacaoPratica';
import ObservacoesOverview from './components/ObservacoesOverview';
import AcompanhamentoObservacoesCards from './components/AcompanhamentoObservacoesCards';
import Concluintes from './components/Concluintes';
import Movimentacoes from './components/Movimentacoes';
import TutorInsightsDashboard from './components/TutorInsightsDashboard';
import DiarioFormativo from './components/DiarioFormativo';
import CentralDocumentos from './components/CentralDocumentos';
import BuscaGlobalPessoasModal from './components/BuscaGlobalPessoasModal';
import DossieCursistaModal from './components/DossieCursistaModal';
import { HistoricoTurmasContext } from './utils/HistoricoTurmasContext';

import { salvarObservacaoIntegrada, getObservacoesLocaisNovas } from './utils/observacoesSyncService';
import { normalizeString } from './utils/aiPedagogicalService';

// Importando dados iniciais locais
import fallbackData from './data_fallback.json';
import tutoresFallback from './tutores_fallback.json';
import observacoesFallback from './observacoes_fallback.json';

export default function App() {
  const [macroPilar, setMacroPilar] = useState('pedagogica'); // 'pedagogica' | 'administrativa'
  const [activeTab, setActiveTab] = useState('observacoes');
  const [showBuscaGlobal, setShowBuscaGlobal] = useState(false);
  const [cursistaDossieModal, setCursistaDossieModal] = useState(null);
  const [records, setRecords] = useState(fallbackData);
  const [tutoresList, setTutoresList] = useState(tutoresFallback);
  const [observacoesList, setObservacoesList] = useState(() => {
    const locais = getObservacoesLocaisNovas();
    return [...locais, ...observacoesFallback];
  });
  const [concluintesList, setConcluintesList] = useState([]);
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
        turma: r.turmas || r.turma,
        turmas: r.turmas || r.turma,
        cpf_cursista: r.cpf || r.cpf_cursista,
        cpf: r.cpf || r.cpf_cursista,
        link_classroom: r.link || r.link_classroom || r['Link Classroom'],
        link: r.link || r.link_classroom || r['Link Classroom'],
        email: r.email || r['e-mail'] || r.email_cursista,
        'e-mail': r.email || r['e-mail'] || r.email_cursista,
        email_formador: r.email_formador || r['e-mail_formador'] || r.e_mail_formador,
        'e-mail_formador': r.email_formador || r['e-mail_formador'] || r.e_mail_formador,
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

          if (allData && allData.length > 0) {
            console.log(`Supabase cursistas carregados: ${allData.length} registros.`);
            setRecords(allData);
            setFirebaseActive(true); // Indica banco online ativo
          } else {
            console.log("Supabase cursistas vazio, mantendo dados locais/fallback.");
            setRecords(fallbackData);
          }
        } catch (err) {
          console.error("Erro ao carregar dados do Supabase:", err);
          console.warn("Usando banco de dados local/fallback devido ao erro na conexão.");
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

      const fetchSupabaseObservacoes = async () => {
        try {
          // Busca a contagem exata e orquestra busca em blocos simultâneos
          const { count, error: countErr } = await supabase
            .from('observacoes_pratica')
            .select('*', { count: 'exact', head: true });

          if (countErr) throw countErr;

          const pageSize = 1000;
          const totalPages = Math.max(1, Math.ceil((count || 0) / pageSize));
          let allObs = [];
          const chunkSize = 5;

          for (let i = 0; i < totalPages; i += chunkSize) {
            const promises = [];
            for (let j = i; j < Math.min(i + chunkSize, totalPages); j++) {
              const from = j * pageSize;
              const to = from + pageSize - 1;
              promises.push(
                supabase
                  .from('observacoes_pratica')
                  .select('*')
                  .order('id', { ascending: true })
                  .range(from, to)
                  .then(res => {
                    if (res.error) throw res.error;
                    return res.data || [];
                  })
              );
            }
            const chunkResults = await Promise.all(promises);
            chunkResults.forEach(batch => {
              allObs = allObs.concat(batch);
            });
          }

          console.log(`Supabase observacoes_pratica carregadas com sucesso: ${allObs.length} registros no total.`);
          
          // Preserva observações recém-adicionadas localmente que possam estar pendentes de sincronização
          const locais = getObservacoesLocaisNovas();
          const dbIds = new Set(allObs.map(o => o.id_origem || o.id));
          const pendentesLocais = locais.filter(l => !dbIds.has(l.id_origem || l.id));

          setObservacoesList([...pendentesLocais, ...allObs]);
        } catch (err) {
          console.warn("Supabase: aviso ao carregar observacoes_pratica. Usando dados locais:", err);
        }
      };

      const fetchSupabaseMovimentacoes = async () => {
        try {
          const { data, error } = await supabase
            .from('movimentacoes')
            .select('*')
            .order('timestamp', { ascending: false });
          if (error) throw error;
          if (data && data.length > 0) {
            setMovimentacoesList(data);
          }
        } catch (err) {
          console.error("Erro ao carregar movimentações do Supabase:", err);
        }
      };

      const fetchSupabaseConcluintes = async () => {
        try {
          const { data, error } = await supabase
            .from('cursistas_concluintes')
            .select('*')
            .order('nome_cursista', { ascending: true });
          if (error) {
            // Se a tabela ainda não tiver sido criada no Supabase, captura sem quebrar
            console.log("Supabase cursistas_concluintes aviso/info:", error.message);
            return;
          }
          if (data && data.length > 0) {
            console.log(`Supabase cursistas_concluintes carregados: ${data.length} registros.`);
            setConcluintesList(data);
          }
        } catch (err) {
          console.warn("Aviso ao buscar cursistas_concluintes:", err);
        }
      };

      fetchSupabaseRecords();
      fetchSupabaseTutores();
      fetchSupabaseObservacoes();
      fetchSupabaseMovimentacoes();
      fetchSupabaseConcluintes();

      // Assinatura de alterações em Tempo Real (PostgreSQL CDC)
      let debounceCursistasTimeout = null;
      const channel = supabase
        .channel('dashboard-realtime-changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'cursistas' }, (payload) => {
          console.log("Supabase Realtime event recebido (cursistas):", payload);
          if (debounceCursistasTimeout) clearTimeout(debounceCursistasTimeout);
          debounceCursistasTimeout = setTimeout(() => {
            fetchSupabaseRecords();
          }, 1500);
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'tutores' }, (payload) => {
          console.log("Supabase Realtime event recebido (tutores):", payload);
          fetchSupabaseTutores();
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'observacoes_pratica' }, (payload) => {
          console.log("Supabase Realtime event recebido (observacoes_pratica):", payload);
          if (payload.eventType === 'INSERT' && payload.new) {
            setObservacoesList(prev => [
              payload.new,
              ...prev.filter(item => item.id !== payload.new.id && item.id_origem !== payload.new.id_origem)
            ]);
          } else if (payload.eventType === 'UPDATE' && payload.new) {
            setObservacoesList(prev => prev.map(item => item.id === payload.new.id ? { ...item, ...payload.new } : item));
          } else if (payload.eventType === 'DELETE' && payload.old) {
            setObservacoesList(prev => prev.filter(item => item.id !== payload.old.id));
          } else {
            fetchSupabaseObservacoes();
          }
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'movimentacoes' }, () => {
          fetchSupabaseMovimentacoes();
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'cursistas_concluintes' }, () => {
          console.log("Supabase Realtime event recebido (cursistas_concluintes)");
          fetchSupabaseConcluintes();
        })
        .subscribe();

      return () => {
        if (debounceCursistasTimeout) clearTimeout(debounceCursistasTimeout);
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

  // Callback para salvar e refletir nova observação em tempo real
  const handleNovaObservacao = async (novaObs) => {
    const salva = await salvarObservacaoIntegrada(novaObs);
    setObservacoesList(prev => [salva, ...prev]);
    return salva;
  };

  const [simulatedEmail, setSimulatedEmail] = useState('');

  // Histórico de turmas do cursista: visível apenas para Admin e Técnico (respeita simulação de perfil)
  const historicoTurmasCtx = useMemo(() => ({
    movimentacoes: movimentacoesList,
    canView: effectiveRole === 'admin' || effectiveRole === 'tecnico'
  }), [movimentacoesList, effectiveRole]);

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
    const obsMap = new Map();
    observacoesList.forEach(obs => {
      const email = (obs.email_cursista || '').trim().toLowerCase();
      if (email) {
        obsMap.set(email, (obsMap.get(email) || 0) + 1);
      }
    });

    enrichedRecords.forEach(r => {
      const email = (r['e-mail'] || r.email || r.email_cursista || '').trim().toLowerCase();
      const nome = r.nome_cursista;
      if (email && email.includes('@') && nome && !map.has(email)) {
        const totalObs = obsMap.get(email) || 0;
        map.set(email, { 
          email, 
          nome, 
          totalObs, 
          ano: r.ano_formativo || '1º Ano',
          turma: r.turmas || 'Turma Geral',
          componente: r.componente || r.componente_conc || 'Geral'
        });
      }
    });

    // Ordenação: primeiro os que possuem mais observações para testar gráficos e diagnóstico, depois alfabético
    return Array.from(map.values()).sort((a, b) => {
      if (b.totalObs !== a.totalObs) return b.totalObs - a.totalObs;
      return a.nome.localeCompare(b.nome, 'pt-BR', { sensitivity: 'base' });
    });
  }, [enrichedRecords, observacoesList]);

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

  // Checagem estrita de Superadmin para o painel Tutor Insight
  const isSuperAdminTutor = useMemo(() => {
    const list = (SUPERADMINS_TUTOR_INSIGHTS || []).map(e => e.trim().toLowerCase());
    const realEmail = (user?.email || '').trim().toLowerCase();
    const effEmail = (effectiveEmail || '').trim().toLowerCase();
    return list.includes(realEmail) || list.includes(effEmail);
  }, [user, effectiveEmail]);

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

  // 4.1 Filtrar Observações baseado no Perfil Ativo (Admin, Tutor, Formador, Cursista)
  const filteredObservacoesForView = useMemo(() => {
    if (!user || !effectiveRole) return [];

    // Admins, Técnicos e Tutores veem todas as observações
    if (!simulatedRole && (userRole === 'admin' || userRole === 'tecnico' || userRole === 'tutor')) {
      return observacoesList;
    }

    const email = (effectiveEmail || '').trim().toLowerCase();

    // Formador: vê observações realizadas por ele (por e-mail ou nome)
    if (effectiveRole === 'formador') {
      const matchingFormadores = enrichedRecords.filter(r => 
        (r['e-mail_formador'] || r.email_formador || '').trim().toLowerCase() === email
      );
      const formadorNames = new Set(matchingFormadores.map(r => normalizeString(r.nome_formador || '')).filter(Boolean));

      return observacoesList.filter(obs => {
        const obsFormadorEmail = (obs.email_formador || '').trim().toLowerCase();
        if (obsFormadorEmail && obsFormadorEmail === email) return true;
        const obsFormadorNome = normalizeString(obs.nome_formador || '');
        if (obsFormadorNome && formadorNames.has(obsFormadorNome)) return true;
        return false;
      });
    }

    // Tutor: vê observações dos cursistas pertencentes à sua tutoria
    if (effectiveRole === 'tutor') {
      const tutorCursistaEmails = new Set(
        filteredRecordsForView.map(c => (c['e-mail'] || c.email || c.email_cursista || '').trim().toLowerCase()).filter(Boolean)
      );
      
      const matchingTutores = tutoresList.filter(t => 
        (t.email_educ && t.email_educ.trim().toLowerCase() === email) ||
        (t.email_adm && t.email_adm.trim().toLowerCase() === email)
      );
      const tutorNames = new Set(matchingTutores.map(t => (t.tutor_responsavel || '').trim().toUpperCase()).filter(Boolean));

      return observacoesList.filter(obs => {
        const obsCursistaEmail = (obs.email_cursista || '').trim().toLowerCase();
        const obsTutorEmail = (obs.email_tutor || '').trim().toLowerCase();
        const obsTutorNome = (obs.tutor_responsavel || '').trim().toUpperCase();
        
        return tutorCursistaEmails.has(obsCursistaEmail) || (obsTutorEmail && obsTutorEmail === email) || (obsTutorNome && tutorNames.has(obsTutorNome));
      });
    }

    // Cursista: vê observações de todos os seus vínculos/padrões (por e-mail, nome normalizado ou CGM)
    if (effectiveRole === 'cursista') {
      const matchingCursistas = enrichedRecords.filter(r => {
        const em = (r['e-mail'] || r.email || r.email_cursista || '').trim().toLowerCase();
        return em === email;
      });

      // Se encontrou registros por e-mail, verifica se há CGM para resgatar outros vínculos da mesma pessoa
      const cgmsEncontrados = new Set(matchingCursistas.map(r => String(r.cgm || '').trim()).filter(Boolean));
      const todosVinculosCursista = cgmsEncontrados.size > 0 
        ? enrichedRecords.filter(r => {
            const em = (r['e-mail'] || r.email || r.email_cursista || '').trim().toLowerCase();
            const c = String(r.cgm || '').trim();
            return em === email || (c && cgmsEncontrados.has(c));
          })
        : matchingCursistas;

      const cursistaEmails = new Set([email, ...todosVinculosCursista.map(r => (r['e-mail'] || r.email || r.email_cursista || '').trim().toLowerCase()).filter(Boolean)]);
      const cursistaNomesNorm = new Set(todosVinculosCursista.map(r => normalizeString(r.nome_cursista || r.nome || '')).filter(Boolean));
      const cursistaCgms = new Set(todosVinculosCursista.map(r => String(r.cgm || '').trim()).filter(Boolean));

      return observacoesList.filter(obs => {
        const obsEmail = (obs.email_cursista || '').trim().toLowerCase();
        if (obsEmail && cursistaEmails.has(obsEmail)) return true;
        const obsNomeNorm = normalizeString(obs.nome_cursista || '');
        if (obsNomeNorm && cursistaNomesNorm.has(obsNomeNorm)) return true;
        const obsCgm = String(obs.cgm || '').trim();
        if (obsCgm && cursistaCgms.has(obsCgm)) return true;
        return false;
      });
    }

    return observacoesList;
  }, [observacoesList, filteredRecordsForView, enrichedRecords, tutoresList, user, userRole, simulatedRole, effectiveRole, effectiveEmail]);


  // Handler para novas solicitações enviadas pelo Cursista
  const handleNovaMovimentacao = async (novaSolicitacao) => {
    setMovimentacoesList(prev => [novaSolicitacao, ...prev]);
    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('movimentacoes').insert([novaSolicitacao]);
      } catch (err) {
        console.error('Erro ao salvar movimentação no Supabase:', err);
      }
    }
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
    if (effectiveRole === 'cursista' || activeTab.startsWith('cursista_') || activeTab === 'espaco_cursista') {
      if (activeTab === 'cursista_diario') {
        return (
          <DiarioFormativo 
            userRole="cursista"
            userEmail={effectiveEmail}
            cursistas={enrichedRecords}
            tutores={tutoresList}
          />
        );
      }
      if (activeTab === 'cursista_documentos') {
        return <CentralDocumentos userRole="cursista" />;
      }
      const subTab = activeTab === 'cursista_matricula_2027' ? 'matricula2027' :
                     activeTab === 'cursista_solicitacoes' ? 'solicitacoes' : 
                     activeTab === 'cursista_observacoes' ? 'observacoes' : 'turma';
      return (
        <AmbienteCursista 
          userEmail={effectiveEmail} 
          records={enrichedRecords} 
          observacoes={filteredObservacoesForView}
          movimentacoes={movimentacoesList}
          onNovaMovimentacao={handleNovaMovimentacao}
          subTab={subTab}
        />
      );
    }

    switch (activeTab) {
      // 📘 GESTÃO PEDAGÓGICA
      case 'observacoes':
        return (
          <ObservacaoPratica 
            observacoes={filteredObservacoesForView} 
            cursistas={enrichedRecords} 
            tutores={tutoresList}
            userRole={effectiveRole}
            userEmail={effectiveEmail}
            onNovaObservacao={handleNovaObservacao}
          />
        );
      case 'tutor_insights':
        if (!isSuperAdminTutor) {
          return (
            <div className="glass-panel" style={{ padding: '3rem 2rem', textAlign: 'center', maxWidth: '600px', margin: '2rem auto' }}>
              <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>🔒</div>
              <h3 style={{ color: 'var(--color-primary-dark)', marginBottom: '0.5rem' }}>Acesso Restrito aos Superadministradores</h3>
              <p style={{ color: 'var(--color-text-muted)', fontSize: '0.92rem', lineHeight: '1.5' }}>
                O módulo <strong>Observação do Tutor</strong> (Acompanhamento de Tutores e Formadores) é de acesso exclusivo da coordenação geral do programa.
              </p>
            </div>
          );
        }
        return (
          <TutorInsightsDashboard 
            userRole={effectiveRole}
            userEmail={effectiveEmail}
            tutores={tutoresList}
          />
        );
      case 'diario_formativo':
        return (
          <DiarioFormativo 
            userRole={effectiveRole}
            userEmail={effectiveEmail}
            cursistas={enrichedRecords}
            tutores={tutoresList}
          />
        );
      case 'documentos_pedagogicos':
        return <CentralDocumentos userRole={effectiveRole} />;
      case 'observacoes_overview':
        return (
          <ObservacoesOverview 
            observacoes={filteredObservacoesForView} 
            cursistas={enrichedRecords} 
            tutores={tutoresList}
          />
        );
      case 'acompanhamento_cards':
        return (
          <AcompanhamentoObservacoesCards 
            cursistas={filteredRecordsForView} 
            observacoes={filteredObservacoesForView} 
            tutores={tutoresList}
            userRole={effectiveRole}
            userEmail={effectiveEmail}
            onNovaObservacao={handleNovaObservacao}
          />
        );

      // 🏛️ GESTÃO ADMINISTRATIVA
      case 'panorama':
        return <Panorama data={filteredRecordsForView} />;
      case 'turmas':
        return (
          <ListaTurmas 
            data={filteredRecordsForView} 
            observacoes={filteredObservacoesForView} 
            userRole={userRole}
            onNovaObservacao={handleNovaObservacao}
          />
        );
      case 'remanejamentos':
        return (
          <Movimentacoes 
            userEmail={effectiveEmail} 
            userRole={effectiveRole} 
            tutorData={tutoresList} 
            records={enrichedRecords}
            tutoresList={tutoresList}
          />
        );
      case 'formadores':
        return <ContatoFormadores data={filteredRecordsForView} />;
      case 'cursistas':
        return <ContatoCursistas data={filteredRecordsForView} />;
      case 'tutoria':
        return <DadosTutoria data={filteredRecordsForView} />;
      case 'concluintes':
        return (
          <Concluintes 
            concluintes={concluintesList} 
            cursistasAtivos={enrichedRecords} 
            observacoes={observacoesList}
            userRole={userRole}
          />
        );
      case 'admin':
        return (userRole === 'admin' || userRole === 'tecnico')
          ? <AdminPanel data={enrichedRecords} onLocalUpdate={handleLocalUpdate} onMovimentacao={(mov) => setMovimentacoesList(prev => [mov, ...prev])} userRole={userRole} /> 
          : <Panorama data={filteredRecordsForView} />;
      default:
        return macroPilar === 'pedagogica' ? (
          <ObservacaoPratica 
            observacoes={filteredObservacoesForView} 
            cursistas={enrichedRecords} 
            tutores={tutoresList}
            userRole={effectiveRole}
            userEmail={effectiveEmail}
            onNovaObservacao={handleNovaObservacao}
          />
        ) : <Panorama data={filteredRecordsForView} />;
    }
  };

  return (
    <div className="app-container">
      {/* CABEÇALHO INSTITUCIONAL */}
      <header className="cabecalho">
        <div className="cabecalho-conteudo">

          <div className="identidade">
            <div className="logo" aria-hidden="true">
              <img 
                src="/brasao_parana.svg" 
                alt="Brasão do Paraná" 
                style={{ width: '42px', height: 'auto', objectFit: 'contain' }} 
              />
            </div>

            <div className="identidade-texto">
              <div className="secretaria">
                SECRETARIA DA EDUCAÇÃO DO PARANÁ · SEED/PR
              </div>

              <h1>ESTÁGIO PROBATÓRIO</h1>

              <p>Gestão de turmas e acompanhamento da formação docente</p>
            </div>
          </div>

          <div className="acoes-usuario">
            <button 
              className="botao-busca" 
              type="button"
              onClick={() => setShowBuscaGlobal(true)}
            >
              <span aria-hidden="true">⌕</span>
              Buscar pessoas
            </button>

            <div className="perfil">
              <div className="avatar" aria-hidden="true">
                {user.photoURL ? (
                  <img src={user.photoURL} alt="Avatar" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                ) : (
                  (user.displayName ? user.displayName.charAt(0).toUpperCase() : 'U')
                )}
              </div>

              <div className="perfil-dados">
                <strong>{user.displayName || 'Usuário'}</strong>
                <small>{userRole ? userRole.toUpperCase() : 'ACESSO'}</small>
              </div>

              <button className="sair" type="button" onClick={handleLogout}>
                ↪ Sair
              </button>
            </div>
          </div>

        </div>
      </header>

      {/* MENU DE DIVISÕES (ÁREA DE GESTÃO) */}
      {effectiveRole !== 'cursista' && (
        <nav className="menu-principal" aria-label="Divisão de gestão">
          <div className="menu-conteudo">

            <div className="menu-divisao">
              <span className="menu-legenda">Área de gestão</span>

              <button
                type="button"
                className={`item-divisao ${macroPilar === 'pedagogica' ? 'ativo' : ''}`}
                data-divisao="pedagogica"
                aria-current={macroPilar === 'pedagogica' ? 'page' : undefined}
                onClick={() => {
                  setMacroPilar('pedagogica');
                  setActiveTab('observacoes');
                }}
              >
                <span aria-hidden="true">▤</span>
                Gestão Pedagógica
              </button>

              <button
                type="button"
                className={`item-divisao ${macroPilar === 'administrativa' ? 'ativo' : ''}`}
                data-divisao="administrativa"
                aria-current={macroPilar === 'administrativa' ? 'page' : undefined}
                onClick={() => {
                  setMacroPilar('administrativa');
                  setActiveTab('panorama');
                }}
              >
                <span aria-hidden="true">▥</span>
                Gestão Administrativa
              </button>
            </div>

            <div className="contexto">
              {macroPilar === 'pedagogica'
                ? 'Acompanhamento formativo em 3 níveis · Rubricas · Diário Formativo · PDP'
                : 'Matriz de turmas · Remanejamentos · Ensalamento · Concluintes · Auditoria'}
            </div>

          </div>
        </nav>
      )}

      {/* BARRA DE SIMULAÇÃO DE PERFIL (Desativada na versão oficial do Git) */}
      {false && userRole === 'admin' && (
        <section className="barra-admin" id="barraAdmin">
          <label htmlFor="perfilVisualizacao">
            🎭 Simular visualização:
          </label>

          <select
            id="perfilVisualizacao"
            value={simulatedRole || ''}
            onChange={e => {
              const role = e.target.value;
              setSimulatedRole(role || null);
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
          >
            <option value="">Visão Admin Real (Painel Completo)</option>
            <option value="cursista">Visão Cursista</option>
            <option value="tutor">Visão Tutoria</option>
            <option value="formador">Visão Formador</option>
          </select>

          {/* Seletores de exemplo específico */}
          {simulatedRole === 'formador' && formadoresExemplo.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.8rem', color: '#855019', fontWeight: 700 }}>Exemplo:</span>
              <select
                value={effectiveEmail}
                onChange={e => setSimulatedEmail(e.target.value)}
                style={{ padding: '0.4rem 0.6rem', borderRadius: '7px', border: '1px solid #d49a47', fontSize: '0.8rem', color: '#654019' }}
              >
                {formadoresExemplo.map(f => (
                  <option key={f.email} value={f.email}>{f.nome} ({f.email})</option>
                ))}
              </select>
            </div>
          )}

          {simulatedRole === 'tutor' && tutoresExemplo.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.8rem', color: '#855019', fontWeight: 700 }}>Exemplo:</span>
              <select
                value={effectiveEmail}
                onChange={e => setSimulatedEmail(e.target.value)}
                style={{ padding: '0.4rem 0.6rem', borderRadius: '7px', border: '1px solid #d49a47', fontSize: '0.8rem', color: '#654019' }}
              >
                {tutoresExemplo.map(t => (
                  <option key={t.email} value={t.email}>{t.nome} ({t.email})</option>
                ))}
              </select>
            </div>
          )}

          {simulatedRole === 'cursista' && cursistasExemplo.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.8rem', color: '#855019', fontWeight: 700 }}>Exemplo ({cursistasExemplo.length} disp.):</span>
              <select
                value={effectiveEmail}
                onChange={e => setSimulatedEmail(e.target.value)}
                style={{ padding: '0.4rem 0.6rem', borderRadius: '7px', border: '1px solid #d49a47', fontSize: '0.8rem', color: '#654019', maxWidth: '300px' }}
              >
                {cursistasExemplo.slice(0, 30).map((c, idx) => (
                  <option key={c.email} value={c.email}>
                    {idx + 1}. {c.nome} {c.totalObs > 0 ? `(${c.totalObs} obs • ${c.ano})` : `(${c.turma})`}
                  </option>
                ))}
              </select>
            </div>
          )}

          {simulatedRole && (
            <button
              type="button"
              onClick={() => { setSimulatedRole(null); setSimulatedEmail(''); setActiveTab('panorama'); }}
              style={{
                backgroundColor: '#92400e',
                color: 'white',
                border: 'none',
                padding: '0.4rem 0.85rem',
                borderRadius: '7px',
                cursor: 'pointer',
                fontSize: '0.78rem',
                fontWeight: 700
              }}
            >
              Voltar à Visão Admin Real
            </button>
          )}
        </section>
      )}

      {/* SUBMENU DE FERRAMENTAS */}
      <nav className="submenu" aria-label="Ferramentas de gestão">
        <div className="submenu-conteudo">
          {effectiveRole === 'cursista' ? (
            <>
              <button 
                type="button"
                className={`item-submenu ${activeTab === 'cursista_turma' ? 'ativo' : ''}`}
                onClick={() => setActiveTab('cursista_turma')}
              >
                🏫 &nbsp; Minha Turma
              </button>
              <button 
                type="button"
                className={`item-submenu ${activeTab === 'cursista_observacoes' ? 'ativo' : ''}`}
                onClick={() => setActiveTab('cursista_observacoes')}
              >
                👁️ &nbsp; Meu Acompanhamento & Medalhas
              </button>
              <button 
                type="button"
                className={`item-submenu ${activeTab === 'cursista_diario' ? 'ativo' : ''}`}
                onClick={() => setActiveTab('cursista_diario')}
              >
                📖 &nbsp; Meu Diário Formativo
              </button>
              <button 
                type="button"
                className={`item-submenu ${activeTab === 'cursista_solicitacoes' ? 'ativo' : ''}`}
                onClick={() => setActiveTab('cursista_solicitacoes')}
              >
                🔄 &nbsp; Minhas Solicitações
              </button>
              <button 
                type="button"
                className={`item-submenu ${activeTab === 'cursista_documentos' ? 'ativo' : ''}`}
                onClick={() => setActiveTab('cursista_documentos')}
              >
                📚 &nbsp; Documentos Formativos
              </button>
              <button 
                type="button"
                className={`item-submenu ${activeTab === 'cursista_matricula_2027' ? 'ativo' : ''}`}
                onClick={() => setActiveTab('cursista_matricula_2027')}
              >
                📅 &nbsp; Intenção Matrícula 2027
              </button>
            </>
          ) : macroPilar === 'pedagogica' ? (
            <>
              {/* FERRAMENTAS DA GESTÃO PEDAGÓGICA */}
              <button 
                type="button"
                className={`item-submenu ${activeTab === 'observacoes' ? 'ativo' : ''}`}
                onClick={() => setActiveTab('observacoes')}
              >
                ◉ &nbsp; Observação do Cursista
              </button>

              {/* Observações de Tutoria: EXCLUSIVO SUPERADMIN */}
              {isSuperAdminTutor && (
                <button 
                  type="button"
                  className={`item-submenu ${activeTab === 'tutor_insights' ? 'ativo' : ''}`}
                  onClick={() => setActiveTab('tutor_insights')}
                >
                  ◈ &nbsp; Observação do Tutor
                </button>
              )}

              {/* Diário Formativo e Central de Documentos (Ocultados temporariamente para publicação futura) */}
              {/*
              <button 
                type="button"
                className={`item-submenu ${activeTab === 'diario_formativo' ? 'ativo' : ''}`}
                onClick={() => setActiveTab('diario_formativo')}
              >
                ▤ &nbsp; Diário Formativo
              </button>

              <button 
                type="button"
                className={`item-submenu ${activeTab === 'documentos_pedagogicos' ? 'ativo' : ''}`}
                onClick={() => setActiveTab('documentos_pedagogicos')}
              >
                ▧ &nbsp; Central de Documentos (PDP e Rubricas)
              </button>
              */}

              <button 
                type="button"
                className={`item-submenu ${activeTab === 'observacoes_overview' ? 'ativo' : ''}`}
                onClick={() => setActiveTab('observacoes_overview')}
              >
                ▥ &nbsp; Overview das Observações
              </button>

              <button 
                type="button"
                className={`item-submenu ${activeTab === 'acompanhamento_cards' ? 'ativo' : ''}`}
                onClick={() => setActiveTab('acompanhamento_cards')}
              >
                ▣ &nbsp; Acompanhamento por Cursista
              </button>
            </>
          ) : (
            <>
              {/* FERRAMENTAS DA GESTÃO ADMINISTRATIVA */}
              <button 
                type="button"
                className={`item-submenu ${activeTab === 'panorama' ? 'ativo' : ''}`}
                onClick={() => setActiveTab('panorama')}
              >
                📊 &nbsp; Panorama Geral
              </button>

              <button 
                type="button"
                className={`item-submenu ${activeTab === 'turmas' ? 'ativo' : ''}`}
                onClick={() => setActiveTab('turmas')}
              >
                ▦ &nbsp; Gestão de Turmas
              </button>

              <button 
                type="button"
                className={`item-submenu ${activeTab === 'remanejamentos' ? 'ativo' : ''}`}
                onClick={() => setActiveTab('remanejamentos')}
              >
                🔄 &nbsp; Remanejamentos & Modalidades
              </button>

              <button 
                type="button"
                className={`item-submenu ${activeTab === 'cursistas' ? 'ativo' : ''}`}
                onClick={() => setActiveTab('cursistas')}
              >
                👥 &nbsp; Contato Cursistas
              </button>
              
              {effectiveRole !== 'formador' && (
                <button 
                  type="button"
                  className={`item-submenu ${activeTab === 'formadores' ? 'ativo' : ''}`}
                  onClick={() => setActiveTab('formadores')}
                >
                  🎓 &nbsp; Contato Formadores
                </button>
              )}
              
              {effectiveRole !== 'formador' && (
                <button 
                  type="button"
                  className={`item-submenu ${activeTab === 'tutoria' ? 'ativo' : ''}`}
                  onClick={() => setActiveTab('tutoria')}
                >
                  🤝 &nbsp; Dados Tutoria
                </button>
              )}

              {/* Aba de Concluintes do 1º Chamamento */}
              {(userRole === 'admin' || userRole === 'tecnico' || !simulatedRole) && (
                <button 
                  type="button"
                  className={`item-submenu ${activeTab === 'concluintes' ? 'ativo' : ''}`}
                  onClick={() => setActiveTab('concluintes')}
                >
                  🎓 &nbsp; Concluintes (1º CH)
                </button>
              )}

              {/* Aba de Admin: Apenas para Admin Real */}
              {userRole === 'admin' && !simulatedRole && (
                <button 
                  type="button"
                  className={`item-submenu ${activeTab === 'admin' ? 'ativo' : ''}`}
                  onClick={() => setActiveTab('admin')}
                  style={{ borderLeft: '1px solid var(--borda)', backgroundColor: 'rgba(229, 62, 62, 0.05)' }}
                >
                  🛡️ &nbsp; Painel Admin ("Modo Deus")
                </button>
              )}
            </>
          )}
        </div>
      </nav>

      {/* Área Principal de Conteúdo com transição fluida */}
      <HistoricoTurmasContext.Provider value={historicoTurmasCtx}>
      <main className="main-content page-transition-enter" key={activeTab}>
        {renderTabContent()}
      </main>

      {/* Modal de Busca Global de Pessoas (Cursista, Formador, Tutor) */}
      <BuscaGlobalPessoasModal
        isOpen={showBuscaGlobal}
        onClose={() => setShowBuscaGlobal(false)}
        cursistas={enrichedRecords}
        tutores={tutoresList}
        onAbrirDossie={(cursista) => setCursistaDossieModal(cursista)}
      />

      {/* Modal de Dossiê caso acionado pela busca */}
      {cursistaDossieModal && (
        <DossieCursistaModal
          cursista={cursistaDossieModal}
          observacoes={observacoesList}
          onClose={() => setCursistaDossieModal(null)}
        />
      )}

      {/* Rodapé com o Brasão do Paraná */}
      </HistoricoTurmasContext.Provider>
      <footer style={{ backgroundColor: 'var(--color-primary-dark)', color: 'rgba(255,255,255,0.7)', padding: '1.5rem', textAlign: 'center', fontSize: '0.8rem', marginTop: 'auto', borderTop: '4px solid var(--color-accent-green)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
        <img src="/brasao_parana.svg" alt="Brasão do Paraná" style={{ height: '36px', width: 'auto', opacity: 0.9 }} />
        <p>© 2026 Estágio Probatório - Secretaria da Educação do Estado do Paraná (SEED-PR)</p>
        <p style={{ fontSize: '0.75rem', opacity: 0.6 }}>Ambientes de Acesso por Perfil (RBAC Google Workspace) & Sincronização de Turmas</p>
      </footer>
    </div>
  );
}
