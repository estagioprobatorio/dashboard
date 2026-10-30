import React, { useState, useMemo, useEffect } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Legend,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
} from 'recharts';
import {
  MOCK_TUTOR_OBSERVATIONS,
  getTutorObservacoesLocais,
  salvarNovaObservacaoTutoria,
  fetchObservacoesTutor,
  CRITERIOS_POR_MODALIDADE,
  MODALIDADES_TUTORIA,
  SPREADSHEET_ID,
  SHEET_NAME
} from '../data/tutorInsightsData';

// Paleta Oficial Institucional
const BRAND = {
  primaryDark: "#001d3d",
  primary: "#002d5c",
  blueHighlight: "#0072bc",
  green: "#00984a",
  amber: "#f59e0b",
  red: "#ef4444",
  slate50: "#f8fafc",
  slate100: "#f1f5f9",
  slate200: "#e2e8f0",
  slate600: "#475569",
  slate800: "#1e293b",
};

const STATUS_COLORS = {
  superou: "#0072bc",
  atendeu: "#00984a",
  parcial: "#f59e0b",
  nao: "#ef4444",
};

// Funções utilitárias de classificação e pontuação
function stripAccents(s) {
  return (s || '').normalize("NFD").replace(/[̀-ͯ]/g, "");
}

function normalizeStr(s) {
  return stripAccents((s || "").normalize("NFC").toLowerCase().trim());
}

function classifyValue(v) {
  if (!v) return null;
  const plain = stripAccents(v.normalize("NFC").toUpperCase());
  if (plain.includes("SUPEROU")) return "superou";
  if (plain.includes("NAO OBSERVADO")) return null;
  if (plain.includes("PARCIALMENTE")) return "parcial";
  if (plain.includes("NAO ATENDEU")) return "nao";
  if (plain.includes("INTEGRALMENTE") || plain.includes("ATENDEU")) return "atendeu";
  return null;
}

function formatRadarLabel(criterio) {
  const norm = stripAccents((criterio || '').toLowerCase());
  if (norm.includes("repertorio") || norm.includes("sugestao")) return "Repertório";
  if (norm.includes("planejamento")) return "Planejamento";
  if (norm.includes("etapas")) return "Etapas da Ação";
  if (norm.includes("materiais")) return "Materiais Didáticos";
  if (norm.includes("questionamentos")) return "Questionamentos";
  if (norm.includes("evidencias")) return "Evidências";
  if (norm.includes("acolhimento")) return "Acolhimento";
  if (norm.includes("mediacao") || norm.includes("conflitos")) return "Mediação Conflitos";
  if (norm.includes("combinados")) return "Combinados";
  if (norm.includes("tempo")) return "Gestão do Tempo";
  if (norm.includes("roteiro")) return "Fidelidade Roteiro";
  if (norm.includes("pdp") || norm.includes("rubrica")) return "PDP e Rubricas";
  if (norm.includes("transposicao") || norm.includes("didatica")) return "Transposição";
  if (norm.includes("interacao")) return "Interação";
  if (norm.includes("comunicacao") || norm.includes("clima")) return "Clima e Diálogo";
  if (norm.includes("digital")) return "Comp. Digital";
  return criterio && criterio.length > 16 ? criterio.substring(0, 14) + "…" : criterio;
}

