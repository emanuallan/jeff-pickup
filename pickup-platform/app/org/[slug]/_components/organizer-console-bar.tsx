import { Suspense } from 'react'
import { getOrgForMember } from '@/lib/orgs'
import { OrganizerConsoleFooterLink } from './organizer-console-footer-link'

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
