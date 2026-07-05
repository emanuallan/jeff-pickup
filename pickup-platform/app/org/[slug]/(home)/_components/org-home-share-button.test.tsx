import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { OrgHomeShareButton } from './org-home-share-button'

const useSearchParamsMock = vi.fn(() => new URLSearchParams())

vi.mock('next/navigation', () => ({
  useSearchParams: () => useSearchParamsMock(),
}))

vi.mock('../../share-button-lazy', () => ({
  ShareButton: ({
    imagePath,
    title,
  }: {
    imagePath: string
    title: string
    text: string
    accent: string
  }) => <div data-testid="share-button" data-image-path={imagePath} data-title={title} />,
}))

const calendarShare = {
  title: 'Demo FC upcoming sessions',
  text: 'Join us on Organizr',
  imagePath: '/cal/share-image',
}

const eventShares = [
  {
    shortId: 'evt-a',
    title: 'Demo FC — Thursday Night',
    text: 'Thursday at Main Field',
  },
  {
    shortId: 'evt-b',
    title: 'Demo FC — Saturday Morning',
    text: 'Saturday at Main Field',
  },
]

describe('OrgHomeShareButton', () => {
  beforeEach(() => {
    useSearchParamsMock.mockReset()
  })

  afterEach(() => {
    cleanup()
  })

  it('uses the calendar share image on the leaderboard tab', () => {
    useSearchParamsMock.mockReturnValue(new URLSearchParams('tab=leaderboard'))

    render(
      <OrgHomeShareButton
        accent="#22c55e"
        calendar={calendarShare}
        events={eventShares}
        defaultEventShortId="evt-a"
      />,
    )

    const button = screen.getByTestId('share-button')
    expect(button).toHaveAttribute('data-image-path', '/cal/share-image')
    expect(button).toHaveAttribute('data-title', calendarShare.title)
  })

  it('uses the selected event share image on the sessions tab', () => {
    useSearchParamsMock.mockReturnValue(new URLSearchParams('cal=evt-b'))

    render(
      <OrgHomeShareButton
        accent="#22c55e"
        calendar={calendarShare}
        events={eventShares}
        defaultEventShortId="evt-a"
      />,
    )

    const button = screen.getByTestId('share-button')
    expect(button).toHaveAttribute('data-image-path', '/cal/evt-b/share-image')
    expect(button).toHaveAttribute('data-title', 'Demo FC — Saturday Morning')
  })

  it('falls back to the calendar share image when no event is selected', () => {
    useSearchParamsMock.mockReturnValue(new URLSearchParams())

    render(
      <OrgHomeShareButton
        accent="#22c55e"
        calendar={calendarShare}
        events={eventShares}
        defaultEventShortId={null}
      />,
    )

    const button = screen.getByTestId('share-button')
    expect(button).toHaveAttribute('data-image-path', '/cal/share-image')
  })
})
