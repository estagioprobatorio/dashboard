-- =========================================================================================
-- CRIAÇÃO DA TABELA DE CURSISTAS CONCLUINTES DO 1º CHAMAMENTO (CONCLUINTES-1CH)
-- Plataforma do Estágio Probatório - SEED/PR
-- =========================================================================================

CREATE TABLE IF NOT EXISTS public.cursistas_concluintes (
    id BIGSERIAL PRIMARY KEY,
    cod_cursista TEXT,
    cgm TEXT,
    nome_cursista TEXT NOT NULL,
    email TEXT,
    cpf TEXT,
    rg TEXT,
    chamamento TEXT DEFAULT '1º Chamamento',
    ano_formativo TEXT,
    modalidade TEXT,
    componente TEXT,
    turmas TEXT,
    nre_exe TEXT,
    munic_exe TEXT,
    situacao TEXT DEFAULT 'CONCLUÍDO',
    data_conclusao TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índice para acelerar busca e cruzamento de observações por e-mail e nome
CREATE INDEX IF NOT EXISTS idx_concluintes_email ON public.cursistas_concluintes (email);
CREATE INDEX IF NOT EXISTS idx_concluintes_nome ON public.cursistas_concluintes (nome_cursista);
CREATE INDEX IF NOT EXISTS idx_concluintes_cgm ON public.cursistas_concluintes (cgm);

-- Habilita segurança RLS e permissão de leitura e escrita com anon_key
ALTER TABLE public.cursistas_concluintes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permitir leitura pública de cursistas_concluintes" ON public.cursistas_concluintes;
CREATE POLICY "Permitir leitura pública de cursistas_concluintes" 
ON public.cursistas_concluintes 
FOR SELECT 
USING (true);

DROP POLICY IF EXISTS "Permitir insercao e atualizacao de cursistas_concluintes" ON public.cursistas_concluintes;
CREATE POLICY "Permitir insercao e atualizacao de cursistas_concluintes" 
ON public.cursistas_concluintes 
FOR ALL 
USING (true) 
WITH CHECK (true);

-- Habilita sincronização em Tempo Real (Realtime)
ALTER PUBLICATION supabase_realtime ADD TABLE public.cursistas_concluintes;

NOTIFY pgrst, 'reload schema';
