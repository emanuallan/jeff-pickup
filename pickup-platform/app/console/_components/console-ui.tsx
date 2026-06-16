import Link from 'next/link'

/**
 * Console design language — deliberately distinct from the org-branded public
 * pages. Public pages use each org's accent color, rounded-3xl cards, and a
 * centered mobile layout. The console is a "control panel": a fixed indigo
 * signature accent, tighter radii, denser section cards, and a wider canvas.
 */

// Shared class tokens (importable by client form components).
export const consoleInput =
  'w-full rounded-lg border border-white/10 bg-zinc-950/60 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 outline-none transition focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/25'

export const consoleLabel = 'text-xs font-medium text-zinc-400'

// Touch-friendly tap targets (min ~44px tall) — mobile is the primary surface.
export const btnPrimary =
  'inline-flex min-h-11 items-center justify-center gap-1.5 rounded-lg bg-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500 active:bg-indigo-600 disabled:opacity-50'

export const btnSecondary =
  'inline-flex min-h-11 items-center justify-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-5 py-3 text-sm font-medium text-zinc-100 transition hover:bg-white/10 active:bg-white/5 disabled:opacity-50'

export const btnOutline =
  'inline-flex min-h-11 items-center justify-center gap-1.5 rounded-lg border border-white/10 px-4 py-2.5 text-sm font-medium text-zinc-200 transition hover:border-white/20 hover:bg-white/5'

/** Small padded chip for inline row actions — bigger hit area than bare text links. */
export const chipAction =
  'inline-flex items-center gap-1 rounded-lg px-2.5 py-2 text-xs font-medium transition'

/** Outer page container — wider than the public mobile layout for a desktop console feel. */
export function ConsolePage({
  children,
  width = 'max-w-3xl',
}: {
  children: React.ReactNode
  width?: string
}) {
  return <div className={`mx-auto w-full ${width} px-5 py-8 sm:px-6`}>{children}</div>
}

/** Page heading block: back link, title, description, and right-aligned actions. */
export function ConsoleHeader({
  title,
  description,
  backHref,
  backLabel,
  actions,
}: {
  title: string
  description?: string | null
  backHref?: string
  backLabel?: string
  actions?: React.ReactNode
}) {
  return (
    <div>
      {backHref ? (
        <Link
          href={backHref}
          className="inline-flex min-h-9 items-center gap-1 text-sm text-zinc-400 transition-colors hover:text-zinc-200"
        >
          <span aria-hidden>←</span> {backLabel ?? 'Back'}
        </Link>
      ) : null}
      {/* Mobile-first: title stacks above actions; actions wrap so they never crowd the title. */}
      <div
        className={`flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4 ${
          backHref ? 'mt-4' : ''
        }`}
      >
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-50">{title}</h1>
          {description ? <p className="mt-1 text-sm text-zinc-400">{description}</p> : null}
        </div>
        {actions ? (
          <div className="flex flex-wrap items-center gap-2 sm:shrink-0 sm:justify-end">{actions}</div>
        ) : null}
      </div>
    </div>
  )
}

/**
 * A titled card section — the primary content container in the console.
 * When `collapsible`, it renders as a `<details>` so the body can be tucked
 * away (use `defaultOpen` to control the initial state).
 */
export function ConsoleSection({
  title,
  description,
  action,
  children,
  className = '',
  collapsible = false,
  defaultOpen = true,
}: {
  title?: string
  description?: string
  action?: React.ReactNode
  children: React.ReactNode
  className?: string
  collapsible?: boolean
  defaultOpen?: boolean
}) {
  const shell = `overflow-hidden rounded-xl border border-white/10 bg-zinc-900/50 ${className}`

  if (collapsible && title) {
    return (
      <details open={defaultOpen} className={`group ${shell}`}>
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4">
          <div className="min-w-0">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-indigo-300/90">
              {title}
            </h2>
            {description ? <p className="mt-1 text-xs text-zinc-500">{description}</p> : null}
          </div>
          <span
            className="shrink-0 text-zinc-500 transition-transform group-open:rotate-180"
            aria-hidden
          >
            ⌄
          </span>
        </summary>
        <div className="border-t border-white/5 p-5">{children}</div>
      </details>
    )
  }

  return (
    <section className={shell}>
      {title ? (
        <div className="flex items-start justify-between gap-3 border-b border-white/5 px-5 py-4">
          <div className="min-w-0">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-indigo-300/90">
              {title}
            </h2>
            {description ? <p className="mt-1 text-xs text-zinc-500">{description}</p> : null}
          </div>
          {action ? <div className="shrink-0">{action}</div> : null}
        </div>
      ) : null}
      <div className="p-5">{children}</div>
    </section>
  )
}

/** Plain bordered card (no header) for list items and tiles. */
export function ConsoleCard({
  children,
  className = '',
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={`rounded-lg border border-white/10 bg-zinc-950/40 px-4 py-3 ${className}`}>
      {children}
    </div>
  )
}

/** Collapsible disclosure styled for the console (used for add-forms, past sessions). */
export function Disclosure({
  summary,
  children,
  className = '',
}: {
  summary: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <details
      className={`group rounded-lg border border-white/10 bg-zinc-950/40 ${className}`}
    >
      <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 text-xs font-medium text-zinc-300 transition-colors hover:text-zinc-100">
        {summary}
        <span className="text-zinc-500 transition-transform group-open:rotate-180" aria-hidden>
          ⌄
        </span>
      </summary>
      <div className="border-t border-white/5 px-4 py-4">{children}</div>
    </details>
  )
}

/** Dashed empty-state placeholder. */
export function EmptyState({
  title,
  description,
  children,
}: {
  title: string
  description?: string
  children?: React.ReactNode
}) {
  return (
    <div className="rounded-xl border border-dashed border-white/10 bg-zinc-900/30 px-6 py-12 text-center">
      <p className="text-sm font-medium text-zinc-300">{title}</p>
      {description ? (
        <p className="mx-auto mt-1 max-w-xs text-sm text-zinc-500">{description}</p>
      ) : null}
      {children ? <div className="mt-6">{children}</div> : null}
    </div>
  )
}
