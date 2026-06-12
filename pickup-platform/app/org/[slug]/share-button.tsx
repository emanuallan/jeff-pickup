'use client'

import { useState } from 'react'

type Props = {
  title: string
  text: string
}

export function ShareButton({ title, text }: Props) {
  const [copied, setCopied] = useState(false)

  async function handleShare() {
    const url = typeof window !== 'undefined' ? window.location.href : ''
    const shareText = `${text}\n${url}`

    // Native share sheet on mobile, clipboard fallback elsewhere
    if (navigator.share) {
      try {
        await navigator.share({ title, text, url })
        return
      } catch {
        // user cancelled or unsupported — fall through to copy
      }
    }

    try {
      await navigator.clipboard.writeText(shareText)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // ignore
    }
  }

  return (
    <button
      type="button"
      onClick={handleShare}
      className="rounded-xl border border-zinc-700 px-3 py-2 text-xs font-medium text-zinc-200 hover:bg-zinc-900"
    >
      {copied ? 'Copied!' : 'Share'}
    </button>
  )
}
