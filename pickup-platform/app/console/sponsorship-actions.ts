'use server'

import { revalidatePath } from 'next/cache'
import { getOrgForMember } from '@/lib/orgs'
import { createClient } from '@/lib/supabase/server'
import { isInteriorOperator } from '@/lib/interior'
import { orgFeatures, orgSponsorshipSettings } from '@/lib/org-features'
import {
  assertTierCountLimit,
  parseSponsorshipIntroFormData,
  parseSponsorshipTierFormData,
} from '@/lib/console/parse-sponsorship-tier-form'
import { validateSponsorshipIntroText } from '@/lib/sponsorship'
import {
  createTierStripeProductAndPrice,
  deactivateTierStripePrice,
  refundAndCancelSponsorshipSubscription,
} from '@/lib/stripe-connect'
import { getOrgStripeAccount } from '@/lib/sponsorship.server'

async function requireInteriorSponsorshipAccess(slug: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!isInteriorOperator(user?.id)) {
    throw new Error('Not authorized')
  }

  const org = await getOrgForMember(slug)
  if (!org) {
    throw new Error('Not authorized')
  }

  const { data: membership } = await supabase
    .from('org_members')
    .select('role')
    .eq('org_id', org.id)
    .eq('user_id', user!.id)
    .maybeSingle()

  if (membership?.role !== 'owner') {
    throw new Error('Not authorized')
  }

  return org
}

function revalidateSponsorshipPaths(orgSlug: string) {
  revalidatePath(`/console/${orgSlug}/sponsorship`)
  revalidatePath(`/org/${orgSlug}`)
  revalidatePath(`/org/${orgSlug}/sponsorship`)
}

export async function updateSponsorshipFeature(orgSlug: string, enabled: boolean) {
  try {
    const org = await requireInteriorSponsorshipAccess(orgSlug)
    const supabase = await createClient()
    const settings = org.settings

    const { error } = await supabase
      .from('orgs')
      .update({
        settings: {
          ...settings,
          features: {
            ...settings.features,
            group_sponsorships: enabled,
          },
        },
      })
      .eq('id', org.id)

    if (error) return { error: error.message }

    revalidateSponsorshipPaths(orgSlug)
    return { ok: true as const }
  } catch {
    return { error: 'Not authorized.' }
  }
}

export async function updateSponsorshipIntro(orgSlug: string, formData: FormData) {
  try {
    const org = await requireInteriorSponsorshipAccess(orgSlug)
    const parsed = parseSponsorshipIntroFormData(formData)
    if (!parsed.ok) return { error: parsed.error }

    const introError = validateSponsorshipIntroText(parsed.introText)
    if (introError) return { error: introError }

    const supabase = await createClient()
    const settings = org.settings
    const existing = orgSponsorshipSettings(org)

    const { error } = await supabase
      .from('orgs')
      .update({
        settings: {
          ...settings,
          sponsorships: {
            intro_text: parsed.introText,
            published_at: existing?.published_at ?? new Date().toISOString(),
          },
        },
      })
      .eq('id', org.id)

    if (error) return { error: error.message }

    revalidateSponsorshipPaths(orgSlug)
    return { ok: true as const }
  } catch {
    return { error: 'Not authorized.' }
  }
}

export async function saveSponsorshipTier(orgSlug: string, formData: FormData) {
  try {
    const org = await requireInteriorSponsorshipAccess(orgSlug)
    const parsed = parseSponsorshipTierFormData(formData)
    if (!parsed.ok) return { error: parsed.error }

    const stripeAccount = await getOrgStripeAccount(org.id)
    if (!stripeAccount?.charges_enabled) {
      return { error: 'Connect Stripe before creating tiers.' }
    }

    const supabase = await createClient()
    const { values } = parsed

    if (!values.tierId) {
      const { count } = await supabase
        .from('sponsorship_tiers')
        .select('id', { count: 'exact', head: true })
        .eq('org_id', org.id)

      const limitError = assertTierCountLimit(count ?? 0)
      if (limitError) return { error: limitError }
    }

    let tierId = values.tierId
    let sortOrder = 0

    if (tierId) {
      const { data: existing } = await supabase
        .from('sponsorship_tiers')
        .select('id, sort_order, stripe_price_id')
        .eq('id', tierId)
        .eq('org_id', org.id)
        .maybeSingle()

      if (!existing) return { error: 'Tier not found.' }
      sortOrder = existing.sort_order

      if (existing.stripe_price_id) {
        await deactivateTierStripePrice(stripeAccount.stripe_account_id, existing.stripe_price_id)
      }
    } else {
      const { data: lastTier } = await supabase
        .from('sponsorship_tiers')
        .select('sort_order')
        .eq('org_id', org.id)
        .order('sort_order', { ascending: false })
        .limit(1)
        .maybeSingle()

      sortOrder = (lastTier?.sort_order ?? -1) + 1
    }

    const stripeIds = await createTierStripeProductAndPrice({
      stripeAccountId: stripeAccount.stripe_account_id,
      orgId: org.id,
      tierId: tierId ?? 'new',
      name: values.name,
      description: values.description,
      priceCents: values.priceCents,
    })

    if (tierId) {
      const { error } = await supabase
        .from('sponsorship_tiers')
        .update({
          name: values.name,
          description: values.description,
          price_cents: values.priceCents,
          stripe_product_id: stripeIds.productId,
          stripe_price_id: stripeIds.priceId,
          status: 'active',
          updated_at: new Date().toISOString(),
        })
        .eq('id', tierId)
        .eq('org_id', org.id)

      if (error) return { error: error.message }
    } else {
      const { data: inserted, error } = await supabase
        .from('sponsorship_tiers')
        .insert({
          org_id: org.id,
          name: values.name,
          description: values.description,
          price_cents: values.priceCents,
          sort_order: sortOrder,
          stripe_product_id: stripeIds.productId,
          stripe_price_id: stripeIds.priceId,
          status: 'active',
        })
        .select('id')
        .single()

      if (error || !inserted) return { error: error?.message ?? 'Could not save tier.' }
      tierId = inserted.id
    }

    revalidateSponsorshipPaths(orgSlug)
    return { ok: true as const, tierId }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not save tier.'
    return { error: message }
  }
}

