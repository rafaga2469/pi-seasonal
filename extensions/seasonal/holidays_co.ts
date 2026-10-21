/**
 * Colombian official holidays (Ley 51 de 1983 "Ley Emiliani" + Ley 2578 de 2026).
 *
 * Categories:
 *  - fixed: never moved (1 ene, 1 may, 20 jul, 7 ago, 8 dic, 25 dic)
 *  - easterOffset: Jueves/Viernes Santo (+3/+2 before), Ascensión (+43),
 *    Corpus (+64), Sagrado Corazón (+71) — decreed on Mondays
 *  - mondayAfter: rest day moved to the first Monday on/after the civil/religious date
 *
 * Each holiday maps to a decorative inline scene for the pinned header line.
 */

import type { InlineSpriteDef, Season } from "./types.ts";
import { makeInline } from "./scenes.ts";

export type HolidayTiming =
	| { kind: "fixed"; month: number; day: number }
	| { kind: "easterOffset"; offset: number }
	| { kind: "mondayAfter"; month: number; day: number };

export interface HolidayDef {
	id: string;
	label: string;
	banner: string;
	color: string;
	emojis: InlineSpriteDef[];
	timing: HolidayTiming;
}

// Colombian flag as ANSI-colored blocks (reliable everywhere): yellow half,
// blue + red quarters, drawn by segment colors on solid U+2588 blocks.
const FLAG_BLOCKS = "\u2588\u2588\u2588\u2588";
const FLAG: InlineSpriteDef = {
	emoji: "",
	color: "gold",
	segments: [
		{ text: "\u2588\u2588", color: "gold" },
		{ text: "\u2588", color: "blue" },
		{ text: "\u2588", color: "red" },
	],
};

