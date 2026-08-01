import Link from 'next/link'
import { OrganizrLogo } from './organizr-logo'

/**
 * Faint pitch markings behind the marketing pages — a sport cue you register
 * without noticing. Anchored off the top-right so it never sits under body copy.
 */
function PitchLines() {
  return (
    <div
      className="absolute inset-x-0 top-[24vh] h-[115vh]"
      style={{
        maskImage: 'linear-gradient(to bottom, transparent, black 22%, black 62%, transparent 92%)',
        WebkitMaskImage:
          'linear-gradient(to bottom, transparent, black 22%, black 62%, transparent 92%)',
      }}
    >
      <svg
        className="h-full w-full"
        viewBox="0 0 1200 760"
        preserveAspectRatio="xMidYMid slice"
        fill="none"
        stroke="rgba(255,255,255,0.07)"
        strokeWidth={2}
        aria-hidden
      >
        <rect x="40" y="40" width="1120" height="680" />
        <line x1="600" y1="40" x2="600" y2="720" />
        <circle cx="600" cy="380" r="118" />
        <rect x="40" y="200" width="180" height="360" />
        <rect x="40" y="290" width="72" height="180" />
        <rect x="980" y="200" width="180" height="360" />
        <rect x="1088" y="290" width="72" height="180" />
        <path d="M220 300a118 118 0 0 1 0 160" />
        <path d="M980 300a118 118 0 0 0 0 160" />
      </svg>
    </div>
  )
}

/** Indigo top-glow + faint technical grid — shared by the marketing site and console. */
export function OrganizrBackdrop({ pitch = false }: { pitch?: boolean }) {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 bg-zinc-950">
      <div className="absolute inset-x-0 top-0 h-72 bg-gradient-to-b from-indigo-600/12 via-indigo-600/[0.03] to-transparent" />
      {pitch ? <PitchLines /> : null}
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
  )
}

const headerBtnClass =
  'rounded-lg border border-white/10 px-4 py-2 text-sm font-medium text-zinc-200 transition hover:border-white/20 hover:bg-white/5'

const headerDemoBtnClass =
  'rounded-lg border border-indigo-500/30 px-4 py-2 text-sm font-medium text-indigo-300 transition hover:border-indigo-400/50 hover:bg-indigo-500/10 hover:text-indigo-200'

const headerNavLinkClass =
  'text-sm font-medium text-zinc-400 transition-colors hover:text-zinc-100'

/** Minimal apex-site header — Organizr wordmark only (no Console badge). */
export function OrganizrMarketingHeader({
  showSignIn = true,
  demoUrl,
}: {
  showSignIn?: boolean
  demoUrl?: string
}) {
  return (
    <header className="sticky top-0 z-20 border-b border-white/10 bg-zinc-950/80 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-4 px-5 sm:px-6">
        <div className="flex items-center gap-7">
          <OrganizrLogo href="/" priority />
          <nav className="hidden items-center gap-6 sm:flex" aria-label="Main">
            <Link href="/features" className={headerNavLinkClass}>
              Features
            </Link>
            <Link href="/about" className={headerNavLinkClass}>
              About
            </Link>
          </nav>
        </div>
        {demoUrl || showSignIn ? (
          <div className="flex items-center gap-2">
            {demoUrl ? (
              <a
                href={demoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={headerDemoBtnClass}
              >
                Try the demo
              </a>
            ) : null}
            {showSignIn ? (
              <Link href="/login" className={headerBtnClass}>
                Sign in
              </Link>
            ) : null}
          </div>
        ) : null}
      </div>
    </header>
  )
}

/** Uppercase indigo eyebrow with a live dot — the marketing "matchday" cue. */
export function OrganizrEyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="inline-flex items-center gap-2 self-start rounded-full border border-indigo-500/25 bg-indigo-500/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-indigo-300">
      <span className="h-1.5 w-1.5 rounded-full bg-indigo-400" aria-hidden />
      {children}
    </p>
  )
}

/** Form field tokens — matches the console input style. */
export const organizrLabel = 'text-xs font-medium text-zinc-400'

export const organizrInput =
  'mt-1 w-full rounded-lg border border-white/10 bg-zinc-950/60 px-3 py-2.5 text-base text-zinc-100 placeholder:text-zinc-600 outline-none transition focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/25 sm:text-sm'

/** Primary / secondary CTA classes — matches the console design tokens. */
export const organizrBtnPrimary =
  'inline-flex min-h-11 items-center justify-center rounded-lg bg-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500'

export const organizrBtnSecondary =
  'inline-flex min-h-11 items-center justify-center rounded-lg border border-white/10 bg-white/5 px-5 py-3 text-sm font-medium text-zinc-100 transition hover:bg-white/10'
