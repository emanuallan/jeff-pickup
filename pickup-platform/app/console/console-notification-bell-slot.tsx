import {
  countUnreadOrganizerNotifications,
  getOrganizerNotifications,
} from '@/lib/organizer-notifications.server'
import { ConsoleNotificationBell } from './_components/console-notification-bell'

export async function ConsoleNotificationBellSlot() {
  const [notifications, unreadCount] = await Promise.all([
    getOrganizerNotifications(null),
    countUnreadOrganizerNotifications(null),
  ])

  return (
    <ConsoleNotificationBell
      initialNotifications={notifications}
      initialUnreadCount={unreadCount}
    />
  )
}