export const CO_HOLIDAYS: HolidayDef[] = [
	{
		id: "anionuevo",
		label: "Año Nuevo",
		banner: "-=[ ¡Feliz Año Nuevo! ]=-",
		color: "gold",
		emojis: [
			{ emoji: "\u{1F386}", color: "gold" }, // 🎆
			{ emoji: "\u{1F37E}", color: "gold" }, // 🥂
			{ emoji: "\u{1F387}", color: "pink" }, // 🎇
			FLAG,
		],
		timing: { kind: "fixed", month: 1, day: 1 },
	},
	{
		id: "reyes",
		label: "Reyes Magos",
		banner: "-=[ Reyes Magos ]=-",
		color: "gold",
		emojis: [
			{ emoji: "\u{1F451}", color: "gold" }, // 👑
			{ emoji: "\u2728", color: "gold" }, // ✨
			FLAG,
			{ emoji: "\u{1F381}", color: "red" }, // 🎁
		],
		timing: { kind: "mondayAfter", month: 1, day: 6 },
	},
	{
		id: "sanjose",
		label: "San José",
		banner: "-=[ San José ]=-",
		color: "teal",
		emojis: [
			{ emoji: "\u{1F54A}\uFE0F", color: "snow" }, // 🕊️
			{ emoji: "\u{1F528}", color: "brown" }, // 🔨
			{ emoji: "\u{1F3E0}", color: "brown" }, // 🏠
			FLAG,
		],
		timing: { kind: "mondayAfter", month: 3, day: 19 },
	},
	{
		id: "semanasanta",
		label: "Semana Santa",
		banner: "-=[ Semana Santa ]=-",
		color: "purple",
		emojis: [
			{ emoji: "\u{1F64F}", color: "snow" }, // 🙏
			{ emoji: "\u271D\uFE0F", color: "purple" }, // ✝️
			FLAG,
			{ emoji: "\u{1F56F}\uFE0F", color: "flame" }, // 🕯️
		],
		timing: { kind: "easterOffset", offset: -3 }, // Jueves Santo
	},
	{
		id: "viernessanto",
		label: "Viernes Santo",
		banner: "-=[ Viernes Santo ]=-",
		color: "purple",
		emojis: [
			{ emoji: "\u271D\uFE0F", color: "purple" }, // ✝️
			{ emoji: "\u{1F64F}", color: "snow" }, // 🙏
			{ emoji: "\u{1F56F}\uFE0F", color: "flame" }, // 🕯️
			FLAG,
		],
		timing: { kind: "easterOffset", offset: -2 },
	},
	{
		id: "trabajo",
		label: "Día del Trabajo",
		banner: "-=[ Día del Trabajo ]=-",
		color: "teal",
		emojis: [
			{ emoji: "\u{1F6E0}\uFE0F", color: "teal" }, // 🛠️
			{ emoji: "\u{1F527}", color: "teal" }, // 🔧
			{ emoji: "\u2699\uFE0F", color: "teal" }, // ⚙️
			{ emoji: "\u{1F4BC}", color: "brown" }, // 💼
		],
		timing: { kind: "fixed", month: 5, day: 1 },
	},
	{
		id: "ascension",
		label: "Ascensión",
		banner: "-=[ Ascensión ]=-",
		color: "blue",
		emojis: [
			{ emoji: "\u{1F54A}\uFE0F", color: "snow" }, // 🕊️
			{ emoji: "\u2601\uFE0F", color: "web" }, // ☁️
			{ emoji: "\u2728", color: "gold" }, // ✨
			FLAG,
		],
		timing: { kind: "easterOffset", offset: 43 }, // Monday by decree
	},
	{
		id: "corpus",
		label: "Corpus Christi",
		banner: "-=[ Corpus Christi ]=-",
		color: "red",
		emojis: [
			{ emoji: "\u{1F35E}", color: "brown" }, // 🍞
			{ emoji: "\u{1F377}", color: "red" }, // 🍷
			{ emoji: "\u26EA\uFE0F", color: "gold" }, // ⛪
			FLAG,
		],
		timing: { kind: "easterOffset", offset: 64 },
	},
	{
		id: "sagradocorazon",
		label: "Sagrado Corazón",
		banner: "-=[ Sagrado Corazón ]=-",
		color: "red",
		emojis: [
			{ emoji: "\u2764\uFE0F", color: "red" }, // ❤️
			{ emoji: "\u271D\uFE0F", color: "gold" }, // ✝️
			{ emoji: "\u26EA\uFE0F", color: "gold" }, // ⛪
			FLAG,
		],
		timing: { kind: "easterOffset", offset: 71 },
	},
	{
		id: "sanpedrosanpablo",
		label: "San Pedro y San Pablo",
		banner: "-=[ San Pedro y San Pablo ]=-",
		color: "teal",
		emojis: [
			{ emoji: "\u{1F511}", color: "gold" }, // 🔑
			{ emoji: "\u{1F41F}", color: "blue" }, // 🐟
			{ emoji: "\u26EA\uFE0F", color: "gold" }, // ⛪
			FLAG,
		],
		timing: { kind: "mondayAfter", month: 6, day: 29 },
	},
	{
		id: "chiquinquira",
		label: "Virgen del Rosario de Chiquinquirá",
		banner: "-=[ Virgen de Chiquinquirá ]=-",
		color: "blue",
		emojis: [
			{ emoji: "\u{1F64F}", color: "snow" }, // 🙏
			{ emoji: "\u{1F4FF}", color: "gold" }, // 📿
			{ emoji: "\u{1F451}", color: "gold" }, // 👑
			FLAG,
		],
		timing: { kind: "mondayAfter", month: 7, day: 9 },
	},
	{
		id: "independencia",
		label: "Día de la Independencia",
		banner: "-=[ ¡20 de Julio! ]=-",
		color: "gold",
		emojis: [
			FLAG,
			{ emoji: "\u{1F389}", color: "gold" }, // 🎉
			{ emoji: "\u{1F49B}", color: "gold" }, // 💛
			{ emoji: "\u{1F387}", color: "pink" }, // 🎇
		],
		timing: { kind: "fixed", month: 7, day: 20 },
	},
	{
		id: "boyaca",
		label: "Batalla de Boyacá",
		banner: "-=[ 7 de Agosto ]=-",
		color: "red",
		emojis: [
			FLAG,
			{ emoji: "\u2694\uFE0F", color: "web" }, // ⚔️
			{ emoji: "\u{1F6E1}\uFE0F", color: "web" }, // 🛡️
			{ emoji: "\u{1F3F0}", color: "web" }, // 🏰
		],
		timing: { kind: "fixed", month: 8, day: 7 },
	},
	{
		id: "asuncion",
		label: "Asunción de la Virgen",
		banner: "-=[ Asunción ]=-",
		color: "blue",
		emojis: [
			{ emoji: "\u{1F64F}", color: "snow" }, // 🙏
			{ emoji: "\u{1F47C}", color: "snow" }, // 👼
			{ emoji: "\u{1F33C}", color: "orange" }, // 🌼
			FLAG,
		],
		timing: { kind: "mondayAfter", month: 8, day: 15 },
	},
	{
		id: "raza",
		label: "Día de la Raza",
		banner: "-=[ Día de la Raza ]=-",
		color: "teal",
		emojis: [
			{ emoji: "\u{1F30E}", color: "blue" }, // 🌎
			{ emoji: "\u{1F9ED}", color: "gold" }, // 🧭
			{ emoji: "\u{1F6F6}", color: "brown" }, // 🛶
			FLAG,
		],
		timing: { kind: "mondayAfter", month: 10, day: 12 },
	},
	{
		id: "todossantos",
		label: "Todos los Santos",
		banner: "-=[ Todos los Santos ]=-",
		color: "web",
		emojis: [
			{ emoji: "\u{1F56F}\uFE0F", color: "flame" }, // 🕯️
			{ emoji: "\u26EA\uFE0F", color: "gold" }, // ⛪
			{ emoji: "\u{1F33C}", color: "orange" }, // 🌼
			{ emoji: "\u{1F64F}", color: "snow" }, // 🙏
		],
		timing: { kind: "mondayAfter", month: 11, day: 1 },
	},
	{
		id: "cartagena",
		label: "Independencia de Cartagena",
		banner: "-=[ 11 de Noviembre ]=-",
		color: "orange",
		emojis: [
			{ emoji: "\u{1F3F0}", color: "web" }, // 🏰
			{ emoji: "\u{1F6E1}\uFE0F", color: "web" }, // 🛡️
			{ emoji: "\u{1F6A2}", color: "blue" }, // 🚢
			FLAG,
		],
		timing: { kind: "mondayAfter", month: 11, day: 11 },
	},
	{
		id: "inmaculada",
		label: "Inmaculada Concepción",
		banner: "-=[ 8 de Diciembre ]=-",
		color: "blue",
		emojis: [
			{ emoji: "\u{1F64F}", color: "snow" }, // 🙏
			{ emoji: "\u{1F47C}", color: "snow" }, // 👼
			{ emoji: "\u{1F31F}", color: "gold" }, // 🌟
			FLAG,
		],
		timing: { kind: "fixed", month: 12, day: 8 },
	},
	{
		id: "navidad",
		label: "Navidad",
		banner: "-=[ Feliz Navidad ]=-",
		color: "red",
		emojis: [
			{ emoji: "\u2744\uFE0F", color: "snow" }, // ❄️
			{ emoji: "\u{1F384}", color: "lime" }, // 🎄
			{ emoji: "\u{1F385}", color: "red" }, // 🎅
			{ emoji: "\u{1F381}", color: "red" }, // 🎁
		],
		timing: { kind: "fixed", month: 12, day: 25 },
	},
];

