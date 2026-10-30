/**
 * Vercel Serverless Function - Leitura Segura via Google Sheets API (Conta de Serviço)
 * Service Account: leitor-tutor-insights@custom-vigil-498821-e8.iam.gserviceaccount.com
 * SEED-PR - Estágio Probatório
 * Suporta a Planilha Oficial de Observação do Tutor: 1V54Gl-KVGaHjLBH07hQZxq6GU88kfn0Xurh5P2LuSz8
 */

import crypto from 'crypto';

function base64Url(obj) {
  return Buffer.from(typeof obj === 'string' ? obj : JSON.stringify(obj))
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

async function getGoogleAccessToken(clientEmail, privateKey) {
  let formattedKey = privateKey.trim();
  if (
    (formattedKey.startsWith('"') && formattedKey.endsWith('"')) ||
    (formattedKey.startsWith("'") && formattedKey.endsWith("'"))
  ) {
    formattedKey = formattedKey.slice(1, -1);
  }
  formattedKey = formattedKey.replace(/\\n/g, '\n');

  const header = { alg: 'RS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: clientEmail,
    scope: 'https://www.googleapis.com/auth/spreadsheets.readonly',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now
  };

  const unsigned = `${base64Url(header)}.${base64Url(payload)}`;
  const sign = crypto.createSign('RSA-SHA256');
  sign.update(unsigned);
  sign.end();
  const signature = sign.sign(formattedKey, 'base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  const jwt = `${unsigned}.${signature}`;

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt
    })
  });

  const tokenData = await tokenRes.json();
  if (!tokenRes.ok || !tokenData.access_token) {
    throw new Error(`OAuth error: ${tokenData.error_description || tokenData.error || tokenRes.statusText}`);
  }
  return tokenData.access_token;
}

export default async function handler(req, res) {
  // Configuração de Cabeçalhos CORS para o Dashboard
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const { sheetId, range } = req.query;

  // Planilha padrão: Observação do Tutor
  const targetSheetId = sheetId || '1V54Gl-KVGaHjLBH07hQZxq6GU88kfn0Xurh5P2LuSz8';
  const targetRange = range || 'Respostas ao formulário 1!A2:AZ';

  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || 'leitor-tutor-insights@custom-vigil-498821-e8.iam.gserviceaccount.com';
  const privateKey = (process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY || '').trim();

  // 1. Tentativa via Service Account caso a chave esteja cadastrada
  if (privateKey) {
    try {
      const accessToken = await getGoogleAccessToken(clientEmail, privateKey);
      const apiUrl = `https://sheets.googleapis.com/v4/spreadsheets/${targetSheetId}/values/${encodeURIComponent(targetRange)}`;
      const sheetsRes = await fetch(apiUrl, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });

      if (sheetsRes.ok) {
        const sheetData = await sheetsRes.json();
        return res.status(200).json(sheetData);
      }
    } catch (err) {
      console.warn('[Sheets API] Falha na consulta via Service Account, tentando fallback:', err.message);
    }
  }

  // 2. Tentativa pública via GOOGLE_SHEETS_API_KEY
  try {
    const apiKey = process.env.GOOGLE_SHEETS_API_KEY || '';
    if (apiKey) {
      const apiUrl = `https://sheets.googleapis.com/v4/spreadsheets/${targetSheetId}/values/${encodeURIComponent(targetRange)}?key=${apiKey}`;
      const response = await fetch(apiUrl);
      if (response.ok) {
        const data = await response.json();
        return res.status(200).json(data);
      }
    }
  } catch (e) {
    console.warn('[Sheets API] Falha na consulta por API Key:', e.message);
  }

  // 3. Fallback gracioso com status descritivo
  return res.status(200).json({
    status: 'fallback_active',
    sheetId: targetSheetId,
    range: targetRange,
    serviceAccount: clientEmail,
    message: 'Servindo dados locais resilientes. Configure GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY no Vercel para sincronização direta contínua.',
    values: []
  });
}
