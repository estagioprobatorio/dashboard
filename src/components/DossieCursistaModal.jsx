import React, { useState, useMemo } from 'react';
import { formatDatePtBr, parseDateToTimestamp } from '../utils/dateUtils';
import FormularioInserirObservacao from './FormularioInserirObservacao';

export default function DossieCursistaModal({ 
  cursista, 
  turmaInfo, 
  observacoes = [], 
  onClose, 
  onSaveObservacao 
}) {
  const [showFormInserir, setShowFormInserir] = useState(false);
  const [expandedObsId, setExpandedObsId] = useState(null);

  // Normalização e busca de todas as observações pertencentes a este cursista
  const cursistaEmail = (cursista?.email || cursista?.email_cursista || '').trim().toLowerCase();
  const cursistaNome = (cursista?.nome || cursista?.nome_cursista || '').trim().toLowerCase();

  const getObsTimestamp = (obs) => {
    return parseDateToTimestamp(
      obs.data_feedback || obs.data_pratica || obs.data_observacao || obs.carimbo || obs.created_at
    );
  };

  const observacoesDoCursista = useMemo(() => {
    const list = observacoes.filter(obs => {
      const email = (obs.email_cursista || '').trim().toLowerCase();
      if (email && cursistaEmail && email === cursistaEmail) return true;
      const nome = (obs.nome_cursista || '').trim().toLowerCase();
      if (nome && cursistaNome && nome === cursistaNome) return true;
      return false;
    });

    // Ordenação estritamente cronológica decrescente (mais recente primeiro no histórico/timeline)
    return list.sort((a, b) => getObsTimestamp(b) - getObsTimestamp(a));
  }, [observacoes, cursistaEmail, cursistaNome]);

  // Função para mapear texto para nível numérico (1 a 4)
  const nivelToScore = (nivel) => {
    if (!nivel) return null;
    const n = String(nivel).toUpperCase();
    if (n.includes('SUPERA') || n.includes('SUPEROU')) return 4;
    if (n.includes('INTEGRAL') || n.includes('ATENDE') || n.includes('ATINGE')) {
      if (n.includes('PARCIAL')) return 2;
      return 3;
    }
    if (n.includes('NÃO') || n.includes('NAO')) return 1;
    return null;
  };

  const scoreToLabel = (score) => {
    switch (score) {
      case 4: return { text: 'SUPERA', color: '#00984a', bg: '#dcfce7' };
      case 3: return { text: 'ATINGE INTEGRALMENTE', color: '#0072bc', bg: '#e0f2fe' };
      case 2: return { text: 'ATINGE PARCIALMENTE', color: '#b45309', bg: '#fef3c7' };
      case 1: return { text: 'NÃO ATINGE', color: '#b91c1c', bg: '#fee2e2' };
      default: return { text: 'PENDENTE', color: '#64748b', bg: '#f1f5f9' };
    }
  };

  // Cálculo de KPIs
  const totalRealizadas = observacoesDoCursista.filter(o => o.is_realizada ?? o.observacao_realizada?.toLowerCase().includes('sim')).length;
  const ultimaObs = observacoesDoCursista[0];
  const penultimaObs = observacoesDoCursista[1];

  const scorePraticaAtual = nivelToScore(ultimaObs?.nivel_pratica);
  const scorePlanAtual = nivelToScore(ultimaObs?.nivel_planejamento);

  // Análise de Trajetória
  const trajetoria = useMemo(() => {
    if (!scorePraticaAtual) return { label: 'Aguardando 1ª Observação', color: '#64748b', bg: '#f1f5f9' };
    if (!penultimaObs) return { label: '1ª Observação Realizada', color: '#0072bc', bg: '#e0f2fe' };

    const scorePraticaAnterior = nivelToScore(penultimaObs.nivel_pratica);
    if (!scorePraticaAnterior) return { label: 'Observação Ativa', color: '#0072bc', bg: '#e0f2fe' };

    const diff = scorePraticaAtual - scorePraticaAnterior;
    if (diff > 0) return { label: `Evolução Positiva (+${diff})`, color: '#00984a', bg: '#dcfce7' };
    if (scorePraticaAtual === 4 && scorePraticaAnterior === 4) return { label: 'Manteve Nível Supera (4)', color: '#00984a', bg: '#dcfce7' };
    if (diff === 0) return { label: 'Manteve Nível Estável', color: '#0284c7', bg: '#e0f2fe' };
    return { label: `Atenção: Regressão (${diff})`, color: '#b91c1c', bg: '#fee2e2' };
  }, [scorePraticaAtual, penultimaObs]);

  // Histórico em ordem cronológica CRESCENTE (mais antigo -> mais recente) para plotar no gráfico
  const dadosGrafico = useMemo(() => {
    const ordenadosCrescente = [...observacoesDoCursista].sort((a, b) => getObsTimestamp(a) - getObsTimestamp(b));
    return ordenadosCrescente.map((obs, idx) => {
      const label = `Obs #${idx + 1}`;
      const dataLabel = obs.data_feedback 
        ? formatDatePtBr(obs.data_feedback) 
        : (obs.data_pratica ? formatDatePtBr(obs.data_pratica) : (obs.carimbo ? formatDatePtBr(obs.carimbo) : (obs.semestre || `Etapa ${idx + 1}`)));
      return {
        label,
        subLabel: dataLabel,
        semestre: obs.semestre || '',
        scorePratica: nivelToScore(obs.nivel_pratica),
        scorePlan: nivelToScore(obs.nivel_planejamento),
        modalidade: obs.modalidade_feedback || 'Diálogo',
        tema: obs.tema || 'Geral'
      };
    });
  }, [observacoesDoCursista]);

  const handleSalvarNovaObservacao = async (novaObs) => {
    if (onSaveObservacao) {
      await onSaveObservacao(novaObs);
    }
    setShowFormInserir(false);
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 29, 61, 0.78)',
      backdropFilter: 'blur(6px)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 10000,
      padding: '1.25rem'
    }} onClick={onClose}>
      <div 
        className="animate-fade-in" 
        onClick={e => e.stopPropagation()}
        style={{
          background: '#ffffff',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '1080px',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.4)',
          overflow: 'hidden'
        }}
      >
        {/* Header Institucional com Brasão e Botão Inserir Observação */}
        <div style={{
          background: 'linear-gradient(135deg, #001d3d 0%, #002d5c 60%, #0072bc 100%)',
          color: '#ffffff',
          padding: '1.25rem 1.75rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '3px solid #00984a'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.35rem', flexWrap: 'wrap' }}>
              <span style={{ backgroundColor: '#00984a', color: '#ffffff', padding: '0.15rem 0.55rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 800 }}>
                {turmaInfo?.anoFormativo || 'Ano Formativo'}
              </span>
              <span style={{ backgroundColor: 'rgba(255,255,255,0.2)', color: '#ffffff', padding: '0.15rem 0.55rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600 }}>
                🏫 {turmaInfo?.turma || cursista?.turma || 'Turma'}
              </span>
              <span style={{ backgroundColor: 'rgba(255,255,255,0.2)', color: '#ffffff', padding: '0.15rem 0.55rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600 }}>
                📚 {turmaInfo?.componente || cursista?.componente || 'Componente'}
              </span>
            </div>

            <h2 style={{ margin: '0.2rem 0', fontSize: '1.4rem', fontWeight: 800, color: '#ffffff' }}>
              {cursista?.nome || cursista?.nome_cursista || 'Cursista'}
            </h2>

            <p style={{ margin: 0, color: 'rgba(255, 255, 255, 0.85)', fontSize: '0.85rem' }}>
              ✉️ {cursistaEmail} • CGM: <strong>{cursista?.cgm || 'Não informado'}</strong> • Formador(a): <strong>{turmaInfo?.formador || 'Formador'}</strong>
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <button
              type="button"
              onClick={() => setShowFormInserir(true)}
              style={{
                background: 'linear-gradient(135deg, #00984a 0%, #15803d 100%)',
                color: '#ffffff',
                border: 'none',
                padding: '0.65rem 1.25rem',
                borderRadius: '8px',
                fontWeight: 700,
                fontSize: '0.88rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                boxShadow: '0 4px 12px rgba(0, 152, 74, 0.35)',
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-1px)'}
              onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
            >
              <span style={{ fontSize: '1.1rem' }}>➕</span>
              Inserir Observação
            </button>

            <button
              type="button"
              onClick={onClose}
              style={{
                background: 'rgba(255, 255, 255, 0.15)',
                border: 'none',
                color: '#ffffff',
                borderRadius: '50%',
                width: '36px',
                height: '36px',
                fontSize: '1.2rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.3)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)'}
            >
              ✕
            </button>
          </div>
        </div>

        {/* Corpo com Scroll */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', backgroundColor: '#f8fafc' }}>
          
          {/* CARDS DE KPIS */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '1rem' }}>
            
            {/* KPI 1: Total de Observações */}
            <div style={{ background: '#ffffff', padding: '1rem', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                Total de Observações
              </div>
              <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#0f172a', margin: '0.2rem 0' }}>
                {observacoesDoCursista.length} <span style={{ fontSize: '0.85rem', color: '#00984a', fontWeight: 600 }}>({totalRealizadas} realizadas)</span>
              </div>
              <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                Ciclo Formativo 2026
              </div>
            </div>

            {/* KPI 2: Nível Vigente da Prática */}
            <div style={{ background: '#ffffff', padding: '1rem', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                Nível da Prática Docente
              </div>
              <div style={{ marginTop: '0.35rem' }}>
                {scorePraticaAtual ? (
                  <span style={{
                    display: 'inline-block',
                    padding: '0.3rem 0.65rem',
                    borderRadius: '6px',
                    fontSize: '0.82rem',
                    fontWeight: 800,
                    backgroundColor: scoreToLabel(scorePraticaAtual).bg,
                    color: scoreToLabel(scorePraticaAtual).color
                  }}>
                    ● {scoreToLabel(scorePraticaAtual).text}
                  </span>
                ) : (
                  <span style={{ fontSize: '0.9rem', color: '#94a3b8', fontStyle: 'italic' }}>Não avaliado</span>
                )}
              </div>
              <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '0.35rem' }}>
                Regência e atuação em sala
              </div>
            </div>

            {/* KPI 3: Nível do Planejamento */}
            <div style={{ background: '#ffffff', padding: '1rem', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                Nível do Planejamento
              </div>
              <div style={{ marginTop: '0.35rem' }}>
                {scorePlanAtual ? (
                  <span style={{
                    display: 'inline-block',
                    padding: '0.3rem 0.65rem',
                    borderRadius: '6px',
                    fontSize: '0.82rem',
                    fontWeight: 800,
                    backgroundColor: scoreToLabel(scorePlanAtual).bg,
                    color: scoreToLabel(scorePlanAtual).color
                  }}>
                    ● {scoreToLabel(scorePlanAtual).text}
                  </span>
                ) : (
                  <span style={{ fontSize: '0.9rem', color: '#94a3b8', fontStyle: 'italic' }}>Não avaliado</span>
                )}
              </div>
              <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '0.35rem' }}>
                Planos de aula e materiais
              </div>
            </div>

            {/* KPI 4: Trajetória / Status */}
            <div style={{ background: '#ffffff', padding: '1rem', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                Trajetória Pedagógica
              </div>
              <div style={{ marginTop: '0.35rem' }}>
                <span style={{
                  display: 'inline-block',
                  padding: '0.3rem 0.65rem',
                  borderRadius: '6px',
                  fontSize: '0.82rem',
                  fontWeight: 800,
                  backgroundColor: trajetoria.bg,
                  color: trajetoria.color
                }}>
                  {trajetoria.label}
                </span>
              </div>
              <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '0.35rem' }}>
                Progressão entre semestres
              </div>
            </div>

          </div>

          {/* GRÁFICO DE EVOLUÇÃO PROFISSIONAL (SVG NATIVO) */}
          <div style={{ background: '#ffffff', padding: '1.25rem', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#002d5c' }}>
                  📈 Curva de Evolução Pedagógica do Cursista
                </h3>
                <p style={{ margin: '0.15rem 0 0 0', fontSize: '0.78rem', color: '#64748b' }}>
                  Acompanhamento cronológico dos níveis de Prática Docente e Planejamento Pedagógico
                </p>
              </div>

              {/* Legenda */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', fontSize: '0.78rem', fontWeight: 600 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <span style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#00984a', display: 'inline-block' }}></span>
                  <span>Prática Docente</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <span style={{ width: '12px', height: '12px', borderRadius: '2px', backgroundColor: '#0072bc', display: 'inline-block' }}></span>
                  <span>Planejamento</span>
                </div>
              </div>
            </div>

            {dadosGrafico.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2.5rem 1rem', color: '#94a3b8' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>📋</div>
                <p style={{ fontWeight: 600, fontSize: '0.9rem', margin: 0 }}>Nenhuma observação registrada para este cursista ainda.</p>
                <p style={{ fontSize: '0.8rem', margin: '0.25rem 0 0 0' }}>Clique no botão "➕ Inserir Observação" acima para registrar a primeira avaliação.</p>
              </div>
            ) : (
              <div style={{ width: '100%', overflowX: 'auto' }}>
                <svg viewBox="0 0 760 180" style={{ width: '100%', minWidth: '550px', height: 'auto', display: 'block' }}>
                  {/* Linhas de fundo dos 4 níveis */}
                  {[
                    { val: 4, label: 'Supera (4)', color: '#dcfce7', line: '#86efac' },
                    { val: 3, label: 'Atinge Int. (3)', color: '#f0f9ff', line: '#bae6fd' },
                    { val: 2, label: 'Atinge Parc. (2)', color: '#fefce8', line: '#fde047' },
                    { val: 1, label: 'Não Atinge (1)', color: '#fef2f2', line: '#fca5a5' }
                  ].map((row, idx) => {
                    const y = 30 + idx * 35;
                    return (
                      <g key={row.val}>
                        <rect x="90" y={y - 12} width="650" height="26" fill={row.color} opacity="0.4" rx="4" />
                        <line x1="90" y1={y} x2="740" y2={y} stroke={row.line} strokeDasharray="3 3" strokeWidth="1" />
                        <text x="82" y={y + 4} textAnchor="end" fontSize="10" fill="#64748b" fontWeight="600">
                          {row.label}
                        </text>
                      </g>
                    );
                  })}

                  {/* Renderização das Linhas e Pontos */}
                  {(() => {
                    const count = dadosGrafico.length;
                    const stepX = count > 1 ? (600 / (count - 1)) : 300;

                    const getCoordinates = (score, idx) => {
                      if (!score) return null;
                      const x = count === 1 ? 390 : 120 + idx * stepX;
                      // y: 4 -> 30, 3 -> 65, 2 -> 100, 1 -> 135
                      const y = 30 + (4 - score) * 35;
                      return { x, y };
                    };

                    const ptsPratica = dadosGrafico.map((d, i) => getCoordinates(d.scorePratica, i)).filter(Boolean);
                    const ptsPlan = dadosGrafico.map((d, i) => getCoordinates(d.scorePlan, i)).filter(Boolean);

                    const pathPratica = ptsPratica.length > 1 
                      ? ptsPratica.reduce((acc, p, i) => i === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`, '')
                      : '';

                    const pathPlan = ptsPlan.length > 1 
                      ? ptsPlan.reduce((acc, p, i) => i === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`, '')
                      : '';

                    return (
                      <g>
                        {/* Linhas conectando os pontos */}
                        {pathPratica && <path d={pathPratica} fill="none" stroke="#00984a" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />}
                        {pathPlan && <path d={pathPlan} fill="none" stroke="#0072bc" strokeWidth="3" strokeDasharray="5 3" strokeLinecap="round" strokeLinejoin="round" />}

                        {/* Marcadores Prática */}
                        {ptsPratica.map((p, idx) => (
                          <g key={`p-${idx}`}>
                            <circle cx={p.x} cy={p.y} r="6" fill="#00984a" stroke="#ffffff" strokeWidth="2" />
                            <text x={p.x} y={p.y - 10} textAnchor="middle" fontSize="11" fontWeight="800" fill="#00984a">
                              {dadosGrafico[idx].scorePratica}
                            </text>
                          </g>
                        ))}

                        {/* Marcadores Planejamento */}
                        {ptsPlan.map((p, idx) => (
                          <g key={`pl-${idx}`}>
                            <rect x={p.x - 5} y={p.y - 5} width="10" height="10" fill="#0072bc" stroke="#ffffff" strokeWidth="2" rx="2" />
                            <text x={p.x} y={p.y + 18} textAnchor="middle" fontSize="10" fontWeight="700" fill="#0072bc">
                              {dadosGrafico[idx].scorePlan}
                            </text>
                          </g>
                        ))}

                        {/* Rótulos no Eixo X */}
                        {dadosGrafico.map((d, idx) => {
                          const x = count === 1 ? 390 : 120 + idx * stepX;
                          return (
                            <g key={`lbl-${idx}`}>
                              <text x={x} y="165" textAnchor="middle" fontSize="10.5" fontWeight="700" fill="#1e293b">
                                {d.label}
                              </text>
                              <text x={x} y="177" textAnchor="middle" fontSize="9" fill="#64748b">
                                {d.subLabel}
                              </text>
                            </g>
                          );
                        })}
                      </g>
                    );
                  })()}
                </svg>
              </div>
            )}
          </div>

          {/* HISTÓRICO CRONOLÓGICO DE OBSERVAÇÕES */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#002d5c' }}>
                🕒 Histórico Cronológico das Observações ({observacoesDoCursista.length})
              </h3>
            </div>

            {observacoesDoCursista.length === 0 ? (
              <div style={{ background: '#ffffff', borderRadius: '12px', padding: '2rem', textAlign: 'center', border: '1px dashed #cbd5e1' }}>
                <p style={{ color: '#64748b', margin: 0, fontWeight: 500 }}>
                  Nenhum registro cronológico encontrado para este cursista.
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                {observacoesDoCursista.map((obs, idx) => {
                  const isExpanded = expandedObsId === obs.id || (idx === 0 && expandedObsId === null);
                  const isReal = obs.is_realizada ?? obs.observacao_realizada?.toLowerCase().includes('sim');

                  return (
                    <div 
                      key={obs.id || idx}
                      style={{
                        background: '#ffffff',
                        borderRadius: '12px',
                        border: '1px solid #e2e8f0',
                        overflow: 'hidden',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      {/* Topo do Card de Observação */}
                      <div 
                        onClick={() => setExpandedObsId(isExpanded ? '__none__' : obs.id)}
                        style={{
                          padding: '1rem 1.25rem',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          cursor: 'pointer',
                          backgroundColor: isExpanded ? '#f8fafc' : '#ffffff',
                          borderBottom: isExpanded ? '1px solid #e2e8f0' : 'none'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                          <span style={{
                            padding: '0.2rem 0.6rem',
                            borderRadius: '4px',
                            fontSize: '0.75rem',
                            fontWeight: 800,
                            backgroundColor: isReal ? '#dcfce7' : '#fee2e2',
                            color: isReal ? '#166534' : '#991b1b'
                          }}>
                            {isReal ? '✓ Realizada' : '⚠️ Não Realizada'}
                          </span>

                          <span style={{ fontWeight: 800, fontSize: '0.9rem', color: '#0f172a' }}>
                            {obs.semestre || `Observação #${observacoesDoCursista.length - idx}`} • {obs.ano_formativo || 'Formação'}
                          </span>

                          <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                            📅 {obs.data_feedback ? formatDatePtBr(obs.data_feedback) : (obs.carimbo || 'Data recente')}
                          </span>

                          {obs.modalidade_feedback && (
                            <span style={{ fontSize: '0.75rem', backgroundColor: '#e2e8f0', padding: '0.15rem 0.5rem', borderRadius: '4px', color: '#334155' }}>
                              {obs.modalidade_feedback}
                            </span>
                          )}
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          {isReal && (
                            <div style={{ display: 'flex', gap: '0.4rem' }}>
                              <span style={{ fontSize: '0.75rem', fontWeight: 700, padding: '0.15rem 0.5rem', borderRadius: '4px', backgroundColor: '#e0f2fe', color: '#0369a1' }}>
                                Prática: {obs.nivel_pratica || '-'}
                              </span>
                              <span style={{ fontSize: '0.75rem', fontWeight: 700, padding: '0.15rem 0.5rem', borderRadius: '4px', backgroundColor: '#ede9fe', color: '#6d28d9' }}>
                                Plan: {obs.nivel_planejamento || '-'}
                              </span>
                            </div>
                          )}

                          <span style={{ fontSize: '0.85rem', color: '#64748b' }}>
                            {isExpanded ? '▲' : '▼'}
                          </span>
                        </div>
                      </div>

                      {/* Conteúdo Expansível do Detalhe */}
                      {isExpanded && (
                        <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem', backgroundColor: '#ffffff' }}>
                          {obs.proposta_pedagogica && (
                            <div style={{ backgroundColor: '#eff6ff', padding: '0.65rem 0.85rem', borderRadius: '6px', borderLeft: '4px solid #3b82f6' }}>
                              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#1d4ed8', textTransform: 'uppercase' }}>Proposta Pedagógica Selecionada:</span>
                              <p style={{ margin: '0.2rem 0 0 0', fontWeight: 700, color: '#1e3a8a', fontSize: '0.88rem' }}>{obs.proposta_pedagogica}</p>
                            </div>
                          )}

                          {obs.tema && (
                            <div>
                              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Foco / Tema Formativo:</span>
                              <p style={{ margin: '0.2rem 0 0 0', fontWeight: 600, color: '#0f172a', fontSize: '0.88rem' }}>{obs.tema}</p>
                            </div>
                          )}

                          {obs.motivo_devolutiva && (
                            <div style={{ backgroundColor: '#fffbeb', padding: '0.65rem 0.85rem', borderRadius: '6px', borderLeft: '4px solid #f59e0b' }}>
                              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#b45309', textTransform: 'uppercase' }}>Motivo da Devolutiva Gravada:</span>
                              <p style={{ margin: '0.2rem 0 0 0', color: '#78350f', fontSize: '0.84rem' }}>{obs.motivo_devolutiva}</p>
                            </div>
                          )}

                          {!isReal && obs.justificativa_nao_realizada && (
                            <div style={{ backgroundColor: '#fef2f2', padding: '0.85rem', borderRadius: '8px', borderLeft: '4px solid #ef4444' }}>
                              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#991b1b', textTransform: 'uppercase' }}>Justificativa:</span>
                              <p style={{ margin: '0.25rem 0 0 0', color: '#7f1d1d', fontSize: '0.85rem' }}>{obs.justificativa_nao_realizada}</p>
                            </div>
                          )}

                          {isReal && (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1rem' }}>
                              {(obs.criterio1_evidencias || obs.criterio1_nivel) && (
                                <div style={{ backgroundColor: '#f8fafc', padding: '0.85rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#002d5c', textTransform: 'uppercase' }}>
                                    🎯 Critério 1 {obs.criterio1_nivel ? `(${obs.criterio1_nivel})` : ''}:
                                  </span>
                                  <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.83rem', color: '#334155', lineHeight: 1.4 }}>{obs.criterio1_evidencias || 'Sem texto de evidências'}</p>
                                </div>
                              )}

                              {(obs.criterio2_evidencias || obs.criterio2_nivel) && (
                                <div style={{ backgroundColor: '#f8fafc', padding: '0.85rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#002d5c', textTransform: 'uppercase' }}>
                                    🎯 Critério 2 {obs.criterio2_nivel ? `(${obs.criterio2_nivel})` : ''}:
                                  </span>
                                  <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.83rem', color: '#334155', lineHeight: 1.4 }}>{obs.criterio2_evidencias || 'Sem texto de evidências'}</p>
                                </div>
                              )}

                              {obs.evidencias_pratica && !obs.criterio1_evidencias && (
                                <div style={{ backgroundColor: '#f8fafc', padding: '0.85rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#002d5c', textTransform: 'uppercase' }}>🔍 Evidências da Prática:</span>
                                  <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.83rem', color: '#334155', lineHeight: 1.4 }}>{obs.evidencias_pratica}</p>
                                </div>
                              )}

                              {obs.evidencias_planejamento && !obs.criterio2_evidencias && (
                                <div style={{ backgroundColor: '#f8fafc', padding: '0.85rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#002d5c', textTransform: 'uppercase' }}>📝 Evidências do Planejamento:</span>
                                  <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.83rem', color: '#334155', lineHeight: 1.4 }}>{obs.evidencias_planejamento}</p>
                                </div>
                              )}

                              {obs.questionamentos_propositivos && (
                                <div style={{ backgroundColor: '#f8fafc', padding: '0.85rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#002d5c', textTransform: 'uppercase' }}>💡 Questionamentos Propositivos:</span>
                                  <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.83rem', color: '#334155', lineHeight: 1.4 }}>{obs.questionamentos_propositivos}</p>
                                </div>
                              )}

                              {obs.proposicoes_sugestoes && (
                                <div style={{ backgroundColor: '#f8fafc', padding: '0.85rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#002d5c', textTransform: 'uppercase' }}>✨ Proposições / Sugestões:</span>
                                  <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.83rem', color: '#334155', lineHeight: 1.4 }}>{obs.proposicoes_sugestoes}</p>
                                </div>
                              )}

                              {obs.escala_boas_praticas && (
                                <div style={{ backgroundColor: '#f0fdf4', padding: '0.85rem', borderRadius: '8px', border: '1px solid #bbf7d0' }}>
                                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#166534', textTransform: 'uppercase' }}>⭐ Escala de Boas Práticas:</span>
                                  <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.83rem', color: '#14532d', fontWeight: 600 }}>Nível {obs.escala_boas_praticas} de 4 na consolidação formativa</p>
                                </div>
                              )}

                              {obs.etapas_nao_realizadas && obs.etapas_nao_realizadas !== 'Nenhuma (Todas as etapas realizadas)' && (
                                <div style={{ backgroundColor: '#fff1f2', padding: '0.85rem', borderRadius: '8px', borderLeft: '4px solid #f43f5e' }}>
                                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#9f1239', textTransform: 'uppercase' }}>⚠️ Etapas do PDP Não Realizadas:</span>
                                  <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.83rem', color: '#881337', fontWeight: 600 }}>Etapas: {obs.etapas_nao_realizadas}</p>
                                  {obs.justificativa_etapas && (
                                    <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.8rem', color: '#4c0519', fontStyle: 'italic' }}>Justificativa: {obs.justificativa_etapas}</p>
                                  )}
                                </div>
                              )}
                            </div>
                          )}

                          {/* Links de Gravações, Planejamento e PDP */}
                          {(obs.link_gravacao_pratica || obs.link_gravacao_feedback || obs.link_planejamento || obs.link_pdp) && (
                            <div style={{ display: 'flex', gap: '0.65rem', flexWrap: 'wrap', paddingTop: '0.5rem', borderTop: '1px solid #f1f5f9' }}>
                              {obs.link_gravacao_pratica && (
                                <a 
                                  href={obs.link_gravacao_pratica} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '0.4rem',
                                    fontSize: '0.78rem',
                                    fontWeight: 700,
                                    padding: '0.4rem 0.8rem',
                                    borderRadius: '6px',
                                    backgroundColor: '#fee2e2',
                                    color: '#b91c1c',
                                    textDecoration: 'none'
                                  }}
                                >
                                  📹 Ver Gravação da Aula
                                </a>
                              )}
                              {obs.link_gravacao_feedback && (
                                <a 
                                  href={obs.link_gravacao_feedback} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '0.4rem',
                                    fontSize: '0.78rem',
                                    fontWeight: 700,
                                    padding: '0.4rem 0.8rem',
                                    borderRadius: '6px',
                                    backgroundColor: '#e0e7ff',
                                    color: '#4338ca',
                                    textDecoration: 'none'
                                  }}
                                >
                                  🗣️ Ver Gravação do Feedback
                                </a>
                              )}
                              {obs.link_planejamento && (
                                <a 
                                  href={obs.link_planejamento} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '0.4rem',
                                    fontSize: '0.78rem',
                                    fontWeight: 700,
                                    padding: '0.4rem 0.8rem',
                                    borderRadius: '6px',
                                    backgroundColor: '#f1f5f9',
                                    color: '#334155',
                                    textDecoration: 'none'
                                  }}
                                >
                                  📄 Acessar Plano de Aula
                                </a>
                              )}
                              {obs.link_pdp && (
                                <a 
                                  href={obs.link_pdp} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '0.4rem',
                                    fontSize: '0.78rem',
                                    fontWeight: 700,
                                    padding: '0.4rem 0.8rem',
                                    borderRadius: '6px',
                                    backgroundColor: '#ecfdf5',
                                    color: '#047857',
                                    textDecoration: 'none'
                                  }}
                                >
                                  📑 Acessar PDP
                                </a>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>

        {/* Rodapé */}
        <div style={{
          padding: '1rem 1.75rem',
          backgroundColor: '#ffffff',
          borderTop: '1px solid #e2e8f0',
          display: 'flex',
          justifyContent: 'flex-end',
          alignItems: 'center'
        }}>
          <button
            type="button"
            onClick={onClose}
            className="btn-secondary"
            style={{ padding: '0.55rem 1.4rem', fontWeight: 600 }}
          >
            Fechar
          </button>
        </div>
      </div>

      {/* Modal Sobreposto para Inserção */}
      {showFormInserir && (
        <FormularioInserirObservacao
          cursista={cursista}
          turmaInfo={turmaInfo}
          onSave={handleSalvarNovaObservacao}
          onClose={() => setShowFormInserir(false)}
        />
      )}
    </div>
  );
}
