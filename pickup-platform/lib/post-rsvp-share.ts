const storageKey = (eventId: string) => `organizr-post-rsvp-share:${eventId}`

export function markPostRsvpSharePending(eventId: string) {
  try {
    sessionStorage.setItem(storageKey(eventId), '1')
  } catch {
    // private mode / storage blocked
  }
}

export function isPostRsvpSharePending(eventId: string): boolean {
  try {
    return sessionStorage.getItem(storageKey(eventId)) === '1'
  } catch {
    return false
  }
}

export function dismissPostRsvpShare(eventId: string) {
  try {
    sessionStorage.removeItem(storageKey(eventId))
  } catch {
    // ignore
  }
}
