import 'dotenv/config';
import fs from 'fs';
import mysql from 'mysql2/promise';

function parseDate(val) {
  if (!val) return null;
  const s = String(val).trim();
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (m) {
    const dia = m[1].padStart(2, '0');
    const mes = m[2].padStart(2, '0');
    const ano = m[3];
    return `${ano}-${mes}-${dia}`;
  }
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  return null;
}

function s255(v) {
  if (!v) return null;
  return String(v).trim().slice(0, 255);
}

async function main() {
  const c = await mysql.createConnection({
    host: 'gateway01.sa-east-1.prod.aws.tidbcloud.com',
    port: 4000,
    user: '2qQCGoHbFUft6ad.root',
    password: 'rupB6CCFDb1GqRln',
    database: 'estagio_probatorio',
    ssl: { rejectUnauthorized: false }
  });

  console.log('Connected to TiDB Cloud!');

  // 1. Ingest public/observacoes_pratica_real.json (19,968 records)
  if (fs.existsSync('public/observacoes_pratica_real.json')) {
    console.log('Loading public/observacoes_pratica_real.json...');
    const data = JSON.parse(fs.readFileSync('public/observacoes_pratica_real.json', 'utf8'));
    console.log('Total to process from real.json:', data.length);

    const BATCH = 300;
    let ok = 0;
    for (let i = 0; i < data.length; i += BATCH) {
      const slice = data.slice(i, i + BATCH);
      const values = [];
      const placeholders = [];

      for (const o of slice) {
        const idOrig = o.id_origem || o.id || `OBS_REAL_${i}`;
        placeholders.push('(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
        values.push(
          idOrig,
          s255(o.carimbo),
          s255(o.ano_formativo),
          s255(o.semestre),
          s255(o.modalidade),
          s255(o.componente),
          o.tema || null,
          s255((o.email_cursista || '').toLowerCase()),
          o.nome_cursista || null,
          s255((o.email_formador || '').toLowerCase()),
          o.nome_formador || null,
          o.tutor_responsavel || null,
          s255(o.turma),
          s255(o.nre_exe || o.nre),
          s255(o.munic_exe),
          o.proposta || o.proposta_pedagogica || null,
          s255(o.observacao_realizada) || 'Sim',
          o.is_realizada ? 1 : 0,
          parseDate(o.data_pratica),
          parseDate(o.data_observacao),
          parseDate(o.data_feedback),
          s255(o.modalidade_feedback),
          o.motivo_devolutiva || null,
          o.link_gravacao_pratica || null,
          o.link_planejamento || o.link_pdp || null,
          o.link_pdp || o.link_planejamento || null,
          o.proposta_pedagogica || o.proposta || null,
          o.link_gravacao_feedback || null,
          s255(o.nivel_planejamento),
          s255(o.nivel_pratica),
          o.combinados || null,
          s255(o.quem_observou) || (o.tutor_tecnico_observador ? 'Tutor/Técnico' : 'Formador'),
          o.tutor_tecnico_observador || null
        );
      }

      const sql = `INSERT INTO observacao_pratica (
        id_origem, carimbo, ano_formativo, semestre, modalidade, componente, tema,
        email_cursista, nome_cursista, email_formador, nome_formador, tutor_responsavel,
        turma, nre_exe, munic_exe, proposta, observacao_realizada, is_realizada,
        data_pratica, data_observacao, data_feedback, modalidade_feedback, motivo_devolutiva,
        link_gravacao_pratica, link_planejamento, link_pdp, proposta_pedagogica,
        link_gravacao_feedback, nivel_planejamento, nivel_pratica, combinados,
        quem_observou, tutor_tecnico_observador
      ) VALUES ${placeholders.join(',')}
      ON DUPLICATE KEY UPDATE
        tema = VALUES(tema),
        is_realizada = VALUES(is_realizada),
        data_pratica = VALUES(data_pratica),
        data_feedback = VALUES(data_feedback)`;

      await c.query(sql, values);
      ok += slice.length;
      if (ok % 3000 === 0 || ok === data.length) {
        console.log(`Ingested ${ok} / ${data.length} records...`);
      }
    }
    console.log('✓ Successfully finished real.json! Total:', ok);
  }

  // 2. Ingest public/observacoes_2024.json (12,756 records)
  if (fs.existsSync('public/observacoes_2024.json')) {
    console.log('Loading public/observacoes_2024.json...');
    const d2024 = JSON.parse(fs.readFileSync('public/observacoes_2024.json', 'utf8'));
    console.log('Total to process from 2024.json:', d2024.length);

    const BATCH = 300;
    let ok24 = 0;
    for (let i = 0; i < d2024.length; i += BATCH) {
      const slice = d2024.slice(i, i + BATCH);
      const values = [];
      const placeholders = [];

      for (const item of slice) {
        const idOrig = item.id || `OBS_2024_${i}`;
        placeholders.push('(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
        values.push(
          idOrig,
          '2024',
          '2024',
          s255(item.dp || item.do || item.df || '2024'),
          s255((item.ec || '').toLowerCase()),
          item.nc || null,
          s255((item.ef || '').toLowerCase()),
          item.nf || null,
          s255(item.cp),
          item.tm || 'Observação 2024',
          item.ir ? 1 : 0,
          item.ir ? 'Sim' : 'Não Realizada',
          parseDate(item.dp),
          parseDate(item.do),
          parseDate(item.df),
          s255(item.mf),
          item.lp || null,
          item.lf || null,
          s255(item.npl),
          s255(item.npr),
          item.jn || null,
          'Formador'
        );
      }

      const sql = `INSERT INTO observacao_pratica (
        id_origem, ano_formativo, semestre, carimbo, email_cursista, nome_cursista,
        email_formador, nome_formador, componente, tema, is_realizada,
        observacao_realizada, data_pratica, data_observacao, data_feedback,
        modalidade_feedback, link_gravacao_pratica, link_gravacao_feedback,
        nivel_planejamento, nivel_pratica, justificativa_nao_realizada, quem_observou
      ) VALUES ${placeholders.join(',')}
      ON DUPLICATE KEY UPDATE
        tema = VALUES(tema),
        is_realizada = VALUES(is_realizada),
        data_pratica = VALUES(data_pratica),
        data_feedback = VALUES(data_feedback)`;

      await c.query(sql, values);
      ok24 += slice.length;
      if (ok24 % 3000 === 0 || ok24 === d2024.length) {
        console.log(`Ingested ${ok24} / ${d2024.length} from 2024.json...`);
      }
    }
    console.log('✓ Successfully finished 2024.json! Total:', ok24);
  }

  const [cnt] = await c.query('SELECT count(*) as total FROM observacao_pratica');
  console.log('GRAND TOTAL IN observacao_pratica (TiDB Cloud):', cnt[0].total);

  await c.end();
}

main().catch(console.error);
