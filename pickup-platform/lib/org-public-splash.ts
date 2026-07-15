/** Minimum time the splash stays fully visible before fading out. */
export const ORG_PUBLIC_SPLASH_MIN_MS = 700

/** Hard cap so a stuck load never leaves the splash up forever. */
export const ORG_PUBLIC_SPLASH_MAX_MS = 4000

/** Fade-out duration when dismissing the splash. */
export const ORG_PUBLIC_SPLASH_FADE_MS = 420

export function orgPublicSplashStorageKey(slug: string): string {
  return `org-public-splash-seen:${slug}`
}

export function shouldShowOrgPublicSplash(slug: string): boolean {
  if (typeof window === 'undefined') return false
  return sessionStorage.getItem(orgPublicSplashStorageKey(slug)) !== '1'
}

export function markOrgPublicSplashSeen(slug: string): void {
  sessionStorage.setItem(orgPublicSplashStorageKey(slug), '1')
}

/** Resolves when the document has finished loading (or immediately if already complete). */
export function waitForDocumentReady(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve()
  if (document.readyState === 'complete') return Promise.resolve()

  return new Promise((resolve) => {
    window.addEventListener('load', () => resolve(), { once: true })
  })
}

function waitForNextPaint(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve()

  return new Promise((resolve) => {
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => resolve())
    })
  })
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms)
  })
}

/**
 * Hold the splash until the page is ready to show, while honoring a short brand
 * minimum and a safety maximum.
 */
export async function waitUntilSplashCanDismiss(options?: {
  minMs?: number
  maxMs?: number
  waitForReady?: () => Promise<void>
  waitForPaint?: () => Promise<void>
}): Promise<void> {
  const minMs = options?.minMs ?? ORG_PUBLIC_SPLASH_MIN_MS
  const maxMs = options?.maxMs ?? ORG_PUBLIC_SPLASH_MAX_MS
  const waitForReady = options?.waitForReady ?? waitForDocumentReady
  const waitForPaint = options?.waitForPaint ?? waitForNextPaint
  const started = Date.now()

  await Promise.race([waitForReady(), delay(maxMs)])
  await waitForPaint()

  const remaining = Math.max(0, minMs - (Date.now() - started))
  if (remaining > 0) {
    await delay(remaining)
  }
}
