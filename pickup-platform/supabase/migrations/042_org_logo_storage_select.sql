-- Upsert uploads check for an existing object first; authenticated clients need SELECT.

drop policy if exists "Org admins can read their logo" on storage.objects;
create policy "Org admins can read their logo"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'organizr_public'
    and (storage.foldername(name))[1] = 'org-logos'
    and public.is_org_member(((storage.foldername(name))[2])::uuid, array['owner', 'admin'])
  );
