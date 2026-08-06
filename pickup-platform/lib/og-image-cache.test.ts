import { describe, expect, it } from 'vitest'
import {
  OG_IMAGE_CACHE_CONTROL_RANKING,
  OG_IMAGE_CACHE_CONTROL_SCHEDULE,
  OG_IMAGE_CACHE_CONTROL_SPONSORSHIP,
  OG_IMAGE_CACHE_CONTROL_STATIC,
} from './og-image'

function assertNotImmutableYearLong(value: string) {
  expect(value).not.toContain('immutable')
  expect(value).not.toContain('31536000')
}

describe('OG image Cache-Control tiers', () => {
  it('caches static marketing/pair cards for a day on the CDN', () => {
    expect(OG_IMAGE_CACHE_CONTROL_STATIC).toContain('max-age=3600')
    expect(OG_IMAGE_CACHE_CONTROL_STATIC).toContain('s-maxage=86400')
    expect(OG_IMAGE_CACHE_CONTROL_STATIC).toContain('stale-while-revalidate=604800')
    assertNotImmutableYearLong(OG_IMAGE_CACHE_CONTROL_STATIC)
  })

  it('caches schedule cards for minutes with cheap revalidation', () => {
    expect(OG_IMAGE_CACHE_CONTROL_SCHEDULE).toContain('max-age=300')
    expect(OG_IMAGE_CACHE_CONTROL_SCHEDULE).toContain('s-maxage=900')
    expect(OG_IMAGE_CACHE_CONTROL_SCHEDULE).toContain('stale-while-revalidate=3600')
    assertNotImmutableYearLong(OG_IMAGE_CACHE_CONTROL_SCHEDULE)
  })

  it('caches sponsorship cards longer on the CDN than schedule cards', () => {
    expect(OG_IMAGE_CACHE_CONTROL_SPONSORSHIP).toContain('max-age=300')
    expect(OG_IMAGE_CACHE_CONTROL_SPONSORSHIP).toContain('s-maxage=3600')
    expect(OG_IMAGE_CACHE_CONTROL_SPONSORSHIP).toContain('stale-while-revalidate=86400')
    assertNotImmutableYearLong(OG_IMAGE_CACHE_CONTROL_SPONSORSHIP)
  })

  it('keeps ranking cards on a short CDN TTL', () => {
    expect(OG_IMAGE_CACHE_CONTROL_RANKING).toContain('max-age=60')
    expect(OG_IMAGE_CACHE_CONTROL_RANKING).toContain('s-maxage=300')
    expect(OG_IMAGE_CACHE_CONTROL_RANKING).toContain('stale-while-revalidate=1800')
    assertNotImmutableYearLong(OG_IMAGE_CACHE_CONTROL_RANKING)
  })
})
