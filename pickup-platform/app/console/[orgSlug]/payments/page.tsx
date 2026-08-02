import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { requireOrgOwner } from '@/lib/console/require-org-owner'
import { getOrgForMember } from '@/lib/orgs'
import { getOrgStripeAccount } from '@/lib/sponsorship.server'
import { isStripeConfigured } from '@/lib/stripe'
import { getStripeConnectErrorDisplay } from '@/lib/stripe-connect-errors'
import { ConsoleHeader, ConsolePage, ConsoleSection, btnOutline } from '../../_components/console-ui'
import { PaymentsStripePanel } from './payments-stripe-panel'

type Props = {
  params: Promise<{ orgSlug: string }>
  searchParams: Promise<{
    connected?: string
    connect_error?: string
    connect_pending?: string
  }>
}

export default async function PaymentsPage({ params, searchParams }: Props) {
  const { orgSlug } = await params
  const {
    connected,
    connect_error: connectError,
    connect_pending: connectPending,
  } = await searchParams

  const org = await requireOrgOwner(orgSlug)
  if (!org) {
    const memberOrg = await getOrgForMember(orgSlug)
    if (!memberOrg) notFound()
    redirect(`/console/${orgSlug}`)
  }

  const stripeAccount = await getOrgStripeAccount(org.id)
  const stripeReady = Boolean(stripeAccount?.charges_enabled)
  const payoutsEnabled = Boolean(stripeAccount?.payouts_enabled)
  const hasStripeAccount = Boolean(stripeAccount)
  const connectPath = `/api/console/${orgSlug}/sponsorship/connect`
  const payoutsPath = `/api/console/${orgSlug}/sponsorship/payouts`
  const connectErrorDisplay = getStripeConnectErrorDisplay(connectError)
  const showConnectSuccess = connected === '1' && !connectError && hasStripeAccount
  const showConnectPending =
    showConnectSuccess && (!stripeReady || connectPending === '1')

  return (
    <ConsolePage>
      <ConsoleHeader
        title="Payments"
        description="Connect Stripe so you can charge session fees and offer group sponsorships."
        backHref={`/console/${orgSlug}`}
        backLabel="Console"
        actions={
          stripeReady ? (
            <Link href={`/console/${orgSlug}/sponsorship`} className={btnOutline}>
              Go to sponsorships
            </Link>
          ) : null
        }
      />

      <div className="mt-8 space-y-6">
        <ConsoleSection
          title="Stripe Connect"
          description="One account powers paid sessions and sponsorships. Balances and bank payouts live in Stripe."
        >
          <PaymentsStripePanel
            stripeConfigured={isStripeConfigured()}
            stripeReady={stripeReady}
            hasStripeAccount={hasStripeAccount}
            payoutsEnabled={payoutsEnabled}
            connectPath={connectPath}
            payoutsPath={payoutsPath}
            connectErrorDisplay={connectErrorDisplay}
            showConnectSuccess={showConnectSuccess}
            showConnectPending={showConnectPending}
          />
        </ConsoleSection>

        {stripeReady ? (
          <p className="text-sm text-zinc-500">
            Need to disconnect or switch accounts? Manage that in{' '}
            <Link
              href={`/console/${orgSlug}/settings`}
              className="font-medium text-zinc-300 underline decoration-zinc-600 underline-offset-2 hover:text-zinc-100"
            >
              Settings
            </Link>
            .
          </p>
        ) : null}
      </div>
    </ConsolePage>
  )
}
