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

describe('OrgHomeBottomNav sponsorship CTA', () => {
  afterEach(() => {
    cleanup()
  })

  it('shows the sponsor CTA for organizers on mobile chrome', () => {
    render(
      <OrgHomeBottomNav
        items={navItems}
        accent="#2563eb"
        basePath="/"
        slug="jeff"
        isOrganizer
        showSponsorshipCta
      />,
    )

    expect(screen.getByRole('link', { name: 'Want to sponsor us?' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /back to console/i })).toBeInTheDocument()
  })
})
