import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MatchdayDateChips } from './matchday-date-chips'
import type { MatchdayChipDisplay } from '@/lib/matchday-chip-display'

const replaceMock = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: replaceMock,
    refresh: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    prefetch: vi.fn(),
  }),
  useSearchParams: () => new URLSearchParams('cal=evt-a'),
  usePathname: () => '/',
}))

const chips: MatchdayChipDisplay[] = [
  {
    shortId: 'evt-a',
    month: 'Jul',
    day: '10',
    bottomLabel: 'Thu',
    cancelled: false,
    pastReference: false,
    showTime: false,
    ariaLabel: 'Jul 10, Thu',
  },
  {
    shortId: 'evt-b',
    month: 'Jul',
    day: '12',
    bottomLabel: 'Sat',
    cancelled: false,
    pastReference: false,
    showTime: false,
    ariaLabel: 'Jul 12, Sat',
  },
]

describe('MatchdayDateChips', () => {
  beforeEach(() => {
    replaceMock.mockReset()
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

  it('updates the URL when a different chip is selected', async () => {
    const user = userEvent.setup()

    render(<MatchdayDateChips chips={chips} activeEventId="evt-a" accent="#22c55e" />)

    await user.click(screen.getByRole('button', { name: 'Jul 12, Sat' }))

    expect(replaceMock).toHaveBeenCalledWith('/?cal=evt-b', { scroll: false })
  })

  it('does not navigate when clicking the already active chip', async () => {
    const user = userEvent.setup()

    render(<MatchdayDateChips chips={chips} activeEventId="evt-a" accent="#22c55e" />)

    await user.click(screen.getByLabelText('Jul 10, Thu'))

    expect(replaceMock).not.toHaveBeenCalled()
  })

  it('renders a faded past-session chip that can still be selected', async () => {
    const user = userEvent.setup()
    const withPast: MatchdayChipDisplay[] = [
      {
        shortId: 'evt-past',
        month: 'Jul',
        day: '8',
        bottomLabel: 'Tue',
        cancelled: false,
        pastReference: true,
        showTime: false,
        ariaLabel: 'Jul 8, Tue, past session',
      },
      ...chips,
    ]

    render(<MatchdayDateChips chips={withPast} activeEventId="evt-a" accent="#22c55e" />)

    const pastChip = screen.getByRole('button', { name: 'Jul 8, Tue, past session' })
    expect(pastChip).toHaveTextContent('Tue')
    expect(pastChip.className).toMatch(/opacity-60/)

    await user.click(pastChip)
    expect(replaceMock).toHaveBeenCalledWith('/?cal=evt-past', { scroll: false })
  })
})
