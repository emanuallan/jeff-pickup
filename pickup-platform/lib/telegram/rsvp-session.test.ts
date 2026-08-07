import { beforeEach, describe, expect, it, vi } from 'vitest'

const rpc = vi.fn()
const adminFrom = vi.fn()
const publicFrom = vi.fn()

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({ rpc, from: adminFrom }),
}))

vi.mock('@/lib/supabase/public', () => ({
  createPublicClient: () => ({ from: publicFrom }),
}))

vi.mock('@/lib/telegram/links', () => ({
  getTelegramOrgByChatId: vi.fn(),
  getParticipantIdForTelegramUser: vi.fn(),
  createPairToken: vi.fn(),
}))

import {
  getParticipantIdForTelegramUser,
  getTelegramOrgByChatId,
} from '@/lib/telegram/links'
import { handleTelegramArrivalStatus } from '@/lib/telegram/rsvp'

describe('Telegram RSVP session mint', () => {
  beforeEach(() => {
    rpc.mockReset()
    adminFrom.mockReset()
    publicFrom.mockReset()
    vi.mocked(getTelegramOrgByChatId).mockReset()
    vi.mocked(getParticipantIdForTelegramUser).mockReset()
  })

  it('mints a device session by participant_id, not phone recover', async () => {
    vi.mocked(getTelegramOrgByChatId).mockResolvedValue({
      org_id: 'org-1',
      org_slug: 'jeff',
      org_name: 'Jeff',
    } as never)
    vi.mocked(getParticipantIdForTelegramUser).mockResolvedValue('part-99')

    adminFrom.mockImplementation((table: string) => {
      if (table === 'participants') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({
                data: {
                  id: 'part-99',
                  phone: null,
                  first_name: 'Ada',
                  last_name: 'Lovelace',
                  display_name: 'Ada L.',
                },
                error: null,
              }),
            }),
          }),
        }
      }
      if (table === 'signups') {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                maybeSingle: async () => ({
                  data: {
                    id: 'signup-1',
                    list_status: 'confirmed',
                    arrival_status: 'confirmed',
                    guest_count: 0,
                  },
                  error: null,
                }),
              }),
            }),
          }),
        }
      }
      return { select: () => ({}) }
    })

    publicFrom.mockReturnValue({
      select: () => ({
        eq: () => ({
          neq: () => ({
            gte: () => ({
              order: () => ({
                limit: async () => ({
                  data: [
                    {
                      id: 'event-1',
                      org_id: 'org-1',
                      starts_at: '2099-01-01T18:00:00.000Z',
                      ends_at: '2099-01-01T20:00:00.000Z',
                      status: 'on',
                      capacity: 20,
                      price_cents: null,
                      locations: {
                        label: 'Field',
                        is_online: false,
                      },
                      schedules: { title: null, duration_min: 90 },
                    },
                  ],
                  error: null,
                }),
              }),
            }),
          }),
        }),
      }),
    })

    rpc.mockImplementation(async (name: string) => {
      if (name === 'mint_participant_session') {
        return { data: { session_token: 'sess-token' }, error: null }
      }
      if (name === 'update_arrival_status') {
        return { data: { ok: true }, error: null }
      }
      return { data: null, error: { message: `unexpected rpc ${name}` } }
    })

    const result = await handleTelegramArrivalStatus({
      chatId: 1,
      telegramUserId: 42,
      telegramUsername: 'ada',
      action: 'omw',
    })

    expect(result.ok).toBe(true)
    expect(rpc).toHaveBeenCalledWith('mint_participant_session', {
      p_org_id: 'org-1',
      p_participant_id: 'part-99',
    })
    expect(rpc.mock.calls.some(([name]) => name === 'recover_participant_session')).toBe(
      false,
    )
  })
})
