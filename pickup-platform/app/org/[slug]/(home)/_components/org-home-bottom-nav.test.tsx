import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { OrgHomeBottomNav } from './org-home-bottom-nav'

vi.mock('next/navigation', () => ({
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}))

const navItems = [
  { key: 'sessions' as const, label: 'Sessions', href: '/' },
  { key: 'leaderboard' as const, label: 'Leaderboard', href: '/?tab=leaderboard' },
]

describe('OrgHomeBottomNav', () => {
  afterEach(() => {
    cleanup()
  })

  it('keeps sponsor content out of the sticky mobile chrome', () => {
    render(
      <OrgHomeBottomNav
        items={navItems}
        accent="#2563eb"
        basePath="/"
        slug="jeff"
        isOrganizer
      />,
    )

    expect(screen.queryByText('Thank you to our sponsors')).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Want to sponsor us?' })).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: /back to console/i })).toBeInTheDocument()
  })
})