export async function deleteSponsorshipTier(orgSlug: string, tierId: string) {
  try {
    const org = await requireInteriorSponsorshipAccess(orgSlug)
    const supabase = await createClient()

    const { data: tier } = await supabase
      .from('sponsorship_tiers')
      .select('id, stripe_price_id')
      .eq('id', tierId)
      .eq('org_id', org.id)
      .maybeSingle()

    if (!tier) return { error: 'Tier not found.' }

    const stripeAccount = await getOrgStripeAccount(org.id)
    if (stripeAccount && tier.stripe_price_id) {
      await deactivateTierStripePrice(stripeAccount.stripe_account_id, tier.stripe_price_id)
    }

    const { error } = await supabase
      .from('sponsorship_tiers')
      .update({ status: 'inactive', updated_at: new Date().toISOString() })
      .eq('id', tierId)
      .eq('org_id', org.id)

    if (error) return { error: error.message }

    revalidateSponsorshipPaths(orgSlug)
    return { ok: true as const }
  } catch {
    return { error: 'Not authorized.' }
  }
}

export async function reorderSponsorshipTiers(orgSlug: string, orderedIds: string[]) {
  try {
    const org = await requireInteriorSponsorshipAccess(orgSlug)
    const supabase = await createClient()

    for (let index = 0; index < orderedIds.length; index += 1) {
      const id = orderedIds[index]
      await supabase
        .from('sponsorship_tiers')
        .update({ sort_order: index, updated_at: new Date().toISOString() })
        .eq('id', id)
        .eq('org_id', org.id)
    }

    revalidateSponsorshipPaths(orgSlug)
    return { ok: true as const }
  } catch {
    return { error: 'Not authorized.' }
  }
}

export async function approveSponsorship(orgSlug: string, sponsorshipId: string) {
  try {
    await requireInteriorSponsorshipAccess(orgSlug)
    const supabase = await createClient()
    const { error } = await supabase.rpc('organizer_approve_sponsorship', {
      p_sponsorship_id: sponsorshipId,
    })

    if (error) return { error: error.message }

    revalidateSponsorshipPaths(orgSlug)
    return { ok: true as const }
  } catch {
    return { error: 'Not authorized.' }
  }
}

export async function declineSponsorship(
  orgSlug: string,
  sponsorshipId: string,
  reason?: string,
) {
  try {
    const org = await requireInteriorSponsorshipAccess(orgSlug)
    const supabase = await createClient()

    const { data: row, error: rowError } = await supabase
      .from('sponsorships')
      .select('stripe_subscription_id, stripe_checkout_session_id')
      .eq('id', sponsorshipId)
      .eq('org_id', org.id)
      .maybeSingle()

    if (rowError || !row) {
      return { error: 'Sponsorship not found.' }
    }

    if (row.stripe_subscription_id) {
      const stripeAccount = await getOrgStripeAccount(org.id)
      if (!stripeAccount) {
        return { error: 'Stripe is not connected for this group.' }
      }

      try {
        await refundAndCancelSponsorshipSubscription({
          subscriptionId: row.stripe_subscription_id,
          stripeAccountId: stripeAccount.stripe_account_id,
          checkoutSessionId: row.stripe_checkout_session_id,
        })
      } catch {
        return {
          error:
            'Could not refund the sponsor payment. Try again, or issue a refund manually in Stripe.',
        }
      }
    }

    const { error } = await supabase.rpc('organizer_decline_sponsorship', {
      p_sponsorship_id: sponsorshipId,
      p_reason: reason ?? null,
    })

    if (error) return { error: error.message }

    revalidateSponsorshipPaths(orgSlug)
    return { ok: true as const }
  } catch {
    return { error: 'Not authorized.' }
  }
}

export async function setSponsorshipHidden(
  orgSlug: string,
  sponsorshipId: string,
  hidden: boolean,
) {
  try {
    await requireInteriorSponsorshipAccess(orgSlug)
    const supabase = await createClient()
    const { error } = await supabase.rpc('organizer_set_sponsorship_hidden', {
      p_sponsorship_id: sponsorshipId,
      p_hidden: hidden,
    })

    if (error) return { error: error.message }

    revalidateSponsorshipPaths(orgSlug)
    return { ok: true as const }
  } catch {
    return { error: 'Not authorized.' }
  }
}

export async function isSponsorshipFeatureEnabled(orgSlug: string) {
  const org = await getOrgForMember(orgSlug)
  if (!org) return false
  return orgFeatures(org).group_sponsorships
}
