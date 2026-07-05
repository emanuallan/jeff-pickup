import { describe, expect, it, vi } from 'vitest'
import { GET as getCalendarShareImage } from './route'

const buildEventsListShareImagePropsMock = vi.fn()
const renderOrgCalendarShareImageMock = vi.fn()

vi.mock('@/lib/public-share-image', () => ({
  buildEventsListShareImageProps: (...args: unknown[]) =>
    buildEventsListShareImagePropsMock(...args),
}))

vi.mock('@/lib/og-image', () => ({
  renderOrgCalendarShareImage: (...args: unknown[]) =>
    renderOrgCalendarShareImageMock(...args),
}))

describe('GET /org/[slug]/cal/share-image', () => {
  it('returns a PNG from the calendar share renderer', async () => {
    const shareProps = {
      slug: 'demo',
      orgName: 'Demo FC',
      accent: '#22c55e',
      upcomingEvents: [],
    }
    const pngResponse = new Response('png-bytes', {
      status: 200,
      headers: { 'content-type': 'image/png' },
    })

    buildEventsListShareImagePropsMock.mockResolvedValue(shareProps)
    renderOrgCalendarShareImageMock.mockResolvedValue(pngResponse)

    const response = await getCalendarShareImage(new Request('http://localhost/cal/share-image'), {
      params: Promise.resolve({ slug: 'demo' }),
    })

    expect(buildEventsListShareImagePropsMock).toHaveBeenCalledWith('demo')
    expect(renderOrgCalendarShareImageMock).toHaveBeenCalledWith(shareProps)
    expect(response.status).toBe(200)
    expect(response.headers.get('content-type')).toBe('image/png')
    await expect(response.text()).resolves.toBe('png-bytes')
  })
})
