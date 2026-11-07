import fs from 'node:fs';
import path from 'node:path';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const connUrl = process.argv[2] || process.env.TIDB_DATABASE_URL || process.env.DATABASE_URL;

if (!connUrl) {
  console.error('Uso: node scripts/deploy-tidb-cloud.mjs "mysql://user:pass@host:4000/db"');
  process.exit(1);
}

async function main() {
  console.log('='.repeat(70));
  console.log('  APLICAÇÃO DO SCHEMA V2 NO TIDB CLOUD');
  console.log('='.repeat(70));

  const parsed = new URL(connUrl.replace(/^m+ysql:\/\//, 'mysql://'));
  const host = parsed.hostname;
  const port = Number(parsed.port) || 4000;
  const user = decodeURIComponent(parsed.username);
  const password = decodeURIComponent(parsed.password);
  let database = (parsed.pathname || '').replace(/^\//, '') || 'estagio_probatorio';

  console.log(`Conectando em ${host}:${port} como ${user}...`);

  // 1. Conecta inicialmente para garantir que o banco de dados existe
  let conn;
  try {
    conn = await mysql.createConnection({
      host,
      port,
      user,
      password,
      ssl: { minVersion: 'TLSv1.2', rejectUnauthorized: true }
    });
  } catch (err) {
    console.error('\n❌ Falha na autenticação com o TiDB Cloud:', err.message);
    console.error('\nPossíveis causas:');
    console.error('1. Senha alterada ou incorreta no console do TiDB Cloud.');
    console.error('2. IP Access List bloqueando conexões (adicione 0.0.0.0/0 na aba Security do TiDB Cloud).');
    process.exit(1);
  }

  console.log('✓ Conectado com sucesso ao TiDB Cloud!');
  console.log(`Criando/verificando banco de dados '${database}'...`);
  await conn.query(`CREATE DATABASE IF NOT EXISTS \`${database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`);
  await conn.query(`USE \`${database}\`;`);

  // 2. Lê e aplica o schema_v2.sql
  console.log('\nAplicando schema_v2.sql...');
  const schemaPath = path.resolve('db/schema_v2.sql');
  const sql = fs.readFileSync(schemaPath, 'utf8');

  // Remove comentários e quebra em comandos individuais para compatibilidade com o parser do TiDB
  // Remove comentários (linha inteira ou final de linha) ANTES de dividir em comandos
  const stmts = sql
    .split(/\r?\n/)
    .map(l => l.replace(/--.*$/, ''))
    .join('\n')
    .split(/;\s*(?:\n|$)/)
    .map(s => s.trim())
    .filter(s => s.length > 0);

  await conn.query('SET FOREIGN_KEY_CHECKS = 0;');

  let ok = 0;
  let falhas = 0;
  for (const s of stmts) {
    try {
      await conn.query(s);
      ok++;
    } catch (stmtErr) {
      falhas++;
      console.error('❌ Erro no comando:', s.slice(0, 70).replace(/\s+/g, ' '), '->', stmtErr.message);
    }
  }

  await conn.query('SET FOREIGN_KEY_CHECKS = 1;');
  console.log(`✓ ${ok} comandos aplicados, ${falhas} falha(s).`);
  if (falhas > 0) {
    console.error('\nDeploy INCOMPLETO. Corrija os erros acima e rode novamente.');
    await conn.end();
    process.exit(1);
  }

  // 3. Validação das tabelas criadas
  const [tables] = await conn.query('SHOW TABLES');
  console.log('\nTabelas existentes no banco:');
  for (const t of tables) {
    const nome = Object.values(t)[0];
    const [c] = await conn.query(`SELECT COUNT(*) n FROM \`${nome}\``).catch(() => [[{ n: 'view' }]]);
    console.log(`  - ${nome.padEnd(25)} (${c[0].n} registros)`);
  }

  console.log('\n' + '='.repeat(70));
  console.log('✓ DEPLOY DO SCHEMA V2 NO TIDB CLOUD CONCLUÍDO COM SUCESSO!');
  console.log('='.repeat(70));
  await conn.end();
  process.exit(0);
}

main().catch(err => {
  console.error('Erro fatal:', err);
  process.exit(1);
});
