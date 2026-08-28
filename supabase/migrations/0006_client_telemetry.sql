-- PDFMantra client reliability telemetry.
-- Stores technical performance/error data only. Document names, file content,
-- passwords, form values, email addresses and full URLs are forbidden by API validation.

create table if not exists public.client_telemetry (
  id uuid primary key default gen_random_uuid(),
  event_type text not null check (event_type in ('web-vital', 'client-error', 'unhandled-rejection')),
  route text not null default '/',
  metric_name text,
  metric_value double precision,
  rating text check (rating is null or rating in ('good', 'needs-improvement', 'poor')),
  error_name text,
  error_message text,
  error_digest text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists client_telemetry_created_idx
  on public.client_telemetry(created_at desc);
create index if not exists client_telemetry_event_created_idx
  on public.client_telemetry(event_type, created_at desc);
create index if not exists client_telemetry_metric_created_idx
  on public.client_telemetry(metric_name, created_at desc)
  where metric_name is not null;

alter table public.client_telemetry enable row level security;

-- No public policies: browser clients cannot access the table directly.
-- Same-origin writes and administrator reads go through service-role API routes.
revoke all on table public.client_telemetry from anon, authenticated;
grant select, insert, update, delete on table public.client_telemetry to service_role;

comment on table public.client_telemetry is
  'Technical reliability events only. Do not store document data, credentials, PII, or full URLs.';
