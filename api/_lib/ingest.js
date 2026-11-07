/**
 * Carga das planilhas Google (via Apps Script) para o modelo v2.
 * Os payloads sÃ£o os mesmos do Apps Script atual (cursistas, tutores, concluintes, exonerados,
 * nao_concluintes, movimentacoes, observacoes, observacoes_tutor): sÃ³ muda o endpoint.
 * Idempotente (upsert); nunca usa TRUNCATE.
 */
import crypto from 'node:crypto';
import { query } from './db.js';
import { encrypt, hmacHex, normalizeDigits } from './crypto.js';
import { s, lowerEmail, normalizeNre, parseDate, parseDateTime } from './utils.js';

const PRECEDENCIA = { ATIVA: 0, NAO_CONCLUIDA: 1, CONCLUIDA: 2, EXONERADA: 3, TRANSFERIDA: 0 };

export function makeCtx() {
  return {
    nre: new Map(), nreEmail: new Set(), comp: new Map(), ciclo: new Map(), turma: new Map(),
    usuarios: new Map(), rej: {}
  };
}
const reject = (ctx, motivo) => { ctx.rej[motivo] = (ctx.rej[motivo] || 0) + 1; };
const sha = (...p) => crypto.createHash('sha1').update(p.map(x => x ?? '').join('|')).digest('hex').slice(0, 40);

/* ---------------- dimensÃµes ---------------- */
async function nreId(ctx, nome, emailNre) {
  const n = normalizeNre(nome);
  if (!n) return null;
  let id = ctx.nre.get(n);
  if (!id) {
    await query('INSERT INTO nre (nome) VALUES (?) ON DUPLICATE KEY UPDATE nome = nome', [n]);
    id = (await query('SELECT id FROM nre WHERE nome = ?', [n]))[0].id;
    ctx.nre.set(n, id);
  }
  const em = lowerEmail(emailNre);
  if (em && !ctx.nreEmail.has(`${id}|${em}`)) {
    ctx.nreEmail.add(`${id}|${em}`);
    await query('UPDATE nre SET email = ? WHERE id = ?', [em, id]);
  }
  return id;
}

async function componenteId(ctx, nome) {
  const n = s(nome);
  if (!n) return null;
  if (!ctx.comp.has(n)) {
    await query('INSERT INTO componente (nome) VALUES (?) ON DUPLICATE KEY UPDATE nome = nome', [n]);
    ctx.comp.set(n, (await query('SELECT id FROM componente WHERE nome = ?', [n]))[0].id);
  }
  return ctx.comp.get(n);
}

async function cicloId(ctx, ano, chamamento) {
  const a = s(ano);
  if (!a) return null;
  const c = s(chamamento) || '';
  const k = `${a}|${c}`;
  if (!ctx.ciclo.has(k)) {
    await query('INSERT INTO ciclo (ano_formativo, chamamento) VALUES (?, ?) ON DUPLICATE KEY UPDATE ano_formativo = ano_formativo', [a, c]);
    ctx.ciclo.set(k, (await query('SELECT id FROM ciclo WHERE ano_formativo = ? AND chamamento = ?', [a, c]))[0].id);
  }
  return ctx.ciclo.get(k);
}

