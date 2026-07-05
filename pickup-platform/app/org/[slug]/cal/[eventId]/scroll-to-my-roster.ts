import { PARTICIPATION_SECTION_MS } from './participation-motion-tokens'

const JOIN_SECTION_COLLAPSE_MS = PARTICIPATION_SECTION_MS
const CONTROLS_CLOSE_MS = PARTICIPATION_SECTION_MS
const SCROLL_RETRY_MS = 200

export const EVENT_JOIN_SECTION_ID = 'event-join-section'
export const SIGNUP_CONFIRMATION_ID = 'signup-confirmation'

function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/** Scroll only when the target is not already comfortably in view. */
function scrollElementIntoView(el: HTMLElement, block: ScrollLogicalPosition) {
  if (prefersReducedMotion()) {
    el.scrollIntoView({ behavior: 'auto', block })
    return
  }

  const rect = el.getBoundingClientRect()
  const margin = 24
  const inView =
    rect.top >= margin && rect.bottom <= window.innerHeight - margin

  if (inView) {
    return
  }

  el.scrollIntoView({ behavior: 'smooth', block })
}

export function scrollToSignupConfirmation(): boolean {
  const el = document.getElementById(SIGNUP_CONFIRMATION_ID)
  if (!el) return false

  scrollElementIntoView(el, 'nearest')
  return true
}

export function scrollToMyRosterRow(signupId: string): boolean {
  const el = document.getElementById(`roster-signup-${signupId}`)
  if (!el) return false

  el.closest('details')?.setAttribute('open', '')

  scrollElementIntoView(el, 'nearest')
  return true
}

export function scrollToMyRosterRowAfterJoinCollapse(
  signupId: string,
  onComplete?: () => void,
) {
  window.setTimeout(() => {
    if (scrollToMyRosterRow(signupId)) {
      onComplete?.()
      return
    }

    if (scrollToSignupConfirmation()) {
      onComplete?.()
      return
    }

    window.setTimeout(() => {
      if (scrollToMyRosterRow(signupId) || scrollToSignupConfirmation()) {
        onComplete?.()
        return
      }
      onComplete?.()
    }, SCROLL_RETRY_MS)
  }, JOIN_SECTION_COLLAPSE_MS)
}

export function scrollToJoinSection(): boolean {
  const el = document.getElementById(EVENT_JOIN_SECTION_ID)
  if (!el) return false

  scrollElementIntoView(el, 'nearest')
  return true
}

export function scrollToJoinSectionAfterLeave(onComplete?: () => void) {
  window.setTimeout(() => {
    if (scrollToJoinSection()) {
      onComplete?.()
      return
    }

    window.setTimeout(() => {
      scrollToJoinSection()
      onComplete?.()
    }, SCROLL_RETRY_MS)
  }, CONTROLS_CLOSE_MS)
}
