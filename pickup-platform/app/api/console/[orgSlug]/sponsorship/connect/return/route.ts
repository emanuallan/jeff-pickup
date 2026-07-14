import { revalidatePath } from 'next/cache'
import { NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { isInteriorOperator } from '@/lib/interior'
import { getOrgForMember } from '@/lib/orgs'
import { syncConnectAccountForOrg, syncOrgBrandingToConnectAccount } from '@/lib/stripe-connect'
import { classifyStripeConnectFailure } from '@/lib/stripe-connect-errors'
import { consoleOrgUrl } from '@/lib/site-url'

type Props = {
  params: Promise<{ orgSlug: string }>
}

function returnRedirect(orgSlug: string, query: Record<string, string>) {
  const params = new URLSearchParams(query)
  return NextResponse.redirect(
    `${consoleOrgUrl(orgSlug)}/sponsorship/setup?${params.toString()}`,
  )
}

export async function GET(_request: Request, { params }: Props) {
  const { orgSlug } = await params
  const [org, user] = await Promise.all([getOrgForMember(orgSlug), getAuthUser()])

  if (!org || !isInteriorOperator(user?.id)) {
    return returnRedirect(orgSlug, { connect_error: 'unauthorized' })
  }

  try {
    const account = await syncConnectAccountForOrg(org.id)

    if (account) {
      // Best-effort: branding sync must never block the onboarding return path.
      await syncOrgBrandingToConnectAccount(account.id, {
        logoUrl: org.branding?.logo_url ?? null,
        accentColor: org.branding?.accent_color ?? '#2563eb',
      })
    }

    revalidatePath(`/console/${orgSlug}/sponsorship`)
    revalidatePath(`/console/${orgSlug}/sponsorship/setup`)

    if (!account) {
      return returnRedirect(orgSlug, { connect_error: 'stripe_account_not_found' })
    }

    if (account.charges_enabled) {
      return returnRedirect(orgSlug, { connected: '1' })
    }

    if (account.details_submitted) {
      return returnRedirect(orgSlug, { connected: '1', connect_pending: '1' })
    }

    return returnRedirect(orgSlug, { connect_error: 'stripe_onboarding_incomplete' })
  } catch (error) {
    const failure = classifyStripeConnectFailure(error)
    console.error('Stripe Connect return sync failed', failure.logMessage, error)
    return returnRedirect(orgSlug, { connect_error: failure.code })
  }
}
