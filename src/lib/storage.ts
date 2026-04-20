const NAME_KEY = 'jeffpickup.playerName'

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

