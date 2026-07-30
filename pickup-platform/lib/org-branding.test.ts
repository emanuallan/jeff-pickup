import { describe, expect, it } from 'vitest'
import { DEFAULT_ORG_ACCENT, initialOrgBranding, normalizeAccentColor } from './org-branding'

describe('normalizeAccentColor', () => {
  it('accepts valid 6-digit hex', () => {
    expect(normalizeAccentColor('#abCDef')).toBe('#abCDef')
    expect(normalizeAccentColor('  #00ff00  ')).toBe('#00ff00')
  })

  it('falls back for invalid values', () => {
    expect(normalizeAccentColor('')).toBe(DEFAULT_ORG_ACCENT)
    expect(normalizeAccentColor(null)).toBe(DEFAULT_ORG_ACCENT)
    expect(normalizeAccentColor('#fff')).toBe(DEFAULT_ORG_ACCENT)
    expect(normalizeAccentColor('blue')).toBe(DEFAULT_ORG_ACCENT)
    expect(normalizeAccentColor('#gg0000')).toBe(DEFAULT_ORG_ACCENT)
  })
})

describe('initialOrgBranding', () => {
  it('builds branding with normalized accent and empty links', () => {
    expect(initialOrgBranding('#112233')).toEqual({
      logo_url: null,
      accent_color: '#112233',
      links: [],
    })
  })

  it('uses default accent when invalid', () => {
    expect(initialOrgBranding('nope')).toEqual({
      logo_url: null,
      accent_color: DEFAULT_ORG_ACCENT,
      links: [],
    })
  })
})
