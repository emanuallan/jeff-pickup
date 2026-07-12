import { describe, expect, it } from 'vitest'
import {
  isCalAssetSegment,
  orgHomeCanonicalPath,
  orgPublicNavActiveKey,
  orgPublicTabHref,
} from './org-public-nav'

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

describe('orgPublicTabHref', () => {
  it('builds feed tab links', () => {
    expect(orgPublicTabHref('/', 'feed')).toBe('/?tab=feed')
  })
})

describe('orgHomeCanonicalPath', () => {
  it('includes feed tab in canonical paths', () => {
    expect(orgHomeCanonicalPath({ tab: 'feed' })).toBe('/?tab=feed')
  })
})

describe('orgPublicNavActiveKey', () => {
  it('maps feed tab query params', () => {
    expect(orgPublicNavActiveKey('/', 'feed', '/')).toBe('feed')
  })
})
