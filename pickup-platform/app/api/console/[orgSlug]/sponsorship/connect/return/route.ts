import { NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { isInteriorOperator } from '@/lib/interior'
import { getOrgForMember } from '@/lib/orgs'
import { syncConnectAccountStatus } from '@/lib/stripe-connect'
import { getOrgStripeAccount } from '@/lib/sponsorship.server'
import { consoleOrgUrl } from '@/lib/site-url'

type Props = {
  params: Promise<{ orgSlug: string }>
}

export async function GET(_request: Request, { params }: Props) {
  const { orgSlug } = await params
  const [org, user] = await Promise.all([getOrgForMember(orgSlug), getAuthUser()])

  if (!org || !isInteriorOperator(user?.id)) {
    return new Response('Unauthorized', { status: 401 })
  }

  const stripeAccount = await getOrgStripeAccount(org.id)
  if (stripeAccount) {
    await syncConnectAccountStatus(stripeAccount.stripe_account_id)
  }

  return NextResponse.redirect(`${consoleOrgUrl(orgSlug)}/sponsorship?connected=1`)
}
