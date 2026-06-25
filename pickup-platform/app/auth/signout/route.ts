import { NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@/lib/supabase/route-handler'

export async function POST(request: Request) {
  // 303 forces GET on the next request — default 307 would re-POST to / and break the page.
  const response = NextResponse.redirect(new URL('/', request.url), { status: 303 })
  const supabase = await createRouteHandlerClient(response)
  await supabase.auth.signOut()
  return response
}
