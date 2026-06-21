import Link from 'next/link'
import { OrganizrBackdrop, OrganizrMarketingHeader } from './organizr-shell'

export function MarketingFooter() {
  return (
    <footer className="mt-16 border-t border-white/10 pt-8">
      <nav className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm text-zinc-500">
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
      <p className="mt-4 text-center text-xs text-zinc-600">
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
}

export function MarketingPage({ title, children, demoUrl, actions }: MarketingPageProps) {
  return (
    <div className="relative min-h-dvh">
      <OrganizrBackdrop />
      <OrganizrMarketingHeader demoUrl={demoUrl} />

      <main className="mx-auto max-w-2xl px-6 py-12 sm:px-8">
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-50">{title}</h1>
        <div className="prose-organizr mt-8">{children}</div>
        {actions ? <div className="mt-10 flex flex-col gap-3 sm:flex-row">{actions}</div> : null}
        <MarketingFooter />
      </main>
    </div>
  )
}
