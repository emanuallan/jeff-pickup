import Link from 'next/link'
import { OrganizrBackdrop, OrganizrMarketingHeader } from './organizr-shell'
import { OrganizrLogo } from './organizr-logo'

export function MarketingCheck() {
  return (
    <span
      className="mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center text-indigo-400"
      aria-hidden
    >
      ✓
    </span>
  )
}

export function MarketingFooter() {
  return (
    <footer className="mt-16 border-t border-white/10 pt-8">
      <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col items-center gap-2 sm:items-start">
          <OrganizrLogo />
          <p className="text-xs text-zinc-500">Pickup soccer, organized.</p>
        </div>
        <nav
          className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm text-zinc-500"
          aria-label="Footer"
        >
          <Link href="/features" className="transition-colors hover:text-zinc-300">
            Features
          </Link>
          <Link href="/about" className="transition-colors hover:text-zinc-300">
            About
          </Link>
          <Link href="/privacy" className="transition-colors hover:text-zinc-300">
            Privacy
          </Link>
          <Link href="/terms" className="transition-colors hover:text-zinc-300">
            Terms
          </Link>
          <a
            href="https://aeserna.com"
            target="_blank"
            rel="noreferrer"
            className="transition-colors hover:text-zinc-300"
          >
            Contact
          </a>
        </nav>
      </div>
      <p className="mt-6 text-center text-xs text-zinc-600 sm:text-left">
        © {new Date().getFullYear()} Organizr
      </p>
    </footer>
  )
}

type MarketingPageProps = {
  title: string
  children: React.ReactNode
  demoUrl?: string
  actions?: React.ReactNode
  /** Short line under the page title. */
  intro?: string
  /** When false, children render without prose-organizr wrapper (for custom layouts). */
  prose?: boolean
  /** Wider column for card grids (features) instead of the reading column. */
  wide?: boolean
}

export function MarketingPage({
  title,
  children,
  demoUrl,
  actions,
  intro,
  prose = true,
  wide = false,
}: MarketingPageProps) {
  return (
    <div className="relative min-h-dvh">
      <OrganizrBackdrop pitch />
      <OrganizrMarketingHeader demoUrl={demoUrl} />

      <main
        className={`mx-auto ${wide ? 'max-w-5xl' : 'max-w-2xl'} px-6 py-12 sm:px-8`}
      >
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-50 sm:text-4xl">{title}</h1>
        {intro ? (
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-zinc-400">{intro}</p>
        ) : null}
        <div className={prose ? 'prose-organizr mt-8' : 'mt-8'}>{children}</div>
        {actions ? <div className="mt-10 flex flex-col gap-3 sm:flex-row">{actions}</div> : null}
        <MarketingFooter />
      </main>
    </div>
  )
}
