import type { Org } from '@/lib/orgs'
import { readableTextColor } from '@/lib/colors'

type Props = {
  org: Org
  title: string
  subtitle?: string | null
  className?: string
}

export function OrgHeader({ org, title, subtitle, className = 'mt-2' }: Props) {
  const accent = org.branding.accent_color

  return (
    <header className={`${className} flex flex-col items-center text-center`}>
      {org.branding.logo_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={org.branding.logo_url}
          alt=""
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
      <h1 className="mt-4 text-3xl font-bold tracking-tight">{title}</h1>
      {subtitle ? <p className="mt-1.5 text-base text-zinc-400">{subtitle}</p> : null}
    </header>
  )
}
