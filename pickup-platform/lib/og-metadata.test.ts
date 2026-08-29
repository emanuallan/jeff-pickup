import { describe, expect, it } from 'vitest'
import { orgHomeOgImagePath } from './og-metadata'

describe('orgHomeOgImagePath', () => {
  it('uses the stable next-session card for the bare home URL', () => {
    expect(orgHomeOgImagePath()).toBe('/cal/og-image')
    expect(orgHomeOgImagePath(null)).toBe('/cal/og-image')
    expect(orgHomeOgImagePath('')).toBe('/cal/og-image')
  })

  it('pins deep links to the event-specific card', () => {
    expect(orgHomeOgImagePath('sUNR6Cby')).toBe('/cal/sUNR6Cby/og-image')
  })
})
