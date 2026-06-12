import { createClient } from '@/lib/supabase/server'

export type Org = {
  id: string
  slug: string
  name: string
  activity: string
  status: string
  default_locale: string
  branding: {
    logo_url: string | null
    accent_color: string
  }
}

function parseOrgRow(data: Record<string, unknown>): Org {
  const branding = data.branding as Org['branding'] | null

  return {
    id: String(data.id),
    slug: String(data.slug),
    name: String(data.name),
    activity: String(data.activity ?? ''),
    status: String(data.status),
    default_locale: String(data.default_locale),
    branding: {
      logo_url: branding?.logo_url ?? null,
      accent_color: branding?.accent_color ?? '#2563eb',
    },
  }
}

export async function getOrgBySlug(slug: string): Promise<Org | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('orgs')
    .select('id, slug, name, activity, status, default_locale, branding')
    .eq('slug', slug)
    .maybeSingle()

  if (error || !data) {
    return null
  }

  return parseOrgRow(data)
}

export async function getUserOrgs(): Promise<Org[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return []
  }

  const { data: memberships, error: memberError } = await supabase
    .from('org_members')
    .select('org_id')
    .eq('user_id', user.id)

  if (memberError || !memberships?.length) {
    return []
  }

  const orgIds = memberships.map((m) => m.org_id)

  const { data: orgs, error: orgsError } = await supabase
    .from('orgs')
    .select('id, slug, name, activity, status, default_locale, branding')
    .in('id', orgIds)

  if (orgsError || !orgs) {
    return []
  }

  return orgs.map((row) => parseOrgRow(row))
}

export async function getOrgForMember(slug: string): Promise<Org | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return null
  }

  const org = await getOrgBySlug(slug)
  if (!org) {
    return null
  }

  const { data: membership } = await supabase
    .from('org_members')
    .select('role')
    .eq('org_id', org.id)
    .eq('user_id', user.id)
    .maybeSingle()

  if (!membership) {
    return null
  }

  return org
}
