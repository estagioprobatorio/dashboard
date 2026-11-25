import React, { useState, useMemo } from 'react';
import { normalizeNre } from '../utils/nreUtils';

/**
 * PAINEL DE ENCERRAMENTO FORMATIVO (TEMAS 6 E 7 - 2º SEMESTRE)
 * Estilizado 100% com o Design System oficial da SEED-PR / Estágio Probatório.
 */

// Filtra observações exclusivas do 2º Semestre
const isObs2Semestre = (obs) => {
  if (!obs) return false;
  const sem = String(obs.semestre || '').toLowerCase();
  const id = String(obs.id_origem || obs.id || '').toUpperCase();
  const ano = String(obs.ano_formativo || '').toLowerCase();
  return (
    sem.includes('2º sem') ||
    sem.includes('2 semestre') ||
    sem.includes('2ºsem') ||
    sem.includes('2 sem') ||
    id.includes('2SEM') ||
    id.includes('2_SEM') ||
    ano.includes('2º semestre') ||
    ano.includes('2sem')
  );
};

// Detecção resiliente de Tema 6 e Tema 7
const isTema6 = (tema) => {
  const t = String(tema || '').trim().toLowerCase();
  return (
    t.includes('tema 6') ||
    t.includes('tema06') ||
    t.includes('tema  6') ||
    /^6[\s:–—.-]/.test(t) ||
    t === '6' ||
    /[\s(]tema\s*6\b/i.test(t)
  );
};

const isTema7 = (tema) => {
  const t = String(tema || '').trim().toLowerCase();
  return (
    t.includes('tema 7') ||
    t.includes('tema07') ||
    t.includes('tema  7') ||
    /^7[\s:–—.-]/.test(t) ||
    t === '7' ||
    /[\s(]tema\s*7\b/i.test(t)
  );
};

export default function EncerramentoFormativo({
  cursistas = [],
  observacoes = [],
  tutores = [],
  userRole = 'admin',
  userEmail = '',
  onForceRefresh = null
}) {
  const cleanEmail = (userEmail || '').trim().toLowerCase();

  const [filtroTutor, setFiltroTutor] = useState(() => {
    if (userRole === 'tutor' && cleanEmail) {
      const matchTutor = tutores.find(t => 
        (t.email_educ && t.email_educ.toLowerCase() === cleanEmail) ||
        (t.email_adm && t.email_adm.toLowerCase() === cleanEmail)
      );
      return matchTutor?.tutor_responsavel || '';
    }
    return '';
  });

  const [filtroFormador, setFiltroFormador] = useState('');
  const [filtroCursista, setFiltroCursista] = useState('');
  const [filtroTema, setFiltroTema] = useState('todos'); // 'todos', 'tema6', 'tema7'
  const [filtroStatus, setFiltroStatus] = useState('todos'); // 'todos', 'concluido', 'parcial', 'pendente', 't6_pendente', 't7_pendente'
  const [selectedCursistaDetalhe, setSelectedCursistaDetalhe] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Paginação
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 25;

  // 1. Processamento e Consolidação dos Dados do 2º Semestre
  const { baseConsolidada, totalObs2SemCount, totalObsTema6Count, totalObsTema7Count } = useMemo(() => {
    const obs2Sem = observacoes.filter(isObs2Semestre);
    const mapaObsCursista = new Map();

    let countT6 = 0;
    let countT7 = 0;

    obs2Sem.forEach(obs => {
      const email = (obs.email_cursista || '').trim().toLowerCase();
      const nome = (obs.nome_cursista || '').trim().toUpperCase();
      const key = email || nome;
      if (!key) return;

      if (!mapaObsCursista.has(key)) {
        mapaObsCursista.set(key, { tema6: null, tema7: null, formador: obs.nome_formador, tutor: obs.tutor_responsavel });
      }

      const item = mapaObsCursista.get(key);
      const isRealizada = obs.is_realizada !== false && !String(obs.observacao_realizada || '').toLowerCase().startsWith('não');

      if (isTema6(obs.tema)) {
        countT6++;
        item.tema6 = {
          preenchido: isRealizada,
          data: obs.data_pratica || obs.data_observacao || obs.carimbo || '',
          formador: obs.nome_formador || '',
          temaOriginal: obs.tema,
          linkGravacao: obs.link_gravacao_pratica || '',
          linkPlanejamento: obs.link_planejamento || obs.link_pdp || '',
          observacao: obs
        };
      } else if (isTema7(obs.tema)) {
        countT7++;
        item.tema7 = {
          preenchido: isRealizada,
          data: obs.data_pratica || obs.data_observacao || obs.carimbo || '',
          formador: obs.nome_formador || '',
          temaOriginal: obs.tema,
          linkGravacao: obs.link_gravacao_pratica || '',
          linkPlanejamento: obs.link_planejamento || obs.link_pdp || '',
          observacao: obs
        };
      }

      if (obs.nome_formador && !item.formador) item.formador = obs.nome_formador;
      if (obs.tutor_responsavel && !item.tutor) item.tutor = obs.tutor_responsavel;
    });

    const cursistas2SemMap = new Map();

    // Filtra cursistas pertencentes ao 2º Semestre
    cursistas.forEach(c => {
      const email = (c['e-mail'] || c.email || c.email_cursista || '').trim().toLowerCase();
      const nome = (c.nome_cursista || c.nome || '').trim().toUpperCase();
      const key = email || nome;
      if (!key) return;

      const semRaw = String(c.semestre || '').toLowerCase();
      const turmaRaw = String(c.turma || c.turmas || '').toLowerCase();
      const temObs2Sem = mapaObsCursista.has(key);

      // Critério seguro para 2º Semestre (sem confundir "2º Ano" com 2º semestre)
      const pertence2Semestre =
        temObs2Sem ||
        semRaw.includes('2º sem') ||
        semRaw.includes('2 semestre') ||
        semRaw.includes('2ºsem') ||
        turmaRaw.includes('2sem') ||
        turmaRaw.includes('2º sem') ||
        turmaRaw.includes('2o sem');

      if (pertence2Semestre) {
        const obsData = mapaObsCursista.get(key) || { tema6: null, tema7: null };
        const formadorFinal = c.nome_formador || obsData.formador || 'Não atribuído';
        const tutorFinal = c.tutor_responsavel || obsData.tutor || 'Não atribuído';

        const t6Preenchido = obsData.tema6?.preenchido === true;
        const t7Preenchido = obsData.tema7?.preenchido === true;

        let statusGeral = 'pendente';
        if (t6Preenchido && t7Preenchido) statusGeral = 'concluido';
        else if (t6Preenchido || t7Preenchido) statusGeral = 'parcial';

        cursistas2SemMap.set(key, {
          key,
          nome_cursista: nome || 'NÃO INFORMADO',
          email_cursista: email,
          formador: formadorFinal,
          tutor: tutorFinal,
          nre: normalizeNre(c.nre_exe || c.nre_tutor || c.nre || ''),
          componente: c.componente || c.componente_conc || 'Geral',
          turma: c.turmas || c.turma || '',
          tema6: obsData.tema6,
          tema7: obsData.tema7,
          t6Preenchido,
          t7Preenchido,
          statusGeral
        });
      }
    });

    // Adiciona cursistas que constam na planilha de observações do 2º semestre
    mapaObsCursista.forEach((obsData, key) => {
      if (!cursistas2SemMap.has(key)) {
        const t6Preenchido = obsData.tema6?.preenchido === true;
        const t7Preenchido = obsData.tema7?.preenchido === true;
        let statusGeral = 'pendente';
        if (t6Preenchido && t7Preenchido) statusGeral = 'concluido';
        else if (t6Preenchido || t7Preenchido) statusGeral = 'parcial';

        const obsSample = obsData.tema6?.observacao || obsData.tema7?.observacao || {};

        cursistas2SemMap.set(key, {
          key,
          nome_cursista: (obsSample.nome_cursista || key).toUpperCase(),
          email_cursista: obsSample.email_cursista || (key.includes('@') ? key : ''),
          formador: obsData.formador || obsSample.nome_formador || 'Não informado',
          tutor: obsData.tutor || obsSample.tutor_responsavel || 'Não atribuído',
          nre: normalizeNre(obsSample.nre_exe || obsSample.nre || ''),
          componente: obsSample.componente || 'Geral',
          turma: obsSample.turma || '',
          tema6: obsData.tema6,
          tema7: obsData.tema7,
          t6Preenchido,
          t7Preenchido,
          statusGeral
        });
      }
    });

    return {
      baseConsolidada: Array.from(cursistas2SemMap.values()).sort((a, b) => a.nome_cursista.localeCompare(b.nome_cursista)),
      totalObs2SemCount: obs2Sem.length,
      totalObsTema6Count: countT6,
      totalObsTema7Count: countT7
    };
  }, [cursistas, observacoes]);

  // Filtros de busca
  const listaTutores = useMemo(() => {
    const setT = new Set();
    baseConsolidada.forEach(item => {
      if (item.tutor && item.tutor !== 'Não atribuído') setT.add(item.tutor);
    });
    return Array.from(setT).sort();
  }, [baseConsolidada]);

  const listaFormadores = useMemo(() => {
    const setF = new Set();
    baseConsolidada.forEach(item => {
      if (item.formador && item.formador !== 'Não atribuído') setF.add(item.formador);
    });
    return Array.from(setF).sort();
  }, [baseConsolidada]);

  // Aplicação dos filtros
  const dadosFiltrados = useMemo(() => {
    return baseConsolidada.filter(item => {
      if (filtroTutor && item.tutor !== filtroTutor) return false;
      if (filtroFormador && item.formador !== filtroFormador) return false;

      if (filtroCursista) {
        const busca = filtroCursista.toLowerCase();
        const matchNome = item.nome_cursista.toLowerCase().includes(busca);
        const matchEmail = item.email_cursista.toLowerCase().includes(busca);
        if (!matchNome && !matchEmail) return false;
      }

      if (filtroTema === 'tema6' && !item.t6Preenchido) return false;
      if (filtroTema === 'tema7' && !item.t7Preenchido) return false;

      if (filtroStatus === 'concluido' && item.statusGeral !== 'concluido') return false;
      if (filtroStatus === 'parcial' && item.statusGeral !== 'parcial') return false;
      if (filtroStatus === 'pendente' && item.statusGeral !== 'pendente') return false;
      if (filtroStatus === 't6_pendente' && item.t6Preenchido) return false;
      if (filtroStatus === 't7_pendente' && item.t7Preenchido) return false;

      return true;
    });
  }, [baseConsolidada, filtroTutor, filtroFormador, filtroCursista, filtroTema, filtroStatus]);

  // Indicadores
  const metricas = useMemo(() => {
    const total = dadosFiltrados.length;
    const t6Ok = dadosFiltrados.filter(d => d.t6Preenchido).length;
    const t7Ok = dadosFiltrados.filter(d => d.t7Preenchido).length;
    const cemOk = dadosFiltrados.filter(d => d.statusGeral === 'concluido').length;
    const pendentes = dadosFiltrados.filter(d => d.statusGeral === 'pendente').length;

    return {
      total,
      t6Ok,
      t6Pct: total > 0 ? Math.round((t6Ok / total) * 100) : 0,
      t7Ok,
      t7Pct: total > 0 ? Math.round((t7Ok / total) * 100) : 0,
      cemOk,
      cemPct: total > 0 ? Math.round((cemOk / total) * 100) : 0,
      pendentes
    };
  }, [dadosFiltrados]);

  // Paginação
  const totalPages = Math.ceil(dadosFiltrados.length / itemsPerPage) || 1;
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return dadosFiltrados.slice(start, start + itemsPerPage);
  }, [dadosFiltrados, currentPage, itemsPerPage]);

  const handleManualRefresh = async () => {
    if (!onForceRefresh) return;
    setIsRefreshing(true);
    try {
      await onForceRefresh();
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleExportCSV = () => {
    const headers = ['Cursista', 'E-mail Cursista', 'Formador', 'Tutor Responsável', 'NRE', 'Componente', 'Tema 6 Status', 'Tema 6 Data', 'Tema 7 Status', 'Tema 7 Data', 'Status Geral'];
    const rows = dadosFiltrados.map(d => [
      `"${d.nome_cursista}"`,
      `"${d.email_cursista}"`,
      `"${d.formador}"`,
      `"${d.tutor}"`,
      `"${d.nre}"`,
      `"${d.componente}"`,
      `"${d.t6Preenchido ? 'Preenchido' : 'Pendente'}"`,
      `"${d.tema6?.data || ''}"`,
      `"${d.t7Preenchido ? 'Preenchido' : 'Pendente'}"`,
      `"${d.tema7?.data || ''}"`,
      `"${d.statusGeral === 'concluido' ? '100% Concluído' : d.statusGeral === 'parcial' ? 'Parcial' : 'Pendente'}"`
    ]);

    const csvContent = '\uFEFF' + [headers.join(';'), ...rows.map(e => e.join(';'))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `encerramento_formativo_2sem_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="section-container animate-fade-in" style={{ padding: '1rem 1.5rem', maxWidth: '1440px', margin: '0 auto' }}>
      
      {/* Top Banner Informativo */}
      <div className="glass-panel" style={{
        padding: '1.25rem 1.75rem',
        marginBottom: '1.5rem',
        borderRadius: '12px',
        borderLeft: '5px solid #6366f1',
        background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '1rem',
        boxShadow: 'var(--shadow-sm)'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.3rem' }}>
            <h2 style={{ fontSize: '1.4rem', color: 'var(--color-primary-dark)', margin: 0, fontWeight: 800 }}>
              🎯 Encerramento Formativo (2º Semestre)
            </h2>
            <span style={{
              backgroundColor: '#6366f1',
              color: '#ffffff',
              fontSize: '0.72rem',
              fontWeight: 700,
              padding: '0.25rem 0.6rem',
              borderRadius: '20px',
              textTransform: 'uppercase'
            }}>
              Temas 6 e 7
            </span>
          </div>
          <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
            Verificação do preenchimento das observações pedagógicas realizadas pelos formadores para cada cursista.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', flexWrap: 'wrap' }}>
          {onForceRefresh && (
            <button
              onClick={handleManualRefresh}
              disabled={isRefreshing}
              style={{
                backgroundColor: '#ffffff',
                border: '1px solid #cbd5e1',
                borderRadius: '8px',
                padding: '0.5rem 0.9rem',
                fontSize: '0.82rem',
                fontWeight: 600,
                color: '#334155',
                cursor: isRefreshing ? 'wait' : 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
              }}
              title="Forçar recarga imediata das observações do banco TiDB Cloud"
            >
              <span style={{ display: 'inline-block', transform: isRefreshing ? 'rotate(360deg)' : 'none', transition: 'transform 0.6s' }}>🔄</span>
              {isRefreshing ? 'Atualizando...' : 'Recarregar Banco'}
            </button>
          )}

          <button
            onClick={() => window.print()}
            style={{
              backgroundColor: '#ffffff',
              border: '1px solid #cbd5e1',
              borderRadius: '8px',
              padding: '0.5rem 0.9rem',
              fontSize: '0.82rem',
              fontWeight: 600,
              color: '#334155',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
            }}
            title="Imprimir relatório"
          >
            🖨️ Imprimir
          </button>

          <button
            onClick={handleExportCSV}
            style={{
              backgroundColor: 'var(--color-accent-green)',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              padding: '0.5rem 1rem',
              fontSize: '0.82rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              boxShadow: '0 2px 4px rgba(16, 155, 25, 0.2)'
            }}
            title="Exportar planilha completa em formato CSV/Excel"
          >
            📊 Exportar Excel/CSV
          </button>
        </div>
      </div>

      {/* Alerta de Sincronização do Sheets */}
      {totalObs2SemCount === 0 && (
        <div style={{
          backgroundColor: '#eff6ff',
          border: '1px solid #bfdbfe',
          borderRadius: '10px',
          padding: '1rem 1.25rem',
          marginBottom: '1.5rem',
          display: 'flex',
          alignItems: 'flex-start',
          gap: '0.75rem',
          color: '#1e40af'
        }}>
          <span style={{ fontSize: '1.4rem', lineHeight: 1 }}>ℹ️</span>
          <div>
            <strong style={{ fontSize: '0.9rem', display: 'block', marginBottom: '0.2rem' }}>
              Observações do 2º Semestre ainda não sincronizadas na base do TiDB Cloud
            </strong>
            <p style={{ margin: 0, fontSize: '0.82rem', lineHeight: 1.5, color: '#3b82f6' }}>
              Para trazer as respostas mais recentes preenchidas pelos formadores nas planilhas externas (Google Forms), acesse sua Planilha Mestra no Google Sheets e clique em:<br />
              <strong>⚡ ESTÁGIO PROBATÓRIO ➔ 📋 Sincronizar Observações da Prática</strong>. Em seguida, clique no botão <strong>Recarregar Banco</strong> acima.
            </p>
          </div>
        </div>
      )}

      {/* Cards de Métricas (KPIs) */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        gap: '1rem',
        marginBottom: '1.5rem'
      }}>
        {/* Card 1 */}
        <div className="glass-panel" style={{
          padding: '1.25rem 1.5rem',
          borderRadius: '12px',
          borderLeft: '5px solid #0284c7',
          background: '#ffffff',
          boxShadow: 'var(--shadow-sm)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Cursistas no 2º Semestre
            </span>
            <span style={{ fontSize: '1.3rem' }}>👥</span>
          </div>
          <div style={{ fontSize: '1.9rem', fontWeight: 800, color: '#0f172a' }}>
            {metricas.total}
          </div>
          <small style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
            Base formativa selecionada
          </small>
        </div>

        {/* Card 2 */}
        <div className="glass-panel" style={{
          padding: '1.25rem 1.5rem',
          borderRadius: '12px',
          borderLeft: '5px solid #10b981',
          background: '#ffffff',
          boxShadow: 'var(--shadow-sm)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Tema 6 Preenchido
            </span>
            <span style={{ fontSize: '1.3rem' }}>📘</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
            <span style={{ fontSize: '1.9rem', fontWeight: 800, color: '#10b981' }}>{metricas.t6Ok}</span>
            <span style={{ fontSize: '0.9rem', fontWeight: 600, color: '#64748b' }}>({metricas.t6Pct}%)</span>
          </div>
          <div style={{ width: '100%', height: '6px', backgroundColor: '#e2e8f0', borderRadius: '3px', marginTop: '0.5rem', overflow: 'hidden' }}>
            <div style={{ width: `${metricas.t6Pct}%`, height: '100%', backgroundColor: '#10b981', transition: 'width 0.4s' }}></div>
          </div>
        </div>

        {/* Card 3 */}
        <div className="glass-panel" style={{
          padding: '1.25rem 1.5rem',
          borderRadius: '12px',
          borderLeft: '5px solid #06b6d4',
          background: '#ffffff',
          boxShadow: 'var(--shadow-sm)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Tema 7 Preenchido
            </span>
            <span style={{ fontSize: '1.3rem' }}>📗</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
            <span style={{ fontSize: '1.9rem', fontWeight: 800, color: '#06b6d4' }}>{metricas.t7Ok}</span>
            <span style={{ fontSize: '0.9rem', fontWeight: 600, color: '#64748b' }}>({metricas.t7Pct}%)</span>
          </div>
          <div style={{ width: '100%', height: '6px', backgroundColor: '#e2e8f0', borderRadius: '3px', marginTop: '0.5rem', overflow: 'hidden' }}>
            <div style={{ width: `${metricas.t7Pct}%`, height: '100%', backgroundColor: '#06b6d4', transition: 'width 0.4s' }}></div>
          </div>
        </div>

        {/* Card 4 */}
        <div className="glass-panel" style={{
          padding: '1.25rem 1.5rem',
          borderRadius: '12px',
          borderLeft: '5px solid #f59e0b',
          background: '#ffffff',
          boxShadow: 'var(--shadow-sm)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              100% Concluídos
            </span>
            <span style={{ fontSize: '1.3rem' }}>⭐</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
            <span style={{ fontSize: '1.9rem', fontWeight: 800, color: '#d97706' }}>{metricas.cemOk}</span>
            <span style={{ fontSize: '0.9rem', fontWeight: 600, color: '#64748b' }}>({metricas.cemPct}%)</span>
          </div>
          <small style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
            Ambos os formulários registrados
          </small>
        </div>
      </div>

      {/* Barra de Filtros Customizada */}
      <div className="glass-panel" style={{
        padding: '1rem 1.25rem',
        marginBottom: '1.5rem',
        borderRadius: '10px',
        backgroundColor: '#ffffff',
        border: '1px solid #e2e8f0',
        boxShadow: 'var(--shadow-sm)'
      }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.85rem' }}>
          {/* Filtro Tutor */}
          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '0.3rem' }}>
              👨‍🏫 Tutor Responsável:
            </label>
            <select
              value={filtroTutor}
              onChange={e => { setFiltroTutor(e.target.value); setCurrentPage(1); }}
              style={{
                width: '100%',
                padding: '0.45rem 0.65rem',
                fontSize: '0.82rem',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                backgroundColor: '#ffffff',
                color: '#1e293b'
              }}
            >
              <option value="">Todos os Tutores ({listaTutores.length})</option>
              {listaTutores.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          {/* Filtro Formador */}
          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '0.3rem' }}>
              🧑‍🏫 Formador:
            </label>
            <select
              value={filtroFormador}
              onChange={e => { setFiltroFormador(e.target.value); setCurrentPage(1); }}
              style={{
                width: '100%',
                padding: '0.45rem 0.65rem',
                fontSize: '0.82rem',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                backgroundColor: '#ffffff',
                color: '#1e293b'
              }}
            >
              <option value="">Todos os Formadores ({listaFormadores.length})</option>
              {listaFormadores.map(f => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
          </div>

          {/* Filtro Busca Cursista */}
          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '0.3rem' }}>
              🔍 Buscar Cursista:
            </label>
            <input
              type="text"
              placeholder="Digite o nome ou e-mail..."
              value={filtroCursista}
              onChange={e => { setFiltroCursista(e.target.value); setCurrentPage(1); }}
              style={{
                width: '100%',
                padding: '0.45rem 0.65rem',
                fontSize: '0.82rem',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                backgroundColor: '#ffffff',
                color: '#1e293b'
              }}
            />
          </div>

          {/* Filtro Status */}
          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '0.3rem' }}>
              ⚖️ Status de Preenchimento:
            </label>
            <select
              value={filtroStatus}
              onChange={e => { setFiltroStatus(e.target.value); setCurrentPage(1); }}
              style={{
                width: '100%',
                padding: '0.45rem 0.65rem',
                fontSize: '0.82rem',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                backgroundColor: '#ffffff',
                color: '#1e293b'
              }}
            >
              <option value="todos">Todos os Status</option>
              <option value="concluido">🟢 100% Concluído (Ambos Temas)</option>
              <option value="parcial">🟡 Parcial (Apenas 1 Tema)</option>
              <option value="pendente">🔴 Pendente (Nenhum Tema)</option>
              <option value="t6_pendente">⚠️ Tema 6 Pendente</option>
              <option value="t7_pendente">⚠️ Tema 7 Pendente</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tabela de Dados Formatada */}
      <div className="glass-panel" style={{
        backgroundColor: '#ffffff',
        borderRadius: '12px',
        border: '1px solid #e2e8f0',
        overflow: 'hidden',
        boxShadow: 'var(--shadow-sm)'
      }}>
        <div style={{
          padding: '1rem 1.25rem',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <span style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0f172a' }}>
            Cursistas do 2º Semestre ({dadosFiltrados.length})
          </span>
          <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
            Página {currentPage} de {totalPages}
          </span>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#64748b', fontSize: '0.74rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                <th style={{ padding: '0.85rem 1rem' }}>Cursista</th>
                <th style={{ padding: '0.85rem 1rem' }}>Formador</th>
                <th style={{ padding: '0.85rem 1rem' }}>Tutor</th>
                <th style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>Tema 6 (Gestão / Prática)</th>
                <th style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>Tema 7 (Encerramento)</th>
                <th style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {paginatedData.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ padding: '3rem 1rem', textAlign: 'center', color: '#94a3b8' }}>
                    <p style={{ fontSize: '1rem', fontWeight: 600, margin: '0 0 0.5rem 0', color: '#64748b' }}>
                      Nenhum cursista encontrado com os filtros selecionados.
                    </p>
                    <small>Tente limpar ou ajustar os filtros acima para expandir a lista.</small>
                  </td>
                </tr>
              ) : (
                paginatedData.map((c, idx) => (
                  <tr 
                    key={c.key} 
                    style={{ 
                      borderBottom: '1px solid #f1f5f9',
                      backgroundColor: idx % 2 === 0 ? '#ffffff' : '#fcfdfd'
                    }}
                  >
                    {/* Cursista */}
                    <td style={{ padding: '0.85rem 1rem' }}>
                      <div style={{ fontWeight: 700, color: '#0f172a' }}>{c.nome_cursista}</div>
                      <div style={{ fontSize: '0.76rem', color: '#64748b', marginTop: '0.15rem' }}>{c.email_cursista || 'Sem e-mail'}</div>
                      <span style={{
                        display: 'inline-block',
                        fontSize: '0.7rem',
                        fontWeight: 600,
                        backgroundColor: '#f1f5f9',
                        color: '#475569',
                        padding: '0.15rem 0.5rem',
                        borderRadius: '4px',
                        marginTop: '0.25rem'
                      }}>
                        {c.componente} • {c.nre}
                      </span>
                    </td>

                    {/* Formador */}
                    <td style={{ padding: '0.85rem 1rem', color: '#334155', fontWeight: 500 }}>
                      {c.formador}
                    </td>

                    {/* Tutor */}
                    <td style={{ padding: '0.85rem 1rem', color: '#475569' }}>
                      {c.tutor}
                    </td>

                    {/* Tema 6 */}
                    <td style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>
                      {c.t6Preenchido ? (
                        <div>
                          <span style={{
                            display: 'inline-block',
                            backgroundColor: '#dcfce7',
                            color: '#15803d',
                            border: '1px solid #bbf7d0',
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            padding: '0.2rem 0.55rem',
                            borderRadius: '12px'
                          }}>
                            ✓ Preenchido
                          </span>
                          {c.tema6?.data && (
                            <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '0.2rem' }}>
                              🗓️ {c.tema6.data}
                            </div>
                          )}
                          {c.tema6?.linkGravacao && (
                            <a 
                              href={c.tema6.linkGravacao} 
                              target="_blank" 
                              rel="noreferrer"
                              style={{
                                display: 'inline-block',
                                fontSize: '0.68rem',
                                color: '#0284c7',
                                textDecoration: 'none',
                                marginTop: '0.2rem',
                                fontWeight: 600
                              }}
                            >
                              🎥 Gravação
                            </a>
                          )}
                        </div>
                      ) : (
                        <span style={{
                          display: 'inline-block',
                          backgroundColor: '#fee2e2',
                          color: '#b91c1c',
                          border: '1px solid #fecaca',
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          padding: '0.2rem 0.55rem',
                          borderRadius: '12px'
                        }}>
                          ✕ Não Preenchido
                        </span>
                      )}
                    </td>

                    {/* Tema 7 */}
                    <td style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>
                      {c.t7Preenchido ? (
                        <div>
                          <span style={{
                            display: 'inline-block',
                            backgroundColor: '#dcfce7',
                            color: '#15803d',
                            border: '1px solid #bbf7d0',
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            padding: '0.2rem 0.55rem',
                            borderRadius: '12px'
                          }}>
                            ✓ Preenchido
                          </span>
                          {c.tema7?.data && (
                            <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '0.2rem' }}>
                              🗓️ {c.tema7.data}
                            </div>
                          )}
                          {c.tema7?.linkGravacao && (
                            <a 
                              href={c.tema7.linkGravacao} 
                              target="_blank" 
                              rel="noreferrer"
                              style={{
                                display: 'inline-block',
                                fontSize: '0.68rem',
                                color: '#0284c7',
                                textDecoration: 'none',
                                marginTop: '0.2rem',
                                fontWeight: 600
                              }}
                            >
                              🎥 Gravação
                            </a>
                          )}
                        </div>
                      ) : (
                        <span style={{
                          display: 'inline-block',
                          backgroundColor: '#fee2e2',
                          color: '#b91c1c',
                          border: '1px solid #fecaca',
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          padding: '0.2rem 0.55rem',
                          borderRadius: '12px'
                        }}>
                          ✕ Não Preenchido
                        </span>
                      )}
                    </td>

                    {/* Ações */}
                    <td style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>
                      <button
                        onClick={() => setSelectedCursistaDetalhe(c)}
                        style={{
                          backgroundColor: '#f1f5f9',
                          border: '1px solid #cbd5e1',
                          borderRadius: '6px',
                          padding: '0.35rem 0.65rem',
                          fontSize: '0.78rem',
                          fontWeight: 600,
                          color: '#0f172a',
                          cursor: 'pointer'
                        }}
                        title="Ver detalhes formativos completos"
                      >
                        🔍 Ver
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Paginação */}
        {totalPages > 1 && (
          <div style={{
            padding: '0.85rem 1.25rem',
            borderTop: '1px solid #e2e8f0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            backgroundColor: '#ffffff'
          }}>
            <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
              Mostrando {(currentPage - 1) * itemsPerPage + 1} a {Math.min(currentPage * itemsPerPage, dadosFiltrados.length)} de {dadosFiltrados.length} cursistas
            </span>
            <div style={{ display: 'flex', gap: '0.4rem' }}>
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                style={{
                  padding: '0.35rem 0.75rem',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  backgroundColor: currentPage === 1 ? '#f8fafc' : '#ffffff',
                  color: currentPage === 1 ? '#94a3b8' : '#334155',
                  cursor: currentPage === 1 ? 'not-allowed' : 'pointer'
                }}
              >
                Anterior
              </button>
              <span style={{ padding: '0.35rem 0.75rem', fontSize: '0.78rem', color: '#475569', fontWeight: 600 }}>
                {currentPage} / {totalPages}
              </span>
              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                style={{
                  padding: '0.35rem 0.75rem',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  backgroundColor: currentPage === totalPages ? '#f8fafc' : '#ffffff',
                  color: currentPage === totalPages ? '#94a3b8' : '#334155',
                  cursor: currentPage === totalPages ? 'not-allowed' : 'pointer'
                }}
              >
                Próxima
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal de Detalhes */}
      {selectedCursistaDetalhe && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.65)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '1rem'
        }}>
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '14px',
            maxWidth: '680px',
            width: '100%',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)',
            overflow: 'hidden'
          }}>
            <div style={{
              backgroundColor: '#1e3a8a',
              color: '#ffffff',
              padding: '1.25rem 1.5rem',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div>
                <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', opacity: 0.8, letterSpacing: '0.5px' }}>Dossiê de Encerramento</span>
                <h4 style={{ margin: '0.2rem 0 0 0', fontSize: '1.15rem', fontWeight: 700 }}>
                  {selectedCursistaDetalhe.nome_cursista}
                </h4>
              </div>
              <button
                onClick={() => setSelectedCursistaDetalhe(null)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#ffffff',
                  fontSize: '1.4rem',
                  cursor: 'pointer',
                  lineHeight: 1
                }}
              >
                ✕
              </button>
            </div>

            <div style={{ padding: '1.5rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1.25rem', fontSize: '0.85rem' }}>
                <div><strong>E-mail:</strong> {selectedCursistaDetalhe.email_cursista || 'Não informado'}</div>
                <div><strong>Componente:</strong> {selectedCursistaDetalhe.componente}</div>
                <div><strong>Formador:</strong> {selectedCursistaDetalhe.formador}</div>
                <div><strong>Tutor:</strong> {selectedCursistaDetalhe.tutor}</div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                {/* Tema 6 */}
                <div style={{ border: '1px solid #e2e8f0', borderRadius: '10px', padding: '1rem', backgroundColor: '#f8fafc' }}>
                  <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: '0.5rem', color: '#1e293b' }}>
                    📘 Tema 6
                  </div>
                  {selectedCursistaDetalhe.t6Preenchido ? (
                    <div>
                      <span style={{ color: '#16a34a', fontWeight: 700, fontSize: '0.8rem' }}>✓ Preenchido</span>
                      <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '0.3rem' }}>
                        <strong>Data:</strong> {selectedCursistaDetalhe.tema6?.data || 'Registrada'}
                      </div>
                      {selectedCursistaDetalhe.tema6?.linkGravacao && (
                        <div style={{ marginTop: '0.4rem' }}>
                          <a href={selectedCursistaDetalhe.tema6.linkGravacao} target="_blank" rel="noreferrer" style={{ fontSize: '0.78rem', color: '#0284c7' }}>
                            Abrir Gravação 🎥
                          </a>
                        </div>
                      )}
                      {selectedCursistaDetalhe.tema6?.linkPlanejamento && (
                        <div style={{ marginTop: '0.2rem' }}>
                          <a href={selectedCursistaDetalhe.tema6.linkPlanejamento} target="_blank" rel="noreferrer" style={{ fontSize: '0.78rem', color: '#0284c7' }}>
                            Abrir Planejamento 📄
                          </a>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div style={{ color: '#dc2626', fontSize: '0.8rem', fontWeight: 600 }}>
                      ✕ Nenhum formulário enviado pelo formador
                    </div>
                  )}
                </div>

                {/* Tema 7 */}
                <div style={{ border: '1px solid #e2e8f0', borderRadius: '10px', padding: '1rem', backgroundColor: '#f8fafc' }}>
                  <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: '0.5rem', color: '#1e293b' }}>
                    📗 Tema 7
                  </div>
                  {selectedCursistaDetalhe.t7Preenchido ? (
                    <div>
                      <span style={{ color: '#16a34a', fontWeight: 700, fontSize: '0.8rem' }}>✓ Preenchido</span>
                      <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '0.3rem' }}>
                        <strong>Data:</strong> {selectedCursistaDetalhe.tema7?.data || 'Registrada'}
                      </div>
                      {selectedCursistaDetalhe.tema7?.linkGravacao && (
                        <div style={{ marginTop: '0.4rem' }}>
                          <a href={selectedCursistaDetalhe.tema7.linkGravacao} target="_blank" rel="noreferrer" style={{ fontSize: '0.78rem', color: '#0284c7' }}>
                            Abrir Gravação 🎥
                          </a>
                        </div>
                      )}
                      {selectedCursistaDetalhe.tema7?.linkPlanejamento && (
                        <div style={{ marginTop: '0.2rem' }}>
                          <a href={selectedCursistaDetalhe.tema7.linkPlanejamento} target="_blank" rel="noreferrer" style={{ fontSize: '0.78rem', color: '#0284c7' }}>
                            Abrir Planejamento 📄
                          </a>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div style={{ color: '#dc2626', fontSize: '0.8rem', fontWeight: 600 }}>
                      ✕ Nenhum formulário enviado pelo formador
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div style={{ padding: '1rem 1.5rem', backgroundColor: '#f8fafc', borderTop: '1px solid #e2e8f0', textAlign: 'right' }}>
              <button
                onClick={() => setSelectedCursistaDetalhe(null)}
                style={{
                  backgroundColor: '#0f172a',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '0.5rem 1.25rem',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
