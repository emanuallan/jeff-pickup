import { Suspense } from 'react'
import { getOrgForMember } from '@/lib/orgs'
import { ORG_PUBLIC_CONTENT_MAX } from '@/lib/org-public-layout'
import { OrganizerConsoleFooterLink } from './organizer-console-footer-link'
import { OrganizerConsoleToolbarLink } from './organizer-console-toolbar-link'

type Props = {
  slug: string
}

/** Organizer-only sticky bar — Organizr branding, not group branding. */
export async function OrganizerConsoleBar({ slug }: Props) {
  const membership = await getOrgForMember(slug)

  if (!membership) {
    return null
  }

  return (
    <>
      <div
        className="h-[calc(3.25rem+env(safe-area-inset-bottom,0px))]"
        aria-hidden
      />
      <footer className="fixed inset-x-0 bottom-0 z-50 border-t border-indigo-500/30 bg-zinc-950/95 shadow-[0_-8px_32px_rgba(0,0,0,0.45)] backdrop-blur-md">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-indigo-400/40 to-transparent" />
        <OrganizerConsoleFooterLink slug={slug} />
      </footer>
    </>
  )
}

/** Membership check is non-critical; load after the public page shell. */
export function OrganizerConsoleBarSlot({ slug }: Props) {
  return (
    <Suspense fallback={null}>
      <OrganizerConsoleBar slug={slug} />
    </Suspense>
  )
}

async function OrganizerDesktopToolbar({ slug }: Props) {
  const membership = await getOrgForMember(slug)
  if (!membership) return null

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 hidden pb-[max(1.5rem,env(safe-area-inset-bottom))] md:block md:pb-12">
      <div className={`pointer-events-none mx-auto px-5 sm:px-6 ${ORG_PUBLIC_CONTENT_MAX}`}>
        <OrganizerConsoleToolbarLink
          slug={slug}
          label="Back to console"
          className="pointer-events-auto shadow-[0_8px_32px_rgba(0,0,0,0.45)]"
        />
      </div>
    </div>
  )
}

/** Desktop console pill — must not block the public org shell. */
export function OrganizerDesktopToolbarSlot({ slug }: Props) {
  return (
    <Suspense fallback={null}>
      <OrganizerDesktopToolbar slug={slug} />
    </Suspense>
  )
}
