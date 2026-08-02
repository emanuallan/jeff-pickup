import { NextResponse } from 'next/server'
import { requireOrgOwner } from '@/lib/console/require-org-owner'
import { createConnectExpressLoginLink, findStripeAccountIdForOrg } from '@/lib/stripe-connect'
import { getOrgStripeAccount } from '@/lib/sponsorship.server'
import { isStripeConfigured } from '@/lib/stripe'
import { classifyStripeConnectFailure } from '@/lib/stripe-connect-errors'
import { consoleOrgUrl } from '@/lib/site-url'

type Props = {
  params: Promise<{ orgSlug: string }>
}

function payoutsErrorRedirect(orgSlug: string, code: string) {
  return NextResponse.redirect(
    `${consoleOrgUrl(orgSlug)}/payments?connect_error=${encodeURIComponent(code)}`,
  )
}

/** Opens the connected Stripe Express dashboard for balances and bank payouts. */
export async function GET(_request: Request, { params }: Props) {
  const { orgSlug } = await params

  if (!isStripeConfigured()) {
    return payoutsErrorRedirect(orgSlug, 'stripe_not_configured')
  }

  const org = await requireOrgOwner(orgSlug)

  if (!org) {
    return payoutsErrorRedirect(orgSlug, 'unauthorized')
  }

  try {
    const stripeAccount = await getOrgStripeAccount(org.id)
    const stripeAccountId =
      stripeAccount?.stripe_account_id ?? (await findStripeAccountIdForOrg(org.id))

    if (!stripeAccountId) {
      return NextResponse.redirect(`${consoleOrgUrl(orgSlug)}/payments`)
    }

    if (!stripeAccount?.charges_enabled) {
      return NextResponse.redirect(`/api/console/${orgSlug}/sponsorship/connect`)
    }

    const loginLink = await createConnectExpressLoginLink(stripeAccountId)
    return NextResponse.redirect(loginLink.url)
  } catch (error) {
    const failure = classifyStripeConnectFailure(error)
    console.error('Stripe Express payouts login failed', failure.logMessage, error)
    return payoutsErrorRedirect(orgSlug, failure.code)
  }
}
