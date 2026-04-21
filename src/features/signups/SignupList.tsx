import type { Signup } from "./types";

export function SignupList(props: {
	labels: {
		players: string;
		total: string;
		loading: string;
		emptyList: string;
		unregister: string;
		unregisterHint: string;
		goal: string;
		walkOnsHint: string;
		guestsTag: string;
		emoji: string;
		poke: string;
		wave: string;
		newPlayerBadge: string;
		newPlayerBadgeTitle: string;
	};
	signups: Signup[];
	newPlayerNameKeys: ReadonlySet<string>;
	viewerIsNew?: boolean;
	loading?: boolean;
	mySignupId?: string;
	myDeleteToken?: string;
	canUnregister?: boolean;
	onUnregister?: () => void;
	onPressEmoji?: () => void;
	onPoke?: (toSignupId: string, toPlayerName: string, kind: "poke" | "wave") => void;
	goal?: number;
}) {
	const goal = props.goal ?? 0;
	const headcount = props.signups.reduce(
		(sum, s) => sum + 1 + Math.max(0, s.guest_count ?? 0),
		0,
	);
	const progressPct =
		goal > 0
			? Math.min(100, Math.round((headcount / goal) * 100))
			: 0;

	return (
		<section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
			<div className="flex items-baseline justify-between gap-3">
				<div className="text-sm font-semibold">{props.labels.players}</div>
				<div className="text-xs text-[--muted]">
					{headcount} {props.labels.total}
				</div>
			</div>

			<div className="mt-3">
				{props.loading ? (
					<div className="text-sm text-[--muted]">{props.labels.loading}</div>
				) : props.signups.length === 0 ? (
					<div className="text-sm text-[--muted]">{props.labels.emptyList}</div>
				) : (
					<ol className="space-y-2">
						{props.signups.map((s, idx) => {
							const isMe = props.mySignupId === s.id;
							const guests = Math.max(0, s.guest_count ?? 0);
							const nameKey = s.player_name.trim().toLowerCase();
							const showNewBadge = props.newPlayerNameKeys.has(nameKey);
							const actionKind: "poke" | "wave" =
								showNewBadge || Boolean(props.viewerIsNew) ? "wave" : "poke";
							return (
								<li
									key={s.id}
									className={
										isMe
											? "relative flex items-center justify-between rounded-xl border border-[var(--gold)]/60 bg-gradient-to-r from-[var(--gold)]/20 via-white/5 to-emerald-400/10 px-3 py-2 shadow-[0_0_0_1px_rgba(210,163,74,0.18),0_0_24px_rgba(210,163,74,0.18)]"
											: "flex items-center justify-between rounded-xl border border-[var(--border)] bg-black/20 px-3 py-2"
									}
								>
									<div className="min-w-0">
										<div className="truncate text-sm font-medium">
											{idx + 1}.{" "}
											{s.emoji?.trim() ? <span className="mr-1">{s.emoji.trim()}</span> : null}
											{s.player_name}
											{guests > 0 ? (
												<span className="ml-2 text-xs font-semibold text-[var(--gold)]">
													{props.labels.guestsTag.replace('{n}', String(guests))}
												</span>
											) : null}
											{showNewBadge ? (
												<span
													className="ml-2 inline-flex items-center rounded-full border border-emerald-400/35 bg-emerald-500/15 px-2 py-0.5 align-middle text-[10px] font-semibold uppercase tracking-wide text-emerald-100/90"
													title={props.labels.newPlayerBadgeTitle}
												>
													{props.labels.newPlayerBadge}
												</span>
											) : null}
										</div>
									</div>
									<div className="ml-3 flex items-center gap-2">
										{isMe && props.myDeleteToken ? (
											<button
												type="button"
												className="rounded-full border border-[var(--border)] bg-black/30 px-2 py-1 text-xs font-semibold text-white/85 hover:bg-white/10"
												onClick={props.onPressEmoji}
											>
												{props.labels.emoji}
											</button>
										) : null}

										{!isMe && props.mySignupId && props.myDeleteToken && props.onPoke ? (
											<button
												type="button"
												className={
													actionKind === "wave"
														? "rounded-full border border-cyan-400/55 bg-cyan-500/15 px-2 py-1 text-xs font-semibold text-cyan-50 shadow-[0_0_14px_rgba(34,211,238,0.35)] hover:bg-cyan-400/20 hover:shadow-[0_0_20px_rgba(34,211,238,0.45)]"
														: "rounded-full border border-[var(--border)] bg-black/30 px-2 py-1 text-xs font-semibold text-white/85 hover:bg-white/10"
												}
												onClick={() => props.onPoke?.(s.id, s.player_name, actionKind)}
											>
												{actionKind === "wave" ? props.labels.wave : props.labels.poke}
											</button>
										) : null}

										{isMe ? (
											<button
												type="button"
												aria-label="Unregister"
												title={
													props.canUnregister
														? props.labels.unregister
														: props.labels.unregisterHint
												}
												disabled={!props.canUnregister}
												onClick={props.onUnregister}
												className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[var(--border)] bg-black/30 text-white/80 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
											>
												<span className="text-lg leading-none">×</span>
											</button>
										) : null}
									</div>
								</li>
							);
						})}
					</ol>
				)}
			</div>

			{goal > 0 ? (
				<div className="mt-8">
					<div className="flex items-baseline justify-between gap-3 text-xs">
						<div className="text-[--muted]">
							{headcount} / {goal} {props.labels.goal}
						</div>
						<div className="text-[--muted]">{progressPct}%</div>
					</div>
					<div className="mt-2 h-2 w-full rounded-full bg-white/10">
						<div
							className="h-2 rounded-full bg-[var(--gold)]"
							style={{ width: `${progressPct}%` }}
						/>
					</div>
					<div className="mt-2 text-xs text-[--muted]">{props.labels.walkOnsHint}</div>
				</div>
			) : null}
		</section>
	);
}
