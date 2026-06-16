import Link from 'next/link'
import { getRootDomain } from '@/lib/tenancy/parse-host'

export function OrgPageShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto min-h-dvh max-w-lg px-5 py-10 sm:px-6">{children}</main>
  )
}

export function OrgPageFooter({ slug }: { slug: string }) {
  return (
    <p className="mt-6 text-center text-xs text-zinc-600">
      {slug}.{getRootDomain()}
    </p>
  )
}

export function LeaderboardLink() {
  return (
    <p className="mt-10 text-center">
      <Link href="/leaderboard" className="text-sm text-zinc-400 hover:text-zinc-200">
        View leaderboard →
      </Link>
    </p>
  )
}
