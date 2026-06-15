import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getOrgForMember } from '@/lib/orgs'
import { ProfileForm } from '../profile-form'
import { BrandingForm } from '../branding-form'
import { MaterializeButton } from '../materialize-button'

type Props = {
  params: Promise<{ orgSlug: string }>
}

export default async function OrgSettingsPage({ params }: Props) {
  const { orgSlug } = await params
  const org = await getOrgForMember(orgSlug)

  if (!org) {
    notFound()
  }

  return (
    <main className="mx-auto min-h-dvh max-w-lg px-6 py-10">
      <Link
        href={`/console/${orgSlug}`}
        className="text-sm text-zinc-400 hover:text-zinc-200"
      >
        ← {org.name}
      </Link>

      <h1 className="mt-6 text-2xl font-semibold">Personalize</h1>

      <section className="mt-10">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">Group profile</h2>
        <p className="mt-1 text-xs text-zinc-500">
          Your group&apos;s name and what it&apos;s about.
        </p>
        <ProfileForm orgSlug={orgSlug} name={org.name} activity={org.activity} />
      </section>

      <section className="mt-10">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">Branding</h2>
        <p className="mt-1 text-xs text-zinc-500">
          How your group looks on its public page and shared links.
        </p>
        <BrandingForm
          orgSlug={orgSlug}
          logoUrl={org.branding.logo_url}
          accentColor={org.branding.accent_color}
        />
      </section>

      <section className="mt-10">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">Sessions</h2>
        <p className="mt-1 text-xs text-zinc-500">
          Upcoming sessions are created automatically from your recurring schedule.
          You shouldn&apos;t need this.
        </p>
        <MaterializeButton orgSlug={orgSlug} />
      </section>
    </main>
  )
}
