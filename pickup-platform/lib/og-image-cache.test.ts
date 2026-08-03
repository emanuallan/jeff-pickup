import { describe, expect, it } from 'vitest'
import { OG_IMAGE_CACHE_CONTROL } from './og-image'

describe('OG_IMAGE_CACHE_CONTROL', () => {
  it('keeps CDN TTL short instead of Next ImageResponse 1y immutable default', () => {
    expect(OG_IMAGE_CACHE_CONTROL).toContain('max-age=60')
    expect(OG_IMAGE_CACHE_CONTROL).toContain('s-maxage=60')
    expect(OG_IMAGE_CACHE_CONTROL).toContain('stale-while-revalidate=300')
    expect(OG_IMAGE_CACHE_CONTROL).not.toContain('immutable')
    expect(OG_IMAGE_CACHE_CONTROL).not.toContain('31536000')
  })
})
