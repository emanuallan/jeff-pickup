const storageKey = (eventId: string) => `organizr-returning-join-dismissed:${eventId}`

export function isReturningJoinSheetDismissed(eventId: string): boolean {
  try {
    return sessionStorage.getItem(storageKey(eventId)) === '1'
  } catch {
    return false
  }
}

export function dismissReturningJoinSheet(eventId: string) {
  try {
    sessionStorage.setItem(storageKey(eventId), '1')
  } catch {
    // ignore
  }
}
