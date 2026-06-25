import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  await supabase.auth.signOut()

  // 303 forces GET on the next request — default 307 would re-POST to / and break the page.
  return NextResponse.redirect(new URL('/', request.url), { status: 303 })
}
