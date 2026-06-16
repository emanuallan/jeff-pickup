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

/** Right-aligned row of an org's social/web links. Renders nothing when empty. */
export function SocialLinks({ links }: { links: string[] }) {
  if (!links.length) return null

  return (
    <div className="mt-10 flex flex-wrap items-center justify-end gap-2">
      {links.map((url) => (
        <SocialLinkIcon key={url} url={url} />
      ))}
    </div>
  )
}
