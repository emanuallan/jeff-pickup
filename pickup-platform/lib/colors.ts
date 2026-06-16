/**
 * Pick a readable foreground color (near-black or white) for text/icons placed
 * on top of a solid `hex` background, based on perceived luminance. Returns
 * colors from the site palette (zinc-950 / white).
 */
export function readableTextColor(hex: string): string {
  const m = /^#?([0-9a-fA-F]{6})$/.exec(hex)
  if (!m) return '#ffffff'
  const r = parseInt(m[1].slice(0, 2), 16)
  const g = parseInt(m[1].slice(2, 4), 16)
  const b = parseInt(m[1].slice(4, 6), 16)
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return luminance > 0.6 ? '#09090b' : '#ffffff'
}

/** Convert a 6-digit hex color to an `rgba()` string with the given alpha. */
export function hexToRgba(hex: string, alpha: number): string {
  const m = /^#?([0-9a-fA-F]{6})$/.exec(hex)
  if (!m) return `rgba(37, 99, 235, ${alpha})`
  const r = parseInt(m[1].slice(0, 2), 16)
  const g = parseInt(m[1].slice(2, 4), 16)
  const b = parseInt(m[1].slice(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}
