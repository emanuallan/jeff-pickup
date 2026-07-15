import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  markOrgPublicSplashSeen,
  orgPublicSplashStorageKey,
  shouldShowOrgPublicSplash,
  waitForDocumentReady,
  waitUntilSplashCanDismiss,
} from './org-public-splash'

describe('org-public-splash', () => {
  afterEach(() => {
    sessionStorage.clear()
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('uses a per-org sessionStorage key', () => {
    expect(orgPublicSplashStorageKey('demo')).toBe('org-public-splash-seen:demo')
  })

  it('shows the splash until it has been seen in this tab', () => {
    expect(shouldShowOrgPublicSplash('demo')).toBe(true)

    markOrgPublicSplashSeen('demo')

    expect(sessionStorage.getItem('org-public-splash-seen:demo')).toBe('1')
    expect(shouldShowOrgPublicSplash('demo')).toBe(false)
    expect(shouldShowOrgPublicSplash('other')).toBe(true)
  })

  it('waitForDocumentReady resolves immediately when already complete', async () => {
    Object.defineProperty(document, 'readyState', {
      configurable: true,
      get: () => 'complete',
    })

    await expect(waitForDocumentReady()).resolves.toBeUndefined()
  })

  it('waitUntilSplashCanDismiss waits for readiness then honors the minimum', async () => {
    vi.useFakeTimers()
    let resolveReady!: () => void
    const waitForReady = () =>
      new Promise<void>((resolve) => {
        resolveReady = resolve
      })

    const done = waitUntilSplashCanDismiss({
      minMs: 500,
      maxMs: 5000,
      waitForReady,
      waitForPaint: async () => {},
    })

    resolveReady()
    await vi.advanceTimersByTimeAsync(499)
    let settled = false
    void done.then(() => {
      settled = true
    })
    await Promise.resolve()
    expect(settled).toBe(false)

    await vi.advanceTimersByTimeAsync(1)
    await done
    expect(settled).toBe(true)
  })
})
