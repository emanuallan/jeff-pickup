'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import type { Location } from '@/lib/locations'
import { OneOffEventForm } from './one-off-event-form'
import {
  btnOutline,
  consoleModalBackdrop,
  consoleModalOverlay,
  consoleModalPanel,
} from '../_components/console-ui'
import { arrowNe } from '@/lib/text-arrows'

type Props = {
  orgSlug: string
  orgName: string
  orgActivity: string | null
  logoUrl: string | null
  publicUrl: string
  locations: Location[]
  canAddOneOff: boolean
  createOneOff: (formData: FormData) => Promise<void>
}

export function OrgConsoleHeader({
  orgSlug,
  orgName,
  orgActivity,
  logoUrl,
  publicUrl,
  locations,
  canAddOneOff,
  createOneOff,
}: Props) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [oneOffOpen, setOneOffOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!menuOpen) return
    function onPointerDown(e: PointerEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    window.addEventListener('pointerdown', onPointerDown)
    return () => window.removeEventListener('pointerdown', onPointerDown)
  }, [menuOpen])

  useEffect(() => {
    if (!oneOffOpen) return
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setOneOffOpen(false)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [oneOffOpen])

  function openOneOff() {
    setMenuOpen(false)
    setOneOffOpen(true)
  }

  const menuItemClass =
    'flex min-h-11 w-full items-center rounded-lg px-3 py-2.5 text-left text-sm text-zinc-200 transition hover:bg-white/5'

  return (
    <>
      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={logoUrl}
              alt=""
              className="h-11 w-11 shrink-0 rounded-xl object-cover"
            />
          ) : null}
          <div className="min-w-0">
            <h1 className="text-xl font-semibold tracking-tight text-zinc-50 sm:text-2xl">{orgName}</h1>
            {orgActivity ? <p className="mt-1 text-sm text-zinc-400">{orgActivity}</p> : null}
          </div>
        </div>

        <div ref={menuRef} className="relative w-full shrink-0 sm:w-auto">
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            className={`${btnOutline} w-full gap-1.5 sm:w-auto`}
            aria-expanded={menuOpen}
            aria-haspopup="menu"
          >
            Actions
            <span className="text-zinc-500" aria-hidden>
              {menuOpen ? '⌃' : '⌄'}
            </span>
          </button>

          {menuOpen ? (
            <div
              role="menu"
              className="absolute right-0 z-30 mt-2 w-full min-w-[14rem] rounded-xl border border-white/10 bg-zinc-900 p-1.5 shadow-xl sm:w-56"
            >
              <Link
                href={`/console/${orgSlug}/participants`}
                role="menuitem"
                className={menuItemClass}
                onClick={() => setMenuOpen(false)}
              >
                Participants
              </Link>
              <Link
                href={`/console/${orgSlug}/settings`}
                role="menuitem"
                className={menuItemClass}
                onClick={() => setMenuOpen(false)}
              >
                Personalize
              </Link>
              <a
                href={publicUrl}
                target="_blank"
                rel="noreferrer"
                role="menuitem"
                className={menuItemClass}
                onClick={() => setMenuOpen(false)}
              >
                View public page {arrowNe}
              </a>
              {canAddOneOff ? (
                <button
                  type="button"
                  role="menuitem"
                  className={menuItemClass}
                  onClick={openOneOff}
                >
                  Add one-off session
                </button>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>

      {oneOffOpen ? (
        <div
          className={consoleModalOverlay}
          role="dialog"
          aria-modal="true"
          aria-labelledby="one-off-title"
        >
          <button
            type="button"
            className={consoleModalBackdrop}
            aria-label="Close"
            onClick={() => setOneOffOpen(false)}
          />
          <div className={`${consoleModalPanel} max-w-md`}>
            <h2 id="one-off-title" className="text-lg font-semibold text-zinc-50">
              Add one-off session
            </h2>
            <p className="mt-1 text-sm text-zinc-400">
              A single session outside your recurring schedule.
            </p>
            <div className="mt-5">
              <OneOffEventForm
                locations={locations}
                createOneOff={createOneOff}
                onSuccess={() => setOneOffOpen(false)}
              />
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}
