export type PageViewsDetail = {
  days: { label: string; viewCount: number }[]
  repeatViews: number
  avgViewsPerVisitor: number | null
}

export type SignupFunnelDetail = {
  rejoinEvents: number
  rejoinPeople: number
  repeatPageLoads: number
  conversionNote: string | null
}

export type AllTimeSignupPerson = {
  participantId: string
  displayName: string
  firstName: string
  lastName: string
  phone: string
  firstJoinedAt: string
  status: 'on_roster' | 'left'
}

export type ArrivalStatusRow = {
  status: string
  emoji: string
  label: string
  signupCount: number
  headcount: number
}

export type GuestCarrier = {
  displayName: string
  firstName: string
  lastName: string
  guestCount: number
}

export type CapacityDetail = {
  spotsRemaining: number
  isFull: boolean
  isOverCapacity: boolean
  minPlayers: number | null
  minMet: boolean | null
  needForMin: number | null
}

export type SignupTimelineEvent = {
  action: 'joined' | 'left'
  displayName: string
  at: string
}

export type AnalyticsDetailMetric =
  | 'page-views'
  | 'signup-funnel'
  | 'all-time-signups'
  | 'arrival-status'
  | 'guest-carriers'
  | 'capacity'
  | 'signup-timeline'
