-- PDFMantra Stage 2C: private document workspace and durable version history.
-- This migration reconciles the original foundation schema without exposing
-- document bytes publicly. File objects remain under <auth.uid()>/... paths.

begin;

create extension if not exists pgcrypto;

alter table public.documents
  add column if not exists status text not null default 'ready',
  add column if not exists checksum_sha256 text,
  add column if not exists source_tool text,
  add column if not exists metadata jsonb not null default '{}'::jsonb,
  add column if not exists archived_at timestamptz;

alter table public.documents
  drop constraint if exists documents_workspace_status_check;

alter table public.documents
  add constraint documents_workspace_status_check
  check (status in ('uploading', 'processing', 'ready', 'failed', 'archived'));

alter table public.document_versions
  add column if not exists version_number integer,
  add column if not exists label text,
  add column if not exists upload_status text not null default 'ready',
  add column if not exists mime_type text not null default 'application/pdf',
  add column if not exists page_count integer,
  add column if not exists checksum_sha256 text,
  add column if not exists metadata jsonb not null default '{}'::jsonb;

with ranked_versions as (
  select
    id,
    row_number() over (
      partition by document_id
      order by created_at asc, id asc
    )::integer as calculated_version_number
  from public.document_versions
)
update public.document_versions as version
set version_number = ranked.calculated_version_number
from ranked_versions as ranked
where version.id = ranked.id
  and version.version_number is null;

alter table public.document_versions
  alter column version_number set not null;

alter table public.document_versions
  drop constraint if exists document_versions_version_number_check;

alter table public.document_versions
  add constraint document_versions_version_number_check
  check (version_number > 0);

alter table public.document_versions
  drop constraint if exists document_versions_upload_status_check;

alter table public.document_versions
  add constraint document_versions_upload_status_check
  check (upload_status in ('uploading', 'ready', 'failed'));

create unique index if not exists document_versions_document_number_unique_idx
  on public.document_versions(document_id, version_number);

create index if not exists document_versions_owner_created_idx
  on public.document_versions(owner_id, created_at desc);

create index if not exists document_versions_upload_status_idx
  on public.document_versions(upload_status, created_at asc);

create index if not exists documents_owner_status_updated_idx
  on public.documents(owner_id, status, updated_at desc);

