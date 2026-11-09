/**
 * API v2 – Estágio Probatório SEED/PR (Vercel Serverless / servidor local).
 *  - Usuários: Authorization: Bearer <ID token Firebase>; a função vem do banco.
 *  - Planilhas (Apps Script): header x-sync-token = SYNC_TOKEN; ações sync_*_bulk (mesmos payloads de antes).
 * CORS restrito a ALLOWED_ORIGINS (padrão: localhost em desenvolvimento).
 */
import { query, audit } from './_lib/db.js';
import { authenticate, exigeFuncao, HttpError, STAFF, FUNCOES } from './_lib/auth.js';
import { buildBundle } from './_lib/bundle.js';
import { decrypt, timingSafeEq } from './_lib/crypto.js';
import {
  makeCtx, usuarioPorEmail, resolverCursista,
  ingestCursistas, ingestTutores, ingestConcluintes, ingestExonerados, ingestNaoConcluintes,
  ingestMovimentacoes, ingestObservacoes, ingestObservacoesTutor
} from './_lib/ingest.js';
import { s, lowerEmail, parseDate, parseDateTime } from './_lib/utils.js';

const SYNC_ACTIONS = {
  sync_cursistas_bulk: (b) => ingestCursistas(b.cursistas || b.data || [], { runId: b.run_id, final: b.final === true }),
  sync_tutores_bulk: (b) => ingestTutores(b.tutores || b.data || []),
  sync_concluintes_bulk: (b) => ingestConcluintes(b.concluintes || b.data || []),
  sync_exonerados_bulk: (b) => ingestExonerados(b.exonerados || b.data || []),
  sync_nao_concluintes_bulk: (b) => ingestNaoConcluintes(b.nao_concluintes || b.data || []),
  sync_movimentacoes_bulk: (b) => ingestMovimentacoes(b.movimentacoes || b.data || []),
  sync_observacoes_bulk: (b) => ingestObservacoes(b.observacoes || b.data || []),
  sync_observacoes_tutor_bulk: (b) => ingestObservacoesTutor(b.observacoes_tutor || b.observacoes || b.data || [])
};

