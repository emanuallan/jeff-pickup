import { describe, expect, it } from 'vitest'
import { isCalAssetSegment } from './org-public-nav'

describe('isCalAssetSegment', () => {
  it('recognizes share and OG image routes', () => {
    expect(isCalAssetSegment('share-image')).toBe(true)
    expect(isCalAssetSegment('og-image')).toBe(true)
  })

  it('does not treat event short IDs as asset routes', () => {
    expect(isCalAssetSegment('abc123')).toBe(false)
    expect(isCalAssetSegment('ZbG6e5qK')).toBe(false)
  })
})
