import { cache } from 'react'
import { getAuthUser } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { MAX_ORG_LINKS } from '@/lib/social-links'
import { parseOrgSettings, type OrgSettings } from '@/lib/org-features'

export type Org = {
  id: string
  slug: string
  name: string
  description: string
  status: string
  default_locale: string
  branding: {
    logo_url: string | null
    accent_color: string
    links: string[]
  }
  settings: OrgSettings
}

export function parseOrgRow(data: Record<string, unknown>): Org {
  const branding = data.branding as Partial<Org['branding']> | null
  const rawLinks = Array.isArray(branding?.links) ? branding.links : []
  const links = rawLinks
    .filter((l): l is string => typeof l === 'string' && l.length > 0)
    .slice(0, MAX_ORG_LINKS)

  return {
    id: String(data.id),
    slug: String(data.slug),
    name: String(data.name),
    description: String(data.description ?? ''),
    status: String(data.status),
    default_locale: String(data.default_locale),
    branding: {
      logo_url: branding?.logo_url ?? null,
      accent_color: branding?.accent_color ?? '#2563eb',
      links,
    },
    settings: parseOrgSettings(data.settings),
  }
}

/** Memoized per-request so metadata + page share one query for the same slug. */
export const getOrgBySlug = cache(async (slug: string): Promise<Org | null> => {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('orgs')
    .select('id, slug, name, description, status, default_locale, branding, settings')
    .eq('slug', slug)
    .maybeSingle()

  if (error || !data) {
    return null
  }

  return parseOrgRow(data)
})

/** Active org slugs for apex sitemap discovery. */
export async function getActivePublicOrgSlugs(): Promise<string[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('orgs')
    .select('slug')
    .eq('status', 'active')
    .order('slug')

  if (error || !data) {
    return []
  }

  return data.map((row) => String(row.slug))
}

export async function getUserOrgs(): Promise<Org[]> {
  const user = await getAuthUser()

  if (!user) {
    return []
  }

  const supabase = await createClient()

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
    .select('id, slug, name, description, status, default_locale, branding, settings')
    .in('id', orgIds)

  if (orgsError || !orgs) {
    return []
  }

  return orgs.map((row) => parseOrgRow(row))
}

export const getOrgForMember = cache(async (slug: string): Promise<Org | null> => {
  const user = await getAuthUser()

  if (!user) {
    return null
  }

  const org = await getOrgBySlug(slug)
  if (!org) {
    return null
  }

  const supabase = await createClient()
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
})
