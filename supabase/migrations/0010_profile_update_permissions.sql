-- PDFMantra account hardening: authenticated users may edit presentation-only
-- profile fields, never plan, entitlement, email, or quota columns.

begin;

revoke update on table public.profiles from anon, authenticated;
grant update (full_name, avatar_url) on table public.profiles to authenticated;

comment on column public.profiles.full_name is
  'Customer-editable display name. Protected by owner RLS and column privileges.';
comment on column public.profiles.avatar_url is
  'Customer-editable avatar reference. Protected by owner RLS and column privileges.';

commit;
