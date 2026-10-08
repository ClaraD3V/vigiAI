create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  email text,
  phone text,
  cpf text,
  birth_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.plans (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  description text,
  price numeric(10,2) not null default 0 check (price >= 0),
  billing_period text not null default 'monthly',
  max_notification_channels integer not null check (max_notification_channels > 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  plan_id uuid not null references public.plans(id),
  status text not null default 'active' check (status in ('trialing','active','paused','canceled','expired')),
  started_at timestamptz not null default now(),
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.candidate_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  full_name text not null,
  registration_number text,
  cpf text,
  birth_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.monitors (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  candidate_profile_id uuid not null references public.candidate_profiles(id) on delete cascade,
  source_url text not null,
  source_name text,
  status text not null default 'pending' check (status in ('pending','active','paused','completed','error')),
  last_checked_at timestamptz,
  last_match_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.notification_channels (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null check (type in ('whatsapp','telegram','instagram')),
  destination text not null,
  is_verified boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.monitor_notification_channels (
  monitor_id uuid not null references public.monitors(id) on delete cascade,
  notification_channel_id uuid not null references public.notification_channels(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (monitor_id, notification_channel_id)
);

create table if not exists public.monitor_events (
  id uuid primary key default gen_random_uuid(),
  monitor_id uuid not null references public.monitors(id) on delete cascade,
  event_type text not null check (event_type in ('match_found','new_publication','status_changed','error')),
  title text,
  description text,
  source_url text,
  matched_value text,
  detected_at timestamptz not null default now(),
  notified_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  action text not null,
  resource_type text,
  resource_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

insert into public.plans (name, slug, description, price, max_notification_channels)
values
  ('Básico', 'basic', 'Para começar a acompanhar um processo.', 9.99, 1),
  ('Médio', 'medium', 'Mais monitoramentos e canais.', 14.99, 2),
  ('Pro', 'pro', 'Para acompanhar vários processos.', 19.99, 3)
on conflict (slug) do update set name = excluded.name, price = excluded.price,
  max_notification_channels = excluded.max_notification_channels;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, new.raw_user_meta_data ->> 'full_name')
  on conflict (id) do update set email = excluded.email, full_name = coalesce(excluded.full_name, profiles.full_name);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
for each row execute procedure public.handle_new_user();

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

do $$
declare t text;
begin
  foreach t in array array['profiles','subscriptions','candidate_profiles','monitors','notification_channels'] loop
    execute format('drop trigger if exists set_updated_at on public.%I', t);
    execute format('create trigger set_updated_at before update on public.%I for each row execute procedure public.set_updated_at()', t);
  end loop;
end $$;

create index if not exists monitors_user_id_idx on public.monitors(user_id);
create index if not exists events_monitor_id_idx on public.monitor_events(monitor_id);
create index if not exists channels_user_id_idx on public.notification_channels(user_id);

alter table public.profiles enable row level security;
alter table public.plans enable row level security;
alter table public.subscriptions enable row level security;
alter table public.candidate_profiles enable row level security;
alter table public.monitors enable row level security;
alter table public.notification_channels enable row level security;
alter table public.monitor_notification_channels enable row level security;
alter table public.monitor_events enable row level security;
alter table public.audit_logs enable row level security;

drop policy if exists "public reads active plans" on public.plans;
create policy "public reads active plans" on public.plans for select using (is_active = true);

do $$
declare t text;
begin
  foreach t in array array['subscriptions','candidate_profiles','monitors','notification_channels','audit_logs'] loop
    execute format('drop policy if exists "owner select" on public.%I', t);
    execute format('create policy "owner select" on public.%I for select using (user_id = auth.uid() or id = auth.uid())', t);
    execute format('drop policy if exists "owner insert" on public.%I', t);
    execute format('create policy "owner insert" on public.%I for insert with check (user_id = auth.uid() or id = auth.uid())', t);
    execute format('drop policy if exists "owner update" on public.%I', t);
    execute format('create policy "owner update" on public.%I for update using (user_id = auth.uid() or id = auth.uid()) with check (user_id = auth.uid() or id = auth.uid())', t);
    execute format('drop policy if exists "owner delete" on public.%I', t);
    execute format('create policy "owner delete" on public.%I for delete using (user_id = auth.uid() or id = auth.uid())', t);
  end loop;
end $$;

drop policy if exists "profile owner select" on public.profiles;
drop policy if exists "profile owner insert" on public.profiles;
drop policy if exists "profile owner update" on public.profiles;
drop policy if exists "profile owner delete" on public.profiles;
create policy "profile owner select" on public.profiles for select using (id = auth.uid());
create policy "profile owner insert" on public.profiles for insert with check (id = auth.uid());
create policy "profile owner update" on public.profiles for update using (id = auth.uid()) with check (id = auth.uid());
create policy "profile owner delete" on public.profiles for delete using (id = auth.uid());

drop policy if exists "monitor channel owner access" on public.monitor_notification_channels;
create policy "monitor channel owner access" on public.monitor_notification_channels
for all using (exists (select 1 from public.monitors m where m.id = monitor_id and m.user_id = auth.uid()))
with check (exists (select 1 from public.monitors m where m.id = monitor_id and m.user_id = auth.uid()));

drop policy if exists "event owner access" on public.monitor_events;
create policy "event owner access" on public.monitor_events
for select using (exists (select 1 from public.monitors m where m.id = monitor_id and m.user_id = auth.uid()));
