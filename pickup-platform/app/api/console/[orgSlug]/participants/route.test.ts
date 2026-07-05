import { describe, expect, it, vi } from 'vitest'
import { GET } from './route'

const getOrgForMemberMock = vi.fn()
const getParticipantHistoryForOrgMock = vi.fn()

vi.mock('@/lib/orgs', () => ({
  getOrgForMember: (...args: unknown[]) => getOrgForMemberMock(...args),
}))

vi.mock('@/lib/participants', () => ({
  getParticipantHistoryForOrg: (...args: unknown[]) => getParticipantHistoryForOrgMock(...args),
}))

vi.mock('@/lib/participants-csv', () => ({
  participantsToCsv: () => 'display_name,phone\nAlex,5551234567',
}))

describe('GET /api/console/[orgSlug]/participants', () => {
  it('returns 401 when the caller is not an org member', async () => {
    getOrgForMemberMock.mockResolvedValue(null)

    const response = await GET(new Request('http://localhost/api/console/demo/participants'), {
      params: Promise.resolve({ orgSlug: 'demo' }),
    })

    expect(response.status).toBe(401)
    expect(getParticipantHistoryForOrgMock).not.toHaveBeenCalled()
  })

  it('returns CSV when the caller is an org member', async () => {
    getOrgForMemberMock.mockResolvedValue({ id: 'org-1', slug: 'demo', name: 'Demo FC' })
    getParticipantHistoryForOrgMock.mockResolvedValue([])

    const response = await GET(new Request('http://localhost/api/console/demo/participants'), {
      params: Promise.resolve({ orgSlug: 'demo' }),
    })

    expect(response.status).toBe(200)
    expect(response.headers.get('content-type')).toContain('text/csv')
    expect(getOrgForMemberMock).toHaveBeenCalledWith('demo')
    expect(getParticipantHistoryForOrgMock).toHaveBeenCalledWith('org-1')
    await expect(response.text()).resolves.toContain('display_name')
  })
})
