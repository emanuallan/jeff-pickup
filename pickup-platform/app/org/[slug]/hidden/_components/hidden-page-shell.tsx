import type { ReactNode } from 'react'

/** Bottom padding when tab bar + footer strip are shown. */
export const HIDDEN_BOTTOM_CHROME_PADDING =
  'pb-[calc(8rem+env(safe-area-inset-bottom))]'

/** Bottom padding when only the footer strip is shown (single tab). */
export const HIDDEN_FOOTER_ONLY_PADDING =
  'pb-[calc(3.5rem+env(safe-area-inset-bottom))]'

export function HiddenPageShell({
  children,
  bottomChrome,
  footerOnly = false,
}: {
  children: ReactNode
  bottomChrome: ReactNode
  footerOnly?: boolean
}) {
  const bottomPadding = footerOnly
    ? HIDDEN_FOOTER_ONLY_PADDING
    : HIDDEN_BOTTOM_CHROME_PADDING

  return (
    <>
      <main
        className={`mx-auto flex min-h-dvh max-w-lg flex-col px-5 pt-6 sm:px-6 sm:pt-8 ${bottomPadding}`}
      >
        {children}
      </main>
      {bottomChrome}
    </>
  )
}
