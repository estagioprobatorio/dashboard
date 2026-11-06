import React, { useState, useMemo, useRef } from 'react';
import { formatDatePtBr, parseDateToTimestamp } from '../utils/dateUtils';
import { parseScore, scoreLabel } from '../utils/aiPedagogicalService';

/**
 * Componente Visual Aprimorado: Curva de Evolução Pedagógica
 * Desenvolvido para SEED-PR • Estágio Probatório
 * 
 * Suporta cursistas com muitas observações (10, 20, 30+) sem amontoamento,
 * com rolagem horizontal suave, filtros por período (Todas, Ciclo 2026, Ciclo 2024, Recentes),
 * prevenção de colisão de pontos/rótulos e tooltip interativo detalhado.
 */
export default function CurvaEvolucaoPedagogica({
  observacoes = [],
  title = "Curva de Evolução Pedagógica",
  subtitle = "Acompanhamento cronológico dos níveis de Prática Docente e Planejamento",
  showFilters = true
}) {
  const [filtroPeriodo, setFiltroPeriodo] = useState('todas'); // 'todas' | '2026' | '2024' | 'recentes'
  const [activeTooltip, setActiveTooltip] = useState(null);
  const containerRef = useRef(null);

  // 1. Processar e ordenar todas as observações cronologicamente (crescente)
  const todasObservacoesOrdenadas = useMemo(() => {
    if (!Array.isArray(observacoes) || observacoes.length === 0) return [];

    const formatadas = observacoes.map((obs, idx) => {
      const scorePratica = parseScore(obs.nivel_pratica || obs.criterio2_nivel);
      const scorePlan = parseScore(obs.nivel_planejamento || obs.criterio1_nivel);
      const rawDate = obs.data_feedback || obs.data_pratica || obs.data_observacao || obs.carimbo || obs.created_at;
      const timestamp = parseDateToTimestamp(rawDate);
      const dataFormatada = formatDatePtBr(rawDate);
      
      // Identificar o ano / ciclo
      const anoStr = String(obs.ano_formativo || obs.ano_letivo || obs.semestre || obs.carimbo || '');
      const is2024 = anoStr.includes('2024') || String(obs.id_origem || '').includes('2024');
      const anoCiclo = is2024 ? '2024' : '2026';

      return {
        id: obs.id || `obs-${idx}`,
        originalIndex: idx + 1,
        timestamp,
        dataStr: dataFormatada,
        anoCiclo,
        scorePratica,
        scorePlan,
        semestre: obs.semestre || (is2024 ? 'Histórico 2024' : 'Ciclo 2026'),
        tema: obs.tema || obs.foco_pedagogico || 'Geral',
        modalidade: obs.modalidade_feedback || obs.modalidade || 'Presencial',
        proposta: obs.proposta_pedagogica || '',
        raw: obs
      };
    });

    // Ordenar estritamente por timestamp crescente (mais antigo -> mais recente)
    return formatadas.sort((a, b) => a.timestamp - b.timestamp);
  }, [observacoes]);

  // Contadores para os filtros
  const contadores = useMemo(() => {
    const total = todasObservacoesOrdenadas.length;
    const count2026 = todasObservacoesOrdenadas.filter(o => o.anoCiclo === '2026').length;
    const count2024 = todasObservacoesOrdenadas.filter(o => o.anoCiclo === '2024').length;
    return { total, count2026, count2024 };
  }, [todasObservacoesOrdenadas]);

  // 2. Aplicar filtro selecionado
  const dadosExibidos = useMemo(() => {
    if (filtroPeriodo === '2026') {
      return todasObservacoesOrdenadas.filter(o => o.anoCiclo === '2026');
    }
    if (filtroPeriodo === '2024') {
      return todasObservacoesOrdenadas.filter(o => o.anoCiclo === '2024');
    }
    if (filtroPeriodo === 'recentes') {
      return todasObservacoesOrdenadas.slice(-8); // últimas 8 observações
    }
    return todasObservacoesOrdenadas;
  }, [todasObservacoesOrdenadas, filtroPeriodo]);

  // Cálculos de métricas rápidas dos dados exibidos
  const metricas = useMemo(() => {
    const comPratica = dadosExibidos.filter(d => d.scorePratica !== null);
    const comPlan = dadosExibidos.filter(d => d.scorePlan !== null);
    
    const mediaPratica = comPratica.length > 0
      ? (comPratica.reduce((acc, d) => acc + d.scorePratica, 0) / comPratica.length).toFixed(1)
      : null;

    const mediaPlan = comPlan.length > 0
      ? (comPlan.reduce((acc, d) => acc + d.scorePlan, 0) / comPlan.length).toFixed(1)
      : null;

    return { mediaPratica, mediaPlan };
  }, [dadosExibidos]);

  // Estado vazio
  if (todasObservacoesOrdenadas.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '2.5rem 1rem', color: '#94a3b8' }}>
        <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>📈</div>
        <p style={{ fontWeight: 600, fontSize: '0.9rem', margin: 0, color: '#475569' }}>
          Nenhuma observação com avaliação registrada para exibir a curva.
        </p>
        <p style={{ fontSize: '0.8rem', margin: '0.25rem 0 0 0', color: '#64748b' }}>
          Assim que forem registradas observações com níveis de prática ou planejamento, a evolução será mapeada aqui.
        </p>
      </div>
    );
  }

  // Configurações do layout do SVG
  const count = dadosExibidos.length;
  const startX = 110;
  // Largura de cada etapa: mais folga quando houver muitos dados para evitar colisão
  const stepX = count > 12 ? 80 : (count > 6 ? 90 : (count > 1 ? Math.min(140, Math.max(90, 520 / (count - 1))) : 260));
  const svgWidth = Math.max(680, startX + Math.max(count, 1) * stepX + 70);
  const svgHeight = 235;

  // Mapeamento Y: Nível 4 = 35px, Nível 3 = 72px, Nível 2 = 109px, Nível 1 = 146px
  const getY = (score) => {
    if (!score) return null;
    return 35 + (4 - score) * 37;
  };

  // Coordenadas calculadas com desvio anti-colisão se Prática e Planejamento coincidirem
  const pontosCalculados = dadosExibidos.map((d, i) => {
    const baseX = count === 1 ? svgWidth / 2 : startX + i * stepX;
    const yPratica = getY(d.scorePratica);
    const yPlan = getY(d.scorePlan);
    const isCoincidente = d.scorePratica && d.scorePlan && d.scorePratica === d.scorePlan;

    return {
      ...d,
      indexDisplay: i + 1,
      baseX,
      // Se coincidirem, deslocamos levemente em X (-5px prática, +5px planejamento)
      xPratica: isCoincidente ? baseX - 6 : baseX,
      yPratica,
      xPlan: isCoincidente ? baseX + 6 : baseX,
      yPlan,
      isCoincidente
    };
  });

  // Linhas SVG conectando pontos válidos
  const ptsPraticaValidos = pontosCalculados.filter(p => p.yPratica !== null);
  const ptsPlanValidos = pontosCalculados.filter(p => p.yPlan !== null);

  const pathPratica = ptsPraticaValidos.length > 1
    ? ptsPraticaValidos.reduce((acc, p, i) => i === 0 ? `M ${p.xPratica} ${p.yPratica}` : `${acc} L ${p.xPratica} ${p.yPratica}`, '')
    : '';

  const pathPlan = ptsPlanValidos.length > 1
    ? ptsPlanValidos.reduce((acc, p, i) => i === 0 ? `M ${p.xPlan} ${p.yPlan}` : `${acc} L ${p.xPlan} ${p.yPlan}`, '')
    : '';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
      
      {/* CABEÇALHO DO GRÁFICO & CONTROLES */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#002d5c', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span>📈</span> {title}
          </h4>
          <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.78rem', color: '#64748b' }}>
            {subtitle}
          </p>
        </div>

        {/* Legenda e Métricas Rápidas */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.78rem', fontWeight: 700, color: '#00984a' }}>
            <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#00984a', display: 'inline-block' }}></span>
            <span>Prática Docente</span>
            {metricas.mediaPratica && (
              <span style={{ fontSize: '0.72rem', backgroundColor: '#dcfce7', padding: '0.1rem 0.4rem', borderRadius: '4px', fontWeight: 800 }}>
                méd: {metricas.mediaPratica}
              </span>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.78rem', fontWeight: 700, color: '#0072bc' }}>
            <span style={{ width: '10px', height: '10px', borderRadius: '2px', backgroundColor: '#0072bc', display: 'inline-block' }}></span>
            <span>Planejamento</span>
            {metricas.mediaPlan && (
              <span style={{ fontSize: '0.72rem', backgroundColor: '#e0f2fe', padding: '0.1rem 0.4rem', borderRadius: '4px', fontWeight: 800 }}>
                méd: {metricas.mediaPlan}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* BARRA DE FILTROS RÁPIDOS POR PERÍODO (quando houver mais de 5 observações) */}
      {showFilters && todasObservacoesOrdenadas.length > 5 && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.45rem',
          flexWrap: 'wrap',
          backgroundColor: '#f8fafc',
          padding: '0.4rem 0.6rem',
          borderRadius: '8px',
          border: '1px solid #e2e8f0'
        }}>
          <span style={{ fontSize: '0.74rem', fontWeight: 700, color: '#64748b', marginRight: '0.2rem' }}>
            🔍 Filtrar Visualização:
          </span>

          <button
            type="button"
            onClick={() => setFiltroPeriodo('todas')}
            style={{
              padding: '0.25rem 0.65rem',
              borderRadius: '6px',
              fontSize: '0.75rem',
              fontWeight: 700,
              cursor: 'pointer',
              border: filtroPeriodo === 'todas' ? '1px solid #002d5c' : '1px solid #cbd5e1',
              backgroundColor: filtroPeriodo === 'todas' ? '#002d5c' : '#ffffff',
              color: filtroPeriodo === 'todas' ? '#ffffff' : '#334155',
              transition: 'all 0.15s'
            }}
          >
            Todas ({contadores.total})
          </button>

          {contadores.total > 8 && (
            <button
              type="button"
              onClick={() => setFiltroPeriodo('recentes')}
              style={{
                padding: '0.25rem 0.65rem',
                borderRadius: '6px',
                fontSize: '0.75rem',
                fontWeight: 700,
                cursor: 'pointer',
                border: filtroPeriodo === 'recentes' ? '1px solid #00984a' : '1px solid #cbd5e1',
                backgroundColor: filtroPeriodo === 'recentes' ? '#00984a' : '#ffffff',
                color: filtroPeriodo === 'recentes' ? '#ffffff' : '#334155',
                transition: 'all 0.15s'
              }}
            >
              Últimas 8 Etapas
            </button>
          )}

          {contadores.count2026 > 0 && contadores.count2024 > 0 && (
            <>
              <button
                type="button"
                onClick={() => setFiltroPeriodo('2026')}
                style={{
                  padding: '0.25rem 0.65rem',
                  borderRadius: '6px',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  border: filtroPeriodo === '2026' ? '1px solid #0072bc' : '1px solid #cbd5e1',
                  backgroundColor: filtroPeriodo === '2026' ? '#0072bc' : '#ffffff',
                  color: filtroPeriodo === '2026' ? '#ffffff' : '#334155',
                  transition: 'all 0.15s'
                }}
              >
                Apenas 2026 ({contadores.count2026})
              </button>

              <button
                type="button"
                onClick={() => setFiltroPeriodo('2024')}
                style={{
                  padding: '0.25rem 0.65rem',
                  borderRadius: '6px',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  border: filtroPeriodo === '2024' ? '1px solid #d97706' : '1px solid #cbd5e1',
                  backgroundColor: filtroPeriodo === '2024' ? '#d97706' : '#ffffff',
                  color: filtroPeriodo === '2024' ? '#ffffff' : '#334155',
                  transition: 'all 0.15s'
                }}
              >
                Histórico 2024 ({contadores.count2024})
              </button>
            </>
          )}

          {count > 8 && (
            <span style={{ marginLeft: 'auto', fontSize: '0.72rem', color: '#64748b', fontStyle: 'italic', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <span>↔️</span> Role horizontalmente para ver todas
            </span>
          )}
        </div>
      )}

      {/* ÁREA DO GRÁFICO SVG COM SCROLLBAR HORIZONTAL FLUIDA */}
      <div 
        ref={containerRef}
        style={{
          width: '100%',
          overflowX: 'auto',
          backgroundColor: '#ffffff',
          borderRadius: '10px',
          border: '1px solid #f1f5f9',
          paddingBottom: '0.5rem',
          position: 'relative',
          boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.02)'
        }}
      >
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          style={{
            minWidth: `${svgWidth}px`,
            width: count > 6 ? `${svgWidth}px` : '100%',
            height: `${svgHeight}px`,
            display: 'block'
          }}
        >
          {/* FAIXAS DOS 4 NÍVEIS PEDAGÓGICOS */}
          {[
            { val: 4, label: 'Supera (4)', color: '#f0fdf4', border: '#bbf7d0', textColor: '#166534' },
            { val: 3, label: 'Atinge Int. (3)', color: '#f0f9ff', border: '#bae6fd', textColor: '#0369a1' },
            { val: 2, label: 'Atinge Parc. (2)', color: '#fefce8', border: '#fef08a', textColor: '#854d0e' },
            { val: 1, label: 'Não Atinge (1)', color: '#fef2f2', border: '#fecaca', textColor: '#991b1b' }
          ].map((row) => {
            const y = getY(row.val);
            return (
              <g key={row.val}>
                {/* Faixa colorida suave no fundo */}
                <rect
                  x="80"
                  y={y - 14}
                  width={svgWidth - 95}
                  height="28"
                  fill={row.color}
                  rx="6"
                  opacity="0.75"
                />
                {/* Linha guia pontilhada */}
                <line
                  x1="80"
                  y1={y}
                  x2={svgWidth - 20}
                  y2={y}
                  stroke={row.border}
                  strokeDasharray="4 3"
                  strokeWidth="1.2"
                />
                {/* Rótulo lateral do nível */}
                <text
                  x="72"
                  y={y + 4}
                  textAnchor="end"
                  fontSize="10"
                  fontWeight="800"
                  fill={row.textColor}
                >
                  {row.label}
                </text>
              </g>
            );
          })}

          {/* LINHAS CONECTANDO OS PONTOS */}
          {pathPratica && (
            <path
              d={pathPratica}
              fill="none"
              stroke="#00984a"
              strokeWidth="3.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ filter: 'drop-shadow(0 2px 3px rgba(0, 152, 74, 0.25))' }}
            />
          )}

          {pathPlan && (
            <path
              d={pathPlan}
              fill="none"
              stroke="#0072bc"
              strokeWidth="3"
              strokeDasharray="6 4"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ filter: 'drop-shadow(0 2px 3px rgba(0, 114, 188, 0.25))' }}
            />
          )}

          {/* COLUNAS VERTICAIS DE CADA OBSERVAÇÃO & EVENTOS DE HOVER */}
          {pontosCalculados.map((p, idx) => {
            const isHovered = activeTooltip?.id === p.id;

            return (
              <g key={`col-${p.id || idx}`}>
                
                {/* Linha vertical sutil conectando o ponto ao eixo X */}
                <line
                  x1={p.baseX}
                  y1={25}
                  x2={p.baseX}
                  y2={160}
                  stroke={isHovered ? '#0072bc' : '#f1f5f9'}
                  strokeWidth={isHovered ? 2 : 1}
                  strokeDasharray={isHovered ? 'none' : '2 2'}
                />

                {/* Marcador da Prática Docente (Círculo Verde) */}
                {p.yPratica !== null && (
                  <g key={`prat-${idx}`}>
                    <circle
                      cx={p.xPratica}
                      cy={p.yPratica}
                      r={isHovered ? 7.5 : 6}
                      fill="#00984a"
                      stroke="#ffffff"
                      strokeWidth={isHovered ? 3 : 2}
                      style={{ transition: 'all 0.15s ease' }}
                    />
                    {/* Número do Score Prática */}
                    <text
                      x={p.xPratica}
                      y={p.yPratica - 9}
                      textAnchor="middle"
                      fontSize="10"
                      fontWeight="800"
                      fill="#00984a"
                    >
                      {p.scorePratica}
                    </text>
                  </g>
                )}

                {/* Marcador do Planejamento (Quadrado Azul) */}
                {p.yPlan !== null && (
                  <g key={`plan-${idx}`}>
                    <rect
                      x={p.xPlan - (isHovered ? 6 : 5)}
                      y={p.yPlan - (isHovered ? 6 : 5)}
                      width={isHovered ? 12 : 10}
                      height={isHovered ? 12 : 10}
                      fill="#0072bc"
                      stroke="#ffffff"
                      strokeWidth={isHovered ? 2.5 : 1.8}
                      rx="2.5"
                      style={{ transition: 'all 0.15s ease' }}
                    />
                    {/* Número do Score Planejamento */}
                    <text
                      x={p.xPlan}
                      y={p.yPlan + 18}
                      textAnchor="middle"
                      fontSize="9.5"
                      fontWeight="800"
                      fill="#0072bc"
                    >
                      {p.scorePlan}
                    </text>
                  </g>
                )}

                {/* RÓTULOS NO EIXO X (NUNCA COLIDEM) */}
                {/* 1. Tag da Observação */}
                <text
                  x={p.baseX}
                  y="172"
                  textAnchor="middle"
                  fontSize="10"
                  fontWeight="800"
                  fill={isHovered ? '#002d5c' : '#1e293b'}
                >
                  Obs #{p.originalIndex}
                </text>

                {/* 2. Ciclo/Ano em badge sutil */}
                <text
                  x={p.baseX}
                  y="184"
                  textAnchor="middle"
                  fontSize="8"
                  fontWeight="700"
                  fill={p.anoCiclo === '2024' ? '#d97706' : '#0284c7'}
                >
                  {p.anoCiclo === '2024' ? '2024' : '2026'}
                </text>

                {/* 3. Data Inclinada a -35° para legibilidade máxima sem sobreposição */}
                <text
                  x={p.baseX}
                  y="198"
                  textAnchor="end"
                  fontSize="9"
                  fontWeight="600"
                  fill="#64748b"
                  transform={`rotate(-35, ${p.baseX}, 198)`}
                >
                  {p.dataStr}
                </text>

                {/* ÁREA INVISÍVEL DE TOQUE/HOVER INTERATIVO */}
                <rect
                  x={p.baseX - stepX / 2}
                  y={15}
                  width={stepX}
                  height={svgHeight - 15}
                  fill="transparent"
                  style={{ cursor: 'pointer' }}
                  onMouseEnter={() => setActiveTooltip(p)}
                  onMouseLeave={() => setActiveTooltip(null)}
                  onClick={() => setActiveTooltip(activeTooltip?.id === p.id ? null : p)}
                />

              </g>
            );
          })}
        </svg>

        {/* TOOLTIP FLUTUANTE INTERATIVO (QUANDO O USUÁRIO PASSA O MOUSE OU CLICA EM UMA ETAPA) */}
        {activeTooltip && (
          <div
            style={{
              position: 'absolute',
              top: '12px',
              left: Math.min(Math.max(10, activeTooltip.baseX - 110), svgWidth - 250),
              background: '#001d3d',
              color: '#ffffff',
              padding: '0.65rem 0.85rem',
              borderRadius: '8px',
              fontSize: '0.78rem',
              boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.4)',
              zIndex: 10,
              pointerEvents: 'none',
              maxWidth: '240px',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              lineHeight: 1.35
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem', borderBottom: '1px solid rgba(255,255,255,0.15)', paddingBottom: '0.25rem' }}>
              <span style={{ fontWeight: 800, color: '#38bdf8' }}>
                Obs #{activeTooltip.originalIndex} ({activeTooltip.anoCiclo})
              </span>
              <span style={{ fontSize: '0.72rem', opacity: 0.8 }}>
                📅 {activeTooltip.dataStr}
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', marginTop: '0.35rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <span style={{ color: '#4ade80' }}>●</span>
                <span><b>Prática Docente:</b> {activeTooltip.scorePratica ? `Nível ${activeTooltip.scorePratica} (${scoreLabel(activeTooltip.scorePratica).split('(')[0].trim()})` : 'Não avaliada'}</span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <span style={{ color: '#60a5fa' }}>■</span>
                <span><b>Planejamento:</b> {activeTooltip.scorePlan ? `Nível ${activeTooltip.scorePlan} (${scoreLabel(activeTooltip.scorePlan).split('(')[0].trim()})` : 'Não avaliado'}</span>
              </div>

              {activeTooltip.tema && activeTooltip.tema !== 'Geral' && (
                <div style={{ marginTop: '0.2rem', fontSize: '0.73rem', color: '#cbd5e1' }}>
                  🎯 <b>Foco:</b> {activeTooltip.tema}
                </div>
              )}

              {activeTooltip.modalidade && (
                <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                  💬 {activeTooltip.modalidade}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* RODA-PÉ INDICATIVO */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.72rem', color: '#64748b', padding: '0 0.25rem' }}>
        <span>Exibindo <b>{count}</b> de <b>{contadores.total}</b> observações registradas</span>
        <span>Escala: <b>1 (Não Atinge)</b> a <b>4 (Supera)</b></span>
      </div>

    </div>
  );
}
