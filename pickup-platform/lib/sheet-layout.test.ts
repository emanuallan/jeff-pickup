import { describe, expect, it, vi } from 'vitest'
import { COMPACT_SHEET_MEDIA_QUERY, matchesCompactSheetLayout } from './sheet-layout'

describe('sheet-layout', () => {
  it('exposes a media query for narrow or short viewports', () => {
    expect(COMPACT_SHEET_MEDIA_QUERY).toContain('max-width: 639px')
    expect(COMPACT_SHEET_MEDIA_QUERY).toContain('max-height: 720px')
  })

  it('matches when the compact media query matches', () => {
    const matchMedia = vi.fn().mockReturnValue({ matches: true })
    expect(matchesCompactSheetLayout(matchMedia)).toBe(true)
    expect(matchMedia).toHaveBeenCalledWith(COMPACT_SHEET_MEDIA_QUERY)
  })

  it('does not match tall wide viewports', () => {
    const matchMedia = vi.fn().mockReturnValue({ matches: false })
    expect(matchesCompactSheetLayout(matchMedia)).toBe(false)
  })
})
