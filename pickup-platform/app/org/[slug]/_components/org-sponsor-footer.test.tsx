import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { OrgSponsorFooter } from './org-sponsor-footer'

describe('OrgSponsorFooter', () => {
  it('renders sponsor logos and CTA', () => {
    render(
      <OrgSponsorFooter
        slug="demo"
        sponsors={[
          {
            id: '1',
            sponsor_name: 'Acme',
            logo_url: 'https://example.com/logo.png',
            sponsor_url: 'https://acme.test',
          },
        ]}
        showCta
      />,
    )

    expect(screen.getByText('Thank you to our sponsors')).toBeInTheDocument()
    expect(screen.getByAltText('Acme')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Want to sponsor us?' })).toHaveAttribute(
      'href',
      expect.stringContaining('/sponsorship'),
    )
  })

  it('hides when empty and CTA off', () => {
    const { container } = render(
      <OrgSponsorFooter slug="demo" sponsors={[]} showCta={false} />,
    )
    expect(container).toBeEmptyDOMElement()
  })
})
