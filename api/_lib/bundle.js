/**
 * Monta o "pacote" consumido pelo front (mesmo formato do /api/tidb?action=bundle antigo),
 * porém FILTRADO PELA FUNÇÃO do usuário e sem dados sensíveis:
 *  - CGM sempre mascarado (•••••123); só o superadmin/equipe recebe o valor decifrado;
 *  - CPF/RG nunca saem no pacote;
 *  - exonerados/intenções/auditoria só para equipe (superadmin, admin, técnico).
 */
import { query } from './db.js';
import { decrypt, maskCgm } from './crypto.js';
import { STAFF } from './auth.js';

const SCOPE_USERS = {
  tutor: 'SELECT v.usuario_id FROM matricula m JOIN vinculo v ON v.id = m.vinculo_id JOIN turma t ON t.id = m.turma_id WHERE t.tutor_id = ?',
  formador: 'SELECT v.usuario_id FROM matricula m JOIN vinculo v ON v.id = m.vinculo_id JOIN turma t ON t.id = m.turma_id WHERE t.formador_id = ?',
  cursista: 'SELECT ? AS usuario_id'
};

function parseIntencaoRow(r, cgmResolved) {
  const rawObs = String(r.observacao || '');
  let obsText = rawObs;
  let meta = {};
  const metaIdx = rawObs.indexOf('||META:');
  if (metaIdx !== -1) {
    obsText = rawObs.slice(0, metaIdx).trim();
    const jsonPart = rawObs.slice(metaIdx + 7).trim();
    try { meta = JSON.parse(jsonPart) || {}; } catch { meta = {}; }
  }

  let necessitaAtend = meta.necessitaAtendimentoEspecializado || 'Não';
  let descAtend = meta.descricaoAtendimentoEspecializado || '';
  if (!meta.necessitaAtendimentoEspecializado && /\[Atendimento Especial:\s*Sim\]/i.test(obsText)) {
    necessitaAtend = 'Sim';
    descAtend = obsText.replace(/\[Atendimento Especial:\s*Sim\]\s*/i, '').replace(/\|\s*\[Decisão 2 Matrículas:[^\]]*\]/i, '').trim();
  }

  let decisaoDuas = meta.decisao_duas_matriculas || '';
  if (!decisaoDuas) {
    const mDec = obsText.match(/\[Decisão 2 Matrículas:\s*([^\]]+)\]/i);
    if (mDec) decisaoDuas = mDec[1].trim();
  }

  const lf = String(meta.linha_funcional || r.linha_funcional || '1').trim();
  const cgmFinal = String(meta.cgm_cursista || cgmResolved || r.cgm || '').trim();
  const emailFinal = String(meta.email_cursista || r.email || '').trim().toLowerCase();
  const cgmLfFinal = String(
    meta.cgm_lf ||
    (r.cgm && String(r.cgm).includes('_') ? r.cgm : '') ||
    (cgmFinal ? `${cgmFinal}_${lf}` : (emailFinal ? `${emailFinal}_${lf}` : ''))
  ).trim();

  const turno = r.opcao_turno || meta.turnoPretendido || '';
  const horario = r.opcao_modalidade || meta.horarioPretendido || '';

  return {
    id: r.id,
    cgm: cgmFinal,
    cgm_cursista: cgmFinal,
    cgm_lf: cgmLfFinal,
    linha_funcional: lf,
    nome_cursista: meta.nome_cursista || r.nome_cursista || '',
    email: emailFinal,
    email_cursista: emailFinal,
    componente: r.componente || meta.componente || '',
    nre: meta.nre || '',
    chamamento: meta.chamamento || '',
    num_chamamento: meta.num_chamamento || null,
    opcao_turno: turno,
    turnoPretendido: turno,
    opcao_modalidade: horario,
    horarioPretendido: horario,
    dia_semana_formativo: meta.dia_semana_formativo || '',
    ano_formativo_pretendido: meta.ano_formativo_pretendido || '',
    ano_formativo_anterior: meta.ano_formativo_anterior || '',
    turma_anterior: meta.turma_anterior || '',
    necessitaAtendimentoEspecializado: necessitaAtend,
    descricaoAtendimentoEspecializado: descAtend || obsText,
    decisao_duas_matriculas: decisaoDuas || 'independente',
    observacao: obsText,
    created_at: r.criado_em || r.created_at || meta.data_aceite_termo || null,
    data_aceite_termo: meta.data_aceite_termo || r.criado_em || r.created_at || null
  };
}

