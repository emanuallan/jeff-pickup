import { NextResponse, type NextRequest } from 'next/server'
import { isCompleteOtp, normalizeLoginEmail, normalizeOtpInput } from '@/lib/login-otp'
import { mapOtpAuthError } from '@/lib/login-errors'
import { safeNextPath } from '@/lib/safe-next'
import { createRouteHandlerClient } from '@/lib/supabase/route-handler'

type Body = {
  email?: string
  token?: string
  next?: string
}

export async function POST(request: NextRequest) {
  let body: Body

  try {
    body = (await request.json()) as Body
  } catch {
    return NextResponse.json({ message: 'Invalid request.' }, { status: 400 })
  }

  const email = normalizeLoginEmail(body.email ?? '')
  const token = normalizeOtpInput(body.token ?? '')
  const nextPath = safeNextPath(body.next)

  if (!email || !isCompleteOtp(token)) {
    return NextResponse.json({ message: 'Enter the full 6-digit code.' }, { status: 400 })
  }

  const response = NextResponse.json({ ok: true, next: nextPath })
  const supabase = await createRouteHandlerClient(response)
  const { error } = await supabase.auth.verifyOtp({
    email,
    token,
    type: 'email',
  })

  if (error) {
    return NextResponse.json(
      { message: mapOtpAuthError(error.message) },
      { status: 400 },
    )
  }

  return response
}
