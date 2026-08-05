import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Carrega .env se existir
const envPath = path.join(__dirname, '..', '.env');
let supabaseUrl = 'https://hoiihqrivcelsfivjpqs.supabase.co';
let supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  envContent.split('\n').forEach(line => {
    const [k, ...v] = line.split('=');
    if (k && v.length) {
      const val = v.join('=').trim();
      if (k.trim() === 'VITE_SUPABASE_URL' && val) supabaseUrl = val;
      if (k.trim() === 'VITE_SUPABASE_ANON_KEY' && val) supabaseKey = val;
    }
  });
}

if (!supabaseKey) {
  console.error("ERRO: VITE_SUPABASE_ANON_KEY não fornecida no .env ou nas variáveis de ambiente!");
  console.log("Por favor, preencha VITE_SUPABASE_ANON_KEY no arquivo .env antes de executar este script.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const fallbackPath = path.join(__dirname, '..', 'src', 'tutores_fallback.json');
console.log(`Lendo dados de tutores de: ${fallbackPath}`);
const rawData = JSON.parse(fs.readFileSync(fallbackPath, 'utf-8'));

console.log(`Total de tutores encontrados: ${rawData.length}`);

// Função para mapear o registro JSON para o formato da tabela PostgreSQL
function mapRecord(item) {
  return {
    tutor_responsavel: item.tutor_responsavel || null,
    rg: item.rg || null,
    cpf: item.cpf || null,
    email_adm: item.email_adm || null,
    email_educ: item.email_educ || null,
    nre_tutor: item.nre_tutor || null,
    email_nre: item.email_nre || null,
    telefone: item.telefone || null,
    observacoes: item.observacoes || null
  };
}

async function startImport() {
  const mappedRecords = rawData.map(mapRecord).filter(t => t.email_educ && t.email_educ.includes('@'));
  console.log(`Total de tutores válidos com e-mail para importação: ${mappedRecords.length}`);

  // Limpa os dados antigos
  console.log("Limpando registros antigos da tabela 'tutores'...");
  const { error: truncateError } = await supabase
    .from('tutores')
    .delete()
    .neq('email_educ', 'placeholder@escola.pr.gov.br'); // Limpa tudo
    
  if (truncateError) {
    console.error("Erro ao limpar registros antigos:", truncateError);
    process.exit(1);
  }

  const batchSize = 50;
  for (let i = 0; i < mappedRecords.length; i += batchSize) {
    const batch = mappedRecords.slice(i, i + batchSize);
    console.log(`Enviando lote de tutores ${i + 1} a ${Math.min(i + batchSize, mappedRecords.length)}...`);

    const { data, error } = await supabase
      .from('tutores')
      .upsert(batch, { onConflict: 'email_educ' });

    if (error) {
      console.error("Erro ao enviar lote para o Supabase:", error);
      console.log("Detalhes do erro:", JSON.stringify(error, null, 2));
      process.exit(1);
    }

    console.log("Lote enviado com sucesso.");
    if (i + batchSize < mappedRecords.length) {
      console.log("Pausando 1.5 segundos...");
      await new Promise(resolve => setTimeout(resolve, 1500));
    }
  }

  console.log("==========================================");
  console.log("TUTORES IMPORTADOS COM SUCESSO AO SUPABASE!");
  console.log("==========================================");
}

startImport();
