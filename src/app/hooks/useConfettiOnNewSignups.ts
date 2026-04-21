import { useEffect, useRef } from 'react'

export async function fireConfetti() {
  // Lazy-load to keep initial bundle small.
  const mod = await import('canvas-confetti')
  const confetti = mod.default

  const colors = ['#d2a34a', '#f7d58a', '#ffffff', '#60a5fa', '#34d399']

  confetti({
    particleCount: 80,
    spread: 70,
    startVelocity: 35,
    gravity: 0.9,
    origin: { x: 0.2, y: 0.7 },
    colors,
  })
  confetti({
    particleCount: 80,
    spread: 70,
    startVelocity: 35,
    gravity: 0.9,
    origin: { x: 0.8, y: 0.7 },
    colors,
  })
}

export function useConfettiOnNewSignups(args: { playDate: string; signupIds: string[] }) {
  const prevIdsRef = useRef<Set<string> | null>(null)

  useEffect(() => {
    // New date => treat the next roster as "initial load" (no confetti).
    prevIdsRef.current = null
  }, [args.playDate])

  useEffect(() => {
    const nextIds = new Set(args.signupIds)
    const prevIds = prevIdsRef.current
    prevIdsRef.current = nextIds

    // Skip initial load for a date.
    if (!prevIds) return

    let added = 0
    for (const id of nextIds) {
      if (!prevIds.has(id)) added++
    }

    if (added > 0) {
      void fireConfetti()
    }
  }, [args.signupIds])
}

