function makeKey(args: { playDate: string; location: string; playerName: string }) {
  return `jeffpickup.deleteToken:${args.playDate}:${args.location}:${args.playerName.toLowerCase()}`
}

export function loadDeleteToken(args: {
  playDate: string
  location: string
  playerName: string
}): string {
  try {
    return localStorage.getItem(makeKey(args)) ?? ''
  } catch {
    return ''
  }
}

export function saveDeleteToken(args: {
  playDate: string
  location: string
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
  location: string
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

