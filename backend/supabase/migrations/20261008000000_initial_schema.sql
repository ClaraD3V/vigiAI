create extension if not exists pgcrypto;

create table if not exists public.perfis (
  id uuid primary key references auth.users(id) on delete cascade,
  nome_completo text,
  email text,
  telefone text,
  cpf text,
  data_nascimento date,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create table if not exists public.planos (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  identificador text unique not null,
  descricao text,
  preco numeric(10,2) not null default 0 check (preco >= 0),
  periodo_cobranca text not null default 'mensal',
  max_canais_notificacao integer not null check (max_canais_notificacao > 0),
  ativo boolean not null default true,
  criado_em timestamptz not null default now()
);

create table if not exists public.assinaturas (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references public.perfis(id) on delete cascade,
  plano_id uuid not null references public.planos(id),
  status text not null default 'ativa' check (status in ('teste','ativa','pausada','cancelada','expirada')),
  iniciada_em timestamptz not null default now(),
  expira_em timestamptz,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create table if not exists public.perfis_candidatos (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references public.perfis(id) on delete cascade,
  nome_completo text not null,
  numero_inscricao text,
  cpf text,
  data_nascimento date,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create table if not exists public.monitoramentos (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references public.perfis(id) on delete cascade,
  perfil_candidato_id uuid not null references public.perfis_candidatos(id) on delete cascade,
  url_fonte text not null,
  nome_fonte text,
  status text not null default 'pendente'
    check (status in ('pendente','ativo','pausado','concluido','erro')),
  verificado_em timestamptz,
  ultima_ocorrencia_em timestamptz,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create table if not exists public.canais_notificacao (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references public.perfis(id) on delete cascade,
  tipo text not null check (tipo in ('whatsapp','telegram','instagram')),
  destino text not null,
  verificado boolean not null default false,
  ativo boolean not null default true,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create table if not exists public.monitoramentos_canais_notificacao (
  monitoramento_id uuid not null references public.monitoramentos(id) on delete cascade,
  canal_notificacao_id uuid not null references public.canais_notificacao(id) on delete cascade,
  criado_em timestamptz not null default now(),
  primary key (monitoramento_id, canal_notificacao_id)
);

create table if not exists public.eventos_monitoramento (
  id uuid primary key default gen_random_uuid(),
  monitoramento_id uuid not null references public.monitoramentos(id) on delete cascade,
  tipo_evento text not null check (tipo_evento in ('ocorrencia_encontrada','nova_publicacao','status_alterado','erro')),
  titulo text,
  descricao text,
  url_fonte text,
  valor_correspondente text,
  detectado_em timestamptz not null default now(),
  notificado_em timestamptz,
  criado_em timestamptz not null default now()
);

create table if not exists public.logs_auditoria (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references public.perfis(id) on delete cascade,
  acao text not null,
  tipo_recurso text,
  id_recurso uuid,
  metadados jsonb not null default '{}'::jsonb,
  criado_em timestamptz not null default now()
);

insert into public.planos (nome, identificador, descricao, preco, max_canais_notificacao)
values
  ('Básico', 'basico', 'Para começar a acompanhar um processo.', 9.99, 1),
  ('Médio', 'medio', 'Mais monitoramentos e canais.', 14.99, 2),
  ('Pro', 'pro', 'Para acompanhar vários processos.', 19.99, 3)
on conflict (identificador) do update set
  nome = excluded.nome,
  preco = excluded.preco,
  max_canais_notificacao = excluded.max_canais_notificacao;

create or replace function public.criar_perfil_novo_usuario()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  insert into public.perfis (id, email, nome_completo)
  values (new.id, new.email, new.raw_user_meta_data ->> 'full_name')
  on conflict (id) do update set
    email = excluded.email,
    nome_completo = coalesce(excluded.nome_completo, public.perfis.nome_completo);
  return new;
end;
$$;

drop trigger if exists ao_criar_usuario on auth.users;
create trigger ao_criar_usuario after insert on auth.users
for each row execute procedure public.criar_perfil_novo_usuario();

create or replace function public.definir_atualizado_em()
returns trigger language plpgsql as $$
begin
  new.atualizado_em = now();
  return new;
end;
$$;

do $$
declare tabela text;
begin
  foreach tabela in array array['perfis','assinaturas','perfis_candidatos','monitoramentos','canais_notificacao'] loop
    execute format('drop trigger if exists definir_atualizado_em on public.%I', tabela);
    execute format(
      'create trigger definir_atualizado_em before update on public.%I for each row execute procedure public.definir_atualizado_em()',
      tabela
    );
  end loop;
end $$;

create index if not exists monitoramentos_usuario_id_idx on public.monitoramentos(usuario_id);
create index if not exists eventos_monitoramento_id_idx on public.eventos_monitoramento(monitoramento_id);
create index if not exists canais_notificacao_usuario_id_idx on public.canais_notificacao(usuario_id);

alter table public.perfis enable row level security;
alter table public.planos enable row level security;
alter table public.assinaturas enable row level security;
alter table public.perfis_candidatos enable row level security;
alter table public.monitoramentos enable row level security;
alter table public.canais_notificacao enable row level security;
alter table public.monitoramentos_canais_notificacao enable row level security;
alter table public.eventos_monitoramento enable row level security;
alter table public.logs_auditoria enable row level security;

drop policy if exists "leitura publica de planos ativos" on public.planos;
create policy "leitura publica de planos ativos" on public.planos
for select using (ativo = true);

do $$
declare tabela text;
begin
  foreach tabela in array array['assinaturas','perfis_candidatos','monitoramentos','canais_notificacao','logs_auditoria'] loop
    execute format('drop policy if exists "proprietario seleciona" on public.%I', tabela);
    execute format(
      'create policy "proprietario seleciona" on public.%I for select using (usuario_id = auth.uid())',
      tabela
    );
    execute format('drop policy if exists "proprietario insere" on public.%I', tabela);
    execute format(
      'create policy "proprietario insere" on public.%I for insert with check (usuario_id = auth.uid())',
      tabela
    );
    execute format('drop policy if exists "proprietario atualiza" on public.%I', tabela);
    execute format(
      'create policy "proprietario atualiza" on public.%I for update using (usuario_id = auth.uid()) with check (usuario_id = auth.uid())',
      tabela
    );
    execute format('drop policy if exists "proprietario exclui" on public.%I', tabela);
    execute format(
      'create policy "proprietario exclui" on public.%I for delete using (usuario_id = auth.uid())',
      tabela
    );
  end loop;
end $$;

drop policy if exists "proprietario seleciona perfil" on public.perfis;
drop policy if exists "proprietario insere perfil" on public.perfis;
drop policy if exists "proprietario atualiza perfil" on public.perfis;
drop policy if exists "proprietario exclui perfil" on public.perfis;
create policy "proprietario seleciona perfil" on public.perfis
for select using (id = auth.uid());
create policy "proprietario insere perfil" on public.perfis
for insert with check (id = auth.uid());
create policy "proprietario atualiza perfil" on public.perfis
for update using (id = auth.uid()) with check (id = auth.uid());
create policy "proprietario exclui perfil" on public.perfis
for delete using (id = auth.uid());

drop policy if exists "proprietario acessa canais do monitoramento"
  on public.monitoramentos_canais_notificacao;
create policy "proprietario acessa canais do monitoramento"
on public.monitoramentos_canais_notificacao
for all
using (exists (
  select 1 from public.monitoramentos m
  where m.id = monitoramento_id and m.usuario_id = auth.uid()
))
with check (exists (
  select 1 from public.monitoramentos m
  where m.id = monitoramento_id and m.usuario_id = auth.uid()
));

drop policy if exists "proprietario acessa eventos do monitoramento"
  on public.eventos_monitoramento;
create policy "proprietario acessa eventos do monitoramento"
on public.eventos_monitoramento
for select using (exists (
  select 1 from public.monitoramentos m
  where m.id = monitoramento_id and m.usuario_id = auth.uid()
));
