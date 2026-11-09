import React, { useState, useMemo } from 'react';
import IntencaoMatricula2027, { calcularEvolucaoCursista2027 } from './IntencaoMatricula2027';
import { tidbService } from '../services/tidbService';
import { driveDataService } from '../services/driveDataService';

export default function PainelIntencaoVagasAdmin({ records = [], userRole, userEmail, intencoesList = [] }) {
  // Aba ativa do Painel Administrativo
  // 'dashboard' = Visão Geral & Gráficos de Adesão
  // 'confirmadas' = Inscrições Confirmadas (Tabela Detalhada)
  // 'pendentes' = Cursistas Elegíveis Pendentes (Cobrança)
  // 'projecao' = Projeção Geral e Simulação da Rede
  const [abaAtiva, setAbaAtiva] = useState('dashboard');

  // Filtros Gerais
  const [busca, setBusca] = useState('');
  const [filtroChamamento, setFiltroChamamento] = useState('todos');
  const [filtroDemanda, setFiltroDemanda] = useState('todas');
  const [filtroNre, setFiltroNre] = useState('todos');
  const [filtroTurno, setFiltroTurno] = useState('todos');
  const [filtroComponente, setFiltroComponente] = useState('todos');
  const [filtroEspecial, setFiltroEspecial] = useState('todos');

  // Paginação
  const [pagina, setPagina] = useState(1);
  const itensPorPagina = 12;

  // Modais
  const [cursistaSimulado, setCursistaSimulado] = useState(null);
  const [modalAtendimentoEspecial, setModalAtendimentoEspecial] = useState(null);
  const [limpando, setLimpando] = useState(false);

  const handleLimparDadosSuperadmin = async () => {
    if (!window.confirm('⚠️ LIMPEZA GERAL DE TESTES (SUPERADMIN / ADMIN):\n\nDeseja realmente excluir TODAS as intenções de matrícula registradas para testes?\n\nEsta ação apagará os dados no TiDB Cloud, no Google Sheets e no armazenamento local de testes.')) {
      return;
    }
    setLimpando(true);
    try {
      await tidbService.limparIntencoes2027();
      await driveDataService.limparIntencoes2027();
      try {
        localStorage.removeItem('intencoes_2027_todas');
        Object.keys(localStorage).forEach(k => {
          if (k.startsWith('intencao_2027_')) localStorage.removeItem(k);
        });
      } catch (e) {}
      alert('✓ Todos os dados de intenção de 2027 foram limpos com sucesso! A página será atualizada.');
      window.location.reload();
    } catch (err) {
      alert('Erro ao limpar intenções: ' + (err.message || err));
    } finally {
      setLimpando(false);
    }
  };

  // 1. Unificação das Intenções (TiDB Cloud + LocalStorage Fallback) com Chave CGM_LF
  const todasIntencoes = useMemo(() => {
    const mapa = new Map();

    // 1.1 Do TiDB Cloud
    (intencoesList || []).forEach(item => {
      if (!item) return;
      const cgm = String(item.cgm_cursista || item.cgm || '').trim();
      const email = String(item.email_cursista || item.email || '').trim().toLowerCase();
      const lf = String(item.linha_funcional || item.lf || '1').trim();
      const keyLf = item.cgm_lf || (cgm ? `${cgm}_${lf}` : (email ? `${email}_${lf}` : null));
      const keyFallback = cgm ? `cgm_${cgm}` : (email ? `em_${email}` : null);

      if (keyLf && !mapa.has(keyLf)) {
        mapa.set(keyLf, item);
      } else if (keyFallback && !mapa.has(keyFallback)) {
        mapa.set(keyFallback, item);
      }
    });

    // 1.2 Do LocalStorage (registros locais salvos pelo navegador)
    try {
      const raw = localStorage.getItem('intencoes_2027_todas');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          parsed.forEach(item => {
            const cgm = String(item.cgm_cursista || item.cgm || '').trim();
            const email = String(item.email_cursista || item.email || '').trim().toLowerCase();
            const lf = String(item.linha_funcional || item.lf || '1').trim();
            const keyLf = item.cgm_lf || (cgm ? `${cgm}_${lf}` : (email ? `${email}_${lf}` : null));
            const keyFallback = cgm ? `cgm_${cgm}` : (email ? `em_${email}` : null);

            if (keyLf) {
              mapa.set(keyLf, item);
            } else if (keyFallback && !mapa.has(keyFallback)) {
              mapa.set(keyFallback, item);
            }
          });
        }
      }
    } catch (e) {
      console.warn('[Painel Admin] Erro ao ler intencoes do localStorage:', e);
    }

    return Array.from(mapa.values());
  }, [intencoesList]);

  // Mapa rápido de consulta de intenções por CGM_LF, por CGM e por E-mail
  const mapaConsultaIntencoes = useMemo(() => {
    const porCgmLf = new Map();
    const porCgm = new Map();
    const porEmail = new Map();

    todasIntencoes.forEach(int => {
      const cgm = String(int.cgm_cursista || int.cgm || '').trim();
      const em = String(int.email_cursista || int.email || '').trim().toLowerCase();
      const lf = String(int.linha_funcional || int.lf || '1').trim();
      const chaveMatricula = int.cgm_lf || (cgm ? `${cgm}_${lf}` : (em ? `${em}_${lf}` : null));

      if (chaveMatricula) porCgmLf.set(chaveMatricula, int);
      if (cgm) porCgm.set(cgm, int);
      if (em) porEmail.set(em, int);
    });

    return { porCgmLf, porCgm, porEmail };
  }, [todasIntencoes]);

  // 2. Enriquecer registros com o cálculo de evolução individual e cruzamento de inscrição por CGM_LF
  const recordsComEvolucao = useMemo(() => {
    const mapaUnicos = new Map();

    (records || []).forEach(r => {
      if (!r) return;
      const cgm = String(r.cgm || '').trim();
      const email = String(r.email || r['e-mail'] || '').trim().toLowerCase();
      const turma = String(r.turmas || r.turma || '').trim();
      const lf = String(r.linha_funcional || r.lf || '1').trim();
      const chaveMatricula = cgm ? `${cgm}_${lf}` : `${email}_${lf}`;
      
      const chaveUnica = `${chaveMatricula}_${turma}`;

      if (!mapaUnicos.has(chaveUnica)) {
        const evolucao = calcularEvolucaoCursista2027(r);
        
        // Busca intenção específica da matrícula (CGM_LF)
        let intencao = mapaConsultaIntencoes.porCgmLf.get(chaveMatricula) ||
                       (cgm && mapaConsultaIntencoes.porCgm.get(cgm)) ||
                       (email && mapaConsultaIntencoes.porEmail.get(email)) || null;

        // Verifica se houve decisão de optar por apenas uma das matrículas
        let dispensadoPorEscolha = false;
        if (intencao?.decisao_duas_matriculas === 'apenas_padrao_1' && lf === '2') {
          dispensadoPorEscolha = true;
        } else if (intencao?.decisao_duas_matriculas === 'apenas_padrao_2' && lf === '1') {
          dispensadoPorEscolha = true;
        }

        mapaUnicos.set(chaveUnica, {
          ...r,
          linha_funcional: lf,
          cgm_lf: chaveMatricula,
          evolucao,
          intencao,
          inscrito: !!intencao && !dispensadoPorEscolha,
          dispensadoPorEscolha
        });
      }
    });

    return Array.from(mapaUnicos.values());
  }, [records, mapaConsultaIntencoes]);

  // Lista única de NREs para filtro
  const nresDisponiveis = useMemo(() => {
    return Array.from(new Set(records.map(r => r.nre_exe || r.nre).filter(Boolean))).sort();
  }, [records]);

  // Lista única de Componentes para filtro
  const componentesDisponiveis = useMemo(() => {
    return Array.from(new Set(records.map(r => r.componente_conc || r.componente).filter(Boolean))).sort();
  }, [records]);

  // 3. Indicadores Gerais e KPIs de Acompanhamento das Inscrições
  const kpisAcompanhamento = useMemo(() => {
    let totalBase = recordsComEvolucao.length;
    let elegiveis = 0; // 3º ao 6º chamamento
    let concluidos = 0; // 1º chamamento
    let encerram2026 = 0; // 2º chamamento

    let demanda2e3Ano = 0; // 3º, 4º e 5º chamamento
    let demanda1Ano = 0; // 6º chamamento

    let confirmados = 0;
    let confirmados2e3Ano = 0;
    let confirmados1Ano = 0;

    let turnoManha = 0;
    let turnoTarde = 0;
    let turnoNoite = 0;

    let atendimentoEspecialSim = 0;

    recordsComEvolucao.forEach(r => {
      const num = r.evolucao.numChamamento;
      const isElegivel = r.evolucao.elegivelIntencao;

      if (num === 1) concluidos++;
      else if (num === 2) encerram2026++;

      if (isElegivel) {
        elegiveis++;
        if (num === 6) {
          demanda1Ano++;
        } else {
          demanda2e3Ano++;
        }

        if (r.inscrito) {
          confirmados++;
          if (num === 6) confirmados1Ano++;
          else confirmados2e3Ano++;

          const turno = String(r.intencao?.turnoPretendido || r.intencao?.opcao_turno || '').toLowerCase();
          if (turno.includes('manh') || turno.includes('manha')) turnoManha++;
          else if (turno.includes('tard')) turnoTarde++;
          else if (turno.includes('noit')) turnoNoite++;

          const esp = String(r.intencao?.necessitaAtendimentoEspecializado || '').toLowerCase();
          if (esp === 'sim' || r.intencao?.descricaoAtendimentoEspecializado) {
            atendimentoEspecialSim++;
          }
        }
      }
    });

    const pendentes = Math.max(0, elegiveis - confirmados);
    const taxaAdesao = elegiveis > 0 ? ((confirmados / elegiveis) * 100).toFixed(1) : '0.0';

    return {
      totalBase,
      concluidos,
      encerram2026,
      elegiveis,
      demanda2e3Ano,
      demanda1Ano,
      confirmados,
      confirmados2e3Ano,
      confirmados1Ano,
      pendentes,
      taxaAdesao,
      turnoManha,
      turnoTarde,
      turnoNoite,
      atendimentoEspecialSim
    };
  }, [recordsComEvolucao]);

  // 4. Estatísticas de Adesão por NRE
  const estatisticasNre = useMemo(() => {
    const mapaNre = new Map();

    recordsComEvolucao.forEach(r => {
      if (!r.evolucao.elegivelIntencao) return;
      const nre = normalizeNre(r.nre_exe || r.nre_cursista || r.nre_tutor || r.nre) || 'Não Informado';
      if (!mapaNre.has(nre)) {
        mapaNre.set(nre, { nre, elegiveis: 0, confirmados: 0, pendentes: 0, especiais: 0 });
      }
      const entry = mapaNre.get(nre);
      entry.elegiveis++;
      if (r.inscrito) {
        entry.confirmados++;
        if (r.intencao?.necessitaAtendimentoEspecializado === 'Sim' || r.intencao?.descricaoAtendimentoEspecializado) {
          entry.especiais++;
        }
      } else {
        entry.pendentes++;
      }
    });

    return Array.from(mapaNre.values()).map(item => ({
      ...item,
      taxa: item.elegiveis > 0 ? ((item.confirmados / item.elegiveis) * 100).toFixed(1) : '0.0'
    })).sort((a, b) => parseFloat(b.taxa) - parseFloat(a.taxa));
  }, [recordsComEvolucao]);

  // 5. Estatísticas de Adesão por Componente Curricular
  const estatisticasComponente = useMemo(() => {
    const mapaComp = new Map();

    recordsComEvolucao.forEach(r => {
      if (!r.evolucao.elegivelIntencao) return;
      const comp = normalizeComponenteCanonical(r.componente_conc || r.componente);
      if (!mapaComp.has(comp)) {
        mapaComp.set(comp, { componente: comp, elegiveis: 0, confirmados: 0, manha: 0, tarde: 0, noite: 0, especiais: 0 });
      }
      const entry = mapaComp.get(comp);
      entry.elegiveis++;
      if (r.inscrito) {
        entry.confirmados++;
        const turno = String(r.intencao?.turnoPretendido || r.intencao?.opcao_turno || '').toLowerCase();
        if (turno.includes('manh') || turno.includes('manha')) entry.manha++;
        else if (turno.includes('tard')) entry.tarde++;
        else if (turno.includes('noit')) entry.noite++;

        if (r.intencao?.necessitaAtendimentoEspecializado === 'Sim' || r.intencao?.descricaoAtendimentoEspecializado) {
          entry.especiais++;
        }
      }
    });

    return Array.from(mapaComp.values()).map(item => ({
      ...item,
      taxa: item.elegiveis > 0 ? ((item.confirmados / item.elegiveis) * 100).toFixed(1) : '0.0'
    })).sort((a, b) => b.confirmados - a.confirmados);
  }, [recordsComEvolucao]);

  // 6. Lista Filtrada de Inscrições Confirmadas
  const inscricoesConfirmadasFiltradas = useMemo(() => {
    let list = recordsComEvolucao.filter(r => r.evolucao.elegivelIntencao && r.inscrito);

    if (filtroNre !== 'todos') {
      list = list.filter(r => normalizeNre(r.nre_exe || r.nre_cursista || r.nre_tutor || r.nre) === filtroNre);
    }

    if (filtroTurno !== 'todos') {
      list = list.filter(r => {
        const t = String(r.intencao?.turnoPretendido || r.intencao?.opcao_turno || '');
        return t.toLowerCase().includes(filtroTurno.toLowerCase());
      });
    }

    if (filtroComponente !== 'todos') {
      list = list.filter(r => normalizeComponenteCanonical(r.componente_conc || r.componente) === filtroComponente);
    }

    if (filtroEspecial !== 'todos') {
      if (filtroEspecial === 'sim') {
        list = list.filter(r => r.intencao?.necessitaAtendimentoEspecializado === 'Sim' || r.intencao?.descricaoAtendimentoEspecializado);
      } else if (filtroEspecial === 'nao') {
        list = list.filter(r => r.intencao?.necessitaAtendimentoEspecializado !== 'Sim' && !r.intencao?.descricaoAtendimentoEspecializado);
      }
    }

    if (busca.trim()) {
      const q = busca.toLowerCase().trim();
      list = list.filter(r => {
        const nome = String(r.nome || r.nome_cursista || '').toLowerCase();
        const cgm = String(r.cgm || '').toLowerCase();
        const comp = String(r.componente_conc || r.componente || '').toLowerCase();
        return nome.includes(q) || cgm.includes(q) || comp.includes(q);
      });
    }

    return list;
  }, [recordsComEvolucao, filtroNre, filtroTurno, filtroComponente, filtroEspecial, busca]);

  // 7. Lista Filtrada de Cursistas Pendentes (Cobrança)
  const cursistasPendentesFiltrados = useMemo(() => {
    let list = recordsComEvolucao.filter(r => r.evolucao.elegivelIntencao && !r.inscrito);

    if (filtroNre !== 'todos') {
      list = list.filter(r => normalizeNre(r.nre_exe || r.nre_cursista || r.nre_tutor || r.nre) === filtroNre);
    }

    if (filtroComponente !== 'todos') {
      list = list.filter(r => normalizeComponenteCanonical(r.componente_conc || r.componente) === filtroComponente);
    }

    if (busca.trim()) {
      const q = busca.toLowerCase().trim();
      list = list.filter(r => {
        const nome = String(r.nome || r.nome_cursista || '').toLowerCase();
        const cgm = String(r.cgm || '').toLowerCase();
        const comp = String(r.componente_conc || r.componente || '').toLowerCase();
        return nome.includes(q) || cgm.includes(q) || comp.includes(q);
      });
    }

    return list;
  }, [recordsComEvolucao, filtroNre, filtroComponente, busca]);

  // 8. Lista Filtrada da Visão de Projeção / Geral
  const registrosProjecaoFiltrados = useMemo(() => {
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

  // Paginação dinâmica de acordo com a aba ativa
  const listaAtivaPaginacao = abaAtiva === 'confirmadas'
    ? inscricoesConfirmadasFiltradas
    : abaAtiva === 'pendentes'
    ? cursistasPendentesFiltrados
    : registrosProjecaoFiltrados;

  const totalPaginas = Math.ceil(listaAtivaPaginacao.length / itensPorPagina) || 1;
  const paginados = listaAtivaPaginacao.slice((pagina - 1) * itensPorPagina, pagina * itensPorPagina);

  // 9. Exportar Relatório CSV de Inscrições Confirmadas
  const exportarConfirmadasCSV = () => {
    if (inscricoesConfirmadasFiltradas.length === 0) {
      alert('Nenhuma inscrição confirmada para exportar com os filtros atuais.');
      return;
    }

    const headers = [
      'Matrícula (CGM_LF)',
      'CGM',
      'Linha Funcional',
      'Nome Cursista',
      'Email Institucional',
      'NRE',
      'Componente Curricular',
      'Chamamento',
      'Etapa Formativa 2027',
      'Turno Pretendido',
      'Horário Pretendido',
      'Decisão Duas Matrículas (se aplicável)',
      'Atendimento Especial',
      'Detalhes Atendimento Especial',
      'Termo Aceito',
      'Data Aceite'
    ];

    const rows = inscricoesConfirmadasFiltradas.map(r => {
      const int = r.intencao || {};
      const esp = int.necessitaAtendimentoEspecializado === 'Sim' || int.descricaoAtendimentoEspecializado ? 'SIM' : 'NÃO';
      const descEsp = String(int.descricaoAtendimentoEspecializado || '').replace(/"/g, '""');
      const decisao = int.decisao_duas_matriculas || (r.dispensadoPorEscolha ? 'Dispensado (optou por outro padrão)' : 'Padrão regular');
      const dataAceite = int.data_aceite_termo || int.created_at || '';

      return [
        `"${r.cgm_lf || `${r.cgm}_${r.linha_funcional || 1}`}"`,
        `"${r.cgm || ''}"`,
        `"${r.linha_funcional || '1'}"`,
        `"${(r.nome || r.nome_cursista || '').replace(/"/g, '""')}"`,
        `"${r.email || r['e-mail'] || ''}"`,
        `"${r.nre_exe || r.nre || ''}"`,
        `"${r.componente_conc || r.componente || ''}"`,
        `"${r.evolucao?.chamamentoTexto || ''}"`,
        `"${r.evolucao?.anoNecessario2027 || ''}"`,
        `"${int.turnoPretendido || int.opcao_turno || ''}"`,
        `"${int.horarioPretendido || int.opcao_modalidade || ''}"`,
        `"${decisao}"`,
        `"${esp}"`,
        `"${descEsp}"`,
        `"SIM"`,
        `"${dataAceite}"`
      ].join(';');
    });

    const csvContent = '\uFEFF' + [headers.join(';'), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `intencoes_vagas_2027_confirmadas_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // 10. Exportar Lista CSV de Pendentes para Cobrança
  const exportarPendentesCSV = () => {
    if (cursistasPendentesFiltrados.length === 0) {
      alert('Nenhum cursista pendente com os filtros atuais.');
      return;
    }

    const headers = [
      'CGM',
      'Nome Cursista',
      'Email Institucional',
      'NRE',
      'Componente Curricular',
      'Turma Atual',
      'Chamamento',
      'Status 2027',
      'Situação Inscrição'
    ];

    const rows = cursistasPendentesFiltrados.map(r => [
      `"${r.cgm || ''}"`,
      `"${(r.nome || r.nome_cursista || '').replace(/"/g, '""')}"`,
      `"${r.email || r['e-mail'] || ''}"`,
      `"${r.nre_exe || r.nre || ''}"`,
      `"${r.componente_conc || r.componente || ''}"`,
      `"${r.turmas || r.turma || ''}"`,
      `"${r.evolucao?.chamamentoTexto || ''}"`,
      `"${r.evolucao?.tituloStatus || ''}"`,
      `"PENDENTE"`
    ].join(';'));

    const csvContent = '\uFEFF' + [headers.join(';'), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `cursistas_elegiveis_pendentes_2027_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="glass-panel animate-fade-in" style={{ padding: '1.5rem', width: '100%', boxSizing: 'border-box' }}>
      
      {/* ── BANNER GERENCIAL DE ACOMPANHAMENTO ── */}
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
        gap: '1.25rem'
      }}>
        <div style={{ flex: '1 1 340px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.4rem' }}>
            <span style={{ fontSize: '1.6rem' }}>📊</span>
            <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800, letterSpacing: '-0.02em' }}>
              Acompanhamento de Intenção de Vagas · 2027/1
            </h1>
            <span style={{
              background: 'rgba(255,255,255,0.18)',
              padding: '0.2rem 0.65rem',
              borderRadius: '999px',
              fontSize: '0.75rem',
              fontWeight: 800,
              textTransform: 'uppercase'
            }}>
              Monitoramento Admin & Super Admin
            </span>
          </div>
          <p style={{ margin: 0, fontSize: '0.88rem', color: 'rgba(255, 255, 255, 0.88)', lineHeight: 1.45 }}>
            Controle gerencial em tempo real de adesão, turnos pretendidos e demandas especiais para abertura das turmas de 2027.
          </p>
        </div>

        {/* Botões de Ação Rápida no Topo */}
        <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
          <button
            onClick={exportarConfirmadasCSV}
            style={{
              backgroundColor: '#00984a',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              padding: '0.6rem 1.1rem',
              fontSize: '0.84rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              boxShadow: '0 4px 12px rgba(0, 152, 74, 0.3)'
            }}
          >
            <span>📥</span> Exportar Confirmadas (CSV)
          </button>

          <button
            onClick={exportarPendentesCSV}
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.15)',
              color: '#ffffff',
              border: '1px solid rgba(255, 255, 255, 0.3)',
              borderRadius: '8px',
              padding: '0.6rem 1.1rem',
              fontSize: '0.84rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem'
            }}
          >
            <span>⏳</span> Exportar Pendentes (CSV)
          </button>
        </div>
      </div>

      {/* ── NAVEGAÇÃO DE SUB-ABAS DO PAINEL DE GESTÃO ── */}
      <div style={{
        display: 'flex',
        gap: '0.5rem',
        backgroundColor: '#ffffff',
        padding: '0.4rem',
        borderRadius: '12px',
        border: '1px solid #e2e8f0',
        marginBottom: '1.5rem',
        flexWrap: 'wrap'
      }}>
        <button
          onClick={() => { setAbaAtiva('dashboard'); setPagina(1); }}
          style={{
            padding: '0.65rem 1.25rem',
            borderRadius: '8px',
            border: 'none',
            fontWeight: 700,
            fontSize: '0.88rem',
            cursor: 'pointer',
            backgroundColor: abaAtiva === 'dashboard' ? '#002d5c' : 'transparent',
            color: abaAtiva === 'dashboard' ? '#ffffff' : '#64748b',
            display: 'flex',
            alignItems: 'center',
            gap: '0.45rem',
            transition: 'all 0.15s ease'
          }}
        >
          <span>📊</span> Dashboard de Acompanhamento
        </button>

        <button
          onClick={() => { setAbaAtiva('confirmadas'); setPagina(1); }}
          style={{
            padding: '0.65rem 1.25rem',
            borderRadius: '8px',
            border: 'none',
            fontWeight: 700,
            fontSize: '0.88rem',
            cursor: 'pointer',
            backgroundColor: abaAtiva === 'confirmadas' ? '#007a33' : 'transparent',
            color: abaAtiva === 'confirmadas' ? '#ffffff' : '#64748b',
            display: 'flex',
            alignItems: 'center',
            gap: '0.45rem',
            transition: 'all 0.15s ease'
          }}
        >
          <span>✅</span> Inscrições Confirmadas ({kpisAcompanhamento.confirmados})
        </button>

        <button
          onClick={() => { setAbaAtiva('pendentes'); setPagina(1); }}
          style={{
            padding: '0.65rem 1.25rem',
            borderRadius: '8px',
            border: 'none',
            fontWeight: 700,
            fontSize: '0.88rem',
            cursor: 'pointer',
            backgroundColor: abaAtiva === 'pendentes' ? '#b45309' : 'transparent',
            color: abaAtiva === 'pendentes' ? '#ffffff' : '#64748b',
            display: 'flex',
            alignItems: 'center',
            gap: '0.45rem',
            transition: 'all 0.15s ease'
          }}
        >
          <span>⏳</span> Cursistas Pendentes ({kpisAcompanhamento.pendentes})
        </button>

        <button
          onClick={() => { setAbaAtiva('projecao'); setPagina(1); }}
          style={{
            padding: '0.65rem 1.25rem',
            borderRadius: '8px',
            border: 'none',
            fontWeight: 700,
            fontSize: '0.88rem',
            cursor: 'pointer',
            backgroundColor: abaAtiva === 'projecao' ? '#0072bc' : 'transparent',
            color: abaAtiva === 'projecao' ? '#ffffff' : '#64748b',
            display: 'flex',
            alignItems: 'center',
            gap: '0.45rem',
            transition: 'all 0.15s ease'
          }}
        >
          <span>🗺️</span> Projeção da Rede & Simulação
        </button>
      </div>

      {/* ── CARDS DE KPIS EM DESTAQUE (SEMPRE VISÍVEIS) ── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))',
        gap: '1rem',
        marginBottom: '1.5rem'
      }}>
        {/* Elegíveis */}
        <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '1rem 1.25rem', border: '1px solid #bae6fd', borderLeft: '4px solid #0072bc' }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#0072bc', textTransform: 'uppercase' }}>Total Elegíveis (3º ao 6º)</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#001d3d', marginTop: '0.2rem' }}>{kpisAcompanhamento.elegiveis}</div>
          <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '0.2rem' }}>Necessitam de vaga em 2027</div>
        </div>

        {/* Confirmadas */}
        <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '1rem 1.25rem', border: '1px solid #bbf7d0', borderLeft: '4px solid #00984a' }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#00984a', textTransform: 'uppercase' }}>Inscrições Confirmadas</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#00984a', marginTop: '0.2rem' }}>{kpisAcompanhamento.confirmados}</div>
          <div style={{ fontSize: '0.72rem', color: '#166534', marginTop: '0.2rem', fontWeight: 600 }}>Formulários com termo aceito</div>
        </div>

        {/* Taxa de Adesão */}
        <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '1rem 1.25rem', border: '1px solid #e2e8f0', borderLeft: '4px solid #2563eb' }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#2563eb', textTransform: 'uppercase' }}>Taxa de Adesão Geral</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#2563eb', marginTop: '0.2rem' }}>{kpisAcompanhamento.taxaAdesao}%</div>
          <div style={{ width: '100%', backgroundColor: '#e2e8f0', height: '6px', borderRadius: '3px', marginTop: '0.4rem', overflow: 'hidden' }}>
            <div style={{ width: `${Math.min(100, parseFloat(kpisAcompanhamento.taxaAdesao))}%`, backgroundColor: '#2563eb', height: '100%' }}></div>
          </div>
        </div>

        {/* Pendentes */}
        <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '1rem 1.25rem', border: '1px solid #fed7aa', borderLeft: '4px solid #f97316' }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#c2410c', textTransform: 'uppercase' }}>Inscrições Pendentes</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#c2410c', marginTop: '0.2rem' }}>{kpisAcompanhamento.pendentes}</div>
          <div style={{ fontSize: '0.72rem', color: '#9a3412', marginTop: '0.2rem' }}>Elegíveis aguardando preenchimento</div>
        </div>

        {/* Atendimento Especial */}
        <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '1rem 1.25rem', border: '1px solid #fef08a', borderLeft: '4px solid #eab308' }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#854d0e', textTransform: 'uppercase' }}>Atendimento Especial</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#854d0e', marginTop: '0.2rem' }}>{kpisAcompanhamento.atendimentoEspecialSim}</div>
          <div style={{ fontSize: '0.72rem', color: '#713f12', marginTop: '0.2rem', fontWeight: 600 }}>Solicitações de acessibilidade</div>
        </div>
      </div>

      {/* ──────────────────────────────────────────────────────────────────────── */}
      {/* 1. VISÃO DO DASHBOARD DE ACOMPANHAMENTO (GRÁFICOS & DISTRIBUIÇÕES)       */}
      {/* ──────────────────────────────────────────────────────────────────────── */}
      {abaAtiva === 'dashboard' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Seção 1: Distribuição por Turno e por Demanda de Turmas */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem' }}>
            
            {/* Card Turno Pretendido */}
            <div style={{ backgroundColor: '#ffffff', borderRadius: '14px', padding: '1.5rem', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#001d3d' }}>
                  ☀️ Preferência de Turno Pretendido
                </div>
                <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Total: {kpisAcompanhamento.confirmados}</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {/* Manhã */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', fontWeight: 700, marginBottom: '0.25rem' }}>
                    <span style={{ color: '#0284c7' }}>☀️ Manhã</span>
                    <span>{kpisAcompanhamento.turnoManha} ({kpisAcompanhamento.confirmados > 0 ? ((kpisAcompanhamento.turnoManha / kpisAcompanhamento.confirmados) * 100).toFixed(1) : 0}%)</span>
                  </div>
                  <div style={{ width: '100%', height: '10px', backgroundColor: '#f1f5f9', borderRadius: '5px', overflow: 'hidden' }}>
                    <div style={{ width: `${kpisAcompanhamento.confirmados > 0 ? (kpisAcompanhamento.turnoManha / kpisAcompanhamento.confirmados) * 100 : 0}%`, backgroundColor: '#0284c7', height: '100%' }}></div>
                  </div>
                </div>

                {/* Tarde */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', fontWeight: 700, marginBottom: '0.25rem' }}>
                    <span style={{ color: '#00984a' }}>⛅ Tarde</span>
                    <span>{kpisAcompanhamento.turnoTarde} ({kpisAcompanhamento.confirmados > 0 ? ((kpisAcompanhamento.turnoTarde / kpisAcompanhamento.confirmados) * 100).toFixed(1) : 0}%)</span>
                  </div>
                  <div style={{ width: '100%', height: '10px', backgroundColor: '#f1f5f9', borderRadius: '5px', overflow: 'hidden' }}>
                    <div style={{ width: `${kpisAcompanhamento.confirmados > 0 ? (kpisAcompanhamento.turnoTarde / kpisAcompanhamento.confirmados) * 100 : 0}%`, backgroundColor: '#00984a', height: '100%' }}></div>
                  </div>
                </div>

                {/* Noite */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', fontWeight: 700, marginBottom: '0.25rem' }}>
                    <span style={{ color: '#475569' }}>🌙 Noite</span>
                    <span>{kpisAcompanhamento.turnoNoite} ({kpisAcompanhamento.confirmados > 0 ? ((kpisAcompanhamento.turnoNoite / kpisAcompanhamento.confirmados) * 100).toFixed(1) : 0}%)</span>
                  </div>
                  <div style={{ width: '100%', height: '10px', backgroundColor: '#f1f5f9', borderRadius: '5px', overflow: 'hidden' }}>
                    <div style={{ width: `${kpisAcompanhamento.confirmados > 0 ? (kpisAcompanhamento.turnoNoite / kpisAcompanhamento.confirmados) * 100 : 0}%`, backgroundColor: '#475569', height: '100%' }}></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Card Demanda por Nível Formativo */}
            <div style={{ backgroundColor: '#ffffff', borderRadius: '14px', padding: '1.5rem', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#001d3d' }}>
                  🎓 Demanda por Etapa Formativa 2027
                </div>
                <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Evolução por Chamamento</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {/* Turmas 2º/3º Ano */}
                <div style={{ padding: '0.85rem', backgroundColor: '#f0f9ff', borderRadius: '10px', border: '1px solid #bae6fd' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <strong style={{ fontSize: '0.88rem', color: '#0369a1' }}>Turmas de 2º e 3º Ano</strong>
                      <div style={{ fontSize: '0.72rem', color: '#0284c7' }}>3º, 4º e 5º Chamamento</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0369a1' }}>{kpisAcompanhamento.confirmados2e3Ano}</span>
                      <span style={{ fontSize: '0.75rem', color: '#64748b' }}> / {kpisAcompanhamento.demanda2e3Ano}</span>
                    </div>
                  </div>
                  <div style={{ width: '100%', height: '8px', backgroundColor: '#e0f2fe', borderRadius: '4px', marginTop: '0.5rem', overflow: 'hidden' }}>
                    <div style={{ width: `${kpisAcompanhamento.demanda2e3Ano > 0 ? (kpisAcompanhamento.confirmados2e3Ano / kpisAcompanhamento.demanda2e3Ano) * 100 : 0}%`, backgroundColor: '#0284c7', height: '100%' }}></div>
                  </div>
                </div>

                {/* Turmas 1º Ano */}
                <div style={{ padding: '0.85rem', backgroundColor: '#eff6ff', borderRadius: '10px', border: '1px solid #bfdbfe' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <strong style={{ fontSize: '0.88rem', color: '#1d4ed8' }}>Turmas de 1º Ano</strong>
                      <div style={{ fontSize: '0.72rem', color: '#2563eb' }}>6º Chamamento</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontSize: '1.2rem', fontWeight: 800, color: '#1d4ed8' }}>{kpisAcompanhamento.confirmados1Ano}</span>
                      <span style={{ fontSize: '0.75rem', color: '#64748b' }}> / {kpisAcompanhamento.demanda1Ano}</span>
                    </div>
                  </div>
                  <div style={{ width: '100%', height: '8px', backgroundColor: '#dbeafe', borderRadius: '4px', marginTop: '0.5rem', overflow: 'hidden' }}>
                    <div style={{ width: `${kpisAcompanhamento.demanda1Ano > 0 ? (kpisAcompanhamento.confirmados1Ano / kpisAcompanhamento.demanda1Ano) * 100 : 0}%`, backgroundColor: '#1d4ed8', height: '100%' }}></div>
                  </div>
                </div>
              </div>
            </div>

          </div>

          {/* Seção 2: Tabela de Adesão por NRE */}
          <div style={{ backgroundColor: '#ffffff', borderRadius: '14px', padding: '1.5rem', border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#001d3d' }}>
                  🏛️ Ranking de Adesão por Núcleo Regional de Educação (NRE)
                </h3>
                <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
                  Acompanhe quais regiões já atingiram alta cobertura e onde focar a mobilização
                </span>
              </div>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0', color: '#475569', textAlign: 'left' }}>
                    <th style={{ padding: '0.75rem 1rem', fontWeight: 800 }}>Núcleo Regional (NRE)</th>
                    <th style={{ padding: '0.75rem 0.75rem', fontWeight: 800, textAlign: 'center' }}>Total Elegíveis</th>
                    <th style={{ padding: '0.75rem 0.75rem', fontWeight: 800, textAlign: 'center' }}>Inscritos Confirmados</th>
                    <th style={{ padding: '0.75rem 0.75rem', fontWeight: 800, textAlign: 'center' }}>Pendentes</th>
                    <th style={{ padding: '0.75rem 0.75rem', fontWeight: 800, textAlign: 'center' }}>Atendimento Especial</th>
                    <th style={{ padding: '0.75rem 1rem', fontWeight: 800 }}>Taxa de Adesão</th>
                  </tr>
                </thead>
                <tbody>
                  {estatisticasNre.map((row, idx) => {
                    const taxaNum = parseFloat(row.taxa);
                    const corBarra = taxaNum >= 75 ? '#00984a' : taxaNum >= 40 ? '#0284c7' : '#eab308';
                    return (
                      <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '0.7rem 1rem', fontWeight: 700, color: '#001d3d' }}>
                          {row.nre}
                        </td>
                        <td style={{ padding: '0.7rem 0.75rem', textAlign: 'center', fontWeight: 600, color: '#334155' }}>
                          {row.elegiveis}
                        </td>
                        <td style={{ padding: '0.7rem 0.75rem', textAlign: 'center', fontWeight: 800, color: '#00984a' }}>
                          {row.confirmados}
                        </td>
                        <td style={{ padding: '0.7rem 0.75rem', textAlign: 'center', fontWeight: 700, color: '#c2410c' }}>
                          {row.pendentes}
                        </td>
                        <td style={{ padding: '0.7rem 0.75rem', textAlign: 'center' }}>
                          {row.especiais > 0 ? (
                            <span style={{ backgroundColor: '#fef08a', color: '#854d0e', padding: '0.2rem 0.5rem', borderRadius: '6px', fontWeight: 800, fontSize: '0.75rem' }}>
                              {row.especiais}
                            </span>
                          ) : (
                            <span style={{ color: '#cbd5e1' }}>0</span>
                          )}
                        </td>
                        <td style={{ padding: '0.7rem 1rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <div style={{ flex: 1, backgroundColor: '#f1f5f9', height: '8px', borderRadius: '4px', overflow: 'hidden' }}>
                              <div style={{ width: `${Math.min(100, taxaNum)}%`, backgroundColor: corBarra, height: '100%' }}></div>
                            </div>
                            <span style={{ fontWeight: 800, fontSize: '0.8rem', color: corBarra, minWidth: '45px', textAlign: 'right' }}>
                              {row.taxa}%
                            </span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Seção 3: Tabela de Adesão por Componente Curricular */}
          <div style={{ backgroundColor: '#ffffff', borderRadius: '14px', padding: '1.5rem', border: '1px solid #e2e8f0' }}>
            <div style={{ marginBottom: '1rem' }}>
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#001d3d' }}>
                📚 Distribuição por Componente Curricular
              </h3>
              <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
                Visão detalhada de inscritos e turnos pretendidos por disciplina
              </span>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0', color: '#475569', textAlign: 'left' }}>
                    <th style={{ padding: '0.75rem 1rem', fontWeight: 800 }}>Componente Curricular</th>
                    <th style={{ padding: '0.75rem 0.75rem', fontWeight: 800, textAlign: 'center' }}>Total Elegíveis</th>
                    <th style={{ padding: '0.75rem 0.75rem', fontWeight: 800, textAlign: 'center' }}>Inscritos Confirmados</th>
                    <th style={{ padding: '0.75rem 0.75rem', fontWeight: 800, textAlign: 'center' }}>Manhã</th>
                    <th style={{ padding: '0.75rem 0.75rem', fontWeight: 800, textAlign: 'center' }}>Tarde</th>
                    <th style={{ padding: '0.75rem 0.75rem', fontWeight: 800, textAlign: 'center' }}>Noite</th>
                    <th style={{ padding: '0.75rem 0.75rem', fontWeight: 800, textAlign: 'center' }}>Atendimento Especial</th>
                    <th style={{ padding: '0.75rem 1rem', fontWeight: 800, textAlign: 'right' }}>Adesão (%)</th>
                  </tr>
                </thead>
                <tbody>
                  {estatisticasComponente.map((row, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '0.7rem 1rem', fontWeight: 700, color: '#001d3d' }}>
                        {row.componente}
                      </td>
                      <td style={{ padding: '0.7rem 0.75rem', textAlign: 'center', fontWeight: 600, color: '#334155' }}>
                        {row.elegiveis}
                      </td>
                      <td style={{ padding: '0.7rem 0.75rem', textAlign: 'center', fontWeight: 800, color: '#00984a' }}>
                        {row.confirmados}
                      </td>
                      <td style={{ padding: '0.7rem 0.75rem', textAlign: 'center', color: '#0284c7', fontWeight: 600 }}>
                        {row.manha}
                      </td>
                      <td style={{ padding: '0.7rem 0.75rem', textAlign: 'center', color: '#00984a', fontWeight: 600 }}>
                        {row.tarde}
                      </td>
                      <td style={{ padding: '0.7rem 0.75rem', textAlign: 'center', color: '#475569', fontWeight: 600 }}>
                        {row.noite}
                      </td>
                      <td style={{ padding: '0.7rem 0.75rem', textAlign: 'center' }}>
                        {row.especiais > 0 ? (
                          <span style={{ backgroundColor: '#fef08a', color: '#854d0e', padding: '0.2rem 0.5rem', borderRadius: '6px', fontWeight: 800, fontSize: '0.75rem' }}>
                            {row.especiais}
                          </span>
                        ) : (
                          <span style={{ color: '#cbd5e1' }}>0</span>
                        )}
                      </td>
                      <td style={{ padding: '0.7rem 1rem', textAlign: 'right', fontWeight: 800, color: '#2563eb' }}>
                        {row.taxa}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* ──────────────────────────────────────────────────────────────────────── */}
      {/* 2. VISÃO DE INSCRIÇÕES CONFIRMADAS (TABELA DETALHADA DAS RESPOSTAS)      */}
      {/* ──────────────────────────────────────────────────────────────────────── */}
      {abaAtiva === 'confirmadas' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          
          {/* Barra de Filtros para Confirmadas */}
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            padding: '1.25rem',
            border: '1px solid #e2e8f0',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.85rem'
          }}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: '0.75rem',
              alignItems: 'end'
            }}>
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
                  {nresDisponiveis.map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>

              {/* Filtro de Turno */}
              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 800, color: '#475569', marginBottom: '0.3rem' }}>
                  TURNO PRETENDIDO
                </label>
                <select
                  value={filtroTurno}
                  onChange={e => { setFiltroTurno(e.target.value); setPagina(1); }}
                  style={{ width: '100%', padding: '0.55rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.82rem' }}
                >
                  <option value="todos">Todos os Turnos</option>
                  <option value="manha">Manhã</option>
                  <option value="tarde">Tarde</option>
                  <option value="noite">Noite</option>
                </select>
              </div>

              {/* Filtro de Componente */}
              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 800, color: '#475569', marginBottom: '0.3rem' }}>
                  COMPONENTE CURRICULAR
                </label>
                <select
                  value={filtroComponente}
                  onChange={e => { setFiltroComponente(e.target.value); setPagina(1); }}
                  style={{ width: '100%', padding: '0.55rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.82rem' }}
                >
                  <option value="todos">Todos os Componentes</option>
                  {componentesDisponiveis.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              {/* Filtro de Atendimento Especial */}
              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 800, color: '#475569', marginBottom: '0.3rem' }}>
                  ATENDIMENTO ESPECIAL
                </label>
                <select
                  value={filtroEspecial}
                  onChange={e => { setFiltroEspecial(e.target.value); setPagina(1); }}
                  style={{ width: '100%', padding: '0.55rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.82rem' }}
                >
                  <option value="todos">Todos</option>
                  <option value="sim">Apenas com Atendimento Especial</option>
                  <option value="nao">Sem Atendimento Especial</option>
                </select>
              </div>

              {/* Busca por Nome ou CGM */}
              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 800, color: '#475569', marginBottom: '0.3rem' }}>
                  BUSCAR CURSISTA
                </label>
                <input
                  type="text"
                  placeholder="Nome ou CGM..."
                  value={busca}
                  onChange={e => { setBusca(e.target.value); setPagina(1); }}
                  style={{ width: '100%', padding: '0.55rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.82rem', boxSizing: 'border-box' }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #f1f5f9', paddingTop: '0.5rem', fontSize: '0.78rem', color: '#64748b' }}>
              <span>Exibindo <strong>{inscricoesConfirmadasFiltradas.length}</strong> inscrições confirmadas com termo aceito</span>
              {(filtroNre !== 'todos' || filtroTurno !== 'todos' || filtroComponente !== 'todos' || filtroEspecial !== 'todos' || busca) && (
                <button
                  onClick={() => { setFiltroNre('todos'); setFiltroTurno('todos'); setFiltroComponente('todos'); setFiltroEspecial('todos'); setBusca(''); }}
                  style={{ background: 'none', border: 'none', color: '#0072bc', cursor: 'pointer', fontWeight: 700 }}
                >
                  Limpar Filtros
                </button>
              )}
            </div>
          </div>

          {/* Tabela de Inscrições Confirmadas */}
          <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0', color: '#475569', textAlign: 'left' }}>
                    <th style={{ padding: '0.75rem 1rem', fontWeight: 800 }}>Docente Cursista</th>
                    <th style={{ padding: '0.75rem 0.75rem', fontWeight: 800 }}>Matrícula (CGM_LF)</th>
                    <th style={{ padding: '0.75rem 0.75rem', fontWeight: 800 }}>NRE</th>
                    <th style={{ padding: '0.75rem 0.75rem', fontWeight: 800 }}>Componente</th>
                    <th style={{ padding: '0.75rem 0.75rem', fontWeight: 800 }}>Turno Pretendido</th>
                    <th style={{ padding: '0.75rem 0.75rem', fontWeight: 800 }}>Horário</th>
                    <th style={{ padding: '0.75rem 0.75rem', fontWeight: 800, textAlign: 'center' }}>Atendimento Especial</th>
                    <th style={{ padding: '0.75rem 0.75rem', fontWeight: 800, textAlign: 'center' }}>Termo Aceito</th>
                    <th style={{ padding: '0.75rem 1rem', fontWeight: 800, textAlign: 'center' }}>Data de Envio</th>
                  </tr>
                </thead>
                <tbody>
                  {paginados.map((cursista, idx) => {
                    const int = cursista.intencao || {};
                    const turno = int.turnoPretendido || int.opcao_turno || 'Não informado';
                    const horario = int.horarioPretendido || int.opcao_modalidade || '—';
                    const temEspecial = int.necessitaAtendimentoEspecializado === 'Sim' || !!int.descricaoAtendimentoEspecializado;
                    const dataEnvio = int.data_aceite_termo || int.created_at;

                    return (
                      <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '0.7rem 1rem', fontWeight: 700, color: '#001d3d' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                            <span>{cursista.nome || cursista.nome_cursista}</span>
                            {cursista.cgm?.startsWith('777901') && (
                              <span style={{ backgroundColor: '#fef3c7', color: '#92400e', padding: '0.1rem 0.4rem', borderRadius: '4px', fontSize: '0.68rem', fontWeight: 800 }}>
                                🧪 TESTE ADMIN
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: '0.72rem', color: '#64748b' }}>{cursista.email || cursista['e-mail']}</div>
                        </td>
                        <td style={{ padding: '0.7rem 0.75rem', color: '#64748b', fontFamily: 'monospace' }}>
                          <span style={{ fontWeight: 800, color: '#002d5c' }}>{cursista.cgm_lf || `${cursista.cgm}_${cursista.linha_funcional || 1}`}</span>
                          <span style={{ display: 'block', fontSize: '0.7rem', color: '#64748b' }}>Padrão {cursista.linha_funcional || 1}</span>
                        </td>
                        <td style={{ padding: '0.7rem 0.75rem', color: '#334155' }}>
                          {cursista.nre_exe || cursista.nre || '—'}
                        </td>
                        <td style={{ padding: '0.7rem 0.75rem', color: '#334155', fontWeight: 600 }}>
                          <div>{cursista.componente_conc || cursista.componente || '—'}</div>
                          {int.decisao_duas_matriculas && int.decisao_duas_matriculas !== 'independente' && (
                            <div style={{ marginTop: '0.2rem' }}>
                              <span style={{
                                backgroundColor: int.decisao_duas_matriculas === 'manter_duas' ? '#ede9fe' : '#f1f5f9',
                                color: int.decisao_duas_matriculas === 'manter_duas' ? '#6d28d9' : '#334155',
                                padding: '0.1rem 0.4rem',
                                borderRadius: '4px',
                                fontSize: '0.68rem',
                                fontWeight: 800
                              }}>
                                {int.decisao_duas_matriculas === 'manter_duas' ? '🟢 Mantém 2 Turmas' : int.decisao_duas_matriculas === 'apenas_padrao_1' ? '🔵 Optou apenas LF 1' : '🟣 Optou apenas LF 2'}
                              </span>
                            </div>
                          )}
                        </td>
                        <td style={{ padding: '0.7rem 0.75rem' }}>
                          <span style={{
                            backgroundColor: turno.toLowerCase().includes('manh') ? '#e0f2fe' : turno.toLowerCase().includes('tard') ? '#dcfce7' : '#f1f5f9',
                            color: turno.toLowerCase().includes('manh') ? '#0369a1' : turno.toLowerCase().includes('tard') ? '#15803d' : '#334155',
                            padding: '0.2rem 0.55rem',
                            borderRadius: '6px',
                            fontWeight: 800,
                            fontSize: '0.75rem'
                          }}>
                            {turno}
                          </span>
                        </td>
                        <td style={{ padding: '0.7rem 0.75rem', color: '#475569', fontSize: '0.78rem' }}>
                          {horario}
                        </td>
                        <td style={{ padding: '0.7rem 0.75rem', textAlign: 'center' }}>
                          {temEspecial ? (
                            <button
                              onClick={() => setModalAtendimentoEspecial({ cursista, intencao: int })}
                              style={{
                                backgroundColor: '#fef08a',
                                color: '#854d0e',
                                border: '1px solid #fde047',
                                padding: '0.2rem 0.55rem',
                                borderRadius: '6px',
                                fontWeight: 800,
                                fontSize: '0.74rem',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.3rem'
                              }}
                              title="Clique para ver a justificativa digitada pelo docente"
                            >
                              <span>♿ Sim (Ver)</span>
                            </button>
                          ) : (
                            <span style={{ color: '#94a3b8', fontSize: '0.75rem' }}>Não</span>
                          )}
                        </td>
                        <td style={{ padding: '0.7rem 0.75rem', textAlign: 'center' }}>
                          <span style={{ backgroundColor: '#dcfce7', color: '#166534', padding: '0.15rem 0.5rem', borderRadius: '4px', fontSize: '0.74rem', fontWeight: 800 }}>
                            ✓ Aceito
                          </span>
                        </td>
                        <td style={{ padding: '0.7rem 1rem', textAlign: 'center', color: '#64748b', fontSize: '0.75rem' }}>
                          {dataEnvio ? new Date(dataEnvio).toLocaleString('pt-BR') : '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Paginação */}
            {totalPaginas > 1 && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 1.25rem', borderTop: '1px solid #e2e8f0', fontSize: '0.78rem', color: '#64748b' }}>
                <span>Página <strong>{pagina}</strong> de <strong>{totalPaginas}</strong></span>
                <div style={{ display: 'flex', gap: '0.4rem' }}>
                  <button disabled={pagina === 1} onClick={() => setPagina(p => Math.max(1, p - 1))} style={{ padding: '0.35rem 0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: 'white', cursor: pagina === 1 ? 'not-allowed' : 'pointer' }}>Anterior</button>
                  <button disabled={pagina === totalPaginas} onClick={() => setPagina(p => Math.min(totalPaginas, p + 1))} style={{ padding: '0.35rem 0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: 'white', cursor: pagina === totalPaginas ? 'not-allowed' : 'pointer' }}>Próxima</button>
                </div>
              </div>
            )}
          </div>

        </div>
      )}

      {/* ──────────────────────────────────────────────────────────────────────── */}
      {/* 3. VISÃO DE CURSISTAS PENDENTES (COBRANÇA E BUSCA ATIVA)                */}
      {/* ──────────────────────────────────────────────────────────────────────── */}
      {abaAtiva === 'pendentes' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          
          {/* Barra de Filtros para Pendentes */}
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            padding: '1.25rem',
            border: '1px solid #e2e8f0',
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
                  {nresDisponiveis.map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 800, color: '#475569', marginBottom: '0.3rem' }}>
                  COMPONENTE CURRICULAR
                </label>
                <select
                  value={filtroComponente}
                  onChange={e => { setFiltroComponente(e.target.value); setPagina(1); }}
                  style={{ width: '100%', padding: '0.55rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.82rem' }}
                >
                  <option value="todos">Todos os Componentes</option>
                  {componentesDisponiveis.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 800, color: '#475569', marginBottom: '0.3rem' }}>
                  BUSCAR CURSISTA
                </label>
                <input
                  type="text"
                  placeholder="Nome ou CGM..."
                  value={busca}
                  onChange={e => { setBusca(e.target.value); setPagina(1); }}
                  style={{ width: '100%', padding: '0.55rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.82rem', boxSizing: 'border-box' }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #f1f5f9', paddingTop: '0.5rem', fontSize: '0.78rem', color: '#64748b' }}>
              <span>Exibindo <strong>{cursistasPendentesFiltrados.length}</strong> cursistas elegíveis que ainda não preencheram a intenção</span>
              {(filtroNre !== 'todos' || filtroComponente !== 'todos' || busca) && (
                <button
                  onClick={() => { setFiltroNre('todos'); setFiltroComponente('todos'); setBusca(''); }}
                  style={{ background: 'none', border: 'none', color: '#0072bc', cursor: 'pointer', fontWeight: 700 }}
                >
                  Limpar Filtros
                </button>
              )}
            </div>
          </div>

          {/* Tabela de Cursistas Pendentes */}
          <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0', color: '#475569', textAlign: 'left' }}>
                    <th style={{ padding: '0.75rem 1rem', fontWeight: 800 }}>Docente Cursista</th>
                    <th style={{ padding: '0.75rem 0.75rem', fontWeight: 800 }}>CGM</th>
                    <th style={{ padding: '0.75rem 0.75rem', fontWeight: 800 }}>NRE</th>
                    <th style={{ padding: '0.75rem 0.75rem', fontWeight: 800 }}>Componente</th>
                    <th style={{ padding: '0.75rem 0.75rem', fontWeight: 800 }}>Turma Atual</th>
                    <th style={{ padding: '0.75rem 0.75rem', fontWeight: 800 }}>Chamamento</th>
                    <th style={{ padding: '0.75rem 1rem', fontWeight: 800, textAlign: 'center' }}>Situação</th>
                  </tr>
                </thead>
                <tbody>
                  {paginados.map((cursista, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '0.7rem 1rem', fontWeight: 700, color: '#001d3d' }}>
                        {cursista.nome || cursista.nome_cursista}
                        <div style={{ fontSize: '0.72rem', color: '#64748b' }}>{cursista.email || cursista['e-mail']}</div>
                      </td>
                      <td style={{ padding: '0.7rem 0.75rem', color: '#64748b', fontFamily: 'monospace' }}>
                        {cursista.cgm || '—'}
                      </td>
                      <td style={{ padding: '0.7rem 0.75rem', color: '#334155' }}>
                        {cursista.nre_exe || cursista.nre || '—'}
                      </td>
                      <td style={{ padding: '0.7rem 0.75rem', color: '#334155', fontWeight: 600 }}>
                        {cursista.componente_conc || cursista.componente || '—'}
                      </td>
                      <td style={{ padding: '0.7rem 0.75rem', color: '#475569', maxWidth: '220px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={cursista.turmas || cursista.turma}>
                        {cursista.turmas || cursista.turma || 'Sem turma'}
                      </td>
                      <td style={{ padding: '0.7rem 0.75rem' }}>
                        <span style={{ backgroundColor: '#f1f5f9', color: '#334155', padding: '0.2rem 0.55rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700 }}>
                          {cursista.evolucao?.chamamentoTexto}
                        </span>
                      </td>
                      <td style={{ padding: '0.7rem 1rem', textAlign: 'center' }}>
                        <span style={{ backgroundColor: '#fed7aa', color: '#9a3412', padding: '0.2rem 0.55rem', borderRadius: '6px', fontSize: '0.74rem', fontWeight: 800 }}>
                          ⏳ Aguardando Envio
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {totalPaginas > 1 && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 1.25rem', borderTop: '1px solid #e2e8f0', fontSize: '0.78rem', color: '#64748b' }}>
                <span>Página <strong>{pagina}</strong> de <strong>{totalPaginas}</strong></span>
                <div style={{ display: 'flex', gap: '0.4rem' }}>
                  <button disabled={pagina === 1} onClick={() => setPagina(p => Math.max(1, p - 1))} style={{ padding: '0.35rem 0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: 'white', cursor: pagina === 1 ? 'not-allowed' : 'pointer' }}>Anterior</button>
                  <button disabled={pagina === totalPaginas} onClick={() => setPagina(p => Math.min(totalPaginas, p + 1))} style={{ padding: '0.35rem 0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: 'white', cursor: pagina === totalPaginas ? 'not-allowed' : 'pointer' }}>Próxima</button>
                </div>
              </div>
            )}
          </div>

        </div>
      )}

      {/* ──────────────────────────────────────────────────────────────────────── */}
      {/* 4. VISÃO DE PROJEÇÃO GERAL POR CHAMAMENTO E SIMULAÇÃO DA VIEW            */}
      {/* ──────────────────────────────────────────────────────────────────────── */}
      {abaAtiva === 'projecao' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          
          {/* Filtros da Projeção */}
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            padding: '1.25rem',
            border: '1px solid #e2e8f0',
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
                  {nresDisponiveis.map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 800, color: '#475569', marginBottom: '0.3rem' }}>
                  BUSCAR CURSISTA
                </label>
                <input
                  type="text"
                  placeholder="Nome, CGM ou turma..."
                  value={busca}
                  onChange={e => { setBusca(e.target.value); setPagina(1); }}
                  style={{ width: '100%', padding: '0.55rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.82rem', boxSizing: 'border-box' }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.78rem', color: '#64748b', borderTop: '1px solid #f1f5f9', paddingTop: '0.5rem' }}>
              <span>Exibindo <strong>{registrosProjecaoFiltrados.length}</strong> cursistas com regras de avanço calculadas</span>
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

          {/* Tabela de Projeção com Botão de Simular Visão */}
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
                    <th style={{ padding: '0.75rem 0.75rem', fontWeight: 800, textAlign: 'center' }}>Status Inscrição</th>
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
                    const isElegivel = ev.elegivelIntencao;

                    return (
                      <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '0.7rem 1rem', fontWeight: 700, color: '#001d3d' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                            <span>{cursista.nome || cursista.nome_cursista}</span>
                            {cursista.cgm?.startsWith('777901') && (
                              <span style={{ backgroundColor: '#fef3c7', color: '#92400e', padding: '0.15rem 0.45rem', borderRadius: '4px', fontSize: '0.68rem', fontWeight: 800 }}>
                                🧪 TESTE ADMIN
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                            Padrão {cursista.linha_funcional || 1} · {cursista.cgm_lf || `${cursista.cgm}_${cursista.linha_funcional || 1}`}
                          </div>
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
                          <span style={{ backgroundColor: '#f1f5f9', color: '#334155', padding: '0.2rem 0.55rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700 }}>
                            {ev.chamamentoTexto}
                          </span>
                        </td>
                        <td style={{ padding: '0.7rem 0.75rem' }}>
                          <span style={{ backgroundColor: tagBg, color: tagColor, padding: '0.25rem 0.6rem', borderRadius: '6px', fontSize: '0.74rem', fontWeight: 800 }}>
                            {ev.tituloStatus}
                          </span>
                        </td>
                        <td style={{ padding: '0.7rem 0.75rem', textAlign: 'center' }}>
                          {!isElegivel ? (
                            <span style={{ color: '#94a3b8', fontSize: '0.74rem' }}>Não se aplica</span>
                          ) : cursista.dispensadoPorEscolha ? (
                            <span style={{ backgroundColor: '#ede9fe', color: '#6d28d9', padding: '0.2rem 0.55rem', borderRadius: '6px', fontWeight: 800, fontSize: '0.7rem' }}>
                              Optou por outro Padrão
                            </span>
                          ) : cursista.inscrito ? (
                            <span style={{ backgroundColor: '#dcfce7', color: '#166534', padding: '0.2rem 0.55rem', borderRadius: '6px', fontWeight: 800, fontSize: '0.74rem' }}>
                              ✓ Confirmado
                            </span>
                          ) : (
                            <span style={{ backgroundColor: '#fed7aa', color: '#9a3412', padding: '0.2rem 0.55rem', borderRadius: '6px', fontWeight: 800, fontSize: '0.74rem' }}>
                              ⏳ Pendente
                            </span>
                          )}
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
                                gap: '0.35rem'
                              }}
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

            {totalPaginas > 1 && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 1.25rem', borderTop: '1px solid #e2e8f0', fontSize: '0.78rem', color: '#64748b' }}>
                <span>Página <strong>{pagina}</strong> de <strong>{totalPaginas}</strong></span>
                <div style={{ display: 'flex', gap: '0.4rem' }}>
                  <button disabled={pagina === 1} onClick={() => setPagina(p => Math.max(1, p - 1))} style={{ padding: '0.35rem 0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: 'white', cursor: pagina === 1 ? 'not-allowed' : 'pointer' }}>Anterior</button>
                  <button disabled={pagina === totalPaginas} onClick={() => setPagina(p => Math.min(totalPaginas, p + 1))} style={{ padding: '0.35rem 0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: 'white', cursor: pagina === totalPaginas ? 'not-allowed' : 'pointer' }}>Próxima</button>
                </div>
              </div>
            )}
          </div>

        </div>
      )}

      {/* ── MODAL: JUSTIFICATIVA DE ATENDIMENTO ESPECIAL ── */}
      {modalAtendimentoEspecial && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 15, 30, 0.75)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 999999,
          padding: '1.5rem'
        }}>
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '16px',
            maxWidth: '580px',
            width: '100%',
            overflow: 'hidden',
            boxShadow: '0 20px 40px rgba(0,0,0,0.3)'
          }}>
            <div style={{
              backgroundColor: '#002d5c',
              padding: '1.25rem 1.5rem',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '1.4rem' }}>♿</span>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800 }}>
                    Solicitação de Atendimento Especial
                  </h3>
                  <span style={{ fontSize: '0.76rem', opacity: 0.85 }}>Intenção de Vaga 2027</span>
                </div>
              </div>
              <button
                onClick={() => setModalAtendimentoEspecial(null)}
                style={{ background: 'none', border: 'none', color: 'white', fontSize: '1.2rem', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ backgroundColor: '#f8fafc', padding: '0.85rem 1rem', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.84rem' }}>
                <div><strong>Docente:</strong> {modalAtendimentoEspecial.cursista?.nome || modalAtendimentoEspecial.cursista?.nome_cursista}</div>
                <div><strong>CGM:</strong> {modalAtendimentoEspecial.cursista?.cgm}</div>
                <div><strong>NRE:</strong> {modalAtendimentoEspecial.cursista?.nre_exe || modalAtendimentoEspecial.cursista?.nre}</div>
                <div><strong>Componente:</strong> {modalAtendimentoEspecial.cursista?.componente_conc || modalAtendimentoEspecial.cursista?.componente}</div>
                <div><strong>Turno Solicitado:</strong> {modalAtendimentoEspecial.intencao?.turnoPretendido || modalAtendimentoEspecial.intencao?.opcao_turno}</div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 800, color: '#001d3d', marginBottom: '0.35rem' }}>
                  Descrição / Justificativa Apresentada pelo Cursista:
                </label>
                <div style={{
                  backgroundColor: '#fffbeb',
                  border: '1px solid #fef08a',
                  borderRadius: '8px',
                  padding: '1rem',
                  fontSize: '0.88rem',
                  color: '#78350f',
                  lineHeight: 1.5,
                  whiteSpace: 'pre-wrap'
                }}>
                  {modalAtendimentoEspecial.intencao?.descricaoAtendimentoEspecializado || 'Nenhum detalhe adicional inserido.'}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                <button
                  onClick={() => setModalAtendimentoEspecial(null)}
                  style={{
                    backgroundColor: '#002d5c',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '0.6rem 1.25rem',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: SIMULAÇÃO DA VISÃO DO CURSISTA ── */}
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
