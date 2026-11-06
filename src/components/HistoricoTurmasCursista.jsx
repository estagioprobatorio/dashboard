import React, { useMemo } from 'react';
import { buildHistoricoTurmas } from '../utils/historicoTurmasUtils';
import { useHistoricoTurmas } from '../utils/HistoricoTurmasContext';

const fmt = (iso) => {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d.toLocaleDateString('pt-BR');
};

/**
 * Linha do tempo de turmas do cursista. Visível apenas para Admin e Técnico.
 */
export default function HistoricoTurmasCursista({ cursista, turmaAtual }) {
  const { movimentacoes, canView } = useHistoricoTurmas();

  const etapas = useMemo(
    () => (canView ? buildHistoricoTurmas(cursista, movimentacoes, turmaAtual) : []),
    [canView, cursista, movimentacoes, turmaAtual]
  );

  if (!canView) return null;

  const mudou = etapas.length > 1;

  return (
    <div style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', padding: '1.1rem 1.25rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: '#001d3d' }}>
          🏫 Histórico de Turmas
        </h3>
        <span style={{ fontSize: '0.72rem', fontWeight: 700, padding: '0.15rem 0.55rem', borderRadius: '999px', background: mudou ? '#fef3c7' : '#e0f2fe', color: mudou ? '#b45309' : '#0072bc' }}>
          {mudou ? `${etapas.length - 1} movimentação(ões)` : 'Sem movimentações'}
        </span>
      </div>

      {etapas.length === 0 ? (
        <div style={{ fontSize: '0.85rem', color: '#94a3b8', fontStyle: 'italic' }}>
          Nenhuma turma registrada para este cursista.
        </div>
      ) : (
        <ol style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
          {etapas.map((e, i) => {
            const inicio = fmt(e.inicio);
            const fim = fmt(e.fim);
            const cor = e.saida ? '#b91c1c' : e.atual ? '#00984a' : '#94a3b8';
            return (
              <li key={`${e.turma}-${i}`} style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                <span style={{ width: 12, height: 12, borderRadius: '50%', background: cor, marginTop: 5, flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <strong style={{ fontSize: '0.88rem', color: '#0f172a' }}>{e.turma}</strong>
                    {e.atual && (
                      <span style={{ fontSize: '0.68rem', fontWeight: 800, background: '#dcfce7', color: '#15803d', padding: '0.1rem 0.45rem', borderRadius: '4px' }}>ATUAL</span>
                    )}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                    {e.tipo}
                    {inicio ? ` • desde ${inicio}` : ''}
                    {fim ? ` • até ${fim}` : ''}
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
