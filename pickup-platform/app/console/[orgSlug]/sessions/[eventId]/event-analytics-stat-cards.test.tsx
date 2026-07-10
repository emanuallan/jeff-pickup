import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { PageViewsStatCard, SignupRateStatCard } from './event-analytics-stat-cards'

vi.mock('../../../_components/console-toast', () => ({
  useConsoleToast: () => ({ error: vi.fn() }),
}))

const statCardsPath = resolve(
  dirname(fileURLToPath(import.meta.url)),
  'event-analytics-stat-cards.tsx',
)

describe('event-analytics-stat-cards', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'matchMedia',
      vi.fn().mockImplementation(() => ({
        matches: true,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    )
  })

  afterEach(() => {
    cleanup()
  })

  it('is a client module so render props are not passed across the RSC boundary', () => {
    const source = readFileSync(statCardsPath, 'utf8')
    expect(source.trimStart()).toMatch(/^['"]use client['"]/)
  })

  it('renders a static page views card when count is zero', () => {
    render(<PageViewsStatCard orgSlug="jeff" eventId="evt-1" count={0} />)

    expect(screen.getByText('Page views')).toBeInTheDocument()
    expect(screen.getByText('0')).toBeInTheDocument()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('renders an interactive page views card when count is positive', () => {
    render(<PageViewsStatCard orgSlug="jeff" eventId="evt-1" count={12} />)

    expect(screen.getByRole('button')).toBeInTheDocument()
    expect(screen.getByText('12')).toBeInTheDocument()
  })

  it('renders sign-up rate details without crashing', () => {
    render(
      <SignupRateStatCard
        orgSlug="jeff"
        eventId="evt-1"
        rate="42%"
        capped={false}
        hasTraffic
        hint="5 signed up"
      />,
    )

    expect(screen.getByRole('button')).toBeInTheDocument()
    expect(screen.getByText('42%')).toBeInTheDocument()
  })
})
