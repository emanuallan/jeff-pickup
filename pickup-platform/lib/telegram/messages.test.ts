import { describe, expect, it } from 'vitest'
import {
  formatCountMessage,
  formatGroupLinkedMessage,
  formatMvpAnnouncement,
  formatNeedPairMessage,
  formatPaidSessionMessage,
  formatRosterMessage,
  formatRsvpReply,
  publicEventUrl,
  telegramPairUrl,
} from '@/lib/telegram/messages'
import { generateConnectCode, generatePairToken } from '@/lib/telegram/tokens'

const event = {
  id: 'e1',
  short_id: 'abc12345',
  org_id: 'o1',
  schedule_id: null,
  location_id: 'l1',
  starts_at: '2026-08-05T23:00:00.000Z',
  timezone: 'America/New_York',
  duration_min: 90,
  capacity: null,
  min_players: null,
  status: 'on' as const,
  announcement: '',
  additional_information: '',
  price_cents: null,
  team_count: null,
  title: 'Tuesday pickup',
  location_label: 'Central Park',
  location_address: '',
  location_lat: 0,
  location_lon: 0,
  location_maps_url: '',
  location_is_online: false,
  location_meeting_url: '',
}

describe('telegram tokens', () => {
  it('generates connect codes of expected length', () => {
    const code = generateConnectCode()
    expect(code).toHaveLength(8)
    expect(code).toMatch(/^[A-Z0-9]+$/)
  })

  it('generates opaque pair tokens', () => {
    const a = generatePairToken()
    const b = generatePairToken()
    expect(a).not.toEqual(b)
    expect(a.length).toBeGreaterThan(20)
  })
})

describe('telegram messages', () => {
  it('formats RSVP in reply', () => {
    const msg = formatRsvpReply({
      displayName: 'Alex',
      status: 'confirmed',
      event,
      headcount: 8,
    })
    expect(msg).toContain('Alex')
    expect(msg).toContain("I'm in")
    expect(msg).toContain('8 confirmed')
  })

  it('formats RSVP in reply with guests', () => {
    const msg = formatRsvpReply({
      displayName: 'Alex',
      status: 'confirmed',
      event,
      headcount: 10,
      guestCount: 2,
    })
    expect(msg).toContain('Alex (+2 guests)')
  })

  it('formats out reply', () => {
    const msg = formatRsvpReply({
      displayName: 'Alex',
      status: 'out',
      event,
      headcount: 7,
    })
    expect(msg).toContain('is out')
  })

  it('formats paid and pair prompts', () => {
    expect(formatPaidSessionMessage('https://example.com')).toContain('https://example.com')
    const pair = formatNeedPairMessage('https://pair.example')
    expect(pair).toContain('https://pair.example')
    expect(pair).toContain('OPEN THIS LINK IN YOUR PHONE BROWSER')
    expect(pair).toContain('DO NOT USE TELEGRAM')
  })

  it('formats MVP announcement', () => {
    const msg = formatMvpAnnouncement({
      orgName: 'Jeff Soccer',
      sessionTitle: 'Tuesday pickup',
      when: 'Tue · 7:00–8:30 PM',
      winnerNames: ['Alex', 'Sam'],
      eventUrl: 'https://jeff.organizr.co/?cal=abc',
    })
    expect(msg).toContain('MVPs (tie)')
    expect(msg).toContain('Alex')
  })

  it('formats group linked help', () => {
    expect(formatGroupLinkedMessage('Jeff', 'jeff')).toContain('/link')
    expect(formatGroupLinkedMessage('Jeff', 'jeff')).toContain('/in')
    expect(formatGroupLinkedMessage('Jeff', 'jeff')).toContain('/roster')
    expect(formatGroupLinkedMessage('Jeff', 'jeff')).toContain('/count')
  })

  it('formats count and roster', () => {
    expect(formatCountMessage(8)).toBe('8 signed up')
    const msg = formatRosterMessage({
      event,
      headcount: 3,
      roster: [
        { display_name: 'Alex', guest_count: 0, arrival_status: 'confirmed' },
        { display_name: 'Sam', guest_count: 1, arrival_status: 'maybe' },
      ],
      waitlist: [{ display_name: 'Pat', guest_count: 0, arrival_status: 'confirmed' }],
    })
    expect(msg).toContain('3 signed up')
    expect(msg).toContain('• Alex')
    expect(msg).toContain('Sam (+1)')
    expect(msg).toContain('Waitlist (1)')
    expect(msg).toContain('• Pat')
  })

  it('formats roster grouped by team when teamCount is set', () => {
    const msg = formatRosterMessage({
      event: { ...event, team_count: 2 },
      headcount: 4,
      teamCount: 2,
      roster: [
        { display_name: 'Alex', guest_count: 0, arrival_status: 'confirmed', team: 1 },
        { display_name: 'Sam', guest_count: 1, arrival_status: 'confirmed', team: 1 },
        { display_name: 'Jordan', guest_count: 0, arrival_status: 'confirmed', team: 2 },
        { display_name: 'Pat', guest_count: 0, arrival_status: 'maybe', team: null },
      ],
      waitlist: [],
    })
    expect(msg).toContain('Team 1 (3):')
    expect(msg).toContain('• Alex')
    expect(msg).toContain('Sam (+1)')
    expect(msg).toContain('Team 2 (1):')
    expect(msg).toContain('• Jordan')
    expect(msg).toContain('Unassigned (1):')
    expect(msg).toContain('Pat')
  })

  it('builds public URLs', () => {
    expect(publicEventUrl('jeff', 'abc')).toContain('cal=abc')
    expect(telegramPairUrl('jeff', 'tok')).toContain('/telegram/pair?token=tok')
  })
})
