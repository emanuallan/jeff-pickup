import { getOrganizerNotificationInbox } from '@/lib/organizer-notifications.server'
import { ConsoleNotificationBell } from './_components/console-notification-bell'

export async function ConsoleNotificationBellSlot() {
  const { notifications, unreadCount } = await getOrganizerNotificationInbox(null)

  return (
    <ConsoleNotificationBell
      initialNotifications={notifications}
      initialUnreadCount={unreadCount}
    />
  )
}
