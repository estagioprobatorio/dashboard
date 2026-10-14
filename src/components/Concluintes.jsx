import React, { useState, useMemo } from 'react';
import { exportToCSV } from '../utils/exportUtils';

export default function Concluintes({ concluintes = [], cursistasAtivos = [], observacoes = [], userRole = null }) {
  const isAdmin = userRole === 'admin';
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedNre, setSelectedNre] = useState('');
  const [selectedComponente, setSelectedComponente] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(15);
  const [selectedCursista, setSelectedCursista] = useState(null);

  // Normalizador de texto para busca sem acentos
  const normalize = (str) => {
    if (!str) return '';
    return String(str).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
  };

  // Mapeamento indexado de observações por e-mail e por nome normalizado
  const { obsMapByEmail, obsMapByName } = useMemo(() => {
    const mapEmail = new Map();
    const mapName = new Map();

    observacoes.forEach(obs => {
      const email = (obs.email_cursista || '').trim().toLowerCase();
      const nomeNorm = normalize(obs.nome_cursista || '');

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
  }, [observacoes]);

  // Auditoria Matemática do Gargalo: Ativos vs Concluintes vs Órfãos
  const auditoriaMatematica = useMemo(() => {
    const totalBanco = observacoes.length;

    // Emails e Nomes de Ativos
    const emailsAtivos = new Set();
    const nomesAtivos = new Set();
    cursistasAtivos.forEach(c => {
      const em = (c['e-mail'] || c.email || c.email_cursista || '').trim().toLowerCase();
      const nm = normalize(c.nome_cursista || c.nome || '');
      if (em) emailsAtivos.add(em);
      if (nm) nomesAtivos.add(nm);
    });

    // Emails e Nomes de Concluintes
    const emailsConcluintes = new Set();
    const nomesConcluintes = new Set();
    concluintes.forEach(c => {
      const em = (c['e-mail'] || c.email || c.email_cursista || '').trim().toLowerCase();
      const nm = normalize(c.nome_cursista || c.nome || '');
      if (em) emailsConcluintes.add(em);
      if (nm) nomesConcluintes.add(nm);
    });

    let obsAtivosCount = 0;
    let obsConcluintesCount = 0;
    let obsOrfasCount = 0;

    observacoes.forEach(obs => {
      const email = (obs.email_cursista || '').trim().toLowerCase();
      const nomeNorm = normalize(obs.nome_cursista || '');

      const isAtivo = (email && emailsAtivos.has(email)) || (nomeNorm && nomesAtivos.has(nomeNorm));
      const isConcluinte = (email && emailsConcluintes.has(email)) || (nomeNorm && nomesConcluintes.has(nomeNorm));

      if (isAtivo) {
        obsAtivosCount++;
      } else if (isConcluinte) {
        obsConcluintesCount++;
      } else {
        obsOrfasCount++;
      }
    });

    const taxaResolvida = totalBanco > 0 
      ? Math.round(((obsAtivosCount + obsConcluintesCount) / totalBanco) * 100) 
      : 0;

    return {
      totalBanco,
      obsAtivosCount,
      obsConcluintesCount,
      obsOrfasCount,
      taxaResolvida
    };
  }, [observacoes, cursistasAtivos, concluintes]);

  // Enriquecer concluintes com o quantitativo de observações vinculadas
  const concluintesEnriquecidos = useMemo(() => {
    return concluintes.map(c => {
      const email = (c['e-mail'] || c.email || c.email_cursista || '').trim().toLowerCase();
      const nomeNorm = normalize(c.nome_cursista || c.nome || '');

      const encontradas = new Map();
      if (email && obsMapByEmail.has(email)) {
        obsMapByEmail.get(email).forEach(o => encontradas.set(o.id || o.id_origem, o));
      }
      if (nomeNorm && obsMapByName.has(nomeNorm)) {
        obsMapByName.get(nomeNorm).forEach(o => encontradas.set(o.id || o.id_origem, o));
      }

      const lista = Array.from(encontradas.values());
      const realizadas = lista.filter(o => o.is_realizada ?? o.observacao_realizada?.toLowerCase().includes('sim'));

      return {
        ...c,
        totalObservacoes: lista.length,
        totalRealizadas: realizadas.length,
        observacoesList: lista
      };
    });
  }, [concluintes, obsMapByEmail, obsMapByName]);

  // Lista de NREs e Componentes disponíveis para os filtros
  const { nresDisponiveis, componentesDisponiveis } = useMemo(() => {
    const nres = new Set();
    const comps = new Set();

    concluintes.forEach(c => {
      const nre = c.nre_exe || c.nre_tutor;
      if (nre) nres.add(nre.trim());
      if (c.componente) comps.add(c.componente.trim());
    });

    return {
      nresDisponiveis: Array.from(nres).sort((a, b) => a.localeCompare(b, 'pt-BR')),
      componentesDisponiveis: Array.from(comps).sort((a, b) => a.localeCompare(b, 'pt-BR'))
    };
  }, [concluintes]);

  // Aplicação dos Filtros
  const concluintesFiltrados = useMemo(() => {
    return concluintesEnriquecidos.filter(c => {
      if (searchTerm) {
        const termo = normalize(searchTerm);
        const matchNome = normalize(c.nome_cursista || c.nome).includes(termo);
        const matchCgm = String(c.cgm || '').includes(termo);
        const matchEmail = (c.email || c['e-mail'] || '').toLowerCase().includes(termo);
        if (!matchNome && !matchCgm && !matchEmail) return false;
      }

      if (selectedNre) {
        const nre = c.nre_exe || c.nre_tutor || '';
        if (nre.trim() !== selectedNre) return false;
      }

      if (selectedComponente && (c.componente || '').trim() !== selectedComponente) {
        return false;
      }

      return true;
    });
  }, [concluintesEnriquecidos, searchTerm, selectedNre, selectedComponente]);

  // Paginação
  const totalPages = Math.max(1, Math.ceil(concluintesFiltrados.length / itemsPerPage));
  const currentPageClamped = Math.min(Math.max(1, currentPage), totalPages);
  const concluintesPaginados = useMemo(() => {
    const start = (currentPageClamped - 1) * itemsPerPage;
    return concluintesFiltrados.slice(start, start + itemsPerPage);
  }, [concluintesFiltrados, currentPageClamped, itemsPerPage]);

  // Exportação CSV
  const handleExportCSV = () => {
    if (concluintesFiltrados.length === 0) {
      alert('Nenhum cursista concluinte para exportar.');
      return;
    }
    const cols = [
      { label: 'CGM', accessor: r => r.cgm || '-' },
      { label: 'Nome do Cursista', accessor: r => r.nome_cursista || r.nome || '-' },
      { label: 'E-mail', accessor: r => r.email || r['e-mail'] || '-' },
      { label: 'NRE', accessor: r => r.nre_exe || r.nre_tutor || '-' },
      { label: 'Município', accessor: r => r.munic_exe || '-' },
      { label: 'Componente Curricular', accessor: r => r.componente || '-' },
      { label: 'Turma', accessor: r => r.turmas || r.turma || '-' },
      { label: 'Chamamento', accessor: r => r.chamamento || '1º Chamamento' },
      { label: 'Observações Realizadas', accessor: r => r.totalRealizadas || 0 },
      { label: 'Total de Observações', accessor: r => r.totalObservacoes || 0 },
      { label: 'Situação', accessor: r => r.situacao || 'CONCLUÍDO' }
    ];
    exportToCSV('Cursistas_Concluintes_1CH', cols, concluintesFiltrados);
  };

  return (
    <div className="section-container animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      {/* HEADER INSTITUCIONAL SEED/PR */}
      <div 
        className="glass-panel" 
        style={{
          padding: '1.6rem',
          borderLeft: '5px solid #00984a',
          background: 'linear-gradient(135deg, #ffffff 0%, #f0fdf4 100%)',
          borderRadius: '12px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.35rem' }}>
          <span className="logo-badge" style={{ backgroundColor: '#002d5c', color: '#ffffff', fontWeight: 800 }}>
            SEED/PR • Estágio Probatório
          </span>
          <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#166534', backgroundColor: '#dcfce7', padding: '0.2rem 0.6rem', borderRadius: '4px' }}>
            Aba: CONCLUINTES-1CH
          </span>
        </div>

        <h2 style={{ fontSize: '1.5rem', color: '#002d5c', margin: 0, fontWeight: 800 }}>
          🎓 Cursistas Concluintes (1º Chamamento)
        </h2>
        <p style={{ margin: '0.3rem 0 0 0', fontSize: '0.9rem', color: '#475569', lineHeight: 1.5 }}>
          Registro oficial dos professores que já concluíram o ciclo formativo do Estágio Probatório. Este painel permite auditar a trajetória dos formados e conciliar o histórico geral de observações da rede.
        </p>
      </div>

      {/* PAINEL DE AUDITORIA E RECONCILIAÇÃO DO GARGALO MATEMÁTICO (EXCLUSIVO ADMINS) */}
      {isAdmin && (
        <>
          <div 
            className="glass-panel" 
            style={{
              padding: '1.4rem 1.6rem',
              borderRadius: '12px',
              borderTop: '4px solid #0072bc',
              background: '#ffffff',
              boxShadow: '0 4px 12px rgba(0, 45, 92, 0.05)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '1.3rem' }}>⚖️</span>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#002d5c' }}>
                    Reconciliação e Auditoria do Gargalo Matemático
                  </h3>
                  <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
                    Cruzamento das 17.906 observações do banco com Cursistas Ativos e Concluintes
                  </span>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#166534', backgroundColor: '#dcfce7', padding: '0.3rem 0.7rem', borderRadius: '6px' }}>
                  Taxa de Resolução: <b>{auditoriaMatematica.taxaResolvida}%</b>
                </span>
              </div>
            </div>

            {/* CARDS COMPARATIVOS */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '1rem', marginBottom: '1.2rem' }}>
              {/* Card 1: Ativos */}
              <div style={{ padding: '1rem', borderRadius: '8px', backgroundColor: '#f0f9ff', border: '1px solid #bae6fd' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#0284c7', textTransform: 'uppercase' }}>
                  1. Cursistas Ativos (2026)
                </span>
                <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#0369a1', margin: '0.2rem 0' }}>
                  {auditoriaMatematica.obsAtivosCount.toLocaleString('pt-BR')}
                </div>
                <span style={{ fontSize: '0.74rem', color: '#0284c7' }}>
                  Vinculadas aos {cursistasAtivos.length.toLocaleString('pt-BR')} cursistas ativos
                </span>
              </div>

              {/* Card 2: Concluintes */}
              <div style={{ padding: '1rem', borderRadius: '8px', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#16a34a', textTransform: 'uppercase' }}>
                  2. Concluintes (1º CH)
                </span>
                <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#15803d', margin: '0.2rem 0' }}>
                  {auditoriaMatematica.obsConcluintesCount.toLocaleString('pt-BR')}
                </div>
                <span style={{ fontSize: '0.74rem', color: '#16a34a' }}>
                  Recuperadas dos {concluintes.length.toLocaleString('pt-BR')} concluintes
                </span>
              </div>

              {/* Card 3: Órfãos / Erros de Digitação */}
              <div style={{ padding: '1rem', borderRadius: '8px', backgroundColor: '#fffbeb', border: '1px solid #fde68a' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#b45309', textTransform: 'uppercase' }}>
                  3. Divergências / Órfãos
                </span>
                <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#d97706', margin: '0.2rem 0' }}>
                  {auditoriaMatematica.obsOrfasCount.toLocaleString('pt-BR')}
                </div>
                <span style={{ fontSize: '0.74rem', color: '#b45309' }}>
                  E-mails com erro no Forms / Testes
                </span>
              </div>

              {/* Card 4: Total Geral */}
              <div style={{ padding: '1rem', borderRadius: '8px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                  Total Geral no Banco
                </span>
                <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#002d5c', margin: '0.2rem 0' }}>
                  {auditoriaMatematica.totalBanco.toLocaleString('pt-BR')}
                </div>
                <span style={{ fontSize: '0.74rem', color: '#64748b' }}>
                  Envios de formulário registrados
                </span>
              </div>
            </div>

            {/* BARRA DE PROGRESSO VISUAL DA COBERTURA */}
            <div style={{ width: '100%', height: '10px', backgroundColor: '#e2e8f0', borderRadius: '6px', overflow: 'hidden', display: 'flex' }}>
              <div 
                title={`Ativos: ${auditoriaMatematica.obsAtivosCount}`}
                style={{ 
                  width: `${(auditoriaMatematica.obsAtivosCount / (auditoriaMatematica.totalBanco || 1)) * 100}%`, 
                  backgroundColor: '#0284c7' 
                }} 
              />
              <div 
                title={`Concluintes: ${auditoriaMatematica.obsConcluintesCount}`}
                style={{ 
                  width: `${(auditoriaMatematica.obsConcluintesCount / (auditoriaMatematica.totalBanco || 1)) * 100}%`, 
                  backgroundColor: '#16a34a' 
                }} 
              />
              <div 
                title={`Divergências: ${auditoriaMatematica.obsOrfasCount}`}
                style={{ 
                  width: `${(auditoriaMatematica.obsOrfasCount / (auditoriaMatematica.totalBanco || 1)) * 100}%`, 
                  backgroundColor: '#f59e0b' 
                }} 
              />
            </div>
          </div>

          {/* SE A TABELA DE CONCLUINTES NO BANCO AINDA ESTIVER VAZIA, MOSTRA BANNER ORIENTADOR */}
          {concluintes.length === 0 && (
            <div 
              className="glass-panel animate-fade-in" 
              style={{
                padding: '1.5rem',
                borderRadius: '10px',
                backgroundColor: '#fffbeb',
                border: '2px dashed #f59e0b',
                display: 'flex',
                alignItems: 'center',
                gap: '1rem'
              }}
            >
              <span style={{ fontSize: '2rem' }}>💡</span>
              <div>
                <h4 style={{ margin: '0 0 0.3rem 0', color: '#92400e', fontSize: '1rem', fontWeight: 800 }}>
                  Tabela de Concluintes pronta no Dashboard!
                </h4>
                <p style={{ margin: 0, fontSize: '0.85rem', color: '#78350f', lineHeight: 1.4 }}>
                  A aba já está integrada e escutando o Supabase em tempo real. Para popular os cursistas concluintes, basta rodar a função <b>sincronizarConcluintesParaSupabase()</b> no Google Apps Script da sua planilha ou importar os dados na tabela <code>cursistas_concluintes</code>.
                </p>
              </div>
            </div>
          )}
        </>
      )}

      {/* FILTROS E PESQUISA */}
      <div 
        className="glass-panel" 
        style={{
          padding: '1.2rem',
          borderRadius: '10px',
          display: 'flex',
          gap: '1rem',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}
      >
        <div style={{ display: 'flex', gap: '0.8rem', flexWrap: 'wrap', flex: 1 }}>
          <input 
            type="text"
            placeholder="🔍 Buscar por Nome, CGM ou E-mail..."
            value={searchTerm}
            onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }}
            style={{
              padding: '0.55rem 0.9rem',
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              fontSize: '0.85rem',
              minWidth: '240px',
              flex: 1
            }}
          />

          <select 
            value={selectedNre}
            onChange={e => { setSelectedNre(e.target.value); setCurrentPage(1); }}
            style={{
              padding: '0.55rem 0.9rem',
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              fontSize: '0.85rem',
              backgroundColor: '#fff'
            }}
          >
            <option value="">Todos os NREs ({nresDisponiveis.length})</option>
            {nresDisponiveis.map(n => <option key={n} value={n}>{n}</option>)}
          </select>

          <select 
            value={selectedComponente}
            onChange={e => { setSelectedComponente(e.target.value); setCurrentPage(1); }}
            style={{
              padding: '0.55rem 0.9rem',
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              fontSize: '0.85rem',
              backgroundColor: '#fff'
            }}
          >
            <option value="">Todos os Componentes ({componentesDisponiveis.length})</option>
            {componentesDisponiveis.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
          <button 
            onClick={handleExportCSV}
            className="btn-secondary"
            style={{
              padding: '0.55rem 1rem',
              fontSize: '0.85rem',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              borderRadius: '6px'
            }}
          >
            📥 Exportar CSV ({concluintesFiltrados.length})
          </button>
        </div>
      </div>

      {/* TABELA DE CURSISTAS CONCLUINTES */}
      <div 
        className="glass-panel" 
        style={{
          padding: '0',
          borderRadius: '12px',
          overflow: 'hidden',
          backgroundColor: '#fff',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)'
        }}
      >
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.86rem' }}>
            <thead>
              <tr style={{ backgroundColor: '#002d5c', color: '#ffffff', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                <th style={{ padding: '0.85rem 1rem' }}>CGM</th>
                <th style={{ padding: '0.85rem 1rem' }}>Professor Cursista</th>
                <th style={{ padding: '0.85rem 1rem' }}>E-mail Institucional</th>
                <th style={{ padding: '0.85rem 1rem' }}>NRE / Município</th>
                <th style={{ padding: '0.85rem 1rem' }}>Componente</th>
                <th style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>Observações</th>
                <th style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>Situação</th>
              </tr>
            </thead>
            <tbody>
              {concluintesPaginados.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: '2.5rem', textAlign: 'center', color: '#64748b' }}>
                    {concluintes.length === 0 
                      ? 'Nenhum cursista concluinte cadastrado no banco. Execute a sincronização para carregar a aba CONCLUINTES-1CH.'
                      : 'Nenhum cursista concluinte corresponde aos filtros selecionados.'}
                  </td>
                </tr>
              ) : (
                concluintesPaginados.map((c, idx) => (
                  <tr 
                    key={c.id || c.cgm || idx} 
                    style={{
                      borderBottom: '1px solid #f1f5f9',
                      backgroundColor: idx % 2 === 0 ? '#ffffff' : '#f8fafc',
                      transition: 'background-color 0.15s ease'
                    }}
                  >
                    <td style={{ padding: '0.75rem 1rem', fontWeight: 700, color: '#334155' }}>
                      {c.cgm || '-'}
                    </td>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <div style={{ fontWeight: 800, color: '#002d5c' }}>
                        {c.nome_cursista || c.nome}
                      </div>
                      <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
                        Turma: {c.turmas || c.turma || 'Sem turma'} • {c.chamamento || '1º Chamamento'}
                      </span>
                    </td>
                    <td style={{ padding: '0.75rem 1rem', color: '#475569' }}>
                      {c.email || c['e-mail'] || '-'}
                    </td>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <div style={{ fontWeight: 600, color: '#1e293b' }}>
                        {c.nre_exe || c.nre_tutor || '-'}
                      </div>
                      <span style={{ fontSize: '0.74rem', color: '#64748b' }}>
                        {c.munic_exe || ''}
                      </span>
                    </td>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <span style={{ backgroundColor: '#e2e8f0', color: '#1e293b', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600 }}>
                        {c.componente || 'Geral'}
                      </span>
                    </td>
                    <td style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>
                      <span 
                        style={{
                          backgroundColor: c.totalObservacoes > 0 ? '#dcfce7' : '#f1f5f9',
                          color: c.totalObservacoes > 0 ? '#166534' : '#64748b',
                          padding: '0.25rem 0.65rem',
                          borderRadius: '12px',
                          fontWeight: 800,
                          fontSize: '0.8rem',
                          display: 'inline-block'
                        }}
                      >
                        {c.totalObservacoes} obs
                      </span>
                    </td>
                    <td style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>
                      <span style={{ backgroundColor: '#bbf7d0', color: '#14532d', padding: '0.25rem 0.65rem', borderRadius: '12px', fontWeight: 800, fontSize: '0.75rem' }}>
                        ✓ {c.situacao || 'CONCLUÍDO'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* CONTROLES DE PAGINAÇÃO */}
        {concluintesFiltrados.length > 0 && (
          <div style={{ padding: '0.9rem 1.25rem', backgroundColor: '#f8fafc', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div style={{ fontSize: '0.82rem', color: '#64748b' }}>
              Exibindo <b>{concluintesPaginados.length}</b> de <b>{concluintesFiltrados.length}</b> concluintes
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <select 
                value={itemsPerPage}
                onChange={e => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                style={{ padding: '0.35rem 0.6rem', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '0.8rem', backgroundColor: '#fff' }}
              >
                <option value={10}>10 por página</option>
                <option value={15}>15 por página</option>
                <option value={20}>20 por página</option>
                <option value={50}>50 por página</option>
              </select>

              <button 
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPageClamped <= 1}
                className="btn-secondary"
                style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}
              >
                ◀ Anterior
              </button>
              <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#334155' }}>
                Página {currentPageClamped} de {totalPages}
              </span>
              <button 
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPageClamped >= totalPages}
                className="btn-secondary"
                style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}
              >
                Próxima ▶
              </button>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
