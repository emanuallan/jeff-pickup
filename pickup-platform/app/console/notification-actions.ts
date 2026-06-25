"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function markOrganizerNotificationRead(notificationId: string) {
	const supabase = await createClient();
	await supabase.rpc("mark_organizer_notification_read", {
		p_notification_id: notificationId,
	});
	revalidatePath("/console", "layout");
}

export async function markAllOrganizerNotificationsRead(orgId?: string | null) {
	const supabase = await createClient();
	await supabase.rpc("mark_all_organizer_notifications_read", {
		p_org_id: orgId ?? null,
	});
	revalidatePath("/console", "layout");
}

export async function dismissOrganizerNotification(notificationId: string) {
	const supabase = await createClient();
	await supabase.rpc("dismiss_organizer_notification", {
		p_notification_id: notificationId,
	});
	revalidatePath("/console", "layout");
}

export async function dismissAllOrganizerNotifications(orgId?: string | null) {
	const supabase = await createClient();
	await supabase.rpc("dismiss_all_organizer_notifications", {
		p_org_id: orgId ?? null,
	});
	revalidatePath("/console", "layout");
}
