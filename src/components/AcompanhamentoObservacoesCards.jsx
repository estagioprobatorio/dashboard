import React, { useState, useMemo, useEffect } from 'react';
import DossieCursistaModal from './DossieCursistaModal';
import FormularioInserirObservacao from './FormularioInserirObservacao';
import { carregarObservacoes2024 } from '../utils/observacoes2024Service';
import { normalizeComponente } from './ObservacoesOverview';
import { formatDatePtBr } from '../utils/dateUtils';
import { parseScore, gerarResumoRedeEstatistico } from '../utils/aiPedagogicalService';

// Helper para converter nível para pontuação 1 a 4 (aceita texto e números como 3.0)
const nivelToScore = (nivel) => parseScore(nivel);

// Helper para normalizar nome para buscas e matches
const normalizeString = (str) => {
  if (!str) return '';
  return String(str)
    .trim()
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
};

// Helper para extrair iniciais do nome
const getInitials = (name) => {
  if (!name) return 'PR';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'PR';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

export default function AcompanhamentoObservacoesCards({
  cursistas = [],
  observacoes = [],
  tutores = [],
  userRole,
  userEmail,
  onNovaObservacao
}) {
  // Estados de Filtros e Busca
  const [searchTerm, setSearchTerm] = useState('');
  const [componenteFilter, setComponenteFilter] = useState('');
  const [statusEvolucaoFilter, setStatusEvolucaoFilter] = useState('');
  const [anoFiltro, setAnoFiltro] = useState(''); // '', 'com_2024', 'com_2026'
  const [ordenarPor, setOrdenarPor] = useState('evolucao'); // 'evolucao', 'nome', 'observacoes', 'nivel_final'
  const [showEstatisticas, setShowEstatisticas] = useState(true);
  
  // Paginação fluida (múltiplos de 5: 10, 15 ou 20)
  const [itemsPerPage, setItemsPerPage] = useState(15);
  const [currentPage, setCurrentPage] = useState(1);

  // Modo de visualização: 'cards' ou 'lista'
  const [viewMode, setViewMode] = useState('cards');

  // Modais
  const [selectedCursistaDossie, setSelectedCursistaDossie] = useState(null);
  const [showFormNovaObs, setShowFormNovaObs] = useState(false);
  const [cursistaParaNovaObs, setCursistaParaNovaObs] = useState(null);

  // Histórico de 2024 carregado assincronamente sob demanda
  const [obs2024List, setObs2024List] = useState([]);
  const [loading2024, setLoading2024] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const dados2024 = await carregarObservacoes2024();
        if (mounted) {
          setObs2024List(dados2024 || []);
          setLoading2024(false);
        }
      } catch (e) {
        console.warn('Erro ao carregar dados de 2024 para cards:', e);
        if (mounted) setLoading2024(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  // Agrupamento indexado das observações por cursista (por e-mail e por nome normalizado)
  const { obsMapByEmail, obsMapByName } = useMemo(() => {
    const mapEmail = new Map();
    const mapName = new Map();

    // 1. Observações vigentes de 2026
    observacoes.forEach(obs => {
      const email = (obs.email_cursista || '').trim().toLowerCase();
      const nomeNorm = normalizeString(obs.nome_cursista || '');

      if (email) {
        if (!mapEmail.has(email)) mapEmail.set(email, []);
        mapEmail.get(email).push(obs);
      }
      if (nomeNorm) {
        if (!mapName.has(nomeNorm)) mapName.set(nomeNorm, []);
        mapName.get(nomeNorm).push(obs);
      }
    });

    // 2. Histórico de 2024
    obs2024List.forEach(obs => {
      const email = (obs.email_cursista || '').trim().toLowerCase();
      const nomeNorm = obs.nome_norm || normalizeString(obs.nome_cursista || '');

      if (email) {
        if (!mapEmail.has(email)) mapEmail.set(email, []);
        mapEmail.get(email).push(obs);
      }
      if (nomeNorm) {
        if (!mapName.has(nomeNorm)) mapName.set(nomeNorm, []);
        mapName.get(nomeNorm).push(obs);
      }
    });

    return { obsMapByEmail: mapEmail, obsMapByName: mapName };
  }, [observacoes, obs2024List]);

  // Lista enriquecida de Cursistas com suas trajetórias pedagógicas e deltas de evolução
  const cursistasComEvolucao = useMemo(() => {
    // Para desduplicar cursistas se vierem duplicados por turma
    const cursistasProcessados = new Map();

    cursistas.forEach(c => {
      const email = (c['e-mail'] || c.email || c.email_cursista || '').trim().toLowerCase();
      const cgm = String(c.cgm || '').trim();
      const nome = c.nome_cursista || c.nome || '';
      const nomeNorm = normalizeString(nome);

      const chaveUnica = cgm ? `cgm_${cgm}` : (email ? `email_${email}` : `nome_${nomeNorm}`);
      if (!chaveUnica || cursistasProcessados.has(chaveUnica)) return;

      // Busca observações associadas a este cursista
      const obsEncontradas = new Map();

      if (email && obsMapByEmail.has(email)) {
        obsMapByEmail.get(email).forEach(o => obsEncontradas.set(o.id || `${o.carimbo}_${o.semestre}`, o));
      }
      if (nomeNorm && obsMapByName.has(nomeNorm)) {
        obsMapByName.get(nomeNorm).forEach(o => obsEncontradas.set(o.id || `${o.carimbo}_${o.semestre}`, o));
      }

      const listaObs = Array.from(obsEncontradas.values());

      // Ordenar cronologicamente crescente para calcular evolução (mais antiga -> mais recente)
      const parseTimestamp = (o) => {
        const raw = o.data_pratica || o.data_observacao || o.data_feedback || o.carimbo || '';
        if (!raw) return 0;
        const d = new Date(raw);
        return isNaN(d.getTime()) ? 0 : d.getTime();
      };
      
      const ordenadasCrescente = [...listaObs].sort((a, b) => parseTimestamp(a) - parseTimestamp(b));
      const realizadas = ordenadasCrescente.filter(o => o.is_realizada ?? o.observacao_realizada?.toLowerCase().includes('sim'));

      // Análise dos anos com registros
      const has2024 = listaObs.some(o => String(o.ano_letivo || o.ano_formativo || o.id_origem || '').includes('2024'));
      const has2026 = listaObs.some(o => !String(o.ano_letivo || o.ano_formativo || o.id_origem || '').includes('2024'));

      // Trajetória da Prática Docente
      let nivelInicial = null;
      let nivelFinal = null;
      let delta = 0;
      let statusEvolucao = 'Aguardando Observação';
      let statusTipo = 'aguardando'; // 'positiva', 'supera4', 'estavel', 'regressao', 'inicial', 'aguardando'

      if (realizadas.length > 0) {
        // Encontra o primeiro score de prática válido
        for (let i = 0; i < realizadas.length; i++) {
          const sc = nivelToScore(realizadas[i].nivel_pratica);
          if (sc !== null) {
            nivelInicial = sc;
            break;
          }
        }

        // Encontra o último score de prática válido
        for (let i = realizadas.length - 1; i >= 0; i--) {
          const sc = nivelToScore(realizadas[i].nivel_pratica);
          if (sc !== null) {
            nivelFinal = sc;
            break;
          }
        }

        if (nivelInicial !== null && nivelFinal !== null) {
          delta = nivelFinal - nivelInicial;

          if (realizadas.length === 1) {
            statusEvolucao = '1ª Observação Realizada';
            statusTipo = 'inicial';
          } else if (delta > 0) {
            statusEvolucao = `Evolução Positiva (+${delta})`;
            statusTipo = 'positiva';
          } else if (nivelFinal === 4 && delta === 0) {
            statusEvolucao = 'Supera Nível 4';
            statusTipo = 'supera4';
          } else if (delta === 0) {
            statusEvolucao = 'Estável (0)';
            statusTipo = 'estavel';
          } else {
            statusEvolucao = `Atenção: Regressão (${delta})`;
            statusTipo = 'regressao';
          }
        }
      }

      cursistasProcessados.set(chaveUnica, {
        raw: c,
        chaveUnica,
        cgm: cgm || 'Não informado',
        nome: nome || 'Professor Cursista',
        iniciais: getInitials(nome),
        email: email || '',
        turma: c.turmas || c.turma || 'Sem Turma',
        componente: normalizeComponente(c.componente || 'Geral'),
        nre: c.nre_exe || c.nre_tutor || 'SEED-PR',
        formador: c.nome_formador || c.formador || 'Formador(a) SEED',
        totalObs: listaObs.length,
        totalRealizadas: realizadas.length,
        has2024,
        has2026,
        nivelInicial,
        nivelFinal,
        delta,
        statusEvolucao,
        statusTipo,
        todasObs: listaObs
      });
    });

    return Array.from(cursistasProcessados.values());
  }, [cursistas, obsMapByEmail, obsMapByName]);

  // Lista de componentes únicos para o select
  const componentesDisponiveis = useMemo(() => {
    const set = new Set();
    cursistasComEvolucao.forEach(c => {
      if (c.componente) set.add(c.componente);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'pt-BR'));
  }, [cursistasComEvolucao]);

  // Aplicação dos Filtros
  const cursistasFiltrados = useMemo(() => {
    return cursistasComEvolucao.filter(c => {
      // Busca textual por nome, CGM ou email
      if (searchTerm) {
        const termo = normalizeString(searchTerm);
        const matchNome = normalizeString(c.nome).includes(termo);
        const matchCgm = String(c.cgm).includes(termo);
        const matchEmail = c.email.toLowerCase().includes(termo.toLowerCase());
        if (!matchNome && !matchCgm && !matchEmail) return false;
      }

      // Filtro de Componente
      if (componenteFilter && c.componente !== componenteFilter) {
        return false;
      }

      // Filtro de Status de Evolução
      if (statusEvolucaoFilter && c.statusTipo !== statusEvolucaoFilter) {
        return false;
      }

      // Filtro por Ciclo / Histórico
      if (anoFiltro === 'com_2024' && !c.has2024) return false;
      if (anoFiltro === 'com_2026' && !c.has2026) return false;
      if (anoFiltro === 'ambos' && (!c.has2024 || !c.has2026)) return false;

      return true;
    });
  }, [cursistasComEvolucao, searchTerm, componenteFilter, statusEvolucaoFilter, anoFiltro]);

  // Ordenação dos Cursistas
  const cursistasOrdenados = useMemo(() => {
    const list = [...cursistasFiltrados];

    switch (ordenarPor) {
      case 'evolucao':
        return list.sort((a, b) => {
          if (b.delta !== a.delta) return b.delta - a.delta;
          return b.totalRealizadas - a.totalRealizadas;
        });
      case 'nome':
        return list.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
      case 'observacoes':
        return list.sort((a, b) => b.totalObs - a.totalObs);
      case 'nivel_final':
        return list.sort((a, b) => (b.nivelFinal || 0) - (a.nivelFinal || 0));
      default:
        return list;
    }
  }, [cursistasFiltrados, ordenarPor]);

  // Paginação
  const totalPaginas = Math.max(1, Math.ceil(cursistasOrdenados.length / itemsPerPage));
  const currentPageClamped = Math.min(Math.max(1, currentPage), totalPaginas);

  const cursistasPaginados = useMemo(() => {
    const start = (currentPageClamped - 1) * itemsPerPage;
    return cursistasOrdenados.slice(start, start + itemsPerPage);
  }, [cursistasOrdenados, currentPageClamped, itemsPerPage]);

  // Métricas Consolidadas do Cabeçalho (KPIs do Acompanhamento)
  const metricasGerais = useMemo(() => {
    const total = cursistasComEvolucao.length;
    const avaliados = cursistasComEvolucao.filter(c => c.totalRealizadas > 0);
    const evolucaoPositiva = cursistasComEvolucao.filter(c => c.statusTipo === 'positiva' || c.statusTipo === 'supera4');
    const nivel4 = cursistasComEvolucao.filter(c => c.nivelFinal === 4);
    const totalObsConsolidadas = cursistasComEvolucao.reduce((acc, c) => acc + c.totalObs, 0);

    return {
      totalCursistas: total,
      totalAvaliados: avaliados.length,
      taxaAvaliados: total > 0 ? Math.round((avaliados.length / total) * 100) : 0,
      totalEvolucaoPositiva: evolucaoPositiva.length,
      taxaEvolucaoPositiva: avaliados.length > 0 ? Math.round((evolucaoPositiva.length / avaliados.length) * 100) : 0,
      totalNivel4: nivel4.length,
      totalObsConsolidadas
    };
  }, [cursistasComEvolucao]);

  // Resumo Geral e Estatísticas Analíticas da Rede
  const resumoEstatistico = useMemo(() => {
    return gerarResumoRedeEstatistico(cursistasComEvolucao);
  }, [cursistasComEvolucao]);

  return (
    <div className="section-container animate-fade-in">
      {/* HEADER INSTITUCIONAL COM PALETA SEED/PR */}
      <div 
        className="glass-panel" 
        style={{
          padding: '1.5rem',
          marginBottom: '1.5rem',
          borderLeft: '5px solid var(--color-accent-green)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
          background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)'
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.3rem', flexWrap: 'wrap' }}>
            <span className="logo-badge" style={{ backgroundColor: 'var(--color-primary-dark)', color: '#ffffff', fontWeight: 800 }}>
              SEED/PR • Estágio Probatório
            </span>
            {loading2024 && (
              <span style={{ fontSize: '0.75rem', color: '#0284c7', fontWeight: 600 }}>
                ⏳ Carregando base histórica de 2024...
              </span>
            )}
          </div>

          <h2 style={{ fontSize: '1.45rem', color: 'var(--color-primary-dark)', margin: 0, fontWeight: 800 }}>
            🗂️ Acompanhamento Individual de Observação do Cursista
          </h2>

          <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.88rem', color: 'var(--color-text-muted)' }}>
            Consulte a evolução pedagógica de cada professor cursista desde 2024. Clique no cartão para visualizar o dossiê detalhado, curvas de progressão e registrar novas observações.
          </p>
        </div>
      </div>

      {/* TOP KPI CARDS (RESUMO EXECUTIVO) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        {/* KPI 1 */}
        <div className="glass-panel" style={{ padding: '1.1rem', borderRadius: '12px', borderTop: '4px solid #001d3d' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
            Professores Cadastrados
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#001d3d', margin: '0.2rem 0' }}>
            {metricasGerais.totalCursistas}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
            {metricasGerais.totalAvaliados} com observações registradas ({metricasGerais.taxaAvaliados}%)
          </div>
        </div>

        {/* KPI 2 */}
        <div className="glass-panel" style={{ padding: '1.1rem', borderRadius: '12px', borderTop: '4px solid #00984a' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
            Evolução Pedagógica Positiva
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#00984a', margin: '0.2rem 0' }}>
            {metricasGerais.taxaEvolucaoPositiva}%
          </div>
          <div style={{ fontSize: '0.75rem', color: '#166534', fontWeight: 600 }}>
            {metricasGerais.totalEvolucaoPositiva} professores avançaram de nível
          </div>
        </div>

        {/* KPI 3 */}
        <div className="glass-panel" style={{ padding: '1.1rem', borderRadius: '12px', borderTop: '4px solid #0072bc' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
            Nível Supera (Nível 4)
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#0072bc', margin: '0.2rem 0' }}>
            {metricasGerais.totalNivel4}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
            Professores com desempenho consolidado
          </div>
        </div>

        {/* KPI 4 */}
        <div className="glass-panel" style={{ padding: '1.1rem', borderRadius: '12px', borderTop: '4px solid #d97706' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
            Histórico Consolidado
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#b45309', margin: '0.2rem 0' }}>
            {metricasGerais.totalObsConsolidadas}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
            Total de observações desde 2024
          </div>
        </div>
      </div>

      {/* PAINEL DE RESUMO GERAL ANALÍTICO E GRÁFICOS ESTATÍSTICOS DA REDE */}
      <div 
        className="glass-panel" 
        style={{
          padding: '1.25rem 1.5rem',
          marginBottom: '1.5rem',
          borderRadius: '12px',
          borderTop: '4px solid #0072bc',
          background: '#ffffff',
          boxShadow: '0 4px 14px rgba(0, 29, 61, 0.06)'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: showEstatisticas ? '1.25rem' : '0', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <span style={{ fontSize: '1.35rem' }}>📊</span>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#002d5c' }}>
                Resumo Geral e Indicadores Estatísticos da Rede
              </h3>
              <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
                Visão consolidada da evolução pedagógica dos professores cursistas da SEED-PR
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowEstatisticas(prev => !prev)}
            style={{
              background: 'rgba(0, 114, 188, 0.08)',
              border: '1px solid rgba(0, 114, 188, 0.2)',
              color: '#0072bc',
              borderRadius: '6px',
              padding: '0.35rem 0.75rem',
              fontSize: '0.8rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem'
            }}
          >
            {showEstatisticas ? '▲ Ocultar Estatísticas' : '▼ Expandir Gráficos Estatísticos'}
          </button>
        </div>

        {showEstatisticas && (
          <div>
            {/* Síntese Executiva Estatística */}
            <div style={{
              backgroundColor: '#eff6ff',
              borderLeft: '4px solid #0072bc',
              padding: '0.85rem 1rem',
              borderRadius: '8px',
              marginBottom: '1.25rem',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '0.65rem'
            }}>
              <span style={{ fontSize: '1.25rem', flexShrink: 0 }}>📊</span>
              <div>
                <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#1d4ed8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  {userRole === 'formador' ? 'Síntese Estatística da Turma:' : 'Síntese Estatística da Rede:'}
                </span>
                <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.88rem', color: '#1e3a8a', lineHeight: 1.5, fontWeight: 500 }}>
                  {resumoEstatistico.sinteseRede}
                </p>
              </div>
            </div>

            {/* Grade de Gráficos Estatísticos Nativos (3 Colunas) */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(310px, 1fr))', gap: '1.25rem' }}>
              
              {/* Gráfico 1: Distribuição por Nível Pedagógico */}
              <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#0f172a', textTransform: 'uppercase' }}>
                    📈 Níveis da Prática Docente
                  </span>
                  <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                    {resumoEstatistico.totalAvaliados} avaliados
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                  {resumoEstatistico.distribuicaoNiveis.map((item, idx) => (
                    <div key={idx}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', marginBottom: '0.2rem' }}>
                        <span style={{ fontWeight: 600, color: '#334155' }}>{item.nivel}</span>
                        <span style={{ fontWeight: 800, color: item.cor }}>{item.total} ({item.pct}%)</span>
                      </div>
                      <div style={{ width: '100%', height: '8px', backgroundColor: '#e2e8f0', borderRadius: '999px', overflow: 'hidden' }}>
                        <div style={{ width: `${item.pct}%`, height: '100%', backgroundColor: item.cor, borderRadius: '999px', transition: 'width 0.4s ease' }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Gráfico 2: Trajetória da Rede */}
              <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#0f172a', textTransform: 'uppercase' }}>
                    🎯 Trajetória e Evolução
                  </span>
                  <span style={{ fontSize: '0.75rem', color: '#00984a', fontWeight: 700 }}>
                    {resumoEstatistico.taxaEvolucao}% evoluíram
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                  {resumoEstatistico.trajetorias.map((item, idx) => (
                    <div key={idx}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', marginBottom: '0.2rem' }}>
                        <span style={{ fontWeight: 600, color: '#334155' }}>{item.status}</span>
                        <span style={{ fontWeight: 800, color: item.cor }}>{item.total} ({item.pct}%)</span>
                      </div>
                      <div style={{ width: '100%', height: '8px', backgroundColor: '#e2e8f0', borderRadius: '999px', overflow: 'hidden' }}>
                        <div style={{ width: `${item.pct}%`, height: '100%', backgroundColor: item.cor, borderRadius: '999px', transition: 'width 0.4s ease' }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Gráfico 3: Para Formador -> Top 5 Cursistas em Evolução / Para Admin Geral -> Principais Componentes */}
              {userRole === 'formador' || (resumoEstatistico.topComponentes.length <= 1) ? (
                <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                    <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#0f172a', textTransform: 'uppercase' }}>
                      🏆 Top 5 Cursistas em Evolução
                    </span>
                    <span style={{ fontSize: '0.75rem', color: '#00984a', fontWeight: 700 }}>
                      Maior Progresso (Δ)
                    </span>
                  </div>

                  {(!resumoEstatistico.top5Evolucao || resumoEstatistico.top5Evolucao.length === 0) ? (
                    <div style={{ fontSize: '0.8rem', color: '#64748b', textAlign: 'center', padding: '1.5rem 0' }}>
                      Aguardando observações com notas avaliativas na turma.
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {resumoEstatistico.top5Evolucao.map((c, idx) => (
                        <div 
                          key={idx}
                          onClick={() => c.raw && setSelectedCursistaDossie(c.raw)}
                          style={{
                            cursor: 'pointer',
                            padding: '0.4rem 0.6rem',
                            borderRadius: '6px',
                            backgroundColor: '#ffffff',
                            border: '1px solid #e2e8f0',
                            transition: 'all 0.15s ease'
                          }}
                          onMouseEnter={e => {
                            e.currentTarget.style.backgroundColor = '#eff6ff';
                            e.currentTarget.style.borderColor = '#93c5fd';
                          }}
                          onMouseLeave={e => {
                            e.currentTarget.style.backgroundColor = '#ffffff';
                            e.currentTarget.style.borderColor = '#e2e8f0';
                          }}
                          title={`Clique para abrir o Dossiê de ${c.nome}`}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', marginBottom: '0.2rem' }}>
                            <span style={{ fontWeight: 700, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '175px' }}>
                              <b>{idx + 1}.</b> {c.nome}
                            </span>
                            <span style={{ 
                              fontWeight: 800, 
                              fontSize: '0.72rem', 
                              color: c.delta > 0 ? '#166534' : '#0369a1', 
                              backgroundColor: c.delta > 0 ? '#dcfce7' : '#e0f2fe', 
                              padding: '0.1rem 0.45rem', 
                              borderRadius: '4px' 
                            }}>
                              {c.delta > 0 ? `+${c.delta} nível(is)` : `Nível ${c.nivelFinal}`}
                            </span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: '#64748b' }}>
                            <span>Nível {c.nivelInicial} ➔ <b>Nível {c.nivelFinal}</b></span>
                            <span>{c.totalObs} obs. concluídas</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                /* Gráfico 3: Cobertura por Componente Curricular (Visão Geral de Rede) */
                <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                    <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#0f172a', textTransform: 'uppercase' }}>
                      📚 Principais Componentes
                    </span>
                    <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                      Top 6 em docentes
                    </span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                    {resumoEstatistico.topComponentes.map((item, idx) => {
                      const maxComp = resumoEstatistico.topComponentes[0]?.total || 1;
                      const pctBar = Math.round((item.total / maxComp) * 100);
                      return (
                        <div key={idx}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', marginBottom: '0.2rem' }}>
                            <span style={{ fontWeight: 600, color: '#334155' }}>{item.nome}</span>
                            <span style={{ fontWeight: 800, color: '#0072bc' }}>{item.total} docentes</span>
                          </div>
                          <div style={{ width: '100%', height: '8px', backgroundColor: '#e2e8f0', borderRadius: '999px', overflow: 'hidden' }}>
                            <div style={{ width: `${pctBar}%`, height: '100%', backgroundColor: '#0072bc', borderRadius: '999px', transition: 'width 0.4s ease' }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

            </div>
          </div>
        )}
      </div>

      {/* PAINEL DE CONTROLES: FILTROS E BUSCA */}
      <div 
        className="glass-panel" 
        style={{
          padding: '1.25rem',
          marginBottom: '1.5rem',
          borderRadius: '12px',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem'
        }}
      >
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.85rem' }}>
          {/* Busca por Nome/CGM */}
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#334155', marginBottom: '0.3rem' }}>
              🔍 Buscar Cursista / CGM:
            </label>
            <input
              type="text"
              placeholder="Digite o nome, CGM ou e-mail..."
              value={searchTerm}
              onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              style={{
                width: '100%',
                padding: '0.55rem 0.75rem',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '0.85rem',
                outline: 'none'
              }}
            />
          </div>

          {/* Filtro Componente */}
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#334155', marginBottom: '0.3rem' }}>
              📚 Componente Curricular:
            </label>
            <select
              value={componenteFilter}
              onChange={e => { setComponenteFilter(e.target.value); setCurrentPage(1); }}
              style={{
                width: '100%',
                padding: '0.55rem 0.75rem',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '0.85rem',
                backgroundColor: '#ffffff'
              }}
            >
              <option value="">Todos os Componentes</option>
              {componentesDisponiveis.map(comp => (
                <option key={comp} value={comp}>{comp}</option>
              ))}
            </select>
          </div>

          {/* Filtro Status de Evolução */}
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#334155', marginBottom: '0.3rem' }}>
              📈 Trajetória / Status:
            </label>
            <select
              value={statusEvolucaoFilter}
              onChange={e => { setStatusEvolucaoFilter(e.target.value); setCurrentPage(1); }}
              style={{
                width: '100%',
                padding: '0.55rem 0.75rem',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '0.85rem',
                backgroundColor: '#ffffff'
              }}
            >
              <option value="">Todos os Status</option>
              <option value="positiva">📈 Evolução Positiva (+Δ)</option>
              <option value="supera4">⭐ Supera Nível 4</option>
              <option value="estavel">➡️ Estável (0)</option>
              <option value="regressao">⚠️ Atenção: Regressão (-Δ)</option>
              <option value="inicial">🔍 1ª Observação</option>
              <option value="aguardando">⏳ Aguardando Observação</option>
            </select>
          </div>

          {/* Filtro de Ciclo/Histórico */}
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#334155', marginBottom: '0.3rem' }}>
              🗓️ Base Histórica:
            </label>
            <select
              value={anoFiltro}
              onChange={e => { setAnoFiltro(e.target.value); setCurrentPage(1); }}
              style={{
                width: '100%',
                padding: '0.55rem 0.75rem',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '0.85rem',
                backgroundColor: '#ffffff'
              }}
            >
              <option value="">Todas as Bases</option>
              <option value="com_2024">Com Histórico de 2024</option>
              <option value="com_2026">Com Observação em 2026</option>
              <option value="ambos">Histórico Completo (2024 e 2026)</option>
            </select>
          </div>

          {/* Ordenação */}
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#334155', marginBottom: '0.3rem' }}>
              ↕️ Ordenar por:
            </label>
            <select
              value={ordenarPor}
              onChange={e => { setOrdenarPor(e.target.value); setCurrentPage(1); }}
              style={{
                width: '100%',
                padding: '0.55rem 0.75rem',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '0.85rem',
                backgroundColor: '#ffffff',
                fontWeight: 600
              }}
            >
              <option value="evolucao">Maior Evolução Pedagógica (Δ)</option>
              <option value="nome">Nome Alfabético (A-Z)</option>
              <option value="observacoes">Total de Observações</option>
              <option value="nivel_final">Nível Atual (Maior para Menor)</option>
            </select>
          </div>
        </div>

        {/* Resumo da Contagem de Registros e Controles de Visualização / Paginação */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.82rem', color: '#64748b', borderTop: '1px solid #e2e8f0', paddingTop: '0.75rem', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div>
            Exibindo <b>{cursistasPaginados.length}</b> de <b>{cursistasFiltrados.length}</b> professores filtrados (Total Geral: {cursistasComEvolucao.length})
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            {/* Seletor de Modo de Visualização: Cards vs Lista */}
            <div style={{ display: 'flex', borderRadius: '8px', border: '1px solid #cbd5e1', overflow: 'hidden' }}>
              <button
                type="button"
                onClick={() => setViewMode('cards')}
                style={{
                  padding: '0.35rem 0.75rem',
                  border: 'none',
                  backgroundColor: viewMode === 'cards' ? '#0072bc' : '#ffffff',
                  color: viewMode === 'cards' ? '#ffffff' : '#475569',
                  fontWeight: 700,
                  fontSize: '0.78rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.3rem',
                  transition: 'all 0.15s ease'
                }}
              >
                🗂️ Cards (5 por linha)
              </button>
              <button
                type="button"
                onClick={() => setViewMode('lista')}
                style={{
                  padding: '0.35rem 0.75rem',
                  border: 'none',
                  borderLeft: '1px solid #cbd5e1',
                  backgroundColor: viewMode === 'lista' ? '#0072bc' : '#ffffff',
                  color: viewMode === 'lista' ? '#ffffff' : '#475569',
                  fontWeight: 700,
                  fontSize: '0.78rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.3rem',
                  transition: 'all 0.15s ease'
                }}
              >
                📋 Visão Lista
              </button>
            </div>

            {/* Seletor de Itens por Página: 10, 15 ou 20 */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#475569' }}>Exibir:</span>
              <select
                value={itemsPerPage}
                onChange={e => {
                  setItemsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                style={{
                  padding: '0.3rem 0.55rem',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  backgroundColor: '#ffffff',
                  color: '#0f172a',
                  cursor: 'pointer'
                }}
              >
                <option value={10}>10 por página (2 linhas)</option>
                <option value={15}>15 por página (3 linhas)</option>
                <option value={20}>20 por página (4 linhas)</option>
              </select>
            </div>

            {(searchTerm || componenteFilter || statusEvolucaoFilter || anoFiltro) && (
              <button
                type="button"
                onClick={() => {
                  setSearchTerm('');
                  setComponenteFilter('');
                  setStatusEvolucaoFilter('');
                  setAnoFiltro('');
                  setCurrentPage(1);
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#0072bc',
                  fontWeight: 700,
                  cursor: 'pointer',
                  fontSize: '0.8rem'
                }}
              >
                ✕ Limpar Filtros
              </button>
            )}
          </div>
        </div>
      </div>

      {/* GRID DE CARDS (MODELO 3 - 3 COLUNAS) */}
      {cursistasPaginados.length === 0 ? (
        <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center', borderRadius: '12px' }}>
          <span style={{ fontSize: '2.5rem', display: 'block', marginBottom: '0.75rem' }}>🔍</span>
          <h3 style={{ color: '#0f172a', margin: '0 0 0.5rem 0' }}>Nenhum cursista encontrado</h3>
          <p style={{ color: '#64748b', margin: 0, fontSize: '0.9rem' }}>
            Tente ajustar os termos de busca ou remover os filtros aplicados.
          </p>
        </div>
      ) : viewMode === 'lista' ? (
        /* VISÃO LISTA (TABELA FORMATIVA) */
        <div 
          className="glass-panel animate-fade-in" 
          style={{ 
            padding: '1rem', 
            borderRadius: '14px', 
            marginBottom: '1.75rem', 
            backgroundColor: '#ffffff', 
            overflowX: 'auto', 
            border: '1px solid #e2e8f0', 
            boxShadow: '0 2px 8px rgba(0, 29, 61, 0.05)' 
          }}
        >
          <table className="custom-table" style={{ width: '100%', minWidth: '920px', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #e2e8f0', backgroundColor: '#f8fafc' }}>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.78rem', fontWeight: 800, color: '#334155', textTransform: 'uppercase' }}>Docente Cursista</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.78rem', fontWeight: 800, color: '#334155', textTransform: 'uppercase' }}>Componente & Turma</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.78rem', fontWeight: 800, color: '#334155', textTransform: 'uppercase' }}>Trajetória Pedagógica</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.78rem', fontWeight: 800, color: '#334155', textTransform: 'uppercase' }}>Prática Docente</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'center', fontSize: '0.78rem', fontWeight: 800, color: '#334155', textTransform: 'uppercase' }}>Observações</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'center', fontSize: '0.78rem', fontWeight: 800, color: '#334155', textTransform: 'uppercase' }}>Ciclos</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'center', fontSize: '0.78rem', fontWeight: 800, color: '#334155', textTransform: 'uppercase' }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {cursistasPaginados.map((item) => {
                let pillBg = '#f1f5f9';
                let pillColor = '#475569';
                let pillBorder = '#cbd5e1';
                let pillIcon = '➡️';

                if (item.statusTipo === 'positiva') {
                  pillBg = '#dcfce7';
                  pillColor = '#166534';
                  pillBorder = '#bbf7d0';
                  pillIcon = '📈';
                } else if (item.statusTipo === 'supera4') {
                  pillBg = '#e0f2fe';
                  pillColor = '#0369a1';
                  pillBorder = '#bae6fd';
                  pillIcon = '⭐';
                } else if (item.statusTipo === 'regressao') {
                  pillBg = '#fee2e2';
                  pillColor = '#991b1b';
                  pillBorder = '#fecaca';
                  pillIcon = '⚠️';
                } else if (item.statusTipo === 'inicial') {
                  pillBg = '#ede9fe';
                  pillColor = '#6d28d9';
                  pillBorder = '#ddd6fe';
                  pillIcon = '🔍';
                } else if (item.statusTipo === 'aguardando') {
                  pillBg = '#f8fafc';
                  pillColor = '#64748b';
                  pillBorder = '#e2e8f0';
                  pillIcon = '⏳';
                }

                return (
                  <tr key={item.chaveUnica} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{
                          width: '38px',
                          height: '38px',
                          borderRadius: '50%',
                          background: 'linear-gradient(135deg, #001d3d 0%, #0072bc 100%)',
                          color: '#ffffff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 800,
                          fontSize: '0.88rem',
                          flexShrink: 0
                        }}>
                          {item.iniciais}
                        </div>
                        <div>
                          <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '0.9rem' }}>{item.nome}</div>
                          <div style={{ fontSize: '0.75rem', color: '#64748b' }}>CGM: {item.cgm} • {item.email}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <div style={{ fontWeight: 700, color: '#0072bc', fontSize: '0.85rem' }}>{item.componente}</div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={item.turma}>
                        🏫 {item.turma}
                      </div>
                    </td>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        fontSize: '0.78rem',
                        fontWeight: 800,
                        padding: '0.25rem 0.55rem',
                        borderRadius: '6px',
                        backgroundColor: pillBg,
                        color: pillColor,
                        border: `1px solid ${pillBorder}`
                      }}>
                        {pillIcon} {item.statusEvolucao}
                      </span>
                    </td>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#334155' }}>
                        {item.nivelInicial ? `Nível ${item.nivelInicial}` : '-'} ➔ <b>{item.nivelFinal ? `Nível ${item.nivelFinal}` : '-'}</b>
                      </div>
                    </td>
                    <td style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>
                      <span style={{ fontWeight: 800, color: item.totalRealizadas > 0 ? '#00984a' : '#64748b', fontSize: '0.85rem' }}>
                        {item.totalRealizadas} de {item.totalObs}
                      </span>
                    </td>
                    <td style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>
                      <div style={{ display: 'inline-flex', gap: '0.25rem' }}>
                        {item.has2024 && (
                          <span style={{ backgroundColor: '#fef3c7', color: '#92400e', padding: '0.15rem 0.4rem', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 700, border: '1px solid #fde68a' }}>
                            2024
                          </span>
                        )}
                        {item.has2026 && (
                          <span style={{ backgroundColor: '#e0e7ff', color: '#3730a3', padding: '0.15rem 0.4rem', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 700, border: '1px solid #c7d2fe' }}>
                            2026
                          </span>
                        )}
                        {!item.has2024 && !item.has2026 && (
                          <span style={{ backgroundColor: '#f1f5f9', color: '#64748b', padding: '0.15rem 0.4rem', borderRadius: '4px', fontSize: '0.7rem' }}>
                            -
                          </span>
                        )}
                      </div>
                    </td>
                    <td style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>
                      <div style={{ display: 'inline-flex', gap: '0.4rem', alignItems: 'center' }}>
                        <button
                          type="button"
                          onClick={() => setSelectedCursistaDossie(item.raw)}
                          style={{
                            backgroundColor: '#0072bc',
                            color: '#ffffff',
                            border: 'none',
                            borderRadius: '6px',
                            padding: '0.45rem 0.8rem',
                            fontWeight: 700,
                            fontSize: '0.78rem',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.3rem',
                            transition: 'all 0.15s ease'
                          }}
                          onMouseEnter={e => e.currentTarget.style.backgroundColor = '#005a96'}
                          onMouseLeave={e => e.currentTarget.style.backgroundColor = '#0072bc'}
                        >
                          <span>🔍</span> Dossiê
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setCursistaParaNovaObs(item.raw);
                            setShowFormNovaObs(true);
                          }}
                          style={{
                            backgroundColor: 'rgba(0, 152, 74, 0.12)',
                            color: '#00984a',
                            border: '1px solid rgba(0, 152, 74, 0.25)',
                            borderRadius: '6px',
                            width: '32px',
                            height: '32px',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '0.9rem',
                            fontWeight: 800,
                            transition: 'all 0.15s ease'
                          }}
                          title="Inserir Nova Observação"
                          onMouseEnter={e => {
                            e.currentTarget.style.backgroundColor = '#00984a';
                            e.currentTarget.style.color = '#ffffff';
                          }}
                          onMouseLeave={e => {
                            e.currentTarget.style.backgroundColor = 'rgba(0, 152, 74, 0.12)';
                            e.currentTarget.style.color = '#00984a';
                          }}
                        >
                          ➕
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="cards-grid-5cols animate-fade-in">
          {cursistasPaginados.map((item) => {
            // Estilos da Pílula de Evolução
            let pillBg = '#f1f5f9';
            let pillColor = '#475569';
            let pillBorder = '#cbd5e1';
            let pillIcon = '➡️';

            if (item.statusTipo === 'positiva') {
              pillBg = '#dcfce7';
              pillColor = '#166534';
              pillBorder = '#bbf7d0';
              pillIcon = '📈';
            } else if (item.statusTipo === 'supera4') {
              pillBg = '#e0f2fe';
              pillColor = '#0369a1';
              pillBorder = '#bae6fd';
              pillIcon = '⭐';
            } else if (item.statusTipo === 'regressao') {
              pillBg = '#fee2e2';
              pillColor = '#991b1b';
              pillBorder = '#fecaca';
              pillIcon = '⚠️';
            } else if (item.statusTipo === 'inicial') {
              pillBg = '#ede9fe';
              pillColor = '#6d28d9';
              pillBorder = '#ddd6fe';
              pillIcon = '🔍';
            } else if (item.statusTipo === 'aguardando') {
              pillBg = '#f8fafc';
              pillColor = '#64748b';
              pillBorder = '#e2e8f0';
              pillIcon = '⏳';
            }

            return (
              <div
                key={item.chaveUnica}
                style={{
                  background: '#ffffff',
                  borderRadius: '14px',
                  border: '1px solid #e2e8f0',
                  boxShadow: '0 2px 8px rgba(0, 29, 61, 0.05)',
                  borderTop: '4px solid #0072bc',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  padding: '1.25rem',
                  transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                  position: 'relative',
                  overflow: 'hidden'
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.transform = 'translateY(-3px)';
                  e.currentTarget.style.boxShadow = '0 8px 20px rgba(0, 114, 188, 0.15)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 29, 61, 0.05)';
                }}
              >
                <div>
                  {/* CABEÇALHO DO CARD: AVATAR + NOME */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.85rem', marginBottom: '0.85rem' }}>
                    <div 
                      style={{
                        width: '46px',
                        height: '46px',
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, #001d3d 0%, #0072bc 100%)',
                        color: '#ffffff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 800,
                        fontSize: '1.1rem',
                        flexShrink: 0,
                        boxShadow: '0 2px 8px rgba(0, 114, 188, 0.25)'
                      }}
                    >
                      {item.iniciais}
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div 
                        style={{
                          fontSize: '1rem',
                          fontWeight: 800,
                          color: '#0f172a',
                          lineHeight: 1.25,
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis'
                        }}
                        title={item.nome}
                      >
                        {item.nome}
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.3rem', flexWrap: 'wrap' }}>
                        <span 
                          style={{
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            color: '#0072bc',
                            backgroundColor: '#eff6ff',
                            padding: '0.15rem 0.5rem',
                            borderRadius: '4px',
                            border: '1px solid #dbeafe'
                          }}
                        >
                          {item.componente}
                        </span>

                        <span style={{ fontSize: '0.7rem', color: '#64748b' }}>
                          CGM: {item.cgm}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* PÍLULA DE EVOLUÇÃO DOCENTE */}
                  <div 
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      fontSize: '0.8rem',
                      fontWeight: 800,
                      padding: '0.35rem 0.65rem',
                      borderRadius: '6px',
                      backgroundColor: pillBg,
                      color: pillColor,
                      border: `1px solid ${pillBorder}`,
                      marginBottom: '0.75rem'
                    }}
                  >
                    <span>{pillIcon}</span>
                    <span>{item.statusEvolucao}</span>
                  </div>

                  {/* METRICAS DE TRAJETÓRIA */}
                  <div style={{ background: '#f8fafc', padding: '0.75rem', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '0.85rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.82rem', marginBottom: '0.3rem' }}>
                      <span style={{ color: '#64748b', fontWeight: 600 }}>Trajetória da Prática:</span>
                      <span style={{ fontWeight: 800, color: '#0f172a' }}>
                        {item.nivelInicial ? `Nível ${item.nivelInicial}` : '-'} ➔ <b>{item.nivelFinal ? `Nível ${item.nivelFinal}` : '-'}</b>
                      </span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.78rem', color: '#64748b' }}>
                      <span>Observações Concluídas:</span>
                      <span style={{ fontWeight: 700, color: item.totalRealizadas > 0 ? '#00984a' : '#64748b' }}>
                        {item.totalRealizadas} de {item.totalObs}
                      </span>
                    </div>
                  </div>

                  {/* BADGES HISTÓRICAS E TURMA */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.4rem' }}>
                    <div style={{ display: 'flex', gap: '0.35rem' }}>
                      {item.has2024 && (
                        <span style={{ backgroundColor: '#fef3c7', color: '#92400e', padding: '0.15rem 0.45rem', borderRadius: '4px', fontWeight: 700, border: '1px solid #fde68a' }}>
                          🗓️ 2024
                        </span>
                      )}
                      {item.has2026 && (
                        <span style={{ backgroundColor: '#e0e7ff', color: '#3730a3', padding: '0.15rem 0.45rem', borderRadius: '4px', fontWeight: 700, border: '1px solid #c7d2fe' }}>
                          🗓️ 2026
                        </span>
                      )}
                      {!item.has2024 && !item.has2026 && (
                        <span style={{ backgroundColor: '#f1f5f9', color: '#64748b', padding: '0.15rem 0.45rem', borderRadius: '4px', fontWeight: 600 }}>
                          Sem registros
                        </span>
                      )}
                    </div>

                    <div style={{ color: '#64748b', fontStyle: 'italic', maxWidth: '170px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={item.turma}>
                      🏫 {item.turma}
                    </div>
                  </div>
                </div>

                {/* BOTÕES DE AÇÃO DO CARD */}
                <div style={{ display: 'flex', gap: '0.5rem', borderTop: '1px solid #f1f5f9', paddingTop: '0.85rem' }}>
                  <button
                    type="button"
                    onClick={() => setSelectedCursistaDossie(item.raw)}
                    style={{
                      flex: 1,
                      backgroundColor: '#0072bc',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '0.6rem 0.85rem',
                      fontWeight: 700,
                      fontSize: '0.82rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.4rem',
                      transition: 'background-color 0.15s ease'
                    }}
                    onMouseEnter={e => e.currentTarget.style.backgroundColor = '#005a96'}
                    onMouseLeave={e => e.currentTarget.style.backgroundColor = '#0072bc'}
                  >
                    <span>🔍</span>
                    <span>Ver Dossiê e Evolução ➔</span>
                  </button>

                  <button
                    type="button"
                    title="Inserir Nova Observação para este professor"
                    onClick={() => {
                      setCursistaParaNovaObs(item.raw);
                      setShowFormNovaObs(true);
                    }}
                    style={{
                      backgroundColor: 'rgba(0, 152, 74, 0.12)',
                      color: '#00984a',
                      border: '1px solid rgba(0, 152, 74, 0.25)',
                      borderRadius: '8px',
                      width: '38px',
                      height: '38px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '1rem',
                      fontWeight: 800,
                      transition: 'all 0.15s ease'
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.backgroundColor = '#00984a';
                      e.currentTarget.style.color = '#ffffff';
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.backgroundColor = 'rgba(0, 152, 74, 0.12)';
                      e.currentTarget.style.color = '#00984a';
                    }}
                  >
                    ➕
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* CONTROLE DE PAGINAÇÃO */}
      {totalPaginas > 1 && (
        <div 
          className="glass-panel" 
          style={{
            padding: '1rem',
            borderRadius: '12px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '1rem'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600 }}>Exibir:</span>
              <select
                value={itemsPerPage}
                onChange={e => {
                  setItemsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                style={{
                  padding: '0.25rem 0.5rem',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  backgroundColor: '#ffffff'
                }}
              >
                <option value={10}>10 por página (2 linhas)</option>
                <option value={15}>15 por página (3 linhas)</option>
                <option value={20}>20 por página (4 linhas)</option>
              </select>
            </div>
            <div style={{ fontSize: '0.82rem', color: '#64748b' }}>
              Página <b>{currentPageClamped}</b> de <b>{totalPaginas}</b> ({cursistasFiltrados.length} professores)
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
            <button
              type="button"
              disabled={currentPageClamped === 1}
              onClick={() => setCurrentPage(1)}
              style={{
                padding: '0.4rem 0.75rem',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                backgroundColor: currentPageClamped === 1 ? '#f1f5f9' : '#ffffff',
                color: currentPageClamped === 1 ? '#94a3b8' : '#334155',
                cursor: currentPageClamped === 1 ? 'not-allowed' : 'pointer',
                fontSize: '0.8rem',
                fontWeight: 600
              }}
            >
              « Primeira
            </button>

            <button
              type="button"
              disabled={currentPageClamped === 1}
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              style={{
                padding: '0.4rem 0.75rem',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                backgroundColor: currentPageClamped === 1 ? '#f1f5f9' : '#ffffff',
                color: currentPageClamped === 1 ? '#94a3b8' : '#334155',
                cursor: currentPageClamped === 1 ? 'not-allowed' : 'pointer',
                fontSize: '0.8rem',
                fontWeight: 600
              }}
            >
              ‹ Anterior
            </button>

            <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#002d5c', padding: '0 0.5rem' }}>
              {currentPageClamped}
            </span>

            <button
              type="button"
              disabled={currentPageClamped === totalPaginas}
              onClick={() => setCurrentPage(prev => Math.min(totalPaginas, prev + 1))}
              style={{
                padding: '0.4rem 0.75rem',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                backgroundColor: currentPageClamped === totalPaginas ? '#f1f5f9' : '#ffffff',
                color: currentPageClamped === totalPaginas ? '#94a3b8' : '#334155',
                cursor: currentPageClamped === totalPaginas ? 'not-allowed' : 'pointer',
                fontSize: '0.8rem',
                fontWeight: 600
              }}
            >
              Próxima ›
            </button>

            <button
              type="button"
              disabled={currentPageClamped === totalPaginas}
              onClick={() => setCurrentPage(totalPaginas)}
              style={{
                padding: '0.4rem 0.75rem',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                backgroundColor: currentPageClamped === totalPaginas ? '#f1f5f9' : '#ffffff',
                color: currentPageClamped === totalPaginas ? '#94a3b8' : '#334155',
                cursor: currentPageClamped === totalPaginas ? 'not-allowed' : 'pointer',
                fontSize: '0.8rem',
                fontWeight: 600
              }}
            >
              Última »
            </button>
          </div>
        </div>
      )}

      {/* MODAL DO DOSSIÊ DO CURSISTA (HISTÓRICO CONSOLIDADO 2024-2026 + GRÁFICO + OBSERVAÇÕES) */}
      {selectedCursistaDossie && (
        <DossieCursistaModal
          cursista={selectedCursistaDossie}
          turmaInfo={{
            turma: selectedCursistaDossie.turmas || selectedCursistaDossie.turma,
            formador: selectedCursistaDossie.nome_formador || selectedCursistaDossie.formador,
            componente: selectedCursistaDossie.componente,
            anoFormativo: selectedCursistaDossie.ano_formativo || '1º ANO'
          }}
          observacoes={observacoes}
          onClose={() => setSelectedCursistaDossie(null)}
          onSaveObservacao={async (novaObs) => {
            if (onNovaObservacao) {
              await onNovaObservacao(novaObs);
            }
          }}
        />
      )}

      {/* MODAL PARA INSERIR NOVA OBSERVAÇÃO */}
      {showFormNovaObs && (
        <FormularioInserirObservacao
          cursistaPreSelecionado={cursistaParaNovaObs}
          turmaInfoPreSelecionada={{
            turma: cursistaParaNovaObs?.turmas || cursistaParaNovaObs?.turma,
            formador: cursistaParaNovaObs?.nome_formador || cursistaParaNovaObs?.formador,
            componente: cursistaParaNovaObs?.componente,
            anoFormativo: cursistaParaNovaObs?.ano_formativo || '1º ANO'
          }}
          onClose={() => {
            setShowFormNovaObs(false);
            setCursistaParaNovaObs(null);
          }}
          onSuccess={async (novaObs) => {
            if (onNovaObservacao) {
              await onNovaObservacao(novaObs);
            }
            setShowFormNovaObs(false);
            setCursistaParaNovaObs(null);
          }}
        />
      )}
    </div>
  );
}
