-- Keep reusable customer signatures private, bounded, and PNG-only.

begin;

update storage.buckets
set public = false,
    file_size_limit = 2097152,
    allowed_mime_types = array['image/png']::text[]
where id = 'pdf-signatures';

alter table public.saved_signatures
  drop constraint if exists saved_signatures_label_length;
alter table public.saved_signatures
  add constraint saved_signatures_label_length
  check (char_length(label) between 1 and 60);

create or replace function public.enforce_saved_signature_limit()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(new.owner_id::text, 0)
  );
  if (
    select count(*) >= 12
    from public.saved_signatures
    where owner_id = new.owner_id
  ) then
    raise exception 'Saved signature limit reached' using errcode = '23514';
  end if;
  return new;
end;
$$;

revoke all on function public.enforce_saved_signature_limit() from public, anon, authenticated;

drop trigger if exists saved_signatures_limit_insert on public.saved_signatures;
create trigger saved_signatures_limit_insert
before insert on public.saved_signatures
for each row execute function public.enforce_saved_signature_limit();

comment on table public.saved_signatures is
  'Private reusable visual signatures owned by one authenticated customer. Images remain in the private pdf-signatures bucket.';

commit;
