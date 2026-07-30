import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { SessionPriceBadge, SessionTeamsBadge } from './event-ui'

describe('SessionPriceBadge', () => {
  it('renders cash icon and amount for paid sessions', () => {
    render(<SessionPriceBadge priceCents={1500} accent="#2563eb" />)

    expect(screen.getByText('$15.00')).toBeInTheDocument()
    expect(screen.getByText(/per person/i)).toBeInTheDocument()
    expect(screen.getByTitle(/session fee \$15\.00 per person/i)).toBeInTheDocument()
  })

  it('renders nothing for free sessions', () => {
    const { container } = render(<SessionPriceBadge priceCents={0} accent="#2563eb" />)
    expect(container).toBeEmptyDOMElement()
  })
})

describe('SessionTeamsBadge', () => {
  it('renders the team count when teams are enabled', () => {
    render(<SessionTeamsBadge teamCount={2} />)
    expect(screen.getByText('2 teams')).toBeInTheDocument()
    expect(screen.getByTitle(/splits into 2 teams/i)).toBeInTheDocument()
  })

  it('renders nothing when teams are off', () => {
    const { container } = render(<SessionTeamsBadge teamCount={null} />)
    expect(container).toBeEmptyDOMElement()
  })
})
