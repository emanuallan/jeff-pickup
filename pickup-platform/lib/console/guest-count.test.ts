import { describe, expect, it } from 'vitest'
import {
  clampConsoleGuestCount,
  consoleGuestCountOptionLabel,
  consoleGuestCountOptions,
  CONSOLE_MAX_GUEST_COUNT,
} from './guest-count'
import { MAX_GUEST_COUNT } from '@/lib/guest-signups'

describe('console guest-count', () => {
  it('shares the global guest cap', () => {
    expect(CONSOLE_MAX_GUEST_COUNT).toBe(MAX_GUEST_COUNT)
    expect(MAX_GUEST_COUNT).toBe(5)
  })

  it('caps at the shared max', () => {
    expect(clampConsoleGuestCount(6)).toBe(5)
    expect(clampConsoleGuestCount(-1)).toBe(0)
  })

  it('offers 0 through max', () => {
    expect(consoleGuestCountOptions()).toEqual([0, 1, 2, 3, 4, 5])
  })

  it('labels zero as no guests, not just me', () => {
    expect(consoleGuestCountOptionLabel(0)).toBe('No guests')
    expect(consoleGuestCountOptionLabel(1)).toBe('1 guest')
    expect(consoleGuestCountOptionLabel(3)).toBe('3 guests')
  })
})
