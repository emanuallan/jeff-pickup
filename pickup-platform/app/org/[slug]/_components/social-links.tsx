import { detectPlatform, type SocialPlatform } from '@/lib/social-links'

const ICON_COLOR = '#fafafa'

function Glyph({ platform }: { platform: SocialPlatform }) {
  const paths = platform.glyph.split(' M').map((seg, i) => (i === 0 ? seg : `M${seg}`))

  if (platform.glyphType === 'stroke') {
    return (
      <svg
        viewBox="0 0 24 24"
        className="h-[18px] w-[18px]"
        fill="none"
        stroke={ICON_COLOR}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        {paths.map((d, i) => (
          <path key={i} d={d} />
        ))}
      </svg>
    )
  }

  return (
    <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill={ICON_COLOR} aria-hidden>
      {paths.map((d, i) => (
        <path key={i} d={d} />
      ))}
    </svg>
  )
}

/** A single uniform circle linking to one URL. */
export function SocialLinkIcon({ url }: { url: string }) {
  const platform = detectPlatform(url)

  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer noopener"
      aria-label={platform.label}
      title={platform.label}
      className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-zinc-700 bg-zinc-900/50 text-zinc-50 transition-colors hover:border-zinc-500 hover:bg-zinc-800/60"
    >
      <Glyph platform={platform} />
    </a>
  )
}

function linkDisplayHost(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

/** Tappable row for a link list (e.g. bottom sheet). */
export function SocialLinkRow({ url }: { url: string }) {
  const platform = detectPlatform(url)

  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer noopener"
      className="flex w-full items-center gap-3 rounded-xl border border-white/10 bg-zinc-950/40 px-4 py-3.5 text-left transition-colors hover:border-zinc-700 hover:bg-zinc-900/60"
    >
      <span
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
        style={{ backgroundColor: platform.color }}
      >
        <Glyph platform={platform} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-zinc-100">{platform.label}</span>
        <span className="mt-0.5 block truncate text-xs text-zinc-500">{linkDisplayHost(url)}</span>
      </span>
      <svg
        className="h-4 w-4 shrink-0 text-zinc-600"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
        <path d="M15 3h6v6" />
        <path d="M10 14 21 3" />
      </svg>
    </a>
  )
}

/** Centered row of an org's social/web links. Renders nothing when empty. */
export function SocialLinks({ links }: { links: string[] }) {
  if (!links.length) return null

  return (
    <nav aria-label="Social links" className="flex flex-wrap items-center justify-center gap-2">
      {links.map((url) => (
        <SocialLinkIcon key={url} url={url} />
      ))}
    </nav>
  )
}
