-- PDFMantra administrator audit hardening.
-- Preserve normal owner-managed tool-run rows while preventing authenticated
-- clients from creating, mutating, or deleting administrator audit records.
-- Server-side service-role clients bypass RLS and remain able to write/finalize
-- these audit rows through the guarded administrator API.

drop policy if exists "tool_runs_owner_write" on public.tool_runs;

drop policy if exists "tool_runs_owner_insert" on public.tool_runs;
drop policy if exists "tool_runs_owner_update" on public.tool_runs;
drop policy if exists "tool_runs_owner_delete" on public.tool_runs;

create policy "tool_runs_owner_insert"
  on public.tool_runs for insert
  with check (
    owner_id = auth.uid()
    and tool_key <> 'admin.profile.update'
  );

create policy "tool_runs_owner_update"
  on public.tool_runs for update
  using (
    owner_id = auth.uid()
    and tool_key <> 'admin.profile.update'
  )
  with check (
    owner_id = auth.uid()
    and tool_key <> 'admin.profile.update'
  );

create policy "tool_runs_owner_delete"
  on public.tool_runs for delete
  using (
    owner_id = auth.uid()
    and tool_key <> 'admin.profile.update'
  );
