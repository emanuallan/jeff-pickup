import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getPublicOrgBySlug } from '@/lib/public-data'
import { buildOrgMetadata } from '@/lib/og-metadata'
import { ROBOTS_PRIVATE } from '@/lib/seo'
import { loadPairPageState } from './actions'
import { TelegramPairForm } from './pair-form'

type Props = {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ token?: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const org = await getPublicOrgBySlug(slug)

  if (!org || org.status !== 'active') {
    return { robots: ROBOTS_PRIVATE }
  }

  const meta = buildOrgMetadata({
    slug,
    path: '/telegram/pair',
    imagePath: '/telegram/pair/og-image',
    title: `You're almost there · ${org.name}`,
    description: `Link your Telegram account to ${org.name} on Organizr.`,
    siteName: org.name,
    imageAlt: `You're almost there — link Telegram to ${org.name}`,
  })

  return {
    ...meta,
    robots: ROBOTS_PRIVATE,
  }
}

export default async function TelegramPairPage({ params, searchParams }: Props) {
  const { slug } = await params
  const { token } = await searchParams

  const org = await getPublicOrgBySlug(slug)
  if (!org) notFound()

  if (!token?.trim()) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-5 py-10">
        <h1 className="text-xl font-semibold text-zinc-50">Missing pairing link</h1>
        <p className="mt-2 text-sm text-zinc-400">
          Open the link from the Organizr Telegram bot (/link in your group).
        </p>
      </main>
    )
  }

  const state = await loadPairPageState(slug, token.trim())

  if (state.status !== 'ready') {
    return (
      <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-5 py-10">
        <h1 className="text-xl font-semibold text-zinc-50">Can&apos;t pair</h1>
        <p className="mt-2 text-sm text-zinc-400">
          {state.error ?? 'This pairing link is not valid.'}
        </p>
      </main>
    )
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-5 py-10">
      <TelegramPairForm
        orgSlug={slug}
        token={token.trim()}
        orgName={state.orgName ?? org.name}
        sessionDisplayName={state.sessionDisplayName ?? null}
        telegramUsername={state.telegramUsername ?? null}
      />
    </main>
  )
}
