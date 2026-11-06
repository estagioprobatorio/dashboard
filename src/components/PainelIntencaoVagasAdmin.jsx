import React, { useState, useMemo } from 'react';
import IntencaoMatricula2027, { calcularEvolucaoCursista2027 } from './IntencaoMatricula2027';

export default function PainelIntencaoVagasAdmin({ records = [], userRole, userEmail }) {
  const [busca, setBusca] = useState('');
  const [filtroChamamento, setFiltroChamamento] = useState('todos');
  const [filtroDemanda, setFiltroDemanda] = useState('todas');
  const [filtroNre, setFiltroNre] = useState('todos');
  const [pagina, setPagina] = useState(1);
  const itensPorPagina = 12;

  // Estado da Simulação da View do Cursista
  const [cursistaSimulado, setCursistaSimulado] = useState(null);

  // Lista única de NREs para filtro
  const nresDisponiveis = useMemo(() => {
    return Array.from(new Set(records.map(r => r.nre_exe || r.nre).filter(Boolean))).sort();
  }, [records]);

  // Enriquecer registros com o cálculo de evolução individual
  const recordsComEvolucao = useMemo(() => {
    return records.map(r => {
      const evolucao = calcularEvolucaoCursista2027(r);
      return {
        ...r,
        evolucao
      };
    });
  }, [records]);

  // KPIs de Demanda e Avanço para 2027 (Sem parênteses)
  const metricas = useMemo(() => {
    let total = recordsComEvolucao.length;
    let encerramDez26 = 0; // 2º chamamento
    let encerrados1Cham = 0; // 1º chamamento
    let demanda2e3Ano = 0; // 3º, 4º e 5º chamamento
    let demanda1Ano = 0; // 6º chamamento

    recordsComEvolucao.forEach(r => {
      const num = r.evolucao.numChamamento;
      if (num === 1) encerrados1Cham++;
      else if (num === 2) encerramDez26++;
      else if (num === 3 || num === 4 || num === 5) demanda2e3Ano++;
      else if (num === 6) demanda1Ano++;
    });

    let intencoesGravadas = 0;
    try {
      const raw = localStorage.getItem('intencoes_2027_todas');
      if (raw) {
        const parsed = JSON.parse(raw);
        intencoesGravadas = Array.isArray(parsed) ? parsed.length : 0;
      }
    } catch (e) {
      console.error(e);
    }

    return {
      total,
      encerrados1Cham,
      encerramDez26,
      demanda2e3Ano,
      demanda1Ano,
      intencoesGravadas
    };
  }, [recordsComEvolucao]);

  // Filtragem dos registros da tabela
  const registrosFiltrados = useMemo(() => {
    let list = [...recordsComEvolucao];

    if (filtroChamamento !== 'todos') {
      const numFiltro = parseInt(filtroChamamento, 10);
      list = list.filter(r => r.evolucao.numChamamento === numFiltro);
    }

    if (filtroDemanda !== 'todas') {
      if (filtroDemanda === 'demanda_2_3') {
        list = list.filter(r => r.evolucao.status2027 === 'precisa_turma_2_3_ano');
      } else if (filtroDemanda === 'demanda_1') {
        list = list.filter(r => r.evolucao.status2027 === 'precisa_turma_1_ano');
      } else if (filtroDemanda === 'encerra_dez') {
        list = list.filter(r => r.evolucao.status2027 === 'encerra_dezembro_2026');
      } else if (filtroDemanda === 'encerrados') {
        list = list.filter(r => r.evolucao.status2027 === 'encerrado');
      }
    }

    if (filtroNre !== 'todos') {
      list = list.filter(r => (r.nre_exe || r.nre) === filtroNre);
    }

    if (busca.trim()) {
      const q = busca.toLowerCase().trim();
      list = list.filter(r => {
        const nome = String(r.nome || r.nome_cursista || '').toLowerCase();
        const cgm = String(r.cgm || '').toLowerCase();
        const turma = String(r.turmas || r.turma || '').toLowerCase();
        const comp = String(r.componente_conc || r.componente || '').toLowerCase();
        return nome.includes(q) || cgm.includes(q) || turma.includes(q) || comp.includes(q);
      });
    }

    return list;
  }, [recordsComEvolucao, filtroChamamento, filtroDemanda, filtroNre, busca]);

  const totalPaginas = Math.ceil(registrosFiltrados.length / itensPorPagina) || 1;
  const paginados = registrosFiltrados.slice((pagina - 1) * itensPorPagina, pagina * itensPorPagina);

  return (
    <div className="glass-panel animate-fade-in" style={{ padding: '1.5rem', width: '100%', boxSizing: 'border-box' }}>
      
      {/* ── BANNER GERENCIAL DE PROJEÇÃO 2027 (Sem botão de simulação disponível) ── */}
      <div style={{
        background: 'linear-gradient(135deg, #001d3d 0%, #002d5c 60%, #0072bc 100%)',
        borderRadius: '16px',
        padding: '1.75rem 2rem',
        color: '#ffffff',
        marginBottom: '1.5rem',
        boxShadow: '0 8px 24px rgba(0, 29, 61, 0.2)',
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '1rem'
      }}>
        <div style={{ flex: '1 1 340px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.4rem' }}>
            <span style={{ fontSize: '1.6rem' }}>📋</span>
            <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800, letterSpacing: '-0.02em' }}>
              Gestão de Intenção de Vagas · 2027/1
            </h1>
            <span style={{
              background: 'rgba(255,255,255,0.18)',
              padding: '0.2rem 0.65rem',
              borderRadius: '999px',
              fontSize: '0.75rem',
              fontWeight: 800,
              textTransform: 'uppercase'
            }}>
              Planejamento da Rede
            </span>
          </div>
          <p style={{ margin: 0, fontSize: '0.88rem', color: 'rgba(255, 255, 255, 0.88)', lineHeight: 1.45 }}>
            Controle de avanço e evolução individual por chamamento. Projeção de demanda para turmas de 1º Ano e 2º/3º Ano no 1º semestre de 2027.
          </p>
        </div>
      </div>

      {/* ── CARDS DE METRICAS E PROJEÇÃO POR CHAMAMENTO (SEM PARÊNTESES) ── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '1rem',
        marginBottom: '1.5rem'
      }}>
        {/* Total */}
        <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '1rem 1.25rem', border: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Total de Cursistas</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#001d3d', marginTop: '0.2rem' }}>{metricas.total}</div>
          <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '0.2rem' }}>Docentes na base ativa</div>
        </div>

        {/* 1º Chamamento: Concluídos (Sem parênteses) */}
        <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '1rem 1.25rem', border: '1px solid #e2e8f0', borderLeft: '4px solid #00984a' }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#00984a', textTransform: 'uppercase' }}>1º Chamamento</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#00984a', marginTop: '0.2rem' }}>{metricas.encerrados1Cham}</div>
          <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '0.2rem' }}>Ciclo encerrado · Sem vaga em 2027</div>
        </div>

        {/* 2º Chamamento: Encerra Dez/26 (Sem parênteses) */}
        <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '1rem 1.25rem', border: '1px solid #e2e8f0', borderLeft: '4px solid #00984a' }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#00984a', textTransform: 'uppercase' }}>2º Chamamento</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#00984a', marginTop: '0.2rem' }}>{metricas.encerramDez26}</div>
          <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '0.2rem' }}>Conclusão regular ao fim de 2026</div>
        </div>

        {/* 3º, 4º e 5º Chamamento (Sem parênteses) */}
        <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '1rem 1.25rem', border: '1px solid #bae6fd', borderLeft: '4px solid #0072bc' }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#0072bc', textTransform: 'uppercase' }}>3º, 4º e 5º Chamamento</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#0072bc', marginTop: '0.2rem' }}>{metricas.demanda2e3Ano}</div>
          <div style={{ fontSize: '0.72rem', color: '#0284c7', marginTop: '0.2rem', fontWeight: 600 }}>Demanda para turmas de 2º e 3º ano</div>
        </div>

        {/* 6º Chamamento (Sem parênteses) */}
        <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '1rem 1.25rem', border: '1px solid #bae6fd', borderLeft: '4px solid #0284c7' }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#0284c7', textTransform: 'uppercase' }}>6º Chamamento</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#0284c7', marginTop: '0.2rem' }}>{metricas.demanda1Ano}</div>
          <div style={{ fontSize: '0.72rem', color: '#0284c7', marginTop: '0.2rem', fontWeight: 600 }}>Demanda para turmas de 1º ano</div>
        </div>

        {/* Intenções já enviadas */}
        <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '1rem 1.25rem', border: '1px solid #e2e8f0', borderLeft: '4px solid #f59e0b' }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#b45309', textTransform: 'uppercase' }}>Intenções Registradas</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#b45309', marginTop: '0.2rem' }}>{metricas.intencoesGravadas}</div>
          <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '0.2rem' }}>Manifestações salvas no sistema</div>
        </div>
      </div>

      {/* ── BARRA DE FILTROS E BUSCA (SEM PARÊNTESES) ── */}
      <div style={{
        backgroundColor: '#ffffff',
        borderRadius: '12px',
        padding: '1.25rem',
        border: '1px solid #e2e8f0',
        marginBottom: '1.25rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.85rem'
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '0.75rem',
          alignItems: 'end'
        }}>
          {/* Filtro de Chamamento (Sem parênteses) */}
          <div>
            <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 800, color: '#475569', marginBottom: '0.3rem' }}>
              CHAMAMENTO
            </label>
            <select
              value={filtroChamamento}
              onChange={e => { setFiltroChamamento(e.target.value); setPagina(1); }}
              style={{ width: '100%', padding: '0.55rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.82rem' }}
            >
              <option value="todos">Todos os Chamamentos</option>
              <option value="1">1º Chamamento</option>
              <option value="2">2º Chamamento</option>
              <option value="3">3º Chamamento</option>
              <option value="4">4º Chamamento</option>
              <option value="5">5º Chamamento</option>
              <option value="6">6º Chamamento</option>
            </select>
          </div>

          {/* Filtro de Demanda / Projeção 2027 (Sem parênteses) */}
          <div>
            <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 800, color: '#475569', marginBottom: '0.3rem' }}>
              PROJEÇÃO 2027 / DEMANDA
            </label>
            <select
              value={filtroDemanda}
              onChange={e => { setFiltroDemanda(e.target.value); setPagina(1); }}
              style={{ width: '100%', padding: '0.55rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.82rem' }}
            >
              <option value="todas">Todas as Situações</option>
              <option value="demanda_2_3">Turma 2º/3º Ano</option>
              <option value="demanda_1">Turma 1º Ano</option>
              <option value="encerra_dez">Encerra em Dezembro/2026</option>
              <option value="encerrados">Ciclo Encerrado</option>
            </select>
          </div>

          {/* Filtro de NRE */}
          <div>
            <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 800, color: '#475569', marginBottom: '0.3rem' }}>
              NÚCLEO REGIONAL (NRE)
            </label>
            <select
              value={filtroNre}
              onChange={e => { setFiltroNre(e.target.value); setPagina(1); }}
              style={{ width: '100%', padding: '0.55rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.82rem' }}
            >
              <option value="todos">Todos os NREs</option>
              {nresDisponiveis.map(n => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </div>

          {/* Campo de Busca (Buscar Cursista) */}
          <div>
            <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 800, color: '#475569', marginBottom: '0.3rem' }}>
              BUSCAR CURSISTA
            </label>
            <input
              type="text"
              placeholder="Buscar por nome, CGM ou turma..."
              value={busca}
              onChange={e => { setBusca(e.target.value); setPagina(1); }}
              style={{ width: '100%', padding: '0.55rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.82rem', boxSizing: 'border-box' }}
            />
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.78rem', color: '#64748b', borderTop: '1px solid #f1f5f9', paddingTop: '0.5rem' }}>
          <span>Exibindo <strong>{registrosFiltrados.length}</strong> cursistas com regras de avanço calculadas</span>
          {(filtroChamamento !== 'todos' || filtroDemanda !== 'todas' || filtroNre !== 'todos' || busca) && (
            <button
              onClick={() => { setFiltroChamamento('todos'); setFiltroDemanda('todas'); setFiltroNre('todos'); setBusca(''); }}
              style={{ background: 'none', border: 'none', color: '#0072bc', cursor: 'pointer', fontWeight: 700 }}
            >
              Limpar Filtros
            </button>
          )}
        </div>
      </div>

      {/* ── TABELA DE CURSISTAS COM BOTÃO DE SIMULAÇÃO APENAS PARA ELEGÍVEIS ── */}
      <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0', color: '#475569', textAlign: 'left' }}>
                <th style={{ padding: '0.75rem 1rem', fontWeight: 800 }}>Docente Cursista</th>
                <th style={{ padding: '0.75rem 0.75rem', fontWeight: 800 }}>CGM</th>
                <th style={{ padding: '0.75rem 0.75rem', fontWeight: 800 }}>NRE</th>
                <th style={{ padding: '0.75rem 0.75rem', fontWeight: 800 }}>Turma 2026</th>
                <th style={{ padding: '0.75rem 0.75rem', fontWeight: 800 }}>Chamamento</th>
                <th style={{ padding: '0.75rem 0.75rem', fontWeight: 800 }}>Evolução / Demanda 2027</th>
                <th style={{ padding: '0.75rem 1rem', fontWeight: 800, textAlign: 'center' }}>Ação Admin</th>
              </tr>
            </thead>
            <tbody>
              {paginados.map((cursista, idx) => {
                const ev = cursista.evolucao;
                const is2e3 = ev.status2027 === 'precisa_turma_2_3_ano';
                const is1Ano = ev.status2027 === 'precisa_turma_1_ano';
                const isEncerra = ev.status2027 === 'encerra_dezembro_2026';
                const isConcluido = ev.status2027 === 'encerrado';

                const tagBg = is2e3 ? '#e0f2fe' : is1Ano ? '#e0f2fe' : isEncerra ? '#dcfce7' : isConcluido ? '#dcfce7' : '#fef3c7';
                const tagColor = is2e3 ? '#0369a1' : is1Ano ? '#0284c7' : isEncerra ? '#15803d' : isConcluido ? '#166534' : '#b45309';

                // Elegível apenas quem for do 3º, 4º, 5º ou 6º chamamento
                const isElegivel = ev.elegivelIntencao;

                return (
                  <tr
                    key={cursista.cgm || idx}
                    style={{ borderBottom: '1px solid #f1f5f9' }}
                    onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f8fafc'}
                    onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    <td style={{ padding: '0.7rem 1rem', fontWeight: 700, color: '#001d3d' }}>
                      {cursista.nome || cursista.nome_cursista || 'Cursista'}
                    </td>
                    <td style={{ padding: '0.7rem 0.75rem', color: '#64748b', fontFamily: 'monospace' }}>
                      {cursista.cgm || '—'}
                    </td>
                    <td style={{ padding: '0.7rem 0.75rem', color: '#475569' }}>
                      {cursista.nre_exe || cursista.nre || '—'}
                    </td>
                    <td style={{ padding: '0.7rem 0.75rem', color: '#334155', maxWidth: '220px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={cursista.turmas || cursista.turma}>
                      {cursista.turmas || cursista.turma || 'Sem turma'}
                    </td>
                    <td style={{ padding: '0.7rem 0.75rem' }}>
                      <span style={{
                        backgroundColor: '#f1f5f9',
                        color: '#334155',
                        padding: '0.2rem 0.55rem',
                        borderRadius: '6px',
                        fontSize: '0.75rem',
                        fontWeight: 700
                      }}>
                        {ev.chamamentoTexto}
                      </span>
                    </td>
                    <td style={{ padding: '0.7rem 0.75rem' }}>
                      <span style={{
                        backgroundColor: tagBg,
                        color: tagColor,
                        padding: '0.25rem 0.6rem',
                        borderRadius: '6px',
                        fontSize: '0.74rem',
                        fontWeight: 800,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.35rem'
                      }}>
                        <span>{isConcluido || isEncerra ? '✓' : '➜'}</span>
                        {ev.tituloStatus}
                      </span>
                    </td>
                    <td style={{ padding: '0.7rem 1rem', textAlign: 'center' }}>
                      {isElegivel ? (
                        <button
                          onClick={() => setCursistaSimulado(cursista)}
                          style={{
                            backgroundColor: '#002d5c',
                            color: '#ffffff',
                            border: 'none',
                            borderRadius: '6px',
                            padding: '0.4rem 0.75rem',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                            boxShadow: '0 2px 6px rgba(0, 45, 92, 0.25)',
                            transition: 'all 0.15s'
                          }}
                          onMouseEnter={e => e.currentTarget.style.backgroundColor = '#001d3d'}
                          onMouseLeave={e => e.currentTarget.style.backgroundColor = '#002d5c'}
                        >
                          <span>👁️</span> Simular Visão
                        </button>
                      ) : (
                        <span style={{ color: '#94a3b8', fontSize: '0.74rem', fontStyle: 'italic' }}>
                          Não elegível para 2027
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Paginação */}
        {totalPaginas > 1 && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0.75rem 1.25rem',
            borderTop: '1px solid #e2e8f0',
            fontSize: '0.78rem',
            color: '#64748b'
          }}>
            <span>Página <strong>{pagina}</strong> de <strong>{totalPaginas}</strong></span>
            <div style={{ display: 'flex', gap: '0.4rem' }}>
              <button
                disabled={pagina === 1}
                onClick={() => setPagina(p => Math.max(1, p - 1))}
                style={{
                  padding: '0.35rem 0.75rem',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
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
                  padding: '0.35rem 0.75rem',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  backgroundColor: 'white',
                  cursor: pagina === totalPaginas ? 'not-allowed' : 'pointer',
                  opacity: pagina === totalPaginas ? 0.5 : 1
                }}
              >
                Próxima
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── MODAL EXCLUSIVO DE SIMULAÇÃO DA VISÃO DO CURSISTA ── */}
      {cursistaSimulado && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 15, 30, 0.75)',
          backdropFilter: 'blur(5px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 99999,
          padding: '1.5rem',
          boxSizing: 'border-box'
        }}>
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '1040px',
            maxHeight: '92vh',
            overflowY: 'auto',
            boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
            display: 'flex',
            flexDirection: 'column'
          }}>
            
            {/* Topo do Modal Administrativo */}
            <div style={{
              padding: '1rem 1.5rem',
              backgroundColor: '#002d5c',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderTopLeftRadius: '16px',
              borderTopRightRadius: '16px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <span style={{ fontSize: '1.5rem' }}>🎭</span>
                <div>
                  <div style={{ fontWeight: 800, fontSize: '0.9rem', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                    Painel Administrativo · Simulação da Experiência do Cursista
                  </div>
                  <div style={{ fontSize: '0.78rem', opacity: 0.9 }}>
                    Visualização do formulário e das opções oficiais disponíveis para o docente selecionado.
                  </div>
                </div>
              </div>

              <button
                onClick={() => setCursistaSimulado(null)}
                style={{
                  backgroundColor: 'rgba(255,255,255,0.2)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '50%',
                  width: '32px',
                  height: '32px',
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

            {/* Renderização real do componente do Cursista */}
            <div style={{ padding: '1rem 0' }}>
              <IntencaoMatricula2027
                cursista={cursistaSimulado}
                records={records}
                userEmail={cursistaSimulado.email || cursistaSimulado['e-mail']}
                isSimulacao={true}
              />
            </div>

            {/* Rodapé do Modal */}
            <div style={{
              padding: '1rem 1.5rem',
              backgroundColor: '#ffffff',
              borderTop: '1px solid #e2e8f0',
              display: 'flex',
              justifyContent: 'flex-end',
              borderBottomLeftRadius: '16px',
              borderBottomRightRadius: '16px'
            }}>
              <button
                onClick={() => setCursistaSimulado(null)}
                style={{
                  backgroundColor: '#002d5c',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '0.6rem 1.4rem',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                Fechar Simulação
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
