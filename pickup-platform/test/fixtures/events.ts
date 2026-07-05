import type { Event, EventWithLocation } from '@/lib/events'
import type { RosterEntry } from '@/lib/signups'

export function makeEvent(overrides: Partial<Event> = {}): Event {
  return {
    id: 'evt-1',
    short_id: 'abc123',
    org_id: 'org-1',
    schedule_id: 'sched-1',
    location_id: 'loc-1',
    starts_at: '2026-07-10T22:00:00.000Z',
    timezone: 'America/New_York',
    duration_min: 90,
    capacity: 20,
    min_players: null,
    status: 'on',
    announcement: '',
    additional_information: '',
    ...overrides,
  }
}

export function makeEventWithLocation(overrides: Partial<EventWithLocation> = {}): EventWithLocation {
  return {
    ...makeEvent(overrides),
    title: null,
    location_label: 'Main Field',
    location_address: '123 Park Ave',
    location_lat: 40.7,
    location_lon: -74.0,
    location_maps_url: '',
    location_is_online: false,
    location_meeting_url: '',
    ...overrides,
  }
}

export function makeRosterEntry(overrides: Partial<RosterEntry> = {}): RosterEntry {
  return {
    id: 'signup-1',
    event_id: 'evt-1',
    participant_id: 'part-1',
    display_name: 'Alex S.',
    guest_count: 0,
    arrival_status: 'on_my_way',
    created_at: '2026-07-01T12:00:00.000Z',
    list_status: 'confirmed',
    ...overrides,
  }
}
