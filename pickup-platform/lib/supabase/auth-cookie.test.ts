import { describe, expect, it } from 'vitest'
import {
  hasSupabaseAuthCookie,
  middlewareShouldRefreshSession,
} from './auth-cookie'

describe('hasSupabaseAuthCookie', () => {
  it('is false when there are no cookies', () => {
    expect(hasSupabaseAuthCookie([])).toBe(false)
  })

  it('is false for participant and unrelated cookies', () => {
    expect(
      hasSupabaseAuthCookie([
        { name: 'hc_session' },
        { name: 'hc_visitor' },
      ]),
    ).toBe(false)
  })

  it('detects the session cookie and chunked shards', () => {
    expect(hasSupabaseAuthCookie([{ name: 'sb-abcd-auth-token' }])).toBe(true)
    expect(hasSupabaseAuthCookie([{ name: 'sb-abcd-auth-token.0' }])).toBe(true)
    expect(hasSupabaseAuthCookie([{ name: 'sb-abcd-auth-token.1' }])).toBe(true)
  })

  it('ignores the PKCE verifier cookie so a leftover OTP start cannot stall middleware', () => {
    expect(
      hasSupabaseAuthCookie([{ name: 'sb-abcd-auth-token-code-verifier' }]),
    ).toBe(false)
  })
})

describe('middlewareShouldRefreshSession', () => {
  it('never refreshes Auth on org subdomains', () => {
    expect(middlewareShouldRefreshSession('/', 'jeff')).toBe(false)
    expect(middlewareShouldRefreshSession('/cal/abc/og-image', 'jeff')).toBe(false)
    expect(middlewareShouldRefreshSession('/login', 'jeff')).toBe(false)
  })

  it('never refreshes Auth on apex public org pages', () => {
    expect(middlewareShouldRefreshSession('/org/jeff', null)).toBe(false)
    expect(middlewareShouldRefreshSession('/org/jeff/cal', null)).toBe(false)
  })

  it('refreshes only for apex login and console redirects', () => {
    expect(middlewareShouldRefreshSession('/login', null)).toBe(true)
    expect(middlewareShouldRefreshSession('/console', null)).toBe(true)
    expect(middlewareShouldRefreshSession('/console/jeff', null)).toBe(true)
    expect(middlewareShouldRefreshSession('/', null)).toBe(false)
    expect(middlewareShouldRefreshSession('/features', null)).toBe(false)
    expect(middlewareShouldRefreshSession('/auth/signout', null)).toBe(false)
  })
})
