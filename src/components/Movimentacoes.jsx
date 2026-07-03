import React, { useState, useEffect, useMemo } from 'react';
import { database, isConfigured } from '../firebase';
import { ref, onValue } from 'firebase/database';

export default function Movimentacoes({ userEmail, userRole }) {
  const [movements, setMovements] = useState([]);
  const [loading, setLoading] = useState(false);

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

  // Filtragem baseada na função do usuário logado
  const filteredMovements = useMemo(() => {
    return movements.filter(mov => {
      // Admins e Técnicos veem tudo
      if (userRole === 'admin' || userRole === 'tecnico') {
        return true;
      }
      // Tutores veem apenas as movimentações das turmas que tutoreiam
      if (userRole === 'tutor') {
        return mov.email_tutor_responsavel && mov.email_tutor_responsavel.toLowerCase() === userEmail.toLowerCase();
      }
      // Formadores por padrão não veem esta aba, mas se virem, limita a nada ou opcional
      return false;
    });
  }, [movements, userEmail, userRole]);

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

      <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', marginBottom: '2rem' }}>
        Linha do tempo contendo transferências, novos ingressos e saídas de cursistas nas turmas. 
        {userRole === 'tutor' && " Mostrando apenas eventos das turmas sob sua tutoria."}
      </p>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
          <div className="pulse-dot"></div>
        </div>
      ) : filteredMovements.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '4rem 2rem', color: 'var(--color-text-muted)' }}>
          <i className="lucide-calendar-x" style={{ fontSize: '2.5rem', marginBottom: '1rem', display: 'block', opacity: 0.5 }}></i>
          Nenhuma movimentação de turma registrada até o momento.
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
                    <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                      {formatTime(mov.timestamp)}
                    </span>
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
