'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { ParticipantNotification } from '@/lib/participant-notifications'
import {
  formatNotificationTime,
  formatParticipantNotificationCopy,
} from '@/lib/participant-notifications'
import { BottomSheet, useMobileSheetLayout } from '@/app/_components/bottom-sheet'
import {
  dismissParticipantNotification,
  markParticipantNotificationRead,
} from '../participant-notification-actions'
import { SessionFeedbackSheet } from './session-feedback-sheet'

type Props = {
  orgSlug: string
  accent: string
  initialNotifications: ParticipantNotification[]
  initialUnreadCount: number
}

function NotificationPanelContent({
  notifications,
  unreadCount,
  onClose,
  onSelect,
  onMarkRead,
  onDismiss,
}: {
  notifications: ParticipantNotification[]
  unreadCount: number
  onClose: () => void
  onSelect: (notification: ParticipantNotification) => void
  onMarkRead: (id: string) => void
  onDismiss: (id: string) => void
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
        <h2 className="text-sm font-semibold text-zinc-100">Notifications</h2>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg px-2 py-1 text-xs text-zinc-400 hover:bg-white/5 hover:text-zinc-200"
        >
          Close
        </button>
      </div>

      {notifications.length === 0 ? (
        <p className="px-4 py-8 text-center text-sm text-zinc-500">No notifications yet.</p>
      ) : (
        <ul className="min-h-0 flex-1 overflow-y-auto sm:max-h-80">
          {notifications.map((n) => {
            const { title, detail } = formatParticipantNotificationCopy(n)
            const isUnread = !n.read_at
            const when = formatNotificationTime(n.created_at)
            const subtitle = `${detail} · ${when}`

            return (
              <li key={n.id} className="flex border-b border-white/5 last:border-0">
                <button
                  type="button"
                  onClick={() => {
                    if (isUnread) void onMarkRead(n.id)
                    onSelect(n)
                    onClose()
                  }}
                  className={`flex min-w-0 flex-1 items-start gap-2 px-4 py-3 text-left transition hover:bg-white/5 ${
                    isUnread ? 'bg-white/2' : ''
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <span className="inline-flex rounded-md bg-indigo-500/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-indigo-300 ring-1 ring-inset ring-indigo-500/20">
                      Feedback
                    </span>
                    <p className="mt-1.5 text-sm leading-snug text-zinc-100">{title}</p>
                    <p className="mt-0.5 truncate text-xs text-zinc-400">{subtitle}</p>
                  </div>
                  {isUnread ? (
                    <span aria-hidden className="mt-1 h-2 w-2 shrink-0 rounded-full bg-indigo-500" />
                  ) : null}
                </button>
                <button
                  type="button"
                  aria-label="Clear notification"
                  onClick={() => void onDismiss(n.id)}
                  className="shrink-0 px-3 py-3 text-zinc-600 transition hover:text-zinc-300"
                >
                  ×
                </button>
              </li>
            )
          })}
        </ul>
      )}

      {unreadCount > 0 ? (
        <p className="border-t border-white/5 px-4 py-2 text-[11px] text-zinc-500">
          {unreadCount} unread
        </p>
      ) : null}
    </div>
  )
}

export function ParticipantNotificationBell({
  orgSlug,
  accent,
  initialNotifications,
  initialUnreadCount,
}: Props) {
  const isMobile = useMobileSheetLayout()
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState(initialNotifications)
  const [unreadCount, setUnreadCount] = useState(initialUnreadCount)
  const [activeFeedback, setActiveFeedback] = useState<ParticipantNotification | null>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const dismissedIdsRef = useRef<Set<string>>(new Set())

  const hasBell = notifications.length > 0 || unreadCount > 0

  useEffect(() => {
    setNotifications(initialNotifications)
    setUnreadCount(initialUnreadCount)
  }, [initialNotifications, initialUnreadCount])

  useEffect(() => {
    if (!open || isMobile) return
    function onDocClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [open, isMobile])

  const syncFromServer = useCallback(() => {
    setNotifications(initialNotifications.filter((n) => !dismissedIdsRef.current.has(n.id)))
    setUnreadCount(
      initialNotifications.filter((n) => !n.read_at && !dismissedIdsRef.current.has(n.id))
        .length,
    )
  }, [initialNotifications])

  const handleMarkRead = useCallback(
    async (id: string) => {
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read_at: new Date().toISOString() } : n)),
      )
      setUnreadCount((c) => Math.max(0, c - 1))
      const result = await markParticipantNotificationRead(orgSlug, id)
      if (result?.error) syncFromServer()
    },
    [orgSlug, syncFromServer],
  )

  const handleDismiss = useCallback(
    async (id: string) => {
      dismissedIdsRef.current.add(id)
      setNotifications((prev) => {
        const dismissed = prev.find((n) => n.id === id)
        if (dismissed && !dismissed.read_at) {
          setUnreadCount((c) => Math.max(0, c - 1))
        }
        return prev.filter((n) => n.id !== id)
      })
      const result = await dismissParticipantNotification(orgSlug, id)
      if (result?.error) {
        dismissedIdsRef.current.delete(id)
        syncFromServer()
      } else {
        dismissedIdsRef.current.delete(id)
      }
    },
    [orgSlug, syncFromServer],
  )

  const handleFeedbackSubmitted = useCallback(() => {
    if (!activeFeedback) return
    setNotifications((prev) => prev.filter((n) => n.id !== activeFeedback.id))
    setUnreadCount((c) => Math.max(0, c - (activeFeedback.read_at ? 0 : 1)))
    setActiveFeedback(null)
  }, [activeFeedback])

  if (!hasBell && !activeFeedback) {
    return null
  }

  const panelContent = (
    <NotificationPanelContent
      notifications={notifications}
      unreadCount={unreadCount}
      onClose={() => setOpen(false)}
      onSelect={setActiveFeedback}
      onMarkRead={(id) => void handleMarkRead(id)}
      onDismiss={(id) => void handleDismiss(id)}
    />
  )

  const desktopPanelClassName =
    'absolute right-0 top-full z-50 mt-2 flex w-[min(100vw-2rem,22rem)] flex-col overflow-hidden rounded-xl border border-white/10 bg-zinc-950/95 shadow-xl shadow-black/40 backdrop-blur-md'

  return (
    <>
      <div ref={panelRef} className="relative">
        <button
          type="button"
          aria-label={
            unreadCount > 0 ? `${unreadCount} unread notifications` : 'Notifications'
          }
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          className="relative inline-flex min-h-[34px] min-w-[34px] items-center justify-center rounded-full border border-zinc-800 bg-zinc-900/60 text-zinc-300 transition hover:border-zinc-700 hover:bg-zinc-900"
        >
          <svg
            aria-hidden
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            className="h-4 w-4"
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

        {open && isMobile ? (
          <BottomSheet open onClose={() => setOpen(false)} variant="top" ariaLabel="Notifications">
            {panelContent}
          </BottomSheet>
        ) : null}

        {open && !isMobile ? (
          <div role="dialog" aria-label="Notifications" className={desktopPanelClassName}>
            {panelContent}
          </div>
        ) : null}
      </div>

      {activeFeedback ? (
        <SessionFeedbackSheet
          open
          onClose={() => setActiveFeedback(null)}
          orgSlug={orgSlug}
          eventId={activeFeedback.event_id}
          payload={activeFeedback.payload}
          accent={accent}
          onSubmitted={handleFeedbackSubmitted}
        />
      ) : null}
    </>
  )
}
