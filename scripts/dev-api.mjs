/**
 * Servidor local da API (porta 3001). O Vite (porta 3000) faz proxy de /api para cá.
 * Uso: npm run dev:api   (lê .env.local)
 */
import http from 'node:http';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
const { default: handler } = await import('../api/v2.js');

const PORT = Number(process.env.API_PORT || 3001);

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  if (!url.pathname.startsWith('/api/v2')) { res.statusCode = 404; return res.end('not found'); }

  let raw = '';
  for await (const chunk of req) raw += chunk;
  req.query = Object.fromEntries(url.searchParams);
  try { req.body = raw ? JSON.parse(raw) : {}; } catch { req.body = {}; }

  res.status = (c) => { res.statusCode = c; return res; };
  res.json = (o) => { res.setHeader('Content-Type', 'application/json; charset=utf-8'); res.end(JSON.stringify(o)); return res; };
  await handler(req, res);
});

server.listen(PORT, '127.0.0.1', () => console.log(`[API v2] http://127.0.0.1:${PORT}/api/v2 (DEV_AUTH=${process.env.DEV_AUTH === '1' ? 'on' : 'off'})`));
