import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { ReactNode } from 'react'
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
import {
  collectTierIdsLockedBySponsors,
  orgHasSponsorshipsBlockingStripeDisconnect,
} from '@/lib/sponsorship'
import {
  ConsoleHeader,
  ConsolePage,
  ConsoleSection,
  btnOutline,
  btnPrimary,
} from '../../_components/console-ui'
import { SponsorshipFeatureToggle } from './sponsorship-feature-toggle'
import { SponsorshipIntroForm } from './sponsorship-intro-form'
import { SponsorshipTiersSection } from './sponsorship-tiers-section'
import { SponsorshipRequestsSection } from './sponsorship-requests-section'
import { SponsorshipOverviewStats } from './sponsorship-overview-stats'
import { SponsorshipPayoutsPanel } from './sponsorship-payouts-panel'

type Props = {
  params: Promise<{ orgSlug: string }>
  searchParams: Promise<{ connected?: string; connect_error?: string }>
}

function ConsoleGroupLabel({ children }: { children: ReactNode }) {
  return (
    <p className="px-0.5 pt-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
      {children}
    </p>
  )
}

export default async function SponsorshipConsolePage({ params, searchParams }: Props) {
  const { orgSlug } = await params
  const { connected, connect_error: connectError } = await searchParams
  const org = await getOrgForMember(orgSlug)

  if (!org) {
    notFound()
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
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
  const payoutsEnabled = Boolean(stripeAccount?.payouts_enabled)
  const connectPath = `/api/console/${orgSlug}/sponsorship/connect`
  const payoutsPath = `/api/console/${orgSlug}/sponsorship/payouts`
  const connectErrorDisplay = getStripeConnectErrorDisplay(connectError)
  const showConnectSuccess = connected === '1' && !connectError
  const showConnectPending = showConnectSuccess && !stripeReady
  const featureReady = features.group_sponsorships

  const pending = sponsorships.filter((row) => row.status === 'pending_approval')
  const active = sponsorships.filter((row) => row.status === 'approved' || row.status === 'hidden')
  const history = sponsorships.filter(
    (row) =>
      row.status === 'declined' ||
      row.status === 'canceled' ||
      row.status === 'payment_failed',
  )
  const canDisconnectStripe = !orgHasSponsorshipsBlockingStripeDisconnect(sponsorships)

  const previewLink = (
    <Link
      href={orgSponsorshipUrl(org.slug)}
      className={`${btnOutline} text-indigo-200`}
      target="_blank"
      rel="noopener noreferrer"
    >
      View Sponsor Page
    </Link>
  )

  const payoutHeaderLink = stripeReady ? (
    <a
      href={payoutsPath}
      className={`${btnPrimary}`}
      target="_blank"
      rel="noopener noreferrer"
    >
      Open Stripe
    </a>
  ) : null

  return (
    <ConsolePage width="max-w-2xl">
      <ConsoleHeader
        title="Sponsorships"
        description={
          stripeReady
            ? 'Review sponsors, shape your public offer, and get paid through Stripe.'
            : 'Connect Stripe to unlock sponsorship tools and get paid.'
        }
        backHref={`/console/${orgSlug}`}
        backLabel="Console"
        actions={
          <>
            {payoutHeaderLink}
            {stripeReady ? previewLink : null}
          </>
        }
      />

      <div className="mt-8 space-y-8">
        {stripeReady ? (
          <>
            <div className="space-y-3">
              <ConsoleGroupLabel>At a glance</ConsoleGroupLabel>
              <ConsoleSection>
                <SponsorshipOverviewStats rows={sponsorships} />
              </ConsoleSection>
            </div>

            <div className="space-y-3">
              <ConsoleGroupLabel>Sponsors</ConsoleGroupLabel>
              <SponsorshipRequestsSection
                orgSlug={orgSlug}
                pending={pending}
                active={active}
                history={history}
              />
            </div>

            <div className="space-y-3">
              <ConsoleGroupLabel>Public offer</ConsoleGroupLabel>
              <ConsoleSection
                title="Page intro"
                description="Shown at the top of your public sponsorship page."
              >
                <SponsorshipIntroForm
                  orgSlug={orgSlug}
                  introText={sponsorshipSettings?.intro_text ?? ''}
                />
              </ConsoleSection>

              <ConsoleSection
                title="Tiers"
                description="Monthly options sponsors can choose from."
              >
                <SponsorshipTiersSection
                  orgSlug={orgSlug}
                  tiers={tiers}
                  canEdit
                  lockedTierIds={collectTierIdsLockedBySponsors(sponsorships)}
                />
              </ConsoleSection>
            </div>
          </>
        ) : null}

        <div className="space-y-3">
          <ConsoleGroupLabel>Payouts</ConsoleGroupLabel>
          <ConsoleSection
            title="Stripe"
            description={
              stripeReady
                ? 'Balances and bank payouts live in Stripe — not inside Organizr.'
                : 'Required before you can offer sponsorships.'
            }
          >
            <SponsorshipPayoutsPanel
              orgSlug={orgSlug}
              stripeConfigured={isStripeConfigured()}
              stripeReady={stripeReady}
              hasStripeAccount={Boolean(stripeAccount)}
              payoutsEnabled={payoutsEnabled}
              canDisconnectStripe={canDisconnectStripe}
              connectPath={connectPath}
              payoutsPath={payoutsPath}
              connectErrorDisplay={connectErrorDisplay}
              showConnectSuccess={showConnectSuccess}
              showConnectPending={showConnectPending}
            />
          </ConsoleSection>
        </div>

        {stripeReady ? (
          <div className="space-y-3">
            <ConsoleGroupLabel>Setup</ConsoleGroupLabel>
            <ConsoleSection
              title="Availability"
              description="Turn the public sponsorship offer on or off."
              collapsible={featureReady}
              defaultOpen={!featureReady}
            >
              <div className="-mx-1">
                <SponsorshipFeatureToggle
                  orgSlug={orgSlug}
                  enabled={features.group_sponsorships}
                  locked={active.length > 0}
                />
              </div>
            </ConsoleSection>
          </div>
        ) : null}
      </div>
    </ConsolePage>
  )
}
