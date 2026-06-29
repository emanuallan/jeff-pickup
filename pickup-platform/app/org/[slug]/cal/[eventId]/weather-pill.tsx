import { getWeatherForEvent } from '@/lib/weather'

/** Weather is an external API call, so it streams in via Suspense off the critical path. */
export async function WeatherPill({
  lat,
  lon,
  startsAt,
  timeZone,
}: {
  lat: number
  lon: number
  startsAt: string
  timeZone: string
}) {
  const weather = await getWeatherForEvent(lat, lon, startsAt, timeZone)
  if (!weather) return null
  return (
    <span className="rounded-lg bg-zinc-800/60 px-2.5 py-1 text-zinc-300">
      {weather.emoji}
      {weather.tempF != null ? ` ${weather.tempF}°F` : ''}
    </span>
  )
}
