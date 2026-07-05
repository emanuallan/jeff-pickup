import { describe, expect, it, vi } from 'vitest'
import { GET as getEventShareImage } from './route'

const buildEventDetailShareImagePropsMock = vi.fn()
const renderOrgShareImageMock = vi.fn()

vi.mock('@/lib/public-share-image', () => ({
  buildEventDetailShareImageProps: (...args: unknown[]) =>
    buildEventDetailShareImagePropsMock(...args),
}))

vi.mock('@/lib/og-image', () => ({
  renderOrgShareImage: (...args: unknown[]) => renderOrgShareImageMock(...args),
}))

describe('GET /org/[slug]/cal/[eventId]/share-image', () => {
  it('returns a PNG from the event share renderer', async () => {
    const shareProps = {
      slug: 'demo',
      orgName: 'Demo FC',
      sessionTitle: 'Sunday Scrimmage',
      accent: '#22c55e',
    }
    const pngResponse = new Response('png-bytes', {
      status: 200,
      headers: { 'content-type': 'image/png' },
    })

    buildEventDetailShareImagePropsMock.mockResolvedValue(shareProps)
    renderOrgShareImageMock.mockResolvedValue(pngResponse)

    const response = await getEventShareImage(
      new Request('http://localhost/cal/evt-a/share-image'),
      {
        params: Promise.resolve({ slug: 'demo', eventId: 'evt-a' }),
      },
    )

    expect(buildEventDetailShareImagePropsMock).toHaveBeenCalledWith('demo', 'evt-a')
    expect(renderOrgShareImageMock).toHaveBeenCalledWith(shareProps)
    expect(response.status).toBe(200)
    expect(response.headers.get('content-type')).toBe('image/png')
    await expect(response.text()).resolves.toBe('png-bytes')
  })
})
