import { getAuthUser } from '@/lib/auth'
import { getOrgForMember, type Org } from '@/lib/orgs'
import { createClient } from '@/lib/supabase/server'

/** Org membership alone is not enough — payments and sponsorships require the owner role. */
export async function requireOrgOwner(slug: string): Promise<Org | null> {
  const [org, user] = await Promise.all([getOrgForMember(slug), getAuthUser()])
  if (!org || !user) return null

  const supabase = await createClient()
  const { data: membership } = await supabase
    .from('org_members')
    .select('role')
    .eq('org_id', org.id)
    .eq('user_id', user.id)
    .maybeSingle()

  if (membership?.role !== 'owner') return null
  return org
}
