import React, { useState, useMemo } from 'react';
import { normalizeNre } from '../utils/nreUtils';

/**
 * PAINEL DE ENCERRAMENTO FORMATIVO (TEMAS 6 E 7 - 2º SEMESTRE)
 * Permite a tutores e equipe acompanhar se os formadores preencheram as observações
 * de implementação dos Temas 6 e 7 para os cursistas do segundo semestre.
 */

const isObs2Semestre = (obs) => {
  if (!obs) return false;
  const sem = String(obs.semestre || '').toLowerCase();
  const id = String(obs.id_origem || obs.id || '').toUpperCase();
  const ano = String(obs.ano_formativo || '').toLowerCase();
  return sem.includes('2') || id.includes('2SEM') || ano.includes('2º semestre') || ano.includes('2sem');
};

const isTema6 = (tema) => /tema\s*6\b|^6[\s:-]/i.test(String(tema || ''));
const isTema7 = (tema) => /tema\s*7\b|^7[\s:-]/i.test(String(tema || ''));

export default function EncerramentoFormativo({
  cursistas = [],
  observacoes = [],
  tutores = [],
  userRole = 'admin',
  userEmail = ''
}) {
  const cleanEmail = (userEmail || '').trim().toLowerCase();

  // Estados dos Filtros
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

  // Paginação
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  // 1. Processamento e Consolidação dos Dados do 2º Semestre
  const baseConsolidada = useMemo(() => {
    // Mapa de observações do 2º Semestre por email do cursista
    const obs2Sem = observacoes.filter(isObs2Semestre);
    const mapaObsCursista = new Map();

    obs2Sem.forEach(obs => {
      const email = (obs.email_cursista || '').trim().toLowerCase();
      const nome = (obs.nome_cursista || '').trim().toUpperCase();
      const key = email || nome;
      if (!key) return;

      if (!mapaObsCursista.has(key)) {
        mapaObsCursista.set(key, { tema6: null, tema7: null, formador: obs.nome_formador, tutor: obs.tutor_responsavel });
      }

      const item = mapaObsCursista.get(key);
      const isRealizada = obs.is_realizada !== false && /sim/i.test(obs.observacao_realizada || 'Sim');

      if (isTema6(obs.tema)) {
        item.tema6 = {
          preenchido: isRealizada,
          data: obs.data_pratica || obs.data_observacao || obs.carimbo || '',
          formador: obs.nome_formador || '',
          linkGravacao: obs.link_gravacao_pratica || '',
          linkPlanejamento: obs.link_planejamento || obs.link_pdp || '',
          observacao: obs
        };
      } else if (isTema7(obs.tema)) {
        item.tema7 = {
          preenchido: isRealizada,
          data: obs.data_pratica || obs.data_observacao || obs.carimbo || '',
          formador: obs.nome_formador || '',
          linkGravacao: obs.link_gravacao_pratica || '',
          linkPlanejamento: obs.link_planejamento || obs.link_pdp || '',
          observacao: obs
        };
      }

      if (obs.nome_formador && !item.formador) item.formador = obs.nome_formador;
      if (obs.tutor_responsavel && !item.tutor) item.tutor = obs.tutor_responsavel;
    });

    // Cursistas pertencentes ao 2º Semestre (ativos ou com observações)
    const cursistas2SemMap = new Map();

    // 1º: Incluir cursistas da base ativa que são do 2º Semestre ou têm observação no 2º semestre
    cursistas.forEach(c => {
      const email = (c['e-mail'] || c.email || c.email_cursista || '').trim().toLowerCase();
      const nome = (c.nome_cursista || c.nome || '').trim().toUpperCase();
      const key = email || nome;
      if (!key) return;

      const sem = String(c.semestre || c.ano_formativo || '').toLowerCase();
      const turma = String(c.turma || c.turmas || '').toUpperCase();
      const temObs2Sem = mapaObsCursista.has(key);

      // Critério de inclusão do 2º Semestre:
      // se tem observação de 2º semestre OU registro indica 2º semestre
      if (temObs2Sem || sem.includes('2') || turma.includes('2SEM') || turma.includes('2º SEM')) {
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
          componente: c.componente || c.componente_conc || '',
          turma: c.turmas || c.turma || '',
          tema6: obsData.tema6,
          tema7: obsData.tema7,
          t6Preenchido,
          t7Preenchido,
          statusGeral
        });
      }
    });

    // 2º: Incluir eventuais cursistas que estavam na planilha de observação mas não constam na base ativa
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
          componente: obsSample.componente || '',
          turma: obsSample.turma || '',
          tema6: obsData.tema6,
          tema7: obsData.tema7,
          t6Preenchido,
          t7Preenchido,
          statusGeral
        });
      }
    });

    return Array.from(cursistas2SemMap.values()).sort((a, b) => a.nome_cursista.localeCompare(b.nome_cursista));
  }, [cursistas, observacoes]);

  // Listas de Opções para os Filtros
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

  // 2. Aplicação dos Filtros Selecionados
  const dadosFiltrados = useMemo(() => {
    return baseConsolidada.filter(item => {
      // Filtro por Tutor
      if (filtroTutor && item.tutor !== filtroTutor) return false;

      // Filtro por Formador
      if (filtroFormador && item.formador !== filtroFormador) return false;

      // Filtro por Cursista (busca rápida)
      if (filtroCursista) {
        const busca = filtroCursista.toLowerCase();
        const matchNome = item.nome_cursista.toLowerCase().includes(busca);
        const matchEmail = item.email_cursista.toLowerCase().includes(busca);
        if (!matchNome && !matchEmail) return false;
      }

      // Filtro por Tema
      if (filtroTema === 'tema6' && !item.t6Preenchido) return false;
      if (filtroTema === 'tema7' && !item.t7Preenchido) return false;

      // Filtro por Status
      if (filtroStatus === 'concluido' && item.statusGeral !== 'concluido') return false;
      if (filtroStatus === 'parcial' && item.statusGeral !== 'parcial') return false;
      if (filtroStatus === 'pendente' && item.statusGeral !== 'pendente') return false;
      if (filtroStatus === 't6_pendente' && item.t6Preenchido) return false;
      if (filtroStatus === 't7_pendente' && item.t7Preenchido) return false;

      return true;
    });
  }, [baseConsolidada, filtroTutor, filtroFormador, filtroCursista, filtroTema, filtroStatus]);

  // Métricas do Topo (KPIs)
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
  }, [dadosFiltrados, currentPage]);

  // Exportar para CSV
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

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(';'), ...rows.map(e => e.join(';'))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `encerramento_formativo_2sem_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="container-fluid p-4" style={{ maxWidth: '1440px', margin: '0 auto' }}>
      {/* Cabeçalho */}
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-4 pb-3 border-bottom">
        <div>
          <div className="d-flex align-items-center gap-2 mb-1">
            <span className="badge bg-primary px-3 py-2 text-uppercase fw-semibold" style={{ letterSpacing: '0.5px' }}>
              🎯 Gestão de Encerramento 2026.2
            </span>
            <span className="badge bg-light text-dark border">
              Apenas 2º Semestre
            </span>
          </div>
          <h2 className="fw-bold text-dark mb-1">Encerramento Formativo</h2>
          <p className="text-muted mb-0">
            Acompanhamento rigoroso de implementação dos <strong>Temas 6 e 7</strong> pelos formadores para cada cursista.
          </p>
        </div>

        <div className="d-flex gap-2 mt-2 mt-md-0">
          <button 
            type="button" 
            className="btn btn-outline-secondary d-flex align-items-center gap-2 shadow-sm"
            onClick={() => window.print()}
            title="Imprimir visualização atual"
          >
            🖨️ Imprimir
          </button>
          <button 
            type="button" 
            className="btn btn-success d-flex align-items-center gap-2 shadow-sm"
            onClick={handleExportCSV}
            title="Exportar planilha formatada em CSV/Excel"
          >
            📊 Exportar Excel/CSV
          </button>
        </div>
      </div>

      {/* Cartões de Indicadores Rápidos (KPIs) */}
      <div className="row g-3 mb-4">
        <div className="col-12 col-sm-6 col-lg-3">
          <div className="card shadow-sm border-0 h-100 p-3" style={{ borderLeft: '4px solid #0d6efd' }}>
            <div className="d-flex justify-content-between align-items-center">
              <div>
                <small className="text-muted text-uppercase fw-bold">Cursistas no 2º Sem</small>
                <h3 className="fw-bold text-primary mb-0 mt-1">{metricas.total}</h3>
              </div>
              <div className="bg-primary-subtle text-primary rounded-circle p-3 d-flex align-items-center justify-content-center" style={{ width: '48px', height: '48px', fontSize: '1.25rem' }}>
                👥
              </div>
            </div>
            <small className="text-muted mt-2 d-block">Base formativa ativa</small>
          </div>
        </div>

        <div className="col-12 col-sm-6 col-lg-3">
          <div className="card shadow-sm border-0 h-100 p-3" style={{ borderLeft: '4px solid #198754' }}>
            <div className="d-flex justify-content-between align-items-center">
              <div>
                <small className="text-muted text-uppercase fw-bold">Tema 6 Preenchido</small>
                <h3 className="fw-bold text-success mb-0 mt-1">{metricas.t6Ok} <small className="fs-6 text-muted">({metricas.t6Pct}%)</small></h3>
              </div>
              <div className="bg-success-subtle text-success rounded-circle p-3 d-flex align-items-center justify-content-center" style={{ width: '48px', height: '48px', fontSize: '1.25rem' }}>
                📘
              </div>
            </div>
            <div className="progress mt-2" style={{ height: '6px' }}>
              <div className="progress-bar bg-success" style={{ width: `${metricas.t6Pct}%` }}></div>
            </div>
          </div>
        </div>

        <div className="col-12 col-sm-6 col-lg-3">
          <div className="card shadow-sm border-0 h-100 p-3" style={{ borderLeft: '4px solid #0dcaf0' }}>
            <div className="d-flex justify-content-between align-items-center">
              <div>
                <small className="text-muted text-uppercase fw-bold">Tema 7 Preenchido</small>
                <h3 className="fw-bold text-info mb-0 mt-1">{metricas.t7Ok} <small className="fs-6 text-muted">({metricas.t7Pct}%)</small></h3>
              </div>
              <div className="bg-info-subtle text-info rounded-circle p-3 d-flex align-items-center justify-content-center" style={{ width: '48px', height: '48px', fontSize: '1.25rem' }}>
                📗
              </div>
            </div>
            <div className="progress mt-2" style={{ height: '6px' }}>
              <div className="progress-bar bg-info" style={{ width: `${metricas.t7Pct}%` }}></div>
            </div>
          </div>
        </div>

        <div className="col-12 col-sm-6 col-lg-3">
          <div className="card shadow-sm border-0 h-100 p-3" style={{ borderLeft: '4px solid #ffc107' }}>
            <div className="d-flex justify-content-between align-items-center">
              <div>
                <small className="text-muted text-uppercase fw-bold">100% Concluídos</small>
                <h3 className="fw-bold text-warning-emphasis mb-0 mt-1">{metricas.cemOk} <small className="fs-6 text-muted">({metricas.cemPct}%)</small></h3>
              </div>
              <div className="bg-warning-subtle text-warning-emphasis rounded-circle p-3 d-flex align-items-center justify-content-center" style={{ width: '48px', height: '48px', fontSize: '1.25rem' }}>
                ⭐
              </div>
            </div>
            <small className="text-muted mt-2 d-block">Ambos os temas implementados</small>
          </div>
        </div>
      </div>

      {/* Barra de Filtros */}
      <div className="card shadow-sm border-0 mb-4">
        <div className="card-body p-3 bg-light rounded">
          <div className="row g-2 align-items-end">
            {/* Filtro por Tutor */}
            <div className="col-12 col-md-3">
              <label className="form-label small fw-bold text-secondary mb-1">👨‍🏫 Tutor Responsável:</label>
              <select 
                className="form-select form-select-sm"
                value={filtroTutor}
                onChange={e => { setFiltroTutor(e.target.value); setCurrentPage(1); }}
              >
                <option value="">Todos os Tutores ({listaTutores.length})</option>
                {listaTutores.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            {/* Filtro por Formador */}
            <div className="col-12 col-md-3">
              <label className="form-label small fw-bold text-secondary mb-1">🧑‍🏫 Formador:</label>
              <select 
                className="form-select form-select-sm"
                value={filtroFormador}
                onChange={e => { setFiltroFormador(e.target.value); setCurrentPage(1); }}
              >
                <option value="">Todos os Formadores ({listaFormadores.length})</option>
                {listaFormadores.map(f => (
                  <option key={f} value={f}>{f}</option>
                ))}
              </select>
            </div>

            {/* Filtro por Cursista (Busca) */}
            <div className="col-12 col-md-3">
              <label className="form-label small fw-bold text-secondary mb-1">🔍 Buscar Cursista:</label>
              <input 
                type="text"
                className="form-control form-control-sm"
                placeholder="Nome ou e-mail..."
                value={filtroCursista}
                onChange={e => { setFiltroCursista(e.target.value); setCurrentPage(1); }}
              />
            </div>

            {/* Filtro por Status */}
            <div className="col-12 col-md-3">
              <label className="form-label small fw-bold text-secondary mb-1">⚖️ Status de Preenchimento:</label>
              <select 
                className="form-select form-select-sm"
                value={filtroStatus}
                onChange={e => { setFiltroStatus(e.target.value); setCurrentPage(1); }}
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
      </div>

      {/* Tabela de Resultados */}
      <div className="card shadow-sm border-0">
        <div className="card-header bg-white py-3 d-flex justify-content-between align-items-center">
          <h5 className="mb-0 fw-bold text-dark">
            Listagem de Cursistas do 2º Semestre ({dadosFiltrados.length})
          </h5>
          <span className="small text-muted">
            Página {currentPage} de {totalPages}
          </span>
        </div>

        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0" style={{ fontSize: '0.875rem' }}>
            <thead className="table-light text-secondary text-uppercase" style={{ fontSize: '0.75rem', letterSpacing: '0.5px' }}>
              <tr>
                <th style={{ width: '22%' }}>Cursista</th>
                <th style={{ width: '18%' }}>Formador</th>
                <th style={{ width: '16%' }}>Tutor</th>
                <th style={{ width: '18%' }} className="text-center">Tema 6 (Gestão / Prática)</th>
                <th style={{ width: '18%' }} className="text-center">Tema 7 (Encerramento)</th>
                <th style={{ width: '8%' }} className="text-center">Ações</th>
              </tr>
            </thead>
            <tbody>
              {paginatedData.length === 0 ? (
                <tr>
                  <td colSpan="6" className="text-center py-5 text-muted">
                    <p className="fs-5 mb-1">Nenhum cursista encontrado com os filtros selecionados.</p>
                    <small>Tente limpar os filtros acima para expandir os resultados.</small>
                  </td>
                </tr>
              ) : (
                paginatedData.map(c => (
                  <tr key={c.key}>
                    <td>
                      <div className="fw-bold text-dark">{c.nome_cursista}</div>
                      <small className="text-muted d-block">{c.email_cursista || 'E-mail não informado'}</small>
                      <small className="badge bg-light text-secondary border mt-1">{c.componente || 'Geral'} • {c.nre || 'PR'}</small>
                    </td>

                    <td>
                      <div className="fw-semibold text-secondary">{c.formador}</div>
                    </td>

                    <td>
                      <div className="text-secondary">{c.tutor}</div>
                    </td>

                    {/* Coluna Tema 6 */}
                    <td className="text-center">
                      {c.t6Preenchido ? (
                        <div>
                          <span className="badge bg-success-subtle text-success border border-success-subtle px-2 py-1">
                            ✓ Preenchido
                          </span>
                          {c.tema6?.data && (
                            <small className="d-block text-muted mt-1" style={{ fontSize: '0.75rem' }}>
                              🗓️ {c.tema6.data}
                            </small>
                          )}
                          {c.tema6?.linkGravacao && (
                            <a 
                              href={c.tema6.linkGravacao} 
                              target="_blank" 
                              rel="noreferrer"
                              className="badge bg-light text-primary border text-decoration-none mt-1 d-inline-block"
                              style={{ fontSize: '0.7rem' }}
                            >
                              🎥 Gravação
                            </a>
                          )}
                        </div>
                      ) : (
                        <span className="badge bg-danger-subtle text-danger border border-danger-subtle px-2 py-1">
                          ✕ Não Preenchido
                        </span>
                      )}
                    </td>

                    {/* Coluna Tema 7 */}
                    <td className="text-center">
                      {c.t7Preenchido ? (
                        <div>
                          <span className="badge bg-success-subtle text-success border border-success-subtle px-2 py-1">
                            ✓ Preenchido
                          </span>
                          {c.tema7?.data && (
                            <small className="d-block text-muted mt-1" style={{ fontSize: '0.75rem' }}>
                              🗓️ {c.tema7.data}
                            </small>
                          )}
                          {c.tema7?.linkGravacao && (
                            <a 
                              href={c.tema7.linkGravacao} 
                              target="_blank" 
                              rel="noreferrer"
                              className="badge bg-light text-primary border text-decoration-none mt-1 d-inline-block"
                              style={{ fontSize: '0.7rem' }}
                            >
                              🎥 Gravação
                            </a>
                          )}
                        </div>
                      ) : (
                        <span className="badge bg-danger-subtle text-danger border border-danger-subtle px-2 py-1">
                          ✕ Não Preenchido
                        </span>
                      )}
                    </td>

                    {/* Ações */}
                    <td className="text-center">
                      <button 
                        type="button" 
                        className="btn btn-sm btn-outline-primary"
                        onClick={() => setSelectedCursistaDetalhe(c)}
                        title="Ver detalhes completos das observações"
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

        {/* Rodapé com Paginação */}
        {totalPages > 1 && (
          <div className="card-footer bg-white d-flex justify-content-between align-items-center py-3">
            <span className="small text-muted">
              Mostrando {(currentPage - 1) * itemsPerPage + 1} a {Math.min(currentPage * itemsPerPage, dadosFiltrados.length)} de {dadosFiltrados.length} cursistas
            </span>
            <div className="btn-group btn-group-sm">
              <button 
                type="button" 
                className="btn btn-outline-secondary" 
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              >
                Anterior
              </button>
              <button type="button" className="btn btn-outline-secondary disabled">
                {currentPage} / {totalPages}
              </button>
              <button 
                type="button" 
                className="btn btn-outline-secondary" 
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              >
                Próxima
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal de Detalhes do Cursista */}
      {selectedCursistaDetalhe && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1050 }}>
          <div className="modal-dialog modal-lg modal-dialog-centered">
            <div className="modal-content shadow border-0">
              <div className="modal-header bg-primary text-white">
                <h5 className="modal-title fw-bold">
                  Detalhes Formativos: {selectedCursistaDetalhe.nome_cursista}
                </h5>
                <button 
                  type="button" 
                  className="btn-close btn-close-white" 
                  onClick={() => setSelectedCursistaDetalhe(null)}
                ></button>
              </div>
              <div className="modal-body p-4">
                <div className="row g-3 mb-4">
                  <div className="col-md-6">
                    <p className="mb-1"><strong>E-mail:</strong> {selectedCursistaDetalhe.email_cursista || 'Não informado'}</p>
                    <p className="mb-1"><strong>Componente:</strong> {selectedCursistaDetalhe.componente || 'Geral'}</p>
                    <p className="mb-0"><strong>NRE:</strong> {selectedCursistaDetalhe.nre || 'Não informado'}</p>
                  </div>
                  <div className="col-md-6">
                    <p className="mb-1"><strong>Formador:</strong> {selectedCursistaDetalhe.formador}</p>
                    <p className="mb-1"><strong>Tutor:</strong> {selectedCursistaDetalhe.tutor}</p>
                    <p className="mb-0">
                      <strong>Status Geral: </strong>
                      {selectedCursistaDetalhe.statusGeral === 'concluido' ? (
                        <span className="badge bg-success">100% Concluído</span>
                      ) : selectedCursistaDetalhe.statusGeral === 'parcial' ? (
                        <span className="badge bg-warning text-dark">Parcial (1 Tema)</span>
                      ) : (
                        <span className="badge bg-danger">Pendente (0 Temas)</span>
                      )}
                    </p>
                  </div>
                </div>

                <div className="row g-3">
                  {/* Detalhes Tema 6 */}
                  <div className="col-md-6">
                    <div className="card h-100 border">
                      <div className="card-header bg-light fw-bold">
                        📘 Tema 6
                      </div>
                      <div className="card-body">
                        {selectedCursistaDetalhe.t6Preenchido ? (
                          <>
                            <p className="text-success fw-bold mb-2">✓ Formulário Preenchido pelo Formador</p>
                            <p className="small mb-1"><strong>Data:</strong> {selectedCursistaDetalhe.tema6?.data || 'Não informada'}</p>
                            {selectedCursistaDetalhe.tema6?.linkGravacao && (
                              <p className="small mb-1">
                                <strong>Gravação: </strong> 
                                <a href={selectedCursistaDetalhe.tema6.linkGravacao} target="_blank" rel="noreferrer">
                                  Abrir Link
                                </a>
                              </p>
                            )}
                            {selectedCursistaDetalhe.tema6?.linkPlanejamento && (
                              <p className="small mb-0">
                                <strong>Planejamento/PDP: </strong> 
                                <a href={selectedCursistaDetalhe.tema6.linkPlanejamento} target="_blank" rel="noreferrer">
                                  Abrir Documento
                                </a>
                              </p>
                            )}
                          </>
                        ) : (
                          <div className="text-danger py-3 text-center">
                            <p className="fw-bold mb-1">❌ Não Preenchido</p>
                            <small className="text-muted">Nenhum formulário de Tema 6 foi enviado pelo formador.</small>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Detalhes Tema 7 */}
                  <div className="col-md-6">
                    <div className="card h-100 border">
                      <div className="card-header bg-light fw-bold">
                        📗 Tema 7
                      </div>
                      <div className="card-body">
                        {selectedCursistaDetalhe.t7Preenchido ? (
                          <>
                            <p className="text-success fw-bold mb-2">✓ Formulário Preenchido pelo Formador</p>
                            <p className="small mb-1"><strong>Data:</strong> {selectedCursistaDetalhe.tema7?.data || 'Não informada'}</p>
                            {selectedCursistaDetalhe.tema7?.linkGravacao && (
                              <p className="small mb-1">
                                <strong>Gravação: </strong> 
                                <a href={selectedCursistaDetalhe.tema7.linkGravacao} target="_blank" rel="noreferrer">
                                  Abrir Link
                                </a>
                              </p>
                            )}
                            {selectedCursistaDetalhe.tema7?.linkPlanejamento && (
                              <p className="small mb-0">
                                <strong>Planejamento/PDP: </strong> 
                                <a href={selectedCursistaDetalhe.tema7.linkPlanejamento} target="_blank" rel="noreferrer">
                                  Abrir Documento
                                </a>
                              </p>
                            )}
                          </>
                        ) : (
                          <div className="text-danger py-3 text-center">
                            <p className="fw-bold mb-1">❌ Não Preenchido</p>
                            <small className="text-muted">Nenhum formulário de Tema 7 foi enviado pelo formador.</small>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => setSelectedCursistaDetalhe(null)}
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
