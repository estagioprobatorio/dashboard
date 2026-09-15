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

const fallbackPath = path.join(__dirname, '..', 'src', 'observacoes_fallback.json');
console.log(`Lendo observações de: ${fallbackPath}`);
const rawData = JSON.parse(fs.readFileSync(fallbackPath, 'utf-8'));

console.log(`Total de observações a importar: ${rawData.length}`);

// Formatação e sanitização para o Supabase
function mapObservation(item) {
  const parseDateToISO = (dateStr) => {
    if (!dateStr) return null;
    const parts = dateStr.split('/');
    if (parts.length === 3) {
      const d = parts[0].padStart(2, '0');
      const m = parts[1].padStart(2, '0');
      const y = parts[2].length === 2 ? '20' + parts[2] : parts[2];
      return `${y}-${m}-${d}`;
    }
    return null;
  };

  return {
    email_cursista: item.email_cursista || 'desconhecido@escola.pr.gov.br',
    nome_cursista: item.nome_cursista || '',
    email_formador: item.email_formador || null,
    nome_formador: item.nome_formador || null,
    ano_formativo: item.ano_formativo || null,
    chamamento: item.chamamento || null,
    modalidade: item.modalidade || null,
    componente: item.componente || null,
    tema: item.tema || null,
    observacao_realizada: item.observacao_realizada || 'Sim, a observação foi realizada.',
    data_pratica: parseDateToISO(item.data_pratica),
    data_observacao: parseDateToISO(item.data_observacao),
    data_feedback: parseDateToISO(item.data_feedback),
    data_agendamento: parseDateToISO(item.data_agendamento),
    modalidade_feedback: item.modalidade_feedback || null,
    motivo_devolutiva: item.motivo_devolutiva || null,
    link_gravacao_pratica: item.link_gravacao_pratica || null,
    link_planejamento: item.link_planejamento || null,
    link_gravacao_feedback: item.link_gravacao_feedback || null,
    nivel_planejamento: item.nivel_planejamento || null,
    nivel_pratica: item.nivel_pratica || null,
    evidencias_planejamento: item.evidencias_planejamento || null,
    evidencias_pratica: item.evidencias_pratica || null,
    questionamentos_propositivos: item.questionamentos_propositivos || null,
    proposicoes_sugestoes: item.proposicoes_sugestoes || null,
    combinados: item.combinados || null,
    justificativa_nao_realizada: item.justificativa_nao_realizada || null,
    contexto_justificativa: item.contexto_justificativa || null,
    reflexoes_gerais: item.reflexoes_gerais || null
  };
}

async function runImport() {
  const mapped = rawData.map(mapObservation);
  const batchSize = 250;
  let successCount = 0;

  for (let i = 0; i < mapped.length; i += batchSize) {
    const batch = mapped.slice(i, i + batchSize);
    console.log(`Enviando lote ${Math.floor(i / batchSize) + 1} de ${Math.ceil(mapped.length / batchSize)} (${batch.length} registros)...`);
    
    const { error } = await supabase
      .from('observacoes_pratica')
      .insert(batch);

    if (error) {
      console.error(`Erro ao inserir lote ${i}:`, error.message);
      // Continua nos próximos lotes
    } else {
      successCount += batch.length;
    }
  }

  console.log(`\nImportação finalizada! ${successCount} observações inseridas com sucesso.`);
}

runImport();
