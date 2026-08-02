import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getOrgForMember } from '@/lib/orgs'
import { createClient } from '@/lib/supabase/server'
import { getRootDomain } from '@/lib/tenancy/parse-host'
import { MaterializeButton } from '../materialize-button'
import { DeleteOrgSection } from '../delete-org-section'
import { FeatureTogglesForm } from '../feature-toggles-form'
import { WaitlistSettingsForm } from '../waitlist-settings-form'
import { GroupRulesSection } from '../group-rules-section'
import { orgFeatures, orgWaitlistSettings } from '@/lib/org-features'
import { orgGroupRules } from '@/lib/group-rules'
import { getGroupRulesAgreementSummary } from '@/lib/group-rules.server'
import { isInteriorOperator } from '@/lib/interior'
import { InteriorAddOwnerSection } from '../interior-add-owner-section'
import { InteriorSetTimezoneSection } from '../interior-set-timezone-section'
import { getOrgStripeAccount, getSponsorshipsForOrg } from '@/lib/sponsorship.server'
import { orgHasSponsorshipsBlockingStripeDisconnect } from '@/lib/sponsorship'
import { isStripeConfigured } from '@/lib/stripe'
import { ConsolePage, ConsoleHeader, ConsoleSection } from '../../_components/console-ui'
import { PaymentsStripePanel } from '../payments/payments-stripe-panel'
import { SponsorshipDisconnectButton } from '../sponsorship/sponsorship-disconnect-button'

type Props = {
  params: Promise<{ orgSlug: string }>
}

export default async function OrgSettingsPage({ params }: Props) {
  const { orgSlug } = await params
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

  const isOwner = membership?.role === 'owner'
  const showInteriorTools = isInteriorOperator(user?.id) && isOwner
  const { data: primarySchedule } = showInteriorTools
    ? await supabase
        .from('schedules')
        .select('timezone')
        .eq('org_id', org.id)
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle()
    : { data: null }
  const currentOrgTimezone = primarySchedule?.timezone ?? null
  const rootDomain = getRootDomain()
  const features = orgFeatures(org)
  const rules = orgGroupRules(org.settings)
  const agreementSummary =
    features.group_rules && rules && rules.version > 0
      ? await getGroupRulesAgreementSummary(org.id, rules.version)
      : null

  const [stripeAccount, sponsorships] = isOwner
    ? await Promise.all([getOrgStripeAccount(org.id), getSponsorshipsForOrg(org.id)])
    : [null, []]
  const stripeReady = Boolean(stripeAccount?.charges_enabled)
  const payoutsEnabled = Boolean(stripeAccount?.payouts_enabled)
  const hasStripeAccount = Boolean(stripeAccount)
  const canDisconnectStripe = !orgHasSponsorshipsBlockingStripeDisconnect(sponsorships)
  const connectPath = `/api/console/${orgSlug}/sponsorship/connect`
  const payoutsPath = `/api/console/${orgSlug}/sponsorship/payouts`

  return (
    <ConsolePage>
      <ConsoleHeader
        title="Settings"
        description="Advanced options and group management."
        backHref={`/console/${orgSlug}`}
        backLabel="Console"
      />

      <div className="mt-8 space-y-6">
        <ConsoleSection
          title="Features"
          description="Turn optional public features on or off. Nested options only apply when their parent is on."
        >
          <FeatureTogglesForm orgSlug={orgSlug} features={orgFeatures(org)} />
        </ConsoleSection>

        <ConsoleSection
          title="Waitlist"
          description="When a free session hits capacity, extra sign-ups go on a waitlist. Paid sessions do not use a waitlist. Choose how spots are filled when someone leaves a free session."
        >
          <WaitlistSettingsForm orgSlug={orgSlug} waitlist={orgWaitlistSettings(org)} />
        </ConsoleSection>

        <ConsoleSection
          title="Group rules"
          description="Require participants to accept your agreement before they can sign up."
        >
          <GroupRulesSection
            orgSlug={orgSlug}
            enabled={features.group_rules}
            rules={rules}
            summary={agreementSummary}
          />
        </ConsoleSection>

        <ConsoleSection
          title="Sessions"
          description="Sessions are normally generated automatically every day. Use this only if upcoming sessions look out of date. Safe to run again — duplicates are skipped."
        >
          <MaterializeButton orgSlug={orgSlug} />
        </ConsoleSection>

        {isOwner ? (
          <ConsoleSection
            title="Payments"
            description="Stripe Connect powers session fees and sponsorships. Disconnect only when you need to switch accounts."
          >
            {hasStripeAccount || isStripeConfigured() ? (
              <div className="space-y-4">
                <PaymentsStripePanel
                  stripeConfigured={isStripeConfigured()}
                  stripeReady={stripeReady}
                  hasStripeAccount={hasStripeAccount}
                  payoutsEnabled={payoutsEnabled}
                  connectPath={connectPath}
                  payoutsPath={payoutsPath}
                  connectErrorDisplay={null}
                  showConnectSuccess={false}
                  showConnectPending={false}
                />
                {hasStripeAccount ? (
                  <div className="border-t border-white/5 pt-3">
                    <SponsorshipDisconnectButton
                      orgSlug={orgSlug}
                      canDisconnect={canDisconnectStripe}
                      redirectTo={`/console/${orgSlug}/settings`}
                    />
                  </div>
                ) : null}
                {!stripeReady ? (
                  <p className="text-sm text-zinc-500">
                    Prefer a guided setup?{' '}
                    <Link
                      href={`/console/${orgSlug}/payments`}
                      className="font-medium text-zinc-300 underline decoration-zinc-600 underline-offset-2 hover:text-zinc-100"
                    >
                      Open payments onboarding
                    </Link>
                    .
                  </p>
                ) : null}
              </div>
            ) : (
              <p className="text-sm text-amber-300">
                Stripe is not configured on this environment yet.
              </p>
            )}
          </ConsoleSection>
        ) : null}

        {showInteriorTools ? (
          <ConsoleSection
            title="Interior"
            description="Platform-operator tools. Not visible to other organizers."
            className="border-amber-500/20"
          >
            <div className="space-y-8">
              <InteriorSetTimezoneSection
                orgSlug={orgSlug}
                currentOrgTimezone={currentOrgTimezone}
              />
              <div className="border-t border-white/10 pt-8">
                <InteriorAddOwnerSection orgSlug={orgSlug} />
              </div>
            </div>
          </ConsoleSection>
        ) : null}

        {isOwner ? (
          <ConsoleSection
            title="Dangerous"
            description="Irreversible actions for this group."
            className="border-red-500/20"
          >
            <DeleteOrgSection orgSlug={orgSlug} rootDomain={rootDomain} />
          </ConsoleSection>
        ) : null}
      </div>
    </ConsolePage>
  )
}
