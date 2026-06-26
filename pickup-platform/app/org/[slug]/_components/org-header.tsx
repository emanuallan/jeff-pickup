import Image from 'next/image'
import type { Org } from '@/lib/orgs'
import { accentOnDark, readableTextColor } from '@/lib/colors'

type Props = {
  org: Org
  title: string
  subtitle?: string | null
  /** Small label above the title — e.g. "Upcoming sessions" or a date line. */
  eyebrow?: string | null
  className?: string
  /** Preload logo on above-the-fold pages (event detail). */
  logoPriority?: boolean
}

export function OrgHeader({
  org,
  title,
  subtitle,
  eyebrow,
  className = 'mt-2',
  logoPriority,
}: Props) {
  const accent = org.branding.accent_color

  return (
    <header className={`${className} flex flex-col items-center text-center`}>
      {org.branding.logo_url ? (
        <Image
          src={org.branding.logo_url}
          alt=""
          width={80}
          height={80}
          priority={logoPriority}
          sizes="80px"
          className="h-20 w-20 rounded-2xl object-cover shadow-lg"
        />
      ) : (
        <div
          className="flex h-20 w-20 items-center justify-center rounded-2xl text-3xl font-bold shadow-lg"
          style={{ backgroundColor: accent, color: readableTextColor(accent) }}
        >
          {org.name.charAt(0).toUpperCase()}
        </div>
      )}
      {eyebrow ? (
        <p
          className="mt-4 text-xs font-semibold uppercase tracking-wider"
          style={{ color: accentOnDark(accent) }}
        >
          {eyebrow}
        </p>
      ) : null}
      <h1 className={`${eyebrow ? 'mt-2' : 'mt-4'} text-3xl font-bold tracking-tight`}>{title}</h1>
      {subtitle ? <p className="mt-1.5 text-base text-zinc-400">{subtitle}</p> : null}
    </header>
  )
}
