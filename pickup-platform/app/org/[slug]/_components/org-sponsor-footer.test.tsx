import { describe, expect, it, afterEach } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { OrgSponsorFooter } from './org-sponsor-footer'

describe('OrgSponsorFooter', () => {
  afterEach(() => {
    cleanup()
  })

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

    expect(screen.getByRole('heading', { name: 'Thank you to our sponsors' })).toBeInTheDocument()
    expect(screen.getByAltText('Acme')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /want to sponsor us/i })).toHaveAttribute(
      'href',
      expect.stringContaining('/sponsorship'),
    )
  })

  it('renders a sponsor CTA card when there are no logos yet', () => {
    render(<OrgSponsorFooter slug="demo" sponsors={[]} showCta />)

    expect(screen.getByRole('link', { name: /want to sponsor us/i })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: /thank you to our sponsors/i })).not.toBeInTheDocument()
  })

  it('hides when empty and CTA off', () => {
    const { container } = render(
      <OrgSponsorFooter slug="demo" sponsors={[]} showCta={false} />,
    )
    expect(container).toBeEmptyDOMElement()
  })
})
