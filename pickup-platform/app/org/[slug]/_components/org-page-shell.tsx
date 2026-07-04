import Link from 'next/link'
import type { ReactNode } from 'react'
import { getRootDomain } from '@/lib/tenancy/parse-host'
import { rootBaseUrl } from '@/lib/og-metadata'
import { orgPublicTabHref } from '@/lib/org-public-nav'
import { accentOnDark } from '@/lib/colors'
import { arrowRight } from '@/lib/text-arrows'
import { OrganizrLogo } from '../../../_components/organizr-logo'
import { SocialLinks } from './social-links'
import { OrganizerConsoleBarSlot } from './organizer-console-bar'

export function OrgPageShell({
  slug,
  children,
}: {
  slug: string
  children: React.ReactNode
}) {
  return (
    <>
      <main className="mx-auto min-h-dvh max-w-lg px-5 py-10 sm:px-6">{children}</main>
      <OrganizerConsoleBarSlot slug={slug} />
    </>
  )
}

type FooterProps = {
  slug: string
  links: string[]
  /** When leaderboard unlock is already known (e.g. events list page). */
  showLeaderboard?: boolean
  accent?: string
  /** For async leaderboard check (e.g. event detail page). */
  leaderboardSlot?: ReactNode
}

export function OrgPageFooter({
  slug,
  links,
  showLeaderboard,
  accent,
  leaderboardSlot,
}: FooterProps) {
  const leaderboard =
    leaderboardSlot ??
    (showLeaderboard && accent ? <LeaderboardLink accent={accent} /> : null)
  const hasOrgNav = Boolean(leaderboard) || links.length > 0

  return (
    <footer className="mt-12 border-t border-zinc-800/70 pt-8">
      {hasOrgNav ? (
        <nav aria-label="Group links" className="flex flex-col items-center gap-5">
          {leaderboard}
          {links.length > 0 ? <SocialLinks links={links} /> : null}
        </nav>
      ) : null}

      <div
        className={`flex flex-col items-center gap-2 text-center ${hasOrgNav ? 'mt-8' : ''}`}
      >
        <p className="text-[11px] font-medium tracking-wide text-zinc-600">
          {slug}.{getRootDomain()}
        </p>
        <a
          href={rootBaseUrl()}
          title="Create your own group on Organizr"
          className="inline-flex items-center gap-1.5 text-xs text-zinc-500 transition-colors hover:text-zinc-400"
        >
          <span>Powered by</span>
          <OrganizrLogo
            size={14}
            showWordmark
            wordmarkClassName="font-medium text-zinc-500"
          />
        </a>
      </div>
    </footer>
  )
}

export function LeaderboardLink({ accent }: { accent: string }) {
  return (
    <Link
      href={orgPublicTabHref('/', 'leaderboard')}
      className="inline-flex items-center gap-1 text-sm transition-opacity hover:opacity-80"
      style={{ color: accentOnDark(accent) }}
    >
      View leaderboard {arrowRight}
    </Link>
  )
}
