import { notFound } from 'next/navigation'
import { getOrgForMember } from '@/lib/orgs'
import { orgBaseUrl } from '@/lib/og-metadata'
import { ProfileForm } from '../profile-form'
import { BrandingForm } from '../branding-form'
import { LinksForm } from '../links-form'
import { OrgQrCode } from '../org-qr-code'
import { MAX_ORG_LINKS } from '@/lib/social-links'
import { ConsolePage, ConsoleHeader, ConsoleSection } from '../../_components/console-ui'

type Props = {
  params: Promise<{ orgSlug: string }>
}

export default async function OrgBrandingPage({ params }: Props) {
  const { orgSlug } = await params
  const org = await getOrgForMember(orgSlug)

  if (!org) {
    notFound()
  }

  const orgUrl = orgBaseUrl(org.slug)
  const orgHost = new URL(orgUrl).host

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
          <ProfileForm orgSlug={orgSlug} name={org.name} description={org.description} />
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
          title="QR code"
          description="A scannable link to your group's public page — for flyers, posters, or signage."
        >
          <OrgQrCode orgUrl={orgUrl} orgHost={orgHost} orgName={org.name} />
        </ConsoleSection>
      </div>
    </ConsolePage>
  )
}
