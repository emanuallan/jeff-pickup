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
import { isStripeConfigured } from '@/lib/stripe'
import { getStripeConnectErrorDisplay } from '@/lib/stripe-connect-errors'
import {
  collectTierIdsLockedBySponsors,
  orgHasSponsorshipsBlockingStripeDisconnect,
} from '@/lib/sponsorship'
import { isSponsorshipSetupComplete } from '@/lib/sponsorship-setup'
import {
  ConsolePage,
  ConsoleSection,
  btnPrimary,
} from '../../../_components/console-ui'
import { SponsorshipPayoutsPanel } from '../sponsorship-payouts-panel'
import { SponsorshipIntroForm } from '../sponsorship-intro-form'
import { SponsorshipTiersSection } from '../sponsorship-tiers-section'
import { SponsorshipFeatureToggle } from '../sponsorship-feature-toggle'

type Props = {
  params: Promise<{ orgSlug: string }>
  searchParams: Promise<{ connected?: string; connect_error?: string }>
}

function StepBadge({ n, done, locked }: { n: number; done?: boolean; locked?: boolean }) {
  if (done) {
    return (
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-xs font-semibold text-emerald-400">
        ✓
      </span>
    )
  }
  return (
    <span
      className={
        locked
          ? 'flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-white/10 text-xs font-semibold text-zinc-600'
          : 'flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-indigo-500 text-xs font-semibold text-indigo-300'
      }
    >
      {locked ? '🔒' : n}
    </span>
  )
}

export default async function SponsorshipSetupPage({ params, searchParams }: Props) {
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
  const hasStripeAccount = Boolean(stripeAccount)
  const activeTiersCount = tiers.filter((tier) => tier.status === 'active').length
  const hasTier = activeTiersCount > 0
  const sponsorshipsEnabled = features.group_sponsorships
  const isComplete = isSponsorshipSetupComplete({
    stripeReady,
    activeTierCount,
    sponsorshipsEnabled,
  })

  const connectPath = `/api/console/${orgSlug}/sponsorship/connect`
  const payoutsPath = `/api/console/${orgSlug}/sponsorship/payouts`
  const connectErrorDisplay = getStripeConnectErrorDisplay(connectError)
  const showConnectSuccess = connected === '1' && !connectError && hasStripeAccount
  const showConnectPending = showConnectSuccess && !stripeReady
  const canDisconnectStripe = !orgHasSponsorshipsBlockingStripeDisconnect(sponsorships)
  const activeSponsors = sponsorships.filter(
    (row) => row.status === 'approved' || row.status === 'hidden',
  )

  return (
    <ConsolePage width="max-w-2xl">
      <Link
        href={`/console/${orgSlug}`}
        className="inline-flex min-h-9 items-center gap-1 text-sm text-zinc-400 transition-colors hover:text-zinc-200"
      >
        <span aria-hidden>←</span> {org.name}
      </Link>

      <div className="mt-4">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-50">
          Set up sponsorships
        </h1>
        <p className="mt-1 text-sm text-zinc-400">
          {isComplete
            ? 'Your sponsorship offer is live. You can manage sponsors, tiers, and payouts anytime.'
            : 'Three quick steps — connect Stripe, add a monthly tier, then turn the public page on.'}
        </p>
      </div>

      {isComplete ? (
        <div className="mt-8">
          <Link href={`/console/${orgSlug}/sponsorship`} className={btnPrimary}>
            Open sponsorships console
          </Link>
        </div>
      ) : (
        <div className="mt-8 space-y-6">
          <ConsoleSection
            title="Step 1 · Connect Stripe"
            description="Sponsor payments go to your Stripe Express account (5% platform fee), then to your bank."
            action={<StepBadge n={1} done={stripeReady} />}
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

          <ConsoleSection
            title="Step 2 · Add a tier"
            description={
              stripeReady
                ? 'Create at least one monthly option sponsors can choose. You can tweak intro copy anytime.'
                : 'Connect Stripe above first — tiers need a connected payout account.'
            }
            action={<StepBadge n={2} done={hasTier} locked={!stripeReady} />}
          >
            {stripeReady ? (
              <div className="space-y-6">
                <div className="space-y-2">
                  <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                    Page intro
                  </p>
                  <SponsorshipIntroForm
                    orgSlug={orgSlug}
                    introText={sponsorshipSettings?.intro_text ?? ''}
                  />
                </div>
                <div className="space-y-2 border-t border-white/5 pt-5">
                  <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                    Monthly tiers
                  </p>
                  <SponsorshipTiersSection
                    orgSlug={orgSlug}
                    tiers={tiers}
                    canEdit
                    lockedTierIds={collectTierIdsLockedBySponsors(sponsorships)}
                  />
                </div>
              </div>
            ) : (
              <p className="text-sm text-zinc-600">Locked until Stripe can accept charges.</p>
            )}
          </ConsoleSection>

          <ConsoleSection
            title="Step 3 · Go live"
            description={
              hasTier
                ? 'Turn on the public sponsorship page so visitors can sign up.'
                : 'Add a tier above first — then flip this on to publish your offer.'
            }
            action={
              <StepBadge n={3} done={sponsorshipsEnabled} locked={!stripeReady || !hasTier} />
            }
          >
            {stripeReady && hasTier ? (
              <SponsorshipFeatureToggle
                orgSlug={orgSlug}
                enabled={sponsorshipsEnabled}
                locked={activeSponsors.length > 0}
              />
            ) : (
              <p className="text-sm text-zinc-600">
                {!stripeReady
                  ? 'Locked until Stripe is connected.'
                  : 'Locked until you add a sponsorship tier.'}
              </p>
            )}
          </ConsoleSection>
        </div>
      )}
    </ConsolePage>
  )
}
