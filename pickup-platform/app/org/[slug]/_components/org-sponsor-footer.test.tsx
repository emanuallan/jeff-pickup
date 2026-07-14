import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { OrgSponsorSection } from './org-sponsor-footer'

const baseProps = {
  slug: 'demo',
  orgName: 'Demo FC',
  accent: '#2563eb',
}

describe('OrgSponsorSection', () => {
  afterEach(() => {
    cleanup()
  })

  it('renders a branded thank-you section with sponsor logos and CTA', () => {
    render(
      <OrgSponsorSection
        {...baseProps}
        sponsors={[
          {
            id: '1',
            sponsor_name: 'Acme',
            logo_url: 'https://example.com/logo.png',
            sponsor_url: 'https://acme.test',
            monthly_amount_cents: 5000,
          },
        ]}
        showCta
      />,
    )

    expect(
      screen.getByRole('heading', { name: /thank you for supporting demo fc/i }),
    ).toBeInTheDocument()
    expect(screen.getByText('Community sponsors')).toBeInTheDocument()
    expect(screen.getByAltText('Acme')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /want to sponsor us/i })).toHaveAttribute(
      'href',
      expect.stringContaining('/sponsorship'),
    )
  })

  it('renders a sponsor CTA card when there are no logos yet', () => {
    render(<OrgSponsorSection {...baseProps} sponsors={[]} showCta />)

    expect(screen.getByRole('heading', { name: /become a demo fc sponsor/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /want to sponsor us/i })).toBeInTheDocument()
  })

  it('always shows the sponsor CTA when the section is visible', () => {
    render(
      <OrgSponsorSection
        {...baseProps}
        sponsors={[
          {
            id: '1',
            sponsor_name: 'Acme',
            logo_url: 'https://example.com/logo.png',
            sponsor_url: null,
            monthly_amount_cents: 2500,
          },
        ]}
        showCta
      />,
    )

    expect(screen.getByRole('link', { name: /want to sponsor us/i })).toHaveAttribute(
      'href',
      expect.stringContaining('/sponsorship'),
    )
  })

  it('hides when there is nothing to show', () => {
    const { container } = render(
      <OrgSponsorSection {...baseProps} sponsors={[]} showCta={false} />,
    )
    expect(container).toBeEmptyDOMElement()
  })
})
