import type { Metadata } from 'next'
import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { getAuthUser } from '@/lib/auth'
import { ROBOTS_PRIVATE } from '@/lib/seo'
import { LoginForm } from './login-form'

export const metadata: Metadata = {
  title: 'Sign in',
  robots: ROBOTS_PRIVATE,
}

type Props = {
  searchParams: Promise<{ next?: string }>
}

function safeNext(next: string | undefined): string {
  if (next && next.startsWith('/') && !next.startsWith('//')) {
    return next
  }
  return '/console'
}

async function RedirectIfLoggedIn({ next }: { next: string }) {
  const user = await getAuthUser()
  if (user) {
    redirect(next)
  }
  return null
}

export default async function LoginPage({ searchParams }: Props) {
  const { next } = await searchParams
  const destination = safeNext(next)

  return (
    <>
      <Suspense fallback={null}>
        <RedirectIfLoggedIn next={destination} />
      </Suspense>
      <LoginForm />
    </>
  )
}
