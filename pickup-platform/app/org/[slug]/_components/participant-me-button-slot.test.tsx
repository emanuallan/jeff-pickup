import { describe, expect, it, vi, beforeEach } from 'vitest'
import { ParticipantMeButtonSlot } from './participant-me-button-slot'
import { getPublicOrgBySlug } from '@/lib/public-data'
import { getSessionToken } from '@/lib/participant-session'
import { getParticipantForSession } from '@/lib/participant'

vi.mock('@/lib/public-data', () => ({
  getPublicOrgBySlug: vi.fn(),
}))

vi.mock('@/lib/participant-session', () => ({
  getSessionToken: vi.fn(),
}))

vi.mock('@/lib/participant', () => ({
  getParticipantForSession: vi.fn(),
}))

vi.mock('next/link', () => ({
  default: ({
    href,
    children,
    ...props
  }: {
    href: string
    children: React.ReactNode
    [key: string]: unknown
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}))

describe('ParticipantMeButtonSlot', () => {
  beforeEach(() => {
    vi.mocked(getPublicOrgBySlug).mockResolvedValue({ id: 'org-1' } as never)
    vi.mocked(getSessionToken).mockResolvedValue(null)
    vi.mocked(getParticipantForSession).mockResolvedValue(null)
  })

  it('renders nothing without a soft session', async () => {
    const result = await ParticipantMeButtonSlot({ slug: 'jeffsoccer', accent: '#22c55e' })
    expect(result).toBeNull()
  })

  it('renders a /me link when the session resolves a participant', async () => {
    vi.mocked(getSessionToken).mockResolvedValue('token-1')
    vi.mocked(getParticipantForSession).mockResolvedValue({
      participant_id: 'part-1',
      first_name: 'Ada',
      last_name: 'Lovelace',
      display_name: 'Ada L.',
      phone: '12025550101',
    })

    const result = await ParticipantMeButtonSlot({ slug: 'jeffsoccer', accent: '#22c55e' })
    expect(result).not.toBeNull()
    expect(result?.props.href).toBe('/me')
    expect(result?.props['aria-label']).toBe('Your profile')
    expect(result?.props.children).toBe('AL')
  })
})
