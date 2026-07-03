import { redirect } from 'next/navigation'

export default function HiddenLeaderboardRedirect() {
  redirect('/hidden?tab=leaderboard')
}
