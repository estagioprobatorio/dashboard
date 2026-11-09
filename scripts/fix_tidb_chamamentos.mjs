import fs from 'fs';
import mysql from 'mysql2/promise';

function dataToChamamento(dateStr) {
  if (!dateStr) return null;
  const s = String(dateStr).trim();
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (!m) return null;
  const dia = parseInt(m[1], 10);
  const mes = parseInt(m[2], 10);
  const ano = parseInt(m[3], 10);

  if (ano <= 2024) {
    return (ano === 2024 && mes <= 2) ? '1º Chamamento' : '2º Chamamento';
  }
  if (ano === 2025) {
    return mes <= 5 ? '3º Chamamento' : '4º Chamamento';
  }
  if (ano >= 2026) {
    return mes <= 5 ? '5º Chamamento' : '6º Chamamento';
  }
  return null;
}

async function main() {
  const conn = await mysql.createConnection({
    host: 'gateway01.sa-east-1.prod.aws.tidbcloud.com',
    port: 4000,
    user: '2qQCGoHbFUft6ad.root',
    password: 'rupB6CCFDb1GqRln',
    database: 'estagio_probatorio',
    ssl: { minVersion: 'TLSv1.2', rejectUnauthorized: true }
  });
  console.log('✓ Conectado ao TiDB Cloud.');

  // 1. Criar ou garantir ciclos canônicos oficiais
  const anos = ['1º ANO', '2º/3º ANO'];
  const chamamentos = [
    '1º Chamamento',
    '2º Chamamento',
    '3º Chamamento',
    '4º Chamamento',
    '5º Chamamento',
    '6º Chamamento'
  ];

  for (const a of anos) {
    for (const c of chamamentos) {
      await conn.query(
        'INSERT INTO ciclo (ano_formativo, chamamento) VALUES (?, ?) ON DUPLICATE KEY UPDATE ano_formativo = ano_formativo',
        [a, c]
      );
    }
  }

  const [ciclosCan] = await conn.query('SELECT id, ano_formativo, chamamento FROM ciclo');
  const canonicalMap = new Map();
  for (const c of ciclosCan) {
    canonicalMap.set(`${c.ano_formativo}|${c.chamamento}`, c.id);
  }
  console.log('✓ Ciclos canônicos mapeados:', canonicalMap);

  // 2. Mapeamento de cada ciclo legado (com datas) para o canônico
  const [todosCiclos] = await conn.query('SELECT id, ano_formativo, chamamento FROM ciclo');
  const remapping = new Map(); // id_antigo => id_canonico

  for (const c of todosCiclos) {
    const ch = c.chamamento;
    if (chamamentos.includes(ch)) {
      // Já é canônico
      continue;
    }
    const resolvedCham = dataToChamamento(ch);
    if (resolvedCham) {
      const canonId = canonicalMap.get(`${c.ano_formativo}|${resolvedCham}`);
      if (canonId && canonId !== c.id) {
        remapping.set(c.id, canonId);
      }
    }
  }
  console.log(`✓ Remapeando ${remapping.size} ciclos que continham datas para seus ciclos canônicos...`);

  for (const [oldId, newId] of remapping.entries()) {
    await conn.query('UPDATE matricula SET ciclo_id = ? WHERE ciclo_id = ?', [newId, oldId]);
    await conn.query('UPDATE turma SET ciclo_id = ? WHERE ciclo_id = ?', [newId, oldId]);
  }

  // 3. Cruzamento refinado com data_fallback.json para 100% de consistência
  const fallback = JSON.parse(fs.readFileSync('src/data_fallback.json', 'utf8'));
  const chamByEmail = new Map();
  for (const r of fallback) {
    const em = String(r.email || r['e-mail'] || '').trim().toLowerCase();
    const ch = String(r.chamamento || '').trim();
    const af = String(r.ano_formativo || '2º/3º ANO').trim();
    if (em && ch && chamamentos.includes(ch)) {
      chamByEmail.set(em, { chamamento: ch, ano_formativo: af });
    }
  }

  const [mats] = await conn.query(`
    SELECT m.id, u.email_inst, c.ano_formativo, c.chamamento
    FROM matricula m
    JOIN vinculo v ON v.id = m.vinculo_id
    JOIN usuario u ON u.id = v.usuario_id
    LEFT JOIN ciclo c ON c.id = m.ciclo_id
    WHERE m.na_base_ativa = 1
  `);

  let atualizadosFallback = 0;
  for (const m of mats) {
    const em = (m.email_inst || '').toLowerCase();
    const info = chamByEmail.get(em);
    if (info) {
      const targetCanonId = canonicalMap.get(`${info.ano_formativo}|${info.chamamento}`) ||
                            canonicalMap.get(`2º/3º ANO|${info.chamamento}`);
      if (targetCanonId && m.chamamento !== info.chamamento) {
        await conn.query('UPDATE matricula SET ciclo_id = ? WHERE id = ?', [targetCanonId, m.id]);
        atualizadosFallback++;
      }
    }
  }
  console.log(`✓ ${atualizadosFallback} matrículas ajustadas com base na lista oficial do fallback.`);

  // 4. Teste de conferência
  const [conferir] = await conn.query(`
    SELECT u.nome, t.codigo as turma, c.ano_formativo, c.chamamento
    FROM matricula m
    JOIN vinculo v ON v.id = m.vinculo_id
    JOIN usuario u ON u.id = v.usuario_id
    LEFT JOIN turma t ON t.id = m.turma_id
    LEFT JOIN ciclo c ON c.id = m.ciclo_id
    WHERE u.nome LIKE '%CAMILA MARTINS%' OR u.nome LIKE '%ANDREA PATRICIA%' OR u.nome LIKE '%CAMILA VIANA%'
  `);
  console.log('✓ Amostra pós-ajuste:');
  console.table(conferir);

  await conn.end();
  console.log('✓ Migração concluída com sucesso!');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
