-- PDFMantra OTP Attempt Limiting
-- Durable app-level brute-force protection for Supabase email OTP verification.
-- Apply this in Supabase SQL Editor or through Supabase migrations before deploying
-- the updated /api/auth/verify-otp route.

create extension if not exists pgcrypto;

create table if not exists public.otp_attempt_limits (
  scope text not null check (scope in ('identifier', 'ip')),
  key_hash text not null,
  failed_attempts integer not null default 0 check (failed_attempts >= 0),
  locked_until timestamptz,
  last_failed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (scope, key_hash)
);

create index if not exists otp_attempt_limits_locked_until_idx
  on public.otp_attempt_limits(locked_until)
  where locked_until is not null;

create or replace function public.record_otp_failed_attempt(
  p_scope text,
  p_key_hash text,
  p_max_failed_attempts integer default 5,
  p_lock_seconds integer default 600
)
returns table (
  scope text,
  key_hash text,
  failed_attempts integer,
  locked_until timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_now timestamptz := timezone('utc', now());
  v_existing public.otp_attempt_limits%rowtype;
  v_next_failed_attempts integer;
  v_next_locked_until timestamptz;
begin
  if p_scope not in ('identifier', 'ip') then
    raise exception 'Invalid OTP attempt scope';
  end if;

  if p_key_hash is null or length(trim(p_key_hash)) = 0 then
    raise exception 'Invalid OTP attempt key';
  end if;

  select *
    into v_existing
    from public.otp_attempt_limits existing
   where existing.scope = p_scope
     and existing.key_hash = p_key_hash
   for update;

  if found and v_existing.locked_until is not null and v_existing.locked_until > v_now then
    scope := v_existing.scope;
    key_hash := v_existing.key_hash;
    failed_attempts := v_existing.failed_attempts;
    locked_until := v_existing.locked_until;
    return next;
    return;
  end if;

  v_next_failed_attempts := coalesce(v_existing.failed_attempts, 0) + 1;
  v_next_locked_until := case
    when v_next_failed_attempts >= p_max_failed_attempts
      then v_now + make_interval(secs => p_lock_seconds)
    else null
  end;

  insert into public.otp_attempt_limits as limits (
    scope,
    key_hash,
    failed_attempts,
    locked_until,
    last_failed_at,
    created_at,
    updated_at
  ) values (
    p_scope,
    p_key_hash,
    v_next_failed_attempts,
    v_next_locked_until,
    v_now,
    v_now,
    v_now
  )
  on conflict (scope, key_hash) do update set
    failed_attempts = excluded.failed_attempts,
    locked_until = excluded.locked_until,
    last_failed_at = excluded.last_failed_at,
    updated_at = excluded.updated_at
  returning limits.scope, limits.key_hash, limits.failed_attempts, limits.locked_until
    into scope, key_hash, failed_attempts, locked_until;

  return next;
end;
$$;

create or replace function public.clear_otp_attempts(p_key_hashes text[])
returns void
language sql
security definer
set search_path = public
as $$
  delete from public.otp_attempt_limits
   where key_hash = any(p_key_hashes);
$$;

revoke all on table public.otp_attempt_limits from anon, authenticated;
revoke all on function public.record_otp_failed_attempt(text, text, integer, integer) from anon, authenticated;
revoke all on function public.clear_otp_attempts(text[]) from anon, authenticated;
