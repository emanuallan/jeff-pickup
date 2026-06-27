'use client'

import { useRouter } from 'next/navigation'

type Props = {
  fallbackHref: string
  label?: string
}

export function ConsoleHistoryBackLink({ fallbackHref, label = 'Back' }: Props) {
  const router = useRouter()

  return (
    <button
      type="button"
      onClick={() => {
        if (typeof window !== 'undefined' && window.history.length > 1) {
          router.back()
          return
        }
        router.push(fallbackHref)
      }}
      className="inline-flex min-h-9 items-center gap-1 text-sm text-zinc-400 transition-colors hover:text-zinc-200"
    >
      <span aria-hidden>←</span> {label}
    </button>
  )
}
