import React, { useState, useEffect, useMemo } from 'react';
import { database, isConfigured as isFirebaseConfigured } from '../firebase';
import { supabase, isConfigured as isSupabaseConfigured } from '../supabase';
import { ref, onValue, remove, update } from 'firebase/database';
import { calculateSLA } from '../utils/slaUtils';
import { fetchAllGoogleSheetsData } from '../utils/sheetUtils';
import FormularioChamadoTutor from './FormularioChamadoTutor';

export default function Movimentacoes({ userEmail, userRole, tutorData }) {
  const [movements, setMovements] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isSyncingSheet, setIsSyncingSheet] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Abas de Atendimento: 'fila' (Pendentes / Em Análise) vs 'historico' (Deferido / Indeferido / Resolvido)
  const [activeTab, setActiveTab] = useState('fila');
  
  // Filtros avançados
  const [tipoFilter, setTipoFilter] = useState('');
  const [slaFilter, setSlaFilter] = useState('');
  const [nreFilter, setNreFilter] = useState('');

  // Modais de Ação
  const [showTutorModal, setShowTutorModal] = useState(false);
  const [selectedMovForAction, setSelectedMovForAction] = useState(null);
  const [adminStatusResponse, setAdminStatusResponse] = useState('Deferido');
  const [adminNotaResolucao, setAdminNotaResolucao] = useState('');
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  // Mock de Movimentações / Chamados com timestamps variados para demonstrar o SLA por Cores
  const mockMovements = useMemo(() => [
    {
      id: 'mock-1',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 12).toISOString(), // 12 horas atrás (VERDE 0-3d)
      nome_cursista: 'ABDIAS BALBINO NUNES NETO',
      cgm: '7771071125',
      turma_anterior: 'FORM-HISTORIA EST PROB J MANHA',
      turma_nova: 'FORM-HISTORIA EST PROB K MANHA',
      tipo_acao: 'Troca de Turma',
      motivo: 'Troca de Turma - Incompatibilidade comprovada de jornada',
      email_tutor_responsavel: 'dulce.carpes@escola.pr.gov.br',
      tutor: 'DULCE MARA LANGHINOTTI CARPES',
      nre: 'LARANJEIRAS DO SUL',
      status: 'Pendente',
      solicitadoPor: 'Google Forms'
    },
    {
      id: 'mock-2',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5).toISOString(), // 5 dias atrás (AMARELO 4-7d)
      nome_cursista: 'ABNER JOSE DE SOUZA VICENTE',
      cgm: '7770340300',
      turma_anterior: 'FORM-BIOLOGIA EST PROB E TARDE',
      turma_nova: 'FORM-BIOLOGIA EST PROB F MANHA',
      tipo_acao: 'Troca de Modalidade',
      motivo: 'Troca de Modalidade - Solicitou Presencial para EAD',
      email_tutor_responsavel: 'barbosa_claudia955@escola.pr.gov.br',
      tutor: 'CLÁUDIA BARBOSA',
      nre: 'TOLEDO',
      status: 'Pendente',
      solicitadoPor: 'Google Forms'
    },
    {
      id: 'mock-3',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 9).toISOString(), // 9 dias atrás (LARANJA 8-10d)
      nome_cursista: 'ACASSIO KULKA',
      cgm: '7770000100',
      turma_anterior: 'FORM-LEM-INGLES EST PROB L MANHA',
      turma_nova: 'FORM-LEM-INGLES EST PROB A MANHA',
      tipo_acao: 'Chamado Tutor',
      motivo: 'Chamado Tutor - Requerimento de Enturmação Especial',
      email_tutor_responsavel: 'sirleyjeremias@escola.pr.gov.br',
      tutor: 'SIRLEY JEREMIAS',
      nre: 'UNIÃO DA VITÓRIA',
      status: 'Em Análise',
      solicitadoPor: 'Google Forms'
    },
    {
      id: 'mock-4',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 14).toISOString(), // 14 dias atrás (VERMELHO >10d)
      nome_cursista: 'ADA LUANA HOFFMANN',
      cgm: '7770516468',
      turma_anterior: 'FORM-GEOGRAFIA EST PROB B MANHA',
      turma_nova: 'FORM-GEOGRAFIA EST PROB A TARDE',
      tipo_acao: 'Vínculo na AF',
      motivo: 'Vínculo na AF - Ajuste de Inscrição em Ano Formativo',
      email_tutor_responsavel: 'mariaaraujo@escola.pr.gov.br',
      tutor: 'MARIA CLARICE DIAS ARAÚJO',
      nre: 'TELÊMACO BORBA',
      status: 'Pendente',
      solicitadoPor: 'Google Forms'
    },
    {
      id: 'mock-5',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString(), // 3 dias atrás (HISTÓRICO)
      nome_cursista: 'ALEXANDRE BOMFIM DE SOUZA',
      cgm: '7770999888',
      turma_anterior: 'FORM-PEDAGOGO EST PROB A MANHA',
      turma_nova: 'FORM-PEDAGOGO EST PROB B TARDE',
      tipo_acao: 'Troca de Turma',
      motivo: 'Troca de Turma - Deferida alteração por choque de horário',
      email_tutor_responsavel: 'adrianabiancato@escola.pr.gov.br',
      tutor: 'ADRIANA APARECIDA BIANCATO',
      nre: 'CASCAVEL',
      status: 'Deferido',
      nota_resolucao: 'Solicitação analisada e deferida pela Coordenação Estadual.',
      solicitadoPor: 'Google Forms'
    }
  ], []);

  // Função para carregar dados de todas as abas do Google Sheets
  const syncGoogleSheets = async () => {
    setIsSyncingSheet(true);
    try {
      const sheetData = await fetchAllGoogleSheetsData();
      if (sheetData && sheetData.length > 0) {
        setMovements(prev => {
          const existingIds = new Set(prev.map(p => p.id));
          const newFromSheet = sheetData.filter(s => !existingIds.has(s.id));
          return [...newFromSheet, ...prev];
        });
      }
    } catch (e) {
      console.warn("Erro ao sincronizar com Google Sheets:", e);
    } finally {
      setIsSyncingSheet(false);
    }
  };

  useEffect(() => {
    // Sincroniza dados da planilha pública ao montar o componente
    syncGoogleSheets();

    if (isSupabaseConfigured && supabase) {
      setLoading(true);

      const fetchMovements = async () => {
        try {
          const { data, error } = await supabase
            .from('movimentacoes')
            .select('*')
            .order('timestamp', { ascending: false });

          if (error) throw error;
          if (data && data.length > 0) {
            setMovements(prev => {
              const existingIds = new Set(data.map(d => d.id));
              const notInDb = prev.filter(p => !existingIds.has(p.id));
              return [...data, ...notInDb];
            });
          }
        } catch (err) {
          console.error("Erro ao carregar movimentações do Supabase:", err);
        } finally {
          setLoading(false);
        }
      };

      fetchMovements();

      const channel = supabase
        .channel('movimentacoes-realtime')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'movimentacoes' }, () => {
          fetchMovements();
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    } else if (isFirebaseConfigured && database) {
      setLoading(true);
      const movementsRef = ref(database, 'movements');
      
      const unsubscribe = onValue(movementsRef, (snapshot) => {
        const val = snapshot.val();
        if (val) {
          const list = Object.entries(val).map(([id, data]) => ({
            id,
            ...data
          }));
          list.sort((a, b) => new Date(b.timestamp || b.dataHora) - new Date(a.timestamp || a.dataHora));
          setMovements(prev => {
            const existingIds = new Set(list.map(d => d.id));
            const notInDb = prev.filter(p => !existingIds.has(p.id));
            return [...list, ...notInDb];
          });
        }
        setLoading(false);
      }, (error) => {
        console.error("Erro ao carregar movimentações do Firebase:", error);
        setLoading(false);
      });

      return () => unsubscribe();
    } else {
      setMovements(mockMovements);
    }
  }, [mockMovements]);

  // Handler para novas solicitações (enviadas por cursista ou tutor)
  const handleNovoChamadoSubmetido = (novoChamado) => {
    setMovements(prev => [novoChamado, ...prev]);
    setShowTutorModal(false);
  };

  // Handler para atualizar status do chamado pelo Admin (Deferido, Indeferido, Resolvido, Em Análise)
  const handleSalvarStatusAdmin = async () => {
    if (!selectedMovForAction) return;
    setIsUpdatingStatus(true);

    const updatedData = {
      status: adminStatusResponse,
      nota_resolucao: adminNotaResolucao || `Atendido pelo Admin (${adminStatusResponse})`,
      data_atendimento: new Date().toISOString()
    };

    try {
      if (isSupabaseConfigured && supabase) {
        await supabase
          .from('movimentacoes')
          .update(updatedData)
          .eq('id', selectedMovForAction.id);
      } else if (isFirebaseConfigured && database) {
        const movementRef = ref(database, `movements/${selectedMovForAction.id}`);
        await update(movementRef, updatedData);
      }

      // Atualização Local do Estado
      setMovements(prev => prev.map(m => {
        if (m.id === selectedMovForAction.id) {
          return { ...m, ...updatedData };
        }
        return m;
      }));

      setSelectedMovForAction(null);
      setAdminNotaResolucao('');
    } catch (e) {
      console.error("Erro ao atualizar status do chamado:", e);
      alert("Erro ao atualizar status: " + e.message);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  // Função para deletar movimentação (apenas admins)
  const handleDeleteMovement = async (id) => {
    if (!window.confirm("Deseja realmente remover esta solicitação do histórico?")) return;
    try {
      if (isSupabaseConfigured && supabase) {
        await supabase.from('movimentacoes').delete().eq('id', id);
      } else if (isFirebaseConfigured && database) {
        const movementRef = ref(database, `movements/${id}`);
        await remove(movementRef);
      }
      setMovements(prev => prev.filter(m => m.id !== id));
    } catch (e) {
      console.error("Erro ao deletar movimentação:", e);
    }
  };

  // Opções únicas para Filtros
  const nreOptions = useMemo(() => {
    const set = new Set();
    movements.forEach(m => { if (m.nre) set.add(m.nre); });
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'pt-BR'));
  }, [movements]);

  // Filtragem baseada nas Abas (Fila vs Histórico), cargo (RBAC), busca e SLA
  const filteredMovements = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    const cleanUserEmail = userEmail ? userEmail.toLowerCase().trim() : '';

    return movements.filter(mov => {
      // 1. Controle da Aba Ativa (Fila de Atendimento vs Histórico Concluído)
      const currentStatus = (mov.status || 'Pendente').trim();
      const isConcluido = ['Deferido', 'Indeferido', 'Resolvido'].includes(currentStatus);

      if (activeTab === 'fila' && isConcluido) return false;
      if (activeTab === 'historico' && !isConcluido) return false;

      // 2. Controle de acesso por Cargo (RBAC)
      let hasAccess = false;
      if (userRole === 'admin' || userRole === 'tecnico') {
        hasAccess = true;
      } else if (userRole === 'tutor') {
        hasAccess = true; // Tutores têm acesso às solicitações do programa
      } else if (userRole === 'formador') {
        hasAccess = (mov.email_formador && mov.email_formador.toLowerCase() === cleanUserEmail) ||
                    (mov.email_formador_origem && mov.email_formador_origem.toLowerCase() === cleanUserEmail);
      } else if (userRole === 'cursista') {
        hasAccess = (mov.emailCursista && mov.emailCursista.toLowerCase() === cleanUserEmail) ||
                    (mov.email && mov.email.toLowerCase() === cleanUserEmail);
      }

      if (!hasAccess) return false;

      // 3. Filtro por Tipo de Requerimento
      if (tipoFilter && (mov.tipo_acao || '') !== tipoFilter) return false;

      // 4. Filtro por NRE
      if (nreFilter && (mov.nre || '') !== nreFilter) return false;

      // 5. Filtro por SLA / Nível de Urgência por Cores
      if (slaFilter) {
        const sla = calculateSLA(mov.timestamp || mov.dataHora);
        if (sla.level !== slaFilter) return false;
      }

      // 6. Filtro de pesquisa (Nome, CGM, Tutor, E-mail)
      if (query) {
        const nomeMatch = (mov.nome_cursista || mov.nomeCursista || '').toLowerCase().includes(query);
        const cgmMatch = (mov.cgm || '').toLowerCase().includes(query);
        const tutorMatch = (mov.tutor || mov.tutor_responsavel || '').toLowerCase().includes(query);
        const emailMatch = (mov.email || mov.emailCursista || '').toLowerCase().includes(query);
        if (!nomeMatch && !cgmMatch && !tutorMatch && !emailMatch) return false;
      }

      return true;
    });
  }, [movements, activeTab, userEmail, userRole, searchQuery, tipoFilter, nreFilter, slaFilter]);

  // Contadores para os Badges KPIs das Abas
  const countFila = useMemo(() => {
    return movements.filter(m => !['Deferido', 'Indeferido', 'Resolvido'].includes(m.status || 'Pendente')).length;
  }, [movements]);

  const countHistorico = useMemo(() => {
    return movements.filter(m => ['Deferido', 'Indeferido', 'Resolvido'].includes(m.status || '')).length;
  }, [movements]);

  // Formatador de Data/Hora
  const formatTime = (isoString) => {
    try {
      const date = new Date(isoString);
      if (isNaN(date.getTime())) return isoString || "Data não informada";
      
      const now = new Date();
      const formatNumber = (num) => num.toString().padStart(2, '0');
      const timeStr = `${formatNumber(date.getHours())}:${formatNumber(date.getMinutes())}`;
      
      const isToday = date.getDate() === now.getDate() &&
                      date.getMonth() === now.getMonth() &&
                      date.getFullYear() === now.getFullYear();
                      
      if (isToday) return `Hoje às ${timeStr}`;
      
      const isYesterday = new Date(now - 86400000).getDate() === date.getDate();
      if (isYesterday) return `Ontem às ${timeStr}`;
      
      return `${formatNumber(date.getDate())}/${formatNumber(date.getMonth() + 1)}/${date.getFullYear()} às ${timeStr}`;
    } catch (e) {
      return "Data não informada";
    }
  };

  // Exportar Lista de Movimentações para CSV
  const handleExportCSV = () => {
    if (filteredMovements.length === 0) {
      alert("Nenhuma solicitação encontrada para exportar.");
      return;
    }

    const headers = [
      "ID Chamado", "Data/Hora", "SLA Dias", "Nível Urgência", "CGM", "Nome do Cursista/Envolvido",
      "E-mail", "Tipo Requerimento", "Motivo", "Turma Origem", "Turma Destino / Detalhes",
      "Tutor Responsável", "Formador Responsável", "NRE", "Status", "Nota Resolução"
    ];

    const rows = filteredMovements.map(m => {
      const sla = calculateSLA(m.timestamp || m.dataHora);
      return [
        `"${m.id || ''}"`,
        `"${m.timestamp || m.dataHora || ''}"`,
        `"${sla.days}"`,
        `"${sla.statusText}"`,
        `"${m.cgm || ''}"`,
        `"${(m.nome_cursista || m.nomeCursista || '').replace(/"/g, '""')}"`,
        `"${(m.email || m.emailCursista || '').replace(/"/g, '""')}"`,
        `"${m.tipo_acao || 'Solicitação'}"`,
        `"${(m.motivo || '').replace(/"/g, '""')}"`,
        `"${(m.turma_anterior || m.turmaOrigem || '').replace(/"/g, '""')}"`,
        `"${(m.turma_nova || m.turmaDestino || m.turma_detalhes || '').replace(/"/g, '""')}"`,
        `"${(m.tutor || m.tutor_responsavel || '').replace(/"/g, '""')}"`,
        `"${(m.formador || m.nome_formador || '').replace(/"/g, '""')}"`,
        `"${(m.nre || '').replace(/"/g, '""')}"`,
        `"${m.status || 'Pendente'}"`,
        `"${(m.nota_resolucao || '').replace(/"/g, '""')}"`
      ];
    });

    const csvContent = "\uFEFF" + [headers.join(";"), ...rows.map(r => r.join(";"))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `relatorio_atendimento_chamados_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="glass-panel animate-fade-in" style={{ padding: '1.5rem' }}>
      
      {/* Banner de Cabeçalho da Seção */}
      <div className="panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.2rem' }}>
        <div>
          <h2 className="panel-title" style={{ fontSize: '1.35rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span>🔄</span> Central de Movimentações, Requerimentos & Chamados
          </h2>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.88rem', marginTop: '0.2rem' }}>
            Atendimento de solicitações de Troca de Turma, Troca de Modalidade, Vínculo na AF e Requerimentos de Tutores.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Botão de Sincronização em Tempo Real com o Google Sheets */}
          <button
            onClick={syncGoogleSheets}
            disabled={isSyncingSheet}
            style={{
              backgroundColor: '#0b3c5d',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              padding: '0.55rem 1rem',
              fontSize: '0.85rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              boxShadow: '0 2px 6px rgba(11,60,93,0.3)'
            }}
          >
            <span>{isSyncingSheet ? '⏳ Sincronizando...' : '🔄 Sincronizar Google Sheets'}</span>
          </button>

          {/* Botão de Abertura de Chamado para Tutores */}
          {(userRole === 'tutor' || userRole === 'admin' || userRole === 'tecnico') && (
            <button
              onClick={() => setShowTutorModal(true)}
              style={{
                backgroundColor: '#15803d',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                padding: '0.55rem 1.1rem',
                fontSize: '0.85rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                boxShadow: '0 2px 6px rgba(21,128,61,0.3)'
              }}
            >
              <span>📋</span> Abrir Chamado do Tutor
            </button>
          )}

          <button
            onClick={handleExportCSV}
            className="btn-primary"
            style={{
              backgroundColor: '#0284c7',
              color: '#fff',
              fontWeight: 700,
              fontSize: '0.85rem',
              padding: '0.55rem 1.1rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem'
            }}
          >
            <span>📥</span> Baixar CSV
          </button>
        </div>
      </div>

      {/* Navegação entre Sub-Abas: Fila de Atendimento vs Histórico */}
      <div style={{ display: 'flex', borderBottom: '2px solid #e2e8f0', marginBottom: '1.5rem', gap: '0.5rem' }}>
        <button
          onClick={() => setActiveTab('fila')}
          style={{
            padding: '0.7rem 1.2rem',
            border: 'none',
            background: 'none',
            fontSize: '0.92rem',
            fontWeight: 800,
            cursor: 'pointer',
            color: activeTab === 'fila' ? 'var(--color-primary-dark)' : 'var(--color-text-muted)',
            borderBottom: activeTab === 'fila' ? '3px solid var(--color-accent-blue)' : '3px solid transparent',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem'
          }}
        >
          <span>⏳</span> Fila de Atendimento (Pendentes)
          <span style={{ fontSize: '0.75rem', backgroundColor: activeTab === 'fila' ? '#0284c7' : '#94a3b8', color: '#fff', padding: '0.15rem 0.5rem', borderRadius: '12px' }}>
            {countFila}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('historico')}
          style={{
            padding: '0.7rem 1.2rem',
            border: 'none',
            background: 'none',
            fontSize: '0.92rem',
            fontWeight: 800,
            cursor: 'pointer',
            color: activeTab === 'historico' ? 'var(--color-primary-dark)' : 'var(--color-text-muted)',
            borderBottom: activeTab === 'historico' ? '3px solid var(--color-accent-green)' : '3px solid transparent',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem'
          }}
        >
          <span>✅</span> Histórico de Atendimentos (Concluídos)
          <span style={{ fontSize: '0.75rem', backgroundColor: activeTab === 'historico' ? '#15803d' : '#94a3b8', color: '#fff', padding: '0.15rem 0.5rem', borderRadius: '12px' }}>
            {countHistorico}
          </span>
        </button>
      </div>

      {/* Legenda dos Prazos SLA (Classificação por Cores) */}
      <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '0.85rem 1rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--color-primary-dark)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          ⏱️ <b>Legenda de Prazos (SLA por Tempo de Espera):</b>
        </div>
        <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', fontSize: '0.78rem' }}>
          <span style={{ backgroundColor: 'rgba(21, 128, 61, 0.12)', color: '#15803d', border: '1px solid #bbf7d0', padding: '0.2rem 0.6rem', borderRadius: '6px', fontWeight: 700 }}>
            🟩 Verde: 0 a 3 dias (Prazo Normal)
          </span>
          <span style={{ backgroundColor: 'rgba(245, 158, 11, 0.15)', color: '#b45309', border: '1px solid #fde68a', padding: '0.2rem 0.6rem', borderRadius: '6px', fontWeight: 700 }}>
            🟨 Amarelo: 4 a 7 dias (Atenção)
          </span>
          <span style={{ backgroundColor: 'rgba(249, 115, 22, 0.18)', color: '#c2410c', border: '1px solid #ffedd5', padding: '0.2rem 0.6rem', borderRadius: '6px', fontWeight: 700 }}>
            🟧 Laranja: 8 a 10 dias (Urgente)
          </span>
          <span style={{ backgroundColor: 'rgba(220, 38, 38, 0.18)', color: '#b91c1c', border: '1px solid #fecaca', padding: '0.2rem 0.6rem', borderRadius: '6px', fontWeight: 700 }}>
            🟥 Vermelho: > 10 dias (Crítico)
          </span>
        </div>
      </div>

      {/* Painel de Filtros Avançados */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.9rem', marginBottom: '1.5rem', alignItems: 'flex-end' }}>
        
        {/* Busca por Nome ou CGM */}
        <div>
          <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--color-primary-dark)', marginBottom: '0.3rem' }}>
            🔍 Buscar Nome / CGM / Tutor:
          </label>
          <input 
            type="text" 
            placeholder="Nome, CGM ou e-mail..." 
            className="filter-input"
            style={{ width: '100%', margin: 0, padding: '0.55rem 0.8rem', fontSize: '0.85rem' }}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Tipo de Requerimento */}
        <div>
          <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--color-primary-dark)', marginBottom: '0.3rem' }}>
            📁 Tipo de Requerimento:
          </label>
          <select 
            value={tipoFilter} 
            onChange={e => setTipoFilter(e.target.value)}
            style={{ width: '100%', padding: '0.55rem 0.8rem', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: 'white', fontSize: '0.85rem' }}
          >
            <option value="">-- Todos os Tipos --</option>
            <option value="Troca de Turma">🔄 Troca de Turma</option>
            <option value="Troca de Modalidade">💻 Troca de Modalidade</option>
            <option value="Vínculo na AF">🎓 Vínculo na AF</option>
            <option value="Chamado Tutor">📋 Chamado do Tutor</option>
          </select>
        </div>

        {/* Nível de SLA / Urgência */}
        <div>
          <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--color-primary-dark)', marginBottom: '0.3rem' }}>
            ⏱️ Filtrar por Prazo (SLA):
          </label>
          <select 
            value={slaFilter} 
            onChange={e => setSlaFilter(e.target.value)}
            style={{ width: '100%', padding: '0.55rem 0.8rem', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: 'white', fontSize: '0.85rem' }}
          >
            <option value="">-- Todos os Prazos --</option>
            <option value="verde">🟩 Verde (0 a 3 dias)</option>
            <option value="amarelo">🟨 Amarelo (4 a 7 dias)</option>
            <option value="laranja">🟧 Laranja (8 a 10 dias)</option>
            <option value="vermelho">🟥 Vermelho (> 10 dias)</option>
          </select>
        </div>

        {/* NRE */}
        <div>
          <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--color-primary-dark)', marginBottom: '0.3rem' }}>
            📍 Filtrar por NRE:
          </label>
          <select 
            value={nreFilter} 
            onChange={e => setNreFilter(e.target.value)}
            style={{ width: '100%', padding: '0.55rem 0.8rem', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: 'white', fontSize: '0.85rem' }}
          >
            <option value="">-- Todos os NREs --</option>
            {nreOptions.map(n => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>

      </div>

      {/* Lista / Timeline de Solicitações */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
          <div className="pulse-dot"></div>
        </div>
      ) : filteredMovements.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '4rem 2rem', color: 'var(--color-text-muted)' }}>
          <i className="lucide-calendar-x" style={{ fontSize: '2.5rem', marginBottom: '1rem', display: 'block', opacity: 0.5 }}></i>
          {activeTab === 'fila' 
            ? "Nenhuma solicitação pendente na Fila de Atendimento!" 
            : "Nenhuma solicitação no Histórico de Atendimentos."}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
          {filteredMovements.map((mov) => {
            const sla = calculateSLA(mov.timestamp || mov.dataHora);
            const currentStatus = mov.status || 'Pendente';

            return (
              <div 
                key={mov.id} 
                className="glass-panel" 
                style={{
                  background: '#fff',
                  borderRadius: '12px',
                  padding: '1.25rem 1.5rem',
                  border: `1.5px solid ${sla.border}`,
                  boxShadow: 'var(--shadow-sm)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.75rem',
                  position: 'relative'
                }}
              >
                {/* Header do Card */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.6rem' }}>
                  
                  {/* Badges do Tipo e SLA */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                    <span style={{
                      backgroundColor: 'var(--color-primary-dark)',
                      color: '#ffffff',
                      padding: '0.25rem 0.65rem',
                      borderRadius: '6px',
                      fontSize: '0.75rem',
                      fontWeight: 800,
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px'
                    }}>
                      {mov.tipo_acao || 'Solicitação'}
                    </span>

                    {/* Selo SLA por Cores */}
                    <span style={{
                      backgroundColor: sla.bg,
                      color: sla.color,
                      border: `1px solid ${sla.border}`,
                      padding: '0.25rem 0.65rem',
                      borderRadius: '6px',
                      fontSize: '0.75rem',
                      fontWeight: 800,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.3rem'
                    }}>
                      ⏱️ {sla.label} ({sla.statusText})
                    </span>

                    {/* Badge de Status do Atendimento */}
                    <span style={{
                      backgroundColor: currentStatus === 'Deferido' || currentStatus === 'Resolvido' ? '#dcfce7' : currentStatus === 'Indeferido' ? '#fee2e2' : '#fef3c7',
                      color: currentStatus === 'Deferido' || currentStatus === 'Resolvido' ? '#15803d' : currentStatus === 'Indeferido' ? '#b91c1c' : '#b45309',
                      padding: '0.25rem 0.65rem',
                      borderRadius: '6px',
                      fontSize: '0.75rem',
                      fontWeight: 800,
                      textTransform: 'uppercase'
                    }}>
                      {currentStatus}
                    </span>
                  </div>

                  {/* Data e Ações do Admin */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>
                      🕒 {formatTime(mov.timestamp || mov.dataHora)}
                    </span>

                    {/* Botão para o Admin Atender / Responder Chamado */}
                    {(userRole === 'admin' || userRole === 'tecnico') && (
                      <button
                        onClick={() => {
                          setSelectedMovForAction(mov);
                          setAdminStatusResponse(mov.status && ['Deferido', 'Indeferido', 'Resolvido'].includes(mov.status) ? mov.status : 'Deferido');
                          setAdminNotaResolucao(mov.nota_resolucao || '');
                        }}
                        style={{
                          backgroundColor: 'var(--color-primary-dark)',
                          color: '#ffffff',
                          border: 'none',
                          padding: '0.35rem 0.8rem',
                          borderRadius: '6px',
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.3rem'
                        }}
                      >
                        ✏️ {['Deferido', 'Indeferido', 'Resolvido'].includes(currentStatus) ? 'Alterar Resposta' : 'Atender Chamado'}
                      </button>
                    )}

                    {userRole === 'admin' && (
                      <button
                        title="Remover do histórico"
                        style={{ background: 'none', border: 'none', color: '#e53e3e', cursor: 'pointer', padding: '0.2rem' }}
                        onClick={() => handleDeleteMovement(mov.id)}
                      >
                        🗑️
                      </button>
                    )}
                  </div>

                </div>

                {/* Corpo das Informações da Solicitação */}
                <div style={{ fontSize: '0.92rem', color: 'var(--color-text-main)', lineHeight: 1.5 }}>
                  <div style={{ fontWeight: 700, color: 'var(--color-primary-dark)', fontSize: '1rem', marginBottom: '0.2rem' }}>
                    👤 {mov.nome_cursista || mov.nomeCursista || 'Solicitante Desconhecido'} 
                    {mov.cgm && <span style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', fontWeight: 400 }}> (CGM: {mov.cgm})</span>}
                  </div>

                  {mov.motivo && (
                    <div style={{ fontSize: '0.88rem', margin: '0.3rem 0' }}>
                      <b>Motivo / Requerimento:</b> {mov.motivo}
                    </div>
                  )}

                  {(mov.turma_anterior || mov.turmaOrigem || mov.turma_nova || mov.turmaDestino || mov.turma_detalhes) && (
                    <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', backgroundColor: '#f8fafc', padding: '0.5rem 0.75rem', borderRadius: '6px', margin: '0.4rem 0' }}>
                      {mov.turma_anterior || mov.turmaOrigem ? <span><b>Turma Atual:</b> {mov.turma_anterior || mov.turmaOrigem} | </span> : null}
                      {mov.turma_nova || mov.turmaDestino ? <span><b>Turma Desejada:</b> {mov.turma_nova || mov.turmaDestino} | </span> : null}
                      {mov.turma_detalhes ? <span><b>Detalhes da Turma:</b> {mov.turma_detalhes} | </span> : null}
                      {mov.modalidade_detalhes ? <span><b>Modalidade:</b> {mov.modalidade_detalhes}</span> : null}
                    </div>
                  )}

                  {(mov.justificativa || mov.descricao) && (
                    <div style={{ fontSize: '0.85rem', color: '#334155', fontStyle: 'italic', marginTop: '0.3rem' }}>
                      "{(mov.justificativa || mov.descricao)}"
                    </div>
                  )}

                  {/* Nota de Resolução do Admin (Se já atendido) */}
                  {mov.nota_resolucao && (
                    <div style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '6px', padding: '0.5rem 0.75rem', marginTop: '0.5rem', fontSize: '0.83rem', color: '#166534' }}>
                      <b>💬 Resposta do Atendimento Admin:</b> {mov.nota_resolucao}
                    </div>
                  )}
                </div>

                {/* Footer dos Metadados (Tutor, Formador, NRE) */}
                <div style={{ 
                  display: 'flex', 
                  gap: '1.2rem', 
                  fontSize: '0.78rem', 
                  color: 'var(--color-text-muted)',
                  borderTop: '1px solid #f1f5f9',
                  paddingTop: '0.5rem',
                  marginTop: '0.2rem',
                  flexWrap: 'wrap'
                }}>
                  <span><b>👤 Tutor Responsável:</b> {mov.tutor || mov.tutor_responsavel || 'Não Atribuído'} {mov.email_tutor_responsavel ? `(${mov.email_tutor_responsavel})` : ''}</span>
                  <span><b>🎓 Formador:</b> {mov.formador || mov.nome_formador || 'Não Informado'}</span>
                  <span><b>📍 NRE:</b> {mov.nre || 'Não Informado'}</span>
                  <span><b>Enviado Por:</b> {mov.solicitadoPor || 'Plataforma / Forms'}</span>
                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* Modal de Abertura de Chamado pelo Tutor */}
      {showTutorModal && (
        <FormularioChamadoTutor 
          userEmail={userEmail}
          tutorData={tutorData}
          onClose={() => setShowTutorModal(false)}
          onSubmitSuccess={handleNovoChamadoSubmetido}
        />
      )}

      {/* Modal de Ação do Administrador (Atender Chamado / Alterar Status) */}
      {selectedMovForAction && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0, 29, 61, 0.75)',
          backdropFilter: 'blur(5px)',
          display: 'flex', justifyContent: 'center', alignItems: 'center',
          zIndex: 1200, padding: '1rem'
        }} onClick={() => setSelectedMovForAction(null)}>
          <div className="animate-fade-in" style={{
            background: 'white', borderRadius: '14px',
            width: '100%', maxWidth: '580px',
            padding: '1.5rem', boxShadow: 'var(--shadow-lg)',
            display: 'flex', flexDirection: 'column', gap: '1.2rem'
          }} onClick={e => e.stopPropagation()}>
            
            <div style={{ borderBottom: '2px solid #e2e8f0', paddingBottom: '0.8rem' }}>
              <h3 style={{ fontSize: '1.15rem', color: 'var(--color-primary-dark)', fontWeight: 800, margin: 0 }}>
                ✏️ Atendimento do Chamado / Solicitação
              </h3>
              <span style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)' }}>
                Solicitante: <b>{selectedMovForAction.nome_cursista || selectedMovForAction.nomeCursista}</b>
              </span>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-primary-dark)', marginBottom: '0.4rem' }}>
                Alterar Status para:
              </label>
              <select
                value={adminStatusResponse}
                onChange={e => setAdminStatusResponse(e.target.value)}
                style={{ width: '100%', padding: '0.65rem 0.8rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.88rem', fontWeight: 700, backgroundColor: 'white' }}
              >
                <option value="Deferido">✅ Deferido (Aprovado)</option>
                <option value="Indeferido">❌ Indeferido (Recusado)</option>
                <option value="Resolvido">🎉 Resolvido (Concluído)</option>
                <option value="Em Análise">⏳ Em Análise (Aguardando Informações)</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-primary-dark)', marginBottom: '0.4rem' }}>
                Observação / Resposta do Atendimento:
              </label>
              <textarea
                rows="3"
                placeholder="Informe a resposta para a solicitação (será visível no histórico)..."
                value={adminNotaResolucao}
                onChange={e => setAdminNotaResolucao(e.target.value)}
                style={{ width: '100%', padding: '0.65rem 0.8rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', fontFamily: 'inherit' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.8rem', borderTop: '1px solid #e2e8f0', paddingTop: '1rem' }}>
              <button 
                type="button" 
                className="btn-secondary" 
                onClick={() => setSelectedMovForAction(null)}
                disabled={isUpdatingStatus}
              >
                Cancelar
              </button>
              <button 
                type="button" 
                className="btn-primary" 
                onClick={handleSalvarStatusAdmin}
                disabled={isUpdatingStatus}
                style={{ padding: '0.65rem 1.4rem' }}
              >
                {isUpdatingStatus ? 'Salvando...' : 'Salvar Resolução'}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
