/** Public org pages: phone stays narrow; tablet and desktop get a wider, polished layout. */
export const ORG_PUBLIC_CONTENT_MAX = 'max-w-lg md:max-w-5xl'

/** Tablet/desktop overrides for shell bottom padding (mobile calc padding is unchanged below md). */
export const ORG_PUBLIC_DESKTOP_SHELL_PADDING = 'md:pb-12'

/** Sticky offset for tablet/desktop event cards while scrolling the roster column. */
export const ORG_PUBLIC_DESKTOP_STICKY_CARD =
  'md:sticky md:top-8 md:max-h-[calc(100dvh-4rem)] md:self-start md:overflow-y-auto'
