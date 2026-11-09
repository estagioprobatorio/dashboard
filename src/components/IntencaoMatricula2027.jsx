import React, { useState, useEffect, useMemo } from 'react';
import { supabase, isConfigured as isSupabaseConfigured } from '../supabase';
import { driveDataService } from '../services/driveDataService';
import { tidbService } from '../services/tidbService';

/**
 * MAPEAMENTO DE DIAS DA SEMANA POR COMPONENTE CURRICULAR (BASE OFICIAL 2026)
 */
export const DIAS_POR_COMPONENTE = {
  'MATEMATICA': 'Sexta-feira (6ª feira)',
  'MATEMÁTICA': 'Sexta-feira (6ª feira)',
  'ARTE': 'Quinta-feira (5ª feira)',
  'ARTES': 'Quinta-feira (5ª feira)',
  'EDUCACAO FISICA': 'Quinta-feira (5ª feira)',
  'EDUCAÇÃO FÍSICA': 'Quinta-feira (5ª feira)',
  'INGLES': 'Quinta-feira (5ª feira)',
  'INGLÊS': 'Quinta-feira (5ª feira)',
  'PORTUGUES': 'Quinta-feira (5ª feira)',
  'PORTUGUÊS': 'Quinta-feira (5ª feira)',
  'LINGUA PORTUGUESA': 'Quinta-feira (5ª feira)',
  'LÍNGUA PORTUGUESA': 'Quinta-feira (5ª feira)',
  'BIOLOGIA': 'Terça-feira (3ª feira)',
  'CIENCIAS': 'Terça-feira (3ª feira)',
  'CIÊNCIAS': 'Terça-feira (3ª feira)',
  'FISICA': 'Terça-feira (3ª feira)',
  'FÍSICA': 'Terça-feira (3ª feira)',
  'QUIMICA': 'Terça-feira (3ª feira)',
  'QUÍMICA': 'Terça-feira (3ª feira)',
  'EQUIPE PEDAGOGICA': 'Segunda-feira (2ª feira)',
  'EQUIPE PEDAGÓGICA': 'Segunda-feira (2ª feira)',
  'FILOSOFIA': 'Segunda-feira (2ª feira)',
  'GEOGRAFIA': 'Segunda-feira (2ª feira)',
  'HISTORIA': 'Segunda-feira (2ª feira)',
  'HISTÓRIA': 'Segunda-feira (2ª feira)',
  'SOCIOLOGIA': 'Segunda-feira (2ª feira)',
  'TECNICOS': 'Segunda-feira (2ª feira)',
  'TÉCNICOS': 'Segunda-feira (2ª feira)'
};

export const LISTA_TODOS_COMPONENTES = [
  'ARTE',
  'BIOLOGIA',
  'CIÊNCIAS',
  'EDUCAÇÃO FÍSICA',
  'EQUIPE PEDAGÓGICA',
  'FILOSOFIA',
  'FÍSICA',
  'GEOGRAFIA',
  'HISTÓRIA',
  'INGLÊS',
  'MATEMÁTICA',
  'PORTUGUÊS',
  'QUÍMICA',
  'SOCIOLOGIA',
  'TÉCNICOS',
  'OUTRO'
];

/**
 * Converte data de início do vínculo para o número ordinal oficial do Chamamento
 */
export function resolverNumeroChamamento(raw, dataAlt = '') {
  const str = String(raw || '').trim().toLowerCase();
  
  // 1. Extração direta por ordinal ou menção explícita
  if (/1[º°oª\s]|1º\s*cham|primeiro/i.test(str)) return 1;
  if (/2[º°oª\s]|2º\s*cham|segundo/i.test(str)) return 2;
  if (/3[º°oª\s]|3º\s*cham|terceiro/i.test(str)) return 3;
  if (/4[º°oª\s]|4º\s*cham|quarto/i.test(str)) return 4;
  if (/5[º°oª\s]|5º\s*cham|quinto/i.test(str)) return 5;
  if (/6[º°oª\s]|6º\s*cham|sexto/i.test(str)) return 6;

  // 2. Se for uma data (DD/MM/YYYY) ou se houver data alternativa
  const dateStr = /^\d{1,2}\/\d{1,2}\/\d{4}/.test(str) ? str : String(dataAlt || '').trim();
  const matchData = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (matchData) {
    const dia = parseInt(matchData[1], 10);
    const mes = parseInt(matchData[2], 10);
    const ano = parseInt(matchData[3], 10);

    // Datas exatas da SEED/PR:
    // 15/01/2024 -> 1º Chamamento
    // 03/06/2024 -> 2º Chamamento
    // 13/01/2025 -> 3º Chamamento
    // 24/07/2025 -> 4º Chamamento
    // 03/02/2026 -> 5º Chamamento
    // 23/07/2026 -> 6º Chamamento
    if (ano <= 2024) {
      return (ano === 2024 && mes <= 2) ? 1 : 2;
    }
    if (ano === 2025) {
      return mes <= 5 ? 3 : 4;
    }
    if (ano >= 2026) {
      return mes <= 5 ? 5 : 6;
    }
  }

  // 3. Fallback numérico isolado (apenas se for 1 a 6)
  const matchNum = str.match(/\b([1-6])\b/);
  if (matchNum) return parseInt(matchNum[1], 10);

  return null;
}

/**
 * LÓGICA DE AVANÇO E EVOLUÇÃO INDIVIDUAL DO CURSISTA PARA 2027/1
 * - 1º Chamamento: Já encerrou todo o ciclo. NÃO elegível para vaga em 2027.
 * - 2º Chamamento: Encerra em dezembro de 2026. NÃO elegível para vaga em 2027.
 * - 3º, 4º e 5º Chamamento: Elegíveis. Requerem turmas de 2º/3º ano.
 * - 6º Chamamento: Elegíveis. Requerem turmas de 1º ano.
 */
