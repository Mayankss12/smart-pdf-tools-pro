create extension if not exists pgcrypto;

create type public.document_kind as enum (
  'original',
  'annotated',
  'signed',
  'processed',
  'converted'
);

create type public.processing_job_status as enum (
  'queued',
  'processing',
  'completed',
  'failed',
  'cancelled'
);

create type public.processing_job_type as enum (
  'ocr_pdf',
  'compress_pdf',
  'pdf_to_word',
  'word_to_pdf',
  'protect_pdf',
  'unlock_pdf',
  'large_merge',
  'large_split',
  'server_export'
);

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  avatar_url text,
  plan_key text not null default 'free',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  original_file_name text,
  mime_type text not null default 'application/pdf',
  size_bytes bigint not null default 0,
  page_count integer,
  storage_bucket text not null,
  storage_path text not null,
  latest_version_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.document_versions (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.documents(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  kind public.document_kind not null default 'original',
  storage_bucket text not null,
  storage_path text not null,
  size_bytes bigint not null default 0,
  checksum_sha256 text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.documents
  drop constraint if exists documents_latest_version_id_fkey;

alter table public.documents
  add constraint documents_latest_version_id_fkey
  foreign key (latest_version_id)
  references public.document_versions(id)
  on delete set null;

create table if not exists public.annotation_projects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  document_id uuid references public.documents(id) on delete cascade,
  title text not null default 'Untitled Annotation Project',
  schema_version integer not null default 1,
  annotations jsonb not null default '[]'::jsonb,
  viewport_state jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.saved_signatures (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  label text not null default 'My Signature',
  signature_type text not null check (signature_type in ('drawn', 'typed', 'uploaded', 'initials')),
  payload jsonb not null default '{}'::jsonb,
  storage_bucket text,
  storage_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.processing_jobs (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references auth.users(id) on delete cascade,
  job_type public.processing_job_type not null,
  status public.processing_job_status not null default 'queued',
  input_document_id uuid references public.documents(id) on delete set null,
  input_version_id uuid references public.document_versions(id) on delete set null,
  output_document_id uuid references public.documents(id) on delete set null,
  output_version_id uuid references public.document_versions(id) on delete set null,
  progress integer not null default 0 check (progress >= 0 and progress <= 100),
  request_payload jsonb not null default '{}'::jsonb,
  result_payload jsonb not null default '{}'::jsonb,
  error_message text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.tool_runs (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references auth.users(id) on delete set null,
  tool_key text not null,
  execution_mode text not null check (execution_mode in ('browser', 'backend', 'hybrid')),
  input_size_bytes bigint,
  output_size_bytes bigint,
  duration_ms integer,
  status text not null check (status in ('started', 'completed', 'failed')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.usage_counters (
  owner_id uuid not null references auth.users(id) on delete cascade,
  period_key text not null,
  tool_key text not null,
  run_count integer not null default 0,
  processed_bytes bigint not null default 0,
  updated_at timestamptz not null default now(),
  primary key (owner_id, period_key, tool_key)
);

create index if not exists documents_owner_updated_idx
  on public.documents(owner_id, updated_at desc);

create index if not exists document_versions_document_created_idx
  on public.document_versions(document_id, created_at desc);

create index if not exists annotation_projects_owner_updated_idx
  on public.annotation_projects(owner_id, updated_at desc);

create index if not exists saved_signatures_owner_updated_idx
  on public.saved_signatures(owner_id, updated_at desc);

create index if not exists processing_jobs_owner_created_idx
  on public.processing_jobs(owner_id, created_at desc);

create index if not exists processing_jobs_status_created_idx
  on public.processing_jobs(status, created_at asc);

create index if not exists tool_runs_owner_created_idx
  on public.tool_runs(owner_id, created_at desc);

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.handle_new_profile()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do update set
    email = excluded.email,
    full_name = coalesce(excluded.full_name, public.profiles.full_name),
    avatar_url = coalesce(excluded.avatar_url, public.profiles.avatar_url),
    updated_at = now();

  return new;
end;
$$;

drop trigger if exists on_auth_user_created_profile on auth.users;
create trigger on_auth_user_created_profile
  after insert on auth.users
  for each row execute procedure public.handle_new_profile();

drop trigger if exists profiles_touch_updated_at on public.profiles;
create trigger profiles_touch_updated_at
  before update on public.profiles
  for each row execute procedure public.touch_updated_at();

drop trigger if exists documents_touch_updated_at on public.documents;
create trigger documents_touch_updated_at
  before update on public.documents
  for each row execute procedure public.touch_updated_at();

drop trigger if exists annotation_projects_touch_updated_at on public.annotation_projects;
create trigger annotation_projects_touch_updated_at
  before update on public.annotation_projects
  for each row execute procedure public.touch_updated_at();

drop trigger if exists saved_signatures_touch_updated_at on public.saved_signatures;
create trigger saved_signatures_touch_updated_at
  before update on public.saved_signatures
  for each row execute procedure public.touch_updated_at();

drop trigger if exists processing_jobs_touch_updated_at on public.processing_jobs;
create trigger processing_jobs_touch_updated_at
  before update on public.processing_jobs
  for each row execute procedure public.touch_updated_at();

alter table public.profiles enable row level security;
alter table public.documents enable row level security;
alter table public.document_versions enable row level security;
alter table public.annotation_projects enable row level security;
alter table public.saved_signatures enable row level security;
alter table public.processing_jobs enable row level security;
alter table public.tool_runs enable row level security;
alter table public.usage_counters enable row level security;

create policy "profiles_select_own"
  on public.profiles
  for select
  using (auth.uid() = id);

create policy "profiles_update_own"
  on public.profiles
  for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

create policy "documents_manage_own"
  on public.documents
  for all
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

create policy "document_versions_manage_own"
  on public.document_versions
  for all
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

create policy "annotation_projects_manage_own"
  on public.annotation_projects
  for all
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

create policy "saved_signatures_manage_own"
  on public.saved_signatures
  for all
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

create policy "processing_jobs_select_own"
  on public.processing_jobs
  for select
  using (auth.uid() = owner_id);

create policy "processing_jobs_insert_own"
  on public.processing_jobs
  for insert
  with check (auth.uid() = owner_id);

create policy "tool_runs_select_own"
  on public.tool_runs
  for select
  using (auth.uid() = owner_id);

create policy "usage_counters_select_own"
  on public.usage_counters
  for select
  using (auth.uid() = owner_id);
