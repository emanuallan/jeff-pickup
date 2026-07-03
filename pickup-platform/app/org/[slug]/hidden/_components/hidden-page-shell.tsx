import type { ReactNode } from 'react'

/** Bottom padding when the fixed tab bar is shown. */
export const HIDDEN_TAB_BAR_PADDING =
  'pb-[calc(4.75rem+env(safe-area-inset-bottom))]'

/** Bottom padding when there is no fixed bottom chrome. */
export const HIDDEN_NO_TAB_BAR_PADDING =
  'pb-[calc(1.5rem+env(safe-area-inset-bottom))]'

export function HiddenPageShell({
  children,
  bottomChrome,
  hasTabBar = true,
}: {
  children: ReactNode
  bottomChrome: ReactNode
  hasTabBar?: boolean
}) {
  const bottomPadding = hasTabBar ? HIDDEN_TAB_BAR_PADDING : HIDDEN_NO_TAB_BAR_PADDING

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
