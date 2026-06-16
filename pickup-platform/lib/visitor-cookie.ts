import { cookies } from 'next/headers'
import { randomUUID } from 'crypto'

export const VISITOR_COOKIE = 'hc_visitor'

export async function getOrCreateVisitorKey(): Promise<string> {
  const store = await cookies()
  const existing = store.get(VISITOR_COOKIE)?.value
  if (existing) {
    return existing
  }

  const key = randomUUID()
  store.set(VISITOR_COOKIE, key, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 24 * 365,
    path: '/',
  })
  return key
}
