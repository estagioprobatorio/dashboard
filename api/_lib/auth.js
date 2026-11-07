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
  if (!token) throw new HttpError(401, 'Autenticação obrigatória.');

  if (token.startsWith('dev:')) {
    if (!devAuthAtivo()) throw new HttpError(401, 'Token inválido.');
    return { email: token.slice(4).trim().toLowerCase(), uid: null };
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
export async function authenticate(req) {
  const { email, uid } = await emailDoToken(req);
  if (!isInstitucional(email)) throw new HttpError(403, 'Apenas contas institucionais são permitidas.');

  let rows = await query('SELECT id, email_inst, nome, funcao, nre_id, ativo FROM usuario WHERE email_inst = ?', [email]);

  // Bootstrap: primeiro acesso de quem está em SUPERADMIN_EMAILS (variável de ambiente)
  if (!rows.length) {
    const boot = String(process.env.SUPERADMIN_EMAILS || '').toLowerCase().split(',').map(s => s.trim()).filter(Boolean);
    if (boot.includes(email)) {
      await query(
        "INSERT INTO usuario (email_inst, nome, funcao) VALUES (?, ?, 'superadmin')",
        [email, email.split('@')[0].replace(/\./g, ' ')]
      );
      rows = await query('SELECT id, email_inst, nome, funcao, nre_id, ativo FROM usuario WHERE email_inst = ?', [email]);
    }
  }

  if (!rows.length) throw new HttpError(403, 'Conta não cadastrada na plataforma. Procure a coordenação.');
  const u = rows[0];
  if (!u.ativo) throw new HttpError(403, 'Conta desativada.');

  await query('UPDATE usuario SET ultimo_acesso = NOW(), firebase_uid = COALESCE(firebase_uid, ?) WHERE id = ?', [uid, u.id])
    .catch(() => {});
  return { id: u.id, email: u.email_inst, nome: u.nome, funcao: u.funcao, nre_id: u.nre_id };
}

export function exigeFuncao(user, ...funcoes) {
  if (!funcoes.includes(user.funcao)) throw new HttpError(403, 'Sem permissão para esta ação.');
}
