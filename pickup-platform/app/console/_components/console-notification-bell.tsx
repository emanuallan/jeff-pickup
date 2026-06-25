"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { OrganizerNotification } from "@/lib/organizer-notifications";
import {
	formatNotificationTime,
	formatOrganizerNotificationCopy,
	organizerNotificationHref,
} from "@/lib/organizer-notifications";
import {
	dismissAllOrganizerNotifications,
	dismissOrganizerNotification,
	markAllOrganizerNotificationsRead,
	markOrganizerNotificationRead,
} from "../notification-actions";

type Props = {
	initialNotifications: OrganizerNotification[];
	initialUnreadCount: number;
};

function orgSlugFromPathname(pathname: string): string | null {
	const match = pathname.match(/^\/console\/([^/]+)/);
	const slug = match?.[1];
	if (!slug || slug === "new") return null;
	return slug;
}

function kindBadge(kind: OrganizerNotification["kind"]): {
	label: string;
	className: string;
} {
	switch (kind) {
		case "new_signup_batch":
			return {
				label: "New",
				className: "bg-emerald-500/15 text-emerald-300 ring-emerald-500/30",
			};
		case "returning_signup_batch":
			return {
				label: "Returning",
				className: "bg-indigo-500/15 text-indigo-300 ring-indigo-500/30",
			};
		case "unregister_immediate":
			return {
				label: "Soon",
				className: "bg-amber-500/15 text-amber-300 ring-amber-500/30",
			};
		case "unregister_batch":
			return {
				label: "Left",
				className: "bg-zinc-500/15 text-zinc-300 ring-zinc-500/30",
			};
	}
}

