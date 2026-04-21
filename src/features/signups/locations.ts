import type { LocationId } from './types'

export type LocationOption = {
  id: LocationId
  label: string
  addressLines: string[]
  mapsUrl: string
  lat: number
  lon: number
}

export const LOCATIONS: LocationOption[] = [
  {
    id: 'shirley_hall_park',
    label: 'Shirley Hall Park (TJ)',
    addressLines: [
      '1203 Charlestown Pike',
      'Jeffersonville, IN 47130',
    ],
    mapsUrl:
      'https://www.google.com/maps/search/?api=1&query=Shirley%20Hall%20Park%201203%20Charlestown%20Pike%20Jeffersonville%20IN%2047130',
    // Derived via Nominatim (OSM) geocode of the address.
    lat: 38.3079626,
    lon: -85.7415316,
  },
  {
    id: 'poppy_park',
    label: 'Poppy Park',
    addressLines: ['2100 Poppy Pl', 'Jeffersonville, IN 47130'],
    mapsUrl:
      'https://www.google.com/maps/search/?api=1&query=Poppy%20Park%202100%20Poppy%20Pl%20Jeffersonville%20IN%2047130',
    // Derived via Nominatim (OSM) geocode; address resolves to the road, near the park.
    lat: 38.3006469,
    lon: -85.7126266,
  },
]

