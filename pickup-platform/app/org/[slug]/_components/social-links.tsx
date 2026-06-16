import { detectPlatform, type SocialPlatform } from '@/lib/social-links'
import { hexToRgba } from '@/lib/colors'

/** Lift very dark brand colors (e.g. X, GitHub) so the glyph reads on a dark bg. */
function glyphColor(hex: string): string {
  const m = /^#?([0-9a-fA-F]{6})$/.exec(hex)
  if (!m) return hex
  const r = parseInt(m[1].slice(0, 2), 16)
  const g = parseInt(m[1].slice(2, 4), 16)
  const b = parseInt(m[1].slice(4, 6), 16)
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return luminance < 0.22 ? '#fafafa' : hex
}

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

/** A single brand-glowing circle linking to one URL. */
export function SocialLinkIcon({ url }: { url: string }) {
  const platform = detectPlatform(url)
  const fg = glyphColor(platform.color)

  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer noopener"
      aria-label={platform.label}
      title={platform.label}
      className="group inline-flex h-9 w-9 items-center justify-center rounded-full border backdrop-blur-sm transition-all duration-200 hover:scale-110"
      style={{
        backgroundColor: hexToRgba(platform.color, 0.12),
        borderColor: hexToRgba(platform.color, 0.55),
        boxShadow: `0 0 0 1px ${hexToRgba(platform.color, 0.18)}, 0 0 18px ${hexToRgba(platform.color, 0.4)}`,
      }}
    >
      <span
        className="inline-flex transition-[filter] duration-200"
        style={{ filter: `drop-shadow(0 0 6px ${hexToRgba(platform.color, 0.65)})` }}
      >
        <Glyph platform={platform} color={fg} />
      </span>
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
