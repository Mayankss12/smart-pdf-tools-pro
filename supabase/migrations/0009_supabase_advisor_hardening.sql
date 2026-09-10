-- PDFMantra Priority 0: remove client execution rights from internal trigger
-- functions and pin mutable function resolution to the public schema.

begin;

alter function public.touch_updated_at()
  set search_path = public;

revoke all on function public.touch_updated_at()
  from public, anon, authenticated;
revoke all on function public.handle_new_profile()
  from public, anon, authenticated;
revoke all on function public.enforce_workspace_version_owner()
  from public, anon, authenticated;
revoke all on function public.rls_auto_enable()
  from public, anon, authenticated;

comment on function public.touch_updated_at() is
  'Internal trigger function. It is not callable through the public API.';
comment on function public.handle_new_profile() is
  'Internal auth trigger function. It is not callable through the public API.';
comment on function public.enforce_workspace_version_owner() is
  'Internal ownership trigger function. It is not callable through the public API.';
comment on function public.rls_auto_enable() is
  'Internal event-trigger helper. It is not callable through the public API.';

commit;
