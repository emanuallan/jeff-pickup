'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { OrganizerNotification } from '@/lib/organizer-notifications'
import {
  formatNotificationTime,
  formatOrganizerNotificationCopy,
  organizerNotificationHref,
} from '@/lib/organizer-notifications'
import {
  markAllOrganizerNotificationsRead,
  markOrganizerNotificationRead,
} from '../notification-actions'

type Props = {
  initialNotifications: OrganizerNotification[]
  initialUnreadCount: number
}

function orgSlugFromPathname(pathname: string): string | null {
  const match = pathname.match(/^\/console\/([^/]+)/)
  const slug = match?.[1]
  if (!slug || slug === 'new') return null
  return slug
}

function kindBadge(kind: OrganizerNotification['kind']): { label: string; className: string } {
  switch (kind) {
    case 'new_signup_batch':
      return {
        label: 'New',
        className: 'bg-emerald-500/15 text-emerald-300 ring-emerald-500/30',
      }
    case 'returning_signup_batch':
      return {
        label: 'Returning',
        className: 'bg-indigo-500/15 text-indigo-300 ring-indigo-500/30',
      }
    case 'unregister_immediate':
      return {
        label: 'Left · soon',
        className: 'bg-amber-500/15 text-amber-300 ring-amber-500/30',
      }
    case 'unregister_batch':
      return {
        label: 'Left',
        className: 'bg-zinc-500/15 text-zinc-300 ring-zinc-500/30',
      }
  }
}

export function ConsoleNotificationBell({
  initialNotifications,
  initialUnreadCount,
}: Props) {
  const pathname = usePathname()
  const orgSlug = orgSlugFromPathname(pathname)

  const scopedFromServer = useMemo(
    () =>
      orgSlug
        ? initialNotifications.filter((n) => n.org_slug === orgSlug)
        : initialNotifications,
    [orgSlug, initialNotifications],
  )

  const scopedUnreadFromServer = useMemo(
    () =>
      orgSlug
        ? scopedFromServer.filter((n) => !n.read_at).length
        : initialUnreadCount,
    [orgSlug, scopedFromServer, initialUnreadCount],
  )

  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState(scopedFromServer)
  const [unreadCount, setUnreadCount] = useState(scopedUnreadFromServer)
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setNotifications(scopedFromServer)
    setUnreadCount(scopedUnreadFromServer)
  }, [scopedFromServer, scopedUnreadFromServer])

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) {
      document.addEventListener('mousedown', onDocClick)
    }
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [open])

  const handleMarkRead = useCallback(async (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read_at: new Date().toISOString() } : n)),
    )
    setUnreadCount((c) => Math.max(0, c - 1))
    await markOrganizerNotificationRead(id)
  }, [])

  const handleMarkAllRead = useCallback(async () => {
    setNotifications((prev) =>
      prev.map((n) => ({ ...n, read_at: n.read_at ?? new Date().toISOString() })),
    )
    setUnreadCount(0)
    const orgId = orgSlug ? notifications.find((n) => n.org_slug === orgSlug)?.org_id ?? null : null
    await markAllOrganizerNotificationsRead(orgId)
  }, [orgSlug, notifications])

  const showOrgName = !orgSlug

  return (
    <div ref={panelRef} className="relative">
      <button
        type="button"
        aria-label={unreadCount > 0 ? `${unreadCount} unread notifications` : 'Notifications'}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="relative inline-flex min-h-10 min-w-10 items-center justify-center rounded-lg border border-white/10 text-zinc-300 transition hover:border-white/20 hover:bg-white/5"
      >
        <svg
          aria-hidden
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          className="h-5 w-5"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0"
          />
        </svg>
        {unreadCount > 0 ? (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-indigo-600 px-1 text-[10px] font-bold text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="absolute right-0 top-full z-50 mt-2 w-[min(100vw-2rem,22rem)] overflow-hidden rounded-xl border border-white/10 bg-zinc-950/95 shadow-xl shadow-black/40 backdrop-blur-md">
          <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-zinc-100">Notifications</p>
              <p className="text-xs text-zinc-500">Roster updates · next 14 days</p>
            </div>
            {unreadCount > 0 ? (
              <button
                type="button"
                onClick={() => void handleMarkAllRead()}
                className="text-xs font-medium text-indigo-300 transition hover:text-indigo-200"
              >
                Mark all read
              </button>
            ) : null}
          </div>

          {notifications.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-zinc-500">No notifications yet.</p>
          ) : (
            <ul className="max-h-80 overflow-y-auto">
              {notifications.map((n) => {
                const { title, detail } = formatOrganizerNotificationCopy(n)
                const badge = kindBadge(n.kind)
                const href = organizerNotificationHref(n)
                const isUnread = !n.read_at
                const isActive = pathname === href

                return (
                  <li key={n.id} className="border-b border-white/5 last:border-0">
                    <Link
                      href={href}
                      onClick={() => {
                        if (isUnread) void handleMarkRead(n.id)
                        setOpen(false)
                      }}
                      className={`block px-4 py-3 transition hover:bg-white/5 ${
                        isActive ? 'bg-indigo-500/5' : ''
                      } ${isUnread ? 'bg-white/[0.02]' : ''}`}
                    >
                      <div className="flex items-start gap-2">
                        <span
                          className={`mt-0.5 shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ring-1 ring-inset ${badge.className}`}
                        >
                          {badge.label}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm leading-snug text-zinc-100">{title}</p>
                          <p className="mt-0.5 truncate text-xs text-zinc-400">
                            {showOrgName ? `${n.org_name} · ${detail}` : detail}
                          </p>
                          <p className="mt-1 text-[11px] text-zinc-600">
                            {formatNotificationTime(n.created_at)}
                          </p>
                        </div>
                        {isUnread ? (
                          <span
                            aria-hidden
                            className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-indigo-500"
                          />
                        ) : null}
                      </div>
                    </Link>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  )
}
