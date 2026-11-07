/**
 * Proteção de dados sensíveis (CGM, CPF, RG).
 *  - hash determinístico (HMAC-SHA256 com CGM_PEPPER) para busca/deduplicação;
 *  - cifra reversível (AES-256-GCM com DATA_KEY) para exibição restrita ao superadmin.
 * CGM_PEPPER e DATA_KEY existem apenas nas variáveis de ambiente (nunca no banco/repositório).
 */
import crypto from 'node:crypto';

function pepper() {
  const v = process.env.CGM_PEPPER;
  if (!v || v.length < 16) throw new Error('CGM_PEPPER não configurado (mín. 16 caracteres).');
  return v;
}

function dataKey() {
  const v = process.env.DATA_KEY;
  if (!v) throw new Error('DATA_KEY não configurada (32 bytes em base64 ou 64 hex).');
  const buf = /^[0-9a-f]{64}$/i.test(v) ? Buffer.from(v, 'hex') : Buffer.from(v, 'base64');
  if (buf.length !== 32) throw new Error('DATA_KEY deve ter 32 bytes.');
  return buf;
}

/** Mantém apenas dígitos; retorna null se vazio. */
export function normalizeDigits(value) {
  if (value === null || value === undefined) return null;
  const d = String(value).replace(/\D/g, '');
  return d || null;
}

export function hmacHex(value) {
  return crypto.createHmac('sha256', pepper()).update(String(value)).digest('hex');
}

export function encrypt(plain) {
  if (plain === null || plain === undefined || plain === '') return null;
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', dataKey(), iv);
  const ct = Buffer.concat([cipher.update(String(plain), 'utf8'), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), ct]);
}

export function decrypt(buf) {
  if (!buf) return null;
  const b = Buffer.isBuffer(buf) ? buf : Buffer.from(buf);
  const decipher = crypto.createDecipheriv('aes-256-gcm', dataKey(), b.subarray(0, 12));
  decipher.setAuthTag(b.subarray(12, 28));
  return Buffer.concat([decipher.update(b.subarray(28)), decipher.final()]).toString('utf8');
}

export function maskCgm(ultimos3) {
  return ultimos3 ? `•••••${ultimos3}` : '';
}

export function timingSafeEq(a, b) {
  const x = Buffer.from(String(a || ''));
  const y = Buffer.from(String(b || ''));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}
