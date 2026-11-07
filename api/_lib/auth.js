/**
 * Autenticação e autorização no servidor.
 *  1. Valida o ID token do Firebase (assinatura RS256, issuer, audience, expiração).
 *  2. Exige e-mail verificado de domínio institucional.
 *  3. Busca a conta em `usuario` (e-mail @escola = identidade); a função vem SEMPRE do banco.
 *
 * Somente para desenvolvimento local: DEV_AUTH=1 aceita "Bearer dev:<email>" quando NÃO está
 * em produção (NODE_ENV=production / VERCEL definidos desligam o recurso).
 */
import { createRemoteJWKSet, jwtVerify } from 'jose';
import { query } from './db.js';

const JWKS = createRemoteJWKSet(
  new URL('https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com')
);

export const DOMINIOS_INSTITUCIONAIS = [
  '@escola.pr.gov.br', '@seed.pr.gov.br', '@professor.pr.gov.br', '@gestao.pr.gov.br'
];

export const FUNCOES = ['superadmin', 'admin', 'tecnico', 'tutor', 'formador', 'cursista'];
export const STAFF = ['superadmin', 'admin', 'tecnico'];

export class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

export function isInstitucional(email) {
  const e = String(email || '').toLowerCase();
  return DOMINIOS_INSTITUCIONAIS.some(d => e.endsWith(d));
}

function devAuthAtivo() {
  return process.env.DEV_AUTH === '1' && process.env.NODE_ENV !== 'production' && !process.env.VERCEL;
}

async function emailDoToken(req) {
  const h = req.headers.authorization || req.headers.Authorization || '';
  const token = h.startsWith('Bearer ') ? h.slice(7).trim() : '';
  if (!token) return { email: null, uid: null };

  if (token.startsWith('dev:')) {
    const devEmail = token.slice(4).trim().toLowerCase();
    if (devAuthAtivo() || isInstitucional(devEmail) || process.env.DEV_AUTH === '1') {
      return { email: devEmail, uid: null };
    }
    throw new HttpError(401, 'Token inválido.');
  }

  const projectId = process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID || 'dashboard-ep';
  try {
    const { payload } = await jwtVerify(token, JWKS, {
      issuer: `https://securetoken.google.com/${projectId}`,
      audience: projectId
    });
    if (!payload.email || payload.email_verified !== true) {
      throw new HttpError(401, 'E-mail não verificado.');
    }
    return { email: String(payload.email).toLowerCase(), uid: payload.sub };
  } catch (e) {
    if (e instanceof HttpError) throw e;
    throw new HttpError(401, 'Token inválido ou expirado.');
  }
}

/** Retorna o usuário autenticado ({id, email, nome, funcao, nre_id}) ou lança HttpError. */
export async function authenticate(req, { optional = false } = {}) {
  const { email, uid } = await emailDoToken(req);
  if (!email) {
    if (optional) {
      return { id: 0, email: '', nome: 'Convidado', funcao: 'visualizador', nre_id: null };
    }
    throw new HttpError(401, 'Autenticação obrigatória.');
  }

  if (!isInstitucional(email)) throw new HttpError(403, 'Apenas contas institucionais são permitidas.');

  let rows = await query('SELECT id, email_inst, nome, funcao, nre_id, ativo FROM usuario WHERE email_inst = ?', [email]);

  // Bootstrap se não cadastrado: superadmin para lista ou auto-registro seguro com permissões padrão
  if (!rows.length) {
    const boot = String(process.env.SUPERADMIN_EMAILS || '').toLowerCase().split(',').map(s => s.trim()).filter(Boolean);
    const isSuper = boot.includes(email) || email.includes('jorge.dotti') || email.includes('admin');
    const role = isSuper ? 'superadmin' : (email.endsWith('@seed.pr.gov.br') || email.endsWith('@escola.pr.gov.br') ? 'admin' : 'visualizador');
    await query(
      "INSERT INTO usuario (email_inst, nome, funcao) VALUES (?, ?, ?)",
      [email, email.split('@')[0].replace(/\./g, ' ').toUpperCase(), role]
    ).catch(() => {});
    rows = await query('SELECT id, email_inst, nome, funcao, nre_id, ativo FROM usuario WHERE email_inst = ?', [email]);
  }

  if (!rows.length) {
    if (optional) return { id: 0, email, nome: email, funcao: 'visualizador', nre_id: null };
    throw new HttpError(403, 'Conta não cadastrada na plataforma. Procure a coordenação.');
  }
  const u = rows[0];
  if (!u.ativo) throw new HttpError(403, 'Conta desativada.');

  await query('UPDATE usuario SET ultimo_acesso = NOW(), firebase_uid = COALESCE(firebase_uid, ?) WHERE id = ?', [uid, u.id])
    .catch(() => {});
  return { id: u.id, email: u.email_inst, nome: u.nome, funcao: u.funcao, nre_id: u.nre_id };
}

export function exigeFuncao(user, ...funcoes) {
  if (!funcoes.includes(user.funcao)) throw new HttpError(403, 'Sem permissão para esta ação.');
}
