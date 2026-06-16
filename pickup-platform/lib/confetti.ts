export async function fireConfetti(accent?: string) {
  // Lazy-load to keep the initial bundle small.
  const mod = await import('canvas-confetti')
  const confetti = mod.default

  const colors = [accent ?? '#d2a34a', '#f7d58a', '#ffffff', '#60a5fa', '#34d399']

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
