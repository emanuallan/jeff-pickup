import { useEffect, useState } from 'react'

export function useLocalStorageState<T>(args: {
  load: () => T
  save: (value: T) => void
}) {
  const [value, setValue] = useState<T>(() => args.load())

  useEffect(() => {
    args.save(value)
  }, [args, value])

  return [value, setValue] as const
}

