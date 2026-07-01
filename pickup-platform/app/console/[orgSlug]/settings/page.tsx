import { notFound } from 'next/navigation'
import { getOrgForMember } from '@/lib/orgs'
import { createClient } from '@/lib/supabase/server'
import { getRootDomain } from '@/lib/tenancy/parse-host'
import { MaterializeButton } from '../materialize-button'
import { DeleteOrgSection } from '../delete-org-section'
import { FeatureTogglesForm } from '../feature-toggles-form'
import { WaitlistSettingsForm } from '../waitlist-settings-form'
import { orgFeatures, orgWaitlistSettings } from '@/lib/org-features'
import { isInteriorOperator } from '@/lib/interior'
import { InteriorAddOwnerSection } from '../interior-add-owner-section'
import { InteriorSetTimezoneSection } from '../interior-set-timezone-section'
import { ConsolePage, ConsoleHeader, ConsoleSection } from '../../_components/console-ui'

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

  return (
    <ConsolePage width="max-w-2xl">
      <ConsoleHeader
        title="Settings"
        description="Advanced options and group management."
        backHref={`/console/${orgSlug}`}
        backLabel="Console"
      />

      <div className="mt-8 space-y-6">
        <ConsoleSection
          title="Features"
          description="Turn optional public features on or off for your group."
        >
          <FeatureTogglesForm orgSlug={orgSlug} features={orgFeatures(org)} />
        </ConsoleSection>

        <ConsoleSection
          title="Waitlist"
          description="When a session hits capacity, extra sign-ups go on a waitlist. Choose how spots are filled when someone leaves."
        >
          <WaitlistSettingsForm orgSlug={orgSlug} waitlist={orgWaitlistSettings(org)} />
        </ConsoleSection>

        <ConsoleSection
          title="Sessions"
          description="Sessions are normally generated automatically every day. Use this only if upcoming sessions look out of date. Safe to run again — duplicates are skipped."
        >
          <MaterializeButton orgSlug={orgSlug} />
        </ConsoleSection>

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
