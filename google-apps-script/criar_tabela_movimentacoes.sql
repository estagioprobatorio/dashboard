-- =====================================================================
-- Tabela public.movimentacoes
-- Guarda: remanejamentos/transferências/saídas feitas no Painel Admin,
-- solicitações dos cursistas e chamados dos tutores.
-- Pode ser executada mais de uma vez (idempotente).
-- =====================================================================

create table if not exists public.movimentacoes (
  id                        text primary key default gen_random_uuid()::text,
  "timestamp"               timestamptz not null default now()
);

-- Colunas (nomes camelCase entre aspas porque o app envia exatamente assim)
alter table public.movimentacoes
  add column if not exists "dataHora"                 text,
  add column if not exists cgm                        text,
  add column if not exists cpf                        text,
  add column if not exists rg                         text,
  add column if not exists nome_cursista              text,
  add column if not exists "nomeCursista"             text,
  add column if not exists email                      text,
  add column if not exists "emailCursista"            text,
  add column if not exists nre                        text,
  add column if not exists tipo_acao                  text,
  add column if not exists turma_anterior             text,
  add column if not exists turma_nova                 text,
  add column if not exists "turmaOrigem"              text,
  add column if not exists "formadorOrigem"           text,
  add column if not exists "tutorOrigem"              text,
  add column if not exists email_formador             text,
  add column if not exists email_formador_origem      text,
  add column if not exists email_tutor_responsavel    text,
  add column if not exists tutor                      text,
  add column if not exists tutor_responsavel          text,
  add column if not exists motivo                     text,
  add column if not exists "turnoDesejado"            text,
  add column if not exists "modalidadeDesejada"       text,
  add column if not exists justificativa              text,
  add column if not exists descricao                  text,
  add column if not exists comprovante                text,
  add column if not exists "solicitadoPor"            text,
  add column if not exists situacao_relacionada       text,
  add column if not exists ano_formacao               text,
  add column if not exists chamamento                 text,
  add column if not exists modalidade_detalhes        text,
  add column if not exists turma_detalhes             text,
  add column if not exists status                     text not null default 'Pendente',
  add column if not exists nota_resolucao             text,
  add column if not exists data_atendimento           timestamptz;

-- Índices para o histórico de turmas por cursista
create index if not exists idx_movimentacoes_cgm        on public.movimentacoes (cgm);
create index if not exists idx_movimentacoes_timestamp  on public.movimentacoes ("timestamp" desc);
create index if not exists idx_movimentacoes_tipo_acao  on public.movimentacoes (tipo_acao);

-- Segurança (RLS): o app usa a chave anon, então liberamos leitura/escrita.
-- Ajuste as políticas se quiser restringir por perfil.
alter table public.movimentacoes enable row level security;

drop policy if exists "movimentacoes_select" on public.movimentacoes;
drop policy if exists "movimentacoes_insert" on public.movimentacoes;
drop policy if exists "movimentacoes_update" on public.movimentacoes;
drop policy if exists "movimentacoes_delete" on public.movimentacoes;

create policy "movimentacoes_select" on public.movimentacoes for select using (true);
create policy "movimentacoes_insert" on public.movimentacoes for insert with check (true);
create policy "movimentacoes_update" on public.movimentacoes for update using (true) with check (true);
create policy "movimentacoes_delete" on public.movimentacoes for delete using (true);

-- Realtime (a tela de Movimentações assina as mudanças da tabela)
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'movimentacoes'
  ) then
    alter publication supabase_realtime add table public.movimentacoes;
  end if;
end $$;
