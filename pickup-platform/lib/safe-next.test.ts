import { describe, expect, it } from 'vitest'
import { safeNextPath } from './safe-next'

describe('safe-next', () => {
  it('accepts internal paths', () => {
    expect(safeNextPath('/console')).toBe('/console')
    expect(safeNextPath('/console/my-org/setup')).toBe('/console/my-org/setup')
  })

  it('blocks protocol-relative open redirects', () => {
    expect(safeNextPath('//evil.com')).toBe('/console')
  })

  it('blocks external URLs', () => {
    expect(safeNextPath('https://evil.com')).toBe('/console')
  })

  it('uses custom fallback', () => {
    expect(safeNextPath(null, '/login')).toBe('/login')
  })
})