export function calcularEvolucaoCursista2027(cursista) {
  const rawChamamento = String(
    cursista?.chamamento || cursista?.CHAMAMENTO || cursista?.chamamento_cursista || ''
  ).trim();
  const periodoIni = String(cursista?.periodo_ini || cursista?.data_inicio || '').trim();

  let numChamamento = resolverNumeroChamamento(rawChamamento, periodoIni);

  // Se ainda for nulo, infere pelo ano formativo da turma atual
  if (!numChamamento) {
    const anoAtual = String(cursista?.ano_formativo || '').toUpperCase();
    numChamamento = anoAtual.includes('1') ? 6 : 3;
  }

  if (numChamamento === 1) {
    return {
      numChamamento: 1,
      chamamentoTexto: '1º Chamamento',
      status2027: 'encerrado',
      elegivelIntencao: false,
      tituloStatus: 'Ciclo Encerrado',
      badgeCor: '#00984a',
      mensagem: 'O 1º Chamamento já completou integralmente todos os ciclos formativos do Estágio Probatório. Não há necessidade de turmas para 2027.',
      anoNecessario2027: null,
      detalhes: 'Ciclo completo de 3 anos formativos finalizado com êxito.'
    };
  }

  if (numChamamento === 2) {
    return {
      numChamamento: 2,
      chamamentoTexto: '2º Chamamento',
      status2027: 'encerra_dezembro_2026',
      elegivelIntencao: false,
      tituloStatus: 'Encerra em Dezembro/2026',
      badgeCor: '#00984a',
      mensagem: 'O ciclo formativo do 2º Chamamento encerra em dezembro de 2026. O estágio probatório será concluído neste ano letivo, sem necessidade de turmas para 2027.',
      anoNecessario2027: null,
      detalhes: 'Encerramento regular previsto para o término do semestre 2026/2.'
    };
  }

  if (numChamamento === 3 || numChamamento === 4 || numChamamento === 5) {
    return {
      numChamamento,
      chamamentoTexto: `${numChamamento}º Chamamento`,
      status2027: 'precisa_turma_2_3_ano',
      elegivelIntencao: true,
      tituloStatus: 'Turma de 2º/3º Ano',
      badgeCor: '#0072bc',
      mensagem: `Docente do ${numChamamento}º Chamamento: para o 1º semestre de 2027, você necessita de turmas de 2º/3º ano para dar continuidade ao seu plano formativo.`,
      anoNecessario2027: '2º/3º ANO',
      detalhes: 'Avanço formativo programado para turmas integradas de 2º/3º ano.'
    };
  }

  // 6º Chamamento
  return {
    numChamamento: 6,
    chamamentoTexto: '6º Chamamento',
    status2027: 'precisa_turma_1_ano',
    elegivelIntencao: true,
    tituloStatus: 'Turma de 1º Ano',
    badgeCor: '#0284c7',
    mensagem: 'Docente do 6º Chamamento: para o 1º semestre de 2027, você necessita de turmas de 1º ano para continuidade da formação pedagógica inicial.',
    anoNecessario2027: '1º ANO',
    detalhes: 'Continuidade da etapa formativa de 1º ano em 2027/1.'
  };
}

