import { Suspense } from 'react'
import { OrganizrLogo } from '@/app/_components/organizr-logo'
import { getOrgForMember } from '@/lib/orgs'
import { consoleOrgUrl } from '@/lib/og-metadata'
import { BackToOrganizrLink } from './back-to-organizr-link'

type Props = {
  slug: string
}

/** Organizer-only pill link back to the console on the apex domain. */
export async function OrganizerConsoleLink({ slug }: Props) {
  const membership = await getOrgForMember(slug)

  if (membership) {
    return (
      <a
        href={consoleOrgUrl(slug)}
        className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-indigo-500/30 bg-indigo-500/10 px-2.5 py-1.5 text-sm leading-none transition-colors hover:border-indigo-400/45 hover:bg-indigo-500/15"
        title="Back to console"
      >
        <span aria-hidden className="text-indigo-300">
          ←
        </span>
        <OrganizrLogo size={16} className="gap-1.5" />
        <span className="text-sm font-medium leading-none text-indigo-200">Console</span>
      </a>
    )
  }

  if (slug === 'demo') {
    return <BackToOrganizrLink />
  }

  return null
}

/** Auth/membership check is non-critical; load after the public page shell. */
export function OrganizerConsoleLinkSlot({ slug }: Props) {
  return (
    <Suspense fallback={null}>
      <OrganizerConsoleLink slug={slug} />
    </Suspense>
  )
}
