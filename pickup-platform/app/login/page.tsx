import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getAuthUser } from '@/lib/auth'
import { safeNextPath } from '@/lib/safe-next'
import { ROBOTS_PRIVATE } from '@/lib/seo'
import { LoginForm } from './login-form'

export const metadata: Metadata = {
  title: 'Sign in',
  robots: ROBOTS_PRIVATE,
}

type Props = {
  searchParams: Promise<{ next?: string; error?: string }>
}

export default async function LoginPage({ searchParams }: Props) {
  const { next, error } = await searchParams
  const destination = safeNextPath(next)

  const user = await getAuthUser()
  if (user) {
    redirect(destination)
  }

  return <LoginForm authError={error} nextPath={destination} />
}
