import type { ReactNode } from 'react'

/** Bottom padding: tab bar + footer strip plus content breathing room. */
export const HIDDEN_BOTTOM_CHROME_PADDING =
  'pb-[calc(8rem+env(safe-area-inset-bottom))]'

export function HiddenPageShell({
  children,
  bottomChrome,
}: {
  children: ReactNode
  bottomChrome: ReactNode
}) {
  return (
    <>
      <main
        className={`mx-auto flex min-h-dvh max-w-lg flex-col px-5 pt-6 sm:px-6 sm:pt-8 ${HIDDEN_BOTTOM_CHROME_PADDING}`}
      >
        {children}
      </main>
      {bottomChrome}
    </>
  )
}
