/** Console onboarding is done once there is a location and at least one session source. */
export function isOrgConsoleSetupComplete(args: {
  locationCount: number
  scheduleCount: number
  upcomingSessionCount: number
}): boolean {
  return (
    args.locationCount > 0 &&
    (args.scheduleCount > 0 || args.upcomingSessionCount > 0)
  )
}
