-- Headcount Phase 0: orgs + org_members + RLS

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table public.orgs (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  activity text not null default '',
  status text not null default 'active'
    check (status in ('active', 'pending', 'suspended')),
  default_locale text not null default 'en'
    check (default_locale in ('en', 'es')),
  branding jsonb not null default '{"logo_url": null, "accent_color": "#2563eb"}'::jsonb,
  require_phone_verification boolean not null default false,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index orgs_slug_idx on public.orgs (slug);
create index orgs_status_idx on public.orgs (status);

create table public.org_members (
  org_id uuid not null references public.orgs(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('owner', 'admin')),
  created_at timestamptz not null default now(),
  primary key (org_id, user_id)
);

create index org_members_user_id_idx on public.org_members (user_id);

-- ---------------------------------------------------------------------------
-- RLS helpers (security definer to avoid policy recursion)
-- ---------------------------------------------------------------------------

create or replace function public.is_org_member(p_org_id uuid, p_roles text[] default null)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.org_members m
    where m.org_id = p_org_id
      and m.user_id = auth.uid()
      and (p_roles is null or m.role = any(p_roles))
  );
$$;

-- ---------------------------------------------------------------------------
-- API grants (required when "Automatically expose new tables" is off)
-- ---------------------------------------------------------------------------

grant select on public.orgs to anon, authenticated;
grant insert, update, delete on public.orgs to authenticated;

grant select, insert, delete on public.org_members to authenticated;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.orgs enable row level security;
alter table public.org_members enable row level security;

-- Orgs: public can read active orgs (for public org pages)
drop policy if exists "Anyone can view active orgs" on public.orgs;
create policy "Anyone can view active orgs"
  on public.orgs for select
  to anon, authenticated
  using (status = 'active');

-- Orgs: members can view their own org regardless of status
drop policy if exists "Members can view their orgs" on public.orgs;
create policy "Members can view their orgs"
  on public.orgs for select
  to authenticated
  using (public.is_org_member(id));

-- Orgs: authenticated users can create (self-serve onboarding)
drop policy if exists "Authenticated users can create orgs" on public.orgs;
create policy "Authenticated users can create orgs"
  on public.orgs for insert
  to authenticated
  with check (created_by = auth.uid());

-- Orgs: owners can update
drop policy if exists "Owners can update orgs" on public.orgs;
create policy "Owners can update orgs"
  on public.orgs for update
  to authenticated
  using (public.is_org_member(id, array['owner']))
  with check (public.is_org_member(id, array['owner']));

-- Orgs: owners can delete
drop policy if exists "Owners can delete orgs" on public.orgs;
create policy "Owners can delete orgs"
  on public.orgs for delete
  to authenticated
  using (public.is_org_member(id, array['owner']));

-- Org members: members can view membership in their orgs
drop policy if exists "Members can view org membership" on public.org_members;
create policy "Members can view org membership"
  on public.org_members for select
  to authenticated
  using (public.is_org_member(org_id));

-- Org members: owners can manage membership
drop policy if exists "Owners can insert org members" on public.org_members;
create policy "Owners can insert org members"
  on public.org_members for insert
  to authenticated
  with check (public.is_org_member(org_id, array['owner']));

drop policy if exists "Owners can delete org members" on public.org_members;
create policy "Owners can delete org members"
  on public.org_members for delete
  to authenticated
  using (public.is_org_member(org_id, array['owner']));

-- ---------------------------------------------------------------------------
-- Bootstrap: when an org is created, add creator as owner
-- ---------------------------------------------------------------------------

create or replace function public.handle_new_org()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.created_by is not null then
    insert into public.org_members (org_id, user_id, role)
    values (new.id, new.created_by, 'owner')
    on conflict do nothing;
  end if;
  return new;
end;
$$;

create trigger on_org_created
  after insert on public.orgs
  for each row execute function public.handle_new_org();
