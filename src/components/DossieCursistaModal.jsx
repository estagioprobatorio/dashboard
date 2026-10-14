import React, { useState, useMemo, useEffect } from 'react';
import { formatDatePtBr, parseDateToTimestamp } from '../utils/dateUtils';
import FormularioInserirObservacao from './FormularioInserirObservacao';
import CurvaEvolucaoPedagogica from './CurvaEvolucaoPedagogica';
import { getObservacoes2024PorCursista } from '../utils/observacoes2024Service';
import { parseScore, scoreLabel, gerarDiagnosticoCursistaIA } from '../utils/aiPedagogicalService';

export default function DossieCursistaModal({ 
  cursista, 
  turmaInfo, 
  observacoes = [], 
  onClose, 
  onSaveObservacao,
  readOnly = false 
}) {
  const [showFormInserir, setShowFormInserir] = useState(false);
  const [expandedObsId, setExpandedObsId] = useState(null);
  const [obs2024, setObs2024] = useState([]);
  const [loading2024, setLoading2024] = useState(false);

  // Normalização e busca de todas as observações pertencentes a este cursista
  const cursistaEmail = (cursista?.email || cursista?.email_cursista || '').trim().toLowerCase();
  const cursistaNome = (cursista?.nome || cursista?.nome_cursista || '').trim().toLowerCase();

  // Carregar histórico de 2024 do cursista sob demanda
  useEffect(() => {
    let isMounted = true;
    if (cursista) {
      setLoading2024(true);
      getObservacoes2024PorCursista(cursista).then(res => {
        if (isMounted) {
          setObs2024(res);
          setLoading2024(false);
        }
      }).catch(err => {
        console.warn('Erro ao carregar histórico 2024:', err);
        if (isMounted) setLoading2024(false);
      });
    }
    return () => { isMounted = false; };
  }, [cursista]);

  const getObsTimestamp = (obs) => {
    return parseDateToTimestamp(
      obs.data_feedback || obs.data_pratica || obs.data_observacao || obs.carimbo || obs.created_at
    );
  };

  const observacoesAtuais2026 = useMemo(() => {
    return observacoes.filter(obs => {
      const email = (obs.email_cursista || '').trim().toLowerCase();
      const matchEmail = email && cursistaEmail && email === cursistaEmail;
      const nome = (obs.nome_cursista || '').trim().toLowerCase();
      const matchNome = nome && cursistaNome && nome === cursistaNome;
      if (!matchEmail && !matchNome) return false;

      // Se o dossiê estiver visualizando um vínculo/turma específico, filtra observações pertinentes
      const cComp = (turmaInfo?.componente || cursista?.componente || cursista?.componente_conc || '').trim().toLowerCase();
      const oComp = (obs.componente || '').trim().toLowerCase();
      if (cComp && oComp) {
        const isPed = (oComp.includes('pedagog') || oComp.includes('gestor')) && (cComp.includes('pedagog') || cComp.includes('gestor'));
        if (!isPed && !cComp.includes(oComp) && !oComp.includes(cComp)) {
          return false;
        }
      }

      const cTurma = (turmaInfo?.turma || cursista?.turmas || cursista?.turma || '').trim().toLowerCase();
      const oTurma = (obs.turma || obs.turmas || '').trim().toLowerCase();
      if (cTurma && oTurma && cTurma !== oTurma) {
        return false;
      }

      const cForm = (turmaInfo?.formador || cursista?.nome_formador || cursista?.formador || '').trim().toLowerCase();
      const oForm = (obs.nome_formador || '').trim().toLowerCase();
      if (cForm && oForm && !cForm.includes(oForm) && !oForm.includes(cForm)) {
        return false;
      }

      return true;
    });
  }, [observacoes, cursistaEmail, cursistaNome, turmaInfo, cursista]);

  const observacoesDoCursista = useMemo(() => {
    const cComp = (turmaInfo?.componente || cursista?.componente || cursista?.componente_conc || '').trim().toLowerCase();
    const cTurma = (turmaInfo?.turma || cursista?.turmas || cursista?.turma || '').trim().toLowerCase();

    const obs2024Filtradas = obs2024.filter(o => {
      const oComp = (o.componente || '').trim().toLowerCase();
      if (cComp && oComp) {
        const isPed = (oComp.includes('pedagog') || oComp.includes('gestor')) && (cComp.includes('pedagog') || cComp.includes('gestor'));
        if (!isPed && !cComp.includes(oComp) && !oComp.includes(cComp)) {
          return false;
        }
      }
      const oTurma = (o.turma || o.turmas || '').trim().toLowerCase();
      if (cTurma && oTurma && cTurma !== oTurma) {
        return false;
      }
      return true;
    });

    // Mescla observações atuais com o histórico de 2024
    const todasMescladas = [...observacoesAtuais2026, ...obs2024Filtradas];

    // Ordenação estritamente cronológica decrescente (mais recente primeiro no histórico/timeline)
    return todasMescladas.sort((a, b) => getObsTimestamp(b) - getObsTimestamp(a));
  }, [observacoesAtuais2026, obs2024, turmaInfo, cursista]);

  // Função para mapear texto ou número para nível numérico (1 a 4)
  const nivelToScore = (nivel) => parseScore(nivel);

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

  // Diagnóstico Pedagógico por Inteligência Artificial
  const diagnosticoIA = useMemo(() => {
    return gerarDiagnosticoCursistaIA({
      cursista,
      observacoes: observacoesDoCursista,
      turmaInfo
    });
  }, [cursista, observacoesDoCursista, turmaInfo]);

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
            {!readOnly && (
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
            )}

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
              <div style={{ fontSize: '0.75rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                {loading2024 ? (
                  <span style={{ color: '#0284c7' }}>⏳ Buscando base de 2024...</span>
                ) : obs2024.length > 0 ? (
                  <span>Histórico Consolidado: <b>{obs2024.length} em 2024</b> • <b>{observacoesAtuais2026.length} em 2026</b></span>
                ) : (
                  <span>Ciclo Formativo 2026</span>
                )}
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

          {/* GRÁFICO DE EVOLUÇÃO PEDAGÓGICA (COMPONENTIZADO E OTIMIZADO) */}
          <div style={{ background: '#ffffff', padding: '1.25rem', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <CurvaEvolucaoPedagogica
              observacoes={observacoesDoCursista}
              title="Curva de Evolução Pedagógica do Cursista"
              subtitle="Acompanhamento cronológico dos níveis de Prática Docente e Planejamento Pedagógico"
            />
          </div>

          {/* CARD DE DIAGNÓSTICO PEDAGÓGICO POR INTELIGÊNCIA ARTIFICIAL */}
          <div style={{
            background: '#ffffff',
            borderRadius: '12px',
            border: '1px solid #e2e8f0',
            borderTop: '4px solid #0072bc',
            padding: '1.25rem',
            boxShadow: '0 2px 8px rgba(0, 114, 188, 0.06)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <span style={{ fontSize: '1.4rem' }}>✨</span>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#002d5c' }}>
                    Diagnóstico Pedagógico por Inteligência Artificial
                  </h3>
                  <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                    Análise formativa automatizada • Atualizado em {diagnosticoIA.dataGeracao}
                  </span>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <span style={{
                  padding: '0.2rem 0.6rem',
                  borderRadius: '999px',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  backgroundColor: '#e0f2fe',
                  color: '#0369a1',
                  border: '1px solid #bae6fd'
                }}>
                  {diagnosticoIA.totalRealizadas} observações analisadas
                </span>
              </div>
            </div>

            {/* Síntese Executiva */}
            <div style={{
              backgroundColor: '#f8fafc',
              borderLeft: '4px solid #0072bc',
              padding: '0.85rem 1rem',
              borderRadius: '6px',
              marginBottom: '1.25rem'
            }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#0072bc', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                📋 Síntese da Trajetória Docente
              </span>
              <p style={{ margin: '0.35rem 0 0 0', fontSize: '0.9rem', color: '#1e293b', lineHeight: 1.5, fontWeight: 500 }}>
                {diagnosticoIA.sintese}
              </p>
            </div>

            {/* Grade: Pontos Fortes e Pontos de Atenção */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1rem', marginBottom: '1.25rem' }}>
              {/* Pontos Fortes */}
              <div style={{
                backgroundColor: '#f0fdf4',
                border: '1px solid #bbf7d0',
                borderRadius: '8px',
                padding: '1rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.65rem' }}>
                  <span style={{ fontSize: '1.1rem' }}>🌟</span>
                  <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#166534', textTransform: 'uppercase' }}>
                    Pontos Fortes Consolidados
                  </span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                  {diagnosticoIA.pontosFortes.map((pf, idx) => (
                    <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.45rem', fontSize: '0.84rem', color: '#14532d', lineHeight: 1.4 }}>
                      <span style={{ color: '#00984a', fontWeight: 800, flexShrink: 0 }}>✓</span>
                      <span><b>{pf}</b></span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Pontos de Atenção */}
              <div style={{
                backgroundColor: '#fffbeb',
                border: '1px solid #fde68a',
                borderRadius: '8px',
                padding: '1rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.65rem' }}>
                  <span style={{ fontSize: '1.1rem' }}>⚠️</span>
                  <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#b45309', textTransform: 'uppercase' }}>
                    Pontos de Atenção / Oportunidades
                  </span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                  {diagnosticoIA.pontosAtencao.map((pa, idx) => (
                    <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.45rem', fontSize: '0.84rem', color: '#78350f', lineHeight: 1.4 }}>
                      <span style={{ color: '#d97706', fontWeight: 800, flexShrink: 0 }}>•</span>
                      <span>{pa}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Evolução para cada Referência / Temática Pedagógica */}
            <div style={{ marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.65rem' }}>
                <span style={{ fontSize: '1.1rem' }}>🎯</span>
                <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#002d5c', textTransform: 'uppercase' }}>
                  Evolução para cada Referência / Foco Temático
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '0.75rem' }}>
                {diagnosticoIA.evolucaoPorReferencia.map((ref, idx) => (
                  <div 
                    key={idx}
                    style={{
                      backgroundColor: '#ffffff',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      padding: '0.85rem',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.4rem', marginBottom: '0.4rem' }}>
                      <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#0f172a' }}>
                        {ref.referencia}
                      </span>
                      <span style={{
                        fontSize: '0.7rem',
                        fontWeight: 800,
                        padding: '0.15rem 0.5rem',
                        borderRadius: '4px',
                        backgroundColor: ref.bg,
                        color: ref.cor,
                        whiteSpace: 'nowrap'
                      }}>
                        {ref.status}
                      </span>
                    </div>

                    <div style={{ fontSize: '0.78rem', color: '#64748b', marginBottom: '0.35rem' }}>
                      <b>Trajetória:</b> Nível {ref.nivelInicial} ➔ <b>Nível {ref.nivelAtual}</b> ({ref.totalObservacoes} obs.)
                    </div>

                    <p style={{ margin: 0, fontSize: '0.78rem', color: '#475569', lineHeight: 1.35, fontStyle: 'italic' }}>
                      "{ref.descricao}"
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Recomendações e Plano de Ação para o Formador */}
            <div style={{ backgroundColor: '#f8fafc', padding: '0.85rem 1rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#002d5c', textTransform: 'uppercase' }}>
                🚀 Recomendações para o Formador / Tutor nos Próximos Diálogos:
              </span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', marginTop: '0.4rem' }}>
                {diagnosticoIA.planoAcao.map((acao, idx) => (
                  <div key={idx} style={{ fontSize: '0.82rem', color: '#334155' }}>
                    <b>{idx + 1}.</b> {acao}
                  </div>
                ))}
              </div>
            </div>
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
                  const is2024 = String(obs.ano_letivo || obs.ano_formativo || '').includes('2024') || String(obs.id_origem || '').includes('2024');

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
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
                          <span style={{
                            padding: '0.2rem 0.55rem',
                            borderRadius: '4px',
                            fontSize: '0.72rem',
                            fontWeight: 800,
                            backgroundColor: is2024 ? '#fef3c7' : '#e0e7ff',
                            color: is2024 ? '#92400e' : '#3730a3',
                            border: is2024 ? '1px solid #fde68a' : '1px solid #c7d2fe'
                          }}>
                            {is2024 ? '🗓️ Histórico 2024' : '🗓️ Ciclo 2026'}
                          </span>

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
