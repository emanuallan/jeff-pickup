// Open-Meteo (no API key). Returns an emoji + temp for an event's start time.
// Only returns data when the event is within the forecast horizon (~16 days).

export type WeatherInfo = {
  emoji: string
  tempF: number | null
}

// WMO weather codes → emoji (coarse mapping is fine for our use)
const WMO_EMOJI: Record<number, string> = {
  0: '☀️',
  1: '🌤️',
  2: '⛅',
  3: '☁️',
  45: '🌫️',
  48: '🌫️',
  51: '🌦️',
  53: '🌦️',
  55: '🌧️',
  56: '🌧️',
  57: '🌧️',
  61: '🌧️',
  63: '🌧️',
  65: '🌧️',
  66: '🌧️',
  67: '🌧️',
  71: '🌨️',
  73: '🌨️',
  75: '❄️',
  77: '❄️',
  80: '🌦️',
  81: '🌧️',
  82: '⛈️',
  85: '🌨️',
  86: '❄️',
  95: '⛈️',
  96: '⛈️',
  99: '⛈️',
}

function emojiForCode(code: number): string {
  return WMO_EMOJI[code] ?? '🌡️'
}

export async function getWeatherForEvent(
  lat: number,
  lon: number,
  startsAtIso: string,
): Promise<WeatherInfo | null> {
  // No usable coordinates (location wasn't geocoded)
  if (!lat && !lon) return null

  const start = new Date(startsAtIso)
  const now = new Date()
  const diffDays = (start.getTime() - now.getTime()) / 86_400_000
  if (diffDays < 0 || diffDays > 15) return null

  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
    `&hourly=temperature_2m,weather_code&temperature_unit=fahrenheit&forecast_days=16&timezone=GMT`

  try {
    const res = await fetch(url, {
      next: { revalidate: 3600 },
      signal: AbortSignal.timeout(3000),
    })
    if (!res.ok) return null

    const data = (await res.json()) as {
      hourly?: { time: string[]; temperature_2m: number[]; weather_code: number[] }
    }

    const times = data.hourly?.time
    if (!times?.length) return null

    // Match the event hour in UTC/GMT (e.g. "2026-06-11T22")
    const targetHour = start.toISOString().slice(0, 13)
    let idx = times.findIndex((t) => t.slice(0, 13) === targetHour)
    if (idx === -1) idx = 0

    const code = data.hourly?.weather_code?.[idx] ?? 0
    const temp = data.hourly?.temperature_2m?.[idx]

    return {
      emoji: emojiForCode(code),
      tempF: typeof temp === 'number' ? Math.round(temp) : null,
    }
  } catch {
    return null
  }
}
