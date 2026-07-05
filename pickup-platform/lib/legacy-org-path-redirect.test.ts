import { describe, expect, it } from 'vitest'
import { getLegacyOrgPathRedirect } from './legacy-org-path-redirect'

describe('getLegacyOrgPathRedirect', () => {
  describe('calendar share and OG image routes', () => {
    it('does not redirect tenant calendar share-image paths', () => {
      expect(getLegacyOrgPathRedirect('/cal/share-image')).toBeNull()
      expect(getLegacyOrgPathRedirect('/cal/og-image')).toBeNull()
    })

    it('does not redirect apex calendar share-image paths', () => {
      expect(getLegacyOrgPathRedirect('/org/demo/cal/share-image')).toBeNull()
      expect(getLegacyOrgPathRedirect('/org/demo/cal/og-image')).toBeNull()
    })

    it('does not redirect nested event share-image paths', () => {
      expect(getLegacyOrgPathRedirect('/cal/abc123/share-image')).toBeNull()
      expect(getLegacyOrgPathRedirect('/org/demo/cal/abc123/share-image')).toBeNull()
    })
  })

  describe('legacy event deep links', () => {
    it('redirects single-segment calendar event IDs', () => {
      expect(getLegacyOrgPathRedirect('/cal/abc123')).toEqual({
        pathname: '/',
        searchParams: { cal: 'abc123' },
      })
    })

    it('redirects apex calendar event IDs', () => {
      expect(getLegacyOrgPathRedirect('/org/demo/cal/abc123')).toEqual({
        pathname: '/org/demo',
        searchParams: { cal: 'abc123' },
      })
    })
  })

  describe('other legacy org paths', () => {
    it('redirects calendar and events list roots', () => {
      expect(getLegacyOrgPathRedirect('/cal')).toEqual({ pathname: '/', searchParams: {} })
      expect(getLegacyOrgPathRedirect('/events')).toEqual({ pathname: '/', searchParams: {} })
    })

    it('redirects leaderboard tabs', () => {
      expect(getLegacyOrgPathRedirect('/leaderboard')).toEqual({
        pathname: '/',
        searchParams: { tab: 'leaderboard' },
      })
      expect(getLegacyOrgPathRedirect('/org/demo/leaderboard')).toEqual({
        pathname: '/org/demo',
        searchParams: { tab: 'leaderboard' },
      })
    })
  })
})
