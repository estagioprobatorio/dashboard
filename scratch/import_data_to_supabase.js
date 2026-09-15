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

const fallbackPath = path.join(__dirname, '..', 'src', 'data_fallback.json');
console.log(`Lendo dados de: ${fallbackPath}`);
const rawData = JSON.parse(fs.readFileSync(fallbackPath, 'utf-8'));

console.log(`Total de registros encontrados: ${rawData.length}`);

// Função para mapear o registro JSON para o formato da tabela PostgreSQL do Supabase
function mapRecord(item) {
  return {
    cod_cursista: item.cod_cursista || null,
    cgm: item.cgm ? String(item.cgm) : null,
    nome_cursista: item.nome_cursista || 'CURSISTA SEM NOME',
    email: item['e-mail'] || item.email || item.email_cursista || null,
    cpf_cursista: item.cpf_cursista || null,
    rg: item.rg || null,
    telefone_cursista: item.telefone_cursista || null,
    modalidade: item.modalidade || null,
    componente: item.componente || null,
    turma: item.turma || null,
    dia_da_semana: item.dia_da_semana || null,
    horario_inicial: item.horario_inicial || null,
    horario_fim: item.horario_fim || null,
    turno: item.turno || null,
    ano_formativo: item.ano_formativo || null,
    nome_formador: item.nome_formador || null,
    cpf_formador: item.cpf_formador || null,
    rg_formador: item.rg_formador || null,
    email_formador: item['e-mail_formador'] || item.email_formador || null,
    telefone_formador: item.telefone_formador || null,
    nre_formador: item.nre_formador || null,
    componente_formador: item.componente_formador || null,
    tutor_responsavel: item.tutor_responsavel || null,
    email_tutor: item.email_tutor || null,
    telefone_tutor: item.telefone_tutor || null,
    nre_tutor: item.nre_tutor || null,
    email_nre: item['e-mail_nre'] || item.email_nre || null,
    link_classroom: item['Link Classroom'] || item.link_classroom || null,
    id_classroom: item.id_classroom || null,
    periodo_ini: item.periodo_ini || null,
    chamamento: item.chamamento || null,
    nre_exe: item.nre_exe || null,
    munic_exe: item.munic_exe || null,
    componente_conc: item.componente_conc || null,
    observacoes_cursista: item.observacoes_cursista || null,
    observacoes_formador: item.observacoes_formador || null,
    observacoes_tutor: item.observacoes_tutor || null,
    observacoes_turma: item.observacoes_turma || null
  };
}

async function runImport() {
  const mappedRecords = rawData.map(mapRecord);

  // Insere em lotes de 200 registros
  const batchSize = 200;
  let totalInserted = 0;

  for (let i = 0; i < mappedRecords.length; i += batchSize) {
    const batch = mappedRecords.slice(i, i + batchSize);
    console.log(`Inserindo lote ${i / batchSize + 1} de ${Math.ceil(mappedRecords.length / batchSize)} (${batch.length} registros)...`);
    
    const { data, error } = await supabase
      .from('cursistas')
      .upsert(batch, { onConflict: 'cod_cursista', ignoreDuplicates: false });

    if (error) {
      console.error(`Erro ao inserir lote ${i}:`, error);
    } else {
      totalInserted += batch.length;
      console.log(`Lote inserido com sucesso. Progresso: ${totalInserted}/${mappedRecords.length}`);
    }
  }

  console.log("Processo de importação finalizado!");
}

runImport().catch(console.error);
