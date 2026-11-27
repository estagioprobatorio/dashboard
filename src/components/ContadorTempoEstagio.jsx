import React from 'react';
import { calcularTempoEstagio } from '../utils/tempoEstagioUtils';

export default function ContadorTempoEstagio({ periodoIni, diasAfastamento = 0, compact = false, showCard = true }) {
  const dados = calcularTempoEstagio(periodoIni, diasAfastamento);

  if (!dados) {
    if (!showCard) return <span style={{ color: '#94a3b8', fontStyle: 'italic', fontSize: '0.85rem' }}>Data de posse não informada</span>;
    return (
      <div style={{
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '12px',
        padding: compact ? '0.75rem 1rem' : '1.25rem',
        color: '#64748b',
        fontSize: '0.85rem'
      }}>
        ⏱️ <b>Tempo em Estágio Probatório:</b> Data de início (posse) não cadastrada.
      </div>
    );
  }

  const {
    inicioFormatado,
    fimFormatado,
    diasDecorridos,
    diasRestantes,
    totalDias,
    semanasDecorridas,
    semanasRestantes,
    totalSemanas,
    mesesDecorridos,
    mesesRestantes,
    totalMeses,
    percentual,
    concluido,
    faseFinal
  } = dados;

  const corStatus = concluido ? '#0284c7' : faseFinal ? '#f59e0b' : '#00984a';
  const textoStatus = concluido ? 'Estágio Cumprido (3 anos)' : faseFinal ? 'Fase Final (últimos 90 dias)' : 'Em Cumprimento';

  if (compact) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.78rem' }}>
          <span style={{ fontWeight: 700, color: '#0f172a' }}>
            ⏱️ {diasDecorridos} / {totalDias} dias ({percentual}%)
          </span>
          <span style={{
            padding: '0.15rem 0.45rem',
            borderRadius: '4px',
            fontSize: '0.7rem',
            fontWeight: 700,
            background: `${corStatus}15`,
            color: corStatus
          }}>
            {textoStatus}
          </span>
        </div>
        <div style={{ width: '100%', height: '6px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
          <div style={{
            width: `${percentual}%`,
            height: '100%',
            background: `linear-gradient(90deg, #00984a 0%, ${corStatus} 100%)`,
            borderRadius: '4px',
            transition: 'width 0.4s ease'
          }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: '#64748b' }}>
          <span>{semanasDecorridas} sem. ({mesesDecorridos} m)</span>
          <span>Restam {diasRestantes} dias</span>
        </div>
      </div>
    );
  }

  const content = (
    <div>
      {/* Header do Contador */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '1.25rem' }}>⏱️</span>
          <div>
            <h4 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 800, color: '#0f172a' }}>
              Contador do Estágio Probatório (3 Anos / 1.095 Dias)
            </h4>
            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
              Início em <b>{inicioFormatado}</b> • Previsão de término: <b>{fimFormatado}</b>
            </div>
          </div>
        </div>

        <span style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.35rem',
          padding: '0.3rem 0.75rem',
          borderRadius: '20px',
          fontSize: '0.78rem',
          fontWeight: 700,
          background: `${corStatus}15`,
          color: corStatus,
          border: `1px solid ${corStatus}35`
        }}>
          <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: corStatus }} />
          {textoStatus}
        </span>
      </div>

      {/* Grid com os 3 contadores: Dias, Semanas, Meses */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.75rem', marginBottom: '1rem' }}>
        
        {/* Card Dias */}
        <div style={{ background: '#f8fafc', padding: '0.75rem 1rem', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
            Dias Cumpridos
          </div>
          <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0f172a', margin: '0.15rem 0' }}>
            {diasDecorridos} <span style={{ fontSize: '0.78rem', fontWeight: 500, color: '#64748b' }}>/ {totalDias}</span>
          </div>
          <div style={{ fontSize: '0.72rem', color: diasRestantes === 0 ? '#0284c7' : '#00984a', fontWeight: 600 }}>
            {diasRestantes === 0 ? '✓ Total atingido' : `Restam ${diasRestantes} dias`}
          </div>
        </div>

        {/* Card Semanas */}
        <div style={{ background: '#f8fafc', padding: '0.75rem 1rem', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
            Semanas
          </div>
          <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0f172a', margin: '0.15rem 0' }}>
            {semanasDecorridas} <span style={{ fontSize: '0.78rem', fontWeight: 500, color: '#64748b' }}>/ {totalSemanas}</span>
          </div>
          <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
            {semanasRestantes === 0 ? 'Concluído' : `Restam ${semanasRestantes} sem.`}
          </div>
        </div>

        {/* Card Meses */}
        <div style={{ background: '#f8fafc', padding: '0.75rem 1rem', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
            Meses de Exercício
          </div>
          <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0f172a', margin: '0.15rem 0' }}>
            {mesesDecorridos} <span style={{ fontSize: '0.78rem', fontWeight: 500, color: '#64748b' }}>/ {totalMeses}</span>
          </div>
          <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
            {mesesRestantes === 0 ? '36 meses cumpridos' : `Restam ${mesesRestantes} meses`}
          </div>
        </div>

      </div>

      {/* Barra de Progresso Visual */}
      <div style={{ marginTop: '0.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem', fontSize: '0.78rem' }}>
          <span style={{ fontWeight: 600, color: '#475569' }}>Evolução Temporal do Triênio</span>
          <span style={{ fontWeight: 800, color: corStatus }}>{percentual}%</span>
        </div>
        <div style={{ width: '100%', height: '8px', background: '#e2e8f0', borderRadius: '6px', overflow: 'hidden' }}>
          <div style={{
            width: `${percentual}%`,
            height: '100%',
            background: `linear-gradient(90deg, #00984a 0%, #15803d 70%, ${corStatus} 100%)`,
            borderRadius: '6px',
            transition: 'width 0.4s ease'
          }} />
        </div>
      </div>
    </div>
  );

  if (!showCard) return content;

  return (
    <div style={{
      background: '#ffffff',
      border: '1px solid #e2e8f0',
      borderRadius: '14px',
      padding: '1.25rem',
      boxShadow: '0 2px 6px rgba(0, 0, 0, 0.04)'
    }}>
      {content}
    </div>
  );
}
