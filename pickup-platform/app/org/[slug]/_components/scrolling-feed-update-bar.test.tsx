import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ReactNode } from 'react'
import { SCROLLING_FEED_INTRO_MIN_MS } from '@/lib/scrolling-feed-update-bar'
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
  beforeEach(() => {
    Object.defineProperty(document, 'readyState', {
      configurable: true,
      get: () => 'complete',
    })
    vi.stubGlobal('requestIdleCallback', (cb: () => void) => {
      cb()
      return 1
    })
    vi.stubGlobal('cancelIdleCallback', () => {})
    vi.useFakeTimers({ shouldAdvanceTime: true })
  })

  afterEach(() => {
    cleanup()
    vi.useRealTimers()
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('renders centered powered-by intro initially', () => {
    mockFetchJson({ enabled: false })
    render(<ScrollingFeedUpdateBar {...baseProps} feedEnabled={false} />)

    expect(screen.getByTestId('scrolling-feed-powered-by')).toBeInTheDocument()
    expect(screen.getByTitle('Create your own group on Organizr')).toBeInTheDocument()
    expect(screen.getByLabelText('Organizr')).toBeInTheDocument()
    expect(screen.getByTestId('scrolling-feed-powered-by')).toHaveTextContent(/powered by/i)
    expect(screen.getByTestId('scrolling-feed-powered-by')).toHaveTextContent(/organizr/i)
  })

  it('stays on powered-by intro when feed is disabled', async () => {
    mockFetchJson({ enabled: true, items: [] })
    render(<ScrollingFeedUpdateBar {...baseProps} feedEnabled={false} />)

    await waitFor(() => {
      expect(fetch).not.toHaveBeenCalled()
    })
    expect(screen.getByTestId('scrolling-feed-powered-by')).toBeInTheDocument()
  })

  it('transitions to ticker with latest items regardless of prior visits', async () => {
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
    await vi.advanceTimersByTimeAsync(SCROLLING_FEED_INTRO_MIN_MS + 300)

    await waitFor(() => {
      expect(screen.getByTestId('scrolling-feed-update-bar')).toBeInTheDocument()
    })
    expect(screen.getAllByText('Alex is session MVP').length).toBeGreaterThan(0)
    expect(screen.getByText('Live')).toBeInTheDocument()
    expect(screen.queryByTestId('scrolling-feed-powered-by')).not.toBeInTheDocument()
  })

  it('stays on powered-by intro when the feed returns no items', async () => {
    mockFetchJson({
      enabled: true,
      items: [],
    })

    render(<ScrollingFeedUpdateBar {...baseProps} />)
    await vi.advanceTimersByTimeAsync(SCROLLING_FEED_INTRO_MIN_MS + 300)

    await waitFor(() => {
      expect(fetch).toHaveBeenCalled()
    })
    expect(screen.getByTestId('scrolling-feed-powered-by')).toBeInTheDocument()
    expect(screen.queryByTestId('scrolling-feed-update-bar')).not.toBeInTheDocument()
  })

  it('includes a sponsor segment when ticker is active and sponsors are present', async () => {
    mockFetchJson({
      enabled: true,
      items: Array.from({ length: 5 }, (_, index) => ({
        id: `mvp:event-${index}`,
        kind: 'mvp',
        headline: `Player ${index} is session MVP`,
        eventShortId: `event${index}`,
        dateLabel: 'Sun, Jul 12',
      })),
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
    await vi.advanceTimersByTimeAsync(SCROLLING_FEED_INTRO_MIN_MS + 300)

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
    await vi.advanceTimersByTimeAsync(SCROLLING_FEED_INTRO_MIN_MS + 300)

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