export default function TutorInsightsDashboard({ userRole = 'admin', userEmail = '', userName = '', tutores = [] }) {
  const [observacoes, setObservacoes] = useState(() => getTutorObservacoesLocais());
  const [activeTab, setActiveTab] = useState('modalidade'); // 'modalidade' | 'tutor' | 'formador' | 'checklist' | 'coordenacao'
  const [selectedObs, setSelectedObs] = useState(null);
  const [modalNovaObs, setModalNovaObs] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState(null);
  const [simulatedPersona, setSimulatedPersona] = useState('none');

  // Sub-abas de modalidade
  const [subModalidade, setSubModalidade] = useState("Diálogo Formativo");

  // Filtros Globais
  const [filtroAcao, setFiltroAcao] = useState('todas');
  const [filtroModalidade, setFiltroModalidade] = useState('todas');
  const [filtroTema, setFiltroTema] = useState('todos');
  const [filtroNre, setFiltroNre] = useState('todos');
  const [filtroTutor, setFiltroTutor] = useState('todos');
  const [filtroFormador, setFiltroFormador] = useState('todos');
  const [busca, setBusca] = useState('');
  const [ordemData, setOrdemData] = useState('recentes'); // 'recentes' | 'antigos'

  // Sincronização inicial automática da planilha do Google Sheets
  useEffect(() => {
    let isMounted = true;
    async function carregarObservacoesRemotas() {
      try {
        const data = await fetchObservacoesTutor();
        if (isMounted && Array.isArray(data) && data.length > 0) {
          setObservacoes(data);
        }
      } catch (err) {
        console.warn("[TutorInsights] Erro ao sincronizar observações:", err);
      }
    }
    carregarObservacoesRemotas();
    return () => { isMounted = false; };
  }, []);

  const handleSyncSheets = async () => {
    setIsSyncing(true);
    setSyncStatus(null);
    try {
      const data = await fetchObservacoesTutor();
      if (Array.isArray(data) && data.length > 0) {
        setObservacoes(data);
        setSyncStatus({
          type: 'success',
          text: `✓ Sincronização concluída com sucesso! ${data.length} observações consolidadas da planilha oficial.`
        });
      } else {
        setSyncStatus({
          type: 'info',
          text: 'Base local já está atualizada com as observações mais recentes.'
        });
      }
    } catch (err) {
      setSyncStatus({
        type: 'error',
        text: 'Não foi possível conectar ao Google Sheets no momento. Mantendo base em cache local.'
      });
    } finally {
      setIsSyncing(false);
      setTimeout(() => setSyncStatus(null), 6000);
    }
  };

  const handleSimulatePersona = (val) => {
    setSimulatedPersona(val);
    if (val.startsWith('tutor:')) {
      const tutorName = val.replace('tutor:', '');
      setActiveTab('tutor');
      setFiltroTutor(tutorName);
      setFiltroFormador('todos');
    } else if (val.startsWith('formador:')) {
      const formadorName = val.replace('formador:', '');
      setActiveTab('formador');
      setFiltroFormador(formadorName);
      setFiltroTutor('todos');
    } else {
      setFiltroTutor('todos');
      setFiltroFormador('todos');
      setActiveTab('modalidade');
    }
  };

  // Listas únicas para dropdowns de filtros
  const temasDisponiveis = useMemo(() => {
    return Array.from(new Set(observacoes.map(o => o.tema).filter(Boolean))).sort();
  }, [observacoes]);

  const nresDisponiveis = useMemo(() => {
    return Array.from(new Set(observacoes.map(o => o.nre).filter(Boolean))).sort();
  }, [observacoes]);

  const tutoresDisponiveis = useMemo(() => {
    return Array.from(new Set(observacoes.map(o => o.tutor).filter(Boolean))).sort();
  }, [observacoes]);

  const formadoresDisponiveis = useMemo(() => {
    return Array.from(new Set(observacoes.map(o => o.formador).filter(Boolean))).sort();
  }, [observacoes]);

  // Aplicar Filtros Globais
  const filteredRows = useMemo(() => {
    let rows = [...observacoes];

    if (filtroAcao !== 'todas') {
      rows = rows.filter(r => r.acaoAcompanhamento === filtroAcao);
    }
    if (filtroModalidade !== 'todas') {
      rows = rows.filter(r => r.modalidade === filtroModalidade);
    }
    if (filtroTema !== 'todos') {
      rows = rows.filter(r => r.tema === filtroTema);
    }
    if (filtroNre !== 'todos') {
      rows = rows.filter(r => r.nre === filtroNre);
    }
    if (filtroTutor !== 'todos') {
      rows = rows.filter(r => r.tutor === filtroTutor);
    }
    if (filtroFormador !== 'todos') {
      rows = rows.filter(r => r.formador === filtroFormador);
    }

    if (busca.trim()) {
      const q = normalizeStr(busca);
      rows = rows.filter(r => {
        return (
          normalizeStr(r.tutor).includes(q) ||
          normalizeStr(r.formador).includes(q) ||
          normalizeStr(r.tutorEmail).includes(q) ||
          normalizeStr(r.modalidade).includes(q) ||
          normalizeStr(r.nre).includes(q) ||
          normalizeStr(r.tema).includes(q) ||
          normalizeStr(r.destaques).includes(q) ||
          normalizeStr(r.desenvolver).includes(q) ||
          normalizeStr(r.encaminhamentos).includes(q)
        );
      });
    }

    // Ordenação
    rows.sort((a, b) => {
      const da = new Date(a.timestamp || a.dataObservacao || 0);
      const db = new Date(b.timestamp || b.dataObservacao || 0);
      return ordemData === 'recentes' ? db - da : da - db;
    });

    return rows;
  }, [observacoes, filtroAcao, filtroModalidade, filtroTema, filtroNre, filtroTutor, filtroFormador, busca, ordemData]);

  // KPIs Globais
  const kpis = useMemo(() => {
    const total = filteredRows.length;
    const tutoresUnicos = new Set(filteredRows.map(r => r.tutor).filter(Boolean)).size;
    const formadoresUnicos = new Set(filteredRows.map(r => r.formador).filter(Boolean)).size;

    let somaNotas = 0;
    let totalComNota = 0;
    const contagemMod = {};

    filteredRows.forEach(r => {
      if (typeof r.avgScore === 'number' && !isNaN(r.avgScore)) {
        somaNotas += r.avgScore;
        totalComNota++;
      }
      if (r.modalidade) {
        contagemMod[r.modalidade] = (contagemMod[r.modalidade] || 0) + 1;
      }
    });

    const mediaGeral = totalComNota > 0 ? (somaNotas / totalComNota).toFixed(2) : '0.00';

    let formatoMaisFrequente = '—';
    let maxModCount = 0;
    Object.entries(contagemMod).forEach(([mod, cnt]) => {
      if (cnt > maxModCount) {
        maxModCount = cnt;
        formatoMaisFrequente = `${mod} (${cnt})`;
      }
    });

    return {
      total,
      tutoresUnicos,
      formadoresUnicos,
      mediaGeral,
      formatoMaisFrequente
    };
  }, [filteredRows]);

  const limparFiltros = () => {
    setFiltroAcao('todas');
    setFiltroModalidade('todas');
    setFiltroTema('todos');
    setFiltroNre('todos');
    setFiltroTutor('todos');
    setFiltroFormador('todos');
    setBusca('');
  };

  return (
    <div className="glass-panel animate-fade-in" style={{ padding: '1.5rem', width: '100%', boxSizing: 'border-box', fontFamily: 'inherit', color: BRAND.slate800 }}>
      
      {/* ── Header Institucional ─────────────────────────────────── */}
      <div style={{
        background: `linear-gradient(135deg, ${BRAND.primaryDark} 0%, ${BRAND.primary} 60%, ${BRAND.blueHighlight} 100%)`,
        borderRadius: '16px',
        padding: '1.75rem 2rem',
        color: 'white',
        marginBottom: '1rem',
        boxShadow: '0 8px 24px rgba(0, 29, 61, 0.2)',
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '1rem'
      }}>
        <div style={{ flex: '1 1 320px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.4rem' }}>
            <span style={{ fontSize: '1.6rem' }}>◈</span>
            <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800, letterSpacing: '-0.02em' }}>
              Observação do Tutor · Acompanhamento Pedagógico
            </h1>
            <span style={{
              background: 'rgba(255,255,255,0.18)',
              padding: '0.2rem 0.6rem',
              borderRadius: '999px',
              fontSize: '0.75rem',
              fontWeight: 700,
              letterSpacing: '0.04em',
              textTransform: 'uppercase'
            }}>
              {userRole === 'admin' || userRole === 'superadmin' ? 'Superadmin' : userRole === 'tecnico' ? 'Técnico' : userRole === 'tutor' ? 'Tutor' : 'Visualizador'}
            </span>
          </div>
          <p style={{ margin: 0, fontSize: '0.88rem', color: 'rgba(255, 255, 255, 0.85)', lineHeight: 1.4 }}>
            Monitoramento analítico de sessões formativas: Técnicos acompanhando Tutores e Tutores acompanhando Formadores.
          </p>
          <div style={{ marginTop: '0.5rem', fontSize: '0.74rem', color: 'rgba(255, 255, 255, 0.7)', display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '0.4rem' }}>
            <span>📄 Planilha Oficial:</span>
            <code style={{ background: 'rgba(0,0,0,0.25)', padding: '0.1rem 0.4rem', borderRadius: '4px', fontSize: '0.72rem' }}>{SPREADSHEET_ID}</code>
            <span>· Aba: <strong>{SHEET_NAME}</strong> (41 colunas estruturadas)</span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          {/* Seletor de Simulação de Papéis (Impersonation) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', backgroundColor: 'rgba(255,255,255,0.14)', padding: '0.4rem 0.75rem', borderRadius: '8px' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 600 }}>👁️ Simular Perfil:</span>
            <select
              value={simulatedPersona}
              onChange={e => handleSimulatePersona(e.target.value)}
              style={{
                backgroundColor: 'white',
                color: BRAND.primaryDark,
                border: 'none',
                borderRadius: '6px',
                padding: '0.35rem 0.6rem',
                fontSize: '0.8rem',
                fontWeight: 700,
                cursor: 'pointer',
                outline: 'none'
              }}
            >
              <option value="none">👑 Visão Coordenação (Todas)</option>
              <optgroup label="Tutores">
                {tutoresDisponiveis.map(t => (
                  <option key={t} value={`tutor:${t}`}>👨‍🏫 Tutor: {t}</option>
                ))}
              </optgroup>
              <optgroup label="Formadores">
                {formadoresDisponiveis.map(f => (
                  <option key={f} value={`formador:${f}`}>🧑‍🏫 Formador: {f}</option>
                ))}
              </optgroup>
            </select>
          </div>

          {/* Botão Sincronizar Google Sheets */}
          <button
            onClick={handleSyncSheets}
            disabled={isSyncing}
            style={{
              backgroundColor: 'rgba(255,255,255,0.18)',
              color: 'white',
              border: '1px solid rgba(255,255,255,0.3)',
              borderRadius: '8px',
              padding: '0.65rem 1rem',
              fontSize: '0.85rem',
              fontWeight: 700,
              cursor: isSyncing ? 'wait' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.45rem',
              transition: 'all 0.2s'
            }}
            title="Atualizar dados diretamente da planilha do Google Sheets"
          >
            <span>{isSyncing ? '⏳' : '🔄'}</span>
            {isSyncing ? 'Sincronizando...' : 'Sincronizar Google Sheets'}
          </button>

          {/* Botão Nova Observação */}
          <button
            onClick={() => setModalNovaObs(true)}
            style={{
              backgroundColor: BRAND.green,
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              padding: '0.65rem 1.2rem',
              fontSize: '0.85rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              boxShadow: '0 4px 12px rgba(0, 152, 74, 0.35)',
              transition: 'all 0.2s'
            }}
          >
            <span>+</span> Nova Observação
          </button>
        </div>
      </div>

      {/* Banner de Status de Sincronização */}
      {syncStatus && (
        <div style={{
          backgroundColor: syncStatus.type === 'success' ? '#ecfdf5' : syncStatus.type === 'error' ? '#fef2f2' : '#eff6ff',
          border: `1px solid ${syncStatus.type === 'success' ? '#10b981' : syncStatus.type === 'error' ? '#ef4444' : '#3b82f6'}`,
          color: syncStatus.type === 'success' ? '#065f46' : syncStatus.type === 'error' ? '#991b1b' : '#1e40af',
          padding: '0.75rem 1.25rem',
          borderRadius: '8px',
          fontSize: '0.88rem',
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '1.25rem',
          boxShadow: '0 2px 6px rgba(0,0,0,0.05)'
        }}>
          <span>{syncStatus.text}</span>
          <button onClick={() => setSyncStatus(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontWeight: 800, color: 'inherit' }}>✕</button>
        </div>
      )}

      {/* ── Barra de Filtros Globais Responsiva ───────────────────── */}
      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '1.25rem',
        border: `1px solid ${BRAND.slate200}`,
        boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
        marginBottom: '1.5rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.85rem'
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
          gap: '0.75rem',
          alignItems: 'end'
        }}>
          {/* Nível de Ação */}
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: BRAND.slate600, marginBottom: '0.3rem' }}>
              AÇÃO / NÍVEL
            </label>
            <select
              value={filtroAcao}
              onChange={e => setFiltroAcao(e.target.value)}
              style={{
                width: '100%',
                padding: '0.5rem 0.65rem',
                borderRadius: '6px',
                border: `1px solid ${BRAND.slate200}`,
                fontSize: '0.82rem',
                backgroundColor: BRAND.slate50
              }}
            >
              <option value="todas">Todas as Ações</option>
              <option value="Observação de Tutor pelo Técnico">Técnico avalia Tutor</option>
              <option value="Observação do Formador pelo Tutor">Tutor avalia Formador</option>
            </select>
          </div>

          {/* Formato / Modalidade */}
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: BRAND.slate600, marginBottom: '0.3rem' }}>
              FORMATO / SESSÃO
            </label>
            <select
              value={filtroModalidade}
              onChange={e => setFiltroModalidade(e.target.value)}
              style={{
                width: '100%',
                padding: '0.5rem 0.65rem',
                borderRadius: '6px',
                border: `1px solid ${BRAND.slate200}`,
                fontSize: '0.82rem',
                backgroundColor: BRAND.slate50
              }}
            >
              <option value="todas">Todos os Formatos</option>
              {MODALIDADES_TUTORIA.map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>

          {/* Temática */}
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: BRAND.slate600, marginBottom: '0.3rem' }}>
              TEMÁTICA PEDAGÓGICA
            </label>
            <select
              value={filtroTema}
              onChange={e => setFiltroTema(e.target.value)}
              style={{
                width: '100%',
                padding: '0.5rem 0.65rem',
                borderRadius: '6px',
                border: `1px solid ${BRAND.slate200}`,
                fontSize: '0.82rem',
                backgroundColor: BRAND.slate50
              }}
            >
              <option value="todos">Todos os Temas</option>
              {temasDisponiveis.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          {/* NRE */}
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: BRAND.slate600, marginBottom: '0.3rem' }}>
              NÚCLEO REGIONAL (NRE)
            </label>
            <select
              value={filtroNre}
              onChange={e => setFiltroNre(e.target.value)}
              style={{
                width: '100%',
                padding: '0.5rem 0.65rem',
                borderRadius: '6px',
                border: `1px solid ${BRAND.slate200}`,
                fontSize: '0.82rem',
                backgroundColor: BRAND.slate50
              }}
            >
              <option value="todos">Todos os NREs</option>
              {nresDisponiveis.map(n => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </div>

          {/* Tutor */}
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: BRAND.slate600, marginBottom: '0.3rem' }}>
              TUTOR
            </label>
            <select
              value={filtroTutor}
              onChange={e => setFiltroTutor(e.target.value)}
              style={{
                width: '100%',
                padding: '0.5rem 0.65rem',
                borderRadius: '6px',
                border: `1px solid ${BRAND.slate200}`,
                fontSize: '0.82rem',
                backgroundColor: BRAND.slate50
              }}
            >
              <option value="todos">Todos os Tutores ({tutoresDisponiveis.length})</option>
              {tutoresDisponiveis.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          {/* Formador */}
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: BRAND.slate600, marginBottom: '0.3rem' }}>
              FORMADOR
            </label>
            <select
              value={filtroFormador}
              onChange={e => setFiltroFormador(e.target.value)}
              style={{
                width: '100%',
                padding: '0.5rem 0.65rem',
                borderRadius: '6px',
                border: `1px solid ${BRAND.slate200}`,
                fontSize: '0.82rem',
                backgroundColor: BRAND.slate50
              }}
            >
              <option value="todos">Todos os Formadores ({formadoresDisponiveis.length})</option>
              {formadoresDisponiveis.map(f => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Linha Inferior de Busca e Limpeza */}
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '0.75rem',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderTop: `1px solid ${BRAND.slate100}`,
          paddingTop: '0.75rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: '1 1 280px' }}>
            <span style={{ fontSize: '1rem', color: BRAND.slate600 }}>🔍</span>
            <input
              type="text"
              placeholder="Buscar por tutor, formador, NRE, tema ou termos do feedback..."
              value={busca}
              onChange={e => setBusca(e.target.value)}
              style={{
                flex: 1,
                padding: '0.5rem 0.75rem',
                borderRadius: '6px',
                border: `1px solid ${BRAND.slate200}`,
                fontSize: '0.82rem',
                outline: 'none'
              }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {(filtroAcao !== 'todas' || filtroModalidade !== 'todas' || filtroTema !== 'todos' || filtroNre !== 'todos' || filtroTutor !== 'todos' || filtroFormador !== 'todos' || busca) && (
              <button
                onClick={limparFiltros}
                style={{
                  backgroundColor: 'transparent',
                  color: BRAND.primary,
                  border: `1px solid ${BRAND.primary}`,
                  borderRadius: '6px',
                  padding: '0.45rem 0.85rem',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Limpar Filtros
              </button>
            )}
            <span style={{ fontSize: '0.8rem', color: BRAND.slate600 }}>
              Exibindo <strong>{filteredRows.length}</strong> de {observacoes.length} registros
            </span>
          </div>
        </div>
      </div>

      {/* ── Cards de KPIs Globais ─────────────────────────────────── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
        gap: '1rem',
        marginBottom: '1.5rem'
      }}>
        <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '1rem 1.25rem', border: `1px solid ${BRAND.slate200}` }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: BRAND.slate600, textTransform: 'uppercase' }}>Total Observações</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: BRAND.primaryDark, marginTop: '0.2rem' }}>{kpis.total}</div>
          <div style={{ fontSize: '0.72rem', color: BRAND.slate600, marginTop: '0.2rem' }}>Registros pedagógicos filtrados</div>
        </div>

        <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '1rem 1.25rem', border: `1px solid ${BRAND.slate200}` }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: BRAND.slate600, textTransform: 'uppercase' }}>Tutores Acompanhados</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: BRAND.blueHighlight, marginTop: '0.2rem' }}>{kpis.tutoresUnicos}</div>
          <div style={{ fontSize: '0.72rem', color: BRAND.slate600, marginTop: '0.2rem' }}>Tutores com sessões no escopo</div>
        </div>

        <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '1rem 1.25rem', border: `1px solid ${BRAND.slate200}` }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: BRAND.slate600, textTransform: 'uppercase' }}>Formadores Observados</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: BRAND.primary, marginTop: '0.2rem' }}>{kpis.formadoresUnicos}</div>
          <div style={{ fontSize: '0.72rem', color: BRAND.slate600, marginTop: '0.2rem' }}>Docentes formadores envolvidos</div>
        </div>

        <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '1rem 1.25rem', border: `1px solid ${BRAND.slate200}` }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: BRAND.slate600, textTransform: 'uppercase' }}>Média Geral Formativa</div>
          <div style={{
            fontSize: '1.8rem',
            fontWeight: 800,
            color: parseFloat(kpis.mediaGeral) >= 2.0 ? BRAND.green : BRAND.amber,
            marginTop: '0.2rem'
          }}>
            {kpis.mediaGeral} <span style={{ fontSize: '0.9rem', color: BRAND.slate600, fontWeight: 500 }}>/ 3.0</span>
          </div>
          <div style={{ fontSize: '0.72rem', color: BRAND.slate600, marginTop: '0.2rem' }}>
            {parseFloat(kpis.mediaGeral) >= 2.0 ? '✓ Acima da meta pedagógica' : '⚠️ Atenção pedagógica recomendada'}
          </div>
        </div>

        <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '1rem 1.25rem', border: `1px solid ${BRAND.slate200}` }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: BRAND.slate600, textTransform: 'uppercase' }}>Formato Mais Frequente</div>
          <div style={{ fontSize: '1.15rem', fontWeight: 800, color: BRAND.slate800, marginTop: '0.4rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {kpis.formatoMaisFrequente}
          </div>
          <div style={{ fontSize: '0.72rem', color: BRAND.slate600, marginTop: '0.4rem' }}>Modalidade com maior engajamento</div>
        </div>
      </div>

      {/* ── Menu de Navegação em Abas (Superadmin) ────────────────── */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '0.4rem',
        borderBottom: `2px solid ${BRAND.slate200}`,
        marginBottom: '1.5rem',
        paddingBottom: '0.25rem'
      }}>
        {[
          { id: 'modalidade', label: '📊 Por Formato (Modalidade)' },
          { id: 'tutor', label: '👤 Por Tutor' },
          { id: 'formador', label: '👨‍🏫 Por Formador' },
          { id: 'checklist', label: '📋 Checklist' },
          { id: 'coordenacao', label: '🛡️ Painel Técnico (Coordenação)' },
        ].map(tab => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                backgroundColor: isActive ? BRAND.primaryDark : 'transparent',
                color: isActive ? 'white' : BRAND.slate600,
                border: 'none',
                borderRadius: '8px',
                padding: '0.65rem 1.15rem',
                fontSize: '0.85rem',
                fontWeight: isActive ? 700 : 500,
                cursor: 'pointer',
                transition: 'all 0.15s ease-in-out'
              }}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ── Conteúdo da Aba Ativa ─────────────────────────────────── */}
      <div style={{ minHeight: '380px', marginBottom: '2rem' }}>
        {activeTab === 'modalidade' && (
          <ModalidadeView
            rows={filteredRows}
            subModalidade={subModalidade}
            setSubModalidade={setSubModalidade}
            onSelectObservation={setSelectedObs}
          />
        )}

        {activeTab === 'tutor' && (
          <PersonView
            rows={filteredRows}
            field="tutor"
            options={tutoresDisponiveis}
            label="Tutor"
            onSelectObservation={setSelectedObs}
          />
        )}

        {activeTab === 'formador' && (
          <PersonView
            rows={filteredRows}
            field="formador"
            options={formadoresDisponiveis}
            label="Formador"
            onSelectObservation={setSelectedObs}
          />
        )}

        {activeTab === 'checklist' && (
          <ChecklistView rows={filteredRows} />
        )}

        {activeTab === 'coordenacao' && (
          <CoordenacaoView rows={filteredRows} />
        )}
      </div>

      {/* ── Seção Inferior: Histórico Completo de Observações ─────── */}
      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '1.5rem',
        border: `1px solid ${BRAND.slate200}`,
        boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
      }}>
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem',
          marginBottom: '1.25rem',
          borderBottom: `1px solid ${BRAND.slate100}`,
          paddingBottom: '0.75rem'
        }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: BRAND.primaryDark }}>
              Registros e Evidências Pedagógicas ({filteredRows.length})
            </h2>
            <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.8rem', color: BRAND.slate600 }}>
              Clique em qualquer card para inspecionar os critérios da rubrica, apontamentos de feedback e gravações.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.78rem', color: BRAND.slate600 }}>Ordenar:</span>
            <select
              value={ordemData}
              onChange={e => setOrdemData(e.target.value)}
              style={{
                padding: '0.35rem 0.65rem',
                borderRadius: '6px',
                border: `1px solid ${BRAND.slate200}`,
                fontSize: '0.78rem',
                backgroundColor: BRAND.slate50
              }}
            >
              <option value="recentes">Mais recentes primeiro</option>
              <option value="antigos">Mais antigas primeiro</option>
            </select>
          </div>
        </div>

        {filteredRows.length === 0 ? (
          <div style={{ padding: '3rem 1rem', textAlign: 'center', color: BRAND.slate600 }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>📋</div>
            <div style={{ fontWeight: 700, fontSize: '1rem', color: BRAND.slate800 }}>Nenhuma observação encontrada</div>
            <div style={{ fontSize: '0.82rem', marginTop: '0.25rem' }}>Ajuste os filtros superiores ou a busca para localizar registros.</div>
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
            gap: '1rem'
          }}>
            {filteredRows.map((obs, idx) => {
              const isSuperou = obs.avgScore >= 2.5;
              const isAtendeu = obs.avgScore >= 2.0 && obs.avgScore < 2.5;
              const isParcial = obs.avgScore >= 1.0 && obs.avgScore < 2.0;
              const badgeBg = isSuperou ? BRAND.blueHighlight : isAtendeu ? BRAND.green : isParcial ? BRAND.amber : BRAND.red;

              return (
                <div
                  key={obs.id || idx}
                  onClick={() => setSelectedObs(obs)}
                  style={{
                    backgroundColor: BRAND.slate50,
                    borderRadius: '10px',
                    border: `1px solid ${BRAND.slate200}`,
                    padding: '1rem 1.15rem',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease-in-out',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between'
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 6px 16px rgba(0,0,0,0.06)';
                    e.currentTarget.style.borderColor = BRAND.blueHighlight;
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = 'none';
                    e.currentTarget.style.borderColor = BRAND.slate200;
                  }}
                >
                  <div>
                    {/* Linha superior: Ação e Média */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.6rem' }}>
                      <span style={{
                        backgroundColor: 'white',
                        border: `1px solid ${BRAND.slate200}`,
                        padding: '0.2rem 0.55rem',
                        borderRadius: '6px',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        color: BRAND.primaryDark
                      }}>
                        {obs.modalidade || 'Ação Formativa'}
                      </span>
                      {typeof obs.avgScore === 'number' && (
                        <span style={{
                          backgroundColor: badgeBg,
                          color: 'white',
                          padding: '0.2rem 0.6rem',
                          borderRadius: '6px',
                          fontSize: '0.75rem',
                          fontWeight: 800,
                          fontFamily: 'monospace'
                        }}>
                          {obs.avgScore.toFixed(2)}
                        </span>
                      )}
                    </div>

                    {/* Tutor e Formador */}
                    <div style={{ marginBottom: '0.5rem' }}>
                      <div style={{ fontSize: '0.72rem', fontWeight: 700, color: BRAND.slate600, textTransform: 'uppercase' }}>Tutor</div>
                      <div style={{ fontSize: '0.9rem', fontWeight: 800, color: BRAND.slate800 }}>{obs.tutor}</div>
                    </div>

                    <div style={{ marginBottom: '0.5rem' }}>
                      <div style={{ fontSize: '0.72rem', fontWeight: 700, color: BRAND.slate600, textTransform: 'uppercase' }}>Formador / Observador</div>
                      <div style={{ fontSize: '0.85rem', fontWeight: 600, color: BRAND.slate800 }}>{obs.formador}</div>
                    </div>

                    {/* Destaque ou resumo se houver */}
                    {obs.destaques && (
                      <div style={{
                        fontSize: '0.75rem',
                        color: BRAND.slate600,
                        backgroundColor: 'white',
                        padding: '0.4rem 0.6rem',
                        borderRadius: '6px',
                        border: `1px solid ${BRAND.slate100}`,
                        marginTop: '0.5rem',
                        lineHeight: 1.35
                      }}>
                        <strong style={{ color: BRAND.green }}>Destaque:</strong> {obs.destaques.length > 90 ? obs.destaques.substring(0, 90) + '…' : obs.destaques}
                      </div>
                    )}
                  </div>

                  {/* Rodapé do Card */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginTop: '0.85rem',
                    paddingTop: '0.6rem',
                    borderTop: `1px solid ${BRAND.slate200}`,
                    fontSize: '0.72rem',
                    color: BRAND.slate600
                  }}>
                    <span>🗓️ {obs.dataObservacao || obs.timestamp?.substring(0, 10)}</span>
                    <span style={{ fontWeight: 600, color: BRAND.blueHighlight }}>Ver Rubrica & Detalhes →</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Modal de Detalhe Completo (ObservationDetailDialog) ───── */}
      {selectedObs && (
        <ObservationDetailModal
          obs={selectedObs}
          onClose={() => setSelectedObs(null)}
        />
      )}

      {/* ── Modal de Cadastro de Nova Observação ──────────────────── */}
      {modalNovaObs && (
        <NovaObservacaoModal
          tutores={tutores}
          onClose={() => setModalNovaObs(false)}
          onSalvar={(nova) => {
            const gravada = salvarNovaObservacaoTutoria(nova);
            setObservacoes(getTutorObservacoesLocais());
            setModalNovaObs(false);
            setSelectedObs(gravada);
          }}
        />
      )}

    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// SUBVIEW 1: POR FORMATO / MODALIDADE
// ═══════════════════════════════════════════════════════════════════════
function ModalidadeView({ rows, subModalidade, setSubModalidade, onSelectObservation }) {
  const currentRows = useMemo(() => {
    return rows.filter(r => r.modalidade === subModalidade);
  }, [rows, subModalidade]);

  // Contagem por critério
  const criteriaData = useMemo(() => {
    const map = new Map();
    currentRows.forEach(r => {
      (r.rubrics || []).forEach(x => {
        const c = classifyValue(x.value);
        if (!c) return;
        const label = formatRadarLabel(x.criterio);
        const entry = map.get(label) || { criterio: label, superou: 0, atendeu: 0, parcial: 0, nao: 0 };
        entry[c]++;
        map.set(label, entry);
      });
    });
    return Array.from(map.values());
  }, [currentRows]);

  // Donut de Menções
  const donutData = useMemo(() => {
    const counts = { superou: 0, atendeu: 0, parcial: 0, nao: 0 };
    currentRows.forEach(r => {
      (r.rubrics || []).forEach(x => {
        const c = classifyValue(x.value);
        if (c) counts[c]++;
      });
    });
    return [
      { name: 'Superou', value: counts.superou, color: STATUS_COLORS.superou },
      { name: 'Atendeu Integralmente', value: counts.atendeu, color: STATUS_COLORS.atendeu },
      { name: 'Atendeu Parcialmente', value: counts.parcial, color: STATUS_COLORS.parcial },
      { name: 'Não Atendeu', value: counts.nao, color: STATUS_COLORS.nao },
    ].filter(d => d.value > 0);
  }, [currentRows]);

  // Radar de Competências
  const radarData = useMemo(() => {
    return criteriaData.map(c => {
      const total = c.superou + c.atendeu + c.parcial + c.nao;
      const score = total > 0 ? (c.superou * 3 + c.atendeu * 2 + c.parcial * 1) / total : 0;
      return {
        criterio: c.criterio,
        score: parseFloat(score.toFixed(2))
      };
    });
  }, [criteriaData]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Pílulas de seleção de formato */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.6rem' }}>
        {MODALIDADES_TUTORIA.map(mod => {
          const isSelected = subModalidade === mod;
          const count = rows.filter(r => r.modalidade === mod).length;
          return (
            <button
              key={mod}
              onClick={() => setSubModalidade(mod)}
              style={{
                backgroundColor: isSelected ? BRAND.primary : 'white',
                color: isSelected ? 'white' : BRAND.slate800,
                border: `1px solid ${isSelected ? BRAND.primary : BRAND.slate200}`,
                borderRadius: '999px',
                padding: '0.5rem 1.1rem',
                fontSize: '0.82rem',
                fontWeight: isSelected ? 700 : 500,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.45rem',
                boxShadow: isSelected ? '0 4px 10px rgba(0, 45, 92, 0.2)' : 'none'
              }}
            >
              <span>{mod}</span>
              <span style={{
                backgroundColor: isSelected ? 'rgba(255,255,255,0.25)' : BRAND.slate100,
                color: isSelected ? 'white' : BRAND.slate600,
                padding: '0.1rem 0.45rem',
                borderRadius: '999px',
                fontSize: '0.72rem',
                fontWeight: 800
              }}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {currentRows.length === 0 ? (
        <div style={{ padding: '3rem', textAlign: 'center', backgroundColor: 'white', borderRadius: '12px', border: `1px solid ${BRAND.slate200}` }}>
          <p style={{ color: BRAND.slate600, fontSize: '0.9rem' }}>Nenhuma observação registrada para o formato <strong>{subModalidade}</strong> com os filtros selecionados.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '1.25rem' }}>
          
          {/* Gráfico de Barras Empilhadas por Critério */}
          <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '1.25rem', border: `1px solid ${BRAND.slate200}` }}>
            <h3 style={{ margin: '0 0 0.35rem 0', fontSize: '0.95rem', fontWeight: 800, color: BRAND.primaryDark }}>
              {subModalidade} · Desempenho por Critério
            </h3>
            <p style={{ margin: '0 0 1rem 0', fontSize: '0.75rem', color: BRAND.slate600 }}>
              Distribuição de conceitos atribuídos nas sessões.
            </p>
            <div style={{ width: '100%', height: '340px' }}>
              <ResponsiveContainer>
                <BarChart data={criteriaData} layout="vertical" margin={{ left: 10, right: 10, top: 5, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis type="number" fontSize={11} stroke={BRAND.slate600} />
                  <YAxis type="category" dataKey="criterio" width={110} fontSize={11} stroke={BRAND.slate800} />
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: '0.75rem', paddingTop: '0.5rem' }} />
                  <Bar dataKey="superou" name="Superou" fill={STATUS_COLORS.superou} stackId="a" />
                  <Bar dataKey="atendeu" name="Atendeu" fill={STATUS_COLORS.atendeu} stackId="a" />
                  <Bar dataKey="parcial" name="Parcial" fill={STATUS_COLORS.parcial} stackId="a" />
                  <Bar dataKey="nao" name="Não atendeu" fill={STATUS_COLORS.nao} stackId="a" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Gráfico Radar de Competências da Modalidade */}
          <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '1.25rem', border: `1px solid ${BRAND.slate200}` }}>
            <h3 style={{ margin: '0 0 0.35rem 0', fontSize: '0.95rem', fontWeight: 800, color: BRAND.primaryDark }}>
              🎯 Radar Formativo · {subModalidade}
            </h3>
            <p style={{ margin: '0 0 1rem 0', fontSize: '0.75rem', color: BRAND.slate600 }}>
              Pontuação média (0 a 3.0) por dimensão avaliada.
            </p>
            <div style={{ width: '100%', height: '340px' }}>
              <ResponsiveContainer>
                <RadarChart data={radarData}>
                  <PolarGrid stroke="#e2e8f0" />
                  <PolarAngleAxis dataKey="criterio" tick={{ fill: BRAND.slate800, fontSize: 10, fontWeight: 600 }} />
                  <PolarRadiusAxis angle={30} domain={[0, 3]} stroke="#94a3b8" />
                  <Radar name="Média Formativa" dataKey="score" stroke={BRAND.blueHighlight} fill={BRAND.blueHighlight} fillOpacity={0.4} />
                  <Tooltip formatter={(val) => [`${val} / 3.0`, 'Pontuação']} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Gráfico Donut de Proporção de Conceitos */}
          <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '1.25rem', border: `1px solid ${BRAND.slate200}` }}>
            <h3 style={{ margin: '0 0 0.35rem 0', fontSize: '0.95rem', fontWeight: 800, color: BRAND.primaryDark }}>
              🍩 Conceitos Atribuídos · {subModalidade}
            </h3>
            <p style={{ margin: '0 0 1rem 0', fontSize: '0.75rem', color: BRAND.slate600 }}>
              Volume geral de menções concedidas neste formato.
            </p>
            <div style={{ width: '100%', height: '340px' }}>
              <ResponsiveContainer>
                <PieChart>
                  <Pie
                    data={donutData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={65}
                    outerRadius={105}
                    paddingAngle={3}
                  >
                    {donutData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: '0.75rem' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// SUBVIEW 2: POR TUTOR OU POR FORMADOR (PERSON VIEW)
// ═══════════════════════════════════════════════════════════════════════
function PersonView({ rows, field, options, label, onSelectObservation }) {
  const [selectedPerson, setSelectedPerson] = useState(options[0] || '');
  const [pagina, setPagina] = useState(1);
  const itensPorPagina = 8;

  // Garantir que selectedPerson exista
  const activePerson = options.includes(selectedPerson) ? selectedPerson : (options[0] || '');

  // Registros da pessoa selecionada
  const personRows = useMemo(() => {
    return rows.filter(r => r[field] === activePerson);
  }, [rows, field, activePerson]);

  // Estatísticas da pessoa selecionada
  const personStats = useMemo(() => {
    const total = personRows.length;
    let soma = 0;
    let count = 0;
    personRows.forEach(r => {
      if (typeof r.avgScore === 'number' && !isNaN(r.avgScore)) {
        soma += r.avgScore;
        count++;
      }
    });
    const avg = count > 0 ? (soma / count).toFixed(2) : '0.00';
    const email = personRows[0]?.[`${field}Email`] || '';
    const nre = personRows[0]?.nre || '—';
    return { total, avg, email, nre };
  }, [personRows, field]);

  // Radar da pessoa selecionada
  const personRadarData = useMemo(() => {
    const map = new Map();
    personRows.forEach(r => {
      (r.rubrics || []).forEach(x => {
        if (x.score !== null && !isNaN(x.score)) {
          const l = formatRadarLabel(x.criterio);
          const entry = map.get(l) || { sum: 0, count: 0 };
          entry.sum += x.score;
          entry.count++;
          map.set(l, entry);
        }
      });
    });
    return Array.from(map.entries()).map(([criterio, st]) => ({
      criterio,
      score: parseFloat((st.sum / st.count).toFixed(2))
    }));
  }, [personRows]);

  // Ranking geral de todas as pessoas do campo
  const ranking = useMemo(() => {
    const map = new Map();
    rows.forEach(r => {
      const name = r[field];
      if (!name) return;
      const entry = map.get(name) || {
        name,
        email: r[`${field}Email`] || '',
        nre: r.nre || '—',
        total: 0,
        sum: 0,
        scoreCount: 0
      };
      entry.total++;
      if (typeof r.avgScore === 'number' && !isNaN(r.avgScore)) {
        entry.sum += r.avgScore;
        entry.scoreCount++;
      }
      map.set(name, entry);
    });

    return Array.from(map.values())
      .map(p => ({
        ...p,
        avg: p.scoreCount > 0 ? parseFloat((p.sum / p.scoreCount).toFixed(2)) : 0
      }))
      .sort((a, b) => b.total !== a.total ? b.total - a.total : b.avg - a.avg);
  }, [rows, field]);

  const totalPaginas = Math.ceil(ranking.length / itensPorPagina) || 1;
  const rankingPaginado = ranking.slice((pagina - 1) * itensPorPagina, pagina * itensPorPagina);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Seletor da Pessoa e Mini-Perfil */}
      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '1.25rem',
        border: `1px solid ${BRAND.slate200}`,
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '1rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', flex: '1 1 300px' }}>
          <div style={{
            width: '44px',
            height: '44px',
            borderRadius: '50%',
            backgroundColor: BRAND.slate100,
            color: BRAND.primaryDark,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.2rem',
            fontWeight: 800
          }}>
            {activePerson ? activePerson.charAt(0) : '?'}
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: BRAND.slate600, textTransform: 'uppercase' }}>
              SELECIONE O {label.toUpperCase()} PARA ANÁLISE INDIVIDUAL
            </label>
            <select
              value={activePerson}
              onChange={e => setSelectedPerson(e.target.value)}
              style={{
                fontSize: '1rem',
                fontWeight: 700,
                color: BRAND.primaryDark,
                border: 'none',
                background: 'transparent',
                outline: 'none',
                cursor: 'pointer',
                padding: '0.2rem 0'
              }}
            >
              {options.map(opt => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
            {personStats.email && (
              <div style={{ fontSize: '0.75rem', color: BRAND.slate600 }}>{personStats.email} · {personStats.nre}</div>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.72rem', color: BRAND.slate600, fontWeight: 700, textTransform: 'uppercase' }}>Ações Observadas</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: BRAND.primaryDark }}>{personStats.total}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.72rem', color: BRAND.slate600, fontWeight: 700, textTransform: 'uppercase' }}>Média de Pontuação</div>
            <div style={{
              fontSize: '1.4rem',
              fontWeight: 800,
              color: parseFloat(personStats.avg) >= 2.0 ? BRAND.green : BRAND.amber
            }}>
              {personStats.avg} <span style={{ fontSize: '0.8rem', color: BRAND.slate600 }}>/ 3.0</span>
            </div>
          </div>
        </div>
      </div>

      {/* Grid de Gráficos e Ranking */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: '1.25rem' }}>
        
        {/* Radar da Pessoa */}
        <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '1.25rem', border: `1px solid ${BRAND.slate200}` }}>
          <h3 style={{ margin: '0 0 0.35rem 0', fontSize: '0.95rem', fontWeight: 800, color: BRAND.primaryDark }}>
            🎯 Radar de Competências · {activePerson}
          </h3>
          <p style={{ margin: '0 0 1rem 0', fontSize: '0.75rem', color: BRAND.slate600 }}>
            Média individual por competência pedagógica observada.
          </p>
          <div style={{ width: '100%', height: '320px' }}>
            {personRadarData.length === 0 ? (
              <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: BRAND.slate600, fontSize: '0.85rem' }}>
                Sem dados de critérios para gerar o radar.
              </div>
            ) : (
              <ResponsiveContainer>
                <RadarChart data={personRadarData}>
                  <PolarGrid stroke="#e2e8f0" />
                  <PolarAngleAxis dataKey="criterio" tick={{ fill: BRAND.slate800, fontSize: 10, fontWeight: 600 }} />
                  <PolarRadiusAxis angle={30} domain={[0, 3]} stroke="#94a3b8" />
                  <Radar name="Média Individual" dataKey="score" stroke={BRAND.green} fill={BRAND.green} fillOpacity={0.4} />
                  <Tooltip formatter={(val) => [`${val} / 3.0`, 'Pontuação']} />
                </RadarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Tabela de Ranking Geral */}
        <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '1.25rem', border: `1px solid ${BRAND.slate200}`, display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
            <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: BRAND.primaryDark }}>
              🏆 Ranking Geral de {label}es ({ranking.length})
            </h3>
            <span style={{ fontSize: '0.75rem', color: BRAND.slate600 }}>Página {pagina} de {totalPaginas}</span>
          </div>

          <div style={{ flex: 1, overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
              <thead>
                <tr style={{ borderBottom: `2px solid ${BRAND.slate200}`, color: BRAND.slate600, textAlign: 'left' }}>
                  <th style={{ padding: '0.5rem 0.6rem', fontWeight: 700 }}>Nome</th>
                  <th style={{ padding: '0.5rem 0.6rem', fontWeight: 700 }}>NRE</th>
                  <th style={{ padding: '0.5rem 0.6rem', fontWeight: 700, textAlign: 'center' }}>Ações</th>
                  <th style={{ padding: '0.5rem 0.6rem', fontWeight: 700, textAlign: 'right' }}>Média</th>
                </tr>
              </thead>
              <tbody>
                {rankingPaginado.map((p, idx) => {
                  const isCur = p.name === activePerson;
                  return (
                    <tr
                      key={p.name}
                      onClick={() => setSelectedPerson(p.name)}
                      style={{
                        borderBottom: `1px solid ${BRAND.slate100}`,
                        backgroundColor: isCur ? 'rgba(0, 114, 188, 0.08)' : 'transparent',
                        cursor: 'pointer'
                      }}
                    >
                      <td style={{ padding: '0.6rem', fontWeight: isCur ? 800 : 600, color: BRAND.slate800 }}>
                        {p.name}
                      </td>
                      <td style={{ padding: '0.6rem', color: BRAND.slate600 }}>{p.nre}</td>
                      <td style={{ padding: '0.6rem', textAlign: 'center', fontWeight: 700 }}>{p.total}</td>
                      <td style={{ padding: '0.6rem', textAlign: 'right' }}>
                        <span style={{
                          backgroundColor: p.avg >= 2.0 ? BRAND.green : BRAND.amber,
                          color: 'white',
                          padding: '0.15rem 0.5rem',
                          borderRadius: '4px',
                          fontSize: '0.75rem',
                          fontWeight: 800,
                          fontFamily: 'monospace'
                        }}>
                          {p.avg.toFixed(2)}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Paginação do Ranking */}
          {totalPaginas > 1 && (
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.4rem', marginTop: '0.75rem', paddingTop: '0.5rem', borderTop: `1px solid ${BRAND.slate100}` }}>
              <button
                disabled={pagina === 1}
                onClick={() => setPagina(p => Math.max(1, p - 1))}
                style={{
                  padding: '0.3rem 0.6rem',
                  fontSize: '0.75rem',
                  borderRadius: '4px',
                  border: `1px solid ${BRAND.slate200}`,
                  backgroundColor: 'white',
                  cursor: pagina === 1 ? 'not-allowed' : 'pointer',
                  opacity: pagina === 1 ? 0.5 : 1
                }}
              >
                Anterior
              </button>
              <button
                disabled={pagina === totalPaginas}
                onClick={() => setPagina(p => Math.min(totalPaginas, p + 1))}
                style={{
                  padding: '0.3rem 0.6rem',
                  fontSize: '0.75rem',
                  borderRadius: '4px',
                  border: `1px solid ${BRAND.slate200}`,
                  backgroundColor: 'white',
                  cursor: pagina === totalPaginas ? 'not-allowed' : 'pointer',
                  opacity: pagina === totalPaginas ? 0.5 : 1
                }}
              >
                Próxima
              </button>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// SUBVIEW 3: CHECKLIST OPERACIONAL
// ═══════════════════════════════════════════════════════════════════════
function ChecklistView({ rows }) {
  const withChecklist = useMemo(() => {
    return rows.filter(r => r.checklistRealizadas || r.checklistNaoRealizadas);
  }, [rows]);

  const realizadasCount = useMemo(() => {
    const map = new Map();
    withChecklist.forEach(r => {
      const items = (r.checklistRealizadas || '').split(/[,;\n]/).map(s => s.trim()).filter(Boolean);
      items.forEach(item => map.set(item, (map.get(item) || 0) + 1));
    });
    return Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name, value]) => ({ name, value }));
  }, [withChecklist]);

  const naoRealizadasCount = useMemo(() => {
    const map = new Map();
    withChecklist.forEach(r => {
      const items = (r.checklistNaoRealizadas || '').split(/[,;\n]/).map(s => s.trim()).filter(Boolean);
      items.forEach(item => map.set(item, (map.get(item) || 0) + 1));
    });
    return Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name, value]) => ({ name, value }));
  }, [withChecklist]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div style={{
        backgroundColor: BRAND.slate50,
        padding: '0.75rem 1.25rem',
        borderRadius: '8px',
        border: `1px solid ${BRAND.slate200}`,
        fontSize: '0.8rem',
        color: BRAND.slate600,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <span>📋 Foram localizados <strong>{withChecklist.length}</strong> registros com itens de checklist preenchidos.</span>
        <span>Ações mais incidentes nas rotinas formativas</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: '1.25rem' }}>
        
        {/* Realizadas Corretamente */}
        <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '1.25rem', border: `1px solid ${BRAND.slate200}` }}>
          <h3 style={{ margin: '0 0 0.35rem 0', fontSize: '0.95rem', fontWeight: 800, color: BRAND.green }}>
            ✓ Ações Realizadas Corretamente
          </h3>
          <p style={{ margin: '0 0 1rem 0', fontSize: '0.75rem', color: BRAND.slate600 }}>
            Procedimentos mais frequentemente consolidados com êxito.
          </p>
          <div style={{ width: '100%', height: Math.max(220, realizadasCount.length * 36) }}>
            {realizadasCount.length === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: BRAND.slate600 }}>Sem itens consolidados.</div>
            ) : (
              <ResponsiveContainer>
                <BarChart data={realizadasCount} layout="vertical" margin={{ left: 10, right: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis type="number" fontSize={11} allowDecimals={false} stroke={BRAND.slate600} />
                  <YAxis type="category" dataKey="name" width={180} fontSize={11} stroke={BRAND.slate800} />
                  <Tooltip />
                  <Bar dataKey="value" name="Ocorrências" fill={BRAND.green} radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* NÃO Realizadas Adequadamente */}
        <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '1.25rem', border: `1px solid ${BRAND.slate200}` }}>
          <h3 style={{ margin: '0 0 0.35rem 0', fontSize: '0.95rem', fontWeight: 800, color: BRAND.red }}>
            ⚠️ Ações NÃO Realizadas Adequadamente
          </h3>
          <p style={{ margin: '0 0 1rem 0', fontSize: '0.75rem', color: BRAND.slate600 }}>
            Pontos de atenção operacional apontados nas observações.
          </p>
          <div style={{ width: '100%', height: Math.max(220, naoRealizadasCount.length * 36) }}>
            {naoRealizadasCount.length === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: BRAND.slate600 }}>Nenhum ponto crítico de checklist.</div>
            ) : (
              <ResponsiveContainer>
                <BarChart data={naoRealizadasCount} layout="vertical" margin={{ left: 10, right: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis type="number" fontSize={11} allowDecimals={false} stroke={BRAND.slate600} />
                  <YAxis type="category" dataKey="name" width={180} fontSize={11} stroke={BRAND.slate800} />
                  <Tooltip />
                  <Bar dataKey="value" name="Ocorrências" fill={BRAND.red} radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// SUBVIEW 4: PAINEL TÉCNICO / COORDENAÇÃO (TUTORES SOB ATENÇÃO, DESTAQUES E GARGALOS)
// ═══════════════════════════════════════════════════════════════════════
function CoordenacaoView({ rows }) {
  // Filtra observações feitas por Técnicos (Técnico observa Tutor)
  const tecnicoObs = useMemo(() => {
    return rows.filter(r => normalizeStr(r.acaoAcompanhamento).includes("tecnic"));
  }, [rows]);

  // Tutores com média técnica < 1.8
  const tutoresSobAtencao = useMemo(() => {
    const map = new Map();
    tecnicoObs.forEach(r => {
      if (!r.tutor) return;
      const entry = map.get(r.tutor) || { total: 0, sum: 0, email: r.tutorEmail, countObs: 0 };
      entry.countObs++;
      (r.rubrics || []).forEach(rub => {
        if (typeof rub.score === 'number' && !isNaN(rub.score)) {
          entry.sum += rub.score;
          entry.total++;
        }
      });
      map.set(r.tutor, entry);
    });

    return Array.from(map.entries())
      .map(([name, st]) => {
        const avg = st.total > 0 ? parseFloat((st.sum / st.total).toFixed(2)) : 0;
        return { name, email: st.email, avg, totalObs: st.countObs };
      })
      .filter(t => t.avg < 1.8 && t.totalObs > 0)
      .sort((a, b) => a.avg - b.avg);
  }, [tecnicoObs]);

  // Média de ações por tutor para calcular destaques
  const avgObsVal = useMemo(() => {
    const tutores = Array.from(new Set(tecnicoObs.map(r => r.tutor))).filter(Boolean);
    return tutores.length > 0 ? tecnicoObs.length / tutores.length : 0;
  }, [tecnicoObs]);

  // Tutores em destaque (ações acima da média)
  const tutoresDestaque = useMemo(() => {
    const map = new Map();
    tecnicoObs.forEach(r => {
      if (!r.tutor) return;
      const entry = map.get(r.tutor) || { total: 0, sum: 0, email: r.tutorEmail, countObs: 0 };
      entry.countObs++;
      (r.rubrics || []).forEach(rub => {
        if (typeof rub.score === 'number' && !isNaN(rub.score)) {
          entry.sum += rub.score;
          entry.total++;
        }
      });
      map.set(r.tutor, entry);
    });

    return Array.from(map.entries())
      .map(([name, st]) => {
        const avg = st.total > 0 ? parseFloat((st.sum / st.total).toFixed(2)) : 0;
        return { name, email: st.email, avg, totalObs: st.countObs };
      })
      .filter(t => t.totalObs >= avgObsVal)
      .sort((a, b) => b.totalObs - a.totalObs);
  }, [tecnicoObs, avgObsVal]);

  // Gargalos Pedagógicos de Formação (critérios com média < 2.0)
  const gargalosFormacao = useMemo(() => {
    const map = new Map();
    rows.forEach(r => {
      (r.rubrics || []).forEach(rub => {
        if (typeof rub.score === 'number' && !isNaN(rub.score)) {
          const entry = map.get(rub.criterio) || { total: 0, sum: 0 };
          entry.sum += rub.score;
          entry.total++;
          map.set(rub.criterio, entry);
        }
      });
    });

    return Array.from(map.entries())
      .map(([criterio, st]) => {
        const avg = st.total > 0 ? parseFloat((st.sum / st.total).toFixed(2)) : 0;
        return { criterio, avg, total: st.total };
      })
      .filter(c => c.avg < 2.0 && c.total > 0)
      .sort((a, b) => a.avg - b.avg);
  }, [rows]);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem' }}>
      
      {/* Card 1: Tutores sob Atenção */}
      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '1.25rem',
        border: `1px solid ${BRAND.amber}`,
        boxShadow: '0 4px 12px rgba(245, 158, 11, 0.08)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
          <span style={{ fontSize: '1.2rem' }}>⚠️</span>
          <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: BRAND.amber }}>
            Tutores sob Atenção (Média Técnico &lt; 1.8)
          </h3>
        </div>
        <p style={{ margin: '0 0 1rem 0', fontSize: '0.75rem', color: BRAND.slate600 }}>
          Tutores avaliados pela coordenação com rendimento abaixo do limiar formativo.
        </p>

        {tutoresSobAtencao.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: BRAND.slate600, fontSize: '0.82rem' }}>
            Nenhum tutor com média técnica abaixo de 1.8.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {tutoresSobAtencao.map(t => (
              <div
                key={t.name}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.75rem',
                  borderRadius: '8px',
                  border: `1px solid ${BRAND.slate200}`,
                  backgroundColor: BRAND.slate50
                }}
              >
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.85rem', color: BRAND.slate800 }}>{t.name}</div>
                  <div style={{ fontSize: '0.72rem', color: BRAND.slate600 }}>{t.totalObs} observações técnicas</div>
                </div>
                <span style={{
                  backgroundColor: BRAND.amber,
                  color: 'white',
                  padding: '0.2rem 0.6rem',
                  borderRadius: '6px',
                  fontWeight: 800,
                  fontSize: '0.78rem',
                  fontFamily: 'monospace'
                }}>
                  {t.avg.toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Card 2: Tutores em Destaque */}
      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '1.25rem',
        border: `1px solid ${BRAND.green}`,
        boxShadow: '0 4px 12px rgba(0, 152, 74, 0.08)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
          <span style={{ fontSize: '1.2rem' }}>🌟</span>
          <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: BRAND.green }}>
            Tutores em Destaque (Ações &gt;= {avgObsVal.toFixed(1)})
          </h3>
        </div>
        <p style={{ margin: '0 0 1rem 0', fontSize: '0.75rem', color: BRAND.slate600 }}>
          Tutores com alto volume de acompanhamentos registrados e boas práticas.
        </p>

        {tutoresDestaque.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: BRAND.slate600, fontSize: '0.82rem' }}>
            Nenhum tutor com volume superior à média.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {tutoresDestaque.map(t => (
              <div
                key={t.name}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.75rem',
                  borderRadius: '8px',
                  border: `1px solid ${BRAND.slate200}`,
                  backgroundColor: BRAND.slate50
                }}
              >
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.85rem', color: BRAND.slate800 }}>{t.name}</div>
                  <div style={{ fontSize: '0.72rem', color: BRAND.slate600 }}>{t.totalObs} observações realizadas</div>
                </div>
                <span style={{
                  backgroundColor: BRAND.green,
                  color: 'white',
                  padding: '0.2rem 0.6rem',
                  borderRadius: '6px',
                  fontWeight: 800,
                  fontSize: '0.78rem',
                  fontFamily: 'monospace'
                }}>
                  {t.avg.toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Card 3: Gargalos de Formação */}
      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '1.25rem',
        border: `1px solid ${BRAND.red}`,
        boxShadow: '0 4px 12px rgba(239, 68, 68, 0.08)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
          <span style={{ fontSize: '1.2rem' }}>🔧</span>
          <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: BRAND.red }}>
            Gargalos de Formação (Média &lt; 2.0)
          </h3>
        </div>
        <p style={{ margin: '0 0 1rem 0', fontSize: '0.75rem', color: BRAND.slate600 }}>
          Critérios da rubrica com maior dificuldade geral nas sessões.
        </p>

        {gargalosFormacao.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: BRAND.slate600, fontSize: '0.82rem' }}>
            Nenhum critério com média crítica.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {gargalosFormacao.map(c => (
              <div
                key={c.criterio}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.75rem',
                  borderRadius: '8px',
                  border: `1px solid ${BRAND.slate200}`,
                  backgroundColor: BRAND.slate50
                }}
              >
                <div style={{ maxWidth: '75%' }}>
                  <div style={{ fontWeight: 700, fontSize: '0.82rem', color: BRAND.slate800 }}>{c.criterio}</div>
                  <div style={{ fontSize: '0.72rem', color: BRAND.slate600 }}>{c.total} avaliações</div>
                </div>
                <span style={{
                  backgroundColor: BRAND.red,
                  color: 'white',
                  padding: '0.2rem 0.6rem',
                  borderRadius: '6px',
                  fontWeight: 800,
                  fontSize: '0.78rem',
                  fontFamily: 'monospace'
                }}>
                  {c.avg.toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// MODAL: DETALHE COMPLETO DA OBSERVAÇÃO (ObservationDetailModal)
// ═══════════════════════════════════════════════════════════════════════
function ObservationDetailModal({ obs, onClose }) {
  if (!obs) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 29, 61, 0.65)',
      backdropFilter: 'blur(4px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1rem',
      zIndex: 9999
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '16px',
        maxWidth: '820px',
        width: '100%',
        maxHeight: '90vh',
        overflowY: 'auto',
        boxShadow: '0 20px 40px rgba(0,0,0,0.25)',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* Cabeçalho do Modal */}
        <div style={{
          background: `linear-gradient(135deg, ${BRAND.primaryDark} 0%, ${BRAND.primary} 100%)`,
          padding: '1.25rem 1.75rem',
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderTopLeftRadius: '16px',
          borderTopRightRadius: '16px'
        }}>
          <div>
            <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.04em', opacity: 0.85 }}>
              {obs.acaoAcompanhamento || 'Observação Formativa'}
            </div>
            <h2 style={{ margin: '0.2rem 0 0 0', fontSize: '1.25rem', fontWeight: 800 }}>
              Detalhamento da Sessão · {obs.modalidade}
            </h2>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            {typeof obs.avgScore === 'number' && (
              <span style={{
                backgroundColor: 'white',
                color: BRAND.primaryDark,
                padding: '0.3rem 0.8rem',
                borderRadius: '8px',
                fontWeight: 800,
                fontSize: '0.9rem',
                fontFamily: 'monospace'
              }}>
                Média {obs.avgScore.toFixed(2)}
              </span>
            )}
            <button
              onClick={onClose}
              style={{
                backgroundColor: 'rgba(255,255,255,0.2)',
                color: 'white',
                border: 'none',
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                cursor: 'pointer',
                fontSize: '1.1rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              ✕
            </button>
          </div>
        </div>

        {/* Corpo do Modal */}
        <div style={{ padding: '1.5rem 1.75rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          
          {/* Metadados e Participantes */}
          <div style={{
            backgroundColor: BRAND.slate50,
            borderRadius: '10px',
            padding: '1rem',
            border: `1px solid ${BRAND.slate200}`,
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '0.75rem'
          }}>
            <div>
              <div style={{ fontSize: '0.7rem', fontWeight: 700, color: BRAND.slate600, textTransform: 'uppercase' }}>Tutor Pedagógico</div>
              <div style={{ fontSize: '0.92rem', fontWeight: 800, color: BRAND.slate800 }}>{obs.tutor}</div>
              {obs.tutorEmail && <div style={{ fontSize: '0.75rem', color: BRAND.slate600 }}>{obs.tutorEmail}</div>}
            </div>

            <div>
              <div style={{ fontSize: '0.7rem', fontWeight: 700, color: BRAND.slate600, textTransform: 'uppercase' }}>Formador / Observador</div>
              <div style={{ fontSize: '0.92rem', fontWeight: 800, color: BRAND.slate800 }}>{obs.formador}</div>
              {obs.formadorEmail && <div style={{ fontSize: '0.75rem', color: BRAND.slate600 }}>{obs.formadorEmail}</div>}
            </div>

            <div>
              <div style={{ fontSize: '0.7rem', fontWeight: 700, color: BRAND.slate600, textTransform: 'uppercase' }}>Local e Temática</div>
              <div style={{ fontSize: '0.85rem', fontWeight: 600, color: BRAND.slate800 }}>📍 {obs.nre || 'NRE Geral'}</div>
              <div style={{ fontSize: '0.75rem', color: BRAND.slate600 }}>📚 Tema: {obs.tema || '—'}</div>
            </div>

            <div>
              <div style={{ fontSize: '0.7rem', fontWeight: 700, color: BRAND.slate600, textTransform: 'uppercase' }}>Datas Registradas</div>
              <div style={{ fontSize: '0.85rem', color: BRAND.slate800 }}>🗓️ Observação: <strong>{obs.dataObservacao || '—'}</strong></div>
              <div style={{ fontSize: '0.75rem', color: BRAND.slate600 }}>💬 Feedback: <strong>{obs.dataFeedback || '—'}</strong></div>
            </div>
          </div>

          {/* Critérios da Rubrica Avaliada */}
          <div>
            <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '0.95rem', fontWeight: 800, color: BRAND.primaryDark }}>
              📊 Critérios da Rubrica Avaliada ({(obs.rubrics || []).length})
            </h3>
            <div style={{
              borderRadius: '8px',
              border: `1px solid ${BRAND.slate200}`,
              overflow: 'hidden'
            }}>
              {(obs.rubrics || []).map((r, idx) => {
                const c = classifyValue(r.value);
                const bg = c === 'superou' ? BRAND.blueHighlight : c === 'atendeu' ? BRAND.green : c === 'parcial' ? BRAND.amber : c === 'nao' ? BRAND.red : BRAND.slate600;

                return (
                  <div
                    key={idx}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0.65rem 0.85rem',
                      borderBottom: idx !== (obs.rubrics.length - 1) ? `1px solid ${BRAND.slate100}` : 'none',
                      backgroundColor: idx % 2 === 0 ? 'white' : BRAND.slate50
                    }}
                  >
                    <span style={{ fontSize: '0.82rem', fontWeight: 600, color: BRAND.slate800, maxWidth: '65%' }}>
                      {r.criterio}
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ fontSize: '0.78rem', color: BRAND.slate600 }}>
                        {r.value || 'Não registrado'}
                      </span>
                      {r.score !== null ? (
                        <span style={{
                          backgroundColor: bg,
                          color: 'white',
                          padding: '0.15rem 0.5rem',
                          borderRadius: '4px',
                          fontSize: '0.75rem',
                          fontWeight: 800,
                          fontFamily: 'monospace'
                        }}>
                          {r.score.toFixed(1)}
                        </span>
                      ) : (
                        <span style={{ fontSize: '0.75rem', color: BRAND.slate600 }}>—</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Checklist Operacional */}
          {(obs.checklistRealizadas || obs.checklistNaoRealizadas) && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '0.75rem' }}>
              {obs.checklistRealizadas && (
                <div style={{ backgroundColor: 'rgba(0, 152, 74, 0.05)', border: `1px solid ${BRAND.green}`, borderRadius: '8px', padding: '0.75rem' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 800, color: BRAND.green, marginBottom: '0.25rem' }}>
                    ✓ Checklist: Ações Realizadas
                  </div>
                  <div style={{ fontSize: '0.8rem', color: BRAND.slate800, lineHeight: 1.4 }}>
                    {obs.checklistRealizadas}
                  </div>
                </div>
              )}
              {obs.checklistNaoRealizadas && (
                <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.05)', border: `1px solid ${BRAND.red}`, borderRadius: '8px', padding: '0.75rem' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 800, color: BRAND.red, marginBottom: '0.25rem' }}>
                    ⚠️ Checklist: Ações Não Realizadas
                  </div>
                  <div style={{ fontSize: '0.8rem', color: BRAND.slate800, lineHeight: 1.4 }}>
                    {obs.checklistNaoRealizadas}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Destaques, Pontos a Desenvolver e Encaminhamentos */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {obs.destaques && (
              <div style={{ backgroundColor: BRAND.slate50, padding: '0.75rem', borderRadius: '8px', border: `1px solid ${BRAND.slate200}` }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 800, color: BRAND.green, display: 'block', marginBottom: '0.2rem' }}>
                  🌟 Pontos de Destaque Identificados
                </span>
                <p style={{ margin: 0, fontSize: '0.82rem', color: BRAND.slate800, lineHeight: 1.4 }}>{obs.destaques}</p>
              </div>
            )}
            {obs.desenvolver && (
              <div style={{ backgroundColor: BRAND.slate50, padding: '0.75rem', borderRadius: '8px', border: `1px solid ${BRAND.slate200}` }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 800, color: BRAND.amber, display: 'block', marginBottom: '0.2rem' }}>
                  🎯 Pontos a Desenvolver / Melhorias
                </span>
                <p style={{ margin: 0, fontSize: '0.82rem', color: BRAND.slate800, lineHeight: 1.4 }}>{obs.desenvolver}</p>
              </div>
            )}
            {obs.encaminhamentos && (
              <div style={{ backgroundColor: BRAND.slate50, padding: '0.75rem', borderRadius: '8px', border: `1px solid ${BRAND.slate200}` }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 800, color: BRAND.blueHighlight, display: 'block', marginBottom: '0.2rem' }}>
                  📌 Encaminhamentos e Combinados
                </span>
                <p style={{ margin: 0, fontSize: '0.82rem', color: BRAND.slate800, lineHeight: 1.4 }}>{obs.encaminhamentos}</p>
              </div>
            )}
          </div>

          {/* Links e Evidências Gravadas */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', paddingTop: '0.5rem', borderTop: `1px solid ${BRAND.slate100}` }}>
            {obs.linkAcaoObservada && (
              <a
                href={obs.linkAcaoObservada}
                target="_blank"
                rel="noreferrer"
                style={{
                  backgroundColor: BRAND.primaryDark,
                  color: 'white',
                  padding: '0.5rem 0.85rem',
                  borderRadius: '6px',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  textDecoration: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem'
                }}
              >
                📹 Link da Gravação da Ação ↗
              </a>
            )}
            {obs.linkFeedback && (
              <a
                href={obs.linkFeedback}
                target="_blank"
                rel="noreferrer"
                style={{
                  backgroundColor: BRAND.green,
                  color: 'white',
                  padding: '0.5rem 0.85rem',
                  borderRadius: '6px',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  textDecoration: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem'
                }}
              >
                💬 Link da Gravação do Feedback ↗
              </a>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// MODAL: FORMULÁRIO DE NOVA OBSERVAÇÃO DE TUTORIA
// ═══════════════════════════════════════════════════════════════════════
function NovaObservacaoModal({ tutores, onClose, onSalvar }) {
  const [acaoAcompanhamento, setAcaoAcompanhamento] = useState("Observação de Tutor pelo Técnico");
  const [modalidade, setModalidade] = useState("Diálogo Formativo");
  const [tutor, setTutor] = useState("");
  const [tutorEmail, setTutorEmail] = useState("");
  const [formador, setFormador] = useState("");
  const [formadorEmail, setFormadorEmail] = useState("");
  const [nre, setNre] = useState("NRE Curitiba");
  const [tema, setTema] = useState("Gestão de Sala de Aula");
  const [dataObservacao, setDataObservacao] = useState(new Date().toISOString().substring(0, 10));
  const [linkAcaoObservada, setLinkAcaoObservada] = useState("");
  const [dataFeedback, setDataFeedback] = useState(new Date().toISOString().substring(0, 10));
  const [linkFeedback, setLinkFeedback] = useState("");
  const [checklistRealizadas, setChecklistRealizadas] = useState("");
  const [checklistNaoRealizadas, setChecklistNaoRealizadas] = useState("");
  const [destaques, setDestaques] = useState("");
  const [desenvolver, setDesenvolver] = useState("");
  const [encaminhamentos, setEncaminhamentos] = useState("");

  // Critérios da modalidade atual
  const criterios = CRITERIOS_POR_MODALIDADE[modalidade] || [];
  const [rubricasState, setRubricasState] = useState({});

  const handleMudarRubrica = (crit, valor) => {
    setRubricasState(prev => ({ ...prev, [crit]: valor }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!tutor.trim() || !formador.trim()) {
      alert("Por favor, preencha o nome do Tutor e do Formador.");
      return;
    }

    let somaScore = 0;
    let countScore = 0;

    const rubricsArray = criterios.map(crit => {
      const val = rubricasState[crit] || "Atendeu integralmente";
      let score = null;
      if (val.includes("Superou")) score = 3;
      else if (val.includes("Atendeu") && !val.includes("parcialmente")) score = 2;
      else if (val.includes("parcialmente")) score = 1;
      else if (val.includes("Não atendeu")) score = 0;

      if (score !== null) {
        somaScore += score;
        countScore++;
      }
      return { criterio: crit, value: val, score };
    });

    const avgScore = countScore > 0 ? parseFloat((somaScore / countScore).toFixed(2)) : 2.0;

    const nova = {
      acaoAcompanhamento,
      modalidade,
      tutor,
      tutorEmail,
      formador,
      formadorEmail,
      nre,
      tema,
      dataObservacao,
      linkAcaoObservada,
      dataFeedback,
      linkFeedback,
      checklistRealizadas,
      checklistNaoRealizadas,
      destaques,
      desenvolver,
      encaminhamentos,
      rubrics: rubricsArray,
      avgScore
    };

    onSalvar(nova);
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 29, 61, 0.65)',
      backdropFilter: 'blur(4px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1rem',
      zIndex: 9999
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '16px',
        maxWidth: '780px',
        width: '100%',
        maxHeight: '90vh',
        overflowY: 'auto',
        boxShadow: '0 20px 40px rgba(0,0,0,0.25)',
        display: 'flex',
        flexDirection: 'column'
      }}>
        <div style={{
          background: `linear-gradient(135deg, ${BRAND.primaryDark} 0%, ${BRAND.primary} 100%)`,
          padding: '1.25rem 1.75rem',
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderTopLeftRadius: '16px',
          borderTopRightRadius: '16px'
        }}>
          <div>
            <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.04em', opacity: 0.85 }}>
              Registro Pedagógico Oficial
            </div>
            <h2 style={{ margin: '0.2rem 0 0 0', fontSize: '1.2rem', fontWeight: 800 }}>
              Nova Observação de Tutoria
            </h2>
          </div>
          <button
            onClick={onClose}
            style={{
              backgroundColor: 'rgba(255,255,255,0.2)',
              color: 'white',
              border: 'none',
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              cursor: 'pointer',
              fontSize: '1.1rem'
            }}
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '1.5rem 1.75rem', display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.75rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: BRAND.slate600, marginBottom: '0.25rem' }}>
                AÇÃO DE ACOMPANHAMENTO
              </label>
              <select
                value={acaoAcompanhamento}
                onChange={e => setAcaoAcompanhamento(e.target.value)}
                style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: `1px solid ${BRAND.slate200}`, fontSize: '0.82rem' }}
              >
                <option value="Observação de Tutor pelo Técnico">Observação de Tutor pelo Técnico</option>
                <option value="Observação do Formador pelo Tutor">Observação do Formador pelo Tutor</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: BRAND.slate600, marginBottom: '0.25rem' }}>
                FORMATO / SESSÃO
              </label>
              <select
                value={modalidade}
                onChange={e => setModalidade(e.target.value)}
                style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: `1px solid ${BRAND.slate200}`, fontSize: '0.82rem' }}
              >
                {MODALIDADES_TUTORIA.map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.75rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: BRAND.slate600, marginBottom: '0.25rem' }}>
                NOME DO TUTOR *
              </label>
              <input
                type="text"
                required
                value={tutor}
                onChange={e => setTutor(e.target.value)}
                placeholder="Ex: Ana Silva"
                style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: `1px solid ${BRAND.slate200}`, fontSize: '0.82rem' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: BRAND.slate600, marginBottom: '0.25rem' }}>
                E-MAIL DO TUTOR
              </label>
              <input
                type="email"
                value={tutorEmail}
                onChange={e => setTutorEmail(e.target.value)}
                placeholder="Ex: ana.silva@escola.pr.gov.br"
                style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: `1px solid ${BRAND.slate200}`, fontSize: '0.82rem' }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.75rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: BRAND.slate600, marginBottom: '0.25rem' }}>
                FORMADOR / OBSERVADOR *
              </label>
              <input
                type="text"
                required
                value={formador}
                onChange={e => setFormador(e.target.value)}
                placeholder="Ex: Carlos Formador"
                style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: `1px solid ${BRAND.slate200}`, fontSize: '0.82rem' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: BRAND.slate600, marginBottom: '0.25rem' }}>
                E-MAIL DO FORMADOR
              </label>
              <input
                type="email"
                value={formadorEmail}
                onChange={e => setFormadorEmail(e.target.value)}
                placeholder="Ex: carlos@escola.pr.gov.br"
                style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: `1px solid ${BRAND.slate200}`, fontSize: '0.82rem' }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: BRAND.slate600, marginBottom: '0.25rem' }}>
                NÚCLEO REGIONAL (NRE)
              </label>
              <input
                type="text"
                value={nre}
                onChange={e => setNre(e.target.value)}
                placeholder="Ex: NRE Curitiba"
                style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: `1px solid ${BRAND.slate200}`, fontSize: '0.82rem' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: BRAND.slate600, marginBottom: '0.25rem' }}>
                TEMÁTICA PEDAGÓGICA
              </label>
              <input
                type="text"
                value={tema}
                onChange={e => setTema(e.target.value)}
                placeholder="Ex: Gestão de Sala de Aula"
                style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: `1px solid ${BRAND.slate200}`, fontSize: '0.82rem' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: BRAND.slate600, marginBottom: '0.25rem' }}>
                DATA DA OBSERVAÇÃO
              </label>
              <input
                type="date"
                value={dataObservacao}
                onChange={e => setDataObservacao(e.target.value)}
                style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: `1px solid ${BRAND.slate200}`, fontSize: '0.82rem' }}
              />
            </div>
          </div>

          {/* Critérios da Rubrica */}
          <div style={{ borderTop: `1px solid ${BRAND.slate200}`, paddingTop: '0.85rem' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 800, color: BRAND.primaryDark, marginBottom: '0.5rem' }}>
              Rubrica de Avaliação ({modalidade})
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {criterios.map((crit, idx) => (
                <div key={crit} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', padding: '0.4rem 0', borderBottom: `1px solid ${BRAND.slate100}` }}>
                  <span style={{ fontSize: '0.8rem', color: BRAND.slate800, fontWeight: 500 }}>{crit}</span>
                  <select
                    value={rubricasState[crit] || "Atendeu integralmente"}
                    onChange={e => handleMudarRubrica(crit, e.target.value)}
                    style={{ padding: '0.35rem 0.6rem', borderRadius: '4px', border: `1px solid ${BRAND.slate200}`, fontSize: '0.78rem' }}
                  >
                    <option value="Superou">Superou (3.0)</option>
                    <option value="Atendeu integralmente">Atendeu integralmente (2.0)</option>
                    <option value="Atendeu parcialmente">Atendeu parcialmente (1.0)</option>
                    <option value="Não atendeu">Não atendeu (0.0)</option>
                    <option value="Não observado">Não observado (—)</option>
                  </select>
                </div>
              ))}
            </div>
          </div>

          {/* Destaques e Encaminhamentos */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: BRAND.slate600, marginBottom: '0.2rem' }}>
                PONTOS DE DESTAQUE
              </label>
              <textarea
                rows={2}
                value={destaques}
                onChange={e => setDestaques(e.target.value)}
                placeholder="Acolhimento, domínio do conteúdo, escuta ativa..."
                style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: `1px solid ${BRAND.slate200}`, fontSize: '0.82rem' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: BRAND.slate600, marginBottom: '0.2rem' }}>
                PONTOS A DESENVOLVER
              </label>
              <textarea
                rows={2}
                value={desenvolver}
                onChange={e => setDesenvolver(e.target.value)}
                placeholder="Sugestão de literatura teórica, gestão do tempo..."
                style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: `1px solid ${BRAND.slate200}`, fontSize: '0.82rem' }}
              />
            </div>
          </div>

          {/* Botões do Rodapé */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                backgroundColor: BRAND.slate100,
                color: BRAND.slate800,
                border: 'none',
                padding: '0.65rem 1.25rem',
                borderRadius: '8px',
                fontSize: '0.85rem',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              style={{
                backgroundColor: BRAND.primaryDark,
                color: 'white',
                border: 'none',
                padding: '0.65rem 1.4rem',
                borderRadius: '8px',
                fontSize: '0.85rem',
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(0, 29, 61, 0.25)'
              }}
            >
              Salvar Observação
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
