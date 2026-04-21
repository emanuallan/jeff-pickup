const NAME_KEY = 'jeffpickup.playerName'
const POKE_SEEN_PREFIX = 'jeffpickup.pokeSeenAt:'

export function loadPlayerName(): string {
  try {
    const v = localStorage.getItem(NAME_KEY)
    return v ? v : ''
  } catch {
    return ''
  }
}

export function savePlayerName(name: string) {
  try {
    localStorage.setItem(NAME_KEY, name)
  } catch {
    // ignore
  }
}

export function pokeSeenAtKey(args: { playDate: string; signupId: string }) {
  return `${POKE_SEEN_PREFIX}${args.playDate}:${args.signupId}`
}

export function loadPokeSeenAt(key: string): string | null {
  try {
    const v = localStorage.getItem(key)
    return v && v.trim() ? v : null
  } catch {
    return null
  }
}

export function savePokeSeenAt(key: string, iso: string) {
  try {
    localStorage.setItem(key, iso)
  } catch {
    // ignore
  }
}

