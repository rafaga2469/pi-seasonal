/**
 * Seasonal decoration for Pi.
 *
 * A live ambient widget above the editor plus a `/seasonal` command:
 *
 *   /seasonal                 show current season and mode
 *   /seasonal on|off          toggle the ambient widget
 *   /seasonal overlay         celebration overlay for the active season
 *   /seasonal auto            follow the calendar again (clears an override)
 *   /seasonal holiday <id>    pin a season (e.g. `seasonal holiday halloween`)
 *
 * Seasons resolve from the calendar; the preference persists in state.json
 * next to this extension.
 */

import type { ExtensionAPI, ExtensionCommandContext, Theme } from "@earendil-works/pi-coding-agent";
import type { TUI } from "@earendil-works/pi-tui";
import { definitionById, knownSeasonIds, resolveSeasonDefinition } from "./calendar.ts";
import { createPinnedDecoration, type PinnedDecoration } from "./decoration.ts";
import { celebrationFactory } from "./overlay.ts";
import { sceneById } from "./scenes.ts";
import { loadState, saveState, type SeasonalState } from "./state.ts";
import { createKit, createWidget, type WidgetComponent } from "./widget.ts";
import type { Season } from "./types.ts";

const ANCHOR_KEY = "seasonal-decor-anchor";
const WIDGET_KEY = "seasonal-decor";

export default function (pi: ExtensionAPI) {
	let state: SeasonalState = loadState();

	function resolveSeason(s: SeasonalState): Season | undefined {
		const def = s.override ? definitionById(s.override) : resolveSeasonDefinition(new Date());
		return def ? sceneById(def.id) : undefined;
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
		if (!season) {
			return "Sin temporada activa hoy. Puedes fijar una con /seasonal holiday <id>.";
		}
		const source = state.override ? "anulada manualmente" : "calendario";
		return `${season.label} — widget ${state.mode}, temporada: ${source}.`;
	}

	pi.on("session_start", (_event, ctx) => {
		if (!ctx.hasUI || ctx.mode !== "tui") return;
		state = loadState();
		// Clear a stale widget from older versions of this extension.
		ctx.ui.setWidget(WIDGET_KEY, undefined);
		ensureDecoration(ctx.ui, resolveSeason(state));
	});

	pi.registerCommand("seasonal", {
		description: "Decoración de temporada: status | on | off | overlay | auto | holiday <id>",
		getArgumentCompletions: (prefix: string) => {
			const options = ["status", "on", "off", "overlay", "auto", "holiday", ...knownSeasonIds()];
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
					ctx.ui.notify(verb === "on" ? "Widget de temporada activado." : "Widget de temporada desactivado.", "info");
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
					if (!id || !definitionById(id) || !sceneById(id)) {
						ctx.ui.notify(`Temporada desconocida: ${id ?? "(vacío)"}. Temporadas: ${knownSeasonIds().join(", ")}`, "warning");
						return;
					}
					state = { mode: "on", override: id };
					saveState(state);
					ensureDecoration(ctx.ui, sceneById(id));
					ctx.ui.notify(`Decoración fijada en ${id}. Usa /seasonal auto para volver al calendario.`, "info");
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
					ctx.ui.notify(`Uso: /seasonal [status|on|off|overlay|auto|holiday <id>]\nTemporadas: ${knownSeasonIds().join(", ")}`, "warning");
				}
			}
		},
	});
}