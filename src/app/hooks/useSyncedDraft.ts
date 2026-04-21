import { useEffect, useState } from 'react'

export function useSyncedDraft<T>(args: { value: T; disabled?: boolean }) {
  const [draft, setDraft] = useState<T>(args.value)

  useEffect(() => {
    if (args.disabled) return
    setDraft(args.value)
  }, [args.disabled, args.value])

  return [draft, setDraft] as const
}

