import { NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { isInteriorOperator } from '@/lib/interior'
import { getOrgForMember } from '@/lib/orgs'
import {
  createConnectAccountLink,
  createConnectExpressAccount,
  findStripeAccountIdForOrg,
  syncConnectAccountStatus,
  syncOrgBrandingToConnectAccount,
} from '@/lib/stripe-connect'
import { getOrgStripeAccount } from '@/lib/sponsorship.server'
import { isStripeConfigured } from '@/lib/stripe'
import { classifyStripeConnectFailure } from '@/lib/stripe-connect-errors'
import { consoleOrgUrl } from '@/lib/site-url'

type Props = {
  params: Promise<{ orgSlug: string }>
}

function connectErrorRedirect(orgSlug: string, code: string) {
  return NextResponse.redirect(
    `${consoleOrgUrl(orgSlug)}/sponsorship?connect_error=${encodeURIComponent(code)}`,
  )
}

export async function GET(_request: Request, { params }: Props) {
  const { orgSlug } = await params

  if (!isStripeConfigured()) {
    return connectErrorRedirect(orgSlug, 'stripe_not_configured')
  }

  const [org, user] = await Promise.all([getOrgForMember(orgSlug), getAuthUser()])

  if (!org || !isInteriorOperator(user?.id)) {
    return connectErrorRedirect(orgSlug, 'unauthorized')
  }

  try {
    let stripeAccount = await getOrgStripeAccount(org.id)
    let stripeAccountId = stripeAccount?.stripe_account_id ?? (await findStripeAccountIdForOrg(org.id))

    if (!stripeAccountId) {
      const account = await createConnectExpressAccount(org.id, org.name, org.slug)
      stripeAccountId = account.id
    } else {
      await syncConnectAccountStatus(stripeAccountId)
    }

    // Best-effort: Checkout branding must never block Connect onboarding.
    await syncOrgBrandingToConnectAccount(stripeAccountId, {
      logoUrl: org.branding?.logo_url ?? null,
      accentColor: org.branding?.accent_color ?? '#2563eb',
    })

    const refreshPath = `/api/console/${orgSlug}/sponsorship/connect`
    const returnPath = `/api/console/${orgSlug}/sponsorship/connect/return`

    const link = await createConnectAccountLink(
      stripeAccountId,
      orgSlug,
      refreshPath,
      returnPath,
    )

    return NextResponse.redirect(link.url)
  } catch (error) {
    const failure = classifyStripeConnectFailure(error)
    console.error('Stripe Connect onboarding failed', failure.logMessage, error)
    return connectErrorRedirect(orgSlug, failure.code)
  }
}
