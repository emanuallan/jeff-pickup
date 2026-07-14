import { cache } from 'react'
import { createPublicClient } from '@/lib/supabase/public'
import { createClient } from '@/lib/supabase/server'
import { withPublicCache } from '@/lib/public-cache'
import {
  parsePublicSponsors,
  parsePublicSponsorshipPage,
  type PublicSponsor,
  type PublicSponsorshipPage,
} from '@/lib/sponsorship'

export type OrgStripeAccount = {
  org_id: string
  stripe_account_id: string
  charges_enabled: boolean
  payouts_enabled: boolean
  details_submitted: boolean
}

export type SponsorshipRow = {
  id: string
  org_id: string
  tier_id: string
  status: string
  sponsor_name: string
  logo_url: string
  sponsor_url: string | null
  sponsor_message: string | null
  contact_email: string
  monthly_amount_cents: number
  currency: string
  subscription_status: string | null
  created_at: string
  updated_at?: string | null
  approved_at: string | null
  declined_at: string | null
  canceled_at: string | null
  hidden_at: string | null
  cancel_at_period_end?: boolean | null
  current_period_end?: string | null
  tier_name?: string
}

async function fetchPublicSponsors(orgId: string): Promise<PublicSponsor[]> {
  const supabase = createPublicClient()
  const { data, error } = await supabase.rpc('get_public_sponsors', { p_org_id: orgId })
  if (error) return []
  return parsePublicSponsors(data)
}

export const getPublicSponsors = cache(async (orgId: string): Promise<PublicSponsor[]> => {
  return withPublicCache(
    ['public-sponsors', orgId],
    60,
    [`org:${orgId}`, `sponsors:${orgId}`],
    () => fetchPublicSponsors(orgId),
  )
})

export async function getPublicSponsorshipPage(slug: string): Promise<PublicSponsorshipPage | null> {
  const supabase = createPublicClient()
  const { data, error } = await supabase.rpc('get_public_sponsorship_page', { p_slug: slug })
  if (error || !data) return null
  return parsePublicSponsorshipPage(data)
}

export async function getOrgStripeAccount(orgId: string): Promise<OrgStripeAccount | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('org_stripe_accounts')
    .select('org_id, stripe_account_id, charges_enabled, payouts_enabled, details_submitted')
    .eq('org_id', orgId)
    .maybeSingle()

  if (error || !data) return null
  return data as OrgStripeAccount
}

export async function getSponsorshipTiersForOrg(orgId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('sponsorship_tiers')
    .select('*')
    .eq('org_id', orgId)
    .eq('status', 'active')
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true })

  if (error) return []
  return data ?? []
}

export async function getSponsorshipsForOrg(orgId: string, statuses?: string[]) {
  const supabase = await createClient()
  let query = supabase
    .from('sponsorships')
    .select('*, sponsorship_tiers(name)')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false })

  if (statuses?.length) {
    query = query.in('status', statuses)
  }

  const { data, error } = await query
  if (error) return []

  return (data ?? []).map((row) => {
    const tier = row.sponsorship_tiers as { name?: string } | null
    return {
      ...(row as Omit<SponsorshipRow, 'tier_name'>),
      tier_name: tier?.name ?? 'Tier',
    }
  })
}

export async function countPendingSponsorships(orgId: string): Promise<number> {
  const supabase = await createClient()
  const { count, error } = await supabase
    .from('sponsorships')
    .select('id', { count: 'exact', head: true })
    .eq('org_id', orgId)
    .eq('status', 'pending_approval')

  if (error) return 0
  return count ?? 0
}
