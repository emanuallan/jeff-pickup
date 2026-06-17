import { OrganizrBackdrop } from '../_components/organizr-shell'
import { OrganizrLogo } from '../_components/organizr-logo'

/**
 * Console chrome — a persistent top bar + technical background that makes the
 * organizer area instantly recognizable as "behind the scenes" vs. the
 * org-branded public pages (which have no nav and use each org's accent).
 */
export default function ConsoleLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-dvh">
      <OrganizrBackdrop />

      <header className="sticky top-0 z-20 border-b border-white/10 bg-zinc-950/80 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-5 sm:px-6">
          <div className="flex items-center gap-2">
            <OrganizrLogo href="/console" size={26} />
            <span className="rounded-md bg-indigo-500/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-indigo-300 ring-1 ring-inset ring-indigo-500/30">
              Console
            </span>
          </div>
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
