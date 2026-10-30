const fs = require('fs');
const https = require('https');

function parseCSV(content) {
  const rows = [];
  let cur = '';
  let inQ = false;
  let row = [];

  for (let i = 0; i < content.length; i++) {
    const c = content[i];
    if (c === '"') {
      if (inQ && content[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQ = !inQ;
      }
    } else if (c === ',' && !inQ) {
      row.push(cur.trim());
      cur = '';
    } else if ((c === '\n' || c === '\r') && !inQ) {
      if (c === '\r' && content[i + 1] === '\n') {
        i++;
      }
      row.push(cur.trim());
      cur = '';
      if (row.length > 1 || row[0]) {
        rows.push(row);
      }
      row = [];
    } else {
      cur += c;
    }
  }
  if (cur || row.length > 0) {
    row.push(cur.trim());
    rows.push(row);
  }
  return rows;
}

function normalizarStatus(val) {
  const s = String(val || '').trim().toLowerCase();
  if (s.includes('indeferid')) return 'Indeferido';
  if (s.includes('deferid')) return 'Deferido';
  if (s.includes('resolvid')) return 'Resolvido';
  if (s.includes('analis') || s.includes('andament')) return 'Em Análise';
  return 'Pendente';
}

function formatMySqlTimestamp(val) {
  if (!val) return new Date().toISOString().slice(0, 19).replace('T', ' ');
  const str = String(val).trim();
  const brMatch = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?/);
  if (brMatch) {
    const day = brMatch[1].padStart(2, '0');
    const month = brMatch[2].padStart(2, '0');
    const year = brMatch[3];
    const hour = (brMatch[4] || '00').padStart(2, '0');
    const min = (brMatch[5] || '00').padStart(2, '0');
    const sec = (brMatch[6] || '00').padStart(2, '0');
    return `${year}-${month}-${day} ${hour}:${min}:${sec}`;
  }
  try {
    const d = new Date(str);
    if (!isNaN(d.getTime())) {
      return d.toISOString().slice(0, 19).replace('T', ' ');
    }
  } catch (e) {}
  return new Date().toISOString().slice(0, 19).replace('T', ' ');
}

const movimentacoes = [];

// 1. Troca de Turma
if (fs.existsSync('docs/Troca de Turma.csv')) {
  const content = fs.readFileSync('docs/Troca de Turma.csv', 'utf-8');
  const rows = parseCSV(content);
  console.log(`Lendo Troca de Turma: ${rows.length} linhas`);
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    const carimbo = r[0] || '';
    const email = (r[1] || '').trim().toLowerCase();
    const nome = (r[2] || '').trim();
    if (!nome && !email) continue;

    const statusRaw = r[14]; // Coluna O
    const status = normalizarStatus(statusRaw);
    const cgm = (r[24] || '').trim(); // Coluna Y
    const turmaAnt = (r[18] || '').trim(); // Coluna S
    const turmaNova = (r[19] || '').trim(); // Coluna T
    const justificativa = (r[11] || r[15] || '').trim();

    const id = `MOV_TT_${cgm || email.replace(/[^a-z0-9]/g, '')}_${i}`;
    movimentacoes.push({
      id,
      timestamp: formatMySqlTimestamp(carimbo),
      cgm: cgm || null,
      nome_cursista: nome,
      email: email || null,
      turma_anterior: turmaAnt || null,
      turma_nova: turmaNova || null,
      tipo_acao: 'Troca de Turma',
      motivo: 'Solicitação via Formulário Google (Troca de Turma)',
      justificativa: justificativa || null,
      status,
      nota_resolucao: statusRaw ? String(r[15] || statusRaw) : null,
      solicitadoPor: 'Google Forms'
    });
  }
}

