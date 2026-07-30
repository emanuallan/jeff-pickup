import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { ROBOTS_PRIVATE } from '@/lib/seo'

export const metadata: Metadata = {
  title: 'My groups',
  robots: ROBOTS_PRIVATE,
}

/** Participant account home was removed with auth pairing — soft sessions are org-local. */
export default function MePage() {
  redirect('/')
}
