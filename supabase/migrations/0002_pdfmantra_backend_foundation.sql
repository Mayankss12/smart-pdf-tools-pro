-- PDFMantra Backend Foundation v1
-- Apply this in Supabase SQL Editor or through Supabase migrations.

create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  display_name text,
  avatar_url text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  original_name text not null,
  mime_type text not null default 'application/pdf',
  size_bytes bigint not null default 0 check (size_bytes >= 0),
  storage_bucket text not null default 'pdf-documents',
  storage_path text not null,
  checksum_sha256 text,
  source_tool text,
  status text not null default 'ready' check (status in ('uploading', 'ready', 'processing', 'failed', 'archived')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.document_versions (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.documents(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  version_kind text not null check (version_kind in ('original', 'annotated', 'signed', 'processed', 'exported')),
  storage_bucket text not null default 'pdf-outputs',
  storage_path text not null,
  size_bytes bigint not null default 0 check (size_bytes >= 0),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.annotation_projects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  document_id uuid references public.documents(id) on delete set null,
  title text not null default 'Untitled annotation project',
  annotation_payload jsonb not null default '[]'::jsonb,
  tool_state jsonb not null default '{}'::jsonb,
  latest_export_version_id uuid references public.document_versions(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.saved_signatures (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  label text not null default 'Signature',
  signature_kind text not null check (signature_kind in ('drawn', 'typed', 'image', 'initials')),
  signature_payload jsonb not null default '{}'::jsonb,
  storage_bucket text,
  storage_path text,
  is_default boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.processing_jobs (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  document_id uuid references public.documents(id) on delete set null,
  job_type text not null check (job_type in ('compress', 'ocr', 'pdf_to_word', 'word_to_pdf', 'protect', 'unlock', 'redact', 'batch_export')),
  status text not null default 'queued' check (status in ('queued', 'running', 'completed', 'failed', 'cancelled')),
  progress_percent integer not null default 0 check (progress_percent between 0 and 100),
  input_payload jsonb not null default '{}'::jsonb,
  output_payload jsonb not null default '{}'::jsonb,
  error_payload jsonb,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.tool_runs (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  tool_key text not null,
  execution_mode text not null default 'browser' check (execution_mode in ('browser', 'backend', 'hybrid')),
  status text not null default 'completed' check (status in ('started', 'completed', 'failed')),
  input_summary jsonb not null default '{}'::jsonb,
  result_summary jsonb not null default '{}'::jsonb,
  duration_ms integer check (duration_ms is null or duration_ms >= 0),
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.usage_counters (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  period_key text not null,
  tool_key text not null,
  operation_count integer not null default 0 check (operation_count >= 0),
  usage_units numeric(12, 2) not null default 0 check (usage_units >= 0),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (owner_id, period_key, tool_key)
);

create index if not exists documents_owner_created_idx on public.documents(owner_id, created_at desc);
create index if not exists document_versions_document_created_idx on public.document_versions(document_id, created_at desc);
create index if not exists annotation_projects_owner_updated_idx on public.annotation_projects(owner_id, updated_at desc);
create index if not exists saved_signatures_owner_updated_idx on public.saved_signatures(owner_id, updated_at desc);
create index if not exists processing_jobs_owner_created_idx on public.processing_jobs(owner_id, created_at desc);
create index if not exists processing_jobs_status_created_idx on public.processing_jobs(status, created_at asc);
create index if not exists tool_runs_owner_created_idx on public.tool_runs(owner_id, created_at desc);

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create trigger documents_set_updated_at
before update on public.documents
for each row execute function public.set_updated_at();

create trigger annotation_projects_set_updated_at
before update on public.annotation_projects
for each row execute function public.set_updated_at();

create trigger saved_signatures_set_updated_at
before update on public.saved_signatures
for each row execute function public.set_updated_at();

create trigger processing_jobs_set_updated_at
before update on public.processing_jobs
for each row execute function public.set_updated_at();

create trigger usage_counters_set_updated_at
before update on public.usage_counters
for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.documents enable row level security;
alter table public.document_versions enable row level security;
alter table public.annotation_projects enable row level security;
alter table public.saved_signatures enable row level security;
alter table public.processing_jobs enable row level security;
alter table public.tool_runs enable row level security;
alter table public.usage_counters enable row level security;

create policy "profiles_select_own" on public.profiles
for select using (auth.uid() = id);
create policy "profiles_insert_own" on public.profiles
for insert with check (auth.uid() = id);
create policy "profiles_update_own" on public.profiles
for update using (auth.uid() = id) with check (auth.uid() = id);

create policy "documents_select_own" on public.documents
for select using (auth.uid() = owner_id);
create policy "documents_insert_own" on public.documents
for insert with check (auth.uid() = owner_id);
create policy "documents_update_own" on public.documents
for update using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
create policy "documents_delete_own" on public.documents
for delete using (auth.uid() = owner_id);

create policy "document_versions_select_own" on public.document_versions
for select using (auth.uid() = owner_id);
create policy "document_versions_insert_own" on public.document_versions
for insert with check (auth.uid() = owner_id);
create policy "document_versions_update_own" on public.document_versions
for update using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
create policy "document_versions_delete_own" on public.document_versions
for delete using (auth.uid() = owner_id);

create policy "annotation_projects_select_own" on public.annotation_projects
for select using (auth.uid() = owner_id);
create policy "annotation_projects_insert_own" on public.annotation_projects
for insert with check (auth.uid() = owner_id);
create policy "annotation_projects_update_own" on public.annotation_projects
for update using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
create policy "annotation_projects_delete_own" on public.annotation_projects
for delete using (auth.uid() = owner_id);

create policy "saved_signatures_select_own" on public.saved_signatures
for select using (auth.uid() = owner_id);
create policy "saved_signatures_insert_own" on public.saved_signatures
for insert with check (auth.uid() = owner_id);
create policy "saved_signatures_update_own" on public.saved_signatures
for update using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
create policy "saved_signatures_delete_own" on public.saved_signatures
for delete using (auth.uid() = owner_id);

create policy "processing_jobs_select_own" on public.processing_jobs
for select using (auth.uid() = owner_id);
create policy "processing_jobs_insert_own" on public.processing_jobs
for insert with check (auth.uid() = owner_id);
create policy "processing_jobs_update_own" on public.processing_jobs
for update using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
create policy "processing_jobs_delete_own" on public.processing_jobs
for delete using (auth.uid() = owner_id);

create policy "tool_runs_select_own" on public.tool_runs
for select using (auth.uid() = owner_id);
create policy "tool_runs_insert_own" on public.tool_runs
for insert with check (auth.uid() = owner_id);
create policy "tool_runs_update_own" on public.tool_runs
for update using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
create policy "tool_runs_delete_own" on public.tool_runs
for delete using (auth.uid() = owner_id);

create policy "usage_counters_select_own" on public.usage_counters
for select using (auth.uid() = owner_id);
create policy "usage_counters_insert_own" on public.usage_counters
for insert with check (auth.uid() = owner_id);
create policy "usage_counters_update_own" on public.usage_counters
for update using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
create policy "usage_counters_delete_own" on public.usage_counters
for delete using (auth.uid() = owner_id);

insert into storage.buckets (id, name, public)
values
  ('pdf-documents', 'pdf-documents', false),
  ('pdf-outputs', 'pdf-outputs', false),
  ('pdf-signatures', 'pdf-signatures', false)
on conflict (id) do nothing;

create policy "documents_objects_select_own" on storage.objects
for select to authenticated
using (
  bucket_id = 'pdf-documents'
  and (storage.foldername(name))[1] = auth.uid()::text
);
create policy "documents_objects_insert_own" on storage.objects
for insert to authenticated
with check (
  bucket_id = 'pdf-documents'
  and (storage.foldername(name))[1] = auth.uid()::text
);
create policy "documents_objects_update_own" on storage.objects
for update to authenticated
using (
  bucket_id = 'pdf-documents'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'pdf-documents'
  and (storage.foldername(name))[1] = auth.uid()::text
);
create policy "documents_objects_delete_own" on storage.objects
for delete to authenticated
using (
  bucket_id = 'pdf-documents'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "outputs_objects_select_own" on storage.objects
for select to authenticated
using (
  bucket_id = 'pdf-outputs'
  and (storage.foldername(name))[1] = auth.uid()::text
);
create policy "outputs_objects_insert_own" on storage.objects
for insert to authenticated
with check (
  bucket_id = 'pdf-outputs'
  and (storage.foldername(name))[1] = auth.uid()::text
);
create policy "outputs_objects_update_own" on storage.objects
for update to authenticated
using (
  bucket_id = 'pdf-outputs'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'pdf-outputs'
  and (storage.foldername(name))[1] = auth.uid()::text
);
create policy "outputs_objects_delete_own" on storage.objects
for delete to authenticated
using (
  bucket_id = 'pdf-outputs'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "signatures_objects_select_own" on storage.objects
for select to authenticated
using (
  bucket_id = 'pdf-signatures'
  and (storage.foldername(name))[1] = auth.uid()::text
);
create policy "signatures_objects_insert_own" on storage.objects
for insert to authenticated
with check (
  bucket_id = 'pdf-signatures'
  and (storage.foldername(name))[1] = auth.uid()::text
);
create policy "signatures_objects_update_own" on storage.objects
for update to authenticated
using (
  bucket_id = 'pdf-signatures'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'pdf-signatures'
  and (storage.foldername(name))[1] = auth.uid()::text
);
create policy "signatures_objects_delete_own" on storage.objects
for delete to authenticated
using (
  bucket_id = 'pdf-signatures'
  and (storage.foldername(name))[1] = auth.uid()::text
);