// 2. Troca de Modalidade
if (fs.existsSync('docs/Troca de Modalidade.csv')) {
  const content = fs.readFileSync('docs/Troca de Modalidade.csv', 'utf-8');
  const rows = parseCSV(content);
  console.log(`Lendo Troca de Modalidade: ${rows.length} linhas`);
  for (let j = 1; j < rows.length; j++) {
    const rm = rows[j];
    const carimboM = rm[0] || '';
    const emailM = (rm[1] || '').trim().toLowerCase();
    const nomeM = (rm[2] || '').trim();
    if (!nomeM && !emailM) continue;

    const statusRawM = rm[12]; // Coluna M
    const statusM = normalizarStatus(statusRawM);
    const cgmM = (rm[22] || '').trim(); // Coluna W
    const modAtual = (rm[7] || '').trim();
    const modNova = (rm[8] || '').trim();
    const turmaAntM = (rm[15] || '').trim();
    const turmaNovaM = (rm[16] || '').trim();

    const idM = `MOV_TM_${cgmM || emailM.replace(/[^a-z0-9]/g, '')}_${j}`;
    movimentacoes.push({
      id: idM,
      timestamp: formatMySqlTimestamp(carimboM),
      cgm: cgmM || null,
      nome_cursista: nomeM,
      email: emailM || null,
      turma_anterior: turmaAntM || null,
      turma_nova: turmaNovaM || null,
      tipo_acao: 'Troca de Modalidade',
      modalidade_detalhes: `${modAtual} -> ${modNova}`,
      motivo: `Solicitação de ${modAtual} para ${modNova}`,
      status: statusM,
      nota_resolucao: statusRawM ? String(rm[13] || statusRawM) : null,
      solicitadoPor: 'Google Forms'
    });
  }
}

// 3. Vínculos na AF
if (fs.existsSync('docs/Vínculos na AF.csv')) {
  const content = fs.readFileSync('docs/Vínculos na AF.csv', 'utf-8');
  const rows = parseCSV(content);
  console.log(`Lendo Vínculos na AF: ${rows.length} linhas`);
  for (let k = 1; k < rows.length; k++) {
    const rv = rows[k];
    const carimboV = rv[0] || '';
    const emailV = (rv[1] || '').trim().toLowerCase();
    const nomeV = (rv[2] || '').trim();
    if (!nomeV && !emailV) continue;

    const statusRawV = rv[17]; // Coluna R
    const statusV = normalizarStatus(statusRawV);
    const cgmV = (rv[25] || '').trim(); // Coluna Z
    const turmaAntV = (rv[20] || '').trim(); // Coluna U
    const turmaNovaV = (rv[21] || '').trim(); // Coluna V

    const idV = `MOV_VF_${cgmV || emailV.replace(/[^a-z0-9]/g, '')}_${k}`;
    movimentacoes.push({
      id: idV,
      timestamp: formatMySqlTimestamp(carimboV),
      cgm: cgmV || null,
      nome_cursista: nomeV,
      email: emailV || null,
      turma_anterior: turmaAntV || null,
      turma_nova: turmaNovaV || null,
      tipo_acao: 'Vínculo na AF',
      motivo: 'Solicitação de Vínculos em Avaliação Formativa',
      status: statusV,
      nota_resolucao: statusRawV ? String(rv[18] || statusRawV) : null,
      solicitadoPor: 'Google Forms'
    });
  }
}

console.log(`Total de movimentações extraídas: ${movimentacoes.length}`);

// Salva backup local
fs.writeFileSync('src/movimentacoes_fallback.json', JSON.stringify(movimentacoes, null, 2), 'utf-8');
console.log('✓ Salvo em src/movimentacoes_fallback.json');

// Upload para TiDB Cloud via /api/tidb
async function postBatch(lote, isFirst) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify({
      action: 'sync_movimentacoes_bulk',
      movimentacoes: lote,
      truncate: isFirst
    });

    const req = https.request('https://dashboard-tawny-delta-96.vercel.app/api/tidb', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode === 200) {
          resolve(JSON.parse(data));
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${data}`));
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
  for (let b = 0; b < movimentacoes.length; b += batchSize) {
    const lote = movimentacoes.slice(b, b + batchSize);
    try {
      const res = await postBatch(lote, b === 0);
      total += lote.length;
      process.stdout.write(`\rEnviados: ${total} / ${movimentacoes.length}...`);
    } catch (e) {
      console.error(`\nErro no lote ${b}:`, e.message);
    }
  }
  console.log(`\n✓ Finalizado! Total de ${total} movimentações sincronizadas no TiDB Cloud!`);
})();
