import React, { useState, useEffect, useMemo } from 'react';
import { database, isConfigured } from '../firebase';
import { ref, onValue, remove } from 'firebase/database';

export default function Movimentacoes({ userEmail, userRole }) {
  const [movements, setMovements] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Mock de Movimentações para Modo Offline/Local Fallback
  const mockMovements = useMemo(() => [
    {
      id: 'mock-1',
      timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(), // 30 minutos atrás
      nome_cursista: 'ABDIAS BALBINO NUNES NETO',
      cgm: '7771071125',
      turma_anterior: 'FORM-HISTORIA EST PROB J MANHA',
      turma_nova: 'FORM-HISTORIA EST PROB K MANHA',
      tipo_acao: 'Transferência',
      email_tutor_responsavel: 'dulce.carpes@escola.pr.gov.br',
      tutor: 'DULCE MARA LANGHINOTTI CARPES',
      nre: 'LARANJEIRAS DO SUL'
    },
    {
      id: 'mock-2',
      timestamp: new Date(Date.now() - 1000 * 60 * 120).toISOString(), // 2 horas atrás
      nome_cursista: 'ABNER JOSE DE SOUZA VICENTE',
      cgm: '7770340300',
      turma_anterior: '',
      turma_nova: 'FORM-BIOLOGIA EST PROB F MANHA',
      tipo_acao: 'Entrada',
      email_tutor_responsavel: 'barbosa_claudia955@escola.pr.gov.br',
      tutor: 'CLÁUDIA BARBOSA',
      nre: 'TOLEDO'
    },
    {
      id: 'mock-3',
      timestamp: new Date(Date.now() - 1000 * 60 * 600).toISOString(), // 10 horas atrás
      nome_cursista: 'ACASSIO KULKA',
      cgm: '7770000100',
      turma_anterior: 'FORM-LEM-INGLES EST PROB L MANHA',
      turma_nova: '',
      tipo_acao: 'Saída',
      email_tutor_responsavel: 'sirleyjeremias@escola.pr.gov.br',
      tutor: 'SIRLEY JEREMIAS',
      nre: 'IVAIPORÃ'
    },
    {
      id: 'mock-4',
      timestamp: new Date(Date.now() - 1000 * 60 * 1440).toISOString(), // 1 dia atrás
      nome_cursista: 'ADA LUANA HOFFMANN',
      cgm: '7770516468',
      turma_anterior: 'FORM-LEM-INGLES EST PROB B MANHA',
      turma_nova: 'FORM-LEM-INGLES EST PROB A MANHA',
      tipo_acao: 'Transferência',
      email_tutor_responsavel: 'mariaaraujo@escola.pr.gov.br',
      tutor: 'MARIA CLARICE DIAS ARAÚJO',
      nre: 'TELÊMACO BORBA'
    }
  ], []);

  useEffect(() => {
    if (isConfigured && database) {
      setLoading(true);
      const movementsRef = ref(database, 'movements');
      
      const unsubscribe = onValue(movementsRef, (snapshot) => {
        const val = snapshot.val();
        if (val) {
          // Firebase armazena como objeto, convertemos para array
          const list = Object.entries(val).map(([id, data]) => ({
            id,
            ...data
          }));
          // Ordena decrescente por timestamp (mais recentes primeiro)
          list.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
          setMovements(list);
        } else {
          setMovements([]);
        }
        setLoading(false);
      }, (error) => {
        console.error("Erro ao carregar movimentações do Firebase:", error);
        setLoading(false);
      });

      return () => unsubscribe();
    } else {
      // Se estiver offline, inicializa com o mock
      setMovements(mockMovements);
    }
  }, [mockMovements]);

  // Função para deletar movimentação (apenas admins)
  const handleDeleteMovement = async (id) => {
    if (!window.confirm("Deseja realmente remover esta movimentação do histórico? (Isso não alterará a turma do cursista na planilha, apenas excluirá este registro do log)")) return;
    try {
      if (isConfigured && database) {
        const movementRef = ref(database, `movements/${id}`);
        await remove(movementRef);
      } else {
        // Fallback local se estiver offline
        setMovements(prev => prev.filter(m => m.id !== id));
      }
    } catch (e) {
      console.error("Erro ao deletar movimentação:", e);
      alert("Erro ao remover movimentação: " + e.message);
    }
  };

  // Filtragem baseada na função do usuário logado e busca por texto
  const filteredMovements = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    return movements.filter(mov => {
      // 1. Controle de acesso por cargo
      let hasAccess = false;
      if (userRole === 'admin' || userRole === 'tecnico') {
        hasAccess = true;
      } else if (userRole === 'tutor') {
        hasAccess = mov.email_tutor_responsavel && mov.email_tutor_responsavel.toLowerCase() === userEmail.toLowerCase();
      }

      if (!hasAccess) return false;

      // 2. Filtro de pesquisa (Nome do Cursista ou CGM)
      if (query) {
        const nomeMatch = mov.nome_cursista && mov.nome_cursista.toLowerCase().includes(query);
        const cgmMatch = mov.cgm && mov.cgm.toLowerCase().includes(query);
        return nomeMatch || cgmMatch;
      }

      return true;
    });
  }, [movements, userEmail, userRole, searchQuery]);

  // Função para formatar a data de maneira premium (ex: "Hoje às 15:30" ou "02/07/2026 às 15:30")
  const formatTime = (isoString) => {
    try {
      const date = new Date(isoString);
      const now = new Date();
      
      const formatNumber = (num) => num.toString().padStart(2, '0');
      const timeStr = `${formatNumber(date.getHours())}:${formatNumber(date.getMinutes())}`;
      
      const isToday = date.getDate() === now.getDate() &&
                      date.getMonth() === now.getMonth() &&
                      date.getFullYear() === now.getFullYear();
                      
      if (isToday) {
        return `Hoje às ${timeStr}`;
      }
      
      const isYesterday = new Date(now - 86400000).getDate() === date.getDate();
      if (isYesterday) {
        return `Ontem às ${timeStr}`;
      }
      
      return `${formatNumber(date.getDate())}/${formatNumber(date.getMonth() + 1)}/${date.getFullYear()} às ${timeStr}`;
    } catch (e) {
      return "Hora não especificada";
    }
  };

  // Cores dos Badges de Ação
  const getActionStyle = (actionType) => {
    switch (actionType) {
      case 'Entrada':
        return { bg: 'rgba(15, 155, 15, 0.1)', color: 'var(--color-accent-green)', text: 'Matrícula / Entrada' };
      case 'Saída':
        return { bg: 'rgba(229, 62, 62, 0.1)', color: '#e53e3e', text: 'Desistência / Saída' };
      case 'Transferência':
      default:
        return { bg: 'rgba(50, 130, 184, 0.1)', color: 'var(--color-accent-blue)', text: 'Mudança de Turma' };
    }
  };

  return (
    <div className="glass-panel animate-fade-in">
      <div className="panel-header">
        <h2 className="panel-title">
          <i className="lucide-activity"></i> Histórico de Movimentações de Turma
        </h2>
        <span className="kpi-label" style={{ fontSize: '0.85rem' }}>
          {filteredMovements.length} atualizações registradas
        </span>
      </div>

      <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
        Linha do tempo contendo transferências, novos ingressos e saídas de cursistas nas turmas. 
        {userRole === 'tutor' && " Mostrando apenas eventos das turmas sob sua tutoria."}
      </p>

      {/* Barra de Filtro de Cursista */}
      <div style={{ marginBottom: '2rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
        <input 
          type="text" 
          placeholder="🔍 Buscar por nome do cursista ou CGM..." 
          className="filter-input"
          style={{ maxWidth: '420px', margin: 0, padding: '0.6rem 1rem' }}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        {searchQuery && (
          <button 
            className="btn-secondary" 
            style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}
            onClick={() => setSearchQuery('')}
          >
            Limpar Filtro
          </button>
        )}
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
          <div className="pulse-dot"></div>
        </div>
      ) : filteredMovements.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '4rem 2rem', color: 'var(--color-text-muted)' }}>
          <i className="lucide-calendar-x" style={{ fontSize: '2.5rem', marginBottom: '1rem', display: 'block', opacity: 0.5 }}></i>
          {searchQuery ? "Nenhuma movimentação atende a esta pesquisa." : "Nenhuma movimentação de turma registrada até o momento."}
        </div>
      ) : (
        /* Timeline Container */
        <div style={{
          position: 'relative',
          paddingLeft: '2rem',
          borderLeft: '2px solid var(--color-card-border)',
          marginLeft: '1rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '2rem'
        }}>
          {filteredMovements.map((mov) => {
            const style = getActionStyle(mov.tipo_acao);
            return (
              <div key={mov.id} style={{ position: 'relative' }}>
                {/* Timeline Bullet */}
                <div style={{
                  position: 'absolute',
                  left: 'calc(-2rem - 6px)',
                  top: '4px',
                  width: '10px',
                  height: '10px',
                  borderRadius: '50%',
                  backgroundColor: style.color,
                  border: '2px solid var(--color-bg-light)',
                  boxShadow: `0 0 0 3px ${style.bg}`
                }}></div>

                {/* Timeline Card */}
                <div style={{
                  backgroundColor: '#fff',
                  border: '1px solid var(--color-card-border)',
                  borderRadius: '8px',
                  padding: '1.25rem 1.5rem',
                  boxShadow: 'var(--shadow-sm)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.5rem'
                }}>
                  {/* Card Header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <span style={{
                      backgroundColor: style.bg,
                      color: style.color,
                      padding: '0.25rem 0.6rem',
                      borderRadius: '4px',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px'
                    }}>
                      {style.text}
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                        {formatTime(mov.timestamp)}
                      </span>
                      {userRole === 'admin' && (
                        <button
                          title="Remover movimentação do histórico"
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#e53e3e',
                            cursor: 'pointer',
                            padding: '0.2rem',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            borderRadius: '4px',
                            transition: 'background-color 0.2s',
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(229, 62, 62, 0.08)'}
                          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                          onClick={() => handleDeleteMovement(mov.id)}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Card Body */}
                  <div style={{ fontSize: '0.95rem' }}>
                    O cursista <b style={{ color: 'var(--color-primary-dark)' }}>{mov.nome_cursista}</b> (CGM: {mov.cgm}) 
                    {mov.tipo_acao === 'Transferência' && (
                      <span>
                        {" "}foi transferido da turma <span style={{ fontStyle: 'italic', color: 'var(--color-text-muted)' }}>{mov.turma_anterior}</span> para a turma <b>{mov.turma_nova}</b>.
                      </span>
                    )}
                    {mov.tipo_acao === 'Entrada' && (
                      <span>
                        {" "}foi matriculado na turma <b>{mov.turma_nova}</b>.
                      </span>
                    )}
                    {mov.tipo_acao === 'Saída' && (
                      <span>
                        {" "}deixou a turma <span style={{ fontStyle: 'italic', color: 'var(--color-text-muted)' }}>{mov.turma_anterior}</span>.
                      </span>
                    )}
                  </div>

                  {/* Card Footer (Metadados da Tutoria) */}
                  <div style={{ 
                    display: 'flex', 
                    gap: '1.5rem', 
                    fontSize: '0.8rem', 
                    color: 'var(--color-text-muted)',
                    borderTop: '1px solid rgba(0,0,0,0.04)',
                    paddingTop: '0.5rem',
                    marginTop: '0.25rem',
                    flexWrap: 'wrap'
                  }}>
                    <span><b>Tutor:</b> {mov.tutor || 'Não Atribuído'}</span>
                    <span><b>NRE:</b> {mov.nre || 'Não Informado'}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
