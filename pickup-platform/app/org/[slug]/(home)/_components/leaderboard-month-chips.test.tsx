import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { LeaderboardMonthChips } from './leaderboard-month-chips'

const replaceMock = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: replaceMock }),
  useSearchParams: () => new URLSearchParams('tab=leaderboard'),
}))

const chips = [
  {
    id: '2026-06',
    monthLabel: 'Jun',
    yearLabel: '2026',
    ariaLabel: 'June 2026',
  },
  {
    id: '2026-07',
    monthLabel: 'Jul',
    yearLabel: '2026',
    ariaLabel: 'July 2026',
  },
  {
    id: 'all',
    monthLabel: 'All',
    yearLabel: 'time',
    ariaLabel: 'All time',
  },
]

describe('LeaderboardMonthChips', () => {
  beforeEach(() => {
    replaceMock.mockReset()
  })

  afterEach(() => {
    cleanup()
  })

  it('updates the URL when a different period chip is selected', async () => {
    const user = userEvent.setup()

    render(
      <LeaderboardMonthChips chips={chips} activePeriodId="2026-07" accent="#22c55e" />,
    )

    await user.click(screen.getByRole('button', { name: 'June 2026' }))

    expect(replaceMock).toHaveBeenCalledWith('/?tab=leaderboard&lb=2026-06', {
      scroll: false,
    })
  })

  it('selects all-time via lb=all', async () => {
    const user = userEvent.setup()

    render(
      <LeaderboardMonthChips chips={chips} activePeriodId="2026-07" accent="#22c55e" />,
    )

    await user.click(screen.getByRole('button', { name: 'All time' }))

    expect(replaceMock).toHaveBeenCalledWith('/?tab=leaderboard&lb=all', {
      scroll: false,
    })
  })
})
