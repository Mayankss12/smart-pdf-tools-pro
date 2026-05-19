insert into storage.buckets (id, name, public)
values
  ('pdf-documents', 'pdf-documents', false),
  ('pdf-outputs', 'pdf-outputs', false),
  ('pdf-signatures', 'pdf-signatures', false)
on conflict (id) do nothing;

create policy "documents_bucket_select_own"
  on storage.objects
  for select
  using (
    bucket_id = 'pdf-documents'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "documents_bucket_insert_own"
  on storage.objects
  for insert
  with check (
    bucket_id = 'pdf-documents'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "documents_bucket_update_own"
  on storage.objects
  for update
  using (
    bucket_id = 'pdf-documents'
    and auth.uid()::text = (storage.foldername(name))[1]
  )
  with check (
    bucket_id = 'pdf-documents'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "documents_bucket_delete_own"
  on storage.objects
  for delete
  using (
    bucket_id = 'pdf-documents'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "outputs_bucket_select_own"
  on storage.objects
  for select
  using (
    bucket_id = 'pdf-outputs'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "outputs_bucket_insert_own"
  on storage.objects
  for insert
  with check (
    bucket_id = 'pdf-outputs'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "outputs_bucket_update_own"
  on storage.objects
  for update
  using (
    bucket_id = 'pdf-outputs'
    and auth.uid()::text = (storage.foldername(name))[1]
  )
  with check (
    bucket_id = 'pdf-outputs'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "outputs_bucket_delete_own"
  on storage.objects
  for delete
  using (
    bucket_id = 'pdf-outputs'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "signatures_bucket_select_own"
  on storage.objects
  for select
  using (
    bucket_id = 'pdf-signatures'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "signatures_bucket_insert_own"
  on storage.objects
  for insert
  with check (
    bucket_id = 'pdf-signatures'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "signatures_bucket_update_own"
  on storage.objects
  for update
  using (
    bucket_id = 'pdf-signatures'
    and auth.uid()::text = (storage.foldername(name))[1]
  )
  with check (
    bucket_id = 'pdf-signatures'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "signatures_bucket_delete_own"
  on storage.objects
  for delete
  using (
    bucket_id = 'pdf-signatures'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
