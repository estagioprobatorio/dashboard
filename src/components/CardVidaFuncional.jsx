import React from 'react';

export default function CardVidaFuncional({ cursista, userPhoto }) {
  if (!cursista) {
    return (
      <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center' }}>
        <h3>Dados de Vida Funcional não disponíveis</h3>
      </div>
    );
  }

  // Nome e dados funcionais
  const nome = cursista.nome_cursista || cursista.nome || 'Cursista';
  const cgm = cursista.cgm || '-';
  const nre = cursista.nre || cursista.nre_tutor || cursista.nre_cursista || 'NRE Curitiba';
  const componente = cursista.componente || cursista.componente_conc || 'Matemática';
  const lotacao = cursista.instituicao_lotacao || cursista.munic_exe || cursista.municipios || 'Colégio Estadual do Paraná';
  const exercicio = cursista.instituicao_exercicio || lotacao;
  const vinculo = cursista.vinculo || 'QPM';
  const cargaHoraria = cursista.carga_horaria || '20h';

  // Cálculos do Estágio Probatório
  const parseDate = (dateStr) => {
    if (!dateStr) return null;
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? null : d;
  };

  const inicioEstagioDate = parseDate(cursista.inicio_estagio) || new Date(2024, 6, 12); // Fallback: 12/07/2024
  const diasAfastamento = Number(cursista.dias_afastamento || 0);

  // Data de término = início + 36 meses + afastamentos
  const fimEstagioDate = new Date(inicioEstagioDate);
  fimEstagioDate.setMonth(fimEstagioDate.getMonth() + 36);
  fimEstagioDate.setDate(fimEstagioDate.getDate() - 1 + diasAfastamento);

  // Data limite da avaliação formativa = fimEstagio - 90 dias
  const dataLimiteAF = new Date(fimEstagioDate);
  dataLimiteAF.setDate(dataLimiteAF.getDate() - 90);

  const today = new Date();

  // Dias restantes para o fim do estágio
  const diffTimeEP = fimEstagioDate.getTime() - today.getTime();
  const diasRestantesEP = Math.max(0, Math.ceil(diffTimeEP / (1000 * 60 * 60 * 24)));

  // Dias restantes para o prazo final da avaliação formativa
  const diffTimeAF = dataLimiteAF.getTime() - today.getTime();
  const diasRestantesAF = Math.ceil(diffTimeAF / (1000 * 60 * 60 * 24));

  // Nível / Ano do Cursista (1, 2 ou 3)
  const diffYears = (today.getTime() - inicioEstagioDate.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
  const nivel = Math.min(3, Math.max(1, Math.floor(diffYears) + 1));

  // Status
  let statusEP = 'Em andamento';
  let statusColor = '#22c55e'; // verde

  if (diasRestantesEP === 0) {
    statusEP = 'Concluído';
    statusColor = '#3b82f6';
  } else if (today >= dataLimiteAF) {
    statusEP = 'Fase Final (últimos 90 dias)';
    statusColor = '#f59e0b'; // amarelo/laranja
  }

  const formatDate = (date) => {
    if (!date) return '-';
    return date.toLocaleDateString('pt-BR');
  };

  // Gamificação / XP
  const xpAtual = cursista.xp || 260;
  const xpProximoNivel = 500;
  const xpFaltante = Math.max(0, xpProximoNivel - xpAtual);
  const progressPercent = Math.min(100, Math.round((xpAtual / xpProximoNivel) * 100));

  const avatarSrc = userPhoto || cursista.foto || `https://ui-avatars.com/api/?name=${encodeURIComponent(nome)}&background=0b3c5d&color=fff&size=200`;

  return (
    <div style={{
      maxWidth: '780px',
      margin: '0 auto',
      background: 'linear-gradient(180deg, #091a2e 0%, #06111f 100%)',
      borderRadius: '24px',
      border: '4px solid #c59b27',
      boxShadow: '0 20px 50px rgba(0, 0, 0, 0.6), inset 0 0 25px rgba(197, 155, 39, 0.2)',
      padding: '1.75rem',
      color: '#f8fafc',
      fontFamily: "'Montserrat', system-ui, sans-serif"
    }}>
      {/* 1. Header do Card */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottom: '2px solid rgba(197, 155, 39, 0.4)',
        paddingBottom: '1rem',
        marginBottom: '1.5rem',
        flexWrap: 'wrap',
        gap: '0.5rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{
            background: 'linear-gradient(135deg, #002d5c, #0b3c5d)',
            border: '2px solid #c59b27',
            borderRadius: '10px',
            padding: '0.4rem 0.8rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            fontWeight: 800,
            fontSize: '0.85rem',
            color: '#fbbf24',
            boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
          }}>
            <span>📖</span> SEED • PR
          </div>
          <div>
            <h2 style={{
              margin: 0,
              fontSize: '1.4rem',
              fontWeight: 900,
              letterSpacing: '1px',
              background: 'linear-gradient(180deg, #fef08a 0%, #ca8a04 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}>
              VIDA FUNCIONAL
            </h2>
            <div style={{ fontSize: '0.78rem', color: '#94a3b8', fontWeight: 600, letterSpacing: '2px', textTransform: 'uppercase' }}>
              NO ESTÁGIO PROBATÓRIO
            </div>
          </div>
        </div>

        <div style={{
          background: 'linear-gradient(135deg, #1e293b, #0f172a)',
          border: '2px solid #c59b27',
          borderRadius: '12px',
          padding: '0.4rem 1rem',
          textAlign: 'center',
          boxShadow: '0 4px 12px rgba(0,0,0,0.4)'
        }}>
          <div style={{ fontSize: '0.65rem', textTransform: 'uppercase', color: '#94a3b8', fontWeight: 700, letterSpacing: '1px' }}>NÍVEL</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#fbbf24', lineHeight: 1 }}>{nivel}</div>
        </div>
      </div>

      {/* 2. Banner Perfil do Cursista */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.7), rgba(15, 23, 42, 0.9))',
        border: '1px solid rgba(197, 155, 39, 0.4)',
        borderRadius: '16px',
        padding: '1.25rem',
        marginBottom: '1.5rem',
        display: 'flex',
        alignItems: 'center',
        gap: '1.5rem',
        flexWrap: 'wrap'
      }}>
        {/* Photo Avatar */}
        <div style={{ position: 'relative' }}>
          <img
            src={avatarSrc}
            alt={nome}
            style={{
              width: '100px',
              height: '100px',
              borderRadius: '50%',
              objectFit: 'cover',
              border: '4px solid #c59b27',
              boxShadow: '0 6px 16px rgba(0,0,0,0.5)'
            }}
          />
          <div style={{
            position: 'absolute',
            bottom: '-4px',
            left: '50%',
            transform: 'translateX(-50%)',
            backgroundColor: '#002d5c',
            border: '2px solid #c59b27',
            borderRadius: '50%',
            width: '26px',
            height: '26px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '0.75rem'
          }}>
            📖
          </div>
        </div>

        {/* Informações de Perfil e XP */}
        <div style={{ flex: 1, minWidth: '220px' }}>
          <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800, color: '#ffffff' }}>
            {nome}
          </h2>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.3rem', marginBottom: '0.75rem' }}>
            <span style={{
              backgroundColor: 'rgba(51, 65, 85, 0.8)',
              color: '#e2e8f0',
              padding: '0.2rem 0.6rem',
              borderRadius: '6px',
              fontSize: '0.75rem',
              fontWeight: 700,
              border: '1px solid rgba(255,255,255,0.1)'
            }}>
              Cursista • Estágio Probatório
            </span>
            <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>CGM: {cgm}</span>
          </div>

          {/* Barra de Progresso XP */}
          <div style={{ background: '#0f172a', padding: '0.5rem 0.75rem', borderRadius: '10px', border: '1px solid rgba(197, 155, 39, 0.3)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', fontWeight: 700, marginBottom: '0.3rem' }}>
              <span style={{ color: '#fbbf24' }}>XP {xpAtual} / {xpProximoNivel}</span>
              <span style={{ color: '#94a3b8' }}>Próximo nível: {xpFaltante} XP</span>
            </div>
            <div style={{ width: '100%', height: '10px', backgroundColor: '#334155', borderRadius: '5px', overflow: 'hidden' }}>
              <div style={{
                width: `${progressPercent}%`,
                height: '100%',
                background: 'linear-gradient(90deg, #22c55e, #84cc16)',
                borderRadius: '5px',
                transition: 'width 0.5s ease'
              }} />
            </div>
          </div>
        </div>
      </div>

      {/* 3. Grade de Detalhes Funcionais */}
      <div style={{
        background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
        border: '1px solid rgba(197, 155, 39, 0.4)',
        borderRadius: '16px',
        padding: '1.25rem',
        marginBottom: '1.5rem',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '1rem'
      }}>
        
        {/* NRE */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ fontSize: '1.3rem' }}>🛡️</div>
          <div>
            <div style={{ fontSize: '0.68rem', textTransform: 'uppercase', color: '#94a3b8', fontWeight: 700 }}>NÚCLEO REGIONAL</div>
            <div style={{ fontSize: '0.92rem', fontWeight: 700, color: '#f8fafc' }}>{nre}</div>
          </div>
        </div>

        {/* Componente Curricular */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ fontSize: '1.3rem' }}>📘</div>
          <div>
            <div style={{ fontSize: '0.68rem', textTransform: 'uppercase', color: '#94a3b8', fontWeight: 700 }}>COMPONENTE CURRICULAR</div>
            <div style={{ fontSize: '0.92rem', fontWeight: 700, color: '#f8fafc' }}>{componente}</div>
          </div>
        </div>

        {/* Instituição de Lotação */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ fontSize: '1.3rem' }}>🔑</div>
          <div>
            <div style={{ fontSize: '0.68rem', textTransform: 'uppercase', color: '#94a3b8', fontWeight: 700 }}>INSTITUIÇÃO DE LOTAÇÃO</div>
            <div style={{ fontSize: '0.92rem', fontWeight: 700, color: '#f8fafc' }}>{lotacao}</div>
          </div>
        </div>

        {/* Instituição de Exercício */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ fontSize: '1.3rem' }}>🏫</div>
          <div>
            <div style={{ fontSize: '0.68rem', textTransform: 'uppercase', color: '#94a3b8', fontWeight: 700 }}>INSTITUIÇÃO DE EXERCÍCIO</div>
            <div style={{ fontSize: '0.92rem', fontWeight: 700, color: '#f8fafc' }}>{exercicio}</div>
          </div>
        </div>

        {/* Vínculo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ fontSize: '1.3rem' }}>🔗</div>
          <div>
            <div style={{ fontSize: '0.68rem', textTransform: 'uppercase', color: '#94a3b8', fontWeight: 700 }}>VÍNCULO</div>
            <div style={{ fontSize: '0.92rem', fontWeight: 700, color: '#f8fafc' }}>{vinculo}</div>
          </div>
        </div>

        {/* Situação */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ fontSize: '1.3rem' }}>🟢</div>
          <div>
            <div style={{ fontSize: '0.68rem', textTransform: 'uppercase', color: '#94a3b8', fontWeight: 700 }}>SITUAÇÃO DO ESTÁGIO</div>
            <div style={{ fontSize: '0.92rem', fontWeight: 800, color: statusColor }}>{statusEP}</div>
          </div>
        </div>

        {/* Carga Horária */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ fontSize: '1.3rem' }}>🕒</div>
          <div>
            <div style={{ fontSize: '0.68rem', textTransform: 'uppercase', color: '#94a3b8', fontWeight: 700 }}>CARGA HORÁRIA</div>
            <div style={{ fontSize: '0.92rem', fontWeight: 700, color: '#f8fafc' }}>{cargaHoraria}</div>
          </div>
        </div>

        {/* Período do EP */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ fontSize: '1.3rem' }}>📅</div>
          <div>
            <div style={{ fontSize: '0.68rem', textTransform: 'uppercase', color: '#94a3b8', fontWeight: 700 }}>PERÍODO DO EP</div>
            <div style={{ fontSize: '0.92rem', fontWeight: 700, color: '#f8fafc' }}>
              {formatDate(inicioEstagioDate)} – {formatDate(fimEstagioDate)}
            </div>
          </div>
        </div>

      </div>

      {/* 4. Bloco Especial: Regra dos 90 Dias (Avaliação Formativa) */}
      <div style={{
        background: today >= dataLimiteAF 
          ? 'linear-gradient(135deg, rgba(180, 83, 9, 0.3), rgba(120, 53, 15, 0.5))' 
          : 'linear-gradient(135deg, rgba(15, 23, 42, 0.8), rgba(30, 41, 59, 0.8))',
        border: `2px solid ${today >= dataLimiteAF ? '#f59e0b' : '#3b82f6'}`,
        borderRadius: '16px',
        padding: '1rem 1.25rem',
        marginBottom: '1.5rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '0.75rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ fontSize: '1.5rem' }}>⏳</div>
          <div>
            <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: '#ffffff' }}>
              Avaliação Formativa (Término 90 dias antes do EP)
            </h4>
            <div style={{ fontSize: '0.8rem', color: '#cbd5e1', marginTop: '0.1rem' }}>
              Data Limite: <b>{formatDate(dataLimiteAF)}</b>
            </div>
          </div>
        </div>

        <div style={{
          backgroundColor: today >= dataLimiteAF ? '#f59e0b' : '#1e3a8a',
          color: '#ffffff',
          padding: '0.4rem 0.9rem',
          borderRadius: '8px',
          fontWeight: 800,
          fontSize: '0.82rem',
          textAlign: 'center'
        }}>
          {diasRestantesAF <= 0 ? (
            <span>Prazo Limite da AF Atingido</span>
          ) : (
            <span>Faltam {diasRestantesAF} dias para o fim da AF</span>
          )}
        </div>
      </div>

      {/* 5. Seção de Missões e Pontuação Gamificada */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '1rem',
        marginBottom: '1.5rem'
      }}>
        
        <div style={{
          background: '#0f172a',
          border: '1px solid rgba(197, 155, 39, 0.3)',
          borderRadius: '14px',
          padding: '1rem',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '0.68rem', textTransform: 'uppercase', color: '#94a3b8', fontWeight: 700, marginBottom: '0.4rem' }}>
            📜 MISSÕES CONCLUÍDAS
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#ffffff' }}>
            05 <span style={{ fontSize: '0.9rem', color: '#94a3b8', fontWeight: 600 }}>de 12</span>
          </div>
          <div style={{ color: '#fbbf24', marginTop: '0.3rem', fontSize: '0.9rem' }}>★★★★★☆☆☆☆☆☆☆</div>
        </div>

        <div style={{
          background: '#0f172a',
          border: '1px solid rgba(197, 155, 39, 0.3)',
          borderRadius: '14px',
          padding: '1rem',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '0.68rem', textTransform: 'uppercase', color: '#94a3b8', fontWeight: 700, marginBottom: '0.4rem' }}>
            ⚔️ ATIVIDADES REALIZADAS
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#ffffff' }}>
            08 <span style={{ fontSize: '0.9rem', color: '#94a3b8', fontWeight: 600 }}>de 20</span>
          </div>
          <div style={{ color: '#fbbf24', marginTop: '0.3rem', fontSize: '0.9rem' }}>★★★★☆☆☆☆☆☆</div>
        </div>

        <div style={{
          background: '#0f172a',
          border: '1px solid rgba(197, 155, 39, 0.3)',
          borderRadius: '14px',
          padding: '1rem',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '0.68rem', textTransform: 'uppercase', color: '#94a3b8', fontWeight: 700, marginBottom: '0.4rem' }}>
            🏆 PONTUAÇÃO TOTAL
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#fbbf24' }}>
            {xpAtual} <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>XP</span>
          </div>
        </div>

      </div>

      {/* 6. Conquistas / Badges */}
      <div style={{
        background: '#0f172a',
        border: '1px solid rgba(197, 155, 39, 0.3)',
        borderRadius: '16px',
        padding: '1.25rem',
        marginBottom: '1.5rem'
      }}>
        <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#94a3b8', fontWeight: 800, textAlign: 'center', marginBottom: '1rem', letterSpacing: '1px' }}>
          CONQUISTAS
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.75rem', textAlign: 'center' }}>
          
          <div style={{ background: '#1e293b', padding: '0.75rem', borderRadius: '12px', border: '1px solid #22c55e' }}>
            <div style={{ fontSize: '1.8rem', marginBottom: '0.2rem' }}>🔰</div>
            <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#ffffff' }}>INÍCIO DA JORNADA</div>
          </div>

          <div style={{ background: '#1e293b', padding: '0.75rem', borderRadius: '12px', border: '1px solid #3b82f6' }}>
            <div style={{ fontSize: '1.8rem', marginBottom: '0.2rem' }}>📖</div>
            <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#ffffff' }}>PLANO DE AÇÃO</div>
          </div>

          <div style={{ background: '#1e293b', padding: '0.75rem', borderRadius: '12px', border: '1px solid #a855f7' }}>
            <div style={{ fontSize: '1.8rem', marginBottom: '0.2rem' }}>👥</div>
            <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#ffffff' }}>PARTICIPAÇÃO ATIVA</div>
          </div>

          <div style={{ background: '#1e293b', padding: '0.75rem', borderRadius: '12px', border: '1px solid #475569', opacity: 0.5 }}>
            <div style={{ fontSize: '1.8rem', marginBottom: '0.2rem' }}>🔒</div>
            <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#94a3b8' }}>EM BREVE</div>
          </div>

        </div>
      </div>

      {/* 7. Frase Inspiradora no Rodapé */}
      <div style={{
        textAlign: 'center',
        borderTop: '1px solid rgba(255, 255, 255, 0.1)',
        paddingTop: '1rem',
        fontSize: '0.85rem',
        fontStyle: 'italic',
        color: '#94a3b8'
      }}>
        "Ensinar é escrever a vida no coração dos alunos."
        <span style={{ display: 'block', fontStyle: 'normal', fontWeight: 700, color: '#cbd5e1', fontSize: '0.78rem', marginTop: '0.2rem' }}>
          — Paulo Freire
        </span>
      </div>

    </div>
  );
}
