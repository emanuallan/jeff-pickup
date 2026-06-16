import Link from 'next/link'

/**
 * Console chrome — a persistent top bar + technical background that makes the
 * organizer area instantly recognizable as "behind the scenes" vs. the
 * org-branded public pages (which have no nav and use each org's accent).
 */
export default function ConsoleLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-dvh">
      {/* Distinct console backdrop: indigo top-glow + faint technical grid. */}
      <div className="pointer-events-none fixed inset-0 -z-10 bg-zinc-950">
        <div className="absolute inset-x-0 top-0 h-72 bg-gradient-to-b from-indigo-600/12 via-indigo-600/[0.03] to-transparent" />
        <div
          className="absolute inset-0 opacity-[0.35]"
          style={{
            backgroundImage:
              'radial-gradient(circle at center, rgba(255,255,255,0.04) 1px, transparent 1px)',
            backgroundSize: '22px 22px',
            maskImage: 'linear-gradient(to bottom, black, transparent 70%)',
            WebkitMaskImage: 'linear-gradient(to bottom, black, transparent 70%)',
          }}
        />
      </div>

      <header className="sticky top-0 z-20 border-b border-white/10 bg-zinc-950/80 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-5 sm:px-6">
          <Link href="/console" className="flex items-center gap-2">
            <span className="text-sm font-bold tracking-tight text-zinc-50">Organizr</span>
            <span className="rounded-md bg-indigo-500/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-indigo-300 ring-1 ring-inset ring-indigo-500/30">
              Console
            </span>
          </Link>
          <form action="/auth/signout" method="post">
            <button
              type="submit"
              className="rounded-lg border border-white/10 px-3 py-1.5 text-xs font-medium text-zinc-300 transition hover:border-white/20 hover:bg-white/5"
            >
              Sign out
            </button>
          </form>
        </div>
      </header>

      {children}
    </div>
  )
}
