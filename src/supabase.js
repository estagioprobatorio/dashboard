import { createClient } from '@supabase/supabase-js';

// Credenciais do Supabase obtidas das variáveis de ambiente (.env ou Vercel)
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://hoiihqrivcelsfivjpqs.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Verifica se as credenciais mínimas foram preenchidas
const isConfigured = Boolean(supabaseUrl && supabaseAnonKey);

let supabase = null;

if (isConfigured) {
  try {
    supabase = createClient(supabaseUrl, supabaseAnonKey, {
      realtime: {
        params: {
          eventsPerSecond: 10
        }
      }
    });
    console.log("Supabase conectado com sucesso!");
  } catch (error) {
    console.error("Falha ao inicializar o Supabase:", error);
  }
} else {
  console.log("Supabase anon key não encontrada no .env. Operando em modo de fallback local.");
}

export { supabase, isConfigured, supabaseUrl, supabaseAnonKey };