export async function buildBundle(user) {
  const isVisualizador = user.funcao === 'visualizador' || !user.funcao;
  const staff = STAFF.includes(user.funcao);
  const verCgm = staff || isVisualizador || user.funcao === 'tutor' || user.funcao === 'cursista';
  const hasRestrictedScope = !staff && !isVisualizador && !!SCOPE_USERS[user.funcao];
  const scope = hasRestrictedScope ? SCOPE_USERS[user.funcao] : null;
  const scopeSql = (col) => (hasRestrictedScope ? `${col} IN (${scope})` : '1=1');
  const scopeP = hasRestrictedScope ? [user.id] : [];

  // ----- CGM decifrado (equipe administrativa / próprio cursista) -----
  const cgmPlain = new Map();
  if (verCgm) {
    const rows = await query("SELECT u.id AS usuario_id, v.id AS vinculo_id, u.cgm_cifrado FROM usuario u LEFT JOIN vinculo v ON v.usuario_id = u.id WHERE u.cgm_cifrado IS NOT NULL");
    for (const r of rows) {
      try {
        const plain = decrypt(r.cgm_cifrado);
        cgmPlain.set(`u_${r.usuario_id}`, plain);
        if (r.vinculo_id) cgmPlain.set(`v_${r.vinculo_id}`, plain);
      } catch { /* chave diferente: mantém máscara */ }
    }
  }
  const cgmOf = (id, ult3, prefix = 'v_') => {
    const key = `${prefix}${id}`;
    return verCgm && cgmPlain.has(key) ? cgmPlain.get(key) : maskCgm(ult3);
  };

  // ----- cursistas (matrículas ativas na base) -----
  let whereBase = 'vct.na_base_ativa = 1 AND vct.turma IS NOT NULL';
  const pBase = [];
  if (user.funcao === 'tutor') {
    let tutorNre = null;
    if (user.nre_id) {
      const nRow = (await query('SELECT nome FROM nre WHERE id = ?', [user.nre_id]))[0];
      tutorNre = nRow?.nome;
    }
    if (tutorNre) {
      whereBase += ' AND (vct.tutor_id = ? OR vct.email_tutor = ? OR vct.nre_exe = ? OR vct.nre_tutor = ?)';
      pBase.push(user.id, user.email, tutorNre, tutorNre);
    } else {
      whereBase += ' AND (vct.tutor_id = ? OR vct.email_tutor = ?)';
      pBase.push(user.id, user.email);
    }
  }
  else if (user.funcao === 'formador') { whereBase += ' AND vct.formador_id = ?'; pBase.push(user.id); }
  else if (user.funcao === 'cursista') { whereBase += ' AND vct.usuario_id = ?'; pBase.push(user.id); }

  const baseRows = await query(
    `SELECT vct.*, t_extra.periodo_ini
     FROM v_cursista_turma vct
     LEFT JOIN turma t_extra ON t_extra.id = vct.turma_id
     WHERE ${whereBase}
     ORDER BY vct.nome_cursista ASC`,
    pBase
  );
  const baseCursistas = baseRows.map(r => ({
    cod_cursista: r.cod_cursista,
    vinculo_id: r.vinculo_id,
    usuario_id: r.usuario_id,
    cgm: cgmOf(r.vinculo_id, r.cgm_ultimos3),
    linha_funcional: r.linha_funcional || 1,
    nome_cursista: r.nome_cursista,
    email: r.email || '',
    telefone_cursista: r.telefone_cursista || '',
    modalidade: r.modalidade || '',
    componente: r.componente || '',
    turmas: r.turma || '',
    dia_da_semana: r.dia_semana || '',
    horario_inicial: r.hora_ini || '',
    horario_fim: r.hora_fim || '',
    turno: r.turno || '',
    ano_formativo: r.ano_formativo || '',
    chamamento: r.chamamento || '',
    periodo_ini: r.periodo_ini || '',
    nome_formador: r.nome_formador || '',
    email_formador: r.email_formador || '',
    telefone_formador: r.telefone_formador || '',
    tutor_responsavel: r.tutor_responsavel || '',
    email_tutor: r.email_tutor || '',
    telefone_tutor: r.telefone_tutor || '',
    nre_tutor: r.nre_tutor || '',
    nre_exe: r.nre_exe || '',
    munic_exe: r.munic_exe || '',
    link: r.link || '',
    id_classroom: r.id_classroom || '',
    status_matricula: r.status
  }));

  // ----- tutores -----
  let tutRows;
  if (staff) {
    tutRows = await query(`SELECT u.nome AS tutor_responsavel, u.email_inst AS email_educ, u.email_alt AS email_adm, u.telefone,
      n.nome AS nre_tutor, n.email AS email_nre FROM usuario u LEFT JOIN nre n ON n.id = u.nre_id
      WHERE u.funcao = 'tutor' AND u.ativo = 1 ORDER BY u.nome`);
  } else {
    const emails = [...new Set(baseCursistas.map(c => c.email_tutor).filter(Boolean))];
    tutRows = user.funcao === 'tutor'
      ? await query(`SELECT u.nome AS tutor_responsavel, u.email_inst AS email_educ, u.email_alt AS email_adm, u.telefone,
          n.nome AS nre_tutor, n.email AS email_nre FROM usuario u LEFT JOIN nre n ON n.id = u.nre_id WHERE u.id = ?`, [user.id])
      : (emails.length
        ? await query(`SELECT u.nome AS tutor_responsavel, u.email_inst AS email_educ, u.email_alt AS email_adm, u.telefone,
            n.nome AS nre_tutor, n.email AS email_nre FROM usuario u LEFT JOIN nre n ON n.id = u.nre_id WHERE u.email_inst IN (?)`, [emails])
        : []);
  }

  // ----- observações da prática -----
  let observacoes = [];
  if (staff) {
    const obsRows = await query(
      `SELECT o.id, o.id_origem, o.usuario_id, o.formador_id, o.carimbo, o.ano_formativo, o.semestre, o.chamamento,
              o.modalidade, o.componente, o.tema, o.observacao_realizada, o.is_realizada, o.data_pratica, o.data_observacao,
              o.data_feedback, o.modalidade_feedback, o.motivo_devolutiva, o.escala_boas_praticas, o.combinados,
              COALESCE(o.email_cursista, uc.email_inst) AS email_cursista,
              COALESCE(o.nome_cursista, uc.nome) AS nome_cursista,
              COALESCE(o.email_formador, uf.email_inst) AS email_formador,
              COALESCE(o.nome_formador, uf.nome) AS nome_formador,
              COALESCE(o.nre_exe, nv.nome) AS nre,
              COALESCE(o.nre_exe, nv.nome) AS nre_exe
       FROM observacao_pratica o
       LEFT JOIN usuario uc ON uc.id = o.usuario_id
       LEFT JOIN usuario uf ON uf.id = o.formador_id
       LEFT JOIN vinculo vv ON vv.usuario_id = uc.id AND vv.linha_funcional = 1
       LEFT JOIN nre nv ON nv.id = vv.nre_id
       WHERE o.carimbo LIKE '%2026%' OR o.data_pratica >= '2026-01-01' OR o.data_observacao >= '2026-01-01'
       ORDER BY o.id DESC LIMIT 3000`
    );
    observacoes = obsRows.map(o => ({
      ...o,
      is_realizada: !!o.is_realizada,
      proposta: o.proposta || o.proposta_pedagogica || '',
      nre_exe: o.nre_exe || o.nre || ''
    }));
  } else if (!isVisualizador && (user.funcao === 'tutor' || user.funcao === 'formador' || user.funcao === 'cursista')) {
    let obsWhere = scopeSql('o.usuario_id');
    let obsP = [...scopeP];
    if (user.funcao === 'formador') {
      obsWhere = `(${obsWhere} OR o.formador_id = ? OR o.email_formador = ?)`;
      obsP.push(user.id, user.email);
    } else if (user.funcao === 'cursista') {
      obsWhere = `(o.usuario_id = ? OR o.email_cursista = ?)`;
      obsP.push(user.id, user.email);
    }
    const obsRows = await query(
      `SELECT o.*,
              COALESCE(o.email_cursista, uc.email_inst) AS email_cursista,
              COALESCE(o.nome_cursista, uc.nome) AS nome_cursista,
              COALESCE(o.email_formador, uf.email_inst) AS email_formador,
              COALESCE(o.nome_formador, uf.nome) AS nome_formador,
              COALESCE(o.nre_exe, nv.nome) AS nre,
              COALESCE(o.nre_exe, nv.nome) AS nre_exe
       FROM observacao_pratica o
       LEFT JOIN usuario uc ON uc.id = o.usuario_id
       LEFT JOIN usuario uf ON uf.id = o.formador_id
       LEFT JOIN vinculo vv ON vv.usuario_id = uc.id AND vv.linha_funcional = 1
       LEFT JOIN nre nv ON nv.id = vv.nre_id
       WHERE ${obsWhere} ORDER BY o.id DESC LIMIT 1500`, obsP);
    observacoes = obsRows.map(o => ({
      ...o,
      is_realizada: !!o.is_realizada,
      proposta: o.proposta || o.proposta_pedagogica || '',
      nre_exe: o.nre_exe || o.nre || ''
    }));
  }

  // ----- concluintes -----
  const concRows = await query(
    `SELECT h.data_evento, h.detalhes, m.cod_cursista, v.id AS vinculo_id, u.id AS usuario_id, u.cgm_ultimos3, u.nome AS nome_cursista, u.email_inst AS email
     FROM matricula_status_hist h JOIN matricula m ON m.id = h.matricula_id JOIN vinculo v ON v.id = m.vinculo_id
     JOIN usuario u ON u.id = v.usuario_id
     WHERE h.status = 'CONCLUIDA' AND ${scopeSql('u.id')} ORDER BY u.nome`, scopeP);
  const concluintes = concRows.map(r => {
    const d = parseJson(r.detalhes);
    return {
      cod_cursista: r.cod_cursista, cgm: cgmOf(r.usuario_id, r.cgm_ultimos3, 'u_'), nome_cursista: r.nome_cursista, email: r.email || '',
      chamamento: d.chamamento || '', ano_formativo: d.ano_formativo || '', modalidade: d.modalidade || '', componente: d.componente || '',
      turmas: d.turmas || '', nre_exe: d.nre_exe || '', munic_exe: d.munic_exe || '', situacao: d.situacao || 'CONCLUÍDO',
      data_conclusao: d.data_raw || r.data_evento || ''
    };
  });

  // ----- exonerados (equipe e visão geral do dashboard) -----
  let exonerados = [];
  if (staff || isVisualizador) {
    const rows = await query(
      `SELECT h.data_evento, h.portaria, h.motivo, h.detalhes, v.id AS vinculo_id, u.id AS usuario_id, u.cgm_ultimos3, u.nome AS nome_cursista, u.email_inst AS email
       FROM matricula_status_hist h JOIN matricula m ON m.id = h.matricula_id JOIN vinculo v ON v.id = m.vinculo_id
       JOIN usuario u ON u.id = v.usuario_id WHERE h.status = 'EXONERADA' ORDER BY u.nome`);
    exonerados = rows.map(r => {
      const d = parseJson(r.detalhes);
      return {
        cgm: cgmOf(r.usuario_id, r.cgm_ultimos3, 'u_'), nome_cursista: r.nome_cursista, email: r.email || '', motivo: r.motivo || '',
        portaria: r.portaria || '', data_exoneracao: d.data_raw || r.data_evento || '', nre: d.nre || '', municipio: d.municipio || '',
        escola: d.escola || '', componente: d.disciplina || '', observacoes: d.observacoes || '', cargo: d.cargo || '',
        disciplina: d.disciplina || '', chamamento: d.chamamento || '', status: d.status || ''
      };
    });
  }

  // ----- movimentações -----
  let movWhere = '1=1'; let movP = [];
  if (user.funcao === 'formador' || isVisualizador) movWhere = '0=1';
  else if (!staff) { movWhere = scopeSql('mv.usuario_id'); movP = [...scopeP]; }
  const movRows = await query(
    `SELECT mv.*, u.id AS usuario_id, u.nome AS nome_cursista, u.email_inst AS email, u.cgm_ultimos3, n.nome AS nre, vv.id AS vinculo_id
     FROM movimentacao mv LEFT JOIN usuario u ON u.id = mv.usuario_id
     LEFT JOIN vinculo vv ON vv.usuario_id = u.id AND vv.linha_funcional = 1 LEFT JOIN nre n ON n.id = mv.nre_id
     WHERE ${movWhere} ORDER BY mv.registrado_em DESC LIMIT 5000`, movP);
  const movimentacoes = movRows.map(r => ({
    id: r.ext_id || String(r.id), db_id: r.id, timestamp: r.registrado_em, cgm: cgmOf(r.usuario_id, r.cgm_ultimos3, 'u_'),
    nome_cursista: r.nome_cursista || '', email: r.email || '', nre: r.nre || '', tutor: r.tutor_responsavel || '',
    tutor_responsavel: r.tutor_responsavel || '', email_tutor_responsavel: r.email_tutor_resp || '',
    turma_anterior: r.turma_anterior || '', turma_nova: r.turma_nova || '', tipo_acao: r.tipo_acao || '', motivo: r.motivo || '',
    situacao_relacionada: r.situacao_relacionada || '', ano_formacao: r.ano_formacao || '', chamamento: r.chamamento || '',
    modalidade_detalhes: r.modalidade_detalhes || '', turma_detalhes: r.turma_detalhes || '', justificativa: r.justificativa || '',
    descricao: r.descricao || '', comprovante: r.comprovante || '', status: r.status, nota_resolucao: r.nota_resolucao || '',
    solicitadoPor: r.solicitado_por_nome || ''
  }));

  // ----- diário formativo -----
  let diaWhere = '1=1'; let diaP = [];
  if (!staff && !isVisualizador) {
    if (user.funcao === 'cursista') { diaWhere = "(d.cursista_id = ? AND d.visibilidade <> 'privado') OR d.autor_id = ?"; diaP = [user.id, user.id]; }
    else { diaWhere = `d.cursista_id IN (${scope}) OR d.autor_id = ?`; diaP = [user.id, user.id]; }
  }
  const diaRows = await query(
    `SELECT d.*, a.email_inst AS email_autor, a.nome AS nome_autor, a.funcao AS papel_autor, c.id AS cursista_usuario_id, c.nome AS nome_cursista,
            c.cgm_ultimos3, vv.id AS vinculo_id
     FROM diario_registro d JOIN usuario a ON a.id = d.autor_id LEFT JOIN usuario c ON c.id = d.cursista_id
     LEFT JOIN vinculo vv ON vv.usuario_id = c.id AND vv.linha_funcional = 1
     WHERE ${diaWhere} ORDER BY d.data_registro DESC LIMIT 500`, diaP);
  const diario = diaRows.map(r => ({
    id: r.id, email_autor: r.email_autor, nome_autor: r.nome_autor, papel_autor: r.papel_autor, turma: r.turma || '',
    cgm_cursista: cgmOf(r.cursista_usuario_id, r.cgm_ultimos3, 'u_'), nome_cursista: r.nome_cursista || '', titulo: r.titulo, conteudo: r.conteudo,
    categoria: r.categoria, visibilidade: r.visibilidade, data_registro: r.data_registro
  }));

  // ----- intenções 2027 -----
  let intencoes2027 = [];
  if (staff || isVisualizador || user.funcao === 'tutor' || user.funcao === 'cursista') {
    const canSeeAllIntencoes = staff || isVisualizador || user.funcao === 'tutor';
    const rows = await query(
      `SELECT i.*, u.id AS usuario_id, u.nome AS nome_cursista, u.email_inst AS email, u.cgm_ultimos3, v.id AS vinculo_id, v.linha_funcional
       FROM intencao_matricula i
       LEFT JOIN usuario u ON u.id = i.usuario_id
       LEFT JOIN vinculo v ON v.id = i.vinculo_id
       WHERE ${canSeeAllIntencoes ? '1=1' : 'i.usuario_id = ?'}
       ORDER BY i.criado_em DESC`,
      canSeeAllIntencoes ? [] : [user.id]
    ).catch(() => []);

    const mapIntencoes = new Map();
    const seenEmailLf = new Set();
    for (const r of rows) {
      const cgmRes = cgmOf(r.usuario_id, r.cgm_ultimos3, 'u_');
      const parsed = parseIntencaoRow(r, cgmRes);
      const emailLfKey = parsed.email ? `${parsed.email}_${parsed.linha_funcional}` : null;
      const key = parsed.cgm_lf || emailLfKey || `id_${r.id}`;
      if (!mapIntencoes.has(key) && (!emailLfKey || !seenEmailLf.has(emailLfKey))) {
        mapIntencoes.set(key, parsed);
        if (emailLfKey) seenEmailLf.add(emailLfKey);
      }
    }

    // Também lê da tabela redundante intencao_matricula_2027 (caso exista)
    const rows2027 = await query('SELECT * FROM intencao_matricula_2027 ORDER BY created_at DESC').catch(() => []);
    for (const r2 of rows2027) {
      const parsed2 = parseIntencaoRow(r2, r2.cgm ? String(r2.cgm).split('_')[0] : '');
      if (!canSeeAllIntencoes && parsed2.email !== String(user.email || '').toLowerCase()) continue;
      const emailLfKey2 = parsed2.email ? `${parsed2.email}_${parsed2.linha_funcional}` : null;
      const key2 = parsed2.cgm_lf || emailLfKey2 || `id2_${r2.id}`;
      if (!mapIntencoes.has(key2) && (!emailLfKey2 || !seenEmailLf.has(emailLfKey2))) {
        mapIntencoes.set(key2, parsed2);
        if (emailLfKey2) seenEmailLf.add(emailLfKey2);
      }
    }

    intencoes2027 = Array.from(mapIntencoes.values());
  }

  // ----- observações do tutor -----
  let otWhere = '1=1'; let otP = [];
  if (user.funcao === 'tutor') {
    otWhere = '(ot.tutor_id = ? OR t.email_inst = ?)';
    otP = [user.id, user.email];
  } else if (user.funcao === 'formador') {
    otWhere = '(ot.formador_id = ? OR f.email_inst = ?)';
    otP = [user.id, user.email];
  } else if (user.funcao === 'cursista') {
    otWhere = '0=1';
  }
  const otRows = await query(
    `SELECT ot.*, t.nome AS tutor, t.email_inst AS tutor_email, f.nome AS formador, f.email_inst AS formador_email, n.nome AS nre
     FROM observacao_tutor ot LEFT JOIN usuario t ON t.id = ot.tutor_id LEFT JOIN usuario f ON f.id = ot.formador_id
     LEFT JOIN nre n ON n.id = ot.nre_id WHERE ${otWhere} ORDER BY ot.id`, otP);
  const observacoesTutor = otRows.map(r => ({
    id: r.id_origem || `obs-tidb-${r.id}`, timestamp: r.registrado_em || '', tutorEmail: r.tutor_email || '', tutor: r.tutor || '',
    formador: r.formador || '', formadorEmail: r.formador_email || '', acaoAcompanhamento: r.acao_acompanhamento || '',
    acaoObservada: r.acao_observada || '', dataObservacao: r.data_observacao || '', linkAcaoObservada: r.link_acao_observada || '',
    dataFeedback: r.data_feedback || '', linkFeedback: r.link_feedback || '', linksComplementares: r.links_complementares || '',
    modalidade: r.modalidade || '', rubrics: Array.isArray(r.rubricas) ? r.rubricas : parseJson(r.rubricas, []),
    avgScore: r.avg_score !== null && r.avg_score !== undefined ? Number(r.avg_score) : null,
    checklistRealizadas: r.checklist_realizadas || '', checklistNaoRealizadas: r.checklist_nao_realizadas || '',
    outrosRegistros: r.outros_registros || '', destaques: r.destaques || '', desenvolver: r.desenvolver || '',
    encaminhamentos: r.encaminhamentos || '', nre: r.nre || '', tema: r.tema || ''
  }));

  return {
    status: 'success',
    source: 'ep_v2',
    atualizado_em: new Date().toISOString(),
    funcao: user.funcao,
    total_cursistas: baseCursistas.length,
    baseCursistas, tutores: tutRows, observacoes, concluintes, exonerados, movimentacoes, diario, intencoes2027, observacoesTutor
  };
}

function parseJson(v, fallback = {}) {
  if (v === null || v === undefined) return fallback;
  if (typeof v === 'object') return v;
  try { return JSON.parse(v); } catch { return fallback; }
}
