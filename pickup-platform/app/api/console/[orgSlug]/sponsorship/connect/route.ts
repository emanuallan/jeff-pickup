import { NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { isInteriorOperator } from '@/lib/interior'
import { getOrgForMember } from '@/lib/orgs'
import {
  createConnectAccountLink,
  createConnectExpressAccount,
  syncConnectAccountStatus,
} from '@/lib/stripe-connect'
import { getOrgStripeAccount } from '@/lib/sponsorship.server'
import { isStripeConfigured } from '@/lib/stripe'

type Props = {
  params: Promise<{ orgSlug: string }>
}

export async function GET(_request: Request, { params }: Props) {
  if (!isStripeConfigured()) {
    return new Response('Stripe is not configured.', { status: 503 })
  }

  const { orgSlug } = await params
  const [org, user] = await Promise.all([getOrgForMember(orgSlug), getAuthUser()])

  if (!org || !isInteriorOperator(user?.id)) {
    return new Response('Unauthorized', { status: 401 })
  }

  let stripeAccount = await getOrgStripeAccount(org.id)

  if (!stripeAccount) {
    const account = await createConnectExpressAccount(org.id, org.name, org.slug)
    stripeAccount = {
      org_id: org.id,
      stripe_account_id: account.id,
      charges_enabled: account.charges_enabled ?? false,
      payouts_enabled: account.payouts_enabled ?? false,
      details_submitted: account.details_submitted ?? false,
    }
  } else {
    await syncConnectAccountStatus(stripeAccount.stripe_account_id)
  }

  const refreshPath = `/api/console/${orgSlug}/sponsorship/connect`
  const returnPath = `/api/console/${orgSlug}/sponsorship/connect/return`

  const link = await createConnectAccountLink(
    stripeAccount.stripe_account_id,
    orgSlug,
    refreshPath,
    returnPath,
  )

  return NextResponse.redirect(link.url)
}
