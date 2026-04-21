import { SignupForm } from '../../signups/SignupForm'
import { SignupList } from '../../signups/SignupList'
import type { Signup } from '../../signups/types'

export function SignupSection(props: {
  labels: {
    joinTheList: string
    date: string
    yourName: string
    namePlaceholder: string
    enterName: string
    keepUnder40: string
    joinTodaysList: string
    joinList: string
    youAreIn: string

    players: string
    total: string
    loading: string
    emptyList: string
    unregister: string
    unregisterHint: string
    goal: string
  }
  value: { playDate: string; playerName: string }
  onChange: (next: { playDate: string; playerName: string }) => void
  disabled?: boolean
  submitting?: boolean
  joined?: boolean
  error?: string
  signups: Signup[]
  loading?: boolean
  goal?: number
  mySignupId?: string
  canUnregister?: boolean
  onSubmit: () => void
  onUnregister?: () => void
}) {
  return (
    <>
      <SignupForm
        labels={{
          joinTheList: props.labels.joinTheList,
          date: props.labels.date,
          yourName: props.labels.yourName,
          namePlaceholder: props.labels.namePlaceholder,
          enterName: props.labels.enterName,
          keepUnder40: props.labels.keepUnder40,
          joinTodaysList: props.labels.joinTodaysList,
          joinList: props.labels.joinList,
          youAreIn: props.labels.youAreIn,
        }}
        value={props.value}
        onChange={props.onChange}
        disabled={props.disabled || props.submitting}
        joined={props.joined}
        error={props.error}
        onSubmit={props.onSubmit}
      />

      <SignupList
        labels={{
          players: props.labels.players,
          total: props.labels.total,
          loading: props.labels.loading,
          emptyList: props.labels.emptyList,
          unregister: props.labels.unregister,
          unregisterHint: props.labels.unregisterHint,
          goal: props.labels.goal,
        }}
        signups={props.signups}
        loading={props.loading}
        goal={props.goal}
        mySignupId={props.mySignupId}
        canUnregister={props.canUnregister}
        onUnregister={props.onUnregister}
      />
    </>
  )
}