/** Build the inline season for a holiday definition (line-only scene). */
export function holidayToSeason(def: HolidayDef): Season {
	const inline: Season["inline"] = makeInline(def.emojis);
	return {
		id: def.id,
		label: def.label,
		banner: def.banner,
		color: def.color as Season["color"],
		intervalMs: 700,
		height: 1,
		ambient: (width, frame, kit) => [inline(width, frame, kit)],
		inline,
	};
}

/** First Monday on/after the given month/day, applied by Ley Emiliani. */
export function firstMondayOnOrAfter(year: number, month: number, day: number): { month: number; day: number } {
	const date = new Date(Date.UTC(year, month - 1, day));
	while (date.getUTCDay() !== 1) {
		date.setUTCDate(date.getUTCDate() + 1);
	}
	return { month: date.getUTCMonth() + 1, day: date.getUTCDate() };
}

/** Resolve the resting date of a holiday definition for a given year. */
export function holidayDate(def: HolidayDef, year: number, easter: { month: number; day: number }): Date {
	const easterDay = Date.UTC(year, easter.month - 1, easter.day) / 86_400_000;
	switch (def.timing.kind) {
		case "fixed":
			return new Date(Date.UTC(year, def.timing.month - 1, def.timing.day));
		case "easterOffset":
			return new Date((easterDay + def.timing.offset) * 86_400_000);
		case "mondayAfter": {
			const { month, day } = firstMondayOnOrAfter(year, def.timing.month, def.timing.day);
			return new Date(Date.UTC(year, month - 1, day));
		}
	}
}

/** True when `date` falls on the resting date of this holiday for `year` is checked by the matcher. */
export function holidayMatches(def: HolidayDef, date: Date, easter: { month: number; day: number }): boolean {
	const resolved = holidayDate(def, date.getFullYear(), easter);
	const y = resolved.getUTCFullYear();
	// Holiday resolved for date's own year only; UTC-based compare.
	return (
		y === date.getFullYear() &&
		resolved.getUTCMonth() === date.getMonth() &&
		resolved.getUTCDate() === date.getDate()
	);
}