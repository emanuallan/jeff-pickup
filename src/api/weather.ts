export type WeatherAtTime = {
  emoji: string
  description: string
}

function weatherCodeToEmoji(code: number): WeatherAtTime {
  // Open-Meteo weather codes:
  // https://open-meteo.com/en/docs
  if (code === 0) return { emoji: '☀️', description: 'Clear' }
  if (code === 1) return { emoji: '🌤️', description: 'Mostly clear' }
  if (code === 2) return { emoji: '⛅️', description: 'Partly cloudy' }
  if (code === 3) return { emoji: '☁️', description: 'Overcast' }
  if (code === 45 || code === 48) return { emoji: '🌫️', description: 'Fog' }
  if (code === 51 || code === 53 || code === 55) return { emoji: '🌦️', description: 'Drizzle' }
  if (code === 56 || code === 57) return { emoji: '🌧️', description: 'Freezing drizzle' }
  if (code === 61 || code === 63 || code === 65) return { emoji: '🌧️', description: 'Rain' }
  if (code === 66 || code === 67) return { emoji: '🌧️', description: 'Freezing rain' }
  if (code === 71 || code === 73 || code === 75) return { emoji: '❄️', description: 'Snow' }
  if (code === 77) return { emoji: '❄️', description: 'Snow grains' }
  if (code === 80 || code === 81 || code === 82) return { emoji: '🌦️', description: 'Rain showers' }
  if (code === 85 || code === 86) return { emoji: '🌨️', description: 'Snow showers' }
  if (code === 95) return { emoji: '⛈️', description: 'Thunderstorm' }
  if (code === 96 || code === 99) return { emoji: '⛈️', description: 'Thunderstorm w/ hail' }
  return { emoji: '🌡️', description: 'Weather' }
}

export async function fetchWeatherEmojiAtGameTime(args: {
  lat: number
  lon: number
  playDate: string // YYYY-MM-DD
  hhmm: string // 24h, e.g. "18:00"
}): Promise<WeatherAtTime | null> {
  const day = args.playDate.slice(0, 10)
  const target = `${day}T${args.hhmm.slice(0, 5)}`

  const url = new URL('https://api.open-meteo.com/v1/forecast')
  url.searchParams.set('latitude', String(args.lat))
  url.searchParams.set('longitude', String(args.lon))
  url.searchParams.set('timezone', 'auto')
  url.searchParams.set('hourly', 'weather_code')
  url.searchParams.set('start_date', day)
  url.searchParams.set('end_date', day)

  const res = await fetch(url.toString())
  if (!res.ok) throw new Error(`weather_fetch_failed:${res.status}`)
  const data = (await res.json()) as {
    hourly?: { time?: string[]; weather_code?: Array<number | null> }
  }

  const times = data.hourly?.time ?? []
  const codes = data.hourly?.weather_code ?? []
  if (times.length === 0 || times.length !== codes.length) return null

  // Prefer exact hour match in returned timezone.
  let idx = times.indexOf(target)

  // Fallback: nearest hour on same day.
  if (idx < 0) {
    const targetHour = Number.parseInt(args.hhmm.slice(0, 2), 10)
    let best = -1
    let bestDelta = Number.POSITIVE_INFINITY
    for (let i = 0; i < times.length; i++) {
      const ts = times[i] ?? ''
      const h = Number.parseInt(ts.slice(11, 13), 10)
      if (!Number.isFinite(h)) continue
      const delta = Math.abs(h - targetHour)
      if (delta < bestDelta) {
        bestDelta = delta
        best = i
      }
    }
    idx = best
  }

  if (idx < 0) return null
  const code = codes[idx]
  if (typeof code !== 'number' || !Number.isFinite(code)) return null
  return weatherCodeToEmoji(code)
}

