const fs = require('fs');
const https = require('https');

const data = JSON.parse(
  fs.readFileSync('03_Dashboard Estagio Probatorio/dashboard-main/src/data/tutor_observacoes_real.json', 'utf8')
);

console.log(`Carregadas ${data.length} observações reais para upload no TiDB...`);

async function postBatch(lote, isFirst) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify({
      action: 'sync_observacoes_tutor_bulk',
      observacoes: lote,
      truncate: isFirst
    });

    const req = https.request('https://dashboard-tawny-delta-96.vercel.app/api/tidb', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      }
    }, (res) => {
      let responseBody = '';
      res.on('data', chunk => responseBody += chunk);
      res.on('end', () => {
        if (res.statusCode === 200) {
          try {
            resolve(JSON.parse(responseBody));
          } catch(e) {
            resolve({ raw: responseBody });
          }
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${responseBody}`));
        }
      });
    });

    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

(async () => {
  const batchSize = 100;
  let total = 0;
  for (let b = 0; b < data.length; b += batchSize) {
    const lote = data.slice(b, b + batchSize);
    try {
      await postBatch(lote, b === 0);
      total += lote.length;
      process.stdout.write(`\rEnviados: ${total} / ${data.length}...`);
    } catch (e) {
      console.error(`\nErro no lote ${b}:`, e.message);
    }
  }
  console.log(`\n✓ Finalizado! Total de ${total} observações de tutoria sincronizadas no TiDB Cloud!`);
})();
