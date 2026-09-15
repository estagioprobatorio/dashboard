-- =========================================================================================
-- SCRIPT SQL: Limpeza da Tabela observacoes_pratica e Configuração de Chave Única
-- Supabase SQL Editor
-- =========================================================================================

-- 1. Limpar todas as 28.834 linhas acumuladas/duplicadas
TRUNCATE TABLE public.observacoes_pratica RESTART IDENTITY;

-- 2. Garantir que a coluna id_origem exista na tabela
ALTER TABLE public.observacoes_pratica 
ADD COLUMN IF NOT EXISTS id_origem TEXT;

-- 3. Criar índice UNIQUE no id_origem para que o UPSERT (on_conflict=id_origem)
--    atualize registros existentes em vez de inserir duplicatas no futuro
CREATE UNIQUE INDEX IF NOT EXISTS idx_observacoes_pratica_id_origem 
ON public.observacoes_pratica (id_origem);

-- 4. Criar índice no email_cursista para consultas ultrarrápidas na lista de turmas
CREATE INDEX IF NOT EXISTS idx_observacoes_pratica_email_cursista 
ON public.observacoes_pratica (email_cursista);

-- 5. Forçar a API do Supabase a atualizar o cache de colunas imediatamente
NOTIFY pgrst, 'reload schema';

-- 6. Confirmar contagem (deve retornar 0 linhas logo após a limpeza)
SELECT count(*) AS total_apos_limpeza FROM public.observacoes_pratica;
