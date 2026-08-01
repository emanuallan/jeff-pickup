'use client'

import { useRef, useState } from 'react'
import { ConfirmSheet } from './confirm-sheet'

export function ConsoleSignOutButton() {
  const formRef = useRef<HTMLFormElement>(null)
  const [open, setOpen] = useState(false)

  return (
    <>
      <form ref={formRef} action="/auth/signout" method="post">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex min-h-10 items-center rounded-lg border border-white/10 px-3 py-2 text-xs font-medium text-zinc-300 transition hover:border-white/20 hover:bg-white/5"
        >
          Sign out
        </button>
      </form>
      <ConfirmSheet
        open={open}
        onClose={() => setOpen(false)}
        title="Sign out?"
        description="You’ll need to sign in again to manage your groups."
        confirmLabel="Sign out"
        onConfirm={() => {
          formRef.current?.requestSubmit()
        }}
      />
    </>
  )
}
