import Link from 'next/link'

/** Indigo top-glow + faint technical grid — shared by the marketing site and console. */
export function OrganizrBackdrop() {
  return (
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
  )
}

/** Minimal apex-site header — Organizr wordmark only (no Console badge). */
export function OrganizrMarketingHeader() {
  return (
    <header className="sticky top-0 z-20 border-b border-white/10 bg-zinc-950/80 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-5 sm:px-6">
        <Link href="/" className="text-sm font-bold tracking-tight text-zinc-50">
          Organizr
        </Link>
        <Link
          href="/login"
          className="rounded-lg border border-white/10 px-4 py-2 text-sm font-medium text-zinc-200 transition hover:border-white/20 hover:bg-white/5"
        >
          Sign in
        </Link>
      </div>
    </header>
  )
}

/** Primary / secondary CTA classes — matches the console design tokens. */
export const organizrBtnPrimary =
  'inline-flex min-h-11 items-center justify-center rounded-lg bg-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500'

export const organizrBtnSecondary =
  'inline-flex min-h-11 items-center justify-center rounded-lg border border-white/10 bg-white/5 px-5 py-3 text-sm font-medium text-zinc-100 transition hover:bg-white/10'
