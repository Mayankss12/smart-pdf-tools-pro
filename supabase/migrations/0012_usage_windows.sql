-- PDFMantra: clean-export allowance counted in windows instead of calendar days.
--
-- Two limits apply together:
--   burst : 5 clean exports, then a cooldown until 5 hours after the first one.
--   daily : a total per 24 hours - 8 without an account, 15 with a free account.
-- Visitors without an account are also held to a ceiling per network address
-- (3x one visitor's allowance), so clearing browser data does not reset it.
--
-- usage_windows holds one row per identity: its current burst window and its
-- current 24-hour window. The application resets each in place when it ends.
-- Identities are a user id, an anonymous id ('anon_...'), or a keyed hash of a
-- network address ('ip_...', stored in anonymous_id; the raw address is never
-- stored). usage_daily is left untouched and keeps feeding the admin overview.
--
-- Apply this before deploying the application change that reads usage_windows.

-- 1) Window table (written only by the server with the service role)

create table if not exists public.usage_windows (
  id uuid primary key default gen_random_uuid(),

  user_id uuid references auth.users(id) on delete cascade,
  anonymous_id text,

  -- Burst window
  window_started_at timestamptz not null default now(),
  clean_exports_used integer not null default 0,

  -- 24-hour window
  day_window_started_at timestamptz not null default now(),
  day_exports_used integer not null default 0,

  watermarked_exports_used integer not null default 0,
  blocked_exports_count integer not null default 0,

  last_tool_key text,
  last_export_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint usage_windows_identity_check check (
    (user_id is not null and anonymous_id is null)
    or
    (user_id is null and anonymous_id is not null)
  ),
  constraint usage_windows_clean_exports_check check (clean_exports_used >= 0),
  constraint usage_windows_day_exports_check check (day_exports_used >= 0),
  constraint usage_windows_watermarked_exports_check check (watermarked_exports_used >= 0),
  constraint usage_windows_blocked_exports_check check (blocked_exports_count >= 0)
);

create unique index if not exists usage_windows_user_unique_idx
  on public.usage_windows(user_id)
  where user_id is not null;

create unique index if not exists usage_windows_anonymous_unique_idx
  on public.usage_windows(anonymous_id)
  where anonymous_id is not null;

create index if not exists usage_windows_window_started_at_idx
  on public.usage_windows(window_started_at desc);

drop trigger if exists usage_windows_touch_updated_at on public.usage_windows;
create trigger usage_windows_touch_updated_at
  before update on public.usage_windows
  for each row execute procedure public.touch_updated_at();

-- 2) Access: service role only. RLS stays on with no policies, so the browser
-- cannot read or change counters.

alter table public.usage_windows enable row level security;

revoke all on table public.usage_windows from public, anon, authenticated;
grant select, insert, update, delete on table public.usage_windows to service_role;

-- 3) Free accounts: raise the stored allowance from the old 5 to 15.
-- profiles.daily_export_limit is still the per-user override the admin console
-- edits, and now means "clean exports per 24 hours". Only free users still on
-- the old default of 5 are changed; any other value is left alone.

alter table public.profiles
  alter column daily_export_limit set default 15;

update public.profiles
set daily_export_limit = 15
where tier = 'free'
  and daily_export_limit = 5;

-- Rollback (manual):
--   drop table if exists public.usage_windows;
--   alter table public.profiles alter column daily_export_limit set default 5;
--   update public.profiles set daily_export_limit = 5 where tier = 'free' and daily_export_limit = 15;
