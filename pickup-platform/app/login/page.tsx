import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { LoginForm } from './login-form'

type Props = {
  searchParams: Promise<{ next?: string }>
}

function safeNext(next: string | undefined): string {
  if (next && next.startsWith('/') && !next.startsWith('//')) {
    return next
  }
  return '/console'
}

export default async function LoginPage({ searchParams }: Props) {
  const { next } = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    redirect(safeNext(next))
  }

  return <LoginForm />
}
