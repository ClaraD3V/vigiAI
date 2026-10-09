-- Plataforma (portal do cliente) — migration aditiva: não remove nada do schema inicial.
--
-- O que entra aqui:
--   * consentimento registrado no perfil;
--   * plano único (R$ 4,99/mês) — os planos antigos ficam inativos, não apagados;
--   * inscricoes: os números de inscrição que o usuário quer vigiar (1 linha = 1 inscrição);
--   * preferencias_envio: periodicidade (opção pré-definida) e canais de entrega;
--   * dados de exibição do pagamento simulado na assinatura (só bandeira/final, nunca o cartão);
--   * tabelas que o agente já grava (agent_*), agora com RLS para o portal ler com a chave pública;
--   * view agente_inscricoes: o que o agente precisa ler (nome + inscrição), via service_role;
--   * RPC excluir_minha_conta(): apaga o usuário e tudo que é dele.

-- 1. Consentimento -------------------------------------------------------------------------
alter table public.perfis
  add column if not exists consentimento_aceito_em timestamptz,
  add column if not exists consentimento_versao text;

-- 2. Plano único ---------------------------------------------------------------------------
update public.planos set ativo = false where identificador <> 'vigiai';

insert into public.planos (nome, identificador, descricao, preco, periodo_cobranca, max_canais_notificacao, ativo)
values ('vigiAI', 'vigiai', 'Monitoramento diário do Diário Oficial para todas as suas inscrições.', 4.99, 'mensal', 2, true)
on conflict (identificador) do update set
  nome = excluded.nome,
  descricao = excluded.descricao,
  preco = excluded.preco,
  max_canais_notificacao = excluded.max_canais_notificacao,
  ativo = true;

-- 3. Pagamento simulado (apenas o que aparece na tela) ------------------------------------
alter table public.assinaturas
  add column if not exists pagamento_bandeira text,
  add column if not exists pagamento_final text check (pagamento_final ~ '^[0-9]{4}$'),
  add column if not exists pagamento_titular text;

create unique index if not exists assinaturas_usuario_unica_idx on public.assinaturas(usuario_id);

-- 4. Inscrições ----------------------------------------------------------------------------
create table if not exists public.inscricoes (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null default auth.uid() references public.perfis(id) on delete cascade,
  numero_inscricao text not null check (numero_inscricao ~ '^[0-9A-Za-z./-]{2,30}$'),
  descricao text check (char_length(descricao) <= 80),
  ativo boolean not null default true,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  unique (usuario_id, numero_inscricao)
);

create index if not exists inscricoes_usuario_id_idx on public.inscricoes(usuario_id);

-- 5. Preferências de envio ---------------------------------------------------------------
create table if not exists public.preferencias_envio (
  usuario_id uuid primary key default auth.uid() references public.perfis(id) on delete cascade,
  periodicidade text not null default 'diario_08h'
    check (periodicidade in ('diario_08h','diario_20h','seg_qua_sex_08h','ter_sex_22h','semanal_seg_08h')),
  canal_email boolean not null default true,
  canal_whatsapp boolean not null default false,
  whatsapp text check (whatsapp is null or whatsapp ~ '^[0-9]{12,13}$'),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  check (canal_email or canal_whatsapp),
  check (not canal_whatsapp or whatsapp is not null)
);

do $$
declare tabela text;
begin
  foreach tabela in array array['inscricoes','preferencias_envio'] loop
    execute format('drop trigger if exists definir_atualizado_em on public.%I', tabela);
    execute format(
      'create trigger definir_atualizado_em before update on public.%I for each row execute procedure public.definir_atualizado_em()',
      tabela
    );
    execute format('alter table public.%I enable row level security', tabela);
    execute format('drop policy if exists "proprietario gerencia" on public.%I', tabela);
    execute format(
      'create policy "proprietario gerencia" on public.%I for all to authenticated using (usuario_id = (select auth.uid())) with check (usuario_id = (select auth.uid()))',
      tabela
    );
  end loop;
end $$;

