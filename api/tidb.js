/**
 * Vercel Serverless Function - Conexão Segura com TiDB Serverless Cloud
 * SEED-PR - Estágio Probatório
 */

import mysql from 'mysql2/promise';

let pool = null;

function parseTiDBConfig() {
  let connUrl = process.env.TIDB_DATABASE_URL || process.env.DATABASE_URL || '';
  if (connUrl) {
    try {
      const fixedUrl = connUrl.replace(/^m+ysql:\/\//, 'mysql://');
      const parsed = new URL(fixedUrl);
      let db = (parsed.pathname || '').replace(/^\//, '') || 'test';
      if (db === 'sys') db = 'test';
      return {
        host: parsed.hostname,
        port: parsed.port || '4000',
        user: decodeURIComponent(parsed.username),
        password: decodeURIComponent(parsed.password),
        database: db
      };
    } catch (e) {
      console.warn('[TiDB] Falha ao analisar TIDB_DATABASE_URL:', e);
    }
  }

  let db = process.env.TIDB_DATABASE || 'test';
  if (db === 'sys') db = 'test';

  return {
    host: process.env.TIDB_HOST || 'gateway01.sa-east-1.prod.aws.tidbcloud.com',
    port: process.env.TIDB_PORT || '4000',
    user: process.env.TIDB_USER || '',
    password: process.env.TIDB_PASSWORD || '',
    database: db
  };
}

function formatMySqlTimestamp(val) {
  if (!val) return new Date().toISOString().slice(0, 19).replace('T', ' ');
  const str = String(val).trim();
  const brMatch = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?/);
  if (brMatch) {
    const day = brMatch[1].padStart(2, '0');
    const month = brMatch[2].padStart(2, '0');
    const year = brMatch[3];
    const hour = (brMatch[4] || '00').padStart(2, '0');
    const min = (brMatch[5] || '00').padStart(2, '0');
    const sec = (brMatch[6] || '00').padStart(2, '0');
    return `${year}-${month}-${day} ${hour}:${min}:${sec}`;
  }
  try {
    const d = new Date(str);
    if (!isNaN(d.getTime())) {
      return d.toISOString().slice(0, 19).replace('T', ' ');
    }
  } catch (e) {}
  return new Date().toISOString().slice(0, 19).replace('T', ' ');
}

// Normalizador Oficial para os 32 NREs do Paraná (Caixa alta, sem acento, sem cedilha)
function normalizeNre(nre) {
  if (!nre) return '';
  const s = String(nre)
    .trim()
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/^NRE\s*(DE|DO|DA)?\s*[-:]?\s*/, '')
    .replace(/[.\-_/]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!s) return '';
  if (s === 'AMN' || /METROP\w*\s*NORTE/.test(s)) return 'AREA METROPOLITANA NORTE';
  if (s === 'AMS' || /METROP\w*\s*SUL/.test(s)) return 'AREA METROPOLITANA SUL';
  if (/^ASSIS\s*CHAT/.test(s)) return 'ASSIS CHATEAUBRIAND';
  if (s === 'FOZ') return 'FOZ DO IGUACU';
  if (s === 'FRANCISCO BELTRAO' || s === 'BELTRAO') return 'FRANCISCO BELTRAO';
  if (s === 'UNIAO DA VITORIA' || s === 'UNIAO') return 'UNIAO DA VITORIA';
  if (s === 'WENCESLAU BRAZ' || s === 'WENCESLAU') return 'WENCESLAU BRAZ';
  if (s === 'CORNELIO PROCOPIO' || s === 'CORNELIO') return 'CORNELIO PROCOPIO';
  if (s === 'TELEMACO BORBA' || s === 'TELEMACO') return 'TELEMACO BORBA';
  return s;
}

function getPool() {
  if (!pool) {
    const config = parseTiDBConfig();
    if (!config.host || !config.user || !config.password) {
      throw new Error('Credenciais do TiDB não configuradas.');
    }
    pool = mysql.createPool({
      host: config.host,
      port: Number(config.port) || 4000,
      user: config.user,
      password: config.password,
      database: config.database,
      ssl: {
        minVersion: 'TLSv1.2',
        rejectUnauthorized: true
      },
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    });
  }
  return pool;
}

