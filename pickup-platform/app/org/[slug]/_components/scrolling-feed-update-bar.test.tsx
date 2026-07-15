import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ReactNode } from 'react'
import { SCROLLING_FEED_SEEN_STORAGE_PREFIX } from '@/lib/scrolling-feed-update-bar'
import { ScrollingFeedUpdateBar } from './scrolling-feed-update-bar'

vi.mock('next/image', () => ({
  default: ({
    alt = '',
    ...props
  }: {
    alt?: string
    src: string
    width?: number
    height?: number
  }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img alt={alt} src={props.src} width={props.width} height={props.height} />
  ),
}))

vi.mock('next/link', () => ({
  default: ({
    href,
    children,
    ...props
  }: {
    href: string
    children: ReactNode
    className?: string
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}))

const baseProps = {
  slug: 'jeff',
  accent: '#2563eb',
  orgName: 'Jeff Soccer',
  orgLogoUrl: null as string | null,
  feedEnabled: true,
}

function mockFetchJson(payload: unknown, ok = true) {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok,
      json: async () => payload,
    }),
  )
}

describe('ScrollingFeedUpdateBar', () => {
  const storage = new Map<string, string>()

  beforeEach(() => {
    storage.clear()
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => {
        storage.set(key, value)
      },
      removeItem: (key: string) => {
        storage.delete(key)
      },
    })
    Object.defineProperty(document, 'readyState', {
      configurable: true,
      get: () => 'complete',
    })
    vi.stubGlobal(
      'requestIdleCallback',
      (cb: () => void) => {
        cb()
        return 1
      },
    )
    vi.stubGlobal('cancelIdleCallback', () => {})
    vi.useFakeTimers({ shouldAdvanceTime: true })
  })

  afterEach(() => {
    cleanup()
    vi.useRealTimers()
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('renders powered-by initially', () => {
    mockFetchJson({ enabled: false })
    render(<ScrollingFeedUpdateBar {...baseProps} feedEnabled={false} />)

    expect(screen.getByTestId('scrolling-feed-powered-by')).toBeInTheDocument()
    expect(screen.getByText('jeff.organizr.co')).toBeInTheDocument()
    expect(screen.getByTitle('Create your own group on Organizr')).toBeInTheDocument()
  })

  it('stays powered-by when feed is disabled', async () => {
    mockFetchJson({ enabled: true, items: [] })
    render(<ScrollingFeedUpdateBar {...baseProps} feedEnabled={false} />)

    await waitFor(() => {
      expect(fetch).not.toHaveBeenCalled()
    })
    expect(screen.getByTestId('scrolling-feed-powered-by')).toBeInTheDocument()
  })

  it('transitions to ticker when API returns unseen items', async () => {
    mockFetchJson({
      enabled: true,
      items: [
        {
          id: 'mvp:event-1',
          kind: 'mvp',
          headline: 'Alex is session MVP',
          eventShortId: 'abc123',
          dateLabel: 'Sun, Jul 12',
        },
      ],
    })

    render(<ScrollingFeedUpdateBar {...baseProps} />)

    await waitFor(() => {
      expect(screen.getByTestId('scrolling-feed-update-bar')).toBeInTheDocument()
    })
    expect(screen.getAllByText('Alex is session MVP').length).toBeGreaterThan(0)
    expect(screen.getByText('Live')).toBeInTheDocument()
    expect(screen.queryByTestId('scrolling-feed-powered-by')).not.toBeInTheDocument()

    await waitFor(() => {
      expect(storage.get(`${SCROLLING_FEED_SEEN_STORAGE_PREFIX}jeff`) ?? '').toContain(
        'mvp:event-1',
      )
    })
  })

  it('stays powered-by when all items are already seen', async () => {
    storage.set(
      `${SCROLLING_FEED_SEEN_STORAGE_PREFIX}jeff`,
      JSON.stringify(['mvp:event-1']),
    )
    mockFetchJson({
      enabled: true,
      items: [
        {
          id: 'mvp:event-1',
          kind: 'mvp',
          headline: 'Alex is session MVP',
          eventShortId: 'abc123',
          dateLabel: 'Sun, Jul 12',
        },
      ],
    })

    render(<ScrollingFeedUpdateBar {...baseProps} />)

    await waitFor(() => {
      expect(fetch).toHaveBeenCalled()
    })
    expect(screen.getByTestId('scrolling-feed-powered-by')).toBeInTheDocument()
    expect(screen.queryByTestId('scrolling-feed-update-bar')).not.toBeInTheDocument()
  })

  it('includes a sponsor segment when ticker is active and sponsors are present', async () => {
    mockFetchJson({
      enabled: true,
      items: [
        {
          id: 'mvp:event-1',
          kind: 'mvp',
          headline: 'Alex is session MVP',
          eventShortId: 'abc123',
          dateLabel: 'Sun, Jul 12',
        },
      ],
    })

    render(
      <ScrollingFeedUpdateBar
        {...baseProps}
        sponsors={[
          {
            id: 'sponsor-1',
            sponsor_name: 'Acme Sports',
            logo_url: 'https://example.com/logo.png',
            sponsor_url: 'https://acme.example',
            monthly_amount_cents: 5000,
          },
        ]}
      />,
    )

    await waitFor(() => {
      expect(screen.getAllByText(/brought to you by acme sports/i).length).toBeGreaterThan(0)
    })
    expect(screen.getAllByText('Partner').length).toBeGreaterThan(0)
  })

  it('can be grabbed, swiped, and resumes from the released position', async () => {
    mockFetchJson({
      enabled: true,
      items: [
        {
          id: 'mvp:event-1',
          kind: 'mvp',
          headline: 'Alex is session MVP',
          eventShortId: 'abc123',
          dateLabel: 'Sun, Jul 12',
        },
      ],
    })

    render(<ScrollingFeedUpdateBar {...baseProps} />)

    await waitFor(() => {
      expect(screen.getByTestId('scrolling-feed-update-bar')).toBeInTheDocument()
    })

    const viewport = screen.getByTestId('scrolling-feed-track-viewport')
    const track = screen.getByTestId('scrolling-feed-marquee-track')
    Object.defineProperty(track, 'scrollWidth', { configurable: true, value: 400 })

    fireEvent.pointerDown(viewport, {
      pointerId: 1,
      pointerType: 'touch',
      clientX: 200,
      button: 0,
    })
    expect(viewport).toHaveClass('cursor-grabbing')

    fireEvent.pointerMove(viewport, {
      pointerId: 1,
      pointerType: 'touch',
      clientX: 100,
    })
    expect(track.style.transform).toBe('translateX(-100px)')

    fireEvent.pointerUp(viewport, {
      pointerId: 1,
      pointerType: 'touch',
      clientX: 100,
    })

    expect(viewport).toHaveClass('cursor-grab')
    expect(track.style.transform).toBe('')
    expect(track.style.animationName).toBe('scrolling-feed-marquee')
    expect(track.style.animationDelay).toBe('-18s')
  })
})
