import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import type { ReactNode } from 'react'
import { getOrgForMember } from '@/lib/orgs'
import { createClient } from '@/lib/supabase/server'
import { isInteriorOperator } from '@/lib/interior'
import { orgFeatures, orgSponsorshipSettings } from '@/lib/org-features'
import {
  getOrgStripeAccount,
  getSponsorLinkClickArchivesForOrg,
  getSponsorLinkClickStatsForOrg,
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
import { isSponsorshipSetupComplete, sponsorshipSetupSearch } from '@/lib/sponsorship-setup'
import {
  ConsoleHeader,
  ConsolePage,
  ConsoleSection,
  Disclosure,
  btnOutline,
  btnPrimary,
} from '../../_components/console-ui'
import { SponsorshipFeatureToggle } from './sponsorship-feature-toggle'
import { SponsorshipIntroForm } from './sponsorship-intro-form'
import { SponsorshipTiersSection } from './sponsorship-tiers-section'
import { SponsorshipRequestsSection } from './sponsorship-requests-section'
import { ComplimentarySponsorForm } from './complimentary-sponsor-form'
import { SponsorshipOverviewStats } from './sponsorship-overview-stats'
import { SponsorshipPayoutsPanel } from './sponsorship-payouts-panel'
import { SponsorshipVisitsSection } from './sponsorship-visits-section'

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
    redirect(`/console/${orgSlug}`)
  }

  const [stripeAccount, tiers, sponsorships, visitStats, visitArchives] = await Promise.all([
    getOrgStripeAccount(org.id),
    getSponsorshipTiersForOrg(org.id),
    getSponsorshipsForOrg(org.id),
    getSponsorLinkClickStatsForOrg(org.id),
    getSponsorLinkClickArchivesForOrg(org.id),
  ])

  const features = orgFeatures(org)
  const sponsorshipSettings = orgSponsorshipSettings(org)
  const stripeReady = Boolean(stripeAccount?.charges_enabled)
  const activeTiersCount = tiers.filter((tier) => tier.status === 'active').length
  const setupComplete = isSponsorshipSetupComplete({
    stripeReady,
    activeTiersCount,
    sponsorshipsEnabled: features.group_sponsorships,
  })

  if (!setupComplete) {
    redirect(
      `/console/${orgSlug}/sponsorship/setup${sponsorshipSetupSearch({
        connected,
        connect_error: connectError,
      })}`,
    )
  }

  const payoutsEnabled = Boolean(stripeAccount?.payouts_enabled)
  const connectPath = `/api/console/${orgSlug}/sponsorship/connect`
  const payoutsPath = `/api/console/${orgSlug}/sponsorship/payouts`
  const connectErrorDisplay = getStripeConnectErrorDisplay(connectError)
  const hasStripeAccount = Boolean(stripeAccount)
  const showConnectSuccess = connected === '1' && !connectError && hasStripeAccount
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

  const payoutHeaderLink = (
    <a
      href={payoutsPath}
      className={`${btnPrimary}`}
      target="_blank"
      rel="noopener noreferrer"
    >
      Open Stripe
    </a>
  )

  return (
    <ConsolePage>
      <ConsoleHeader
        title="Sponsorships"
        description="Review sponsors, shape your public offer, and get paid through Stripe."
        backHref={`/console/${orgSlug}`}
        backLabel="Console"
        actions={
          <>
            {payoutHeaderLink}
            {previewLink}
          </>
        }
      />

      <div className="mt-8 space-y-8">
        <div className="space-y-3">
          <ConsoleGroupLabel>At a glance</ConsoleGroupLabel>
          <ConsoleSection>
            <SponsorshipOverviewStats rows={sponsorships} />
          </ConsoleSection>
        </div>

        <div className="space-y-3">
          <ConsoleGroupLabel>Sponsors</ConsoleGroupLabel>
          <ComplimentarySponsorForm
            orgSlug={orgSlug}
            tiers={tiers.map((tier) => ({
              id: tier.id,
              name: tier.name,
              price_cents: tier.price_cents,
              currency: tier.currency,
              sort_order: tier.sort_order,
            }))}
          />
          <SponsorshipRequestsSection
            orgSlug={orgSlug}
            pending={pending}
            active={active}
            history={history}
          />
          <SponsorshipVisitsSection
            orgSlug={orgSlug}
            stats={visitStats}
            archives={visitArchives}
          />
        </div>

        <Disclosure summary="Public offer · intro & tiers">
          <div className="space-y-4">
            <ConsoleSection
              title="Page intro"
              description="Shown at the top of your public sponsorship page."
            >
              <SponsorshipIntroForm
                orgSlug={orgSlug}
                introText={sponsorshipSettings?.intro_text ?? ''}
              />
            </ConsoleSection>

            <ConsoleSection title="Tiers" description="Monthly options sponsors can choose from.">
              <SponsorshipTiersSection
                orgSlug={orgSlug}
                tiers={tiers}
                canEdit
                lockedTierIds={collectTierIdsLockedBySponsors(sponsorships)}
              />
            </ConsoleSection>
          </div>
        </Disclosure>

        <Disclosure summary="Payouts · Stripe">
          <ConsoleSection
            title="Stripe"
            description="Balances and bank payouts live in Stripe — not inside Organizr."
          >
            <SponsorshipPayoutsPanel
              orgSlug={orgSlug}
              stripeConfigured={isStripeConfigured()}
              stripeReady={stripeReady}
              hasStripeAccount={hasStripeAccount}
              payoutsEnabled={payoutsEnabled}
              canDisconnectStripe={canDisconnectStripe}
              connectPath={connectPath}
              payoutsPath={payoutsPath}
              connectErrorDisplay={connectErrorDisplay}
              showConnectSuccess={showConnectSuccess}
              showConnectPending={showConnectPending}
            />
          </ConsoleSection>
        </Disclosure>

        <Disclosure summary="Setup · availability" defaultOpen={!featureReady}>
          <ConsoleSection
            title="Availability"
            description="Turn the public sponsorship offer on or off."
          >
            <div className="-mx-1">
              <SponsorshipFeatureToggle
                orgSlug={orgSlug}
                enabled={features.group_sponsorships}
                locked={active.length > 0}
              />
            </div>
          </ConsoleSection>
        </Disclosure>
      </div>
    </ConsolePage>
  )
}
