import { describe, expect, it } from 'vitest'
import { matchesLogoMagicBytes, type OrgLogoMimeType } from './org-logo'

describe('matchesLogoMagicBytes', () => {
  it('recognizes PNG signatures', () => {
    const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
    expect(matchesLogoMagicBytes(png, 'image/png')).toBe(true)
  })

  it('recognizes JPEG signatures', () => {
    const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xe0])
    expect(matchesLogoMagicBytes(jpeg, 'image/jpeg')).toBe(true)
  })

  it('recognizes WebP signatures', () => {
    const webp = new Uint8Array([
      0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50,
    ])
    expect(matchesLogoMagicBytes(webp, 'image/webp')).toBe(true)
  })

  it('rejects mismatched content', () => {
    const bytes = new Uint8Array([0x00, 0x00, 0x00, 0x00])
    const mimes: OrgLogoMimeType[] = ['image/png', 'image/jpeg', 'image/webp']
    for (const mime of mimes) {
      expect(matchesLogoMagicBytes(bytes, mime)).toBe(false)
    }
  })
})
