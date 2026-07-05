import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { getRootDomain, parseOrgSlugFromHost } from './parse-host'

describe('parse-host', () => {
  beforeEach(() => {
    vi.stubEnv('NEXT_PUBLIC_ROOT_DOMAIN', 'organizr.co')
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('returns null for apex domain', () => {
    expect(parseOrgSlugFromHost('organizr.co')).toBeNull()
    expect(parseOrgSlugFromHost('www.organizr.co')).toBeNull()
  })

  it('extracts slug from production subdomain', () => {
    expect(parseOrgSlugFromHost('jeffsoccer.organizr.co')).toBe('jeffsoccer')
  })

  it('extracts slug from local dev subdomain', () => {
    expect(parseOrgSlugFromHost('jeffsoccer.localhost:3000')).toBe('jeffsoccer')
  })

  it('rejects reserved subdomains', () => {
    expect(parseOrgSlugFromHost('api.organizr.co')).toBeNull()
    expect(parseOrgSlugFromHost('www.localhost')).toBeNull()
  })

  it('rejects nested subdomains', () => {
    expect(parseOrgSlugFromHost('a.b.organizr.co')).toBeNull()
  })

  it('getRootDomain reads env', () => {
    expect(getRootDomain()).toBe('organizr.co')
  })
})
