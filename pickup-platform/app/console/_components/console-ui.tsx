import Link from 'next/link'
import type { ReactNode } from 'react'

/**
 * Console design language — deliberately distinct from the org-branded public
 * pages. Public pages use each org's accent color, rounded-3xl cards, and a
 * centered mobile layout. The console is a "control panel": a fixed indigo
 * signature accent, tighter radii, denser section cards, and a wider canvas.
 */

// Shared class tokens (importable by client form components).
export const consoleInput =
  'w-full rounded-lg border border-white/10 bg-zinc-950/60 px-3 py-2.5 text-base text-zinc-100 placeholder:text-zinc-600 outline-none transition focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/25 sm:py-2 sm:text-sm'

export const consoleLabel = 'text-xs font-medium text-zinc-400'

/** Bottom sheet on mobile, centered dialog on larger screens. */
export const consoleModalOverlay =
  'fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4'

export const consoleModalBackdrop = 'absolute inset-0 bg-black/60 backdrop-blur-sm'

export const consoleModalPanel =
  'relative max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-t-2xl border border-white/10 bg-zinc-900 p-5 shadow-xl pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:rounded-xl sm:pb-5'

// Touch-friendly tap targets (min ~44px tall) — mobile is the primary surface.
export const btnPrimary =
  'inline-flex min-h-11 items-center justify-center gap-1.5 rounded-lg bg-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500 active:bg-indigo-600 disabled:opacity-50'

export const btnSecondary =
  'inline-flex min-h-11 items-center justify-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-5 py-3 text-sm font-medium text-zinc-100 transition hover:bg-white/10 active:bg-white/5 disabled:opacity-50'

export const btnOutline =
  'inline-flex min-h-11 items-center justify-center gap-1.5 rounded-lg border border-white/10 px-4 py-2.5 text-sm font-medium text-zinc-200 transition hover:border-white/20 hover:bg-white/5'

/** Soft indigo CTA — matches the Manage button on the groups list. */
export const btnAccent =
  'inline-flex min-h-11 items-center justify-center gap-1.5 rounded-lg bg-indigo-500/15 px-3 py-2.5 text-sm font-semibold text-indigo-200 ring-1 ring-inset ring-indigo-500/25 transition hover:bg-indigo-500/25 disabled:opacity-50'

/** Small padded chip for inline row actions — bigger hit area than bare text links. */
export const chipAction =
  'inline-flex min-h-10 items-center gap-1 rounded-lg px-2.5 py-2 text-xs font-medium transition'

/** Standard submit button for console forms — shows a pending label while saving. */
export function ConsoleSubmitButton({
  pending,
  pendingLabel = 'Saving…',
  className = btnSecondary,
  children,
  disabled,
  ...rest
}: Omit<React.ComponentProps<'button'>, 'type'> & {
  pending: boolean
  pendingLabel?: string
}) {
  return (
    <button
      type="submit"
      disabled={pending || disabled}
      className={className}
      aria-busy={pending}
      {...rest}
    >
      {pending ? pendingLabel : children}
    </button>
  )
}

/** Outer page container — wider than the public mobile layout for a desktop console feel. */
export function ConsolePage({
  children,
  width = 'max-w-3xl',
}: {
  children: React.ReactNode
  width?: string
}) {
  return <div className={`mx-auto w-full ${width} px-4 py-6 sm:px-6 sm:py-8`}>{children}</div>
}

/** Page heading block: back link, title, description, and right-aligned actions. */
export function ConsoleHeader({
  title,
  description,
  backHref,
  backLabel,
  actions,
  live,
}: {
  title: string
  description?: string | null
  backHref?: string
  backLabel?: string
  actions?: React.ReactNode
  live?: boolean
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
          <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight text-zinc-50">
            {live ? (
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full bg-red-500 ring-2 ring-red-500/25"
                aria-hidden
              />
            ) : null}
            <span>{title}</span>
            {live ? <span className="sr-only"> — live</span> : null}
          </h1>
          {description ? <p className="mt-1 text-sm text-zinc-400">{description}</p> : null}
        </div>
        {actions ? (
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center sm:justify-end [&_a]:w-full sm:[&_a]:w-auto [&_button]:w-full sm:[&_button]:w-auto">
            {actions}
          </div>
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
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3.5 sm:px-5 sm:py-4">
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
        <div className="border-t border-white/5 p-4 sm:p-5">{children}</div>
      </details>
    )
  }

  return (
    <section className={shell}>
      {title ? (
        <div className="flex flex-col gap-2 border-b border-white/5 px-4 py-3.5 sm:flex-row sm:items-start sm:justify-between sm:gap-3 sm:px-5 sm:py-4">
          <div className="min-w-0">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-indigo-300/90">
              {title}
            </h2>
            {description ? <p className="mt-1 text-xs text-zinc-500">{description}</p> : null}
          </div>
          {action ? <div className="shrink-0">{action}</div> : null}
        </div>
      ) : null}
      <div className="p-4 sm:p-5">{children}</div>
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
    <div className={`rounded-lg border border-white/10 bg-zinc-950/40 px-3 py-3 sm:px-4 ${className}`}>
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
      <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between px-3 py-3 text-xs font-medium text-zinc-300 transition-colors hover:text-zinc-100 sm:px-4">
        {summary}
        <span className="text-zinc-500 transition-transform group-open:rotate-180" aria-hidden>
          ⌄
        </span>
      </summary>
      <div className="border-t border-white/5 px-3 py-4 sm:px-4">{children}</div>
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

const navTileClass =
  'flex aspect-square flex-col items-center justify-center rounded-xl border border-white/10 bg-zinc-900/50 p-3 text-center transition active:scale-[0.98] hover:border-indigo-500/30 hover:bg-zinc-900'

const navTileDisabledClass =
  'pointer-events-none flex aspect-square flex-col items-center justify-center rounded-xl border border-white/5 bg-zinc-900/30 p-3 text-center opacity-50'

/** Square nav tile for the org console hub — mobile-first grid entry point. */
export function ConsoleNavTile({
  href,
  title,
  icon,
  badge,
  external,
  disabled,
  live,
}: {
  href: string
  title: string
  icon: React.ReactNode
  badge?: ReactNode
  external?: boolean
  disabled?: boolean
  live?: boolean
}) {
  const content = (
    <>
      <div className="flex h-10 w-10 items-center justify-center text-indigo-300">{icon}</div>
      <div className="mt-2 flex items-center justify-center gap-1.5">
        {live ? (
          <span
            className="h-2 w-2 shrink-0 rounded-full bg-red-500 ring-2 ring-red-500/25"
            aria-hidden
          />
        ) : null}
        <span className="text-sm font-medium leading-tight text-zinc-100">{title}</span>
        {live ? <span className="sr-only"> — live session</span> : null}
      </div>
      {badge != null && badge !== '' ? (
        <div className="mt-1 text-xs leading-tight text-zinc-500">{badge}</div>
      ) : null}
    </>
  )

  if (disabled) {
    return (
      <div className={navTileDisabledClass} aria-disabled="true">
        {content}
      </div>
    )
  }

  if (external) {
    return (
      <a href={href} target="_blank" rel="noreferrer" className={navTileClass}>
        {content}
      </a>
    )
  }

  return (
    <Link href={href} className={navTileClass}>
      {content}
    </Link>
  )
}

/** Responsive grid of console section tiles. */
export function ConsoleNavGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">{children}</div>
}
