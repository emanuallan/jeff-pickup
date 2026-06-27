'use client'

import { useState } from 'react'
import { updateOrgLinks } from '../actions'
import { MAX_ORG_LINKS } from '@/lib/social-links'
import { SocialLinkIcon } from '@/app/org/[slug]/_components/social-links'
import { consoleInput, btnSecondary, ConsoleSubmitButton } from '../_components/console-ui'

type Props = {
  orgSlug: string
  links: string[]
}

export function LinksForm({ orgSlug, links }: Props) {
  const [items, setItems] = useState<string[]>(links.length ? links : [''])
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  function setItem(index: number, value: string) {
    setItems((prev) => prev.map((v, i) => (i === index ? value : v)))
  }

  function addItem() {
    setItems((prev) => (prev.length < MAX_ORG_LINKS ? [...prev, ''] : prev))
  }

  function removeItem(index: number) {
    setItems((prev) => {
      const next = prev.filter((_, i) => i !== index)
      return next.length ? next : ['']
    })
  }

  async function handleSubmit(formData: FormData) {
    setMessage(null)
    setError(null)
    setPending(true)
    const result = await updateOrgLinks(orgSlug, formData)
    setPending(false)
    if (result?.error) {
      setError(result.error)
    } else {
      setMessage('Saved.')
    }
  }

  return (
    <form action={handleSubmit} className="space-y-3">
      <div className="space-y-2">
        {items.map((value, index) => {
          const trimmed = value.trim()
          return (
            <div key={index} className="flex items-center gap-2">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center sm:h-9 sm:w-9">
                {trimmed ? (
                  <SocialLinkIcon url={trimmed} />
                ) : (
                  <span className="h-9 w-9 rounded-full border border-dashed border-zinc-700" />
                )}
              </span>
              <input
                name="link"
                type="text"
                inputMode="url"
                value={value}
                onChange={(e) => setItem(index, e.target.value)}
                placeholder="https://instagram.com/yourgroup"
                className={`min-w-0 flex-1 ${consoleInput}`}
              />
              <button
                type="button"
                onClick={() => removeItem(index)}
                aria-label="Remove link"
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-zinc-200 sm:h-9 sm:w-9"
              >
                <svg
                  className="h-4 w-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden
                >
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
          )
        })}
      </div>

      {items.length < MAX_ORG_LINKS ? (
        <button
          type="button"
          onClick={addItem}
          className="text-xs font-medium text-indigo-300 hover:text-indigo-200"
        >
          + Add link
        </button>
      ) : (
        <p className="text-xs text-zinc-600">You can add up to {MAX_ORG_LINKS} links.</p>
      )}

      <div className="flex flex-col gap-2 border-t border-white/5 pt-3 sm:flex-row sm:items-center sm:gap-3">
        <ConsoleSubmitButton pending={pending} className={`w-full sm:w-auto ${btnSecondary}`}>
          Save links
        </ConsoleSubmitButton>
        {message ? <span className="text-xs text-zinc-400">{message}</span> : null}
        {error ? <span className="text-xs text-red-300">{error}</span> : null}
      </div>
    </form>
  )
}
