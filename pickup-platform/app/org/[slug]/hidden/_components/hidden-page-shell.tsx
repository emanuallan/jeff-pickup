import type { ReactNode } from 'react'

/** Bottom padding reserves space for the fixed nav dock + footer strip. */
export const HIDDEN_BOTTOM_CHROME_PADDING =
  'pb-[calc(6.75rem+env(safe-area-inset-bottom))]'

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
        className={`mx-auto flex min-h-dvh max-w-lg flex-col px-5 pt-10 sm:px-6 ${HIDDEN_BOTTOM_CHROME_PADDING}`}
      >
        {children}
      </main>
      {bottomChrome}
    </>
  )
}
