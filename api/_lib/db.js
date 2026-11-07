/**
 * Conexão com o banco (TiDB Cloud em produção, MariaDB/MySQL em localhost).
 * Variáveis: DATABASE_URL (mysql://user:pass@host:port/db) ou TIDB_HOST/PORT/USER/PASSWORD/DATABASE.
 * SSL é exigido para qualquer host que não seja local.
 */
import mysql from 'mysql2/promise';

let pool = null;

function parseConfig() {
  const url = process.env.DATABASE_URL || process.env.TIDB_DATABASE_URL || '';
  if (url) {
    const p = new URL(url.replace(/^m+ysql:\/\//, 'mysql://'));
    return {
      host: p.hostname,
      port: Number(p.port || 4000),
      user: decodeURIComponent(p.username),
      password: decodeURIComponent(p.password),
      database: (p.pathname || '').replace(/^\//, '') || 'test'
    };
  }
  return {
    host: process.env.TIDB_HOST || '',
    port: Number(process.env.TIDB_PORT || 4000),
    user: process.env.TIDB_USER || '',
    password: process.env.TIDB_PASSWORD || '',
    database: process.env.TIDB_DATABASE || 'test'
  };
}

export function getPool() {
  if (!pool) {
    const cfg = parseConfig();
    if (!cfg.host || !cfg.user) throw new Error('Credenciais do banco não configuradas (DATABASE_URL).');
    const local = ['localhost', '127.0.0.1', '::1'].includes(cfg.host);
    pool = mysql.createPool({
      ...cfg,
      ssl: local ? undefined : { minVersion: 'TLSv1.2', rejectUnauthorized: true },
      waitForConnections: true,
      connectionLimit: 10,
      dateStrings: true,         // DATE/DATETIME como string (sem fuso)
      charset: 'utf8mb4'
    });
  }
  return pool;
}

export async function query(sql, params = []) {
  const [rows] = await getPool().query(sql, params);
  return rows;
}

export async function audit(usuarioId, acao, entidade = null, entidadeId = null, detalhes = null) {
  try {
    await query(
      'INSERT INTO auditoria (usuario_id, acao, entidade, entidade_id, detalhes) VALUES (?,?,?,?,?)',
      [usuarioId || null, acao, entidade, entidadeId == null ? null : String(entidadeId), detalhes ? JSON.stringify(detalhes) : null]
    );
  } catch (e) {
    console.warn('[audit] falha ao registrar auditoria:', e.message);
  }
}
