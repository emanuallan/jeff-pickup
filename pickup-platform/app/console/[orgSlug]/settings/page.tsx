import { notFound } from 'next/navigation'
import { getOrgForMember } from '@/lib/orgs'
import { createClient } from '@/lib/supabase/server'
import { getRootDomain } from '@/lib/tenancy/parse-host'
import { ProfileForm } from '../profile-form'
import { BrandingForm } from '../branding-form'
import { LinksForm } from '../links-form'
import { MaterializeButton } from '../materialize-button'
import { DeleteOrgSection } from '../delete-org-section'
import { MAX_ORG_LINKS } from '@/lib/social-links'
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
  const rootDomain = getRootDomain()

  return (
    <ConsolePage width="max-w-2xl">
      <ConsoleHeader
        title="Branding"
        description="Your group's profile, look, and links on public pages."
        backHref={`/console/${orgSlug}`}
        backLabel="Console"
      />

      <div className="mt-8 space-y-6">
        <ConsoleSection title="Group profile" description="Your group's name and what it's about.">
          <ProfileForm orgSlug={orgSlug} name={org.name} activity={org.activity} />
        </ConsoleSection>

        <ConsoleSection
          title="Branding"
          description="How your group looks on its public page and shared links."
        >
          <BrandingForm
            orgSlug={orgSlug}
            logoUrl={org.branding.logo_url}
            accentColor={org.branding.accent_color}
          />
        </ConsoleSection>

        <ConsoleSection
          title="Links"
          description={`Add up to ${MAX_ORG_LINKS} social or web links. They appear as icons on your public pages.`}
        >
          <LinksForm orgSlug={orgSlug} links={org.branding.links} />
        </ConsoleSection>

        <ConsoleSection
          title="Sessions"
          description="Upcoming sessions are created automatically from your recurring schedule. You shouldn't need this."
        >
          <MaterializeButton orgSlug={orgSlug} />
        </ConsoleSection>

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
