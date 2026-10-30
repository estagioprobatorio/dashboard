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
import Exonerados from './components/Exonerados';
import Movimentacoes from './components/Movimentacoes';
import TutorInsightsDashboard from './components/TutorInsightsDashboard';
import DiarioFormativo from './components/DiarioFormativo';
import CentralDocumentos from './components/CentralDocumentos';
import BuscaGlobalPessoasModal from './components/BuscaGlobalPessoasModal';
import DossieCursistaModal from './components/DossieCursistaModal';
import PainelIntencaoVagasAdmin from './components/PainelIntencaoVagasAdmin';
import { HistoricoTurmasContext } from './utils/HistoricoTurmasContext';

import { driveDataService } from './services/driveDataService';
import { tidbService } from './services/tidbService';
import { salvarObservacaoIntegrada, getObservacoesLocaisNovas } from './utils/observacoesSyncService';
import { normalizeString } from './utils/aiPedagogicalService';

// Importando dados iniciais locais
import fallbackData from './data_fallback.json';
import tutoresFallback from './tutores_fallback.json';
import observacoesFallback from './observacoes_fallback.json';
import fallbackConcluintes from './concluintes_fallback.json';

export default function App() {
  const [macroPilar, setMacroPilar] = useState('pedagogica'); // 'pedagogica' | 'administrativa'
  const [activeTab, setActiveTab] = useState('observacoes');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [showBuscaGlobal, setShowBuscaGlobal] = useState(false);
  const [cursistaDossieModal, setCursistaDossieModal] = useState(null);
  const [records, setRecords] = useState(fallbackData);
  const [tutoresList, setTutoresList] = useState(tutoresFallback);
  const [observacoesList, setObservacoesList] = useState(() => {
    const locais = getObservacoesLocaisNovas();
    return [...locais, ...observacoesFallback];
  });
  const [concluintesList, setConcluintesList] = useState(fallbackConcluintes);
  const [exoneradosList, setExoneradosList] = useState([]);
  const [movimentacoesList, setMovimentacoesList] = useState([]);
  const [intencoes2027List, setIntencoes2027List] = useState([]);
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

  // Lista de Concluintes (prioriza dados do Drive/Sheets; se vazio, filtra automaticamente 1º Chamamento)
  const concluintesEfetivos = useMemo(() => {
    if (concluintesList && concluintesList.length > 0) return concluintesList;
    return enrichedRecords.filter(r => {
      const ch = String(r.chamamento || r.CHAMAMENTO || '');
      return ch.includes('1') && ch.toLowerCase().includes('chamamento');
    });
  }, [concluintesList, enrichedRecords]);

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

    // Regra 6: Contas institucionais da SEED/PR não cadastradas em turmas entram como Administradores
    if (cleanEmail.endsWith('@escola.pr.gov.br') || cleanEmail.endsWith('@seed.pr.gov.br')) {
      return 'admin';
    }

    return 'unauthorized';
  };

  // 2. Efeito para monitorar autenticação e recuperar sessão salva
  useEffect(() => {
    // 2.0 Detectar retorno de SSO do Google Apps Script na URL (Vercel ou Localhost)
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const ssoEmail = urlParams.get('sso_email') || urlParams.get('auth_email');
      const ssoToken = urlParams.get('sso_token');

      if (ssoEmail) {
        const cleanEmail = decodeURIComponent(ssoEmail).trim().toLowerCase();
        if (cleanEmail && cleanEmail.includes('@')) {
          console.log('[SSO Google Apps Script] Autenticado com sucesso:', cleanEmail);

          const ssoUser = {
            email: cleanEmail,
            displayName: cleanEmail.split('@')[0].replace(/\./g, ' '),
            photoURL: '',
            provider: 'google_workspace_sso',
            authenticatedAt: new Date().toISOString()
          };

          try {
            localStorage.setItem('ep_user_session', JSON.stringify(ssoUser));
          } catch (errStore) {}

          // Remove sso_email e sso_token da URL sem recarregar a página
          const cleanUrl = window.location.pathname + (window.location.hash || '');
          window.history.replaceState({}, document.title, cleanUrl);

          setUser(ssoUser);
          setUserRole(resolveUserRole(cleanEmail, enrichedRecords));
          setAuthLoading(false);
          return;
        }
      }
    } catch (errSso) {
      console.warn('[SSO Google] Erro ao ler parâmetros de URL:', errSso);
    }

    // 2.1 Recupera sessão persistida localmente (Login Direto Institucional)
    const savedSession = localStorage.getItem('ep_user_session');
    if (savedSession) {
      try {
        const parsedUser = JSON.parse(savedSession);
        if (parsedUser && parsedUser.email) {
          setUser(parsedUser);
          setUserRole(resolveUserRole(parsedUser.email, enrichedRecords));
          setAuthLoading(false);
          return;
        }
      } catch (e) {}
    }

    // 2.2 Se houver Firebase configurado
    if (isFirebaseConfigured && auth) {
      const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
        if (firebaseUser && firebaseUser.email) {
          const uObj = {
            email: firebaseUser.email.toLowerCase().trim(),
            displayName: firebaseUser.displayName || 'Usuário Google',
            photoURL: firebaseUser.photoURL || ''
          };
          setUser(uObj);
          setUserRole(resolveUserRole(firebaseUser.email, enrichedRecords));
          try { localStorage.setItem('ep_user_session', JSON.stringify(uObj)); } catch (e) {}
        } else {
          setUser(null);
          setUserRole(null);
          localStorage.removeItem('ep_user_session');
        }
        setAuthLoading(false);
      });
      return () => unsubscribe();
    } else {
      setAuthLoading(false);
    }
  }, [enrichedRecords, tutoresList]);

  // 3. Efeito para carregar dados do TiDB Cloud Serverless (com fallback resiliente para Drive / Local)
  useEffect(() => {
    let isMounted = true;

    async function carregarDadosBanco() {
      setIsLoading(true);
      try {
        console.log('[App] Carregando dados consolidados (TiDB Cloud / Cache / Drive)...');
        const pacote = await tidbService.carregarPacoteGeral();
        if (!isMounted) return;

        if (pacote) {
          if (pacote.baseCursistas && Array.isArray(pacote.baseCursistas)) {
            setRecords(pacote.baseCursistas);
          }
          if (pacote.tutores && Array.isArray(pacote.tutores)) {
            setTutoresList(pacote.tutores);
          }
          if (pacote.observacoes && Array.isArray(pacote.observacoes)) {
            const locais = getObservacoesLocaisNovas();
            const dbIds = new Set(pacote.observacoes.map(o => o.id_origem || o.id));
            const pendentesLocais = locais.filter(l => !dbIds.has(l.id_origem || l.id));
            setObservacoesList([...pendentesLocais, ...pacote.observacoes]);
          }
          if (pacote.movimentacoes && Array.isArray(pacote.movimentacoes)) {
            setMovimentacoesList(pacote.movimentacoes);
          }
          if (pacote.concluintes && Array.isArray(pacote.concluintes)) {
            setConcluintesList(pacote.concluintes);
          }
          if (pacote.exonerados && Array.isArray(pacote.exonerados)) {
            setExoneradosList(pacote.exonerados);
          }
          if (pacote.intencoes2027 && Array.isArray(pacote.intencoes2027)) {
            setIntencoes2027List(pacote.intencoes2027);
          }
          setFirebaseActive(true);
        }
      } catch (err) {
        console.error('[App] Erro ao carregar dados consolidados:', err);
        setRecords(fallbackData);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    carregarDadosBanco();
    return () => { isMounted = false; };
  }, []);

  const handleLoginSuccess = (authenticatedUser) => {
    try {
      localStorage.setItem('ep_user_session', JSON.stringify(authenticatedUser));
    } catch (e) {}
    setUser(authenticatedUser);
    const role = resolveUserRole(authenticatedUser.email, enrichedRecords);
    setUserRole(role);
  };

  const handleLogout = async () => {
    localStorage.removeItem('ep_user_session');
    if (isFirebaseConfigured && auth) {
      try { await signOut(auth); } catch (e) {}
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
  // Verifica se o cursista ativo pertence aos chamamentos elegíveis para 2027 (3º, 4º, 5º ou 6º chamamento)
  const isCursistaElegivel2027 = useMemo(() => {
    if (effectiveRole !== 'cursista') return false;
    const curEmail = (effectiveEmail || '').trim().toLowerCase();
    const curRec = enrichedRecords.find(r => {
      const em = (r['e-mail'] || r.email || r.email_cursista || '').trim().toLowerCase();
      return em && em === curEmail;
    });
    if (!curRec) return false;
    const rawCham = String(curRec.chamamento || curRec.CHAMAMENTO || '');
    const match = rawCham.match(/(\d+)/);
    const num = match ? parseInt(match[1], 10) : null;
    return num === 3 || num === 4 || num === 5 || num === 6;
  }, [effectiveRole, effectiveEmail, enrichedRecords]);

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
    try {
      await tidbService.salvarMovimentacao(novaSolicitacao);
    } catch (err) {
      console.warn('[TiDB] Erro ao salvar movimentação via tidbService:', err);
    }
    try {
      await driveDataService.salvarRemanejamento(novaSolicitacao);
    } catch (err) {
      console.error('Erro ao salvar movimentação via DriveService:', err);
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
        return <Panorama data={filteredRecordsForView} concluintes={concluintesEfetivos} />;
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
            initialMovements={movimentacoesList}
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
            concluintes={concluintesEfetivos} 
            cursistasAtivos={enrichedRecords} 
            observacoes={observacoesList}
            userRole={userRole}
          />
        );
      case 'exonerados':
        return (
          <Exonerados 
            exonerados={exoneradosList} 
            userRole={userRole} 
          />
        );
      case 'intencao_vagas_2027':
        return (userRole === 'admin' || userRole === 'tecnico' || isSuperAdminTutor) ? (
          <PainelIntencaoVagasAdmin 
            records={enrichedRecords} 
            userRole={effectiveRole} 
            userEmail={effectiveEmail} 
          />
        ) : (
          <Panorama data={filteredRecordsForView} concluintes={concluintesEfetivos} />
        );
      case 'admin':
        return (userRole === 'admin' || userRole === 'tecnico')
          ? <AdminPanel data={enrichedRecords} onLocalUpdate={handleLocalUpdate} onMovimentacao={(mov) => setMovimentacoesList(prev => [mov, ...prev])} userRole={userRole} /> 
          : <Panorama data={filteredRecordsForView} concluintes={concluintesEfetivos} />;
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
        ) : <Panorama data={filteredRecordsForView} concluintes={concluintesEfetivos} />;
    }
  };

  return (
    <div className="app-container console-theme">
      {/* CABEÇALHO CONSOLE GOOGLE (SLIM & MODERNO) */}
      <header className="cabecalho-console">
        <div className="cabecalho-conteudo-console">

          <div className="identidade-console">
            <button
              type="button"
              className="btn-hamburger-header"
              onClick={() => setIsSidebarCollapsed(prev => !prev)}
              title={isSidebarCollapsed ? "Expandir menu lateral" : "Recolher menu lateral"}
              aria-label="Alternar menu lateral"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="3" y1="12" x2="21" y2="12"></line>
                <line x1="3" y1="6" x2="21" y2="6"></line>
                <line x1="3" y1="18" x2="21" y2="18"></line>
              </svg>
            </button>

            <img 
              src="/brasao_parana.svg" 
              alt="Brasão do Paraná" 
              style={{ width: '32px', height: 'auto', objectFit: 'contain' }} 
            />

            <div className="identidade-titulos">
              <span className="subtitulo-governo">SEED-PR · ESTADO DO PARANÁ</span>
              <span className="titulo-plataforma">ESTÁGIO PROBATÓRIO DOCENTE</span>
            </div>
          </div>

          <div className="acoes-usuario-console">
            <button 
              className="botao-busca-console" 
              type="button"
              onClick={() => setShowBuscaGlobal(true)}
              title="Buscar pessoas no sistema (Ctrl+K)"
            >
              <span aria-hidden="true">🔍</span>
              <span>Buscar pessoas</span>
              <kbd className="atalho-busca">Ctrl+K</kbd>
            </button>

            <div className="perfil-console">
              <div className="avatar-console" aria-hidden="true">
                {user.photoURL ? (
                  <img src={user.photoURL} alt="Avatar" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                ) : (
                  (user.displayName ? user.displayName.charAt(0).toUpperCase() : 'U')
                )}
              </div>

              <div className="perfil-dados-console">
                <strong>{user.displayName || 'Usuário'}</strong>
                <small>{userRole ? userRole.toUpperCase() : 'ACESSO'}</small>
              </div>

              <button className="sair-console" type="button" onClick={handleLogout} title="Sair da Plataforma">
                ↪ Sair
              </button>
            </div>
          </div>

        </div>
      </header>

      {/* CORPO PRINCIPAL COM SIDEBAR ESTILO GOOGLE CLOUD CONSOLE */}
      <div className="console-layout-wrapper">
        <aside className={`console-sidebar ${isSidebarCollapsed ? 'collapsed' : ''}`} aria-label="Navegação Lateral">
          
          <div className="console-sidebar-nav">
            {effectiveRole === 'cursista' ? (
              <div className="console-nav-group">
                {!isSidebarCollapsed && <div className="console-nav-label">Espaço Cursista</div>}
                
                <button
                  type="button"
                  className={`console-nav-item ${activeTab === 'cursista_turma' ? 'active' : ''}`}
                  onClick={() => setActiveTab('cursista_turma')}
                  title="Minha Turma"
                >
                  <span className="console-nav-icon">🏫</span>
                  {!isSidebarCollapsed && <span className="console-nav-text">Minha Turma</span>}
                </button>

                <button
                  type="button"
                  className={`console-nav-item ${activeTab === 'cursista_observacoes' ? 'active' : ''}`}
                  onClick={() => setActiveTab('cursista_observacoes')}
                  title="Meu Acompanhamento & Medalhas"
                >
                  <span className="console-nav-icon">🏅</span>
                  {!isSidebarCollapsed && <span className="console-nav-text">Meu Acompanhamento</span>}
                </button>

                <button
                  type="button"
                  className={`console-nav-item ${activeTab === 'cursista_diario' ? 'active' : ''}`}
                  onClick={() => setActiveTab('cursista_diario')}
                  title="Meu Diário Formativo"
                >
                  <span className="console-nav-icon">📖</span>
                  {!isSidebarCollapsed && <span className="console-nav-text">Diário Formativo</span>}
                </button>

                <button
                  type="button"
                  className={`console-nav-item ${activeTab === 'cursista_solicitacoes' ? 'active' : ''}`}
                  onClick={() => setActiveTab('cursista_solicitacoes')}
                  title="Minhas Solicitações"
                >
                  <span className="console-nav-icon">🔄</span>
                  {!isSidebarCollapsed && <span className="console-nav-text">Minhas Solicitações</span>}
                </button>

                <button
                  type="button"
                  className={`console-nav-item ${activeTab === 'cursista_documentos' ? 'active' : ''}`}
                  onClick={() => setActiveTab('cursista_documentos')}
                  title="Documentos Formativos"
                >
                  <span className="console-nav-icon">📄</span>
                  {!isSidebarCollapsed && <span className="console-nav-text">Documentos Formativos</span>}
                </button>

                {isCursistaElegivel2027 && (
                  <button
                    type="button"
                    className={`console-nav-item ${activeTab === 'cursista_matricula_2027' ? 'active' : ''}`}
                    onClick={() => setActiveTab('cursista_matricula_2027')}
                    title="Intenção Matrícula 2027"
                  >
                    <span className="console-nav-icon">📅</span>
                    {!isSidebarCollapsed && <span className="console-nav-text">Intenção Matrícula 2027</span>}
                  </button>
                )}
              </div>
            ) : (
              <>
                {/* GESTÃO PEDAGÓGICA */}
                <div className="console-nav-group">
                  {!isSidebarCollapsed && <div className="console-nav-label">Gestão Pedagógica</div>}

                  <button
                    type="button"
                    className={`console-nav-item ${activeTab === 'observacoes' ? 'active' : ''}`}
                    onClick={() => { setMacroPilar('pedagogica'); setActiveTab('observacoes'); }}
                    title="Observação do Cursista"
                  >
                    <span className="console-nav-icon">🎯</span>
                    {!isSidebarCollapsed && <span className="console-nav-text">Observação do Cursista</span>}
                  </button>

                  <button
                    type="button"
                    className={`console-nav-item ${activeTab === 'observacoes_overview' ? 'active' : ''}`}
                    onClick={() => { setMacroPilar('pedagogica'); setActiveTab('observacoes_overview'); }}
                    title="Overview das Observações"
                  >
                    <span className="console-nav-icon">📊</span>
                    {!isSidebarCollapsed && <span className="console-nav-text">Overview Observações</span>}
                  </button>

                  <button
                    type="button"
                    className={`console-nav-item ${activeTab === 'acompanhamento_cards' ? 'active' : ''}`}
                    onClick={() => { setMacroPilar('pedagogica'); setActiveTab('acompanhamento_cards'); }}
                    title="Acompanhamento por Cursista"
                  >
                    <span className="console-nav-icon">👤</span>
                    {!isSidebarCollapsed && <span className="console-nav-text">Acompanhamento Cursista</span>}
                  </button>

                  {isSuperAdminTutor && (
                    <button
                      type="button"
                      className={`console-nav-item ${activeTab === 'tutor_insights' ? 'active' : ''}`}
                      onClick={() => { setMacroPilar('pedagogica'); setActiveTab('tutor_insights'); }}
                      title="Observação do Tutor (Superadmin)"
                    >
                      <span className="console-nav-icon">🔭</span>
                      {!isSidebarCollapsed && <span className="console-nav-text">Observação do Tutor</span>}
                    </button>
                  )}
                </div>

                {/* GESTÃO ADMINISTRATIVA */}
                <div className="console-nav-group">
                  {!isSidebarCollapsed && <div className="console-nav-label">Gestão Administrativa</div>}

                  <button
                    type="button"
                    className={`console-nav-item ${activeTab === 'panorama' ? 'active' : ''}`}
                    onClick={() => { setMacroPilar('administrativa'); setActiveTab('panorama'); }}
                    title="Panorama Geral"
                  >
                    <span className="console-nav-icon">🌐</span>
                    {!isSidebarCollapsed && <span className="console-nav-text">Panorama Geral</span>}
                  </button>

                  <button
                    type="button"
                    className={`console-nav-item ${activeTab === 'turmas' ? 'active' : ''}`}
                    onClick={() => { setMacroPilar('administrativa'); setActiveTab('turmas'); }}
                    title="Gestão de Turmas"
                  >
                    <span className="console-nav-icon">🏫</span>
                    {!isSidebarCollapsed && <span className="console-nav-text">Gestão de Turmas</span>}
                  </button>

                  <button
                    type="button"
                    className={`console-nav-item ${activeTab === 'remanejamentos' ? 'active' : ''}`}
                    onClick={() => { setMacroPilar('administrativa'); setActiveTab('remanejamentos'); }}
                    title="Remanejamentos & Modalidades"
                  >
                    <span className="console-nav-icon">⚖️</span>
                    {!isSidebarCollapsed && (
                      <span className="console-nav-text">
                        Remanejamentos & Trocas
                        {movimentacoesList.filter(m => m.status === 'Pendente').length > 0 && (
                          <span className="console-badge-pending">
                            {movimentacoesList.filter(m => m.status === 'Pendente').length}
                          </span>
                        )}
                      </span>
                    )}
                  </button>

                  <button
                    type="button"
                    className={`console-nav-item ${activeTab === 'cursistas' ? 'active' : ''}`}
                    onClick={() => { setMacroPilar('administrativa'); setActiveTab('cursistas'); }}
                    title="Contato Cursistas"
                  >
                    <span className="console-nav-icon">📱</span>
                    {!isSidebarCollapsed && <span className="console-nav-text">Contato Cursistas</span>}
                  </button>

                  {effectiveRole !== 'formador' && (
                    <button
                      type="button"
                      className={`console-nav-item ${activeTab === 'formadores' ? 'active' : ''}`}
                      onClick={() => { setMacroPilar('administrativa'); setActiveTab('formadores'); }}
                      title="Contato Formadores"
                    >
                      <span className="console-nav-icon">🎓</span>
                      {!isSidebarCollapsed && <span className="console-nav-text">Contato Formadores</span>}
                    </button>
                  )}

                  {effectiveRole !== 'formador' && (
                    <button
                      type="button"
                      className={`console-nav-item ${activeTab === 'tutoria' ? 'active' : ''}`}
                      onClick={() => { setMacroPilar('administrativa'); setActiveTab('tutoria'); }}
                      title="Dados Tutoria"
                    >
                      <span className="console-nav-icon">🤝</span>
                      {!isSidebarCollapsed && <span className="console-nav-text">Dados Tutoria</span>}
                    </button>
                  )}

                  {(userRole === 'admin' || userRole === 'tecnico' || !simulatedRole) && (
                    <button
                      type="button"
                      className={`console-nav-item ${activeTab === 'concluintes' ? 'active' : ''}`}
                      onClick={() => { setMacroPilar('administrativa'); setActiveTab('concluintes'); }}
                      title="Concluintes (1º Chamamento)"
                    >
                      <span className="console-nav-icon">📜</span>
                      {!isSidebarCollapsed && <span className="console-nav-text">Concluintes (1º CH)</span>}
                    </button>
                  )}

                  {(userRole === 'admin' || userRole === 'tecnico' || !simulatedRole) && (
                    <button
                      type="button"
                      className={`console-nav-item ${activeTab === 'exonerados' ? 'active' : ''}`}
                      onClick={() => { setMacroPilar('administrativa'); setActiveTab('exonerados'); }}
                      title="Servidores Exonerados"
                    >
                      <span className="console-nav-icon">🚪</span>
                      {!isSidebarCollapsed && <span className="console-nav-text">Exonerados</span>}
                    </button>
                  )}

                  {(userRole === 'admin' || isSuperAdminTutor) && (
                    <button
                      type="button"
                      className={`console-nav-item ${activeTab === 'intencao_vagas_2027' ? 'active' : ''}`}
                      onClick={() => { setMacroPilar('administrativa'); setActiveTab('intencao_vagas_2027'); }}
                      title="Intenção de Vagas 2027"
                    >
                      <span className="console-nav-icon">📑</span>
                      {!isSidebarCollapsed && <span className="console-nav-text">Intenção Vagas 2027</span>}
                    </button>
                  )}

                  {userRole === 'admin' && !simulatedRole && (
                    <button
                      type="button"
                      className={`console-nav-item ${activeTab === 'admin' ? 'active' : ''}`}
                      onClick={() => { setMacroPilar('administrativa'); setActiveTab('admin'); }}
                      title="Painel Admin ('Modo Deus')"
                    >
                      <span className="console-nav-icon">⚙️</span>
                      {!isSidebarCollapsed && <span className="console-nav-text">Painel Admin</span>}
                    </button>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Footer da Sidebar */}
          <div className="console-sidebar-footer">
            {!isSidebarCollapsed && (
              <div style={{ fontSize: '0.72rem', color: '#64748b', lineHeight: 1.35 }}>
                <div><strong>TiDB Cloud</strong> Serverless</div>
                <div style={{ opacity: 0.8 }}>SEED-PR · DAP/CFDEG</div>
              </div>
            )}
          </div>
        </aside>

        {/* Área Principal de Conteúdo */}
        <HistoricoTurmasContext.Provider value={historicoTurmasCtx}>
          <main className="console-main-content page-transition-enter" key={activeTab}>
            {renderTabContent()}
          </main>
        </HistoricoTurmasContext.Provider>
      </div>

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
      <footer style={{ backgroundColor: 'var(--color-primary-dark)', color: 'rgba(255,255,255,0.7)', padding: '1.5rem', textAlign: 'center', fontSize: '0.8rem', marginTop: 'auto', borderTop: '4px solid var(--color-accent-green)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
        <img src="/brasao_parana.svg" alt="Brasão do Paraná" style={{ height: '36px', width: 'auto', opacity: 0.9 }} />
        <p>© 2026 Estágio Probatório - Secretaria da Educação do Estado do Paraná (SEED-PR)</p>
        <p style={{ fontSize: '0.75rem', opacity: 0.6 }}>Ambientes de Acesso por Perfil (RBAC Google Workspace) & Sincronização de Turmas</p>
      </footer>
    </div>
  );
}
