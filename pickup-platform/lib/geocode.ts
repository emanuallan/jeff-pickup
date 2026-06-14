// Address → lat/lon via Nominatim (OpenStreetMap). No API key.
// Best-effort: returns null on any failure so location creation never blocks.

export type GeoResult = {
  lat: number
  lon: number
}

export async function geocodeAddress(address: string): Promise<GeoResult | null> {
  const q = address.trim()
  if (!q) return null

  const url =
    `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(q)}`

  try {
    const res = await fetch(url, {
      headers: {
        // Nominatim usage policy requires identifying the app
        'User-Agent': 'Headcount/0.1 (organizr.co)',
      },
      next: { revalidate: 86_400 },
    })
    if (!res.ok) return null

    const data = (await res.json()) as { lat: string; lon: string }[]
    const first = data[0]
    if (!first) return null

    const lat = Number.parseFloat(first.lat)
    const lon = Number.parseFloat(first.lon)
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null

    return { lat, lon }
  } catch {
    return null
  }
}