async function executeSql(sql, params = []) {
  const p = getPool();
  const [rows] = await p.query(sql, params);
  return rows;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const action = req.query.action || (req.body && req.body.action) || 'ping';

  try {
    if (action === 'ping' || action === 'test') {
      const result = await executeSql('SELECT 1 as connected, NOW() as server_time');
      return res.status(200).json({ status: 'ok', engine: 'TiDB Cloud Serverless', result });
    }

    if (action === 'bundle' || action === 'get_all') {
      const [cursistas, tutores, observacoes, concluintes, exonerados, movimentacoes, diario, intencoes, observacoesTutor] = await Promise.all([
        executeSql('SELECT * FROM cursistas ORDER BY nome_cursista ASC').catch(() => []),
        executeSql('SELECT * FROM tutores ORDER BY tutor_responsavel ASC').catch(() => []),
        executeSql('SELECT * FROM observacoes_pratica ORDER BY id DESC').catch(() => []),
        executeSql('SELECT * FROM cursistas_concluintes ORDER BY nome_cursista ASC').catch(() => []),
        executeSql('SELECT * FROM exonerados ORDER BY nome_cursista ASC').catch(() => []),
        executeSql('SELECT * FROM movimentacoes ORDER BY timestamp DESC LIMIT 5000').catch(() => []),
        executeSql('SELECT * FROM diario_formativo ORDER BY data_registro DESC LIMIT 500').catch(() => []),
        executeSql('SELECT * FROM intencao_matricula_2027 ORDER BY created_at DESC').catch(() => []),
        executeSql('SELECT * FROM observacoes_tutor ORDER BY id ASC').catch(() => [])
      ]);

      return res.status(200).json({
        status: 'success',
        source: 'TiDB Cloud Serverless',
        atualizado_em: new Date().toISOString(),
        total_cursistas: cursistas.length,
        baseCursistas: cursistas.map(r => ({
          ...r,
          nre_tutor: normalizeNre(r.nre_tutor),
          nre_formador: normalizeNre(r.nre_formador),
          nre_exe: normalizeNre(r.nre_exe)
        })),
        tutores: tutores.map(r => ({
          ...r,
          nre_tutor: normalizeNre(r.nre_tutor)
        })),
        observacoes: observacoes.map(r => ({
          ...r,
          nre: normalizeNre(r.nre),
          nre_exe: normalizeNre(r.nre_exe || r.nre)
        })),
        concluintes: concluintes.map(r => ({
          ...r,
          nre_exe: normalizeNre(r.nre_exe),
          nre: normalizeNre(r.nre)
        })),
        exonerados: exonerados.map(r => ({
          ...r,
          nre: normalizeNre(r.nre)
        })),
        movimentacoes: movimentacoes.map(r => ({
          ...r,
          nre: normalizeNre(r.nre)
        })),
        diario,
        intencoes2027: intencoes,
        observacoesTutor: observacoesTutor.map(r => {
          let rubrics = [];
          try {
            rubrics = typeof r.rubrics_json === 'string' ? JSON.parse(r.rubrics_json) : (r.rubrics_json || []);
          } catch(e) {}
          return {
            id: r.id_origem || `obs-tidb-${r.id}`,
            timestamp: r.timestamp ? formatMySqlTimestamp(r.timestamp) : '',
            tutorEmail: r.tutor_email || '',
            tutor: r.tutor || '',
            formador: r.formador || '',
            formadorEmail: r.formador_email || '',
            acaoAcompanhamento: r.acao_acompanhamento || '',
            acaoObservada: r.acao_observada || '',
            dataObservacao: r.data_observacao || '',
            linkAcaoObservada: r.link_acao_observada || '',
            dataFeedback: r.data_feedback || '',
            linkFeedback: r.link_feedback || '',
            linksComplementares: r.links_complementares || '',
            modalidade: r.modalidade || '',
            rubrics,
            avgScore: r.avg_score !== null && r.avg_score !== undefined ? Number(r.avg_score) : null,
            checklistRealizadas: r.checklist_realizadas || '',
            checklistNaoRealizadas: r.checklist_nao_realizadas || '',
            outrosRegistros: r.outros_registros || '',
            destaques: r.destaques || '',
            desenvolver: r.desenvolver || '',
            encaminhamentos: r.encaminhamentos || '',
            nre: normalizeNre(r.nre),
            tema: r.tema || ''
          };
        })
      });
    }

    if (action === 'normalize_nres_db') {
      const nreMapping = [
        { de: ['Área Metropolitana Norte', 'Area Metropolitana Norte', 'AMN', 'METROPOLITANA NORTE'], para: 'AREA METROPOLITANA NORTE' },
        { de: ['Área Metropolitana Sul', 'Area Metropolitana Sul', 'AMS', 'METROPOLITANA SUL'], para: 'AREA METROPOLITANA SUL' },
        { de: ['Cornélio Procópio', 'Cornelio Procopio', 'CORNÉLIO PROCÓPIO'], para: 'CORNELIO PROCOPIO' },
        { de: ['Dois Vizinhos', 'DOIS VIZINHOS'], para: 'DOIS VIZINHOS' },
        { de: ['Foz do Iguaçu', 'Foz do Iguacu', 'FOZ DO IGUAÇU', 'FOZ'], para: 'FOZ DO IGUACU' },
        { de: ['Francisco Beltrão', 'Francisco Beltrao', 'FRANCISCO BELTRÃO', 'BELTRAO'], para: 'FRANCISCO BELTRAO' },
        { de: ['Goioerê', 'Goioere', 'GOIOERÊ'], para: 'GOIOERE' },
        { de: ['Ivaiporã', 'Ivaipora', 'IVAIPORÃ'], para: 'IVAIPORA' },
        { de: ['Jacarezinho', 'JACAREZINHO'], para: 'JACAREZINHO' },
        { de: ['Maringá', 'Maringa', 'MARINGÁ'], para: 'MARINGA' },
        { de: ['Paranaguá', 'Paranagua', 'PARANAGUÁ'], para: 'PARANAGUA' },
        { de: ['Paranavaí', 'Paranavai', 'PARANAVAÍ'], para: 'PARANAVAI' },
        { de: ['Telêmaco Borba', 'Telemaco Borba', 'TELÊMACO BORBA'], para: 'TELEMACO BORBA' },
        { de: ['União da Vitória', 'Uniao da Vitoria', 'UNIÃO DA VITÓRIA'], para: 'UNIAO DA VITORIA' },
        { de: ['Wenceslau Braz', 'Wenceslau Braz', 'WENCESLAU BRAZ'], para: 'WENCESLAU BRAZ' },
        { de: ['Campo Mourão', 'Campo Mourao', 'CAMPO MOURÃO'], para: 'CAMPO MOURAO' }
      ];

      for (const m of nreMapping) {
        for (const antigo of m.de) {
          await executeSql("UPDATE cursistas SET nre_tutor = ? WHERE nre_tutor = ?", [m.para, antigo]).catch(() => {});
          await executeSql("UPDATE cursistas SET nre_formador = ? WHERE nre_formador = ?", [m.para, antigo]).catch(() => {});
          await executeSql("UPDATE cursistas SET nre_exe = ? WHERE nre_exe = ?", [m.para, antigo]).catch(() => {});
          await executeSql("UPDATE tutores SET nre_tutor = ? WHERE nre_tutor = ?", [m.para, antigo]).catch(() => {});
          await executeSql("UPDATE cursistas_concluintes SET nre_exe = ? WHERE nre_exe = ?", [m.para, antigo]).catch(() => {});
          await executeSql("UPDATE exonerados SET nre = ? WHERE nre = ?", [m.para, antigo]).catch(() => {});
          await executeSql("UPDATE movimentacoes SET nre = ? WHERE nre = ?", [m.para, antigo]).catch(() => {});
          await executeSql("UPDATE observacoes_tutor SET nre = ? WHERE nre = ?", [m.para, antigo]).catch(() => {});
          await executeSql("UPDATE observacoes_pratica SET nre = ? WHERE nre = ?", [m.para, antigo]).catch(() => {});
        }
      }

      // Passo genérico: qualquer variação restante (ex: 'AREA METROP.NORTE') é reescrita via normalizeNre
      const alvos = [
        ['cursistas', 'nre_tutor'], ['cursistas', 'nre_formador'], ['cursistas', 'nre_exe'],
        ['tutores', 'nre_tutor'], ['cursistas_concluintes', 'nre_exe'], ['cursistas_concluintes', 'nre'],
        ['exonerados', 'nre'], ['movimentacoes', 'nre'], ['observacoes_tutor', 'nre'],
        ['observacoes_pratica', 'nre'], ['observacoes_pratica', 'nre_exe']
      ];
      const alteracoes = [];
      for (const [tabela, coluna] of alvos) {
        const distintos = await executeSql(`SELECT DISTINCT \`${coluna}\` AS v FROM \`${tabela}\` WHERE \`${coluna}\` IS NOT NULL AND \`${coluna}\` <> ''`).catch(() => []);
        for (const { v } of distintos) {
          const novo = normalizeNre(v);
          if (novo && novo !== v) {
            await executeSql(`UPDATE \`${tabela}\` SET \`${coluna}\` = ? WHERE \`${coluna}\` = ?`, [novo, v]).catch(() => {});
            alteracoes.push(`${tabela}.${coluna}: '${v}' -> '${novo}'`);
          }
        }
      }

      // Limpeza de registros órfãos de trocas de turma antigas na tabela cursistas:
      // 1) Se o cursista (CGM) tem registro sem turma (ex: '7771203633_') e registro com turma, mescla os dados cadastrais e remove o registro vazio
      await executeSql(`
        UPDATE cursistas c_novo
        INNER JOIN cursistas c_vazio ON c_novo.cgm = c_vazio.cgm
        SET
          c_novo.chamamento = COALESCE(NULLIF(c_novo.chamamento, ''), c_vazio.chamamento),
          c_novo.rg = COALESCE(NULLIF(c_novo.rg, ''), c_vazio.rg),
          c_novo.telefone_cursista = COALESCE(NULLIF(c_novo.telefone_cursista, ''), c_vazio.telefone_cursista),
          c_novo.periodo_ini = COALESCE(NULLIF(c_novo.periodo_ini, ''), c_vazio.periodo_ini),
          c_novo.nre_exe = COALESCE(NULLIF(c_novo.nre_exe, ''), c_vazio.nre_exe)
        WHERE (c_vazio.turmas IS NULL OR c_vazio.turmas = '' OR c_vazio.turno IS NULL OR c_vazio.turno = '')
          AND c_novo.turmas IS NOT NULL AND c_novo.turmas <> ''
      `).catch(() => {});

      await executeSql(`
        DELETE FROM cursistas
        WHERE turmas IS NULL OR turmas = '' OR turno IS NULL OR turno = '' OR modalidade IS NULL OR modalidade = ''
      `).catch(() => {});

      // 2) Remove registros órfãos antigos (sem chamamento preenchido) quando o mesmo CGM já possui matrícula oficial com chamamento
      await executeSql(`
        DELETE c_orfao FROM cursistas c_orfao
        INNER JOIN cursistas c_oficial ON c_orfao.cgm = c_oficial.cgm
        WHERE (c_orfao.chamamento IS NULL OR c_orfao.chamamento = '' OR c_orfao.chamamento = '-')
          AND c_oficial.chamamento IS NOT NULL AND c_oficial.chamamento <> '' AND c_oficial.chamamento <> '-'
      `).catch(() => {});

      // 3) Para CGMs ainda sem chamamento que tiveram troca de turma entre 28/10 e 30/10, mantém apenas o vínculo mais recente (maior id)
      await executeSql(`
        DELETE c1 FROM cursistas c1
        INNER JOIN cursistas c2 ON c1.cgm = c2.cgm
        WHERE (c1.chamamento IS NULL OR c1.chamamento = '' OR c1.chamamento = '-')
          AND (c2.chamamento IS NULL OR c2.chamamento = '' OR c2.chamamento = '-')
          AND c1.id < c2.id
      `).catch(() => {});

      return res.status(200).json({ status: 'success', message: 'NREs normalizados e vínculos órfãos limpos com sucesso!', alteracoes });
    }

    if (action === 'sync_cursistas_bulk') {
      const items = req.body.cursistas || req.body.data || [];
      if (!Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ error: 'Nenhum cursista fornecido.' });
      }

      const shouldTruncate = req.body.truncate === true || req.body.batch_index === 0;
      if (shouldTruncate) {
        await executeSql('TRUNCATE TABLE cursistas').catch(() => {});
      }

      const batchSize = 100;
      let total = 0;
      for (let i = 0; i < items.length; i += batchSize) {
        const batch = items.slice(i, i + batchSize);
        const placeholders = [];
        const values = [];

        for (let j = 0; j < batch.length; j++) {
          const r = batch[j];
          let cod = r.cod_cursista || (r.cgm ? `${r.cgm}_${r.turmas || ''}` : `CURS_${Date.now()}_${i + j}`);
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
          ON DUPLICATE KEY UPDATE
            nome_cursista = VALUES(nome_cursista),
            cgm = VALUES(cgm),
            email = VALUES(email),
            turmas = VALUES(turmas),
            modalidade = VALUES(modalidade),
            componente = VALUES(componente),
            horario_inicial = VALUES(horario_inicial),
            horario_fim = VALUES(horario_fim),
            turno = VALUES(turno),
            nome_formador = VALUES(nome_formador),
            email_formador = VALUES(email_formador),
            tutor_responsavel = VALUES(tutor_responsavel),
            email_tutor = VALUES(email_tutor)
        `;

        await executeSql(sql, values);
        total += batch.length;
      }
      return res.status(200).json({ status: 'success', total_cursistas_sincronizados: total });
    }

    if (action === 'sync_observacoes_bulk') {
      const items = req.body.observacoes || req.body.data || [];
      if (!Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ error: 'Nenhuma observação fornecida.' });
      }

      await executeSql('ALTER TABLE observacoes_pratica ADD COLUMN IF NOT EXISTS quem_observou VARCHAR(50)').catch(() => {});
      await executeSql('ALTER TABLE observacoes_pratica ADD COLUMN IF NOT EXISTS tutor_tecnico_observador TEXT').catch(() => {});
      await executeSql('ALTER TABLE observacoes_pratica ADD COLUMN IF NOT EXISTS proposta_pedagogica TEXT').catch(() => {});

      const shouldTruncate = req.body.truncate === true || req.body.batch_index === 0;
      if (shouldTruncate) {
        await executeSql('TRUNCATE TABLE observacoes_pratica').catch(() => {});
      }

      const batchSize = 100;
      let total = 0;
      for (let i = 0; i < items.length; i += batchSize) {
        const batch = items.slice(i, i + batchSize);
        const placeholders = [];
        const values = [];

        for (let j = 0; j < batch.length; j++) {
          const o = batch[j];
          let idOrig = String(o.id_origem || o.id || `OBS_${Date.now()}_${i + j}`);
          placeholders.push('(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
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
            o.is_realizada !== false && o.is_realizada !== 0 ? 1 : 0,
            o.data_pratica || o.data_implementacao || null,
            o.data_observacao || null,
            o.data_feedback || null,
            o.modalidade_feedback || null,
            o.motivo_devolutiva || null,
            o.link_gravacao_pratica || null,
            o.link_planejamento || o.link_pdp || null,
            o.link_pdp || o.link_planejamento || null,
            o.proposta_pedagogica || o.proposta || null,
            o.link_gravacao_feedback || null,
            o.nivel_planejamento || null,
            o.nivel_pratica || null,
            o.questionamentos_propositivos || null,
            o.proposicoes_sugestoes || null,
            o.combinados || null,
            o.quem_observou || (o.tutor_tecnico_observador ? 'Tutor/Técnico' : 'Formador'),
            o.tutor_tecnico_observador || null
          );
        }

        const sql = `
          INSERT INTO observacoes_pratica (
            id_origem, carimbo, email_cursista, nome_cursista, email_formador, nome_formador,
            ano_formativo, semestre, modalidade, componente, tema, observacao_realizada,
            is_realizada, data_pratica, data_observacao, data_feedback, modalidade_feedback,
            motivo_devolutiva, link_gravacao_pratica, link_planejamento, link_pdp, proposta_pedagogica,
            link_gravacao_feedback, nivel_planejamento, nivel_pratica, questionamentos_propositivos,
            proposicoes_sugestoes, combinados, quem_observou, tutor_tecnico_observador
          ) VALUES ${placeholders.join(', ')}
          ON DUPLICATE KEY UPDATE
            nome_cursista = VALUES(nome_cursista),
            nome_formador = VALUES(nome_formador),
            email_formador = VALUES(email_formador),
            data_pratica = VALUES(data_pratica),
            data_feedback = VALUES(data_feedback),
            nivel_planejamento = VALUES(nivel_planejamento),
            nivel_pratica = VALUES(nivel_pratica),
            tema = VALUES(tema),
            proposta_pedagogica = VALUES(proposta_pedagogica),
            quem_observou = VALUES(quem_observou),
            tutor_tecnico_observador = VALUES(tutor_tecnico_observador)
        `;

        await executeSql(sql, values);
        total += batch.length;
      }
      return res.status(200).json({ status: 'success', total_observacoes_sincronizadas: total });
    }

    if (action === 'sync_concluintes_bulk') {
      const items = req.body.concluintes || req.body.data || [];
      if (!Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ error: 'Nenhum concluinte fornecido.' });
      }

      // Trunca apenas se for explicitamente solicitado ou se for o primeiro lote
      const shouldTruncate = req.body.truncate === true || req.body.batch_index === 0;
      if (shouldTruncate) {
        await executeSql('TRUNCATE TABLE cursistas_concluintes');
      }

      const batchSize = 100;
      let total = 0;
      const seenCpf = new Set();

      for (let i = 0; i < items.length; i += batchSize) {
        const batch = items.slice(i, i + batchSize);
        const placeholders = [];
        const values = [];

        for (let j = 0; j < batch.length; j++) {
          const r = batch[j];
          const cpf = (r.cpf || '').trim();
          if (cpf && seenCpf.has(cpf)) continue;
          if (cpf) seenCpf.add(cpf);

          placeholders.push('(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
          values.push(
            r.cod_cursista || (cpf ? `CONC_${cpf}` : `CONC_${Date.now()}_${i + j}`),
            r.cgm ? String(r.cgm) : null,
            r.nome_cursista || 'CONCLUINTE',
            r.email || r['e-mail'] || null,
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

        if (placeholders.length > 0) {
          const sql = `
            INSERT INTO cursistas_concluintes (
              cod_cursista, cgm, nome_cursista, email, cpf, rg, chamamento,
              ano_formativo, modalidade, componente, turmas, nre_exe, munic_exe, situacao, data_conclusao
            ) VALUES ${placeholders.join(', ')}
            ON DUPLICATE KEY UPDATE
              nome_cursista = VALUES(nome_cursista),
              situacao = VALUES(situacao)
          `;
          await executeSql(sql, values);
          total += placeholders.length;
        }
      }
      return res.status(200).json({ status: 'success', total_concluintes_sincronizados: total });
    }

    if (action === 'sync_exonerados_bulk') {
      const items = req.body.exonerados || req.body.data || [];
      if (!Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ error: 'Nenhum exonerado fornecido.' });
      }

      await executeSql('ALTER TABLE exonerados ADD COLUMN IF NOT EXISTS cargo VARCHAR(100)').catch(() => {});
      await executeSql('ALTER TABLE exonerados ADD COLUMN IF NOT EXISTS disciplina VARCHAR(100)').catch(() => {});
      await executeSql('ALTER TABLE exonerados ADD COLUMN IF NOT EXISTS chamamento VARCHAR(100)').catch(() => {});
      await executeSql('ALTER TABLE exonerados ADD COLUMN IF NOT EXISTS status VARCHAR(255)').catch(() => {});

      const shouldTruncate = req.body.truncate === true || req.body.batch_index === 0;
      if (shouldTruncate) {
        await executeSql('TRUNCATE TABLE exonerados');
      }

      const batchSize = 100;
      let total = 0;

      for (let i = 0; i < items.length; i += batchSize) {
        const batch = items.slice(i, i + batchSize);
        const placeholders = [];
        const values = [];

        for (let j = 0; j < batch.length; j++) {
          const r = batch[j];
          const cargo = r.cargo || r.modalidade || null;
          const disciplina = r.disciplina || r.componente || null;
          const chamamento = r.chamamento || null;
          const status = r.status || r.motivo || null;

          placeholders.push('(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
          values.push(
            r.cgm ? String(r.cgm) : null,
            r.cpf || null,
            r.rg || null,
            r.nome_cursista || r.nome || 'EXONERADO',
            r.email || r['e-mail'] || null,
            status,
            r.portaria || null,
            r.data_exoneracao || r.data || null,
            r.nre || null,
            r.municipio || r.munic || null,
            r.escola || null,
            disciplina,
            r.observacoes || null,
            cargo,
            disciplina,
            chamamento,
          );
          values.push(status);
        }

        if (placeholders.length > 0) {
          // 17 colunas: cgm, cpf, rg, nome_cursista, email, motivo, portaria, data_exoneracao, nre, municipio, escola, componente, observacoes, cargo, disciplina, chamamento, status
          const rowPlaceholders = batch.map(() => '(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').join(', ');
          const sql = `
            INSERT INTO exonerados (
              cgm, cpf, rg, nome_cursista, email, motivo, portaria,
              data_exoneracao, nre, municipio, escola, componente, observacoes,
              cargo, disciplina, chamamento, status
            ) VALUES ${rowPlaceholders}
          `;
          await executeSql(sql, values);
          total += batch.length;
        }
      }
      return res.status(200).json({ status: 'success', total_exonerados_sincronizados: total });
    }

    if (action === 'sync_nao_concluintes_bulk') {
      const items = req.body.nao_concluintes || req.body.data || [];
      if (!Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ error: 'Nenhum cursista não concluinte fornecido.' });
      }

      await executeSql(`
        CREATE TABLE IF NOT EXISTS cursistas_nao_concluintes (
          id BIGINT AUTO_INCREMENT PRIMARY KEY,
          nome_cursista VARCHAR(255),
          email VARCHAR(255),
          modalidade VARCHAR(100),
          componente VARCHAR(150),
          chamamento VARCHAR(100),
          motivo TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          INDEX idx_nc_email (email)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `).catch(() => {});

      const shouldTruncate = req.body.truncate === true || req.body.batch_index === 0;
      if (shouldTruncate) {
        await executeSql('TRUNCATE TABLE cursistas_nao_concluintes').catch(() => {});
      }

      const batchSize = 100;
      let total = 0;
      for (let i = 0; i < items.length; i += batchSize) {
        const batch = items.slice(i, i + batchSize);
        const placeholders = [];
        const values = [];

        for (let j = 0; j < batch.length; j++) {
          const r = batch[j];
          placeholders.push('(?, ?, ?, ?, ?, ?)');
          values.push(
            r.nome_cursista || r.nome || '',
            r.email || r['e-mail'] || null,
            r.modalidade || null,
            r.componente || null,
            r.chamamento || null,
            r.motivo || null
          );
        }

        if (placeholders.length > 0) {
          const sql = `
            INSERT INTO cursistas_nao_concluintes (
              nome_cursista, email, modalidade, componente, chamamento, motivo
            ) VALUES ${placeholders.join(', ')}
          `;
          await executeSql(sql, values);
          total += placeholders.length;
        }
      }
      return res.status(200).json({ status: 'success', total_nao_concluintes_sincronizados: total });
    }

    if (action === 'sync_movimentacoes_bulk') {
      const items = req.body.movimentacoes || req.body.data || [];
      if (!Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ error: 'Nenhuma movimentação fornecida.' });
      }

      const shouldTruncate = req.body.truncate === true;
      if (shouldTruncate) {
        await executeSql('TRUNCATE TABLE movimentacoes');
      }

      const batchSize = 100;
      let total = 0;

      for (let i = 0; i < items.length; i += batchSize) {
        const batch = items.slice(i, i + batchSize);
        const placeholders = [];
        const values = [];

        for (let j = 0; j < batch.length; j++) {
          const m = batch[j];
          const movId = m.id || `MOV_${Date.now()}_${i + j}`;

          placeholders.push('(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
          values.push(
            movId,
            formatMySqlTimestamp(m.timestamp),
            m.cgm ? String(m.cgm) : null,
            m.nome_cursista || '',
            m.email || m.emailCursista || null,
            m.nre || null,
            m.tutor || null,
            m.tutor_responsavel || null,
            m.email_tutor_responsavel || null,
            m.turma_anterior || null,
            m.turma_nova || null,
            m.tipo_acao || 'Solicitação',
            m.motivo || null,
            m.situacao_relacionada || null,
            m.ano_formacao || null,
            m.chamamento || null,
            m.modalidade_detalhes || null,
            m.turma_detalhes || null,
            m.justificativa || null,
            m.descricao || null,
            m.comprovante || null,
            m.status || 'Pendente',
            m.nota_resolucao || null,
            m.solicitadoPor || 'Google Forms'
          );
        }

        if (placeholders.length > 0) {
          const sql = `
            INSERT INTO movimentacoes (
              id, timestamp, cgm, nome_cursista, email, nre, tutor, tutor_responsavel,
              email_tutor_responsavel, turma_anterior, turma_nova, tipo_acao, motivo,
              situacao_relacionada, ano_formacao, chamamento, modalidade_detalhes,
              turma_detalhes, justificativa, descricao, comprovante, status, nota_resolucao, solicitadoPor
            ) VALUES ${placeholders.join(', ')}
            ON DUPLICATE KEY UPDATE
              status = VALUES(status),
              turma_anterior = VALUES(turma_anterior),
              turma_nova = VALUES(turma_nova),
              nota_resolucao = VALUES(nota_resolucao),
              justificativa = VALUES(justificativa)
          `;
          await executeSql(sql, values);
          total += placeholders.length;
        }
      }
      return res.status(200).json({ status: 'success', total_movimentacoes_sincronizadas: total });
    }

    if (action === 'sync_tutores_bulk') {
      const items = req.body.tutores || req.body.data || [];
      if (!Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ error: 'Nenhum tutor fornecido.' });
      }

      const shouldTruncate = req.body.truncate === true || req.body.batch_index === 0;
      if (shouldTruncate) {
        await executeSql('TRUNCATE TABLE tutores');
      }

      const batchSize = 100;
      let total = 0;
      for (let i = 0; i < items.length; i += batchSize) {
        const batch = items.slice(i, i + batchSize);
        const placeholders = [];
        const values = [];

        for (const t of batch) {
          placeholders.push('(?, ?, ?, ?, ?, ?)');
          values.push(
            t.tutor_responsavel || null,
            t.email_educ || null,
            t.email_adm || null,
            t.telefone || null,
            t.nre_tutor || null,
            t.email_nre || null
          );
        }

        if (placeholders.length > 0) {
          const sql = `
            INSERT INTO tutores (tutor_responsavel, email_educ, email_adm, telefone, nre_tutor, email_nre)
            VALUES ${placeholders.join(', ')}
          `;
          await executeSql(sql, values);
          total += placeholders.length;
        }
      }
      return res.status(200).json({ status: 'success', total_tutores_sincronizados: total });
    }

    if (action === 'get_observacoes_tutor') {
      const rows = await executeSql('SELECT * FROM observacoes_tutor ORDER BY id ASC').catch(() => []);
      const formatted = rows.map(r => {
        let rubrics = [];
        try {
          rubrics = typeof r.rubrics_json === 'string' ? JSON.parse(r.rubrics_json) : (r.rubrics_json || []);
        } catch(e) {}
        return {
          id: r.id_origem || `obs-tidb-${r.id}`,
          timestamp: r.timestamp ? formatMySqlTimestamp(r.timestamp) : '',
          tutorEmail: r.tutor_email || '',
          tutor: r.tutor || '',
          formador: r.formador || '',
          formadorEmail: r.formador_email || '',
          acaoAcompanhamento: r.acao_acompanhamento || '',
          acaoObservada: r.acao_observada || '',
          dataObservacao: r.data_observacao || '',
          linkAcaoObservada: r.link_acao_observada || '',
          dataFeedback: r.data_feedback || '',
          linkFeedback: r.link_feedback || '',
          linksComplementares: r.links_complementares || '',
          modalidade: r.modalidade || '',
          rubrics,
          avgScore: r.avg_score !== null && r.avg_score !== undefined ? Number(r.avg_score) : null,
          checklistRealizadas: r.checklist_realizadas || '',
          checklistNaoRealizadas: r.checklist_nao_realizadas || '',
          outrosRegistros: r.outros_registros || '',
          destaques: r.destaques || '',
          desenvolver: r.desenvolver || '',
          encaminhamentos: r.encaminhamentos || '',
          nre: r.nre || '',
          tema: r.tema || ''
        };
      });
      return res.status(200).json({ status: 'success', total: formatted.length, observacoes: formatted });
    }

    if (action === 'sync_observacoes_tutor_bulk') {
      const items = req.body.observacoes || req.body.data || [];
      if (!Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ error: 'Nenhuma observação de tutoria fornecida.' });
      }

      await executeSql(`
        CREATE TABLE IF NOT EXISTS observacoes_tutor (
          id INT AUTO_INCREMENT PRIMARY KEY,
          id_origem VARCHAR(100) UNIQUE,
          timestamp DATETIME,
          tutor_email VARCHAR(255),
          tutor VARCHAR(255),
          formador VARCHAR(255),
          formador_email VARCHAR(255),
          acao_acompanhamento VARCHAR(255),
          acao_observada VARCHAR(255),
          data_observacao VARCHAR(50),
          link_acao_observada TEXT,
          data_feedback VARCHAR(50),
          link_feedback TEXT,
          links_complementares TEXT,
          modalidade VARCHAR(100),
          avg_score DECIMAL(3,2),
          checklist_realizadas TEXT,
          checklist_nao_realizadas TEXT,
          outros_registros TEXT,
          destaques TEXT,
          desenvolver TEXT,
          encaminhamentos TEXT,
          nre VARCHAR(100),
          tema VARCHAR(255),
          rubrics_json JSON,
          INDEX idx_tutor (tutor),
          INDEX idx_formador (formador),
          INDEX idx_modalidade (modalidade)
        )
      `).catch(err => console.warn('[TiDB] Criar observacoes_tutor:', err.message));

      if (req.body.truncate === true || req.body.batch_index === 0) {
        await executeSql('TRUNCATE TABLE observacoes_tutor').catch(() => {});
      }

      const batchSize = 100;
      let total = 0;
      for (let i = 0; i < items.length; i += batchSize) {
        const batch = items.slice(i, i + batchSize);
        const placeholders = [];
        const values = [];

        for (let j = 0; j < batch.length; j++) {
          const o = batch[j];
          let idOrig = String(o.id || o.id_origem || `OBS_TUT_${i + j}`);
          placeholders.push('(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
          values.push(
            idOrig,
            formatMySqlTimestamp(o.timestamp),
            o.tutorEmail || o.tutor_email || null,
            o.tutor || null,
            o.formador || null,
            o.formadorEmail || o.formador_email || null,
            o.acaoAcompanhamento || o.acao_acompanhamento || null,
            o.acaoObservada || o.acao_observada || null,
            o.dataObservacao || o.data_observacao || null,
            o.linkAcaoObservada || o.link_acao_observada || null,
            o.dataFeedback || o.data_feedback || null,
            o.linkFeedback || o.link_feedback || null,
            o.linksComplementares || o.links_complementares || null,
            o.modalidade || null,
            o.avgScore !== null && o.avgScore !== undefined && !isNaN(o.avgScore) ? Number(o.avgScore) : null,
            o.checklistRealizadas || o.checklist_realizadas || null,
            o.checklistNaoRealizadas || o.checklist_nao_realizadas || null,
            o.outrosRegistros || o.outros_registros || null,
            o.destaques || null,
            o.desenvolver || null,
            o.encaminhamentos || null,
            o.nre || null,
            o.tema || null,
            JSON.stringify(o.rubrics || [])
          );
        }

        if (placeholders.length > 0) {
          const sql = `
            INSERT INTO observacoes_tutor (
              id_origem, timestamp, tutor_email, tutor, formador, formador_email,
              acao_acompanhamento, acao_observada, data_observacao, link_acao_observada,
              data_feedback, link_feedback, links_complementares, modalidade, avg_score,
              checklist_realizadas, checklist_nao_realizadas, outros_registros, destaques,
              desenvolver, encaminhamentos, nre, tema, rubrics_json
            ) VALUES ${placeholders.join(', ')}
            ON DUPLICATE KEY UPDATE
              tutor = VALUES(tutor),
              formador = VALUES(formador),
              modalidade = VALUES(modalidade),
              avg_score = VALUES(avg_score),
              destaques = VALUES(destaques),
              desenvolver = VALUES(desenvolver),
              encaminhamentos = VALUES(encaminhamentos)
          `;
          await executeSql(sql, values);
          total += placeholders.length;
        }
      }
      return res.status(200).json({ status: 'success', total_observacoes_tutor_sincronizadas: total });
    }

    if (action === 'insert_observacao') {
      const d = req.body.data;
      if (!d || !d.email_cursista) {
        return res.status(400).json({ error: 'Dados da observação incompletos.' });
      }

      const idOrigem = d.id_origem || `OBS_${Date.now()}`;
      const sql = `
        INSERT INTO observacoes_pratica (
          id_origem, carimbo, email_cursista, nome_cursista, email_formador, nome_formador,
          ano_formativo, semestre, chamamento, modalidade, componente, tema,
          observacao_realizada, is_realizada, data_pratica, data_observacao, data_feedback,
          modalidade_feedback, motivo_devolutiva, link_gravacao_pratica, link_planejamento,
          link_pdp, proposta_pedagogica, link_gravacao_feedback, nivel_planejamento,
          nivel_pratica, evidencias_planejamento, evidencias_pratica, criterio1_nivel,
          criterio1_evidencias, criterio2_nivel, criterio2_evidencias, escala_boas_praticas,
          etapas_nao_realizadas, justificativa_etapas, questionamentos_propositivos,
          proposicoes_sugestoes, combinados, justificativa_nao_realizada
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          nome_cursista = VALUES(nome_cursista),
          tema = VALUES(tema),
          observacao_realizada = VALUES(observacao_realizada),
          is_realizada = VALUES(is_realizada),
          data_pratica = VALUES(data_pratica),
          data_feedback = VALUES(data_feedback),
          nivel_planejamento = VALUES(nivel_planejamento),
          nivel_pratica = VALUES(nivel_pratica)
      `;

      const params = [
        idOrigem,
        d.carimbo || new Date().toLocaleString('pt-BR'),
        d.email_cursista,
        d.nome_cursista || '',
        d.email_formador || null,
        d.nome_formador || null,
        d.ano_formativo || null,
        d.semestre || null,
        d.chamamento || null,
        d.modalidade || null,
        d.componente || null,
        d.tema || null,
        d.observacao_realizada || 'Sim',
        d.is_realizada !== false ? 1 : 0,
        d.data_pratica || d.data_implementacao || null,
        d.data_observacao || null,
        d.data_feedback || null,
        d.modalidade_feedback || null,
        d.motivo_devolutiva || null,
        d.link_gravacao_pratica || null,
        d.link_planejamento || null,
        d.link_pdp || null,
        d.proposta_pedagogica || null,
        d.link_gravacao_feedback || null,
        d.nivel_planejamento || null,
        d.nivel_pratica || null,
        d.evidencias_planejamento || null,
        d.evidencias_pratica || null,
        d.criterio1_nivel || null,
        d.criterio1_evidencias || null,
        d.criterio2_nivel || null,
        d.criterio2_evidencias || null,
        d.escala_boas_praticas || null,
        d.etapas_nao_realizadas_str || null,
        d.justificativa_etapas || null,
        d.questionamentos_propositivos || null,
        d.proposicoes_sugestoes || null,
        d.combinados || null,
        d.justificativa_nao_realizada || null
      ];

      await executeSql(sql, params);
      return res.status(200).json({ status: 'success', id_origem: idOrigem });
    }

    if (action === 'update_cursista') {
      const d = req.body.data;
      if (!d) return res.status(400).json({ error: 'Dados do cursista ausentes.' });

      const cod = d.cod_cursista || (d.cgm ? `${d.cgm}_${d.turmas || ''}` : `CURS_${Date.now()}`);
      const sql = `
        INSERT INTO cursistas (
          cod_cursista, cgm, nome_cursista, email, cpf_cursista, rg, telefone_cursista,
          modalidade, componente, turmas, dia_da_semana, horario_inicial, horario_fim,
          turno, ano_formativo, nome_formador, cpf_formador, rg_formador, email_formador,
          telefone_formador, nre_formador, componente_formador, tutor_responsavel,
          email_tutor, telefone_tutor, nre_tutor, email_nre, link, id_classroom,
          periodo_ini, chamamento, nre_exe, munic_exe, componente_conc,
          observacoes_cursista, observacoes_formador, observacoes_tutor, observacoes_turma
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          nome_cursista = VALUES(nome_cursista),
          cgm = VALUES(cgm),
          email = VALUES(email),
          turmas = VALUES(turmas),
          modalidade = VALUES(modalidade),
          componente = VALUES(componente),
          horario_inicial = VALUES(horario_inicial),
          horario_fim = VALUES(horario_fim),
          turno = VALUES(turno),
          nome_formador = VALUES(nome_formador),
          email_formador = VALUES(email_formador),
          tutor_responsavel = VALUES(tutor_responsavel),
          email_tutor = VALUES(email_tutor),
          observacoes_cursista = VALUES(observacoes_cursista),
          observacoes_formador = VALUES(observacoes_formador),
          observacoes_tutor = VALUES(observacoes_tutor)
      `;

      const params = [
        cod,
        d.cgm ? String(d.cgm) : null,
        d.nome_cursista || 'CURSISTA',
        d.email || d['e-mail'] || d.email_cursista || null,
        d.cpf_cursista || d.cpf || null,
        d.rg || null,
        d.telefone_cursista || null,
        d.modalidade || null,
        d.componente || null,
        d.turmas || d.turma || null,
        d.dia_da_semana || null,
        d.horario_inicial || null,
        d.horario_fim || null,
        d.turno || null,
        d.ano_formativo || null,
        d.nome_formador || null,
        d.cpf_formador || null,
        d.rg_formador || null,
        d.email_formador || d['e-mail_formador'] || null,
        d.telefone_formador || null,
        d.nre_formador || null,
        d.componente_formador || null,
        d.tutor_responsavel || null,
        d.email_tutor || null,
        d.telefone_tutor || null,
        d.nre_tutor || null,
        d.email_nre || d['e-mail_nre'] || null,
        d.link || d.link_classroom || null,
        d.id_classroom || null,
        d.periodo_ini || null,
        d.chamamento || null,
        d.nre_exe || null,
        d.munic_exe || null,
        d.componente_conc || null,
        d.observacoes_cursista || null,
        d.observacoes_formador || null,
        d.observacoes_tutor || null,
        d.observacoes_turma || null
      ];

      await executeSql(sql, params);
      return res.status(200).json({ status: 'success', cod_cursista: cod });
    }

    if (action === 'delete_cursista') {
      const { cgm, cod_cursista } = req.body;
      if (cod_cursista) {
        await executeSql('DELETE FROM cursistas WHERE cod_cursista = ?', [cod_cursista]);
      } else if (cgm) {
        await executeSql('DELETE FROM cursistas WHERE cgm = ?', [String(cgm)]);
      }
      return res.status(200).json({ status: 'success' });
    }

    if (action === 'insert_movimentacao') {
      const m = req.body.data;
      if (!m) return res.status(400).json({ error: 'Dados da movimentação ausentes.' });

      const movId = m.id || `MOV_${Date.now()}`;
      const sql = `
        INSERT INTO movimentacoes (
          id, timestamp, cgm, nome_cursista, email, nre, tutor, tutor_responsavel,
          email_tutor_responsavel, turma_anterior, turma_nova, tipo_acao, motivo,
          situacao_relacionada, ano_formacao, chamamento, modalidade_detalhes,
          turma_detalhes, justificativa, descricao, comprovante, status, nota_resolucao, solicitadoPor
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      const params = [
        movId,
        formatMySqlTimestamp(m.timestamp),
        m.cgm ? String(m.cgm) : null,
        m.nome_cursista || '',
        m.email || m.emailCursista || null,
        m.nre || null,
        m.tutor || null,
        m.tutor_responsavel || null,
        m.email_tutor_responsavel || null,
        m.turma_anterior || null,
        m.turma_nova || null,
        m.tipo_acao || 'Solicitação',
        m.motivo || null,
        m.situacao_relacionada || null,
        m.ano_formacao || null,
        m.chamamento || null,
        m.modalidade_detalhes || null,
        m.turma_detalhes || null,
        m.justificativa || null,
        m.descricao || null,
        m.comprovante || null,
        m.status || 'Pendente',
        m.nota_resolucao || null,
        m.solicitadoPor || 'Sistema'
      ];

      await executeSql(sql, params);
      return res.status(200).json({ status: 'success', id: movId });
    }

    if (action === 'update_movimentacao') {
      const { id, status, nota_resolucao } = req.body;
      if (!id) return res.status(400).json({ error: 'ID da movimentação obrigatório.' });

      await executeSql(
        'UPDATE movimentacoes SET status = ?, nota_resolucao = ? WHERE id = ?',
        [status || 'Resolvido', nota_resolucao || '', id]
      );
      return res.status(200).json({ status: 'success' });
    }

    if (action === 'delete_movimentacao') {
      const { id } = req.body;
      if (!id) return res.status(400).json({ error: 'ID da movimentação obrigatório.' });

      await executeSql('DELETE FROM movimentacoes WHERE id = ?', [id]);
      return res.status(200).json({ status: 'success' });
    }

    if (action === 'insert_diario') {
      const d = req.body.data;
      if (!d) return res.status(400).json({ error: 'Dados do diário ausentes.' });

      const sql = `
        INSERT INTO diario_formativo (
          email_autor, nome_autor, papel_autor, turma, cgm_cursista, nome_cursista,
          titulo, conteudo, categoria, visibilidade
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      const params = [
        d.email_autor || null,
        d.nome_autor || null,
        d.papel_autor || null,
        d.turma || null,
        d.cgm_cursista || null,
        d.nome_cursista || null,
        d.titulo || 'Registro Formativo',
        d.conteudo || '',
        d.categoria || 'Geral',
        d.visibilidade || 'publico'
      ];

      await executeSql(sql, params);
      return res.status(200).json({ status: 'success' });
    }

    if (action === 'insert_intencao') {
      const item = req.body.data;
      if (!item) return res.status(400).json({ error: 'Dados da intenção ausentes.' });

      const sql = `
        INSERT INTO intencao_matricula_2027 (
          cgm, nome_cursista, email, componente, opcao_turno, opcao_modalidade, observacao
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `;
      const params = [
        item.cgm ? String(item.cgm) : null,
        item.nome_cursista || '',
        item.email || null,
        item.componente || null,
        item.opcao_turno || null,
        item.opcao_modalidade || null,
        item.observacao || null
      ];

      await executeSql(sql, params);
      return res.status(200).json({ status: 'success' });
    }

    return res.status(400).json({ error: `Ação desconhecida: ${action}` });

  } catch (err) {
    console.error(`[TiDB API Error] action=${action}:`, err);
    return res.status(500).json({
      error: err.message || 'Erro ao processar requisição no TiDB.',
      action
    });
  }
}