create table if not exists public.workspace_events (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null,
  document_id uuid,
  version_id uuid,
  event_type text not null check (
    event_type in (
      'document_created',
      'version_created',
      'version_restored',
      'version_deleted',
      'document_renamed',
      'document_archived',
      'document_deleted',
      'upload_failed'
    )
  ),
  actor_type text not null default 'user' check (actor_type in ('user', 'admin', 'system')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.workspace_events
  drop constraint if exists workspace_events_event_type_check;

alter table public.workspace_events
  add constraint workspace_events_event_type_check check (
    event_type in (
      'document_created',
      'version_created',
      'version_restored',
      'version_deleted',
      'document_renamed',
      'document_archived',
      'document_deleted',
      'upload_failed'
    )
  );

create index if not exists workspace_events_owner_created_idx
  on public.workspace_events(owner_id, created_at desc);

create index if not exists workspace_events_document_created_idx
  on public.workspace_events(document_id, created_at desc);

alter table public.workspace_events enable row level security;

-- Workspace metadata is server-managed so account quotas, version numbers,
-- storage paths, and audit events cannot be bypassed by a browser client.
drop policy if exists "documents_manage_own" on public.documents;
drop policy if exists "documents_select_own" on public.documents;
drop policy if exists "documents_insert_own" on public.documents;
drop policy if exists "documents_update_own" on public.documents;
drop policy if exists "documents_delete_own" on public.documents;
create policy "documents_select_own"
  on public.documents for select using (auth.uid() = owner_id);

drop policy if exists "document_versions_manage_own" on public.document_versions;
drop policy if exists "document_versions_select_own" on public.document_versions;
drop policy if exists "document_versions_insert_own" on public.document_versions;
drop policy if exists "document_versions_update_own" on public.document_versions;
drop policy if exists "document_versions_delete_own" on public.document_versions;
create policy "document_versions_select_own"
  on public.document_versions for select using (auth.uid() = owner_id);

drop policy if exists "workspace_events_select_own" on public.workspace_events;
create policy "workspace_events_select_own"
  on public.workspace_events
  for select
  using (auth.uid() = owner_id);

-- Events are written only by trusted server code. No authenticated insert,
-- update, or delete policy is intentionally created.

create or replace function public.enforce_workspace_version_owner()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  document_owner uuid;
begin
  select owner_id into document_owner
  from public.documents
  where id = new.document_id;

  if document_owner is null or document_owner <> new.owner_id then
    raise exception 'Document version owner must match document owner.';
  end if;

  return new;
end;
$$;

drop trigger if exists document_versions_enforce_owner on public.document_versions;
create trigger document_versions_enforce_owner
  before insert or update of document_id, owner_id
  on public.document_versions
  for each row execute procedure public.enforce_workspace_version_owner();

create or replace function public.finalize_workspace_version(
  target_owner uuid,
  target_document uuid,
  target_version uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  selected_version public.document_versions%rowtype;
begin
  select * into selected_version
  from public.document_versions
  where id = target_version
    and document_id = target_document
    and owner_id = target_owner
    and upload_status = 'uploading'
  for update;

  if selected_version.id is null then
    raise exception 'Workspace version is not awaiting finalization.';
  end if;

  update public.document_versions
  set upload_status = 'ready'
  where id = target_version;

  update public.documents
  set
    latest_version_id = selected_version.id,
    size_bytes = selected_version.size_bytes,
    page_count = selected_version.page_count,
    checksum_sha256 = selected_version.checksum_sha256,
    storage_bucket = selected_version.storage_bucket,
    storage_path = selected_version.storage_path,
    status = 'ready'
  where id = target_document
    and owner_id = target_owner;

  if not found then
    raise exception 'Workspace document ownership check failed.';
  end if;
end;
$$;

create or replace function public.restore_workspace_version(
  target_owner uuid,
  target_document uuid,
  target_version uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  selected_version public.document_versions%rowtype;
begin
  select * into selected_version
  from public.document_versions
  where id = target_version
    and document_id = target_document
    and owner_id = target_owner
    and upload_status = 'ready';

  if selected_version.id is null then
    raise exception 'Workspace version is not restorable.';
  end if;

  update public.documents
  set
    latest_version_id = selected_version.id,
    size_bytes = selected_version.size_bytes,
    page_count = selected_version.page_count,
    checksum_sha256 = selected_version.checksum_sha256,
    storage_bucket = selected_version.storage_bucket,
    storage_path = selected_version.storage_path,
    status = 'ready'
  where id = target_document
    and owner_id = target_owner;

  if not found then
    raise exception 'Workspace document ownership check failed.';
  end if;
end;
$$;

revoke all on function public.finalize_workspace_version(uuid, uuid, uuid)
  from public, anon, authenticated;
revoke all on function public.restore_workspace_version(uuid, uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.finalize_workspace_version(uuid, uuid, uuid)
  to service_role;
grant execute on function public.restore_workspace_version(uuid, uuid, uuid)
  to service_role;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'pdf-documents',
  'pdf-documents',
  false,
  1073741824,
  array['application/pdf']::text[]
)
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "documents_bucket_select_own" on storage.objects;
drop policy if exists "documents_bucket_insert_own" on storage.objects;
drop policy if exists "documents_bucket_update_own" on storage.objects;
drop policy if exists "documents_bucket_delete_own" on storage.objects;
drop policy if exists "documents_objects_select_own" on storage.objects;
drop policy if exists "documents_objects_insert_own" on storage.objects;
drop policy if exists "documents_objects_update_own" on storage.objects;
drop policy if exists "documents_objects_delete_own" on storage.objects;

-- Browser uploads use short-lived, server-issued signed upload tickets.
-- Downloads use short-lived signed download URLs. No general authenticated
-- object policy is intentionally retained, so quotas cannot be bypassed by
-- writing arbitrary objects directly to this bucket.

comment on table public.workspace_events is
  'Append-oriented server audit history for private document workspace actions.';

comment on column public.document_versions.version_number is
  'Monotonic display number scoped to one document.';

commit;
