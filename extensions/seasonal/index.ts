/**
 * Seasonal decoration for Pi.
 *
 * An animated emoji line pinned below the shell header plus a `/seasonal` command:
 *
 *   /seasonal                    show status (season, country, mode)
 *   /seasonal on|off             toggle the decoration line
 *   /seasonal overlay            celebration overlay for the active season
 *   /seasonal auto               follow the calendar again (clears an override)
 *   /seasonal holiday <id>       pin a season (e.g. `seasonal holiday halloween`)
 *   /seasonal country <code>     calendar selection: auto (timezone) | co | generic
 *
 * The country decides the calendar: Colombia runs its official holidays
 * (Ley Emiliani + Ley 2578); anything else gets the generic festive calendar.
 * Preferences persist in the agent dir.
 */

import type { ExtensionAPI, ExtensionCommandContext, Theme } from "@earendil-works/pi-coding-agent";
import type { TUI } from "@earendil-works/pi-tui";
import {
	coSceneById,
	definitionById,
	detectCountry,
	knownSeasonIds,
	resolveSeasonForCountry,
	setSceneRegistry,
	type Country,
} from "./calendar.ts";
import { createPinnedDecoration } from "./decoration.ts";
import { celebrationFactory } from "./overlay.ts";
import { SCENES } from "./scenes.ts";
import { loadState, saveState, type CountrySetting, type SeasonalState } from "./state.ts";
import { createKit, createWidget, type WidgetComponent } from "./widget.ts";
import type { Season } from "./types.ts";

const ANCHOR_KEY = "seasonal-decor-anchor";
const WIDGET_KEY = "seasonal-decor";

export default function (pi: ExtensionAPI) {
	// Wire the scene registry so the calendar can look up generic scenes.
	setSceneRegistry((id) => SCENES[id]);

	let state: SeasonalState = loadState();

	function activeCountry(s: SeasonalState): Country {
		if (s.country === "co" || s.country === "generic") return s.country;
		return detectCountry() ?? "generic";
	}

	function resolveSeason(s: SeasonalState): Season | undefined {
		if (s.override) return SCENES[s.override] ?? coSceneById(s.override);
		return resolveSeasonForCountry(new Date(), activeCountry(s));
	}

	/**
	 * Mount the decoration pinned directly below the shell header bar (full
	 * width) when gentle-pi's shared sidebar state is available; otherwise
	 * fall back to Pi's own scrolleable document header.
	 */
	function ensureDecoration(ui: ExtensionCommandContext["ui"], season: Season | undefined): void {
		if (state.mode === "off" || !season) {
			try {
				ui.setHeader(undefined);
			} catch {}
			ui.setWidget(ANCHOR_KEY, undefined);
			return;
		}
		let headerFallback = false;
		ui.setWidget(
			ANCHOR_KEY,
			(tui: TUI, theme: Theme) => {
				const kit = createKit(theme);
				const pinned = createPinnedDecoration(tui, theme, season);
				if (!pinned.installed && !headerFallback) {
					headerFallback = true;
					try {
						ui.setHeader((scrollTui: TUI, scrollTheme: Theme) => {
							const scrollKit = createKit(scrollTheme);
							return createWidget(scrollTui, season, scrollKit);
						});
					} catch {}
				}
				return {
					render(): string[] {
						return [];
					},
					invalidate() {},
					dispose(): void {
						pinned.dispose();
						if (headerFallback) {
							headerFallback = false;
							try {
								ui.setHeader(undefined);
							} catch {}
						}
					},
				};
			},
			{ placement: "aboveEditor" },
		);
	}

	function statusText(season: Season | undefined): string {
		const country = activeCountry(state);
		if (!season) {
			return `Sin temporada activa hoy (calendario ${country}). Puedes fijar una con /seasonal holiday <id>.`;
		}
		const source = state.override ? "anulada manualmente" : `calendario ${country}`;
		return `${season.label} — decoración ${state.mode}, fuente: ${source}.`;
	}

	pi.on("session_start", (_event, ctx) => {
		if (!ctx.hasUI || ctx.mode !== "tui") return;
		state = loadState();
		// Clear a stale widget from older versions of this extension.
		ctx.ui.setWidget(WIDGET_KEY, undefined);
		ensureDecoration(ctx.ui, resolveSeason(state));
	});

	pi.registerCommand("seasonal", {
		description: "Decoración de temporada: status | on | off | overlay | auto | holiday <id> | country <auto|co|generic>",
		getArgumentCompletions: (prefix: string) => {
			const options = ["status", "on", "off", "overlay", "auto", "holiday", "country", ...knownSeasonIds()];
			const matches = options.filter((o) => o.startsWith(prefix));
			if (matches.length === 0) return null;
			return matches.map((m) => ({ value: m, label: m }));
		},
		handler: async (args: string, ctx: ExtensionCommandContext) => {
			const [verb, ...rest] = (args ?? "").trim().split(/\s+/);

			switch (verb) {
				case "":
				case "status": {
					ctx.ui.notify(statusText(resolveSeason(state)), "info");
					return;
				}
				case "on":
				case "off": {
					state = { ...state, mode: verb as SeasonalState["mode"] };
					saveState(state);
					ensureDecoration(ctx.ui, resolveSeason(state));
					ctx.ui.notify(verb === "on" ? "Decoración activada." : "Decoración desactivada.", "info");
					return;
				}
				case "auto": {
					state = { ...state, override: null };
					saveState(state);
					ensureDecoration(ctx.ui, resolveSeason(state));
					ctx.ui.notify(statusText(resolveSeason(state)), "info");
					return;
				}
				case "holiday": {
					const id = rest[0];
					if (!id || !(SCENES[id] || coSceneById(id))) {
						ctx.ui.notify(`Temporada desconocida: ${id ?? "(vacío)"}. Temporadas: ${knownSeasonIds().join(", ")}`, "warning");
						return;
					}
					state = { ...state, mode: "on", override: id };
					saveState(state);
					ensureDecoration(ctx.ui, SCENES[id] ?? coSceneById(id));
					ctx.ui.notify(`Decoración fijada en ${id}. Usa /seasonal auto para volver al calendario.`, "info");
					return;
				}
				case "country": {
					const value = rest[0];
					if (!value || value.startsWith("auto")) {
						state = { ...state, country: "auto" };
					} else if (value === "co" || value === "generic") {
						state = { ...state, country: value as Exclude<CountrySetting, "auto"> };
					} else {
						ctx.ui.notify(`País desconocido: ${value}. Opciones: auto (por zona horaria), co (Colombia), generic.`, "warning");
						return;
					}
					saveState(state);
					ensureDecoration(ctx.ui, resolveSeason(state));
					ctx.ui.notify(statusText(resolveSeason(state)), "info");
					return;
				}
				case "overlay": {
					if (ctx.mode !== "tui") {
						ctx.ui.notify("El overlay de celebración requiere el modo interactivo.", "warning");
						return;
					}
					const season = resolveSeason(state);
					if (!season) {
						ctx.ui.notify("Sin temporada activa. Puedes fijar una con /seasonal holiday <id>.", "warning");
						return;
					}
					await ctx.ui.custom(celebrationFactory(season));
					return;
				}
				default: {
					ctx.ui.notify(
						`Uso: /seasonal [status|on|off|overlay|auto|holiday <id>|country <auto|co|generic>]\nTemporadas: ${knownSeasonIds().join(", ")}`,
						"warning",
					);
				}
			}
		},
	});
}