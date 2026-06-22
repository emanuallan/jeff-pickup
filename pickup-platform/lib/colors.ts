const DARK_PAGE_BG = { r: 10, g: 10, b: 10 } // matches :root --background

type Rgb = { r: number; g: number; b: number }

function parseHex(hex: string): Rgb | null {
  const m = /^#?([0-9a-fA-F]{6})$/.exec(hex)
  if (!m) return null
  return {
    r: parseInt(m[1].slice(0, 2), 16),
    g: parseInt(m[1].slice(2, 4), 16),
    b: parseInt(m[1].slice(4, 6), 16),
  }
}

function toHex({ r, g, b }: Rgb): string {
  return `#${[r, g, b].map((c) => c.toString(16).padStart(2, '0')).join('')}`
}

/** WCAG relative luminance for sRGB channels in 0–255. */
function relativeLuminance({ r, g, b }: Rgb): number {
  const channel = (c: number) => {
    const s = c / 255
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)
}

function contrastRatio(foreground: Rgb, background: Rgb): number {
  const l1 = relativeLuminance(foreground)
  const l2 = relativeLuminance(background)
  const lighter = Math.max(l1, l2)
  const darker = Math.min(l1, l2)
  return (lighter + 0.05) / (darker + 0.05)
}

/**
 * Pick a readable foreground color (near-black or white) for text/icons placed
 * on top of a solid `hex` background, based on perceived luminance. Returns
 * colors from the site palette (zinc-950 / white).
 */
export function readableTextColor(hex: string): string {
  const rgb = parseHex(hex)
  if (!rgb) return '#ffffff'
  const luminance = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255
  return luminance > 0.6 ? '#09090b' : '#ffffff'
}

/**
 * Accent as foreground on the app's dark page background (~#0a0a0a).
 * Returns the raw accent when contrast is already sufficient; otherwise blends
 * toward white until WCAG AA (4.5:1) is met.
 *
 * Use for labels, links, and small indicators on dark UI. Keep the raw accent
 * for solid button fills. If results still feel weak, consider pill/chip styling
 * (accent tint background + border) instead of plain text.
 */
export function accentOnDark(hex: string): string {
  const rgb = parseHex(hex)
  if (!rgb) return '#818cf8'

  if (contrastRatio(rgb, DARK_PAGE_BG) >= 4.5) {
    return toHex(rgb)
  }

  for (let mix = 0.05; mix <= 1; mix += 0.05) {
    const blended: Rgb = {
      r: Math.round(rgb.r + (255 - rgb.r) * mix),
      g: Math.round(rgb.g + (255 - rgb.g) * mix),
      b: Math.round(rgb.b + (255 - rgb.b) * mix),
    }
    if (contrastRatio(blended, DARK_PAGE_BG) >= 4.5) {
      return toHex(blended)
    }
  }

  return '#ffffff'
}

/** Convert a 6-digit hex color to an `rgba()` string with the given alpha. */
export function hexToRgba(hex: string, alpha: number): string {
  const rgb = parseHex(hex)
  if (!rgb) return `rgba(37, 99, 235, ${alpha})`
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`
}
