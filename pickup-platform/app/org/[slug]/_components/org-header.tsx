import Image from 'next/image'
import type { Org } from '@/lib/orgs'
import { accentOnDark, readableTextColor } from '@/lib/colors'

type Props = {
  org: Org
  title: string
  subtitle?: string | null
  /** Small label above the title — e.g. "Home" or a date line. */
  eyebrow?: string | null
  className?: string
  /** Preload logo on above-the-fold pages (event detail). */
  logoPriority?: boolean
  /** Centered mobile stack; horizontal row on desktop public pages. */
  layout?: 'mobile' | 'desktop'
}

export function OrgHeader({
  org,
  title,
  subtitle,
  eyebrow,
  className = 'mt-2',
  logoPriority,
  layout = 'mobile',
}: Props) {
  const accent = org.branding.accent_color
  const isDesktop = layout === 'desktop'

  const logo = org.branding.logo_url ? (
    <Image
      src={org.branding.logo_url}
      alt=""
      width={isDesktop ? 96 : 80}
      height={isDesktop ? 96 : 80}
      priority={logoPriority}
      sizes={isDesktop ? '96px' : '80px'}
      className={`rounded-2xl object-cover shadow-lg ${
        isDesktop ? 'h-24 w-24' : 'h-20 w-20'
      }`}
    />
  ) : (
    <div
      className={`flex items-center justify-center rounded-2xl font-bold shadow-lg ${
        isDesktop ? 'h-24 w-24 text-4xl' : 'h-20 w-20 text-3xl'
      }`}
      style={{ backgroundColor: accent, color: readableTextColor(accent) }}
    >
      {org.name.charAt(0).toUpperCase()}
    </div>
  )

  return (
    <header
      className={`${className} flex ${
        isDesktop
          ? 'flex-row items-center gap-6 text-left'
          : 'flex-col items-center text-center'
      }`}
    >
      {logo}
      <div className={isDesktop ? 'min-w-0' : undefined}>
        {eyebrow ? (
          <p
            className={`text-xs font-semibold uppercase tracking-wider ${
              isDesktop ? '' : 'mt-4'
            }`}
            style={{ color: accentOnDark(accent) }}
          >
            {eyebrow}
          </p>
        ) : null}
        <h1
          className={`font-bold tracking-tight ${
            isDesktop
              ? 'text-4xl'
              : `${eyebrow ? 'mt-2' : 'mt-4'} text-3xl`
          }`}
        >
          {title}
        </h1>
        {subtitle ? (
          <p
            className={`text-zinc-400 ${
              isDesktop ? 'mt-2 max-w-2xl text-lg leading-relaxed' : 'mt-1.5 text-base'
            }`}
          >
            {subtitle}
          </p>
        ) : null}
      </div>
    </header>
  )
}
