import React, { useState, useEffect, useMemo } from 'react';
import { supabase, isConfigured as isSupabaseConfigured } from '../supabase';
import { driveDataService } from '../services/driveDataService';

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

  const match = rawChamamento.match(/(\d+)/);
  const numChamamento = match ? parseInt(match[1], 10) : null;

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

  if (numChamamento === 6) {
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

  // Fallback caso venha sem número explícito
  const anoAtual = String(cursista?.ano_formativo || '').toUpperCase();
  const precisa1Ano = anoAtual.includes('1');
  return {
    numChamamento: null,
    chamamentoTexto: rawChamamento || 'Chamamento em Análise',
    status2027: precisa1Ano ? 'precisa_turma_1_ano' : 'precisa_turma_2_3_ano',
    elegivelIntencao: true,
    tituloStatus: precisa1Ano ? 'Turma de 1º Ano' : 'Turma de 2º/3º Ano',
    badgeCor: '#f59e0b',
    mensagem: `Identificado para continuidade formativa em 2027/1 na etapa ${precisa1Ano ? '1º Ano' : '2º/3º Ano'}.`,
    anoNecessario2027: precisa1Ano ? '1º ANO' : '2º/3º ANO',
    detalhes: 'Avanço formativo individual.'
  };
}

export default function IntencaoMatricula2027({ cursista, records = [], userEmail, isSimulacao = false }) {
  const [salvando, setSalvando] = useState(false);
  const [sucesso, setSucesso] = useState(false);
  const [registroExistente, setRegistroExistente] = useState(null);

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
    solicitouOS: 'Não',
    solicitouRemocao: 'Não',
    possuiMaisDeUmVinculo: 'Não',
    outroVinculoComponente: 'MATEMÁTICA',
    outroVinculoTurno: 'Manhã',
    necessitaAtendimentoEspecializado: 'Não',
    descricaoAtendimentoEspecializado: ''
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

  // Carrega registro existente do Cursista (Supabase ou LocalStorage)
  useEffect(() => {
    const carregarRegistro = async () => {
      const email = (userEmail || cursista?.email || cursista?.['e-mail'] || '').trim().toLowerCase();
      const cgm = String(cursista?.cgm || '').trim();
      if (!email && !cgm) return;

      // 1. Tenta Supabase
      if (isSupabaseConfigured && supabase) {
        try {
          let query = supabase.from('intencao_matricula_2027').select('*');
          if (cgm) query = query.eq('cgm_cursista', cgm);
          else query = query.eq('email_cursista', email);

          const { data, error } = await query.order('created_at', { ascending: false }).limit(1);

          if (!error && data && data.length > 0) {
            const reg = data[0];
            setRegistroExistente(reg);
            setForm(prev => ({
              ...prev,
              turnoPretendido: reg.turno_pretendido || prev.turnoPretendido,
              horarioPretendido: reg.horario_pretendido || prev.horarioPretendido,
              solicitouOS: reg.solicitou_os || 'Não',
              solicitouRemocao: reg.solicitou_remocao || 'Não',
              possuiMaisDeUmVinculo: reg.possui_mais_de_um_vinculo || 'Não',
              outroVinculoComponente: reg.outro_vinculo_componente || 'MATEMÁTICA',
              outroVinculoTurno: reg.outro_vinculo_turno || 'Manhã',
              necessitaAtendimentoEspecializado: reg.necessita_atendimento_especializado || 'Não',
              descricaoAtendimentoEspecializado: reg.descricao_atendimento_especializado || ''
            }));
            return;
          }
        } catch (e) {
          console.warn('Erro ao consultar Supabase intencao_matricula:', e);
        }
      }

      // 2. Fallback localStorage
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
    setSalvando(true);
    setSucesso(false);

    const email = (userEmail || cursista?.email || cursista?.['e-mail'] || '').trim().toLowerCase();
    const cgm = String(cursista?.cgm || '').trim();
    const nome = cursista?.nome || cursista?.nome_cursista || 'Docente Cursista';

    const dadosRegistro = {
      ...form,
      id: `intencao-${Date.now()}`,
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
      created_at: new Date().toISOString()
    };

    // 1. Salva via Drive Service (Google Sheets / Drive)
    try {
      await driveDataService.salvarIntencao2027(dadosRegistro);
    } catch (err) {
      console.warn('Erro ao salvar intenção via DriveService:', err);
    }

    // 2. Salva no LocalStorage
    try {
      const key = cgm ? `intencao_2027_cgm_${cgm}` : `intencao_2027_${email}`;
      localStorage.setItem(key, JSON.stringify(dadosRegistro));

      const listaGeralRaw = localStorage.getItem('intencoes_2027_todas');
      const listaGeral = listaGeralRaw ? JSON.parse(listaGeralRaw) : [];
      const semDuplicata = listaGeral.filter(item => String(item.cgm_cursista) !== cgm && item.email_cursista !== email);
      semDuplicata.unshift(dadosRegistro);
      localStorage.setItem('intencoes_2027_todas', JSON.stringify(semDuplicata));
    } catch (err) {
      console.error(err);
    }

    setRegistroExistente(dadosRegistro);
    setSalvando(false);
    setSucesso(true);
    setTimeout(() => setSucesso(false), 5000);
  };

  const nomeExibicao = cursista?.nome || cursista?.nome_cursista || 'Docente Cursista';

  return (
    <div style={{ maxWidth: '980px', margin: '0 auto', padding: '1rem', boxSizing: 'border-box' }}>
      
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

          <div style={{ textAlign: 'right' }}>
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
                  <span>✓</span> Intenção de vaga registrada com sucesso no sistema da SEED/PR!
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

              {/* ── SEÇÃO: OBSERVAÇÕES E CONSIDERAÇÕES (CAIXAS DE SELEÇÃO) ── */}
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

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
                  
                  {/* a) Solicitou ordem de serviço */}
                  <div style={{ backgroundColor: '#ffffff', padding: '0.85rem', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
                    <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 800, color: '#334155', marginBottom: '0.4rem' }}>
                      a) Solicitou Ordem de Serviço (OS)?
                    </label>
                    <select
                      value={form.solicitouOS}
                      onChange={e => setForm({ ...form, solicitouOS: e.target.value })}
                      style={{ width: '100%', padding: '0.55rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.84rem' }}
                    >
                      <option value="Não">Não</option>
                      <option value="Sim">Sim</option>
                    </select>
                  </div>

                  {/* b) Solicitou remoção */}
                  <div style={{ backgroundColor: '#ffffff', padding: '0.85rem', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
                    <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 800, color: '#334155', marginBottom: '0.4rem' }}>
                      b) Solicitou Remoção?
                    </label>
                    <select
                      value={form.solicitouRemocao}
                      onChange={e => setForm({ ...form, solicitouRemocao: e.target.value })}
                      style={{ width: '100%', padding: '0.55rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.84rem' }}
                    >
                      <option value="Não">Não</option>
                      <option value="Sim">Sim</option>
                    </select>
                  </div>

                  {/* c) Possui mais de um vínculo? */}
                  <div style={{ backgroundColor: '#ffffff', padding: '0.85rem', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
                    <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 800, color: '#334155', marginBottom: '0.4rem' }}>
                      c) Possui mais de um vínculo?
                    </label>
                    <select
                      value={form.possuiMaisDeUmVinculo}
                      onChange={e => setForm({ ...form, possuiMaisDeUmVinculo: e.target.value })}
                      style={{ width: '100%', padding: '0.55rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.84rem' }}
                    >
                      <option value="Não">Não</option>
                      <option value="Sim">Sim</option>
                    </select>
                  </div>

                </div>

                {/* Subcampos caso possua mais de um vínculo */}
                {form.possuiMaisDeUmVinculo === 'Sim' && (
                  <div style={{
                    backgroundColor: '#ffffff',
                    border: '1px dashed #0072bc',
                    borderRadius: '8px',
                    padding: '0.85rem 1rem',
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                    gap: '1rem'
                  }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 800, color: '#0072bc', marginBottom: '0.3rem' }}>
                        Qual o componente do outro vínculo?
                      </label>
                      <select
                        value={form.outroVinculoComponente}
                        onChange={e => setForm({ ...form, outroVinculoComponente: e.target.value })}
                        style={{ width: '100%', padding: '0.55rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.84rem' }}
                      >
                        {LISTA_TODOS_COMPONENTES.map(c => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 800, color: '#0072bc', marginBottom: '0.3rem' }}>
                        Qual o turno do outro vínculo?
                      </label>
                      <select
                        value={form.outroVinculoTurno}
                        onChange={e => setForm({ ...form, outroVinculoTurno: e.target.value })}
                        style={{ width: '100%', padding: '0.55rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.84rem' }}
                      >
                        <option value="Manhã">Manhã</option>
                        <option value="Tarde">Tarde</option>
                        <option value="Noite">Noite</option>
                      </select>
                    </div>
                  </div>
                )}

                {/* d) Necessita de atendimento especializado? */}
                <div style={{ backgroundColor: '#ffffff', padding: '0.85rem', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
                  <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 800, color: '#334155', marginBottom: '0.4rem' }}>
                    d) Necessita de atendimento especializado?
                  </label>
                  <select
                    value={form.necessitaAtendimentoEspecializado}
                    onChange={e => setForm({ ...form, necessitaAtendimentoEspecializado: e.target.value })}
                    style={{ width: '100%', maxWidth: '240px', padding: '0.55rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.84rem' }}
                  >
                    <option value="Não">Não</option>
                    <option value="Sim">Sim</option>
                  </select>

                  {form.necessitaAtendimentoEspecializado === 'Sim' && (
                    <div style={{ marginTop: '0.75rem' }}>
                      <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 800, color: '#001d3d', marginBottom: '0.3rem' }}>
                        Descreva o atendimento especializado necessário:
                      </label>
                      <textarea
                        rows={3}
                        placeholder="Descreva aqui os detalhes do atendimento especializado ou adaptação pedagógica necessária..."
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

              {/* BOTÃO DE CONFIRMAÇÃO */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.85rem', marginTop: '0.5rem' }}>
                <button
                  type="submit"
                  disabled={salvando}
                  style={{
                    backgroundColor: '#00984a',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '10px',
                    padding: '0.85rem 1.85rem',
                    fontSize: '0.95rem',
                    fontWeight: 800,
                    cursor: salvando ? 'wait' : 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    boxShadow: '0 4px 14px rgba(0, 152, 74, 0.3)',
                    transition: 'all 0.2s ease-in-out'
                  }}
                >
                  <span>{salvando ? 'Gravando...' : '💾 Confirmar Intenção de Vaga 2027'}</span>
                </button>
              </div>

            </form>

          </div>
        )}

      </div>
    </div>
  );
}
