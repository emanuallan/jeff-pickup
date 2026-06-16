import { detectPlatform, type SocialPlatform } from '@/lib/social-links'
import { readableTextColor } from '@/lib/colors'

function Glyph({ platform, color }: { platform: SocialPlatform; color: string }) {
  const paths = platform.glyph.split(' M').map((seg, i) => (i === 0 ? seg : `M${seg}`))

  if (platform.glyphType === 'stroke') {
    return (
      <svg
        viewBox="0 0 24 24"
        className="h-[18px] w-[18px]"
        fill="none"
        stroke={color}
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
    <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill={color} aria-hidden>
      {paths.map((d, i) => (
        <path key={i} d={d} />
      ))}
    </svg>
  )
}

/** A single brand-colored circle linking to one URL. */
export function SocialLinkIcon({ url }: { url: string }) {
  const platform = detectPlatform(url)
  const fg = readableTextColor(platform.color)

  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer noopener"
      aria-label={platform.label}
      title={platform.label}
      className="inline-flex h-9 w-9 items-center justify-center rounded-full ring-1 ring-white/10 transition-transform hover:scale-110"
      style={{ backgroundColor: platform.color }}
    >
      <Glyph platform={platform} color={fg} />
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
