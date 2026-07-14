/** Sponsorship console onboarding is done once Stripe can charge, a tier exists, and the offer is on. */
export function isSponsorshipSetupComplete(args: {
  stripeReady: boolean
  activeTierCount: number
  sponsorshipsEnabled: boolean
}): boolean {
  return args.stripeReady && args.activeTierCount > 0 && args.sponsorshipsEnabled
}

export function sponsorshipSetupSearch(query: Record<string, string | undefined>): string {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(query)) {
    if (value) params.set(key, value)
  }
  const serialized = params.toString()
  return serialized ? `?${serialized}` : ''
}
