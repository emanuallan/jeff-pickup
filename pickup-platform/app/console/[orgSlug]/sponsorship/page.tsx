import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import type { ReactNode } from 'react'
import { requireOrgOwner } from '@/lib/console/require-org-owner'
import { getOrgForMember } from '@/lib/orgs'
import { orgFeatures, orgSponsorshipSettings } from '@/lib/org-features'
import {
  getOrgStripeAccount,
  getSponsorLinkClickArchivesForOrg,
  getSponsorLinkClickStatsForOrg,
  getSponsorshipsForOrg,
  getSponsorshipTiersForOrg,
} from '@/lib/sponsorship.server'
import { orgSponsorshipUrl } from '@/lib/site-url'
import { collectTierIdsLockedBySponsors } from '@/lib/sponsorship'
import {
  ConsoleHeader,
  ConsolePage,
  ConsoleSection,
  EmptyState,
  btnOutline,
} from '../../_components/console-ui'
import { SponsorshipFeatureToggle } from './sponsorship-feature-toggle'
import { SponsorshipIntroForm } from './sponsorship-intro-form'
import { SponsorshipTiersSection } from './sponsorship-tiers-section'
import { SponsorshipRequestsSection } from './sponsorship-requests-section'
import { ComplimentarySponsorForm } from './complimentary-sponsor-form'
import { SponsorshipOverviewStats } from './sponsorship-overview-stats'
import { SponsorshipVisitsSection } from './sponsorship-visits-section'

type Props = {
  params: Promise<{ orgSlug: string }>
}

function ConsoleGroupLabel({ children }: { children: ReactNode }) {
  return (
    <p className="px-0.5 pt-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
      {children}
    </p>
  )
}

export default async function SponsorshipConsolePage({ params }: Props) {
  const { orgSlug } = await params
  const org = await requireOrgOwner(orgSlug)

  if (!org) {
    const memberOrg = await getOrgForMember(orgSlug)
    if (!memberOrg) notFound()
    redirect(`/console/${orgSlug}`)
  }

  const [stripeAccount, tiers, sponsorships, visitStats, visitArchives] = await Promise.all([
    getOrgStripeAccount(org.id),
    getSponsorshipTiersForOrg(org.id),
    getSponsorshipsForOrg(org.id),
    getSponsorLinkClickStatsForOrg(org.id),
    getSponsorLinkClickArchivesForOrg(org.id),
  ])

  const stripeReady = Boolean(stripeAccount?.charges_enabled)
  if (!stripeReady) {
    redirect(`/console/${orgSlug}/payments`)
  }

  const features = orgFeatures(org)
  const sponsorshipSettings = orgSponsorshipSettings(org)
  const activeTiers = tiers.filter((tier) => tier.status === 'active')
  const hasActiveTiers = activeTiers.length > 0
  const featureReady = features.group_sponsorships

  const pending = sponsorships.filter((row) => row.status === 'pending_approval')
  const active = sponsorships.filter((row) => row.status === 'approved' || row.status === 'hidden')
  const history = sponsorships.filter(
    (row) =>
      row.status === 'declined' ||
      row.status === 'canceled' ||
      row.status === 'payment_failed',
  )
  const hasSponsorActivity = sponsorships.length > 0

  const previewLink = (
    <Link
      href={orgSponsorshipUrl(org.slug)}
      className={`${btnOutline} text-indigo-200`}
      target="_blank"
      rel="noopener noreferrer"
    >
      View sponsor page
    </Link>
  )

  return (
    <ConsolePage>
      <ConsoleHeader
        title="Sponsorships"
        description="Shape your public offer and manage who sponsors your group."
        backHref={`/console/${orgSlug}`}
        backLabel="Console"
        actions={previewLink}
      />

      <div className="mt-8 space-y-8">
        <ConsoleSection
          title="Public offer"
          description={
            featureReady
              ? 'Your sponsorship page is live for visitors.'
              : hasActiveTiers
                ? 'Add tiers below, then turn the offer on when you’re ready.'
                : 'Create at least one tier, then turn the offer on.'
          }
        >
          <div className="-mx-1">
            <SponsorshipFeatureToggle
              orgSlug={orgSlug}
              enabled={features.group_sponsorships}
              locked={active.length > 0}
            />
          </div>
        </ConsoleSection>

        {!hasActiveTiers ? (
          <EmptyState
            title="Add your first tier"
            description="Tiers are the monthly options sponsors choose from. Add one before you go live."
          />
        ) : !featureReady ? (
          <div className="rounded-xl border border-indigo-500/25 bg-indigo-500/5 px-4 py-3">
            <p className="text-sm font-medium text-indigo-200">Ready when you are</p>
            <p className="mt-0.5 text-xs text-zinc-400">
              You have {activeTiers.length === 1 ? 'a tier' : `${activeTiers.length} tiers`}. Turn on
              the public offer above so visitors can sponsor your group.
            </p>
          </div>
        ) : null}

        <div className="space-y-3">
          <ConsoleGroupLabel>Offer</ConsoleGroupLabel>
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

        <div className="space-y-3">
          <ConsoleGroupLabel>Sponsors</ConsoleGroupLabel>
          {!hasSponsorActivity ? (
            <EmptyState
              title="No sponsors yet"
              description={
                featureReady
                  ? 'Share your sponsor page. New requests show up here for approval.'
                  : 'Once your offer is live, sponsor requests will appear here.'
              }
            >
              {featureReady ? previewLink : null}
            </EmptyState>
          ) : null}
          {hasActiveTiers ? (
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
          ) : null}
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

        {hasSponsorActivity ? (
          <div className="space-y-3">
            <ConsoleGroupLabel>At a glance</ConsoleGroupLabel>
            <ConsoleSection>
              <SponsorshipOverviewStats rows={sponsorships} />
            </ConsoleSection>
          </div>
        ) : null}
      </div>
    </ConsolePage>
  )
}
