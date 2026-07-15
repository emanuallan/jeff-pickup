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
        orgName="Jeff Soccer"
        isOrganizer
      />,
    )

    expect(screen.queryByText(/thank you for supporting/i)).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /want to sponsor us/i })).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: /back to console/i })).toBeInTheDocument()
  })

  it('shows the powered-by strip for regular visitors', () => {
    render(
      <OrgHomeBottomNav
        items={navItems}
        accent="#2563eb"
        basePath="/"
        slug="jeff"
        orgName="Jeff Soccer"
      />,
    )

    expect(screen.getByText('jeff.organizr.co')).toBeInTheDocument()
    expect(screen.getByTitle('Create your own group on Organizr')).toBeInTheDocument()
  })
})
