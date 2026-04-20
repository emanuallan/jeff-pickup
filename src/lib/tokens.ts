function makeKey(args: { playDate: string; playerName: string }) {
  return `jeffpickup.deleteToken:${args.playDate}:${args.playerName.toLowerCase()}`
}

export function loadDeleteToken(args: {
  playDate: string
  playerName: string
}): string {
  try {
    const v = localStorage.getItem(makeKey(args))
    if (v) return v
    // Back-compat: older keys included location.
    const legacyPrefix = `jeffpickup.deleteToken:${args.playDate}:`
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)
      if (!k || !k.startsWith(legacyPrefix)) continue
      if (k.endsWith(`:${args.playerName.toLowerCase()}`)) {
        return localStorage.getItem(k) ?? ''
      }
    }
    return ''
  } catch {
    return ''
  }
}

export function saveDeleteToken(args: {
  playDate: string
  playerName: string
  deleteToken: string
}) {
  try {
    localStorage.setItem(
      makeKey(args),
      args.deleteToken,
    )
  } catch {
    // ignore
  }
}

export function clearDeleteToken(args: {
  playDate: string
  playerName: string
}) {
  try {
    localStorage.removeItem(makeKey(args))
  } catch {
    // ignore
  }
}

export function newUuid(): string {
  return crypto.randomUUID()
}

