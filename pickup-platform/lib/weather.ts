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

/** Hour bucket (YYYY-MM-DDTHH) for an instant in an IANA timezone — matches Open-Meteo hourly keys. */
export function hourlyKeyInZone(iso: string, timeZone: string): string {
  const d = new Date(iso)
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(d)

  const pick = (type: string) => parts.find((p) => p.type === type)?.value ?? '00'
  return `${pick('year')}-${pick('month')}-${pick('day')}T${pick('hour')}`
}

function findHourIndex(times: string[], targetHour: string): number {
  return times.findIndex((t) => t.slice(0, 13) === targetHour)
}

export async function getWeatherForEvent(
  lat: number,
  lon: number,
  startsAtIso: string,
  timeZone: string,
): Promise<WeatherInfo | null> {
  // No usable coordinates (location wasn't geocoded)
  if (!lat && !lon) return null

  const zone = timeZone?.trim() || 'UTC'
  const start = new Date(startsAtIso)
  if (Number.isNaN(start.getTime())) return null

  const now = new Date()
  const diffDays = (start.getTime() - now.getTime()) / 86_400_000
  if (diffDays < 0 || diffDays > 15) return null

  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
    `&hourly=temperature_2m,weather_code&temperature_unit=fahrenheit&forecast_days=16` +
    `&timezone=${encodeURIComponent(zone)}`

  try {
    const res = await fetch(url, {
      next: { revalidate: 3600 },
      signal: AbortSignal.timeout(3000),
    })
    if (!res.ok) return null

    const data = (await res.json()) as {
      hourly?: { time: string[]; temperature_2m: number[]; weather_code: Array<number | null> }
    }

    const times = data.hourly?.time
    if (!times?.length) return null

    const targetHour = hourlyKeyInZone(startsAtIso, zone)
    const idx = findHourIndex(times, targetHour)
    if (idx === -1) return null

    const rawCode = data.hourly?.weather_code?.[idx]
    if (rawCode == null) return null

    const temp = data.hourly?.temperature_2m?.[idx]

    return {
      emoji: emojiForCode(rawCode),
      tempF: typeof temp === 'number' ? Math.round(temp) : null,
    }
  } catch {
    return null
  }
}
