import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getPublicOrgBySlug } from '@/lib/public-data'
import { accentOnDark, hexToRgba, readableTextColor } from '@/lib/colors'

type Props = {
  params: Promise<{ slug: string }>
}

export default async function SponsorshipCanceledPage({ params }: Props) {
  const { slug } = await params
  const org = await getPublicOrgBySlug(slug)
  if (!org) notFound()

  const accent = org.branding.accent_color
  const accentFg = readableTextColor(accent)
  const accentSoft = accentOnDark(accent)

  return (
    <div className="overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-900/40">
      <div
        aria-hidden
        className="h-1 w-full"
        style={{
          background: `linear-gradient(90deg, transparent 0%, ${hexToRgba(accent, 0.55)} 50%, transparent 100%)`,
        }}
      />
      <div className="px-5 py-7 sm:px-6 sm:py-8">
        <p
          className="text-[11px] font-semibold uppercase tracking-[0.18em]"
          style={{ color: hexToRgba(accentSoft, 0.95) }}
        >
          Checkout canceled
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-zinc-50">No charge made</h1>
        <p className="mt-3 max-w-prose text-sm leading-relaxed text-zinc-400">
          No worries — pick a tier again whenever you&apos;re ready to support {org.name}.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/sponsorship"
            className="inline-flex min-h-11 items-center justify-center rounded-xl px-5 py-3 text-sm font-semibold transition hover:brightness-110"
            style={{ backgroundColor: accent, color: accentFg }}
          >
            Try again
          </Link>
          <Link
            href="/"
            className="inline-flex min-h-11 items-center justify-center rounded-xl border border-zinc-700 px-5 py-3 text-sm font-semibold text-zinc-200 transition hover:border-zinc-500 hover:bg-zinc-900/60"
          >
            Back to {org.name}
          </Link>
        </div>
      </div>
    </div>
  )
}
