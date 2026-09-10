-- PDFMantra Priority 0: production security, capacity reporting and durable alerts.

begin;

-- Supabase's security advisor flags owner-rights views. Use the caller's RLS
-- context and keep the convenience view service-role-only.
create or replace view public.active_subscriptions
with (security_invoker = true)
as
select s.*
from public.subscriptions s
where s.status in ('trialing', 'active')
  and (s.current_period_end is null or s.current_period_end > now());

revoke all on table public.active_subscriptions from public, anon, authenticated;
grant select on table public.active_subscriptions to service_role;

create table if not exists public.operational_alerts (
  id uuid primary key default gen_random_uuid(),
  fingerprint text not null unique,
  severity text not null check (severity in ('warning', 'critical')),
  category text not null check (category in ('storage', 'workspace', 'processing', 'authentication', 'reliability')),
  status text not null default 'active' check (status in ('active', 'resolved')),
  title text not null,
  summary text not null,
  value double precision not null default 0,
  threshold double precision not null default 0,
  details jsonb not null default '{}'::jsonb,
  occurrences integer not null default 1 check (occurrences > 0),
  first_seen_at timestamptz not null default timezone('utc', now()),
  last_seen_at timestamptz not null default timezone('utc', now()),
  resolved_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists operational_alerts_status_severity_idx
  on public.operational_alerts(status, severity, last_seen_at desc);

alter table public.operational_alerts enable row level security;
revoke all on table public.operational_alerts from public, anon, authenticated;
grant select, insert, update, delete on table public.operational_alerts to service_role;

create or replace function public.workspace_storage_usage_bytes()
returns bigint
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(sum(size_bytes), 0)::bigint
  from public.document_versions
  where upload_status <> 'failed';
$$;

revoke all on function public.workspace_storage_usage_bytes()
  from public, anon, authenticated;
grant execute on function public.workspace_storage_usage_bytes()
  to service_role;

comment on table public.operational_alerts is
  'Service-role-only production health alerts. Details must never contain document data or credentials.';
comment on function public.workspace_storage_usage_bytes() is
  'Aggregate reserved workspace bytes for infrastructure capacity enforcement.';

commit;
