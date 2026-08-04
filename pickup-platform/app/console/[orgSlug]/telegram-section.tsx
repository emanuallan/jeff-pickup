'use client'

import { useState, useTransition } from 'react'
import {
  generateTelegramConnectCode,
  unlinkTelegramGroup,
  type TelegramConsoleState,
} from '../telegram-actions'
import { btnOutline, btnSecondary } from '../_components/console-ui'
import { useConsoleToast } from '../_components/console-toast'

type Props = {
  orgSlug: string
  initial: TelegramConsoleState
}

export function TelegramSection({ orgSlug, initial }: Props) {
  const toast = useConsoleToast()
  const [link, setLink] = useState(initial.link)
  const [code, setCode] = useState<string | null>(null)
  const [expiresAt, setExpiresAt] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  if (!initial.configured) {
    return (
      <p className="text-sm text-zinc-500">
        Telegram is not configured on this environment yet. Set{' '}
        <code className="text-zinc-400">TELEGRAM_BOT_TOKEN</code> (and optionally{' '}
        <code className="text-zinc-400">TELEGRAM_BOT_USERNAME</code>,{' '}
        <code className="text-zinc-400">TELEGRAM_WEBHOOK_SECRET</code>) then register the
        webhook.
      </p>
    )
  }

  function handleGenerate() {
    startTransition(async () => {
      const result = await generateTelegramConnectCode(orgSlug)
      if (result.error) {
        toast.error(result.error)
        return
      }
      setCode(result.code ?? null)
      setExpiresAt(result.expiresAt ?? null)
      toast.success('Connect code ready — expires in 30 minutes.')
    })
  }

  function handleUnlink() {
    if (!confirm('Unlink this Telegram group? Players will need a new connect later.')) {
      return
    }
    startTransition(async () => {
      const result = await unlinkTelegramGroup(orgSlug)
      if (result.error) {
        toast.error(result.error)
        return
      }
      setLink(null)
      setCode(null)
      setExpiresAt(null)
      toast.success('Telegram group unlinked.')
    })
  }

  const botMention = initial.botUsername ? `@${initial.botUsername}` : 'your Organizr bot'

  if (link) {
    return (
      <div className="space-y-4">
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3 text-sm text-zinc-200">
          <p className="font-medium text-emerald-300">Linked</p>
          <p className="mt-1 text-zinc-400">
            Chat ID <span className="font-mono text-zinc-300">{link.telegram_chat_id}</span>
            {link.chat_title ? (
              <>
                {' '}
                · {link.chat_title}
              </>
            ) : null}
          </p>
          <p className="mt-2 text-xs text-zinc-500">
            Players use /link then /in /out /maybe. Admins can /announce the next session.
          </p>
        </div>
        <button
          type="button"
          disabled={pending}
          onClick={handleUnlink}
          className={btnOutline}
        >
          Unlink Telegram group
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <ol className="list-decimal space-y-2 pl-5 text-sm text-zinc-400">
        <li>Add {botMention} to your Telegram group.</li>
        <li>Generate a connect code below.</li>
        <li>Copy the message and paste it in the group as an admin.</li>
      </ol>

      {code ? (
        <div className="space-y-3 rounded-xl border border-indigo-500/25 bg-indigo-500/5 px-4 py-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-indigo-300">
              Paste this in your Telegram group
            </p>
            <p className="mt-2 font-mono text-xl tracking-wide text-zinc-50">
              /connect {code}
            </p>
            {expiresAt ? (
              <p className="mt-1 text-xs text-zinc-500">
                Expires {new Date(expiresAt).toLocaleString()}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={() => {
              void navigator.clipboard.writeText(`/connect ${code}`).then(
                () => toast.success('Copied — paste it in your Telegram group.'),
                () => toast.error('Could not copy. Select the text and copy manually.'),
              )
            }}
            className={btnSecondary}
          >
            Copy message
          </button>
        </div>
      ) : null}

      <button
        type="button"
        disabled={pending}
        onClick={handleGenerate}
        className={btnSecondary}
      >
        {pending ? 'Working…' : code ? 'Generate new code' : 'Generate connect code'}
      </button>
    </div>
  )
}