function applyCors(req, res) {
  const allowed = String(process.env.ALLOWED_ORIGINS || 'http://localhost:3000,http://127.0.0.1:3000')
    .split(',').map(x => x.trim()).filter(Boolean);
  const origin = req.headers.origin;
  if (origin && allowed.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type, X-Sync-Token');
  res.setHeader('Cache-Control', 'no-store');
}

const podeGerenciar = (user, funcaoAlvo) =>
  user.funcao === 'superadmin' || (user.funcao === 'admin' && !['superadmin', 'admin'].includes(funcaoAlvo));

/** Resolve o usuário (cursista) alvo de um registro: o próprio cursista, ou por e-mail para a equipe. */
async function alvoCursista(user, email, nome = null) {
  const em = lowerEmail(email);
  if (!em) return user.id;
  let r = await query('SELECT id FROM usuario WHERE email_inst = ?', [em]);
  if (!r.length) {
    try {
      await query('INSERT INTO usuario (email_inst, nome, funcao) VALUES (?, ?, ?)',
        [em, s(nome) || em.split('@')[0].replace(/[._]/g, ' ').toUpperCase(), 'cursista']
      );
      r = await query('SELECT id FROM usuario WHERE email_inst = ?', [em]);
    } catch (e) {}
  }
  return r.length ? r[0].id : user.id;
}

export default async function handler(req, res) {
  applyCors(req, res);
  if (req.method === 'OPTIONS') return res.status(204).end();

  let body = {};
  if (req.body && typeof req.body === 'object') {
    body = req.body;
  } else if (typeof req.body === 'string' && req.body.trim()) {
    try { body = JSON.parse(req.body); } catch { body = {}; }
  }
  let action = (req.query && req.query.action) || body.action || 'ping';
  if (action === 'undefined' || action === 'null' || !action) action = 'ping';

  try {
    if (action === 'ping' || action === 'health') {
      try {
        const r = await query('SELECT 1 as ok');
        return res.status(200).json({ status: 'ok', api: 'v2', banco: 'conectado', ok: r && r[0] && r[0].ok === 1 });
      } catch (err) {
        return res.status(500).json({ status: 'erro_banco', api: 'v2', mensagem: 'Falha na conexão com TiDB Cloud', detalhe: err.message });
      }
    }

    /* ---------- carga das planilhas (Apps Script) ---------- */
    if (SYNC_ACTIONS[action]) {
      const esperado = process.env.SYNC_TOKEN;
      if (!esperado || !timingSafeEq(req.headers['x-sync-token'], esperado)) throw new HttpError(401, 'Token de sincronização inválido.');
      const items = body.cursistas || body.tutores || body.concluintes || body.exonerados || body.nao_concluintes ||
        body.movimentacoes || body.observacoes || body.observacoes_tutor || body.data;
      if (!Array.isArray(items) || !items.length) throw new HttpError(400, 'Nenhum registro fornecido.');
      try {
        const out = await SYNC_ACTIONS[action](body);
        await audit(null, action, 'planilha', null, { recebidos: items.length, ...out });
        return res.status(200).json({ status: 'success', ...out });
      } catch (syncErr) {
        console.error(`[SYNC ERROR ${action}]:`, syncErr);
        return res.status(500).json({ error: syncErr.message || 'Erro interno na sincronização', acao: action });
      }
    }

    /* ---------- ações autenticadas por usuário ---------- */
    const isBundleAction = action === 'bundle' || action === 'get_all';
    const user = await authenticate(req, { optional: isBundleAction });

    if (action === 'me') return res.status(200).json({ id: user.id, email: user.email, nome: user.nome, funcao: user.funcao });
    if (action === 'bundle' || action === 'get_all') return res.status(200).json(await buildBundle(user));

    if (action === 'insert_observacao') {
      exigeFuncao(user, ...STAFF, 'tutor', 'formador');
      const d = body.data || {};
      const ctx = makeCtx();
      const cur = await usuarioPorEmail(ctx, { email: d.email_cursista, nome: d.nome_cursista, funcao: 'cursista' });
      if (!cur) throw new HttpError(400, 'E-mail do cursista obrigatório.');
      const form = d.email_formador ? await usuarioPorEmail(ctx, { email: d.email_formador, nome: d.nome_formador, funcao: 'formador' }) : null;
      const idOrigem = s(d.id_origem) || `OBS_${Date.now()}_${user.id}`;
      await query(
        `INSERT INTO observacao_pratica (id_origem, usuario_id, formador_id, carimbo, ano_formativo, semestre, chamamento, modalidade, componente, tema,
           observacao_realizada, is_realizada, data_pratica, data_observacao, data_feedback, modalidade_feedback, motivo_devolutiva,
           link_gravacao_pratica, link_planejamento, link_pdp, proposta_pedagogica, link_gravacao_feedback, nivel_planejamento, nivel_pratica,
           evidencias_planejamento, evidencias_pratica, criterio1_nivel, criterio1_evidencias, criterio2_nivel, criterio2_evidencias,
           escala_boas_praticas, etapas_nao_realizadas, justificativa_etapas, questionamentos_propositivos, proposicoes_sugestoes, combinados,
           justificativa_nao_realizada)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
         ON DUPLICATE KEY UPDATE tema = VALUES(tema), observacao_realizada = VALUES(observacao_realizada), is_realizada = VALUES(is_realizada),
           data_pratica = VALUES(data_pratica), data_feedback = VALUES(data_feedback), nivel_planejamento = VALUES(nivel_planejamento),
           nivel_pratica = VALUES(nivel_pratica)`,
        [idOrigem, cur.id, form ? form.id : null, s(d.carimbo) || new Date().toLocaleString('pt-BR'), s(d.ano_formativo), s(d.semestre), s(d.chamamento),
          s(d.modalidade), s(d.componente), s(d.tema), s(d.observacao_realizada) || 'Sim', d.is_realizada !== false ? 1 : 0,
          parseDate(d.data_pratica || d.data_implementacao), parseDate(d.data_observacao), parseDate(d.data_feedback), s(d.modalidade_feedback),
          s(d.motivo_devolutiva), s(d.link_gravacao_pratica), s(d.link_planejamento), s(d.link_pdp), s(d.proposta_pedagogica),
          s(d.link_gravacao_feedback), s(d.nivel_planejamento), s(d.nivel_pratica), s(d.evidencias_planejamento), s(d.evidencias_pratica),
          s(d.criterio1_nivel), s(d.criterio1_evidencias), s(d.criterio2_nivel), s(d.criterio2_evidencias), s(d.escala_boas_praticas),
          s(d.etapas_nao_realizadas_str), s(d.justificativa_etapas), s(d.questionamentos_propositivos), s(d.proposicoes_sugestoes),
          s(d.combinados), s(d.justificativa_nao_realizada)]
      );
      await audit(user.id, 'insert_observacao', 'observacao_pratica', idOrigem);
      return res.status(200).json({ status: 'success', id_origem: idOrigem });
    }

    if (action === 'insert_movimentacao') {
      const m = body.data || {};
      const alvo = await alvoCursista(user, m.email || m.emailCursista);
      if (!alvo) throw new HttpError(400, 'Cursista não identificado.');
      if (user.funcao === 'formador') throw new HttpError(403, 'Sem permissão para esta ação.');
      const extId = s(m.id) || `MOV_${Date.now()}_${user.id}`;
      await query(
        `INSERT INTO movimentacao (ext_id, usuario_id, registrado_em, tutor_responsavel, email_tutor_resp, turma_anterior, turma_nova, tipo_acao, motivo,
           situacao_relacionada, ano_formacao, chamamento, modalidade_detalhes, turma_detalhes, justificativa, descricao, comprovante, status,
           solicitado_por, solicitado_por_nome)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        [extId, alvo, parseDateTime(m.timestamp) || new Date().toISOString().slice(0, 19).replace('T', ' '), s(m.tutor_responsavel || m.tutor),
          lowerEmail(m.email_tutor_responsavel), s(m.turma_anterior), s(m.turma_nova), s(m.tipo_acao) || 'Solicitação', s(m.motivo),
          s(m.situacao_relacionada), s(m.ano_formacao), s(m.chamamento), s(m.modalidade_detalhes), s(m.turma_detalhes), s(m.justificativa),
          s(m.descricao), s(m.comprovante), 'Pendente', user.id, user.nome]
      );
      await audit(user.id, 'insert_movimentacao', 'movimentacao', extId);
      return res.status(200).json({ status: 'success', id: extId });
    }

    if (action === 'update_movimentacao') {
      exigeFuncao(user, ...STAFF, 'tutor');
      const id = body.id;
      if (!id) throw new HttpError(400, 'ID da movimentação obrigatório.');
      const r = await query(
        `UPDATE movimentacao SET status = ?, nota_resolucao = ?, resolvido_por = ?, resolvido_em = NOW() WHERE ext_id = ? OR id = ?`,
        [s(body.status) || 'Resolvido', s(body.nota_resolucao) || '', user.id, String(id), Number(id) || 0]
      );
      await audit(user.id, 'update_movimentacao', 'movimentacao', id, { status: body.status });
      return res.status(200).json({ status: 'success', afetados: r.affectedRows });
    }

    if (action === 'delete_movimentacao') {
      exigeFuncao(user, 'superadmin', 'admin');
      await query('DELETE FROM movimentacao WHERE ext_id = ? OR id = ?', [String(body.id), Number(body.id) || 0]);
      await audit(user.id, 'delete_movimentacao', 'movimentacao', body.id);
      return res.status(200).json({ status: 'success' });
    }

    if (action === 'insert_diario') {
      const d = body.data || {};
      const cursista = user.funcao === 'cursista' ? user.id : await alvoCursista(user, d.email_cursista || d.email);
      await query(
        `INSERT INTO diario_registro (autor_id, cursista_id, turma, titulo, conteudo, categoria, visibilidade) VALUES (?,?,?,?,?,?,?)`,
        [user.id, cursista, s(d.turma), s(d.titulo) || 'Registro Formativo', d.conteudo || '', s(d.categoria) || 'Geral',
          ['privado', 'equipe', 'publico'].includes(d.visibilidade) ? d.visibilidade : 'publico']
      );
      return res.status(200).json({ status: 'success' });
    }

    if (action === 'insert_intencao') {
      exigeFuncao(user, ...STAFF, 'tutor', 'cursista');
      const d = body.data || {};
      const alvo = await alvoCursista(user, d.email_cursista || d.email, d.nome_cursista);
      const lf = d.linha_funcional ? String(d.linha_funcional).trim() : '1';
      let v = null;
      if (lf) {
        v = (await query('SELECT id FROM vinculo WHERE usuario_id = ? AND linha_funcional = ? LIMIT 1', [alvo, lf]))[0];
      }
      if (!v) {
        v = (await query('SELECT id FROM vinculo WHERE usuario_id = ? ORDER BY linha_funcional LIMIT 1', [alvo]))[0];
      }

      const cgmRaw = String(d.cgm_cursista || d.cgm || '').trim();
      const cgmLf = String(d.cgm_lf || (cgmRaw ? `${cgmRaw}_${lf}` : `${lowerEmail(d.email_cursista || d.email || user.email)}_${lf}`)).trim();
      const turnoVal = s(d.turnoPretendido || d.opcao_turno);
      const horarioVal = s(d.horarioPretendido || d.opcao_modalidade);

      let obsPartes = [];
      if (d.necessitaAtendimentoEspecializado === 'Sim' || d.descricaoAtendimentoEspecializado) {
        obsPartes.push(`[Atendimento Especial: Sim] ${d.descricaoAtendimentoEspecializado || ''}`);
      }
      if (d.decisao_duas_matriculas || d.decisaoDuasMatriculas) {
        obsPartes.push(`[Decisão 2 Matrículas: ${d.decisao_duas_matriculas || d.decisaoDuasMatriculas}]`);
      }
      if (d.observacao) {
        obsPartes.push(d.observacao);
      }

      const metaObj = {
        cgm_lf: cgmLf,
        cgm_cursista: cgmRaw,
        linha_funcional: lf,
        nome_cursista: d.nome_cursista || '',
        email_cursista: lowerEmail(d.email_cursista || d.email || user.email),
        componente: d.componente || '',
        nre: d.nre || '',
        chamamento: d.chamamento || '',
        num_chamamento: d.num_chamamento || null,
        turnoPretendido: turnoVal || '',
        horarioPretendido: horarioVal || '',
        dia_semana_formativo: d.dia_semana_formativo || '',
        ano_formativo_pretendido: d.ano_formativo_pretendido || '',
        ano_formativo_anterior: d.ano_formativo_anterior || '',
        turma_anterior: d.turma_anterior || '',
        necessitaAtendimentoEspecializado: d.necessitaAtendimentoEspecializado || 'Não',
        descricaoAtendimentoEspecializado: d.descricaoAtendimentoEspecializado || '',
        decisao_duas_matriculas: d.decisao_duas_matriculas || d.decisaoDuasMatriculas || 'independente',
        data_aceite_termo: d.data_aceite_termo || new Date().toISOString()
      };

      const obsTexto = `${obsPartes.join(' | ')}||META:${JSON.stringify(metaObj)}`;

      // Remove intenção anterior da mesma linha funcional para evitar duplicatas
      try {
        if (v && v.id) {
          await query('DELETE FROM intencao_matricula WHERE usuario_id = ? AND vinculo_id = ?', [alvo, v.id]);
        }
        await query('DELETE FROM intencao_matricula WHERE usuario_id = ? AND observacao LIKE ?', [alvo, `%"cgm_lf":"${cgmLf}"%`]);
      } catch (eDel) {}

      await query(
        `INSERT INTO intencao_matricula (usuario_id, vinculo_id, componente, opcao_turno, opcao_modalidade, observacao) VALUES (?,?,?,?,?,?)`,
        [alvo, v ? v.id : null, s(d.componente), turnoVal, horarioVal, s(obsTexto)]
      );

      // Redundância para a tabela intencao_matricula_2027 (cria se não existir)
      try {
        await query(`
          CREATE TABLE IF NOT EXISTS intencao_matricula_2027 (
            id INT AUTO_INCREMENT PRIMARY KEY,
            cgm VARCHAR(80),
            nome_cursista VARCHAR(255),
            email VARCHAR(255),
            componente VARCHAR(150),
            opcao_turno VARCHAR(100),
            opcao_modalidade VARCHAR(150),
            observacao TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          )
        `);
        await query('DELETE FROM intencao_matricula_2027 WHERE cgm = ?', [cgmLf]);
        await query(
          `INSERT INTO intencao_matricula_2027 (cgm, nome_cursista, email, componente, opcao_turno, opcao_modalidade, observacao) VALUES (?,?,?,?,?,?,?)`,
          [s(cgmLf), s(d.nome_cursista), s(d.email_cursista || d.email || user.email), s(d.componente), turnoVal, horarioVal, s(obsTexto)]
        );
      } catch (eTab2) {}

      // Notifica o Google Apps Script para gravação em planilha e disparo do e-mail institucional
      const scriptUrl = process.env.APPS_SCRIPT_URL || process.env.VITE_APPS_SCRIPT_URL;
      if (scriptUrl) {
        fetch(scriptUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'salvar_intencao_2027', dados: d })
        }).catch(() => null);
      }

      return res.status(200).json({ status: 'success', cgm_lf: cgmLf });
    }

    if (action === 'reset_intencoes_2027' || action === 'limpar_intencoes_2027') {
      exigeFuncao(user, 'superadmin', 'admin');
      const del1 = await query('DELETE FROM intencao_matricula').catch(() => ({ affectedRows: 0 }));
      const del2 = await query('DELETE FROM intencao_matricula_2027').catch(() => ({ affectedRows: 0 }));
      const tot = (del1.affectedRows || 0) + (del2.affectedRows || 0);
      await audit(user.id, 'reset_intencoes_2027', 'intencao_matricula', null, { deletados: tot });
      return res.status(200).json({ status: 'success', deletados: tot });
    }

    if (action === 'update_cursista') {
      exigeFuncao(user, 'superadmin', 'admin');
      const r = body.data || {};
      const out = await ingestCursistas([r], { runId: `manual-${Date.now()}`, final: false });
      await audit(user.id, 'update_cursista', 'matricula', r.cod_cursista || null, { sincronizados: out.sincronizados });
      return res.status(out.sincronizados ? 200 : 400).json({ status: out.sincronizados ? 'success' : 'error', ...out });
    }

    if (action === 'delete_cursista') {
      exigeFuncao(user, 'superadmin', 'admin');
      // remoção lógica: sai da base ativa (histórico preservado)
      const r = await query('UPDATE matricula SET na_base_ativa = 0 WHERE cod_cursista = ?', [s(body.cod_cursista)]);
      await audit(user.id, 'delete_cursista', 'matricula', body.cod_cursista);
      return res.status(200).json({ status: 'success', afetados: r.affectedRows });
    }

    /* ---------- administração de contas ---------- */
    if (action === 'usuarios_list') {
      exigeFuncao(user, 'superadmin', 'admin');
      const rows = await query(
        `SELECT u.id, u.email_inst AS email, u.nome, u.funcao, u.ativo, u.ultimo_acesso, n.nome AS nre
         FROM usuario u LEFT JOIN nre n ON n.id = u.nre_id
         WHERE u.funcao <> 'cursista' OR ? = 1 ORDER BY u.funcao, u.nome LIMIT 5000`, [body.incluir_cursistas ? 1 : 0]);
      return res.status(200).json({ status: 'success', usuarios: rows });
    }

    if (action === 'usuario_upsert') {
      exigeFuncao(user, 'superadmin', 'admin');
      const email = lowerEmail(body.email);
      const funcao = body.funcao;
      if (!email || !FUNCOES.includes(funcao)) throw new HttpError(400, 'E-mail e função válidos são obrigatórios.');
      if (!podeGerenciar(user, funcao)) throw new HttpError(403, 'Somente o superadmin gerencia contas admin/superadmin.');
      const atual = (await query('SELECT id, funcao FROM usuario WHERE email_inst = ?', [email]))[0];
      if (atual && !podeGerenciar(user, atual.funcao)) throw new HttpError(403, 'Somente o superadmin altera esta conta.');
      if (atual && atual.funcao === 'superadmin' && funcao !== 'superadmin') {
        const n = (await query("SELECT COUNT(*) AS n FROM usuario WHERE funcao = 'superadmin' AND ativo = 1"))[0].n;
        if (n <= 1) throw new HttpError(409, 'Deve existir ao menos um superadmin ativo.');
      }
      if (atual) {
        await query('UPDATE usuario SET funcao = ?, nome = COALESCE(?, nome), ativo = 1 WHERE id = ?', [funcao, s(body.nome), atual.id]);
      } else {
        await query('INSERT INTO usuario (email_inst, nome, funcao, criado_por) VALUES (?,?,?,?)',
          [email, s(body.nome) || email.split('@')[0].replace(/\./g, ' '), funcao, user.id]);
      }
      await audit(user.id, 'usuario_upsert', 'usuario', email, { funcao, anterior: atual ? atual.funcao : null });
      return res.status(200).json({ status: 'success' });
    }

    if (action === 'usuario_ativar') {
      exigeFuncao(user, 'superadmin', 'admin');
      const alvo = (await query('SELECT id, funcao FROM usuario WHERE id = ?', [Number(body.id)]))[0];
      if (!alvo) throw new HttpError(404, 'Usuário não encontrado.');
      if (!podeGerenciar(user, alvo.funcao)) throw new HttpError(403, 'Somente o superadmin altera esta conta.');
      if (!body.ativo && alvo.funcao === 'superadmin') {
        const n = (await query("SELECT COUNT(*) AS n FROM usuario WHERE funcao = 'superadmin' AND ativo = 1"))[0].n;
        if (n <= 1) throw new HttpError(409, 'Deve existir ao menos um superadmin ativo.');
      }
      await query('UPDATE usuario SET ativo = ? WHERE id = ?', [body.ativo ? 1 : 0, alvo.id]);
      await audit(user.id, 'usuario_ativar', 'usuario', alvo.id, { ativo: !!body.ativo });
      return res.status(200).json({ status: 'success' });
    }

    if (action === 'cgm_revelar') {
      exigeFuncao(user, 'superadmin');
      let cgmCifrado = null;
      let auditTarget = null;
      if (body.usuario_id) {
        const u = (await query('SELECT id, cgm_cifrado FROM usuario WHERE id = ?', [Number(body.usuario_id)]))[0];
        if (!u) throw new HttpError(404, 'Usuário não encontrado.');
        cgmCifrado = u.cgm_cifrado;
        auditTarget = { entity: 'usuario', id: u.id };
      } else if (body.vinculo_id) {
        const row = (await query('SELECT v.id, u.cgm_cifrado FROM vinculo v JOIN usuario u ON u.id = v.usuario_id WHERE v.id = ?', [Number(body.vinculo_id)]))[0];
        if (!row) throw new HttpError(404, 'Vínculo não encontrado.');
        cgmCifrado = row.cgm_cifrado;
        auditTarget = { entity: 'vinculo', id: row.id };
      } else {
        throw new HttpError(400, 'usuario_id ou vinculo_id obrigatório.');
      }
      if (!cgmCifrado) throw new HttpError(404, 'CGM não cadastrado para este cursista.');
      await audit(user.id, 'cgm_revelar', auditTarget.entity, auditTarget.id);
      return res.status(200).json({ status: 'success', cgm: decrypt(cgmCifrado) });
    }

    if (action === 'auditoria_list') {
      exigeFuncao(user, 'superadmin');
      const rows = await query(
        `SELECT a.id, a.em, a.acao, a.entidade, a.entidade_id, a.detalhes, u.email_inst AS usuario
         FROM auditoria a LEFT JOIN usuario u ON u.id = a.usuario_id ORDER BY a.id DESC LIMIT 500`);
      return res.status(200).json({ status: 'success', registros: rows });
    }

    throw new HttpError(400, `Ação desconhecida: ${action}`);
  } catch (err) {
    if (err instanceof HttpError) {
      console.warn(`[API v2 4xx] status=${err.status} action='${action}' msg=${err.message}`);
      return res.status(err.status).json({ error: err.message, action });
    }
    console.error(`[API v2] action=${action}:`, err);
    return res.status(500).json({ error: 'Erro interno do servidor.' }); // sem vazar detalhes
  }
}
