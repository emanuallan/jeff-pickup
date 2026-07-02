import { Suspense } from 'react'
import { OrganizrLogo } from '@/app/_components/organizr-logo'
import { getOrgForMember } from '@/lib/orgs'
import { consoleOrgUrl } from '@/lib/og-metadata'
import { arrowRight } from '@/lib/text-arrows'

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
        <a
          href={consoleOrgUrl(slug)}
          className="mx-auto flex max-w-lg items-center justify-between gap-3 px-5 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] transition-colors hover:bg-indigo-500/[0.06] sm:px-6"
        >
          <OrganizrLogo
            size={20}
            showWordmark
            wordmarkClassName="text-sm font-semibold tracking-tight text-indigo-100"
            className="gap-2"
          />
          <span className="inline-flex shrink-0 items-center gap-1 text-sm font-medium text-indigo-300">
            Open console
            <span aria-hidden>{arrowRight}</span>
          </span>
        </a>
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
