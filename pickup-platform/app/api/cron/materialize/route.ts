import { materializeEvents } from '@/lib/materializer'

/**
 * Vercel Cron hits this daily to materialize events for all orgs.
 * Protect with CRON_SECRET — set the same value in Vercel env vars.
 *
 * TODO: add vercel.json cron schedule when deploying
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET
  const auth = request.headers.get('authorization')

  if (!secret || auth !== `Bearer ${secret}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const count = await materializeEvents()
    return Response.json({ ok: true, count })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Materialization failed'
    return Response.json({ error: message }, { status: 500 })
  }
}
