import { act, cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  ORG_PUBLIC_SPLASH_FADE_MS,
  ORG_PUBLIC_SPLASH_MIN_MS,
  orgPublicSplashStorageKey,
} from '@/lib/org-public-splash'
import { OrgPublicSplash } from './org-public-splash'

vi.mock('next/image', () => ({
  default: ({
    alt = '',
    src,
    width,
    height,
    className,
    ...props
  }: {
    alt?: string
    src: string
    width?: number
    height?: number
    className?: string
    'data-testid'?: string
  }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      alt={alt}
      src={src}
      width={width}
      height={height}
      className={className}
      {...props}
    />
  ),
}))

describe('OrgPublicSplash', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    sessionStorage.clear()
    Object.defineProperty(document, 'readyState', {
      configurable: true,
      get: () => 'complete',
    })
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    })
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb: FrameRequestCallback) => {
      cb(0)
      return 1
    })
  })

  afterEach(() => {
    cleanup()
    vi.useRealTimers()
    vi.restoreAllMocks()
    sessionStorage.clear()
  })

  it('shows on first visit, then fades out once the page is ready', async () => {
    render(
      <OrgPublicSplash slug="demo" orgName="Demo FC" accent="#22c55e" orgLogoUrl={null} />,
    )

    expect(screen.getByTestId('org-public-splash')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Demo FC' })).toBeInTheDocument()
    expect(screen.getByTestId('org-public-splash-powered-by')).toHaveTextContent('Powered by')
    expect(screen.getByTestId('org-public-splash-powered-by')).toHaveTextContent('Organizr')

    await act(async () => {
      await vi.advanceTimersByTimeAsync(ORG_PUBLIC_SPLASH_MIN_MS)
    })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(ORG_PUBLIC_SPLASH_FADE_MS)
    })

    expect(screen.queryByTestId('org-public-splash')).not.toBeInTheDocument()
    expect(sessionStorage.getItem(orgPublicSplashStorageKey('demo'))).toBe('1')
  })

  it('skips the splash when this tab has already seen it', () => {
    sessionStorage.setItem(orgPublicSplashStorageKey('demo'), '1')

    render(
      <OrgPublicSplash slug="demo" orgName="Demo FC" accent="#22c55e" orgLogoUrl={null} />,
    )

    expect(screen.queryByTestId('org-public-splash')).not.toBeInTheDocument()
  })

  it('renders the org logo when provided', () => {
    render(
      <OrgPublicSplash
        slug="demo"
        orgName="Demo FC"
        accent="#22c55e"
        orgLogoUrl="https://cdn.example/logo.png"
      />,
    )

    expect(screen.getByTestId('org-public-splash-logo')).toHaveAttribute(
      'src',
      'https://cdn.example/logo.png',
    )
  })

  it('welcomes a known participant by first name', () => {
    render(
      <OrgPublicSplash
        slug="demo"
        orgName="Demo FC"
        accent="#22c55e"
        participantFirstName="Alex"
      />,
    )

    expect(screen.getByText('Welcome Back Alex')).toBeInTheDocument()
    expect(screen.queryByText('Welcome')).not.toBeInTheDocument()
  })

  it('shows community partner logos when sponsors are present', () => {
    render(
      <OrgPublicSplash
        slug="demo"
        orgName="Demo FC"
        accent="#22c55e"
        sponsors={[
          {
            id: '1',
            sponsor_name: 'Acme',
            logo_url: 'https://cdn.example/acme.png',
            sponsor_url: null,
            monthly_amount_cents: 5000,
          },
          {
            id: '2',
            sponsor_name: 'Beta Co',
            logo_url: 'https://cdn.example/beta.png',
            sponsor_url: null,
            monthly_amount_cents: 2500,
          },
        ]}
      />,
    )

    expect(screen.getByTestId('org-public-splash-sponsors')).toBeInTheDocument()
    expect(screen.getByText('Community partners')).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Acme' })).toHaveAttribute(
      'src',
      'https://cdn.example/acme.png',
    )
    expect(screen.getByRole('img', { name: 'Beta Co' })).toBeInTheDocument()
  })

  it('hides the partners strip when there are no sponsors', () => {
    render(
      <OrgPublicSplash slug="demo" orgName="Demo FC" accent="#22c55e" sponsors={[]} />,
    )

    expect(screen.queryByTestId('org-public-splash-sponsors')).not.toBeInTheDocument()
  })
})
