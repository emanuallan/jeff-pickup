export type Lang = "en" | "es";

const LANG_KEY = "jeffpickup.lang";

export function loadLang(): Lang {
	try {
		const v = localStorage.getItem(LANG_KEY);
		return v === "es" ? "es" : "en";
	} catch {
		return "en";
	}
}

export function saveLang(lang: Lang) {
	try {
		localStorage.setItem(LANG_KEY, lang);
	} catch {
		// ignore
	}
}

const DICT = {
	en: {
		pickupRoster: "Pickup roster",
		locationAndTime: "Location & Time",
		openInMaps: "Open in Maps",
		setupNeededTitle: "Setup needed",
		setupNeededBody:
			"To enable shared signups, set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.",
		joinTheList: "Join the list",
		date: "Date",
		changeDate: "Change date",
		saveDate: "Save",
		bringingGuests: "Guests you’re bringing",
		bringingGuestsPlaceholder: "e.g. 2",
		invalidGuests: "Please enter a number between 0 and 20.",
		guestsTag: "+{n} guests",
		emoji: "Emoji",
		poke: "Meg",
		pokeConfirm: "Meg {name}?",
		pokeSent: "Meg delivered. They didn't see it coming.",
		pokeReceived: "{name} megged yo ahhh, better get em back.",
		pokeDismiss: "Dismiss",
		wave: "Wave",
		waveConfirm: "Wave at {name}?",
		waveSent: "Wave sent.",
		waveSentWithAura: "Wave landed. +5 aura.",
		megSent1_20: "Meg: {n} aura. A friendly love tap. They’re fine. Probably.",
		megSent21_50: "Meg: {n} aura. That stung. Worth it.",
		megSent51_80: "Meg: {n} aura. Vicious. You love to see it.",
		megSent81_99:
			"Meg: {n} aura. Legend mode. The booth reviewed the tape twice.",
		megSent100:
			"MYTHIC {n}. The rarest meg. They’re in another dimension of hurt.",
		megReceived1_20: "{name} megged you for {n}. Light work.",
		megReceived21_50: "{name} megged you for {n}. That’s disrespectful.",
		megReceived51_80: "{name} megged you for {n}. You just got cooked.",
		megReceived81_99: "{name} megged you for {n}. Astronomical hate crime.",
		megReceived100: "{name} hit you with a MYTHIC {n}. It's over.",
		auraShort: "Aura {n}",
		waveReceived: "{name} waved at you",
		waveDismiss: "Dismiss",
		newPlayerBadge: "New",
		newPlayerBadgeTitle: "First pickup game — say hi!",
		streakLabel: "🔥 {n}w",
		streakTitle: "Weekly streak: {n} week(s). Best: {best}.",
		milestoneTitle: "{n} caps milestone",
		tabTodaysList: "Today",
		tabCapsLeaderboard: "Caps leaderboard",
		backToPickup: "Back to pickup",
		capsLeaderboardTitle: "Caps leaderboard",
		capsLeaderboardEmpty: "No caps yet — join a game to get on the board.",
		weeklyStreakLeaderboardTitle: "Weekly streaks",
		weeklyStreakLeaderboardEmpty: "No streaks yet.",
		capShort: "cap",
		capsShort: "caps",
		weekShort: "wk",
		weeksShort: "wks",
		hiName: "Hi {name}",
		pickEmoji: "Pick an emoji",
		removeEmoji: "Remove",
		saveEmoji: "Save",
		yourName: "Your name",
		namePlaceholder: "e.g. Alex",
		joinTodaysList: "Join today's list",
		joinList: "Join the list",
		players: "Players",
		registered: "registered",
		loading: "Loading…",
		emptyList: "No one yet. Be the first to join.",
		facebookGroup: "Facebook group",
		whatsappGroup: "WhatsApp group",
		shareLink: "Share link",
		linkCopied: "Link copied.",
		sharePost: "Help Recruit Players",
		sharePostHint: "Copy/paste (English + Spanish).",
		copyPostText: "Copy post text",
		copied: "Copied",
		couldNotCopy: "Could not copy. Please copy manually.",
		openFacebookGroup: "Open group",
		openFacebookAndPaste: "Open Facebook & paste",
		footer: "haha madrid",
		admin: "Admin",
		adminSubtitle: "Set the active location and time shown to everyone.",
		close: "Close",
		activeTime: "Active time",
		saveTime: "Save time",
		active: "Active",
		adminPinPrompt: "Admin PIN",
		incorrectPin: "Incorrect PIN.",
		couldNotLoad: "Could not load the list. Please try again.",
		enterName: "Please enter your name.",
		keepUnder40: "Please keep it under 40 characters.",
		alreadyOnList: "You're already on the list for this day and location.",
		registrationClosedPastSession:
			"This pickup already happened — registration is closed.",
		couldNotAdd: "Could not add you. Please try again.",
		couldNotPoke: "Could not send meg. Please try again.",
		couldNotWave: "Could not send wave. Please try again.",
		oneMegPerDay: "Only one wave/meg per player per game day.",
		couldNotRemove: "Could not remove you. Please try again.",
		unregister: "Unregister",
		unregisterHint:
			"Unregister works from the same device/browser you used to join",
		couldNotUpdateTime: "Could not update time.",
		couldNotUpdateLocation: "Could not update location.",
		couldNotUpdateAnnouncement: "Could not update announcement.",
		language: "Language",
		english: "English",
		spanish: "Español",
		youAreIn: "You're in",
		goal: "goal",
		announcement: "Announcement",
		announcementPlaceholder: "e.g. Field is wet — meet by the parking lot",
		saveAnnouncement: "Save announcement",
		gameStatus: "Game status",
		status: "Status",
		statusOn: "ON",
		statusTentative: "Tentative",
		statusCancelled: "Cancelled",
		statusNeedMore: "Need {n} more to be ON.",
		statusOnDetail: "Game is ON. See you there.",
		statusCancelledDetail: "Game is cancelled today.",
		minPlayers: "Min players",
		saveGameStatus: "Save game status",
		couldNotUpdateGameStatus: "Could not update game status.",
		walkOnsHint: "Usually 3–5 players show up without registering.",
		quickJoinThanks: "Thanks for joining us 😎",
	},
	es: {
		pickupRoster: "Lista de juego",
		locationAndTime: "Lugar y hora",
		openInMaps: "Abrir en Mapas",
		setupNeededTitle: "Falta configuración",
		setupNeededBody:
			"Para habilitar inscripciones compartidas, configura VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY.",
		joinTheList: "Unirme a la lista",
		date: "Fecha",
		changeDate: "Cambiar fecha",
		saveDate: "Guardar",
		bringingGuests: "Invitados que traes",
		bringingGuestsPlaceholder: "Ej. 2",
		invalidGuests: "Por favor escribe un número entre 0 y 20.",
		guestsTag: "+{n} invitados",
		emoji: "Emoji",
		poke: "Tunel",
		pokeConfirm: "¿Tunel a {name}?",
		pokeSent: "Tunel completado. No lo vio venir.",
		pokeReceived: "{name} te hizo tunel",
		pokeDismiss: "Cerrar",
		wave: "Saludar",
		waveConfirm: "¿Saludar a {name}?",
		waveSent: "Saludo enviado.",
		waveSentWithAura: "Onda enviada. +5 de aura.",
		megSent1_20: "Tunel: {n} aura. Un toque suave. Seguro están bien.",
		megSent21_50: "Tunel: {n} aura. Eso dolió. Valió la pena.",
		megSent51_80: "Tunel: {n} aura. Brutal. Así se hace.",
		megSent81_99: "Tunel: {n} aura. Leyenda. Hasta el VAR lo revisó dos veces.",
		megSent100: "MÍTICO {n}. El tunel más raro. Destrozados.",
		megReceived1_20: "{name} te hizo tunel por {n}. Tranqui.",
		megReceived21_50: "{name} te hizo tunel por {n}. Falta de respeto.",
		megReceived51_80: "{name} te hizo tunel por {n}. Te cocinaron.",
		megReceived81_99: "{name} te hizo tunel por {n}. Violencia absoluta.",
		megReceived100: "{name} te hizo un MÍTICO {n}. Se acabó.",
		auraShort: "Aura {n}",
		waveReceived: "{name} te saludó",
		waveDismiss: "Cerrar",
		newPlayerBadge: "Nuevo",
		newPlayerBadgeTitle: "Primer día de pickup — salúdalo!",
		streakLabel: "🔥 {n}sem",
		streakTitle: "Racha semanal: {n} semana(s). Mejor: {best}.",
		milestoneTitle: "Hito de {n} caps",
		tabTodaysList: "Hoy",
		tabCapsLeaderboard: "Ranking de caps",
		backToPickup: "Volver al pickup",
		capsLeaderboardTitle: "Ranking de caps",
		capsLeaderboardEmpty:
			"Aún no hay caps — únete a un día para entrar al ranking.",
		weeklyStreakLeaderboardTitle: "Rachas semanales",
		weeklyStreakLeaderboardEmpty: "Aún no hay rachas.",
		capShort: "cap",
		capsShort: "caps",
		weekShort: "sem",
		weeksShort: "sem",
		hiName: "Hola {name}",
		pickEmoji: "Elige un emoji",
		removeEmoji: "Quitar",
		saveEmoji: "Guardar",
		yourName: "Tu nombre",
		namePlaceholder: "Ej. Alex",
		joinTodaysList: "Unirme a la lista de hoy",
		joinList: "Unirme a la lista",
		players: "Jugadores",
		registered: "registrados",
		loading: "Cargando…",
		emptyList: "Aún nadie. Sé el primero en unirte.",
		facebookGroup: "Grupo de Facebook",
		whatsappGroup: "Grupo de WhatsApp",
		shareLink: "Compartir enlace",
		linkCopied: "Enlace copiado.",
		sharePost: "Ayuda a reclutar jugadores",
		sharePostHint: "Copia/pega (inglés + español).",
		copyPostText: "Copiar texto",
		copied: "Copiado",
		couldNotCopy: "No se pudo copiar. Cópialo manualmente.",
		openFacebookGroup: "Abrir grupo",
		openFacebookAndPaste: "Abrir Facebook y pegar",
		footer: "haha madrid",
		admin: "Admin",
		adminSubtitle: "Configura el lugar y la hora activos para todos.",
		close: "Cerrar",
		activeTime: "Hora activa",
		saveTime: "Guardar hora",
		active: "Activo",
		adminPinPrompt: "PIN de admin",
		incorrectPin: "PIN incorrecto.",
		couldNotLoad: "No se pudo cargar la lista. Inténtalo de nuevo.",
		enterName: "Por favor escribe tu nombre.",
		keepUnder40: "Por favor usa menos de 40 caracteres.",
		alreadyOnList: "Ya estás en la lista para ese día y lugar.",
		registrationClosedPastSession:
			"Este pickup ya pasó — no se puede registrar.",
		couldNotAdd: "No se pudo agregar. Inténtalo de nuevo.",
		couldNotPoke: "No se pudo enviar el meg. Inténtalo de nuevo.",
		couldNotWave: "No se pudo enviar el saludo. Inténtalo de nuevo.",
		oneMegPerDay: "Solo puedes hacer un saludo/tunel por jugador cada día.",
		couldNotRemove: "No se pudo eliminar. Inténtalo de nuevo.",
		unregister: "Eliminarme",
		unregisterHint:
			"Solo puedes eliminarte desde el mismo dispositivo/navegador con el que te uniste",
		couldNotUpdateTime: "No se pudo actualizar la hora.",
		couldNotUpdateLocation: "No se pudo actualizar el lugar.",
		couldNotUpdateAnnouncement: "No se pudo actualizar el anuncio.",
		language: "Idioma",
		english: "English",
		spanish: "Español",
		youAreIn: "Ya estás dentro",
		goal: "meta",
		announcement: "Anuncio",
		announcementPlaceholder:
			"Ej. El campo está mojado — nos vemos en el estacionamiento",
		saveAnnouncement: "Guardar anuncio",
		gameStatus: "Estado del juego",
		status: "Estado",
		statusOn: "SE JUEGA",
		statusTentative: "Tentativo",
		statusCancelled: "Cancelado",
		statusNeedMore: "Faltan {n} para confirmar.",
		statusOnDetail: "Se juega. Nos vemos ahí.",
		statusCancelledDetail: "Hoy se cancela el juego.",
		minPlayers: "Mínimo",
		saveGameStatus: "Guardar estado",
		couldNotUpdateGameStatus: "No se pudo actualizar el estado.",
		walkOnsHint: "Normalmente llegan 3–5 jugadores sin registrarse.",
		quickJoinThanks: "Gracias por unirte 😎",
	},
} as const;

export type I18nKey = keyof typeof DICT.en;

export function t(lang: Lang, key: I18nKey): string {
	return (DICT[lang] as any)[key] ?? (DICT.en as any)[key] ?? key;
}

/** After a successful meg, pick snarky copy from server roll 1–100. */
export function formatMegSentMessage(lang: Lang, roll: number): string {
	const n = String(roll);
	if (roll >= 100) return t(lang, "megSent100").replace("{n}", n);
	if (roll >= 81) return t(lang, "megSent81_99").replace("{n}", n);
	if (roll >= 51) return t(lang, "megSent51_80").replace("{n}", n);
	if (roll >= 21) return t(lang, "megSent21_50").replace("{n}", n);
	return t(lang, "megSent1_20").replace("{n}", n);
}

export function formatMegReceivedMessage(
	lang: Lang,
	fromName: string,
	roll: number,
): string {
	const n = String(roll);
	const base =
		roll >= 100
			? t(lang, "megReceived100")
			: roll >= 81
				? t(lang, "megReceived81_99")
				: roll >= 51
					? t(lang, "megReceived51_80")
					: roll >= 21
						? t(lang, "megReceived21_50")
						: t(lang, "megReceived1_20");
	return base.replace("{name}", fromName).replace("{n}", n);
}
