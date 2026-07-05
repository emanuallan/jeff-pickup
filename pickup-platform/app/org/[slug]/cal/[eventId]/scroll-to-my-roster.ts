const JOIN_SECTION_COLLAPSE_MS = 280
const CONTROLS_CLOSE_MS = 280
const SCROLL_RETRY_MS = 200

export const EVENT_JOIN_SECTION_ID = 'event-join-section'
export const SIGNUP_CONFIRMATION_ID = 'signup-confirmation'

export function scrollToSignupConfirmation(): boolean {
  const el = document.getElementById(SIGNUP_CONFIRMATION_ID)
  if (!el) return false

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  el.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'center' })
  return true
}

export function scrollToMyRosterRow(signupId: string): boolean {
  const el = document.getElementById(`roster-signup-${signupId}`)
  if (!el) return false

  el.closest('details')?.setAttribute('open', '')

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  el.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'center' })
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

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  el.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' })
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