-- 6. Tabelas do agente (mesmo formato de agent/supabase/schema.sql) ----------------------
-- O agente grava com a service_role (ignora RLS). O portal só lê:
--   * agent_daily_runs: execuções gerais, visíveis a qualquer usuário logado;
--   * snapshots/resultados: apenas os das inscrições do próprio usuário
--     (monitoring_id = inscricoes.id).
create table if not exists public.agent_daily_runs (
  id bigint generated always as identity primary key,
  run_at timestamptz not null,
  finished_at timestamptz,
  cities_synced integer not null default 0,
  monitorings_checked integer not null default 0,
  matches_found integer not null default 0,
  errors integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.agent_monitoring_snapshots (
  monitoring_id text primary key,
  city text,
  full_name text,
  registration_number text,
  status text,
  active boolean,
  documents_checked_count integer not null default 0,
  last_matched_at timestamptz,
  last_checked_at timestamptz,
  updated_at timestamptz not null default now()
);

create table if not exists public.agent_match_results (
  id bigint generated always as identity primary key,
  monitoring_id text not null references public.agent_monitoring_snapshots (monitoring_id) on delete cascade,
  found boolean not null,
  confidence numeric,
  confidence_level text,
  llm_arbitrated boolean not null default false,
  publication_type text,
  publication_title text,
  publication_url text,
  publication_deadline text,
  excerpt text,
  checked_at timestamptz not null default now()
);

create index if not exists agent_match_results_monitoring_id_idx on public.agent_match_results (monitoring_id);
create index if not exists agent_daily_runs_run_at_idx on public.agent_daily_runs (run_at desc);

alter table public.agent_daily_runs enable row level security;
alter table public.agent_monitoring_snapshots enable row level security;
alter table public.agent_match_results enable row level security;

drop policy if exists "logados leem execucoes" on public.agent_daily_runs;
create policy "logados leem execucoes" on public.agent_daily_runs
for select to authenticated using (true);

drop policy if exists "proprietario le snapshot" on public.agent_monitoring_snapshots;
create policy "proprietario le snapshot" on public.agent_monitoring_snapshots
for select to authenticated using (exists (
  select 1 from public.inscricoes i
  where i.id::text = monitoring_id and i.usuario_id = (select auth.uid())
));

drop policy if exists "proprietario le resultado" on public.agent_match_results;
create policy "proprietario le resultado" on public.agent_match_results
for select to authenticated using (exists (
  select 1 from public.inscricoes i
  where i.id::text = monitoring_id and i.usuario_id = (select auth.uid())
));

-- 7. O que o agente precisa ler ----------------------------------------------------------
-- Uma linha por inscrição ativa de assinante ativo, no formato do contrato do agente.
-- security_invoker: só a service_role (agente) enxerga tudo; um usuário comum só veria as dele.
create or replace view public.agente_inscricoes with (security_invoker = true) as
select
  i.id::text as monitoramento_id,
  upper(p.nome_completo) as nome_completo,
  i.numero_inscricao,
  'Santos'::text as cidade,
  pe.periodicidade,
  pe.canal_email,
  pe.canal_whatsapp,
  pe.whatsapp as telefone_whatsapp,
  p.email
from public.inscricoes i
join public.perfis p on p.id = i.usuario_id
join public.assinaturas a on a.usuario_id = i.usuario_id and a.status in ('teste','ativa')
left join public.preferencias_envio pe on pe.usuario_id = i.usuario_id
where i.ativo;

-- 8. Exclusão de conta -------------------------------------------------------------------
-- Apaga o usuário do Auth; o "on delete cascade" leva perfil, assinatura, inscrições,
-- preferências e histórico. Os registros do agente (chave texto) são apagados à parte.
create or replace function public.excluir_minha_conta()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'Não autenticado';
  end if;

  delete from public.agent_monitoring_snapshots s
  using public.inscricoes i
  where i.usuario_id = uid and s.monitoring_id = i.id::text;

  delete from auth.users where id = uid;
end;
$$;

revoke all on function public.excluir_minha_conta() from public, anon;
grant execute on function public.excluir_minha_conta() to authenticated;
