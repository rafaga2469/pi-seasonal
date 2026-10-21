/**
 * Season calendar for the seasonal decoration extension.
 *
 * Fixed holidays use month/day ranges; movable ones (Carnaval, Semana Santa,
 * Pascua) are derived from the Easter date computed with the anonymous
 * Gregorian algorithm. First matching season wins; keep more specific or
 * higher-priority seasons earlier in SEASONS.
 *
 * To add a season, append an entry to SEASONS (or a `custom` entry in
 * state.json) and a scene in scenes.ts.
 */

import type { Season } from "./types.ts";

export interface SeasonDefinition {
	id: string;
	label: string;
	banner: string;
	/** Widget color token (see types.ts ColorKey). */
	color: string;
	intervalMs: number;
	/** Fixed inclusive range per month/day, e.g. { start: [10, 1], end: [10, 31] }. */
	range?: { start: [number, number]; end: [number, number] };
	/** Inclusive days relative to Easter Sunday (negative = before). */
	easterOffset?: { from: number; to: number };
	height: number;
}

/** Inclusive month/day comparison helpers (no year, works across year end). */
function md(month: number, day: number): number {
	return month * 100 + day;
}

function inFixedRange(m: number, d: number, range: { start: [number, number]; end: [number, number] }): boolean {
	const v = md(m, d);
	const a = md(range.start[0], range.start[1]);
	const b = md(range.end[0], range.end[1]);
	// Ranges never wrap in this calendar (each season stays inside one visit of
	// the year, and New Year's Eve/New Year's Day share the `newyear` season via
	// two entries instead).
	return a <= v && v <= b;
}

/** Anonymous Gregorian algorithm for Easter Sunday. */
export function easterSunday(year: number): { month: number; day: number } {
	const a = year % 19;
	const b = Math.floor(year / 100);
	const c = year % 100;
	const d = Math.floor(b / 4);
	const e = b % 4;
	const f = Math.floor((b + 8) / 25);
	const g = Math.floor((b - f + 1) / 3);
	const h = (19 * a + b - d - g + 15) % 30;
	const i = Math.floor(c / 4);
	const k = c % 4;
	const l = (32 + 2 * e + 2 * i - h - k) % 7;
	const m = Math.floor((a + 11 * h + 22 * l) / 451);
	const month = Math.floor((h + l - 7 * m + 114) / 31);
	const day = ((h + l - 7 * m + 114) % 31) + 1;
	return { month, day };
}

/** Ordinal day number within the year (1-based) for Easter offset math. */
function dayOfYear(year: number, month: number, day: number): number {
	const date = new Date(Date.UTC(year, month - 1, day));
	const start = Date.UTC(year, 0, 1);
	return Math.round((date.getTime() - start) / 86_400_000) + 1;
}

export const SEASONS: SeasonDefinition[] = [
	{
		id: "newyear",
		label: "Año Nuevo",
		banner: "-=[ ¡Feliz Año Nuevo! ]=-",
		color: "gold",
		intervalMs: 550,
		// Nochevieja + Año Nuevo, one wrapped season handled by resolve().
		height: 6,
	},
	{
		id: "navidad",
		label: "Navidad",
		banner: "-=[ Feliz Navidad ]=-",
		color: "red",
		intervalMs: 700,
		range: { start: [12, 1], end: [12, 26] },
		height: 7,
	},
	{
		id: "muertos",
		label: "Día de los Muertos",
		banner: "-=[ Día de los Muertos ]=-",
		color: "orange",
		intervalMs: 650,
		range: { start: [11, 1], end: [11, 2] },
		height: 6,
	},
	{
		id: "halloween",
		label: "Halloween",
		banner: "-=[ Halloween ]=-",
		color: "orange",
		intervalMs: 600,
		range: { start: [10, 1], end: [10, 31] },
		height: 6,
	},
	{
		id: "carnaval",
		label: "Carnaval",
		banner: "-=[ ¡Carnaval! ]=-",
		color: "purple",
		intervalMs: 550,
		// From 53 to 46 days before Easter: carnival week ending on Ash Wednesday - 1.
		easterOffset: { from: -53, to: -46 },
		height: 5,
	},
	{
		id: "pascua",
		label: "Semana Santa / Pascua",
		banner: "-=[ Pascua ]=-",
		color: "gold",
		intervalMs: 800,
		// Palm Sunday through Easter Sunday.
		easterOffset: { from: -8, to: 0 },
		height: 6,
	},
	{
		id: "valentines",
		label: "San Valentín",
		banner: "-=[ San Valentín ]=-",
		color: "pink",
		intervalMs: 800,
		range: { start: [2, 8], end: [2, 14] },
		height: 4,
	},
	{
		id: "sanpatricio",
		label: "San Patricio",
		banner: "-=[ San Patricio ]=-",
		color: "lime",
		intervalMs: 700,
		range: { start: [3, 16], end: [3, 17] },
		height: 5,
	},
	{
		id: "trabajador",
		label: "Día del Trabajador",
		banner: "-=[ Día del Trabajador ]=-",
		color: "teal",
		intervalMs: 900,
		range: { start: [5, 1], end: [5, 1] },
		height: 3,
	},
];

/** User-defined extra seasons, read from state.json (`custom: [...]`). */
export interface CustomSeasonDefinition extends Omit<SeasonDefinition, "easterOffset"> {
	range: { start: [number, number]; end: [number, number] };
}

/** Resolve the active season definition for a date, or undefined for a plain day. */
export function resolveSeasonDefinition(date: Date): SeasonDefinition | undefined {
	const year = date.getFullYear();
	const month = date.getMonth() + 1;
	const day = date.getDate();

	// Wrapped season: Dec 27 - Jan 2 belongs to New Year.
	if (month === 12 && day >= 27) {
		return SEASONS[0];
	}
	if (month === 1 && day <= 2) {
		return SEASONS[0];
	}

	const easter = easterSunday(year);
	const easterDay = dayOfYear(year, easter.month, easter.day);
	const todayDay = dayOfYear(year, month, day);
	const offset = todayDay - easterDay;

	for (const season of SEASONS) {
		if (season.range && inFixedRange(month, day, season.range)) {
			return season;
		}
		if (season.easterOffset && offset >= season.easterOffset.from && offset <= season.easterOffset.to) {
			return season;
		}
	}
	return undefined;
}

/** All season ids known to the calendar (for /seasonal holiday <id>). */
export function knownSeasonIds(): string[] {
	return SEASONS.map((s) => s.id);
}

export function definitionById(id: string): SeasonDefinition | undefined {
	return SEASONS.find((s) => s.id === id);
}

export function definitionToSeason(def: SeasonDefinition, scenes: Record<string, Season | undefined>): Season | undefined {
	return scenes[def.id];
}