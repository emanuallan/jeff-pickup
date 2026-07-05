'use client'

import { useState } from 'react'
import { BottomSheet } from '@/app/_components/bottom-sheet'
import { SocialLinkRow } from './_components/social-links'

type Props = {
  links: string[]
}

function LinksIcon() {
  return (
    <svg
      className="h-3.5 w-3.5"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  )
}

export function LinksButton({ links }: Props) {
  const [open, setOpen] = useState(false)

  if (!links.length) return null

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Links"
        className="inline-flex items-center gap-1.5 rounded-full border border-zinc-800 bg-zinc-900/60 px-3.5 py-2 text-xs font-medium text-zinc-200 transition-colors hover:border-zinc-700 hover:text-zinc-50"
      >
        <LinksIcon />
        Links
      </button>

      <BottomSheet
        open={open}
        onClose={() => setOpen(false)}
        variant="fixed"
        ariaLabelledby="links-sheet-title"
      >
        <h2 id="links-sheet-title" className="text-lg font-semibold tracking-tight text-zinc-50">
          Links
        </h2>
        <p className="mt-1 text-sm text-zinc-500">Find this group elsewhere on the web.</p>

        <nav aria-label="Group links" className="mt-5 space-y-3">
          {links.map((url) => (
            <SocialLinkRow key={url} url={url} />
          ))}
        </nav>
      </BottomSheet>
    </>
  )
}
