'use client'

import { useState } from 'react'
import { materializeOrgEvents } from '../actions'
import { btnSecondary } from '../_components/console-ui'
import { useConsoleToast } from '../_components/console-toast'

export function MaterializeButton({ orgSlug }: { orgSlug: string }) {
  const toast = useConsoleToast()
  const [loading, setLoading] = useState(false)

  async function handleClick() {
    setLoading(true)
    const result = await materializeOrgEvents(orgSlug)
    setLoading(false)
    if (result?.error) {
      if (result.error.includes('Add SUPABASE')) {
        toast.warning(result.error)
      } else {
        toast.error(result.error)
      }
    } else if (result?.ok) {
      toast.success(`Created ${result.count ?? 0} new session(s).`)
    }
  }

  return (
    <button type="button" onClick={handleClick} disabled={loading} className={btnSecondary}>
      {loading ? 'Refreshing…' : 'Refresh sessions'}
    </button>
  )
}
