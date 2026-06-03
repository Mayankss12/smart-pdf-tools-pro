-- PDFMantra Phase 1: Usage tracking + entitlement foundation
-- No payment integration. No watermark system. No tool gating code yet.

create extension if not exists pgcrypto;

-- 1) Profiles entitlement fields
alter table public.profiles
  add column if not exists tier text not null default 'free',
  add column if not exists tier_expires_at timestamptz,
  add column if not exists daily_export_limit integer not null default 5;

alter table public.profiles
  drop constraint if exists profiles_tier_check;

alter table public.profiles
  add constraint profiles_tier_check
  check (tier in ('free', 'plus', 'pro', 'admin'));

alter table public.profiles
  drop constraint if exists profiles_daily_export_limit_check;

alter table public.profiles
  add constraint profiles_daily_export_limit_check
  check (daily_export_limit >= 0);

-- Keep existing plan_key aligned with new tier where possible.
update public.profiles
set
  tier = case
    when plan_key in ('plus', 'pro', 'admin') then plan_key
    else 'free'
  end,
  daily_export_limit = case
    when plan_key in ('plus', 'pro', 'admin') then 999999
    else 5
  end
where tier = 'free';

create index if not exists profiles_tier_idx
  on public.profiles(tier);

create index if not exists profiles_tier_expires_at_idx
  on public.profiles(tier_expires_at);

-- 2) Daily usage table
-- Guest users are tracked by anonymous_id.
-- Logged-in users are tracked by user_id.
-- Exactly one identity must be present per row.

create table if not exists public.usage_daily (
  id uuid primary key default gen_random_uuid(),

  user_id uuid references auth.users(id) on delete cascade,
  anonymous_id text,

  usage_date date not null default current_date,

  clean_exports_used integer not null default 0,
  watermarked_exports_used integer not null default 0,
  blocked_exports_count integer not null default 0,

  last_tool_key text,
  last_export_at timestamptz,

  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint usage_daily_identity_check check (
    (user_id is not null and anonymous_id is null)
    or
    (user_id is null and anonymous_id is not null)
  ),

  constraint usage_daily_clean_exports_check check (clean_exports_used >= 0),
  constraint usage_daily_watermarked_exports_check check (watermarked_exports_used >= 0),
  constraint usage_daily_blocked_exports_check check (blocked_exports_count >= 0)
);

create unique index if not exists usage_daily_user_date_unique_idx
  on public.usage_daily(user_id, usage_date)
  where user_id is not null;

create unique index if not exists usage_daily_anonymous_date_unique_idx
  on public.usage_daily(anonymous_id, usage_date)
  where anonymous_id is not null;

create index if not exists usage_daily_date_idx
  on public.usage_daily(usage_date desc);

create index if not exists usage_daily_last_tool_key_idx
  on public.usage_daily(last_tool_key);

-- 3) Subscriptions table
-- Payment provider fields are prepared for future Razorpay integration.
-- Phase 1 will not connect Razorpay yet.

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),

  user_id uuid not null references auth.users(id) on delete cascade,

  tier text not null default 'free',
  status text not null default 'inactive',

  billing_interval text,
  currency text not null default 'INR',
  amount_paise integer,

  provider text,
  provider_customer_id text,
  provider_subscription_id text,
  provider_plan_id text,

  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,

  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint subscriptions_tier_check check (tier in ('free', 'plus', 'pro', 'admin')),
  constraint subscriptions_status_check check (
    status in ('inactive', 'trialing', 'active', 'past_due', 'cancelled', 'expired')
  ),
  constraint subscriptions_billing_interval_check check (
    billing_interval is null or billing_interval in ('monthly', 'yearly')
  ),
  constraint subscriptions_amount_paise_check check (
    amount_paise is null or amount_paise >= 0
  )
);

create index if not exists subscriptions_user_id_idx
  on public.subscriptions(user_id);

create index if not exists subscriptions_status_idx
  on public.subscriptions(status);

create index if not exists subscriptions_tier_idx
  on public.subscriptions(tier);

create unique index if not exists subscriptions_provider_subscription_unique_idx
  on public.subscriptions(provider, provider_subscription_id)
  where provider is not null and provider_subscription_id is not null;

-- 4) updated_at triggers

drop trigger if exists usage_daily_touch_updated_at on public.usage_daily;
create trigger usage_daily_touch_updated_at
  before update on public.usage_daily
  for each row execute procedure public.touch_updated_at();

drop trigger if exists subscriptions_touch_updated_at on public.subscriptions;
create trigger subscriptions_touch_updated_at
  before update on public.subscriptions
  for each row execute procedure public.touch_updated_at();

-- 5) Enable RLS

alter table public.usage_daily enable row level security;
alter table public.subscriptions enable row level security;

-- 6) RLS policies
-- Logged-in users may read their own usage/subscription.
-- Direct client insert/update is intentionally not allowed for usage counters.
-- Usage writes should happen later through a server API route using the service role.
-- Guest anonymous usage should also be read/written through server API, not public RLS.

drop policy if exists "usage_daily_select_own" on public.usage_daily;
create policy "usage_daily_select_own"
  on public.usage_daily
  for select
  using (auth.uid() = user_id);

drop policy if exists "subscriptions_select_own" on public.subscriptions;
create policy "subscriptions_select_own"
  on public.subscriptions
  for select
  using (auth.uid() = user_id);

-- 7) Helper view for active subscriptions
-- This is read-only convenience for future entitlement checks.

create or replace view public.active_subscriptions as
select
  s.*
from public.subscriptions s
where
  s.status in ('trialing', 'active')
  and (
    s.current_period_end is null
    or s.current_period_end > now()
  );

-- 8) Notes:
-- Guest limit target: 1 clean export/day by anonymous_id.
-- Logged-in free limit target: 5 clean exports/day by user_id.
-- Plus/Pro target: unlimited reasonable usage handled in app logic.
-- Daily reset happens naturally through usage_date = current_date.
