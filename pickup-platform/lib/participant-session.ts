import { cookies } from 'next/headers'
import {
  clearParticipantSession,
  getParticipantCookieOptions,
} from '@/lib/auth-cookies'

export const SESSION_COOKIE = 'hc_session'

export async function getSessionToken(): Promise<string | null> {
  const store = await cookies()
  return store.get(SESSION_COOKIE)?.value ?? null
}

export async function setSessionToken(token: string) {
  const store = await cookies()
  store.set(SESSION_COOKIE, token, getParticipantCookieOptions())
}

export async function clearSessionToken() {
  const store = await cookies()
  clearParticipantSession(store)
}
