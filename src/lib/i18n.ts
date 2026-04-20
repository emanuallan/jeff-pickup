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
		yourName: "Your name",
		namePlaceholder: "e.g. Alex",
		joinTodaysList: "Join today's list",
		joinList: "Join the list",
		players: "Players",
		total: "total",
		loading: "Loading…",
		emptyList: "No one yet. Be the first to join.",
		facebookGroup: "Facebook group",
		whatsappGroup: "WhatsApp group",
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
		alreadyOnList: "You're already on the list for this day and location.",
		couldNotAdd: "Could not add you. Please try again.",
		couldNotRemove: "Could not remove you. Please try again.",
		unregister: "Unregister",
		unregisterHint:
			"Unregister works from the same device/browser you used to join",
		couldNotUpdateTime: "Could not update time.",
		couldNotUpdateLocation: "Could not update location.",
		language: "Language",
		english: "English",
		spanish: "Español",
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
		yourName: "Tu nombre",
		namePlaceholder: "Ej. Alex",
		joinTodaysList: "Unirme a la lista de hoy",
		joinList: "Unirme a la lista",
		players: "Jugadores",
		total: "en total",
		loading: "Cargando…",
		emptyList: "Aún nadie. Sé el primero en unirte.",
		facebookGroup: "Grupo de Facebook",
		whatsappGroup: "Grupo de WhatsApp",
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
		alreadyOnList: "Ya estás en la lista para ese día y lugar.",
		couldNotAdd: "No se pudo agregar. Inténtalo de nuevo.",
		couldNotRemove: "No se pudo eliminar. Inténtalo de nuevo.",
		unregister: "Eliminarme",
		unregisterHint:
			"Solo puedes eliminarte desde el mismo dispositivo/navegador con el que te uniste",
		couldNotUpdateTime: "No se pudo actualizar la hora.",
		couldNotUpdateLocation: "No se pudo actualizar el lugar.",
		language: "Idioma",
		english: "English",
		spanish: "Español",
	},
} as const;

export type I18nKey = keyof typeof DICT.en;

export function t(lang: Lang, key: I18nKey): string {
	return (DICT[lang] as any)[key] ?? (DICT.en as any)[key] ?? key;
}
