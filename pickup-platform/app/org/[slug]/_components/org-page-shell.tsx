import Link from 'next/link'
import { getRootDomain } from '@/lib/tenancy/parse-host'
import { rootBaseUrl } from '@/lib/og-metadata'
import { arrowRight } from '@/lib/text-arrows'
import { OrganizrLogo } from '../../../_components/organizr-logo'

export function OrgPageShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto min-h-dvh max-w-lg px-5 py-10 sm:px-6">{children}</main>
  )
}

export function OrgPageFooter({ slug }: { slug: string }) {
  return (
    <footer className="mt-6 flex flex-col items-center gap-2 text-center">
      <a
        href={rootBaseUrl()}
        className="inline-flex items-center gap-1.5 text-xs text-zinc-500 transition-colors hover:text-zinc-300"
      >
        Create your own group with
        <OrganizrLogo size={16} showWordmark wordmarkClassName="font-semibold text-zinc-400" />
        {arrowRight}
      </a>
      <p className="text-xs text-zinc-600">
        {slug}.{getRootDomain()}
      </p>
    </footer>
  )
}

export function LeaderboardLink({ accent }: { accent: string }) {
  return (
    <p className="mt-10 text-center">
      <Link
        href="/leaderboard"
        className="text-sm transition-opacity hover:opacity-80"
        style={{ color: accent }}
      >
        View leaderboard {arrowRight}
      </Link>
    </p>
  )
}