/* ---------------- usuÃ¡rios ---------------- */
/** Cria/atualiza usuÃ¡rio identificado por e-mail. Nunca altera a funÃ§Ã£o de uma conta existente. */
export async function usuarioPorEmail(ctx, { email, nome, funcao, telefone, nre_id, email_alt, cpf, rg }) {
  const em = lowerEmail(email);
  if (!em) return null;
  const cpfN = normalizeDigits(cpf);
  const cacheKey = em;
  if (ctx.usuarios.has(cacheKey)) return ctx.usuarios.get(cacheKey);

  const found = await query('SELECT id, funcao FROM usuario WHERE email_inst = ?', [em]);
  let res;
  if (found.length) {
    res = { id: found[0].id, funcao: found[0].funcao };
    if (found[0].funcao !== funcao) reject(ctx, `funcao_divergente_${funcao}_vs_${found[0].funcao}`);
    await query(
      `UPDATE usuario SET nome = COALESCE(?, nome), telefone = COALESCE(?, telefone), nre_id = COALESCE(?, nre_id),
         email_alt = COALESCE(?, email_alt), cpf_hash = COALESCE(?, cpf_hash), cpf_cifrado = COALESCE(?, cpf_cifrado),
         rg_cifrado = COALESCE(?, rg_cifrado) WHERE id = ?`,
      [s(nome), s(telefone), nre_id || null, lowerEmail(email_alt), cpfN ? hmacHex(cpfN) : null, cpfN ? encrypt(cpfN) : null, s(rg) ? encrypt(s(rg)) : null, res.id]
    );
  } else {
    const r = await query(
      `INSERT INTO usuario (email_inst, email_alt, nome, funcao, telefone, nre_id, cpf_hash, cpf_cifrado, rg_cifrado)
       VALUES (?,?,?,?,?,?,?,?,?)`,
      [em, lowerEmail(email_alt), s(nome) || em.split('@')[0].replace(/\./g, ' ').toUpperCase(), funcao, s(telefone), nre_id || null,
        cpfN ? hmacHex(cpfN) : null, cpfN ? encrypt(cpfN) : null, s(rg) ? encrypt(s(rg)) : null]
    );
    res = { id: r.insertId, funcao };
  }
  ctx.usuarios.set(cacheKey, res);
  return res;
}

/**
 * Resolve o cursista (usuário + vínculo/linha funcional).
 * Cursista possui 1 único CGM (armazenado em usuario) e pode ter até 2 linhas funcionais (tabela vinculo).
 * Retorna { usuarioId, vinculoId|null } ou null se não for possível identificar.
 */
