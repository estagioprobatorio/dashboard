#!/usr/bin/env node
/**
 * =========================================================================================
 * SCRIPT DE CARGA INICIAL: POPULAR TiDB SERVERLESS CLOUD COM MYSQL2
 * Plataforma do Estágio Probatório - SEED/PR
 * =========================================================================================
 */

const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

// Carregar variáveis do .env manualmente se dotenv não estiver instalado
function carregarEnv() {
  const envPath = path.join(__dirname, '.env');
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf8').split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue;
      const [key, ...vals] = trimmed.split('=');
      const val = vals.join('=').trim().replace(/^['"]|['"]$/g, '');
      if (!process.env[key.trim()]) {
        process.env[key.trim()] = val;
      }
    }
  }
}

carregarEnv();

function getConfig() {
  let host = process.env.TIDB_HOST || 'gateway01.sa-east-1.prod.aws.tidbcloud.com';
  let port = Number(process.env.TIDB_PORT) || 4000;
  let user = process.env.TIDB_USER || '2qQCGoHbFUft6ad.root';
  let password = process.env.TIDB_PASSWORD || 'akSNnn5qWIkqFm9K';
  let database = process.env.TIDB_DATABASE || 'test';

  if (database === 'sys') {
    database = 'test';
  }

  const connUrl = process.env.TIDB_DATABASE_URL || '';
  if (connUrl) {
    try {
      const fixedUrl = connUrl.replace(/^m+ysql:\/\//, 'mysql://');
      const parsed = new URL(fixedUrl);
      host = parsed.hostname || host;
      port = Number(parsed.port) || port;
      user = decodeURIComponent(parsed.username) || user;
      password = decodeURIComponent(parsed.password) || password;
      const pathDb = (parsed.pathname || '').replace(/^\//, '');
      if (pathDb && pathDb !== 'sys') database = pathDb;
    } catch (e) {
      console.warn('Aviso: Falha ao interpretar TIDB_DATABASE_URL, usando variáveis individuais.');
    }
  }

  return { host, port, user, password, database };
}

async function main() {
  console.log('='.repeat(70));
  console.log('  SEED/PR - MIGRAÇÃO E CARGA INICIAL DO TiDB SERVERLESS CLOUD');
  console.log('='.repeat(70));

  const config = getConfig();
  console.log(`\nConectando ao TiDB em: ${config.host}:${config.port}`);
  console.log(`Usuário: ${config.user} | Banco de dados: ${config.database}`);

  let conn;
  try {
    conn = await mysql.createConnection({
      host: config.host,
      port: config.port,
      user: config.user,
      password: config.password,
      database: config.database,
      ssl: {
        minVersion: 'TLSv1.2',
        rejectUnauthorized: true
      }
    });
    console.log('✓ Conectado ao TiDB Cloud com sucesso!\n');
  } catch (err) {
    console.error('❌ Erro de conexão com o TiDB:', err.message);
    process.exit(1);
  }

  try {
    // 1. Criar Tabelas
    console.log('[1/5] Executando DDL das tabelas (tidb/schema.sql)...');
    const schemaSql = fs.readFileSync(path.join(__dirname, 'tidb', 'schema.sql'), 'utf8');
    const cleanSql = schemaSql.replace(/--.*$/gm, '');
    const queries = cleanSql
      .split(';')
      .map(q => q.trim())
      .filter(q => q.length > 0);

    for (const q of queries) {
      await conn.query(q);
    }
    console.log('✓ Tabelas criadas/verificadas com sucesso!\n');

    // 2. Tutores
    console.log('[2/5] Populando tutores (src/tutores_fallback.json)...');
    const tutoresPath = path.join(__dirname, 'src', 'tutores_fallback.json');
    if (fs.existsSync(tutoresPath)) {
      const tutores = JSON.parse(fs.readFileSync(tutoresPath, 'utf8'));
      for (const t of tutores) {
        await conn.execute(`
          INSERT INTO tutores (tutor_responsavel, email_educ, email_adm, telefone, nre_tutor, email_nre)
          VALUES (?, ?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE email_educ = VALUES(email_educ), telefone = VALUES(telefone)
        `, [
          t.tutor_responsavel || null,
          t.email_educ || null,
          t.email_adm || null,
          t.telefone || null,
          t.nre_tutor || null,
          t.email_nre || null
        ]);
      }
      console.log(`✓ Tutores inseridos: ${tutores.length} registros.\n`);
    }

    // 3. Cursistas (em lotes de 200)
    console.log('[3/5] Populando cursistas (src/data_fallback.json - 4.451 registros)...');
    const cursistasPath = path.join(__dirname, 'src', 'data_fallback.json');
    if (fs.existsSync(cursistasPath)) {
      const cursistas = JSON.parse(fs.readFileSync(cursistasPath, 'utf8'));
      const batchSize = 200;
      let totalInseridos = 0;
      const seenCod = new Set();

      for (let i = 0; i < cursistas.length; i += batchSize) {
        const batch = cursistas.slice(i, i + batchSize);
        const placeholders = [];
        const values = [];

        for (let j = 0; j < batch.length; j++) {
          const r = batch[j];
          const realIdx = i + j;
          let cod = r.cod_cursista || (r.cgm ? `${r.cgm}_${r.turmas || ''}` : `CURS_${realIdx}`);
          if (seenCod.has(cod)) cod = `${cod}_${realIdx}`;
          seenCod.add(cod);

          placeholders.push('(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
          values.push(
            cod,
            r.cgm ? String(r.cgm) : null,
            r.nome_cursista || 'CURSISTA',
            r.email || r['e-mail'] || r.email_cursista || null,
            r.cpf_cursista || r.cpf || null,
            r.rg || null,
            r.telefone_cursista || null,
            r.modalidade || null,
            r.componente || null,
            r.turmas || r.turma || null,
            r.dia_da_semana || null,
            r.horario_inicial || null,
            r.horario_fim || null,
            r.turno || null,
            r.ano_formativo || null,
            r.nome_formador || null,
            r.cpf_formador || null,
            r.rg_formador || null,
            r.email_formador || r['e-mail_formador'] || null,
            r.telefone_formador || null,
            r.nre_formador || null,
            r.componente_formador || null,
            r.tutor_responsavel || null,
            r.email_tutor || null,
            r.telefone_tutor || null,
            r.nre_tutor || null,
            r.email_nre || r['e-mail_nre'] || null,
            r.link || r.link_classroom || r['Link Classroom'] || null,
            r.id_classroom || null,
            r.periodo_ini || null,
            r.chamamento || null,
            r.nre_exe || null,
            r.munic_exe || null,
            r.componente_conc || null,
            r.observacoes_cursista || null,
            r.observacoes_formador || null,
            r.observacoes_tutor || null,
            r.observacoes_turma || null
          );
        }

        const sql = `
          INSERT INTO cursistas (
            cod_cursista, cgm, nome_cursista, email, cpf_cursista, rg, telefone_cursista,
            modalidade, componente, turmas, dia_da_semana, horario_inicial, horario_fim,
            turno, ano_formativo, nome_formador, cpf_formador, rg_formador, email_formador,
            telefone_formador, nre_formador, componente_formador, tutor_responsavel,
            email_tutor, telefone_tutor, nre_tutor, email_nre, link, id_classroom,
            periodo_ini, chamamento, nre_exe, munic_exe, componente_conc,
            observacoes_cursista, observacoes_formador, observacoes_tutor, observacoes_turma
          ) VALUES ${placeholders.join(', ')}
          ON DUPLICATE KEY UPDATE nome_cursista = VALUES(nome_cursista), turmas = VALUES(turmas);
        `;

        await conn.query(sql, values);
        totalInseridos += batch.length;
        if (totalInseridos % 1000 === 0 || totalInseridos === cursistas.length) {
          console.log(`  -> Progresso cursistas: ${totalInseridos}/${cursistas.length}`);
        }
      }
      console.log(`✓ Cursistas inseridos: ${totalInseridos} registros.\n`);
    }

    // 4. Concluintes
    console.log('[4/5] Populando concluintes (src/concluintes_fallback.json)...');
    const concluintesPath = path.join(__dirname, 'src', 'concluintes_fallback.json');
    if (fs.existsSync(concluintesPath)) {
      await conn.query('TRUNCATE TABLE cursistas_concluintes');
      const concluintes = JSON.parse(fs.readFileSync(concluintesPath, 'utf8'));
      const batchSize = 200;
      let totalInseridos = 0;
      const seenCpf = new Set();

      for (let i = 0; i < concluintes.length; i += batchSize) {
        const batch = concluintes.slice(i, i + batchSize);
        const placeholders = [];
        const values = [];

        for (const r of batch) {
          const cpf = (r.cpf || '').trim();
          if (cpf && seenCpf.has(cpf)) continue;
          if (cpf) seenCpf.add(cpf);

          placeholders.push('(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
          values.push(
            r.cod_cursista || (cpf ? `CONC_${cpf}` : `CONC_${r.cgm || Math.random()}`),
            r.cgm ? String(r.cgm) : null,
            r.nome_cursista || 'CONCLUINTE',
            r.email || null,
            cpf || null,
            r.rg || null,
            r.chamamento || '1º Chamamento',
            r.ano_formativo || '1º ANO',
            r.modalidade || 'Docentes',
            r.componente || null,
            r.turmas || null,
            r.nre_exe || null,
            r.munic_exe || null,
            r.situacao || 'CONCLUÍDO',
            r.data_conclusao || null
          );
        }
            r.munic_exe || null,
            r.situacao || 'CONCLUÍDO',
            r.data_conclusao || null
          );
        }

        const sql = `
          INSERT INTO cursistas_concluintes (
            cod_cursista, cgm, nome_cursista, email, cpf, rg, chamamento,
            ano_formativo, modalidade, componente, turmas, nre_exe, munic_exe, situacao, data_conclusao
          ) VALUES ${placeholders.join(', ')}
          ON DUPLICATE KEY UPDATE situacao = VALUES(situacao);
        `;

        await conn.query(sql, values);
        totalInseridos += batch.length;
      }
      console.log(`✓ Concluintes inseridos: ${totalInseridos} registros.\n`);
    }

    // 5. Observações de Prática (em lotes de 200)
    console.log('[5/5] Populando observações (src/observacoes_fallback.json - 11.327 registros)...');
    const obsPath = path.join(__dirname, 'src', 'observacoes_fallback.json');
    if (fs.existsSync(obsPath)) {
      const observacoes = JSON.parse(fs.readFileSync(obsPath, 'utf8'));
      const batchSize = 200;
      let totalInseridos = 0;
      const seenIds = new Set();

      for (let i = 0; i < observacoes.length; i += batchSize) {
        const batch = observacoes.slice(i, i + batchSize);
        const placeholders = [];
        const values = [];

        for (let j = 0; j < batch.length; j++) {
          const o = batch[j];
          const realIdx = i + j;
          let idOrig = String(o.id_origem || o.id || `HIST_${realIdx + 1}`);
          if (seenIds.has(idOrig)) idOrig = `${idOrig}_${realIdx}`;
          seenIds.add(idOrig);

          placeholders.push('(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
          values.push(
            idOrig,
            o.carimbo || null,
            o.email_cursista || '',
            o.nome_cursista || '',
            o.email_formador || null,
            o.nome_formador || null,
            o.ano_formativo || null,
            o.semestre || null,
            o.modalidade || null,
            o.componente || null,
            o.tema || null,
            o.observacao_realizada || 'Sim',
            o.is_realizada !== false ? 1 : 0,
            o.data_pratica || o.data_implementacao || null,
            o.data_observacao || null,
            o.data_feedback || null,
            o.modalidade_feedback || null,
            o.link_gravacao_pratica || null,
            o.link_planejamento || null,
            o.link_gravacao_feedback || null,
            o.nivel_planejamento || null,
            o.nivel_pratica || null,
            o.questionamentos_propositivos || null,
            o.proposicoes_sugestoes || null,
            o.combinados || null,
            o.reflexoes_gerais || null
          );
        }

        const sql = `
          INSERT INTO observacoes_pratica (
            id_origem, carimbo, email_cursista, nome_cursista, email_formador, nome_formador,
            ano_formativo, semestre, modalidade, componente, tema, observacao_realizada,
            is_realizada, data_pratica, data_observacao, data_feedback, modalidade_feedback,
            link_gravacao_pratica, link_planejamento, link_gravacao_feedback, nivel_planejamento,
            nivel_pratica, questionamentos_propositivos, proposicoes_sugestoes, combinados, reflexoes_gerais
          ) VALUES ${placeholders.join(', ')}
          ON DUPLICATE KEY UPDATE nome_cursista = VALUES(nome_cursista);
        `;

        await conn.query(sql, values);
        totalInseridos += batch.length;
        if (totalInseridos % 2000 === 0 || totalInseridos === observacoes.length) {
          console.log(`  -> Progresso observações: ${totalInseridos}/${observacoes.length}`);
        }
      }
      console.log(`✓ Observações inseridas: ${totalInseridos} registros.\n`);
    }

    console.log('='.repeat(70));
    console.log('  🎉 CARGA COMPLETA DO TiDB SERVERLESS CONCLUÍDA COM SUCESSO!');
    console.log('='.repeat(70));
  } catch (err) {
    console.error('❌ Erro durante a execução da carga:', err);
  } finally {
    if (conn) await conn.end();
  }
}

main();
