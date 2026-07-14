import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getOrgForMember } from '@/lib/orgs'
import { createClient } from '@/lib/supabase/server'
import { isInteriorOperator } from '@/lib/interior'
import { orgFeatures, orgSponsorshipSettings } from '@/lib/org-features'
import {
  getOrgStripeAccount,
  getSponsorshipsForOrg,
  getSponsorshipTiersForOrg,
} from '@/lib/sponsorship.server'
import { orgSponsorshipUrl } from '@/lib/site-url'
import { isStripeConfigured } from '@/lib/stripe'
import { getStripeConnectErrorDisplay } from '@/lib/stripe-connect-errors'
import { ConsoleHeader, ConsolePage, ConsoleSection } from '../../_components/console-ui'
import { btnPrimary } from '../../_components/console-ui'
import { SponsorshipFeatureToggle } from './sponsorship-feature-toggle'
import { SponsorshipIntroForm } from './sponsorship-intro-form'
import { SponsorshipTiersSection } from './sponsorship-tiers-section'
import { SponsorshipRequestsSection } from './sponsorship-requests-section'
import { SponsorshipOverviewStats } from './sponsorship-overview-stats'
import { SponsorshipConnectError, SponsorshipConnectSuccess } from './sponsorship-connect-error'

type Props = {
  params: Promise<{ orgSlug: string }>
  searchParams: Promise<{ connected?: string; connect_error?: string }>
}

export default async function SponsorshipConsolePage({ params, searchParams }: Props) {
  const { orgSlug } = await params
  const { connected, connect_error: connectError } = await searchParams
  const org = await getOrgForMember(orgSlug)

  if (!org) {
    notFound()
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: membership } = user
    ? await supabase
        .from('org_members')
        .select('role')
        .eq('org_id', org.id)
        .eq('user_id', user.id)
        .maybeSingle()
    : { data: null }

  const showInteriorTools = isInteriorOperator(user?.id) && membership?.role === 'owner'
  if (!showInteriorTools) {
    notFound()
  }

  const [stripeAccount, tiers, sponsorships] = await Promise.all([
    getOrgStripeAccount(org.id),
    getSponsorshipTiersForOrg(org.id),
    getSponsorshipsForOrg(org.id),
  ])

  const features = orgFeatures(org)
  const sponsorshipSettings = orgSponsorshipSettings(org)
  const stripeReady = Boolean(stripeAccount?.charges_enabled)
  const connectPath = `/api/console/${orgSlug}/sponsorship/connect`
  const connectErrorDisplay = getStripeConnectErrorDisplay(connectError)
  const showConnectSuccess = connected === '1' && !connectError
  const showConnectPending = showConnectSuccess && !stripeReady

  const pending = sponsorships.filter((row) => row.status === 'pending_approval')
  const active = sponsorships.filter((row) => row.status === 'approved' || row.status === 'hidden')
  const history = sponsorships.filter(
    (row) =>
      row.status === 'declined' ||
      row.status === 'canceled' ||
      row.status === 'payment_failed',
  )

  return (
    <ConsolePage width="max-w-2xl">
      <ConsoleHeader
        title="Sponsorships"
        description="Accept monthly sponsors and show their logos on your public pages."
        backHref={`/console/${orgSlug}`}
        backLabel="Console"
      />

      <div className="mt-8 space-y-6">
        <ConsoleSection title="Overview" description="Counts from your sponsorship rows.">
          <SponsorshipOverviewStats rows={sponsorships} />
        </ConsoleSection>

        <ConsoleSection title="Availability">
          <SponsorshipFeatureToggle orgSlug={orgSlug} enabled={features.group_sponsorships} />
        </ConsoleSection>

        <ConsoleSection
          title="Stripe Connect"
          description="Connect Stripe to receive sponsor payouts. Organizr keeps a 5% platform fee."
        >
          {connectErrorDisplay ? <SponsorshipConnectError error={connectErrorDisplay} /> : null}
          {showConnectSuccess ? (
            <SponsorshipConnectSuccess pending={showConnectPending && !stripeReady} />
          ) : null}
          {!isStripeConfigured() ? (
            <p className="text-sm text-amber-300">
              Stripe is not configured on this environment yet.
            </p>
          ) : stripeReady ? (
            !showConnectSuccess ? (
              <p className="text-sm text-emerald-300">
                Stripe is connected and ready to accept sponsors.
              </p>
            ) : null
          ) : stripeAccount ? (
            <div className="space-y-3">
              {!showConnectSuccess ? (
                <p className="text-sm text-amber-300">
                  Finish Stripe onboarding to enable sponsor checkout.
                </p>
              ) : null}
              <a href={connectPath} className={btnPrimary}>
                Continue Stripe setup
              </a>
            </div>
          ) : (
            <div className="space-y-3">
              {!showConnectSuccess ? (
                <p className="text-sm text-zinc-400">
                  Connect a Stripe account before creating tiers or accepting sponsors.
                </p>
              ) : null}
              <a href={connectPath} className={btnPrimary}>
                Connect Stripe
              </a>
            </div>
          )}
        </ConsoleSection>

        <ConsoleSection
          title="Sponsorship page"
          description="Visitors see this on your public sponsorship page."
          action={
            <Link
              href={orgSponsorshipUrl(org.slug)}
              className="text-sm text-indigo-300 hover:text-indigo-200"
              target="_blank"
              rel="noopener noreferrer"
            >
              Preview
            </Link>
          }
        >
          <SponsorshipIntroForm
            orgSlug={orgSlug}
            introText={sponsorshipSettings?.intro_text ?? ''}
          />
        </ConsoleSection>

        <ConsoleSection title="Tiers" description="Set monthly sponsorship options.">
          <SponsorshipTiersSection orgSlug={orgSlug} tiers={tiers} canEdit={stripeReady} />
        </ConsoleSection>

        <ConsoleSection
          title="Sponsor requests"
          description="Approve sponsors before their logos appear publicly."
        >
          <SponsorshipRequestsSection
            orgSlug={orgSlug}
            pending={pending}
            active={active}
            history={history}
          />
        </ConsoleSection>
      </div>
    </ConsolePage>
  )
}
