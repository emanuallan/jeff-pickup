import type { ArrivalStatus } from '@/lib/arrival-status'
import type { RosterEntry, SignupListStatus } from '@/lib/signups'

export const LIVE_SESSION_POLL_MS = 20_000

export type LiveSessionPayload = {
  headcount: number
  status?: string
  roster: RosterEntry[]
  waitlist: RosterEntry[]
}

const ARRIVAL_STATUSES = new Set<ArrivalStatus>([
  'confirmed',
  'on_my_way',
  'running_late',
  'in_traffic',
  'maybe',
])

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function parseArrivalStatus(value: unknown): ArrivalStatus {
  return typeof value === 'string' && ARRIVAL_STATUSES.has(value as ArrivalStatus)
    ? (value as ArrivalStatus)
    : 'confirmed'
}

function parseRosterEntry(value: unknown, listStatus?: SignupListStatus): RosterEntry | null {
  if (!isRecord(value)) return null
  if (typeof value.id !== 'string') return null
  if (typeof value.event_id !== 'string') return null
  if (typeof value.participant_id !== 'string') return null
  if (typeof value.display_name !== 'string') return null
  if (typeof value.guest_count !== 'number') return null
  if (typeof value.created_at !== 'string') return null

  return {
    id: value.id,
    event_id: value.event_id,
    participant_id: value.participant_id,
    display_name: value.display_name,
    guest_count: value.guest_count,
    arrival_status: parseArrivalStatus(value.arrival_status),
    created_at: value.created_at,
    list_status: listStatus ?? (value.list_status === 'waitlisted' ? 'waitlisted' : 'confirmed'),
  }
}

export function parseLiveSessionPayload(data: unknown): LiveSessionPayload | null {
  if (!isRecord(data)) return null
  if (typeof data.headcount !== 'number') return null

  const rosterRaw = Array.isArray(data.roster) ? data.roster : []
  const waitlistRaw = Array.isArray(data.waitlist) ? data.waitlist : []

  const roster = rosterRaw
    .map((entry) => parseRosterEntry(entry, 'confirmed'))
    .filter((entry): entry is RosterEntry => entry != null)

  const waitlist = waitlistRaw
    .map((entry) => parseRosterEntry(entry, 'waitlisted'))
    .filter((entry): entry is RosterEntry => entry != null)

  return {
    headcount: data.headcount,
    status: typeof data.status === 'string' ? data.status : undefined,
    roster,
    waitlist,
  }
}

export function liveSessionPollKey(orgSlug: string, eventRef: string): string {
  return `${orgSlug}:${eventRef}`
}

type PollListeners = Set<(payload: LiveSessionPayload) => void>

type PollController = {
  listeners: PollListeners
  intervalId: ReturnType<typeof setInterval> | null
  inFlight: boolean
  orgSlug: string
  eventRef: string
}

const controllers = new Map<string, PollController>()

async function fetchLiveSession(
  orgSlug: string,
  eventRef: string,
): Promise<LiveSessionPayload | null> {
  const res = await fetch(`/api/org/${orgSlug}/cal/${eventRef}/headcount`)
  if (!res.ok) return null
  const data: unknown = await res.json()
  return parseLiveSessionPayload(data)
}

async function pollController(key: string) {
  const controller = controllers.get(key)
  if (!controller || controller.inFlight) return
  if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return

  controller.inFlight = true
  try {
    const payload = await fetchLiveSession(controller.orgSlug, controller.eventRef)
    if (!payload) return
    const current = controllers.get(key)
    if (!current || current !== controller) return
    for (const listener of [...current.listeners]) {
      listener(payload)
    }
  } catch {
    // Best-effort polling — ignore transient network errors.
  } finally {
    const current = controllers.get(key)
    if (current === controller) {
      controller.inFlight = false
    }
  }
}

function ensureController(orgSlug: string, eventRef: string): PollController {
  const key = liveSessionPollKey(orgSlug, eventRef)
  const existing = controllers.get(key)
  if (existing) return existing

  const controller: PollController = {
    listeners: new Set(),
    intervalId: null,
    inFlight: false,
    orgSlug,
    eventRef,
  }
  controllers.set(key, controller)
  return controller
}

function startController(controller: PollController) {
  if (controller.intervalId != null) return
  const key = liveSessionPollKey(controller.orgSlug, controller.eventRef)

  void pollController(key)
  controller.intervalId = setInterval(() => {
    void pollController(key)
  }, LIVE_SESSION_POLL_MS)

  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', onVisibilityChange)
  }
}

function stopController(key: string, controller: PollController) {
  if (controller.intervalId != null) {
    clearInterval(controller.intervalId)
    controller.intervalId = null
  }
  controllers.delete(key)

  if (controllers.size === 0 && typeof document !== 'undefined') {
    document.removeEventListener('visibilitychange', onVisibilityChange)
  }
}

function onVisibilityChange() {
  if (typeof document === 'undefined' || document.visibilityState !== 'visible') return
  for (const key of controllers.keys()) {
    void pollController(key)
  }
}

/**
 * Shared live-session poll so headcount + roster consumers share one request.
 * Returns an unsubscribe function.
 */
export function subscribeLiveSessionPoll(
  orgSlug: string,
  eventRef: string,
  listener: (payload: LiveSessionPayload) => void,
): () => void {
  const key = liveSessionPollKey(orgSlug, eventRef)
  const controller = ensureController(orgSlug, eventRef)
  controller.listeners.add(listener)
  startController(controller)

  return () => {
    const current = controllers.get(key)
    if (!current) return
    current.listeners.delete(listener)
    if (current.listeners.size === 0) {
      stopController(key, current)
    }
  }
}

/** Test helper — clears shared poll state between cases. */
export function resetLiveSessionPollForTests() {
  for (const [key, controller] of controllers) {
    if (controller.intervalId != null) {
      clearInterval(controller.intervalId)
    }
    controllers.delete(key)
  }
  if (typeof document !== 'undefined') {
    document.removeEventListener('visibilitychange', onVisibilityChange)
  }
}
