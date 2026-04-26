import { useState } from "react";
import type { Signup } from "./types";

export function SignupList(props: {
	labels: {
		players: string;
		registered: string;
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
		streakLabel: string;
		streakTitle: string;
		milestoneTitle: string;
		auraShort: string;
		oneMegPerDay: string;
	};
	signups: Signup[];
	auraByNameKey?: Record<string, number | undefined>;
	disabledPokeToSignupIds?: ReadonlySet<string>;
	newPlayerNameKeys: ReadonlySet<string>;
	viewerIsNew?: boolean;
	loading?: boolean;
	mySignupId?: string;
	myDeleteToken?: string;
	gameCountsByNameKey?: Record<string, number>;
	weeklyStreaksByNameKey?: Record<
		string,
		{ currentStreakWeeks: number; bestStreakWeeks: number }
	>;
	canUnregister?: boolean;
	onUnregister?: () => void;
	onPressEmoji?: () => void;
	onPoke?: (toSignupId: string, toPlayerName: string, kind: "poke" | "wave") => void;
	goal?: number;
}) {
	const [auraTipForId, setAuraTipForId] = useState<string | null>(null);
	const goal = props.goal ?? 0;
	const headcount = props.signups.reduce(
		(sum, s) => sum + 1 + Math.max(0, s.guest_count ?? 0),
		0,
	);
	const topAura = props.auraByNameKey
		? props.signups.reduce((mx, s) => {
				const k = s.player_name.trim().toLowerCase();
				const a = props.auraByNameKey?.[k];
				return typeof a === "number" && Number.isFinite(a) ? Math.max(mx, a) : mx;
			}, -Infinity)
		: -Infinity;
	const topCaps = props.gameCountsByNameKey
		? props.signups.reduce((mx, s) => {
				const k = s.player_name.trim().toLowerCase();
				const c = props.gameCountsByNameKey?.[k];
				return typeof c === "number" && Number.isFinite(c) ? Math.max(mx, c) : mx;
			}, -Infinity)
		: -Infinity;
	const progressPct =
		goal > 0
			? Math.min(100, Math.round((headcount / goal) * 100))
			: 0;

	return (
		<section className="rounded-2xl border border-(--border) bg-(--surface) p-4">
			<div className="flex items-baseline justify-between gap-3">
				<div className="text-sm font-semibold">{props.labels.players}</div>
				<div className="text-xs text-[--muted]">
					{headcount} {props.labels.registered}
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
							const aura = props.auraByNameKey?.[nameKey];
							const isAuraKing =
								typeof aura === "number" &&
								Number.isFinite(aura) &&
								Number.isFinite(topAura) &&
								aura === topAura;
							const games = props.gameCountsByNameKey?.[nameKey] ?? 0;
							const isCapsKing =
								Number.isFinite(topCaps) && typeof games === "number" && games > 0 && games === topCaps;
							const streak = props.weeklyStreaksByNameKey?.[nameKey];
							const currentStreak = Math.max(0, streak?.currentStreakWeeks ?? 0);
							const bestStreak = Math.max(0, streak?.bestStreakWeeks ?? 0);
							const milestone =
								games === 5 || games === 10 || games === 25 || games === 50
									? games
									: null;
							const showNewBadge = props.newPlayerNameKeys.has(nameKey);
							const actionKind: "poke" | "wave" =
								showNewBadge || Boolean(props.viewerIsNew) ? "wave" : "poke";
							return (
								<li
									key={s.id}
									className={
										isMe
											? "relative flex items-center justify-between rounded-xl border border-(--gold)/60 bg-linear-to-r from-(--gold)/20 via-white/5 to-emerald-400/10 px-3 py-2 shadow-[0_0_0_1px_rgba(210,163,74,0.18),0_0_24px_rgba(210,163,74,0.18)]"
											: "flex items-center justify-between rounded-xl border border-(--border) bg-black/20 px-3 py-2"
									}
								>
									<div className="min-w-0">
										<div className="flex min-w-0 flex-wrap items-baseline gap-x-1 text-sm font-medium overflow-visible">
											<span className="min-w-0 truncate">
												{idx + 1}.{" "}
												{s.emoji?.trim() ? <span className="mr-1">{s.emoji.trim()}</span> : null}
												{s.player_name}
											</span>
											{typeof aura === "number" && Number.isFinite(aura) ? (
												<span
													className="ml-1.5 text-xs font-medium tabular-nums text-(--muted)"
													title={props.labels.auraShort.replace(
														"{n}",
														Math.round(aura).toLocaleString(),
													)}
												>
													· {Math.round(aura).toLocaleString()}
												</span>
											) : null}
											{isCapsKing ? (
												<span
													className="ml-1 inline-block align-text-bottom"
													title="Most caps"
													aria-label="Most caps"
												>
													🏅
												</span>
											) : null}
											{isAuraKing && typeof aura === "number" && Number.isFinite(aura) ? (
												<span className="relative ml-1 inline-flex align-text-bottom">
													<button
														type="button"
														className="inline-flex"
														title="Current Aura King"
														aria-label="Current Aura King"
														onClick={() => {
															setAuraTipForId(s.id);
															window.setTimeout(() => {
																setAuraTipForId((cur) => (cur === s.id ? null : cur));
															}, 1800);
														}}
													>
														<img
															src="/aura_king.gif"
															alt="Aura king"
															className="h-5 w-5"
														/>
													</button>
													{auraTipForId === s.id ? (
														<span className="absolute left-1/2 top-full z-10 mt-1 -translate-x-1/2 whitespace-nowrap rounded-lg border border-(--border) bg-black/90 px-2 py-1 text-[10px] font-semibold text-white/90 shadow-lg">
															Current Aura King
														</span>
													) : null}
												</span>
											) : null}
											{guests > 0 ? (
												<span className="ml-2 text-xs font-semibold text-(--gold)">
													{props.labels.guestsTag.replace('{n}', String(guests))}
												</span>
											) : null}
											{milestone ? (
												<span
													className="ml-2 inline-flex items-center rounded-full border border-(--gold)/35 bg-(--gold)/10 px-2 py-0.5 align-middle text-[10px] font-semibold uppercase tracking-wide text-(--gold-2)"
													title={props.labels.milestoneTitle.replace('{n}', String(milestone))}
												>
													{milestone}
												</span>
											) : null}
											{currentStreak > 2 ? (
												<span
													className="ml-2 inline-flex items-center rounded-full border border-emerald-400/35 bg-emerald-500/15 px-2 py-0.5 align-middle text-[10px] font-semibold uppercase tracking-wide text-emerald-100/90"
													title={props.labels.streakTitle
														.replace('{n}', String(currentStreak))
														.replace('{best}', String(bestStreak))}
												>
													{props.labels.streakLabel.replace('{n}', String(currentStreak))}
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
										{isMe && props.myDeleteToken && props.onPressEmoji ? (
											<button
												type="button"
												className="rounded-full border border-(--border) bg-black/30 px-2 py-1 text-xs font-semibold text-white/85 hover:bg-white/10"
												onClick={props.onPressEmoji}
											>
												{props.labels.emoji}
											</button>
										) : null}

										{!isMe &&
										props.mySignupId &&
										props.myDeleteToken &&
										props.onPoke &&
										!(props.disabledPokeToSignupIds?.has(s.id) ?? false) ? (
											<button
												type="button"
												className={
													actionKind === "wave"
														? "rounded-full border border-cyan-400/55 bg-cyan-500/15 px-2 py-1 text-xs font-semibold text-cyan-50 shadow-[0_0_14px_rgba(34,211,238,0.35)] hover:bg-cyan-400/20 hover:shadow-[0_0_20px_rgba(34,211,238,0.45)]"
														: "rounded-full border border-fuchsia-400/55 bg-fuchsia-500/15 px-2 py-1 text-xs font-semibold text-fuchsia-50 shadow-[0_0_14px_rgba(244,114,182,0.30)] hover:bg-fuchsia-400/20 hover:shadow-[0_0_20px_rgba(244,114,182,0.42)]"
												}
												title={actionKind === "wave" ? props.labels.wave : props.labels.poke}
												onClick={() => props.onPoke?.(s.id, s.player_name, actionKind)}
											>
												{actionKind === "wave" ? props.labels.wave : props.labels.poke}
											</button>
										) : null}

										{!isMe &&
										props.mySignupId &&
										props.myDeleteToken &&
										props.onPoke &&
										(props.disabledPokeToSignupIds?.has(s.id) ?? false) ? (
											<span
												className="rounded-full border border-(--border) bg-black/20 px-2 py-1 text-xs font-semibold text-white/45"
												title={props.labels.oneMegPerDay}
											>
												—
											</span>
										) : null}

										{isMe && props.onUnregister ? (
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
												className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-(--border) bg-black/30 text-white/80 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
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

			{goal > 0 && headcount > 0 ? (
				<div className="mt-8">
					<div className="flex items-baseline justify-between gap-3 text-xs">
						<div className="text-[--muted]">
							{headcount} / {goal} {props.labels.goal}
						</div>
						<div className="text-[--muted]">{progressPct}%</div>
					</div>
					<div className="mt-2 h-2 w-full rounded-full bg-white/10">
						<div
							className="h-2 rounded-full bg-(--gold)"
							style={{ width: `${progressPct}%` }}
						/>
					</div>
					<div className="mt-2 text-xs text-[--muted]">{props.labels.walkOnsHint}</div>
				</div>
			) : null}
		</section>
	);
}
