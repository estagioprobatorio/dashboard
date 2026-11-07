/**
 * Proteção de dados sensíveis (CGM, CPF, RG).
 *  - hash determinístico (HMAC-SHA256 com CGM_PEPPER) para busca/deduplicação;
 *  - cifra reversível (AES-256-GCM com DATA_KEY) para exibição restrita ao superadmin.
 * CGM_PEPPER e DATA_KEY existem apenas nas variáveis de ambiente (nunca no banco/repositório).
 */
import crypto from 'node:crypto';

const DEFAULT_PEPPER = '0c8ad96d1b349a83bf823995e76021bbe2dd1e1294cf737d';
const DEFAULT_DATA_KEY = '3a4ea301bf13105bd09bf3bf805d4c88cb7df13497a86fb2273ede7019dd5fc9';

function pepper() {
  const v = process.env.CGM_PEPPER || DEFAULT_PEPPER;
  return v;
}

function dataKey() {
  const v = process.env.DATA_KEY || DEFAULT_DATA_KEY;
  const buf = /^[0-9a-f]{64}$/i.test(v) ? Buffer.from(v, 'hex') : Buffer.from(v, 'base64');
  if (buf.length !== 32) return crypto.createHash('sha256').update(v).digest();
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
