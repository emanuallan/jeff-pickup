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
import { ConsoleHeader, ConsolePage, ConsoleSection } from '../../_components/console-ui'
import { btnPrimary } from '../../_components/console-ui'
import { SponsorshipFeatureToggle } from './sponsorship-feature-toggle'
import { SponsorshipIntroForm } from './sponsorship-intro-form'
import { SponsorshipTiersSection } from './sponsorship-tiers-section'
import { SponsorshipRequestsSection } from './sponsorship-requests-section'

type Props = {
  params: Promise<{ orgSlug: string }>
  searchParams: Promise<{ connected?: string; connect_error?: string }>
}

function connectErrorMessage(code: string | undefined): string | null {
  switch (code) {
    case 'stripe_not_configured':
      return 'Stripe is not configured on this environment. Add STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET in Vercel, then redeploy.'
    case 'unauthorized':
      return 'Could not start Stripe Connect. Sign in again and retry from the sponsorship console.'
    case 'stripe_error':
      return 'Stripe Connect failed to start. Check server logs and your Stripe keys, then try again.'
    default:
      return null
  }
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
  const connectErrorMessageText = connectErrorMessage(connectError)

  const pending = sponsorships.filter((row) => row.status === 'pending_approval')
  const active = sponsorships.filter((row) => row.status === 'approved' || row.status === 'hidden')

  return (
    <ConsolePage width="max-w-2xl">
      <ConsoleHeader
        title="Sponsorships"
        description="Accept monthly sponsors and show their logos on your public pages."
        backHref={`/console/${orgSlug}`}
        backLabel="Console"
      />

      <div className="mt-8 space-y-6">
        <ConsoleSection title="Availability">
          <SponsorshipFeatureToggle orgSlug={orgSlug} enabled={features.group_sponsorships} />
        </ConsoleSection>

        <ConsoleSection
          title="Stripe Connect"
          description="Connect Stripe to receive sponsor payouts. Organizr keeps a 5% platform fee."
        >
          {connectErrorMessageText ? (
            <p className="mb-3 text-sm text-amber-300">{connectErrorMessageText}</p>
          ) : null}
          {!isStripeConfigured() ? (
            <p className="text-sm text-amber-300">
              Stripe is not configured on this environment yet.
            </p>
          ) : stripeReady ? (
            <p className="text-sm text-emerald-300">
              Stripe is connected and ready to accept sponsors.
              {connected ? ' Onboarding completed.' : null}
            </p>
          ) : stripeAccount ? (
            <div className="space-y-3">
              <p className="text-sm text-amber-300">
                Finish Stripe onboarding to enable sponsor checkout.
              </p>
              <a href={connectPath} className={btnPrimary}>
                Continue Stripe setup
              </a>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-zinc-400">
                Connect a Stripe account before creating tiers or accepting sponsors.
              </p>
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
          <SponsorshipRequestsSection orgSlug={orgSlug} pending={pending} active={active} />
        </ConsoleSection>
      </div>
    </ConsolePage>
  )
}