export function ConsoleNotificationBell({
	initialNotifications,
	initialUnreadCount,
}: Props) {
	const pathname = usePathname();
	const orgSlug = orgSlugFromPathname(pathname);

	const scopedFromServer = useMemo(
		() =>
			orgSlug
				? initialNotifications.filter((n) => n.org_slug === orgSlug)
				: initialNotifications,
		[orgSlug, initialNotifications],
	);

	const scopedUnreadFromServer = useMemo(
		() =>
			orgSlug
				? scopedFromServer.filter((n) => !n.read_at).length
				: initialUnreadCount,
		[orgSlug, scopedFromServer, initialUnreadCount],
	);

	const [open, setOpen] = useState(false);
	const [notifications, setNotifications] = useState(scopedFromServer);
	const [unreadCount, setUnreadCount] = useState(scopedUnreadFromServer);
	const panelRef = useRef<HTMLDivElement>(null);

	const scopedOrgId = useMemo(
		() =>
			orgSlug
				? (notifications.find((n) => n.org_slug === orgSlug)?.org_id ?? null)
				: null,
		[orgSlug, notifications],
	);

	useEffect(() => {
		setNotifications(scopedFromServer);
		setUnreadCount(scopedUnreadFromServer);
	}, [scopedFromServer, scopedUnreadFromServer]);

	useEffect(() => {
		if (!open) return;
		const prev = document.body.style.overflow;
		document.body.style.overflow = "hidden";
		return () => {
			document.body.style.overflow = prev;
		};
	}, [open]);

	useEffect(() => {
		function onDocClick(e: MouseEvent) {
			if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
				setOpen(false);
			}
		}
		if (open) {
			document.addEventListener("mousedown", onDocClick);
		}
		return () => document.removeEventListener("mousedown", onDocClick);
	}, [open]);

	const handleMarkRead = useCallback(async (id: string) => {
		setNotifications((prev) =>
			prev.map((n) =>
				n.id === id ? { ...n, read_at: new Date().toISOString() } : n,
			),
		);
		setUnreadCount((c) => Math.max(0, c - 1));
		await markOrganizerNotificationRead(id);
	}, []);

	const handleMarkAllRead = useCallback(async () => {
		setNotifications((prev) =>
			prev.map((n) => ({
				...n,
				read_at: n.read_at ?? new Date().toISOString(),
			})),
		);
		setUnreadCount(0);
		await markAllOrganizerNotificationsRead(scopedOrgId);
	}, [scopedOrgId]);

	const handleDismiss = useCallback(async (id: string) => {
		setNotifications((prev) => {
			const dismissed = prev.find((n) => n.id === id);
			if (dismissed && !dismissed.read_at) {
				setUnreadCount((c) => Math.max(0, c - 1));
			}
			return prev.filter((n) => n.id !== id);
		});
		await dismissOrganizerNotification(id);
	}, []);

	const handleDismissAll = useCallback(async () => {
		setNotifications([]);
		setUnreadCount(0);
		await dismissAllOrganizerNotifications(scopedOrgId);
	}, [scopedOrgId]);

	const showOrgName = !orgSlug;

	const panelClassName =
		"fixed inset-x-0 top-0 z-50 flex max-h-[min(85dvh,28rem)] w-full flex-col overflow-hidden rounded-b-2xl border border-t-0 border-white/10 bg-zinc-950/95 shadow-xl shadow-black/40 backdrop-blur-md animate-[notification-sheet-in_220ms_ease-out] pt-[env(safe-area-inset-top,0px)] sm:absolute sm:inset-x-auto sm:right-0 sm:top-full sm:mt-2 sm:max-h-none sm:w-[min(100vw-2rem,22rem)] sm:animate-none sm:rounded-xl sm:border sm:pt-0";

	return (
		<div ref={panelRef} className="relative">
			<button
				type="button"
				aria-label={
					unreadCount > 0
						? `${unreadCount} unread notifications`
						: "Notifications"
				}
				aria-expanded={open}
				onClick={() => setOpen((v) => !v)}
				className="relative inline-flex min-h-10 min-w-10 items-center justify-center rounded-lg border border-white/10 text-zinc-300 transition hover:border-white/20 hover:bg-white/5"
			>
				<svg
					aria-hidden
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					strokeWidth="1.75"
					className="h-5 w-5"
				>
					<path
						strokeLinecap="round"
						strokeLinejoin="round"
						d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0"
					/>
				</svg>
				{unreadCount > 0 ? (
					<span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-indigo-600 px-1 text-[10px] font-bold text-white">
						{unreadCount > 9 ? "9+" : unreadCount}
					</span>
				) : null}
			</button>

			{open ? (
				<>
					<div
						aria-hidden
						className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm sm:hidden"
						onClick={() => setOpen(false)}
					/>
					<div role="dialog" aria-label="Notifications" className={panelClassName}>
						<div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
							<div className="min-w-0">
								<p className="text-sm font-semibold text-zinc-100">Notifications</p>
								<p className="text-xs text-zinc-500">Roster updates · next 14 days</p>
							</div>
							{notifications.length > 0 ? (
								<div className="flex shrink-0 items-center gap-3">
									{unreadCount > 0 ? (
										<button
											type="button"
											onClick={() => void handleMarkAllRead()}
											className="text-xs font-medium text-zinc-400 transition hover:text-zinc-200"
										>
											Mark read
										</button>
									) : null}
									<button
										type="button"
										onClick={() => void handleDismissAll()}
										className="text-xs font-medium text-indigo-300 transition hover:text-indigo-200"
									>
										Clear all
									</button>
								</div>
							) : null}
						</div>

						{notifications.length === 0 ? (
							<p className="px-4 py-8 text-center text-sm text-zinc-500">
								No notifications yet.
							</p>
						) : (
							<ul className="min-h-0 flex-1 overflow-y-auto sm:max-h-80">
								{notifications.map((n) => {
									const { title, detail } = formatOrganizerNotificationCopy(n);
									const badge = kindBadge(n.kind);
									const href = organizerNotificationHref(n);
									const isUnread = !n.read_at;
									const isActive = pathname === href;
									const when = formatNotificationTime(n.created_at);
									const context = showOrgName ? `${n.org_name} · ${detail}` : detail;
									const subtitle = `${context} · ${when}`;

									return (
										<li
											key={n.id}
											className="flex border-b border-white/5 last:border-0"
										>
											<Link
												href={href}
												onClick={() => {
													if (isUnread) void handleMarkRead(n.id);
													setOpen(false);
												}}
												className={`min-w-0 flex-1 px-4 py-3 transition hover:bg-white/5 ${
													isActive ? "bg-indigo-500/5" : ""
												} ${isUnread ? "bg-white/2" : ""}`}
											>
												<div className="flex items-start gap-2">
													<span
														className={`mt-0.5 shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ring-1 ring-inset ${badge.className}`}
													>
														{badge.label}
													</span>
													<div className="min-w-0 flex-1">
														<p className="text-sm leading-snug text-zinc-100">{title}</p>
														<p className="mt-0.5 truncate text-xs text-zinc-400">{subtitle}</p>
													</div>
													{isUnread ? (
														<span
															aria-hidden
															className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-indigo-500"
														/>
													) : null}
												</div>
											</Link>
											<button
												type="button"
												aria-label="Clear notification"
												onClick={() => void handleDismiss(n.id)}
												className="shrink-0 px-3 py-3 text-zinc-500 transition hover:bg-white/5 hover:text-zinc-300"
											>
												<span aria-hidden className="text-lg leading-none">
													×
												</span>
											</button>
										</li>
									);
								})}
							</ul>
						)}

						<div className="border-t border-white/5 px-4 py-2 sm:hidden">
							<button
								type="button"
								onClick={() => setOpen(false)}
								className="flex min-h-10 w-full items-center justify-center rounded-lg text-sm font-medium text-zinc-400 transition hover:bg-white/5 hover:text-zinc-200"
							>
								Close
							</button>
						</div>
					</div>
				</>
			) : null}
		</div>
	);
}
