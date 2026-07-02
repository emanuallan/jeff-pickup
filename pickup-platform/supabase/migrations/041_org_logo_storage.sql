-- Org logo uploads in organizr_public + widen org update to owner/admin.

-- ---------------------------------------------------------------------------
-- Orgs: owners and admins can update (delete stays owner-only)
-- ---------------------------------------------------------------------------

drop policy if exists "Owners can update orgs" on public.orgs;
create policy "Org admins can update orgs"
  on public.orgs for update
  to authenticated
  using (public.is_org_member(id, array['owner', 'admin']))
  with check (public.is_org_member(id, array['owner', 'admin']));

-- ---------------------------------------------------------------------------
-- Storage: org logos at org-logos/{org_id}/logo.{ext}
-- Public read is handled by the public bucket setting.
-- ---------------------------------------------------------------------------

drop policy if exists "Org admins can upload their logo" on storage.objects;
create policy "Org admins can upload their logo"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'organizr_public'
    and (storage.foldername(name))[1] = 'org-logos'
    and public.is_org_member(((storage.foldername(name))[2])::uuid, array['owner', 'admin'])
  );

drop policy if exists "Org admins can update their logo" on storage.objects;
create policy "Org admins can update their logo"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'organizr_public'
    and (storage.foldername(name))[1] = 'org-logos'
    and public.is_org_member(((storage.foldername(name))[2])::uuid, array['owner', 'admin'])
  )
  with check (
    bucket_id = 'organizr_public'
    and (storage.foldername(name))[1] = 'org-logos'
    and public.is_org_member(((storage.foldername(name))[2])::uuid, array['owner', 'admin'])
  );

drop policy if exists "Org admins can delete their logo" on storage.objects;
create policy "Org admins can delete their logo"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'organizr_public'
    and (storage.foldername(name))[1] = 'org-logos'
    and public.is_org_member(((storage.foldername(name))[2])::uuid, array['owner', 'admin'])
  );
