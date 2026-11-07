/**
 * Script para importar observações das planilhas para o banco de dados (Local MariaDB ou TiDB Cloud)
 * Lê de public/observacoes_pratica_real.json (19.968 registros consolidados das 4 planilhas)
 * e public/tutor_observacoes_real.json (2.013 registros da planilha de tutoria).
 * 
 * Uso: npm run db:import-observacoes
 */
import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { query } from '../api/_lib/db.js';
import { ingestObservacoes, ingestObservacoesTutor } from '../api/_lib/ingest.js';

async function main() {
  console.log('='.repeat(70));
  console.log('  IMPORTAÇÃO DE OBSERVAÇÕES PARA O BANCO DE DADOS');
  console.log('='.repeat(70));

  // 1. Observações da Prática (Formadores -> Cursistas)
  const obsPraticaPath = path.resolve('public/observacoes_pratica_real.json');
  if (fs.existsSync(obsPraticaPath)) {
    console.log('\n[1/2] Lendo observações da prática pedagógica (4 planilhas consolidadas)...');
    const observacoes = JSON.parse(fs.readFileSync(obsPraticaPath, 'utf8'));
    console.log(`✓ Total de registros encontrados: ${observacoes.length}`);

    const batchSize = 250;
    let totalImportadas = 0;
    const inicio = Date.now();

    for (let i = 0; i < observacoes.length; i += batchSize) {
      const lote = observacoes.slice(i, i + batchSize);
      const res = await ingestObservacoes(lote);
      totalImportadas += res.sincronizados;
      const pct = Math.min(100, Math.round(((i + lote.length) / observacoes.length) * 100));
      process.stdout.write(`\r  Progresso: ${totalImportadas} / ${observacoes.length} (${pct}%)`);
    }
    const tempo = ((Date.now() - inicio) / 1000).toFixed(1);
    console.log(`\n✓ Observações da prática importadas com sucesso: ${totalImportadas} registros em ${tempo}s!`);
  } else {
    console.warn('Arquivo public/observacoes_pratica_real.json não encontrado.');
  }

  // 2. Observações de Tutoria (Tutores -> Formadores)
  const obsTutorPath = path.resolve('public/tutor_observacoes_real.json');
  if (fs.existsSync(obsTutorPath)) {
    console.log('\n[2/2] Lendo observações de tutoria (Tutor Insights)...');
    const observacoesTutor = JSON.parse(fs.readFileSync(obsTutorPath, 'utf8'));
    console.log(`✓ Total de registros de tutoria: ${observacoesTutor.length}`);

    const batchSize = 250;
    let totalTutoria = 0;
    const inicio = Date.now();

    for (let i = 0; i < observacoesTutor.length; i += batchSize) {
      const lote = observacoesTutor.slice(i, i + batchSize);
      const res = await ingestObservacoesTutor(lote);
      totalTutoria += res.sincronizados;
      const pct = Math.min(100, Math.round(((i + lote.length) / observacoesTutor.length) * 100));
      process.stdout.write(`\r  Progresso: ${totalTutoria} / ${observacoesTutor.length} (${pct}%)`);
    }
    const tempo = ((Date.now() - inicio) / 1000).toFixed(1);
    console.log(`\n✓ Observações de tutoria importadas com sucesso: ${totalTutoria} registros em ${tempo}s!`);
  }

  // Verificação final
  const [qtdPratica] = await query('SELECT COUNT(*) n FROM observacao_pratica');
  const [qtdTutor] = await query('SELECT COUNT(*) n FROM observacao_tutor');
  console.log('\n' + '='.repeat(70));
  console.log(`Total atual no banco:`);
  console.log(`- observacao_pratica: ${qtdPratica.n} registros`);
  console.log(`- observacao_tutor:   ${qtdTutor.n} registros`);
  console.log('='.repeat(70));

  process.exit(0);
}

main().catch(err => {
  console.error('Erro na importação:', err);
  process.exit(1);
});