export default function IntencaoMatricula2027({
  cursista,
  records = [],
  userEmail,
  isSimulacao = false,
  onIntencaoSalva,
  todosVinculos = [],
  isModalidadesIguais = false,
  isModalidadesDiferentesOuChamamentosDiferentes = false,
  onTrocarPadrao
}) {
  const [salvando, setSalvando] = useState(false);
  const [sucesso, setSucesso] = useState(false);
  const [registroExistente, setRegistroExistente] = useState(null);
  const [showInformativoModal, setShowInformativoModal] = useState(() => {
    return sessionStorage.getItem('fechou_informativo_2027') !== 'true';
  });

  const fecharInformativo = () => {
    sessionStorage.setItem('fechou_informativo_2027', 'true');
    setShowInformativoModal(false);
  };

  // Calcula a evolução do cursista
  const evolucao = useMemo(() => {
    return calcularEvolucaoCursista2027(cursista);
  }, [cursista]);

  // Componente e NRE não editáveis
  const componenteCursista = useMemo(() => {
    return cursista?.componente_conc || cursista?.componente_turma || cursista?.componente || 'Geral';
  }, [cursista]);

  const nreCursista = useMemo(() => {
    return cursista?.nre_exe || cursista?.nre || 'NRE de Lotação';
  }, [cursista]);

  // Dia da semana fixo pelo componente (Não pode escolher)
  const diaSemanaFixo = useMemo(() => {
    const compNorm = String(componenteCursista).trim().toUpperCase();
    if (DIAS_POR_COMPONENTE[compNorm]) {
      return DIAS_POR_COMPONENTE[compNorm];
    }
    // Procura por correspondência parcial
    for (const [k, v] of Object.entries(DIAS_POR_COMPONENTE)) {
      if (compNorm.includes(k) || k.includes(compNorm)) {
        return v;
      }
    }
    // Se a base do cursista já tiver dia_da_semana
    if (cursista?.dia_da_semana) {
      return cursista.dia_da_semana;
    }
    return 'Definido pelo Calendário Pedagógico';
  }, [componenteCursista, cursista]);

  // Lista de Turmas de 2026 existentes para o componente e chamamento dele (Somente Lista, Não Editável)
  const turmasDisponiveis2026 = useMemo(() => {
    if (!records || records.length === 0 || !cursista) return [];
    const compNorm = String(componenteCursista).trim().toUpperCase();
    const chamNorm = String(cursista.chamamento || cursista.CHAMAMENTO || '').trim();

    const mapTurmas = new Map();
    records.forEach(r => {
      const c = String(r.componente_conc || r.componente || '').trim().toUpperCase();
      const ch = String(r.chamamento || r.CHAMAMENTO || '').trim();
      const tNome = String(r.turmas || r.turma || '').trim();

      const mesmoComp = (c === compNorm) || (c.includes(compNorm)) || (compNorm.includes(c));
      const mesmoCham = (ch === chamNorm) || (evolucao.numChamamento && ch.includes(String(evolucao.numChamamento)));

      if (mesmoComp && mesmoCham && tNome) {
        if (!mapTurmas.has(tNome)) {
          const turno = r.turno || '—';
          const dia = r.dia_da_semana || '—';
          const hIni = r.horario_inicial || '';
          const hFim = r.horario_fim || '';
          const horarioFormatado = (hIni && hFim) ? `${hIni} às ${hFim}` : (hIni || '—');

          mapTurmas.set(tNome, {
            nomeTurma: tNome,
            turno: turno.toUpperCase(),
            diaSemana: dia,
            horarioInicial: hIni,
            horarioFim: hFim,
            horarioFormatado,
            anoFormativo: r.ano_formativo || '—'
          });
        }
      }
    });

    return Array.from(mapTurmas.values()).sort((a, b) => a.nomeTurma.localeCompare(b.nomeTurma));
  }, [records, cursista, componenteCursista, evolucao]);

  // Horários praticados em 2026 filtrados pelo Turno selecionado
  const getHorariosPorTurno = (turnoSelecionado) => {
    const turnoUpper = String(turnoSelecionado || '').toUpperCase();
    const setHorarios = new Set();

    turmasDisponiveis2026.forEach(t => {
      if (t.turno.includes(turnoUpper) || turnoUpper.includes(t.turno)) {
        if (t.horarioFormatado && t.horarioFormatado !== '—') {
          setHorarios.add(t.horarioFormatado);
        }
      }
    });

    // Se encontrou horários específicos na lista de turmas
    if (setHorarios.size > 0) {
      return Array.from(setHorarios).sort();
    }

    // Horários padrão de referência caso não tenha turma mapeada naquele turno específico
    if (turnoUpper === 'MANHÃ' || turnoUpper === 'MANHA') {
      return ['08:00 às 09:40', '10:00 às 11:40'];
    }
    if (turnoUpper === 'TARDE') {
      return ['13:30 às 15:10', '15:30 às 17:10'];
    }
    if (turnoUpper === 'NOITE') {
      return ['18:10 às 19:50', '20:00 às 21:40'];
    }
    return ['08:00 às 09:40', '13:30 às 15:10', '18:10 às 19:50'];
  };

  // Formulário com valores padrão
  const [form, setForm] = useState({
    turnoPretendido: 'Noite',
    horarioPretendido: '18:10 às 19:50',
    necessitaAtendimentoEspecializado: 'Não',
    descricaoAtendimentoEspecializado: '',
    decisaoDuasMatriculas: 'manter_duas', // 'manter_duas' | 'apenas_padrao_1' | 'apenas_padrao_2'
    termoAceito: false
  });

  // Lista dinâmica de horários para o turno atual
  const horariosDisponiveis = useMemo(() => {
    return getHorariosPorTurno(form.turnoPretendido);
  }, [form.turnoPretendido, turmasDisponiveis2026]);

  // Ajusta o horário pretendido caso o turno mude e o horário atual não pertença à nova lista
  useEffect(() => {
    if (horariosDisponiveis.length > 0 && !horariosDisponiveis.includes(form.horarioPretendido)) {
      setForm(prev => ({
        ...prev,
        horarioPretendido: horariosDisponiveis[0]
      }));
    }
  }, [horariosDisponiveis]);

  // Identificação única da matrícula (CGM_LF)
  const lfAtual = String(cursista?.linha_funcional || cursista?.lf || '1').trim();
  const cgmAtual = String(cursista?.cgm || '').trim();
  const cgm_lf = cgmAtual ? `${cgmAtual}_${lfAtual}` : `${(userEmail || '').trim().toLowerCase()}_${lfAtual}`;

  // Carrega registro existente do Cursista específico para esta matrícula (CGM_LF)
  useEffect(() => {
    const carregarRegistro = async () => {
      const email = (userEmail || cursista?.email || cursista?.['e-mail'] || '').trim().toLowerCase();
      const cgm = String(cursista?.cgm || '').trim();
      const lf = String(cursista?.linha_funcional || cursista?.lf || '1').trim();
      const chaveMatricula = cgm ? `${cgm}_${lf}` : `${email}_${lf}`;

      // 1. Tenta carregar do LocalStorage por CGM_LF (prioridade máxima para dois padrões)
      try {
        const localLf = localStorage.getItem(`intencao_2027_${chaveMatricula}`);
        if (localLf) {
          const parsed = JSON.parse(localLf);
          setRegistroExistente(parsed);
          setForm(prev => ({ ...prev, ...parsed }));
          return;
        }

        // Tenta buscar na lista geral de intenções
        const listaGeralRaw = localStorage.getItem('intencoes_2027_todas');
        if (listaGeralRaw) {
          const listaGeral = JSON.parse(listaGeralRaw);
          const achadoGeral = listaGeral.find(item => {
            const itemKey = item.cgm_lf || (item.cgm_cursista ? `${item.cgm_cursista}_${item.linha_funcional || 1}` : null);
            return itemKey === chaveMatricula;
          });
          if (achadoGeral) {
            setRegistroExistente(achadoGeral);
            setForm(prev => ({ ...prev, ...achadoGeral }));
            return;
          }
        }
      } catch (e) {
        console.warn('Erro ao ler localStorage por chaveMatricula:', e);
      }

      // 2. Tenta carregar do TiDB Cloud Serverless
      try {
        const cached = localStorage.getItem('ep_tidb_cached_bundle');
        let listaIntencoes = [];
        if (cached) {
          const pacote = JSON.parse(cached);
          if (pacote.intencoes2027 && Array.isArray(pacote.intencoes2027)) {
            listaIntencoes = pacote.intencoes2027;
          }
        }
        const achado = listaIntencoes.find(i => {
          const itemKey = i.cgm_lf || (i.cgm ? `${i.cgm}_${i.linha_funcional || 1}` : null);
          if (itemKey && itemKey === chaveMatricula) return true;
          return (cgm && String(i.cgm) === cgm) || (email && String(i.email || '').trim().toLowerCase() === email);
        });
        if (achado) {
          setRegistroExistente(achado);
          setForm(prev => ({
            ...prev,
            turnoPretendido: achado.opcao_turno || prev.turnoPretendido,
            horarioPretendido: achado.opcao_modalidade || prev.horarioPretendido,
            descricaoAtendimentoEspecializado: achado.observacao || ''
          }));
          return;
        }
      } catch (e) {
        console.warn('[Intencao 2027] Falha ao verificar TiDB:', e);
      }

      // 3. Fallback legado simples por CGM
      try {
        const key = cgm ? `intencao_2027_cgm_${cgm}` : `intencao_2027_${email}`;
        const local = localStorage.getItem(key);
        if (local) {
          const parsed = JSON.parse(local);
          setRegistroExistente(parsed);
          setForm(prev => ({ ...prev, ...parsed }));
        }
      } catch (e) {
        console.error(e);
      }
    };

    carregarRegistro();
  }, [userEmail, cursista]);

  const handleSalvar = async (e) => {
    e.preventDefault();
    if (!form.termoAceito) {
      alert('Para confirmar a pré-inscrição de intenção de vaga para 2027, é obrigatório assinalar o termo de ciência e concordância.');
      return;
    }

    setSalvando(true);
    setSucesso(false);

    const email = (userEmail || cursista?.email || cursista?.['e-mail'] || '').trim().toLowerCase();
    const cgm = String(cursista?.cgm || '').trim();
    const lf = String(cursista?.linha_funcional || cursista?.lf || '1').trim();
    const chaveMatricula = cgm ? `${cgm}_${lf}` : `${email}_${lf}`;
    const nome = cursista?.nome || cursista?.nome_cursista || 'Docente Cursista';

    const dadosRegistro = {
      ...form,
      termo_aceito: true,
      data_aceite_termo: new Date().toISOString(),
      id: `intencao-${chaveMatricula}-${Date.now()}`,
      cgm_lf: chaveMatricula,
      linha_funcional: lf,
      nome_cursista: nome,
      email_cursista: email,
      cgm_cursista: cgm,
      cpf_cursista: cursista?.cpf || cursista?.cpf_cursista || '',
      chamamento: cursista?.chamamento || cursista?.CHAMAMENTO || '',
      num_chamamento: evolucao.numChamamento,
      nre: nreCursista,
      componente: componenteCursista,
      dia_semana_formativo: diaSemanaFixo,
      ano_formativo_pretendido: evolucao.anoNecessario2027,
      ano_formativo_anterior: cursista?.ano_formativo || '',
      turma_anterior: cursista?.turmas || cursista?.turma || '',
      decisao_duas_matriculas: isModalidadesIguais ? form.decisaoDuasMatriculas : 'independente',
      created_at: new Date().toISOString()
    };

    // 1. Salva no TiDB Cloud Serverless
    try {
      await tidbService.salvarIntencao2027(dadosRegistro);
    } catch (err) {
      console.warn('[TiDB] Erro ao salvar intenção via tidbService:', err);
    }

    // 2. Salva via Drive Service (Google Sheets / Drive)
    try {
      await driveDataService.salvarIntencao2027(dadosRegistro);
    } catch (err) {
      console.warn('Erro ao salvar intenção via DriveService:', err);
    }

    // 3. Salva no LocalStorage com chave específica por matrícula (CGM_LF)
    try {
      const keyLf = `intencao_2027_${chaveMatricula}`;
      localStorage.setItem(keyLf, JSON.stringify(dadosRegistro));

      const keyLegacy = cgm ? `intencao_2027_cgm_${cgm}` : `intencao_2027_${email}`;
      localStorage.setItem(keyLegacy, JSON.stringify(dadosRegistro));

      const listaGeralRaw = localStorage.getItem('intencoes_2027_todas');
      const listaGeral = listaGeralRaw ? JSON.parse(listaGeralRaw) : [];
      const semDuplicata = listaGeral.filter(item => {
        const itemKey = item.cgm_lf || (item.cgm_cursista ? `${item.cgm_cursista}_${item.linha_funcional || 1}` : null);
        if (itemKey && itemKey === chaveMatricula) return false;
        if (!itemKey && item.cgm_cursista === cgm && item.email_cursista === email) return false;
        return true;
      });
      semDuplicata.unshift(dadosRegistro);
      localStorage.setItem('intencoes_2027_todas', JSON.stringify(semDuplicata));
    } catch (err) {
      console.error(err);
    }

    setRegistroExistente(dadosRegistro);
    if (typeof onIntencaoSalva === 'function') {
      try { onIntencaoSalva(dadosRegistro); } catch (e) { console.warn(e); }
    }
    setSalvando(false);
    setSucesso(true);
    setTimeout(() => setSucesso(false), 5000);
  };

  const nomeExibicao = cursista?.nome || cursista?.nome_cursista || 'Docente Cursista';

  return (
    <div style={{ maxWidth: '980px', margin: '0 auto', padding: '1rem', boxSizing: 'border-box' }}>
      
      {/* ── MODAL INFORMATIVO OFICIAL AO CURSISTA (POPUP AO LOGAR / ACESSAR) ── */}
      {showInformativoModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 29, 61, 0.75)',
          backdropFilter: 'blur(5px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 99999,
          padding: '1rem'
        }}>
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '16px',
            maxWidth: '680px',
            width: '100%',
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.25)',
            border: '1px solid #cbd5e1',
            overflow: 'hidden',
            animation: 'fadeIn 0.25s ease-out'
          }}>
            {/* Topo do Modal */}
            <div style={{
              background: 'linear-gradient(135deg, #001d3d 0%, #0072bc 100%)',
              padding: '1.5rem 1.75rem',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '1rem'
            }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                  <span style={{ fontSize: '1.4rem' }}>📢</span>
                  <span style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#86efac' }}>
                    SEED-PR · Estágio Probatório
                  </span>
                </div>
                <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, letterSpacing: '-0.02em' }}>
                  Solicitação da Intenção de Vaga · 2027
                </h2>
              </div>
              <button
                type="button"
                onClick={fecharInformativo}
                style={{
                  background: 'rgba(255, 255, 255, 0.15)',
                  border: 'none',
                  color: '#ffffff',
                  fontSize: '1.25rem',
                  cursor: 'pointer',
                  borderRadius: '50%',
                  width: '36px',
                  height: '36px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
                title="Fechar"
              >
                ✕
              </button>
            </div>

            {/* Conteúdo Informativo */}
            <div style={{ padding: '1.75rem', display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
              <p style={{ margin: 0, fontSize: '0.92rem', color: '#1e293b', lineHeight: 1.55 }}>
                Prezado(a) Docente Cursista, a Secretaria de Estado da Educação do Paraná inicia o processo de 
                <strong> sondagem e pré-inscrição de intenção de vagas para o ano letivo de 2027</strong>. 
                Por favor, atente-se às seguintes orientações antes de registrar suas preferências:
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                <div style={{ display: 'flex', gap: '0.75rem', backgroundColor: '#f8fafc', padding: '0.85rem 1rem', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                  <span style={{ fontSize: '1.2rem', color: '#0072bc' }}>🎯</span>
                  <div style={{ fontSize: '0.83rem', color: '#334155', lineHeight: 1.45 }}>
                    <strong>Finalidade da Pré-inscrição:</strong> Este procedimento é estritamente destinado à previsão e organização antecipada da abertura de turmas de 1º e de 2º/3º ano para 2027.
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.75rem', backgroundColor: '#f0fdf4', padding: '0.85rem 1rem', borderRadius: '10px', border: '1px solid #bbf7d0' }}>
                  <span style={{ fontSize: '1.2rem', color: '#00984a' }}>⚖️</span>
                  <div style={{ fontSize: '0.83rem', color: '#166534', lineHeight: 1.45 }}>
                    <strong>Critério de Priorização:</strong> O turno e o horário que você indicar serão priorizados na formação mediante a confirmação do seu suprimento no mesmo turno durante a distribuição oficial de aulas de 2027.
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.75rem', backgroundColor: '#eff6ff', padding: '0.85rem 1rem', borderRadius: '10px', border: '1px solid #bfdbfe' }}>
                  <span style={{ fontSize: '1.2rem', color: '#0284c7' }}>♿</span>
                  <div style={{ fontSize: '0.83rem', color: '#1e40af', lineHeight: 1.45 }}>
                    <strong>Atendimento Especial:</strong> Caso necessite de adaptação pedagógica ou atendimento especializado, selecione a opção no formulário e detalhe a necessidade.
                  </div>
                </div>
              </div>

              {/* Botão de Aceite do Informativo */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={fecharInformativo}
                  style={{
                    backgroundColor: '#00984a',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '0.75rem 1.6rem',
                    fontSize: '0.9rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(0, 152, 74, 0.25)'
                  }}
                >
                  ✓ Entendido, Prosseguir para o Formulário
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── CARD PRINCIPAL COM CABEÇALHO ── */}
      <div style={{
        backgroundColor: '#ffffff',
        borderRadius: '16px',
        border: '1px solid #e2e8f0',
        boxShadow: '0 4px 20px rgba(0, 29, 61, 0.08)',
        overflow: 'hidden',
        marginBottom: '1.5rem'
      }}>
        {/* Topo Institucional */}
        <div style={{
          background: 'linear-gradient(135deg, #001d3d 0%, #002d5c 60%, #0072bc 100%)',
          padding: '1.75rem 2rem',
          color: '#ffffff',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.35rem' }}>
              <span style={{ fontSize: '1.5rem' }}>📝</span>
              <h1 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800, letterSpacing: '-0.02em' }}>
                Intenção de Vaga · 1º Semestre de 2027
              </h1>
            </div>
            <p style={{ margin: 0, fontSize: '0.88rem', color: 'rgba(255, 255, 255, 0.85)', lineHeight: 1.4 }}>
              Manifestação de preferência de turno e horário com base na oferta oficial de turmas da SEED/PR.
            </p>
          </div>

          <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.4rem' }}>
            <span style={{
              backgroundColor: 'rgba(255, 255, 255, 0.2)',
              color: '#ffffff',
              padding: '0.35rem 0.85rem',
              borderRadius: '999px',
              fontSize: '0.8rem',
              fontWeight: 800,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem'
            }}>
              <span>🗓️</span> Período Letivo 2027/1
            </span>
            <button
              type="button"
              onClick={() => setShowInformativoModal(true)}
              style={{
                background: 'none',
                border: 'none',
                color: '#86efac',
                fontSize: '0.78rem',
                fontWeight: 700,
                cursor: 'pointer',
                textDecoration: 'underline'
              }}
            >
              ℹ️ Ler Informativo Oficial
            </button>
          </div>
        </div>

        {/* Identificação do Cursista */}
        <div style={{
          padding: '1.25rem 2rem',
          backgroundColor: '#f8fafc',
          borderBottom: '1px solid #e2e8f0',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '1.1rem'
        }}>
          <div>
            <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>
              Docente Cursista
            </span>
            <div style={{ fontWeight: 800, fontSize: '0.98rem', color: '#001d3d', marginTop: '0.2rem' }}>
              {nomeExibicao}
            </div>
            {cursista?.cgm && <span style={{ fontSize: '0.75rem', color: '#64748b' }}>CGM: {cursista.cgm}</span>}
          </div>

          <div>
            <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>
              Chamamento de Ingresso
            </span>
            <div style={{ fontWeight: 800, fontSize: '0.98rem', color: '#0072bc', marginTop: '0.2rem' }}>
              {evolucao.chamamentoTexto}
            </div>
            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
              Início: {cursista?.periodo_ini || '—'} {cursista?.horario_inicial ? `· Horário: ${cursista.horario_inicial} às ${cursista.horario_fim || ''}` : ''}
            </span>
          </div>

          <div>
            <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>
              Turma Atual (2026)
            </span>
            <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#1e293b', marginTop: '0.2rem', wordBreak: 'break-word' }}>
              {cursista?.turmas || cursista?.turma || 'Turma não atribuída'}
            </div>
            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Etapa 2026: {cursista?.ano_formativo || '—'}</span>
          </div>

          <div>
            <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>
              Lotação / NRE
            </span>
            <div style={{ fontWeight: 700, fontSize: '0.88rem', color: '#1e293b', marginTop: '0.2rem' }}>
              📍 {nreCursista}
            </div>
            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>{cursista?.munic_exe || cursista?.municipio || 'Paraná'}</span>
          </div>
        </div>

        {/* ── SITUAÇÃO: CURSISTA NÃO ELEGÍVEL PARA 2027 (1º OU 2º CHAMAMENTO) ── */}
        {!evolucao.elegivelIntencao && (
          <div style={{ padding: '3rem 2rem', textAlign: 'center' }}>
            <div style={{ fontSize: '3.5rem', marginBottom: '0.85rem' }}>🎓</div>
            <h3 style={{ margin: '0 0 0.5rem 0', color: '#00984a', fontSize: '1.35rem', fontWeight: 800 }}>
              {evolucao.numChamamento === 1 ? 'Ciclo Formativo Encerrado' : 'Conclusão em Dezembro de 2026'}
            </h3>
            <p style={{ margin: '0 auto', maxWidth: '620px', color: '#334155', fontSize: '0.94rem', lineHeight: 1.6 }}>
              {evolucao.mensagem}
            </p>
            <div style={{
              marginTop: '1.5rem',
              display: 'inline-flex',
              padding: '0.85rem 1.5rem',
              backgroundColor: '#f0fdf4',
              borderRadius: '10px',
              border: '1px solid #bbf7d0',
              fontSize: '0.85rem',
              color: '#166534',
              fontWeight: 700
            }}>
              ✓ Docentes do {evolucao.chamamentoTexto} não necessitam manifestar intenção de vaga para 2027/1.
            </div>
          </div>
        )}

        {/* ── SITUAÇÃO: CURSISTA ELEGÍVEL (3º, 4º, 5º ou 6º CHAMAMENTO) ── */}
        {evolucao.elegivelIntencao && (
          <div style={{ padding: '1.75rem 2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

            {/* BOX INFORMATIVO DE ETAPA 2027/1 */}
            <div style={{
              backgroundColor: '#f0f9ff',
              border: '1px solid #bae6fd',
              borderLeft: '5px solid #0072bc',
              borderRadius: '12px',
              padding: '1.25rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '0.75rem'
            }}>
              <div>
                <div style={{ fontWeight: 800, fontSize: '0.98rem', color: '#001d3d', marginBottom: '0.2rem' }}>
                  🎯 Etapa Necessária para 2027/1: <strong>{evolucao.anoNecessario2027}</strong>
                </div>
                <div style={{ fontSize: '0.82rem', color: '#0369a1' }}>
                  {evolucao.detalhes} · Componente: <strong>{componenteCursista}</strong>
                </div>
              </div>

              <span style={{
                backgroundColor: '#0072bc',
                color: '#ffffff',
                padding: '0.4rem 0.9rem',
                borderRadius: '8px',
                fontWeight: 800,
                fontSize: '0.82rem'
              }}>
                {evolucao.chamamentoTexto}
              </span>
            </div>

            {/* ── LISTA DE TURMAS DE 2026 (SOMENTE LEITURA / NADA EDITÁVEL) ── */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <label style={{ fontSize: '0.82rem', fontWeight: 800, color: '#001d3d', textTransform: 'uppercase' }}>
                  📋 Turmas Existentes em 2026 ({componenteCursista} · {evolucao.chamamentoTexto})
                </label>
                <span style={{ fontSize: '0.74rem', color: '#64748b' }}>
                  Somente consulta de horários praticados · Nada editável
                </span>
              </div>

              {turmasDisponiveis2026.length > 0 ? (
                <div style={{
                  maxHeight: '210px',
                  overflowY: 'auto',
                  border: '1px solid #e2e8f0',
                  borderRadius: '10px',
                  backgroundColor: '#ffffff'
                }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#f8fafc', color: '#475569', textAlign: 'left', borderBottom: '1px solid #e2e8f0', position: 'sticky', top: 0 }}>
                        <th style={{ padding: '0.55rem 0.85rem', fontWeight: 800 }}>Turma Formativa</th>
                        <th style={{ padding: '0.55rem 0.65rem', fontWeight: 800 }}>Turno</th>
                        <th style={{ padding: '0.55rem 0.65rem', fontWeight: 800 }}>Dia da Semana</th>
                        <th style={{ padding: '0.55rem 0.85rem', fontWeight: 800 }}>Horário Praticado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {turmasDisponiveis2026.map((t, idx) => (
                        <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '0.5rem 0.85rem', fontWeight: 700, color: '#001d3d' }}>
                            {t.nomeTurma}
                          </td>
                          <td style={{ padding: '0.5rem 0.65rem', color: '#0369a1', fontWeight: 700 }}>
                            {t.turno}
                          </td>
                          <td style={{ padding: '0.5rem 0.65rem', color: '#475569' }}>
                            {t.diaSemana}
                          </td>
                          <td style={{ padding: '0.5rem 0.85rem', color: '#15803d', fontWeight: 700 }}>
                            {t.horarioFormatado}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div style={{ padding: '0.85rem', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.8rem', color: '#64748b' }}>
                  Turmas regulares de <strong>{componenteCursista}</strong> com horários padrão de atendimento da rede estadual.
                </div>
              )}
            </div>

            {/* ── FORMULÁRIO DE INTENÇÃO DE VAGAS 2027 ── */}
            <form onSubmit={handleSalvar} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              
              {/* Mensagem de sucesso */}
              {sucesso && (
                <div style={{
                  backgroundColor: '#f0fdf4',
                  border: '1px solid #bbf7d0',
                  color: '#166534',
                  padding: '0.85rem 1.25rem',
                  borderRadius: '8px',
                  fontSize: '0.88rem',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}>
                  <span>✓</span> Intenção de vaga para a matrícula <strong>{cgm_lf}</strong> registrada com sucesso no sistema da SEED/PR!
                </div>
              )}

              {/* Alerta de Obrigatoriedade por Matrícula (CGM_LF) para Modalidades Diferentes ou Chamamentos Diferentes */}
              {isModalidadesDiferentesOuChamamentosDiferentes && (
                <div style={{
                  backgroundColor: '#fffbeb',
                  border: '2px solid #fde047',
                  borderRadius: '12px',
                  padding: '1rem 1.25rem',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '0.75rem'
                }}>
                  <span style={{ fontSize: '1.4rem' }}>⚠️</span>
                  <div>
                    <strong style={{ fontSize: '0.88rem', color: '#92400e', display: 'block' }}>
                      Obrigatório realizar um preenchimento para cada matrícula (definida pelo CGM_LF):
                    </strong>
                    <span style={{ fontSize: '0.8rem', color: '#b45309', lineHeight: 1.45, display: 'block', marginTop: '0.25rem' }}>
                      Identificamos que suas matrículas possuem <strong>modalidades ou chamamentos diferentes</strong>. Conforme as regras da SEED-PR, você deve registrar e confirmar a intenção de vaga para cada padrão ({cgm_lf}) separadamente.
                    </span>
                  </div>
                </div>
              )}

              {registroExistente && !sucesso && (
                <div style={{
                  backgroundColor: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  padding: '0.75rem 1rem',
                  fontSize: '0.82rem',
                  color: '#475569',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '0.5rem'
                }}>
                  <span>ℹ️ Você já registrou uma intenção anteriormente em <strong>{registroExistente.created_at ? new Date(registroExistente.created_at).toLocaleDateString('pt-BR') : 'data recente'}</strong>. Você pode atualizar suas preferências a qualquer momento.</span>
                </div>
              )}

              {/* GRID 1: DADOS FIXOS NÃO EDITÁVEIS */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
                
                {/* Etapa Formativa (Fixo) */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 800, color: '#475569', marginBottom: '0.3rem' }}>
                    ETAPA FORMATIVA 2027/1
                  </label>
                  <input
                    type="text"
                    readOnly
                    value={evolucao.anoNecessario2027}
                    style={{
                      width: '100%',
                      padding: '0.65rem 0.85rem',
                      borderRadius: '8px',
                      border: '1px solid #bae6fd',
                      backgroundColor: '#f0f9ff',
                      color: '#0369a1',
                      fontSize: '0.88rem',
                      fontWeight: 800,
                      cursor: 'not-allowed',
                      boxSizing: 'border-box'
                    }}
                  />
                  <span style={{ fontSize: '0.72rem', color: '#0284c7', display: 'block', marginTop: '0.25rem' }}>
                    🔒 Definido pela regra de avanço do {evolucao.chamamentoTexto}.
                  </span>
                </div>

                {/* Componente Curricular (Fixo) */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 800, color: '#475569', marginBottom: '0.3rem' }}>
                    COMPONENTE CURRICULAR
                  </label>
                  <input
                    type="text"
                    readOnly
                    value={componenteCursista}
                    style={{
                      width: '100%',
                      padding: '0.65rem 0.85rem',
                      borderRadius: '8px',
                      border: '1px solid #e2e8f0',
                      backgroundColor: '#f8fafc',
                      color: '#001d3d',
                      fontSize: '0.88rem',
                      fontWeight: 700,
                      cursor: 'not-allowed',
                      boxSizing: 'border-box'
                    }}
                  />
                  <span style={{ fontSize: '0.72rem', color: '#64748b', display: 'block', marginTop: '0.25rem' }}>
                    🔒 Vinculado ao seu concurso / suprimento.
                  </span>
                </div>

                {/* NRE (Fixo) */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 800, color: '#475569', marginBottom: '0.3rem' }}>
                    NÚCLEO REGIONAL (NRE)
                  </label>
                  <input
                    type="text"
                    readOnly
                    value={nreCursista}
                    style={{
                      width: '100%',
                      padding: '0.65rem 0.85rem',
                      borderRadius: '8px',
                      border: '1px solid #e2e8f0',
                      backgroundColor: '#f8fafc',
                      color: '#001d3d',
                      fontSize: '0.88rem',
                      fontWeight: 700,
                      cursor: 'not-allowed',
                      boxSizing: 'border-box'
                    }}
                  />
                  <span style={{ fontSize: '0.72rem', color: '#64748b', display: 'block', marginTop: '0.25rem' }}>
                    🔒 NRE de exercício e acompanhamento.
                  </span>
                </div>

                {/* Dia da Semana (Fixo pelo Componente) */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 800, color: '#475569', marginBottom: '0.3rem' }}>
                    DIA DA SEMANA FORMATIVO
                  </label>
                  <input
                    type="text"
                    readOnly
                    value={diaSemanaFixo}
                    style={{
                      width: '100%',
                      padding: '0.65rem 0.85rem',
                      borderRadius: '8px',
                      border: '1px solid #e2e8f0',
                      backgroundColor: '#f8fafc',
                      color: '#001d3d',
                      fontSize: '0.88rem',
                      fontWeight: 700,
                      cursor: 'not-allowed',
                      boxSizing: 'border-box'
                    }}
                  />
                  <span style={{ fontSize: '0.72rem', color: '#64748b', display: 'block', marginTop: '0.25rem' }}>
                    🔒 Definido pelo componente (Ex: Matemática às 6ª feiras).
                  </span>
                </div>

              </div>

              {/* GRID 2: PREFERÊNCIAS DE TURNO E HORÁRIO */}
              <div style={{
                backgroundColor: '#ffffff',
                border: '1px solid #cbd5e1',
                borderRadius: '12px',
                padding: '1.25rem',
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
                gap: '1.25rem'
              }}>
                
                {/* Turno Preferencial: Escolha entre Manhã, Tarde e Noite */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 800, color: '#001d3d', marginBottom: '0.35rem' }}>
                    TURNO PREFERENCIAL
                  </label>
                  <select
                    value={form.turnoPretendido}
                    onChange={e => setForm({ ...form, turnoPretendido: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '0.7rem 0.85rem',
                      borderRadius: '8px',
                      border: '1px solid #0072bc',
                      fontSize: '0.9rem',
                      fontWeight: 700,
                      backgroundColor: '#ffffff',
                      color: '#001d3d',
                      boxSizing: 'border-box'
                    }}
                  >
                    <option value="Manhã">Manhã</option>
                    <option value="Tarde">Tarde</option>
                    <option value="Noite">Noite</option>
                  </select>
                  <span style={{ fontSize: '0.72rem', color: '#64748b', display: 'block', marginTop: '0.25rem' }}>
                    Selecione o turno de sua preferência para os encontros.
                  </span>
                </div>

                {/* Horário Preferencial: De acordo com as turmas de 2026 */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 800, color: '#001d3d', marginBottom: '0.35rem' }}>
                    HORÁRIO PREFERENCIAL (TURMAS DE 2026)
                  </label>
                  <select
                    value={form.horarioPretendido}
                    onChange={e => setForm({ ...form, horarioPretendido: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '0.7rem 0.85rem',
                      borderRadius: '8px',
                      border: '1px solid #0072bc',
                      fontSize: '0.9rem',
                      fontWeight: 700,
                      backgroundColor: '#ffffff',
                      color: '#001d3d',
                      boxSizing: 'border-box'
                    }}
                  >
                    {horariosDisponiveis.map(h => (
                      <option key={h} value={h}>{h}</option>
                    ))}
                  </select>
                  <span style={{ fontSize: '0.72rem', color: '#15803d', fontWeight: 600, display: 'block', marginTop: '0.25rem' }}>
                    ✓ Horários sincronizados com as turmas de {componenteCursista} no turno {form.turnoPretendido}.
                  </span>
                </div>

              </div>

              {/* ── SEÇÃO: OBSERVAÇÕES E CONSIDERAÇÕES FUNCIONAIS (APENAS ATENDIMENTO ESPECIAL) ── */}
              <div style={{
                backgroundColor: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '12px',
                padding: '1.25rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '1rem'
              }}>
                <div style={{ fontWeight: 800, fontSize: '0.85rem', color: '#001d3d', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                  📋 Observações e Considerações Funcionais
                </div>

                {/* Pergunta única: Necessita de atendimento especializado? */}
                <div style={{ backgroundColor: '#ffffff', padding: '1rem', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 800, color: '#1e293b', marginBottom: '0.4rem' }}>
                    Necessita de atendimento especializado ou adaptação pedagógica?
                  </label>
                  <select
                    value={form.necessitaAtendimentoEspecializado}
                    onChange={e => setForm({ ...form, necessitaAtendimentoEspecializado: e.target.value })}
                    style={{ width: '100%', maxWidth: '240px', padding: '0.55rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                  >
                    <option value="Não">Não</option>
                    <option value="Sim">Sim</option>
                  </select>

                  {form.necessitaAtendimentoEspecializado === 'Sim' && (
                    <div style={{ marginTop: '0.85rem' }}>
                      <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#001d3d', marginBottom: '0.35rem' }}>
                        Descreva a necessidade de atendimento especializado ou adaptação pedagógica:
                      </label>
                      <textarea
                        rows={3}
                        required
                        placeholder="Descreva aqui os detalhes da necessidade de atendimento especializado ou recursos pedagógicos de acessibilidade..."
                        value={form.descricaoAtendimentoEspecializado}
                        onChange={e => setForm({ ...form, descricaoAtendimentoEspecializado: e.target.value })}
                        style={{
                          width: '100%',
                          padding: '0.65rem 0.85rem',
                          borderRadius: '8px',
                          border: '1px solid #cbd5e1',
                          fontSize: '0.85rem',
                          fontFamily: 'inherit',
                          boxSizing: 'border-box'
                        }}
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* ── SEÇÃO: ESCOLHA DE ALOCAÇÃO PARA MODALIDADES IGUAIS ── */}
              {isModalidadesIguais && (
                <div style={{
                  backgroundColor: '#f5f3ff',
                  border: '2px solid #a78bfa',
                  borderRadius: '12px',
                  padding: '1.25rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.85rem'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontSize: '1.4rem' }}>⚖️</span>
                    <div>
                      <strong style={{ fontSize: '0.9rem', color: '#5b21b6', textTransform: 'uppercase', letterSpacing: '0.02em' }}>
                        Opção de Alocação de Turmas para 2027 (Modalidades Iguais)
                      </strong>
                      <span style={{ fontSize: '0.78rem', color: '#6d28d9', display: 'block', marginTop: '0.15rem' }}>
                        Identificamos que você possui dois padrões na mesma modalidade ({componenteCursista}). Preencha os dados de ambos e assinale abaixo a sua escolha para o ano letivo de 2027:
                      </span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginTop: '0.25rem' }}>
                    <label style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '0.75rem',
                      padding: '0.85rem 1rem',
                      backgroundColor: form.decisaoDuasMatriculas === 'manter_duas' ? '#ede9fe' : '#ffffff',
                      border: form.decisaoDuasMatriculas === 'manter_duas' ? '2px solid #7c3aed' : '1px solid #cbd5e1',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}>
                      <input
                        type="radio"
                        name="decisaoDuasMatriculas"
                        value="manter_duas"
                        checked={form.decisaoDuasMatriculas === 'manter_duas'}
                        onChange={e => setForm({ ...form, decisaoDuasMatriculas: e.target.value })}
                        style={{ marginTop: '0.2rem', accentColor: '#7c3aed' }}
                      />
                      <div>
                        <strong style={{ fontSize: '0.86rem', color: '#4c1d95', display: 'block' }}>
                          🟢 Manter as DUAS matrículas ativas em turmas de 2027
                        </strong>
                        <span style={{ fontSize: '0.76rem', color: '#6d28d9' }}>
                          Desejo concorrer a vagas e atuar em turmas de ambos os padrões no ano letivo de 2027, nos turnos e horários indicados em cada formulário.
                        </span>
                      </div>
                    </label>

                    <label style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '0.75rem',
                      padding: '0.85rem 1rem',
                      backgroundColor: form.decisaoDuasMatriculas === 'apenas_padrao_1' ? '#ede9fe' : '#ffffff',
                      border: form.decisaoDuasMatriculas === 'apenas_padrao_1' ? '2px solid #7c3aed' : '1px solid #cbd5e1',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}>
                      <input
                        type="radio"
                        name="decisaoDuasMatriculas"
                        value="apenas_padrao_1"
                        checked={form.decisaoDuasMatriculas === 'apenas_padrao_1'}
                        onChange={e => setForm({ ...form, decisaoDuasMatriculas: e.target.value })}
                        style={{ marginTop: '0.2rem', accentColor: '#7c3aed' }}
                      />
                      <div>
                        <strong style={{ fontSize: '0.86rem', color: '#4c1d95', display: 'block' }}>
                          🔵 Optar por cursar apenas no Padrão 1 (Linha Funcional 1)
                        </strong>
                        <span style={{ fontSize: '0.76rem', color: '#6d28d9' }}>
                          Solicito abertura e priorização de vaga apenas para a Matrícula 1. O Padrão 2 não demandará abertura de vaga em turma formativa em 2027.
                        </span>
                      </div>
                    </label>

                    <label style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '0.75rem',
                      padding: '0.85rem 1rem',
                      backgroundColor: form.decisaoDuasMatriculas === 'apenas_padrao_2' ? '#ede9fe' : '#ffffff',
                      border: form.decisaoDuasMatriculas === 'apenas_padrao_2' ? '2px solid #7c3aed' : '1px solid #cbd5e1',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}>
                      <input
                        type="radio"
                        name="decisaoDuasMatriculas"
                        value="apenas_padrao_2"
                        checked={form.decisaoDuasMatriculas === 'apenas_padrao_2'}
                        onChange={e => setForm({ ...form, decisaoDuasMatriculas: e.target.value })}
                        style={{ marginTop: '0.2rem', accentColor: '#7c3aed' }}
                      />
                      <div>
                        <strong style={{ fontSize: '0.86rem', color: '#4c1d95', display: 'block' }}>
                          🟣 Optar por cursar apenas no Padrão 2 (Linha Funcional 2)
                        </strong>
                        <span style={{ fontSize: '0.76rem', color: '#6d28d9' }}>
                          Solicito abertura e priorização de vaga apenas para a Matrícula 2. O Padrão 1 não demandará abertura de vaga em turma formativa em 2027.
                        </span>
                      </div>
                    </label>
                  </div>
                </div>
              )}

              {/* ── SEÇÃO: TERMO DE CIÊNCIA E CONCORDÂNCIA OBRIGATÓRIO ── */}
              <div style={{
                backgroundColor: '#f0fdf4',
                border: form.termoAceito ? '2px solid #00984a' : '2px dashed #86efac',
                borderRadius: '12px',
                padding: '1.25rem',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '1rem',
                transition: 'all 0.2s ease-in-out'
              }}>
                <input
                  type="checkbox"
                  id="termoConcordancia"
                  checked={form.termoAceito || false}
                  onChange={e => setForm({ ...form, termoAceito: e.target.checked })}
                  style={{
                    marginTop: '0.2rem',
                    width: '20px',
                    height: '20px',
                    cursor: 'pointer',
                    accentColor: '#00984a',
                    flexShrink: 0
                  }}
                />
                <label htmlFor="termoConcordancia" style={{ fontSize: '0.84rem', color: '#166534', lineHeight: 1.55, cursor: 'pointer' }}>
                  <strong>Declaração de Ciência e Concordância:</strong><br />
                  Declaro estar ciente de que o preenchimento deste formulário constitui uma <strong>pré-inscrição estritamente necessária para o planejamento e a organização prévia das turmas de 2027</strong>. Concordo que a priorização do turno e do horário solicitados estará <strong>condicionada à confirmação do meu suprimento de aulas no mesmo turno no ano letivo de 2027</strong>, conforme o processo oficial de distribuição e atribuição de vagas da SEED-PR.
                </label>
              </div>

              {/* BOTÃO DE CONFIRMAÇÃO E NAVEGAÇÃO DE PADRÕES */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.85rem', marginTop: '0.5rem' }}>
                <span style={{ fontSize: '0.78rem', color: form.termoAceito ? '#15803d' : '#64748b' }}>
                  {form.termoAceito ? '✓ Termo assinalado. Você já pode confirmar o envio.' : '⚠️ É necessário assinalar o termo acima para habilitar o envio.'}
                </span>

                <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', flexWrap: 'wrap' }}>
                  {onTrocarPadrao && (
                    <button
                      type="button"
                      onClick={onTrocarPadrao}
                      style={{
                        backgroundColor: '#f1f5f9',
                        color: '#002d5c',
                        border: '1px solid #cbd5e1',
                        borderRadius: '10px',
                        padding: '0.85rem 1.25rem',
                        fontSize: '0.88rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.4rem'
                      }}
                    >
                      <span>🔄</span> Alternar Padrão
                    </button>
                  )}

                  <button
                    type="submit"
                    disabled={salvando || !form.termoAceito}
                    style={{
                      backgroundColor: form.termoAceito ? '#00984a' : '#94a3b8',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '10px',
                      padding: '0.85rem 1.85rem',
                      fontSize: '0.95rem',
                      fontWeight: 800,
                      cursor: (salvando || !form.termoAceito) ? 'not-allowed' : 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      boxShadow: form.termoAceito ? '0 4px 14px rgba(0, 152, 74, 0.3)' : 'none',
                      transition: 'all 0.2s ease-in-out'
                    }}
                  >
                    <span>{salvando ? 'Gravando...' : `💾 Confirmar Intenção (${cgm_lf})`}</span>
                  </button>
                </div>
              </div>

            </form>

          </div>
        )}

      </div>
    </div>
  );
}
