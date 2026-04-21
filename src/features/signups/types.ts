export type LocationId = 'shirley_hall_park' | 'poppy_park'

export type Signup = {
  id: string
  play_date: string
  location: LocationId
  player_name: string
  guest_count: number
  emoji: string
  created_at: string
  delete_token?: string
}