export async function resolverCursista(ctx, r, { criarVinculo = true } = {}) {
  const cgm = normalizeDigits(r.cgm);
  const em = lowerEmail(r.email || r['e-mail'] || r.email_cursista);
  const nome = s(r.nome_cursista || r.nome);
  const nreEx = await nreId(ctx, r.nre_exe || r.nre, null);
  const cargo = s(r.cargo);
  const munic = s(r.munic_exe || r.municipio || r.munic);
  const cpfN = normalizeDigits(r.cpf_cursista || r.cpf);
  const rgStr = s(r.rg);

  // 1. Identifica o usuário cursista por e-mail, cgm_hash ou cpf_hash
  let u = null;
  if (em) {
    u = (await query('SELECT id, funcao, cgm_hash, cpf_hash FROM usuario WHERE email_inst = ?', [em]))[0] || null;
  }
  if (!u && cgm) {
    u = (await query('SELECT id, funcao, cgm_hash, cpf_hash FROM usuario WHERE cgm_hash = ?', [hmacHex(cgm)]))[0] || null;
  }
  if (!u && cpfN) {
    u = (await query('SELECT id, funcao, cgm_hash, cpf_hash FROM usuario WHERE cpf_hash = ?', [hmacHex(cpfN)]))[0] || null;
  }

  if (u) {
    if (u.funcao !== 'cursista') {
      reject(ctx, 'cgm_para_conta_nao_cursista');
      return { usuarioId: u.id, vinculoId: null };
    }
    await query(
      `UPDATE usuario SET
         nome = COALESCE(?, nome),
         telefone = COALESCE(?, telefone),
         nre_id = COALESCE(?, nre_id),
         email_inst = COALESCE(?, email_inst),
         cgm_hash = COALESCE(?, cgm_hash),
         cgm_cifrado = COALESCE(?, cgm_cifrado),
         cgm_ultimos3 = COALESCE(?, cgm_ultimos3),
         cpf_hash = COALESCE(?, cpf_hash),
         cpf_cifrado = COALESCE(?, cpf_cifrado),
         rg_cifrado = COALESCE(?, rg_cifrado)
       WHERE id = ?`,
      [
        nome, s(r.telefone_cursista || r.telefone), nreEx || null,
        em || null,
        cgm ? hmacHex(cgm) : null, cgm ? encrypt(cgm) : null, cgm ? cgm.slice(-3) : null,
        cpfN ? hmacHex(cpfN) : null, cpfN ? encrypt(cpfN) : null, rgStr ? encrypt(rgStr) : null,
        u.id
      ]
    );
  } else {
    if (!em && !cgm && !cpfN) {
      reject(ctx, 'cursista_sem_identificacao');
      return null;
    }
    const ins = await query(
      `INSERT INTO usuario (email_inst, nome, funcao, telefone, nre_id, cgm_hash, cgm_cifrado, cgm_ultimos3, cpf_hash, cpf_cifrado, rg_cifrado)
       VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
      [
        em || null,
        nome || (em ? em.split('@')[0].replace(/\./g, ' ').toUpperCase() : (cpfN ? `CURSISTA CPF ${cpfN.slice(-4)}` : 'CURSISTA')),
        'cursista',
        s(r.telefone_cursista || r.telefone),
        nreEx || null,
        cgm ? hmacHex(cgm) : null,
        cgm ? encrypt(cgm) : null,
        cgm ? cgm.slice(-3) : null,
        cpfN ? hmacHex(cpfN) : null,
        cpfN ? encrypt(cpfN) : null,
        rgStr ? encrypt(rgStr) : null
      ]
    );
    u = { id: ins.insertId, funcao: 'cursista' };
  }

  if (!criarVinculo) return { usuarioId: u.id, vinculoId: null };

  // 2. Resolve o vínculo (Linha Funcional 1 ou 2)
  let lf = Number(r.linha_funcional || r.vinculo || r.lf || r.padrao || r.ordem);
  if (!lf || (lf !== 1 && lf !== 2)) {
    const vinculosExistentes = await query(
      'SELECT id, linha_funcional, cargo FROM vinculo WHERE usuario_id = ? ORDER BY linha_funcional',
      [u.id]
    );
    if (vinculosExistentes.length === 0) {
      lf = 1;
    } else if (vinculosExistentes.length === 1) {
      const v1 = vinculosExistentes[0];
      const turmaCod = s(r.turmas || r.turma);
      let temEssaTurma = false;
      if (turmaCod) {
        const mat = (await query(
          'SELECT m.id FROM matricula m JOIN turma t ON t.id = m.turma_id WHERE m.vinculo_id = ? AND t.codigo = ?',
          [v1.id, turmaCod]
        ))[0];
        if (mat) temEssaTurma = true;
      }
      if (temEssaTurma) {
        lf = v1.linha_funcional;
      } else {
        const jaTemMatricula = (await query('SELECT id FROM matricula WHERE vinculo_id = ?', [v1.id]))[0];
        if (jaTemMatricula && turmaCod) {
          lf = v1.linha_funcional === 1 ? 2 : 1;
        } else {
          lf = v1.linha_funcional;
        }
      }
    } else {
      const turmaCod = s(r.turmas || r.turma);
      let matchedVinc = vinculosExistentes[0];
      if (turmaCod) {
        for (const ve of vinculosExistentes) {
          const mat = (await query(
            'SELECT m.id FROM matricula m JOIN turma t ON t.id = m.turma_id WHERE m.vinculo_id = ? AND t.codigo = ?',
            [ve.id, turmaCod]
          ))[0];
          if (mat) { matchedVinc = ve; break; }
        }
      }
      return { usuarioId: u.id, vinculoId: matchedVinc.id };
    }
  }

  let v = (await query('SELECT id FROM vinculo WHERE usuario_id = ? AND linha_funcional = ?', [u.id, lf]))[0];
  if (!v) {
    const insV = await query(
      'INSERT INTO vinculo (usuario_id, linha_funcional, ordem, cargo, nre_id, municipio) VALUES (?,?,?,?,?,?)',
      [u.id, lf, lf, cargo, nreEx, munic]
    );
    v = { id: insV.insertId };
  } else {
    await query(
      'UPDATE vinculo SET cargo = COALESCE(?, cargo), nre_id = COALESCE(?, nre_id), municipio = COALESCE(?, municipio) WHERE id = ?',
      [cargo, nreEx, munic, v.id]
    );
  }

  return { usuarioId: u.id, vinculoId: v.id };
}

/* ---------------- cursistas (aba DADOS) ---------------- */
export async function ingestCursistas(items, { runId, final }) {
  const ctx = makeCtx();
  let ok = 0;
  for (const r of items) {
    const res = await resolverCursista(ctx, r);
    if (!res || !res.vinculoId) continue;

    // vÃ­nculo: atualiza municÃ­pio/NRE de exercÃ­cio
    await query('UPDATE vinculo SET municipio = COALESCE(?, municipio), nre_id = COALESCE(?, nre_id), cargo = COALESCE(?, cargo) WHERE id = ?',
      [s(r.munic_exe), await nreId(ctx, r.nre_exe, null), s(r.cargo), res.vinculoId]);

    const codigo = s(r.turmas || r.turma);
    let turmaId = null;
    const cid = await cicloId(ctx, r.ano_formativo, r.chamamento);
    if (codigo) {
      if (!ctx.turma.has(codigo)) {
        const compId = await componenteId(ctx, r.componente || r.componente_conc);
        const nreTutor = await nreId(ctx, r.nre_tutor, r.email_nre || r['e-mail_nre']);
        const nreForm = await nreId(ctx, r.nre_formador, null);
        const form = await usuarioPorEmail(ctx, {
          email: r.email_formador || r['e-mail_formador'], nome: r.nome_formador, funcao: 'formador',
          telefone: r.telefone_formador, nre_id: nreForm, cpf: r.cpf_formador, rg: r.rg_formador
        });
        const tut = await usuarioPorEmail(ctx, {
          email: r.email_tutor, nome: r.tutor_responsavel, funcao: 'tutor', telefone: r.telefone_tutor, nre_id: nreTutor
        });
        await query(
          `INSERT INTO turma (codigo, ciclo_id, componente_id, formador_id, tutor_id, modalidade, turno, dia_semana, hora_ini, hora_fim, id_classroom, link, periodo_ini)
           VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)
           ON DUPLICATE KEY UPDATE ciclo_id = COALESCE(VALUES(ciclo_id), ciclo_id), componente_id = COALESCE(VALUES(componente_id), componente_id),
             formador_id = COALESCE(VALUES(formador_id), formador_id), tutor_id = COALESCE(VALUES(tutor_id), tutor_id),
             modalidade = COALESCE(VALUES(modalidade), modalidade), turno = COALESCE(VALUES(turno), turno),
             dia_semana = COALESCE(VALUES(dia_semana), dia_semana), hora_ini = COALESCE(VALUES(hora_ini), hora_ini),
             hora_fim = COALESCE(VALUES(hora_fim), hora_fim), id_classroom = COALESCE(VALUES(id_classroom), id_classroom),
             link = COALESCE(VALUES(link), link), periodo_ini = COALESCE(VALUES(periodo_ini), periodo_ini)`,
          [codigo, cid, compId, form ? form.id : null, tut ? tut.id : null, s(r.modalidade), s(r.turno), s(r.dia_da_semana),
            s(r.horario_inicial), s(r.horario_fim), s(r.id_classroom), s(r.link || r.link_classroom || r['Link Classroom']), s(r.periodo_ini)]
        );
        ctx.turma.set(codigo, (await query('SELECT id FROM turma WHERE codigo = ?', [codigo]))[0].id);
      }
      turmaId = ctx.turma.get(codigo);
    }

    const codCursista = s(r.cod_cursista) || `V${res.vinculoId}T${turmaId || 0}`;

    await query(
      `INSERT INTO matricula (cod_cursista, vinculo_id, turma_id, ciclo_id, status, na_base_ativa, sync_run, obs_cursista)
       VALUES (?,?,?,?, 'ATIVA', 1, ?, ?)
       ON DUPLICATE KEY UPDATE na_base_ativa = 1, sync_run = VALUES(sync_run),
         ciclo_id = COALESCE(VALUES(ciclo_id), ciclo_id), obs_cursista = COALESCE(VALUES(obs_cursista), obs_cursista)`,
      [codCursista, res.vinculoId, turmaId, cid, runId || null, s(r.observacoes_cursista)]
    );
    ok++;
  }
  if (final && runId) {
    await query('UPDATE matricula SET na_base_ativa = 0 WHERE na_base_ativa = 1 AND (sync_run IS NULL OR sync_run <> ?)', [runId]);
  }
  return { sincronizados: ok, rejeitados: ctx.rej };
}

/* ---------------- tutores ---------------- */
export async function ingestTutores(items) {
  const ctx = makeCtx();
  let ok = 0;
  for (const t of items) {
    const n = await nreId(ctx, t.nre_tutor, t.email_nre);
    const u = await usuarioPorEmail(ctx, {
      email: t.email_educ, nome: t.tutor_responsavel, funcao: 'tutor', telefone: t.telefone, nre_id: n, email_alt: t.email_adm
    });
    if (u) ok++; else reject(ctx, 'tutor_sem_email');
  }
  return { sincronizados: ok, rejeitados: ctx.rej };
}

/* ---------------- situaÃ§Ã£o: concluintes / exonerados / nÃ£o concluintes ---------------- */
async function aplicarStatus(ctx, r, status, { dataEvento, portaria, motivo, detalhes }) {
  const res = await resolverCursista(ctx, r);
  if (!res || !res.vinculoId) { reject(ctx, `${status}_sem_vinculo_cgm`); return false; }

  let mats = await query('SELECT m.id, m.status, t.codigo FROM matricula m LEFT JOIN turma t ON t.id = m.turma_id WHERE m.vinculo_id = ?', [res.vinculoId]);
  if (!mats.length) {
    const ins = await query("INSERT INTO matricula (cod_cursista, vinculo_id, status, na_base_ativa) VALUES (?,?, ?, 0)", [`V${res.vinculoId}T0`, res.vinculoId, status]);
    mats = [{ id: ins.insertId, status, codigo: null }];
  }
  const turma = s(r.turmas || r.turma);
  const alvo = turma && mats.some(m => m.codigo === turma) ? mats.filter(m => m.codigo === turma) : mats;
  for (const m of alvo) {
    if (PRECEDENCIA[status] >= PRECEDENCIA[m.status]) {
      await query('UPDATE matricula SET status = ?, data_status = COALESCE(?, data_status) WHERE id = ?', [status, dataEvento, m.id]);
    }
    await query(
      `INSERT INTO matricula_status_hist (matricula_id, status, data_evento, portaria, motivo, detalhes) VALUES (?,?,?,?,?,?)
       ON DUPLICATE KEY UPDATE data_evento = VALUES(data_evento), portaria = VALUES(portaria), motivo = VALUES(motivo), detalhes = VALUES(detalhes)`,
      [m.id, status, dataEvento, portaria, motivo, JSON.stringify(detalhes)]
    );
  }
  return true;
}

export async function ingestConcluintes(items) {
  const ctx = makeCtx();
  let ok = 0;
  for (const r of items) {
    const det = {
      componente: s(r.componente), turmas: s(r.turmas), modalidade: s(r.modalidade) || 'Docentes',
      chamamento: s(r.chamamento) || '1Âº Chamamento', ano_formativo: s(r.ano_formativo) || '1Âº ANO',
      nre_exe: s(r.nre_exe), munic_exe: s(r.munic_exe), situacao: s(r.situacao) || 'CONCLUÃDO', data_raw: s(r.data_conclusao)
    };
    if (await aplicarStatus(ctx, r, 'CONCLUIDA', { dataEvento: parseDate(r.data_conclusao), portaria: null, motivo: null, detalhes: det })) ok++;
  }
  return { sincronizados: ok, rejeitados: ctx.rej };
}

export async function ingestExonerados(items) {
  const ctx = makeCtx();
  let ok = 0;
  for (const r of items) {
    const status = s(r.status || r.motivo);
    const det = {
      cargo: s(r.cargo || r.modalidade), disciplina: s(r.disciplina || r.componente), chamamento: s(r.chamamento),
      escola: s(r.escola), observacoes: s(r.observacoes), nre: s(r.nre), municipio: s(r.municipio || r.munic),
      status, data_raw: s(r.data_exoneracao || r.data)
    };
    if (await aplicarStatus(ctx, r, 'EXONERADA', { dataEvento: parseDate(r.data_exoneracao || r.data), portaria: s(r.portaria), motivo: status, detalhes: det })) ok++;
  }
  return { sincronizados: ok, rejeitados: ctx.rej };
}

export async function ingestNaoConcluintes(items) {
  const ctx = makeCtx();
  let ok = 0;
  for (const r of items) {
    const det = { modalidade: s(r.modalidade), componente: s(r.componente), chamamento: s(r.chamamento) };
    if (await aplicarStatus(ctx, r, 'NAO_CONCLUIDA', { dataEvento: null, portaria: null, motivo: s(r.motivo), detalhes: det })) ok++;
  }
  return { sincronizados: ok, rejeitados: ctx.rej };
}

/* ---------------- movimentaÃ§Ãµes ---------------- */
export async function ingestMovimentacoes(items) {
  const ctx = makeCtx();
  let ok = 0;
  for (const m of items) {
    const res = await resolverCursista(ctx, { ...m, nome_cursista: m.nome_cursista }, { criarVinculo: false });
    const nid = await nreId(ctx, m.nre, null);
    const registrado = parseDateTime(m.timestamp) || new Date().toISOString().slice(0, 19).replace('T', ' ');
    const extId = s(m.id) || `MOV_${sha(lowerEmail(m.email || m.emailCursista), registrado, m.tipo_acao, m.turma_anterior, m.turma_nova, m.motivo)}`;
    await query(
      `INSERT INTO movimentacao (ext_id, usuario_id, registrado_em, nre_id, tutor_responsavel, email_tutor_resp, turma_anterior, turma_nova,
         tipo_acao, motivo, situacao_relacionada, ano_formacao, chamamento, modalidade_detalhes, turma_detalhes, justificativa, descricao,
         comprovante, status, nota_resolucao, solicitado_por_nome)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
       ON DUPLICATE KEY UPDATE
         status = IF(resolvido_em IS NOT NULL, status, VALUES(status)),
         nota_resolucao = IF(resolvido_em IS NOT NULL, nota_resolucao, VALUES(nota_resolucao)),
         turma_anterior = VALUES(turma_anterior), turma_nova = VALUES(turma_nova), justificativa = VALUES(justificativa)`,
      [extId, res ? res.usuarioId : null, registrado, nid, s(m.tutor_responsavel || m.tutor), lowerEmail(m.email_tutor_responsavel),
        s(m.turma_anterior), s(m.turma_nova), s(m.tipo_acao) || 'SolicitaÃ§Ã£o', s(m.motivo), s(m.situacao_relacionada), s(m.ano_formacao),
        s(m.chamamento), s(m.modalidade_detalhes), s(m.turma_detalhes), s(m.justificativa), s(m.descricao), s(m.comprovante),
        s(m.status) || 'Pendente', s(m.nota_resolucao), s(m.solicitadoPor) || 'Google Forms']
    );
    ok++;
  }
  return { sincronizados: ok, rejeitados: ctx.rej };
}

/* ---------------- observaÃ§Ãµes da prÃ¡tica ---------------- */
export async function ingestObservacoes(items) {
  const ctx = makeCtx();
  let ok = 0;
  for (const o of items) {
    const emCurs = lowerEmail(o.email_cursista);
    if (!emCurs) { reject(ctx, 'observacao_sem_email_cursista'); continue; }
    const cur = await usuarioPorEmail(ctx, { email: emCurs, nome: o.nome_cursista, funcao: 'cursista' });
    const emForm = lowerEmail(o.email_formador);
    const form = emForm ? await usuarioPorEmail(ctx, { email: emForm, nome: o.nome_formador, funcao: 'formador' }) : null;
    const mat = cur ? (await query(
      `SELECT m.id FROM matricula m JOIN vinculo v ON v.id = m.vinculo_id
       LEFT JOIN turma t ON t.id = m.turma_id LEFT JOIN componente c ON c.id = t.componente_id
       WHERE v.usuario_id = ? ORDER BY (c.nome = ?) DESC, m.na_base_ativa DESC, m.id LIMIT 1`, [cur.id, s(o.componente) || ''])
    )[0] : null;
    const idOrig = s(o.id_origem || o.id) || `OBS_${sha(emCurs, o.carimbo, o.tema, o.data_observacao, o.data_pratica)}`;
    await query(
      `INSERT INTO observacao_pratica (id_origem, usuario_id, matricula_id, formador_id, carimbo, ano_formativo, semestre, chamamento, modalidade,
         componente, tema, email_cursista, nome_cursista, email_formador, nome_formador, tutor_responsavel, turma, nre_exe, munic_exe, proposta,
         observacao_realizada, is_realizada, data_pratica, data_observacao, data_feedback, modalidade_feedback, motivo_devolutiva,
         link_gravacao_pratica, link_planejamento, link_pdp, proposta_pedagogica, link_gravacao_feedback, nivel_planejamento, nivel_pratica,
         questionamentos_propositivos, proposicoes_sugestoes, combinados, quem_observou, tutor_tecnico_observador)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
       ON DUPLICATE KEY UPDATE matricula_id = COALESCE(VALUES(matricula_id), matricula_id), formador_id = COALESCE(VALUES(formador_id), formador_id),
         email_cursista = VALUES(email_cursista), nome_cursista = VALUES(nome_cursista), email_formador = VALUES(email_formador), nome_formador = VALUES(nome_formador),
         tutor_responsavel = COALESCE(VALUES(tutor_responsavel), tutor_responsavel), turma = COALESCE(VALUES(turma), turma),
         nre_exe = COALESCE(VALUES(nre_exe), nre_exe), munic_exe = COALESCE(VALUES(munic_exe), munic_exe), proposta = COALESCE(VALUES(proposta), proposta),
         data_pratica = VALUES(data_pratica), data_feedback = VALUES(data_feedback), nivel_planejamento = VALUES(nivel_planejamento), nivel_pratica = VALUES(nivel_pratica),
         tema = VALUES(tema), proposta_pedagogica = VALUES(proposta_pedagogica), quem_observou = VALUES(quem_observou),
         tutor_tecnico_observador = VALUES(tutor_tecnico_observador)`,
      [idOrig, cur ? cur.id : null, mat ? mat.id : null, form ? form.id : null, s(o.carimbo), s(o.ano_formativo), s(o.semestre), s(o.chamamento), s(o.modalidade),
        s(o.componente), s(o.tema), emCurs, s(o.nome_cursista) || '', emForm, s(o.nome_formador) || null, s(o.tutor_responsavel) || null, s(o.turma) || null,
        s(o.nre_exe || o.nre) || null, s(o.munic_exe || o.municipio) || null, s(o.proposta || o.proposta_pedagogica) || null,
        s(o.observacao_realizada) || 'Sim', o.is_realizada !== false && o.is_realizada !== 0 ? 1 : 0,
        parseDate(o.data_pratica || o.data_implementacao), parseDate(o.data_observacao), parseDate(o.data_feedback), s(o.modalidade_feedback),
        s(o.motivo_devolutiva), s(o.link_gravacao_pratica), s(o.link_planejamento || o.link_pdp), s(o.link_pdp || o.link_planejamento),
        s(o.proposta_pedagogica || o.proposta), s(o.link_gravacao_feedback), s(o.nivel_planejamento), s(o.nivel_pratica),
        s(o.questionamentos_propositivos), s(o.proposicoes_sugestoes), s(o.combinados),
        s(o.quem_observou) || (o.tutor_tecnico_observador ? 'Tutor/Técnico' : 'Formador'), s(o.tutor_tecnico_observador)]
    );
    ok++;
  }
  return { sincronizados: ok, rejeitados: ctx.rej };
}

/* ---------------- observações do tutor (acompanhamento de formadores) ---------------- */
export async function ingestObservacoesTutor(items) {
  const ctx = makeCtx();
  let ok = 0;
  for (let i = 0; i < items.length; i++) {
    const o = items[i];
    const tutorEmail = o.tutorEmail || o.tutor_email || o.email_tutor;
    const tutorNome = o.tutor || o.tutor_nome || o.nome_tutor;
    const formadorEmail = o.formadorEmail || o.formador_email || o.email_formador;
    const formadorNome = o.formador || o.formador_nome || o.nome_formador;
    const ts = o.timestamp || o.registrado_em || o.carimbo || o.data_registro;
    const acaoObs = o.acaoObservada || o.acao_observada;
    const tut = await usuarioPorEmail(ctx, { email: tutorEmail, nome: tutorNome, funcao: 'tutor' });
    const form = await usuarioPorEmail(ctx, { email: formadorEmail, nome: formadorNome, funcao: 'formador' });
    const nid = await nreId(ctx, o.nre, null);
    const idOrig = String(o.id || o.id_origem || `OBS_TUT_${sha(tutorEmail, ts, acaoObs, i)}`);
    const avg = o.avgScore !== null && o.avgScore !== undefined && !isNaN(o.avgScore) ? Number(o.avgScore) : null;
    await query(
      `INSERT INTO observacao_tutor (id_origem, tutor_id, formador_id, registrado_em, acao_acompanhamento, acao_observada, data_observacao,
         link_acao_observada, data_feedback, link_feedback, links_complementares, modalidade, avg_score, checklist_realizadas,
         checklist_nao_realizadas, outros_registros, destaques, desenvolver, encaminhamentos, nre_id, tema, rubricas)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
       ON DUPLICATE KEY UPDATE tutor_id = VALUES(tutor_id), formador_id = VALUES(formador_id), avg_score = VALUES(avg_score),
         rubricas = VALUES(rubricas), destaques = VALUES(destaques), desenvolver = VALUES(desenvolver), encaminhamentos = VALUES(encaminhamentos),
         nre_id = VALUES(nre_id), tema = VALUES(tema), modalidade = VALUES(modalidade)`,
      [idOrig, tut ? tut.id : null, form ? form.id : null, parseDateTime(ts), s(o.acaoAcompanhamento || o.acao_acompanhamento),
        s(acaoObs), s(o.dataObservacao || o.data_observacao), s(o.linkAcaoObservada || o.link_acao_observada),
        s(o.dataFeedback || o.data_feedback), s(o.linkFeedback || o.link_feedback), s(o.linksComplementares || o.links_complementares),
        s(o.modalidade), avg, s(o.checklistRealizadas || o.checklist_realizadas), s(o.checklistNaoRealizadas || o.checklist_nao_realizadas),
        s(o.outrosRegistros || o.outros_registros), s(o.destaques), s(o.desenvolver), s(o.encaminhamentos), nid, s(o.tema),
        JSON.stringify(o.rubrics || o.rubricas || [])]
    );
    ok++;
  }
  return { sincronizados: ok, rejeitados: ctx.rej };
}

