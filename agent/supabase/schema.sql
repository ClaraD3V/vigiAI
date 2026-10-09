-- Tabelas de leitura para o dashboard do front. Rode este SQL uma vez no
-- SQL Editor do projeto Supabase (Project Settings -> SQL Editor).
--
-- O agente grava aqui com a service_role key (bypassa RLS). Se o front for
-- ler diretamente do Supabase (em vez de só via API do agente), habilite RLS
-- e crie policies de leitura adequadas antes de expor a anon key no front.

create table if not exists agent_daily_runs (
  id bigint generated always as identity primary key,
  run_at timestamptz not null,
  finished_at timestamptz,
  cities_synced integer not null default 0,
  monitorings_checked integer not null default 0,
  matches_found integer not null default 0,
  errors integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists agent_monitoring_snapshots (
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

create table if not exists agent_match_results (
  id bigint generated always as identity primary key,
  monitoring_id text not null references agent_monitoring_snapshots (monitoring_id),
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

create index if not exists agent_match_results_monitoring_id_idx
  on agent_match_results (monitoring_id);
