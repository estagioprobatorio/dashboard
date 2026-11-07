import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import mysql from 'mysql2/promise';
import XLSX from 'xlsx';
import { encrypt, hmacHex, normalizeDigits } from '../api/_lib/crypto.js';
import { s, lowerEmail, normalizeNre } from '../api/_lib/utils.js';

function excelTimeToStr(val) {
  if (!val && val !== 0) return null;
  const str = String(val).trim();
  if (/^\d{1,2}:\d{2}/.test(str)) return str.slice(0, 5);
  const num = parseFloat(str);
  if (!isNaN(num) && num >= 0 && num < 1) {
    const totalMinutes = Math.round(num * 24 * 60);
    const hh = String(Math.floor(totalMinutes / 60)).padStart(2, '0');
    const mm = String(totalMinutes % 60).padStart(2, '0');
    return `${hh}:${mm}`;
  }
  return str.slice(0, 10);
}

async function main() {
  const conn = await mysql.createConnection({ uri: process.env.DATABASE_URL, ssl: { rejectUnauthorized: true } });
  console.log('✓ Connected to TiDB Cloud!');

  await conn.query('ALTER TABLE vinculo MODIFY linha_funcional SMALLINT NOT NULL DEFAULT 1, MODIFY ordem SMALLINT NOT NULL DEFAULT 1');

  console.log('Reading docs-planilhas/Planilha Mestra.xlsx...');
  const wb = XLSX.readFile('docs-planilhas/Planilha Mestra.xlsx');
  const dadosRows = XLSX.utils.sheet_to_json(wb.Sheets['DADOS'], { defval: '' })
    .filter(r => s(r.nome_cursista) || s(r.cgm) || s(r.cpf));
  console.log(`✓ Loaded ${dadosRows.length} active cursista rows from DADOS`);

  // 1. NREs
  const nreSet = new Map();
  for (const r of dadosRows) {
    for (const raw of [r.nre_exe, r.nre_formador, r.nre_tutor]) {
      const n = normalizeNre(raw);
      if (n && !nreSet.has(n)) nreSet.set(n, null);
    }
    const nt = normalizeNre(r.nre_tutor);
    const emNre = lowerEmail(r['e-mail_nre']);
    if (nt && emNre) nreSet.set(nt, emNre);
  }
  for (const [nome, email] of nreSet.entries()) {
    await conn.query('INSERT INTO nre (nome, email) VALUES (?, ?) ON DUPLICATE KEY UPDATE email = COALESCE(VALUES(email), email)', [nome, email]);
  }
  const [nreDb] = await conn.query('SELECT id, nome FROM nre');
  const nreMap = new Map(nreDb.map(x => [x.nome, x.id]));

  // 2. Componentes
  const compSet = new Set();
  for (const r of dadosRows) {
    const c = s(r.componente);
    if (c) compSet.add(c);
  }
  for (const c of compSet) {
    await conn.query('INSERT INTO componente (nome) VALUES (?) ON DUPLICATE KEY UPDATE nome = nome', [c]);
  }
  const [compDb] = await conn.query('SELECT id, nome FROM componente');
  const compMap = new Map(compDb.map(x => [x.nome, x.id]));

  // 3. Ciclos
  const cicloSet = new Set();
  for (const r of dadosRows) {
    const a = s(r.ano_formativo);
    const ch = s(r.chamamento) || '';
    if (a) cicloSet.add(`${a}|${ch}`);
  }
  for (const key of cicloSet) {
    const [a, ch] = key.split('|');
    await conn.query('INSERT INTO ciclo (ano_formativo, chamamento) VALUES (?, ?) ON DUPLICATE KEY UPDATE ano_formativo = ano_formativo', [a, ch]);
  }
  const [cicloDb] = await conn.query('SELECT id, ano_formativo, chamamento FROM ciclo');
  const cicloMap = new Map(cicloDb.map(x => [`${x.ano_formativo}|${x.chamamento || ''}`, x.id]));

  // 4. Tutores & Formadores (Bulk)
  const staffByEmail = new Map();
  for (const r of dadosRows) {
    const emTutor = lowerEmail(r.email_tutor);
    if (emTutor && !staffByEmail.has(emTutor)) {
      staffByEmail.set(emTutor, {
        email: emTutor,
        nome: s(r.tutor_responsavel) || emTutor,
        funcao: 'tutor',
        tel: s(r.telefone_tutor),
        nreId: nreMap.get(normalizeNre(r.nre_tutor)) || null
      });
    }
    const emForm = lowerEmail(r['e-mail_formador']);
    if (emForm && !staffByEmail.has(emForm)) {
      staffByEmail.set(emForm, {
        email: emForm,
        nome: s(r.nome_formador) || emForm,
        funcao: 'formador',
        tel: s(r.telefone_formador),
        nreId: nreMap.get(normalizeNre(r.nre_formador)) || null
      });
    }
  }
  const staffArr = Array.from(staffByEmail.values());
  if (staffArr.length > 0) {
    const vals = staffArr.map(u => [u.email, u.nome, u.funcao, u.tel, u.nreId]);
    await conn.query(
      `INSERT INTO usuario (email_inst, nome, funcao, telefone, nre_id) VALUES ?
       ON DUPLICATE KEY UPDATE nome = COALESCE(VALUES(nome), nome), telefone = COALESCE(VALUES(telefone), telefone), nre_id = COALESCE(VALUES(nre_id), nre_id)`,
      [vals]
    );
  }

  // 5. Cursistas (Bulk por lotes de 400)
  const cursistasDedup = new Map();
  for (const r of dadosRows) {
    const em = lowerEmail(r['e-mail']);
    const cgm = normalizeDigits(r.cgm);
    const cpf = normalizeDigits(r.cpf);
    const rg = s(r.rg);
    const key = em || (cgm ? `cgm:${cgm}` : (cpf ? `cpf:${cpf}` : null));
    if (!key) continue;
    if (!cursistasDedup.has(key)) {
      cursistasDedup.set(key, {
        email: em || null,
        nome: s(r.nome_cursista) || 'CURSISTA',
        tel: s(r.telefone_cursista),
        nreId: nreMap.get(normalizeNre(r.nre_exe)) || null,
        cgmHash: cgm ? hmacHex(cgm) : null,
        cgmCif: cgm ? encrypt(cgm) : null,
        cgmUlt3: cgm ? cgm.slice(-3) : null,
        cpfHash: cpf ? hmacHex(cpf) : null,
        cpfCif: cpf ? encrypt(cpf) : null,
        rgCif: rg ? encrypt(rg) : null
      });
    }
  }
  const cursArr = Array.from(cursistasDedup.values());
  console.log(`Inserting/updating ${cursArr.length} unique cursista users...`);
  for (let i = 0; i < cursArr.length; i += 400) {
    const batch = cursArr.slice(i, i + 400).map(u => [
      u.email, u.nome, 'cursista', u.tel, u.nreId, u.cgmHash, u.cgmCif, u.cgmUlt3, u.cpfHash, u.cpfCif, u.rgCif
    ]);
    await conn.query(
      `INSERT INTO usuario (email_inst, nome, funcao, telefone, nre_id, cgm_hash, cgm_cifrado, cgm_ultimos3, cpf_hash, cpf_cifrado, rg_cifrado)
       VALUES ?
       ON DUPLICATE KEY UPDATE
         nome = COALESCE(VALUES(nome), nome),
         telefone = COALESCE(VALUES(telefone), telefone),
         nre_id = COALESCE(VALUES(nre_id), nre_id),
         cgm_hash = COALESCE(VALUES(cgm_hash), cgm_hash),
         cgm_cifrado = COALESCE(VALUES(cgm_cifrado), cgm_cifrado),
         cgm_ultimos3 = COALESCE(VALUES(cgm_ultimos3), cgm_ultimos3),
         cpf_hash = COALESCE(VALUES(cpf_hash), cpf_hash),
         cpf_cifrado = COALESCE(VALUES(cpf_cifrado), cpf_cifrado),
         rg_cifrado = COALESCE(VALUES(rg_cifrado), rg_cifrado)`,
      [batch]
    );
  }

  // Carrega mapa de usuarios do banco
  const [allUsers] = await conn.query('SELECT id, email_inst, cgm_hash, cpf_hash FROM usuario');
  const userByEmail = new Map();
  const userByCgmHash = new Map();
  const userByCpfHash = new Map();
  for (const u of allUsers) {
    if (u.email_inst) userByEmail.set(u.email_inst.toLowerCase(), u.id);
    if (u.cgm_hash) userByCgmHash.set(u.cgm_hash, u.id);
    if (u.cpf_hash) userByCpfHash.set(u.cpf_hash, u.id);
  }

  // 6. Turmas (Bulk)
  const turmasMap = new Map();
  for (const r of dadosRows) {
    const cod = s(r.turmas);
    if (!cod || turmasMap.has(cod)) continue;
    const cid = cicloMap.get(`${s(r.ano_formativo)}|${s(r.chamamento) || ''}`) || null;
    const compId = compMap.get(s(r.componente)) || null;
    const formId = userByEmail.get(lowerEmail(r['e-mail_formador'])) || null;
    const tutId = userByEmail.get(lowerEmail(r.email_tutor)) || null;
    turmasMap.set(cod, [
      cod, cid, compId, formId, tutId, s(r.modalidade), s(r.turno), s(r.dia_da_semana),
      excelTimeToStr(r.horario_inicial), excelTimeToStr(r.horario_fim), s(r['id-classroom']), s(r.link), s(r.periodo_ini)
    ]);
  }
  const turmasArr = Array.from(turmasMap.values());
  console.log(`Inserting/updating ${turmasArr.length} turmas...`);
  if (turmasArr.length > 0) {
    await conn.query(
      `INSERT INTO turma (codigo, ciclo_id, componente_id, formador_id, tutor_id, modalidade, turno, dia_semana, hora_ini, hora_fim, id_classroom, link, periodo_ini)
       VALUES ?
       ON DUPLICATE KEY UPDATE
         ciclo_id = COALESCE(VALUES(ciclo_id), ciclo_id),
         componente_id = COALESCE(VALUES(componente_id), componente_id),
         formador_id = COALESCE(VALUES(formador_id), formador_id),
         tutor_id = COALESCE(VALUES(tutor_id), tutor_id),
         modalidade = COALESCE(VALUES(modalidade), modalidade),
         turno = COALESCE(VALUES(turno), turno),
         dia_semana = COALESCE(VALUES(dia_semana), dia_semana),
         hora_ini = COALESCE(VALUES(hora_ini), hora_ini),
         hora_fim = COALESCE(VALUES(hora_fim), hora_fim),
         link = COALESCE(VALUES(link), link)`,
      [turmasArr]
    );
  }
  const [turmasDb] = await conn.query('SELECT id, codigo FROM turma');
  const turmaIdByCod = new Map(turmasDb.map(t => [t.codigo, t.id]));

  // 7. Vínculos (Bulk)
  const vinculosDedup = new Map();
  for (const r of dadosRows) {
    const em = lowerEmail(r['e-mail']);
    const cgm = normalizeDigits(r.cgm);
    const cpf = normalizeDigits(r.cpf);
    const uid = (em && userByEmail.get(em)) || (cgm && userByCgmHash.get(hmacHex(cgm))) || (cpf && userByCpfHash.get(hmacHex(cpf)));
    if (!uid) continue;
    const lf = parseInt(String(r.linha_funcional || '1').replace(/\D/g, ''), 10) || 1;
    const nreId = nreMap.get(normalizeNre(r.nre_exe)) || null;
    const munic = s(r.munic_exe);
    const cargo = s(r.modalidade) || 'DOCENTES';
    const vKey = `${uid}_${lf}`;
    if (!vinculosDedup.has(vKey)) {
      vinculosDedup.set(vKey, [uid, lf, lf, cargo, nreId, munic]);
    }
  }
  const vincArr = Array.from(vinculosDedup.values());
  console.log(`Inserting/updating ${vincArr.length} vinculos...`);
  for (let i = 0; i < vincArr.length; i += 500) {
    const batch = vincArr.slice(i, i + 500);
    await conn.query(
      `INSERT INTO vinculo (usuario_id, linha_funcional, ordem, cargo, nre_id, municipio)
       VALUES ?
       ON DUPLICATE KEY UPDATE
         cargo = COALESCE(VALUES(cargo), cargo),
         nre_id = COALESCE(VALUES(nre_id), nre_id),
         municipio = COALESCE(VALUES(municipio), municipio)`,
      [batch]
    );
  }
  const [vincDb] = await conn.query('SELECT id, usuario_id, linha_funcional FROM vinculo');
  const vincIdMap = new Map(vincDb.map(v => [`${v.usuario_id}_${v.linha_funcional}`, v.id]));

  // 8. Matrículas (Bulk com cod_cursista = CGM_LF)
  const matDedup = new Map();
  const usedCodCursista = new Set();
  for (const r of dadosRows) {
    const em = lowerEmail(r['e-mail']);
    const cgm = normalizeDigits(r.cgm);
    const cpf = normalizeDigits(r.cpf);
    const uid = (em && userByEmail.get(em)) || (cgm && userByCgmHash.get(hmacHex(cgm))) || (cpf && userByCpfHash.get(hmacHex(cpf)));
    if (!uid) continue;
    const lf = parseInt(String(r.linha_funcional || '1').replace(/\D/g, ''), 10) || 1;
    const vid = vincIdMap.get(`${uid}_${lf}`);
    if (!vid) continue;
    const tid = turmaIdByCod.get(s(r.turmas)) || null;
    const cid = cicloMap.get(`${s(r.ano_formativo)}|${s(r.chamamento) || ''}`) || null;
    const mKey = `${vid}_${tid || 0}`;
    if (matDedup.has(mKey)) continue;

    let codCursista = cgm ? `${cgm}_${lf}` : `V${vid}T${tid || 0}`;
    if (usedCodCursista.has(codCursista)) {
      codCursista = `${codCursista}_T${tid || 0}`;
    }
    usedCodCursista.add(codCursista);
    matDedup.set(mKey, [codCursista, vid, tid, cid, 'ATIVA', 1, 'mestra_sync', s(r.observacoes_cursista)]);
  }
  const matArr = Array.from(matDedup.values());
  console.log(`Inserting/updating ${matArr.length} matriculas...`);
  for (let i = 0; i < matArr.length; i += 500) {
    const batch = matArr.slice(i, i + 500);
    await conn.query(
      `INSERT INTO matricula (cod_cursista, vinculo_id, turma_id, ciclo_id, status, na_base_ativa, sync_run, obs_cursista)
       VALUES ?
       ON DUPLICATE KEY UPDATE
         turma_id = COALESCE(VALUES(turma_id), turma_id),
         ciclo_id = COALESCE(VALUES(ciclo_id), ciclo_id),
         na_base_ativa = 1,
         sync_run = VALUES(sync_run)`,
      [batch]
    );
  }

  // 9. Atualiza os 8 chamados pendentes (>= 2026-11-03) com todos os dados enriquecidos da aba DADOS e Troca de Turma
  const [pendMovs] = await conn.query("SELECT id, ext_id FROM movimentacao WHERE registrado_em >= '2026-11-03'");
  const dadosByCgm = new Map();
  for (const r of dadosRows) {
    const cgm = normalizeDigits(r.cgm);
    if (cgm) dadosByCgm.set(cgm, r);
  }
  for (const pm of pendMovs) {
    const m = String(pm.ext_id || '').match(/_(\d{7,10})_/);
    if (m) {
      const cgm = m[1];
      const d = dadosByCgm.get(cgm);
      if (d) {
        const uid = userByCgmHash.get(hmacHex(cgm)) || null;
        const lf = parseInt(String(d.linha_funcional || '1').replace(/\D/g, ''), 10) || 1;
        const vid = uid ? vincIdMap.get(`${uid}_${lf}`) : null;
        let mid = null;
        if (vid) {
          const [mRows] = await conn.query('SELECT id FROM matricula WHERE vinculo_id = ? LIMIT 1', [vid]);
          if (mRows.length) mid = mRows[0].id;
        }
        const nreId = nreMap.get(normalizeNre(d.nre_exe)) || null;
        await conn.query(
          `UPDATE movimentacao SET
             usuario_id = COALESCE(?, usuario_id),
             matricula_id = COALESCE(?, matricula_id),
             nre_id = COALESCE(?, nre_id),
             turma_anterior = ?,
             tutor_responsavel = ?,
             email_tutor_resp = ?,
             ano_formacao = ?,
             chamamento = ?,
             modalidade_detalhes = ?
           WHERE id = ?`,
          [
            uid, mid, nreId,
            s(d.turmas) || 'A Definir',
            s(d.tutor_responsavel),
            lowerEmail(d.email_tutor),
            s(d.ano_formativo),
            s(d.chamamento),
            `${s(d.modalidade)} | ${s(d.componente)} | LF: ${lf} | Formador Atual: ${s(d.nome_formador)} (${lowerEmail(d['e-mail_formador'])})`,
            pm.id
          ]
        );
      }
    }
  }

  const [[cU]] = await conn.query('SELECT COUNT(*) n FROM usuario');
  const [[cT]] = await conn.query('SELECT COUNT(*) n FROM turma');
  const [[cV]] = await conn.query('SELECT COUNT(*) n FROM vinculo');
  const [[cM]] = await conn.query('SELECT COUNT(*) n FROM matricula WHERE na_base_ativa = 1');
  console.log('\n=== RESUMO FINAL NO TIDB CLOUD ===');
  console.log({ usuarios: cU.n, turmas: cT.n, vinculos: cV.n, matriculas_ativas: cM.n });
  await conn.end();
}

main().catch(console.error);
