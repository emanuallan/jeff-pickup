'use client'

import { useState } from 'react'
import { updateOrgLinks } from '../actions'
import { MAX_ORG_LINKS } from '@/lib/social-links'
import { SocialLinkIcon } from '@/app/org/[slug]/_components/social-links'

type Props = {
  orgSlug: string
  links: string[]
}

export function LinksForm({ orgSlug, links }: Props) {
  const [items, setItems] = useState<string[]>(links.length ? links : [''])
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

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
    const result = await updateOrgLinks(orgSlug, formData)
    if (result?.error) {
      setError(result.error)
    } else {
      setMessage('Saved.')
    }
  }

  return (
    <form
      action={handleSubmit}
      className="mt-3 space-y-3 rounded-2xl border border-zinc-800 bg-zinc-900/30 p-4"
    >
      <div className="space-y-2">
        {items.map((value, index) => {
          const trimmed = value.trim()
          return (
            <div key={index} className="flex items-center gap-2">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center">
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
                className="min-w-0 flex-1 rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="button"
                onClick={() => removeItem(index)}
                aria-label="Remove link"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-zinc-200"
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
          className="text-xs font-medium text-blue-400 hover:text-blue-300"
        >
          + Add link
        </button>
      ) : (
        <p className="text-xs text-zinc-600">You can add up to {MAX_ORG_LINKS} links.</p>
      )}

      <div className="flex items-center gap-3 border-t border-zinc-800 pt-3">
        <button
          type="submit"
          className="rounded-xl bg-zinc-800 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700"
        >
          Save links
        </button>
        {message ? <span className="text-xs text-zinc-400">{message}</span> : null}
        {error ? <span className="text-xs text-red-300">{error}</span> : null}
      </div>
    </form>
  )
}
