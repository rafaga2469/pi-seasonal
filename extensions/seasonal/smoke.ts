/**
 * Smoke test for the pure modules of the seasonal extension:
 * - calendar resolves known dates and movable feast days
 * - every scene renders without overflowing the requested display width
 * - rendered lines measure exactly the canvas width (emoji-aware)
 *
 * Run with:  npx tsx ~/.pi/agent/extensions/seasonal/smoke.ts
 * (pure logic only: no pi-tui runtime import involved)
 */

import assert from "node:assert/strict";
import { CO_HOLIDAYS, holidayDate, holidayMatches } from "./holidays_co.ts";
import { definitionById, detectCountry, easterSunday, knownSeasonIds, resolveSeasonDefinition, resolveSeasonForCountry, sceneById as calendarSceneById, setSceneRegistry } from "./calendar.ts";

import { sceneById, SCENES } from "./scenes.ts";
import { holidayToSeason } from "./holidays_co.ts";
import { clusterWidth, clusters, widthOf } from "./canvas.ts";

/** Count emoji clusters (2 display columns) in an ANSI-free line. */
function lineEmojis(line: string): number {
	return clusters(line).filter((c) => clusterWidth(c) === 2).length;
}
import type { Kit } from "./types.ts";

// The calendar resolves generic scenes through the registry; wire it.
setSceneRegistry((id) => SCENES[id]);

const passthroughKit: Kit = {
	style(text: string, _color: string): string {
		return text;
	},
};

// --- Calendar ---------------------------------------------------------------

function expectSeason(date: string, id: string): void {
	const resolved = resolveSeasonDefinition(new Date(date));
	assert.ok(resolved, `${date} should resolve to a season`);
	assert.equal(resolved.id, id, `${date} expected ${id}, got ${resolved.id}`);
}

expectSeason("2025-10-15T12:00:00Z", "halloween");
expectSeason("2025-10-31T23:00:00Z", "halloween");
expectSeason("2025-11-01T12:00:00Z", "muertos");
expectSeason("2025-12-10T12:00:00Z", "navidad");
expectSeason("2025-12-31T12:00:00Z", "newyear");
expectSeason("2026-01-01T12:00:00Z", "newyear");
expectSeason("2026-02-10T12:00:00Z", "valentines");
expectSeason("2026-03-17T12:00:00Z", "sanpatricio");
expectSeason("2026-05-01T12:00:00Z", "trabajador");

// Plain day without season: resolveSeasonDefinition should return undefined.
{
	const resolved = resolveSeasonDefinition(new Date("2026-01-05T12:00:00Z"));
	assert.equal(resolved, undefined, "2026-01-05 should have no season");
}
{
	const resolved = resolveSeasonDefinition(new Date("2026-06-15T12:00:00Z"));
	assert.equal(resolved, undefined, "2026-06-15 should have no season");
}

// Movable seasons: Easter 2026 is April 5, 2027 is March 28.
{
	const easter2026 = easterSunday(2026);
	assert.deepEqual([easter2026.month, easter2026.day], [4, 5], `Easter 2026 must be April 5, got ${JSON.stringify(easter2026)}`);
	const easter2027 = easterSunday(2027);
	assert.deepEqual([easter2027.month, easter2027.day], [3, 28], `Easter 2027 must be March 28, got ${JSON.stringify(easter2027)}`);
}
// Holy week: Palm Sunday is Easter - 7 = 2026-03-29.
{
	const resolved = resolveSeasonDefinition(new Date("2026-03-29T12:00:00Z"));
	assert.ok(resolved && resolved.id === "pascua", `Palm Sunday 2026 should be pascua, got ${resolved?.id ?? "none"}`);
}
// Carnival Tuesday 2026 = Ash Wednesday - 1 = Easter - 47 = 2026-02-17.
{
	const resolved = resolveSeasonDefinition(new Date("2026-02-17T12:00:00Z"));
	assert.ok(resolved && resolved.id === "carnaval", `Carnival Tuesday 2026 should be carnaval, got ${resolved?.id ?? "none"}`);
}

// Calendar and scene registry stay in sync.
for (const id of knownSeasonIds()) {
	assert.ok(calendarSceneById(id), `scene missing for season id ${id}`);
}
for (const id of Object.keys(SCENES)) {
	assert.ok(definitionById(id), `calendar definition missing for scene id ${id}`);
}

// --- Scenes -----------------------------------------------------------------

const WIDTHS = [20, 24, 40, 80, 121];
const FRAMES = 26;

for (const id of Object.keys(SCENES)) {
	const scene = sceneById(id)!;
	for (const width of WIDTHS) {
		for (let frame = 0; frame < FRAMES; frame++) {
			const lines = scene.ambient(width, frame, passthroughKit);
			assert.ok(lines.length > 0, `${id} must render at least one line`);
			assert.ok(lines.length <= scene.height, `${id} rendered ${lines.length} lines over height ${scene.height} (w=${width})`);
			lines.forEach((line, i) => {
				const w = widthOf(line);
				assert.ok(!line.includes("\n") && !line.includes("\t"), `${id} line ${i} has control characters`);
				assert.ok(
					w === width,
					`${id} line ${i} must measure exactly ${width} display columns, got ${w} (frame ${frame}): "${line}"`,
				);
			});
		}
	}
}

// --- Inline mode (single-line widget) ---------------------------------------

for (const id of Object.keys(SCENES)) {
	const scene = sceneById(id)!;
	// At least 4 moving emoji sprites per scene: at least SOME frame must show
	// all of them (transient overlaps swallow one, so sample a window).
	let maxEmoji = 0;
	for (let probe = 0; probe < 26; probe++) {
		maxEmoji = Math.max(maxEmoji, lineEmojis(scene.inline(80, probe, passthroughKit)));
	}
	assert.ok(
		maxEmoji >= 4,
		`${id} inline must carry at least 4 emoji sprites in some frame, best ${maxEmoji}`,
	);
	for (const width of WIDTHS) {
		for (let frame = 0; frame < FRAMES; frame++) {
			const line = scene.inline(width, frame, passthroughKit);
			const w = widthOf(line);
			assert.ok(
				w === width,
				`${id} inline must measure exactly ${width} display columns, got ${w} (frame ${frame}): "${line}"`,
			);
			assert.ok(!line.includes("\n") && !line.includes("\t"), `${id} inline has control characters`);
		}
	}
}

// --- Country calendar (Colombia, Ley Emiliani 2026) -------------------------

// Detection from timezone.
{
	const detected = detectCountry("America/Bogota");
	assert.equal(detected, "co", "Bogota timezone must map to co");
	const missing = detectCountry("Europe/Berlin");
	assert.equal(missing, undefined, "Unmapped timezones fall back to generic");
}

function expectCo(date: string, id: string): void {
	const resolved = resolveSeasonForCountry(new Date(date), "co");
	assert.ok(resolved, `${date} (co) should resolve to a holiday/season`);
	assert.equal(resolved.id, id, `${date} (co) expected ${id}, got ${resolved.id}`);
}

// Official 2026 resting dates (source: Colombia official calendars).
expectCo("2026-01-01T12:00:00Z", "anionuevo");
expectCo("2026-01-12T12:00:00Z", "reyes");
expectCo("2026-03-23T12:00:00Z", "sanjose");
expectCo("2026-04-02T12:00:00Z", "semanasanta");
expectCo("2026-04-03T12:00:00Z", "viernessanto");
expectCo("2026-05-01T12:00:00Z", "trabajo");
expectCo("2026-05-18T12:00:00Z", "ascension");
expectCo("2026-06-08T12:00:00Z", "corpus");
expectCo("2026-06-15T12:00:00Z", "sagradocorazon");
expectCo("2026-06-29T12:00:00Z", "sanpedrosanpablo");
expectCo("2026-07-13T12:00:00Z", "chiquinquira");
expectCo("2026-07-20T12:00:00Z", "independencia");
expectCo("2026-08-07T12:00:00Z", "boyaca");
expectCo("2026-08-17T12:00:00Z", "asuncion");
expectCo("2026-10-12T12:00:00Z", "raza");
expectCo("2026-11-02T12:00:00Z", "todossantos");
expectCo("2026-11-16T12:00:00Z", "cartagena");
expectCo("2026-12-08T12:00:00Z", "inmaculada");
expectCo("2026-12-25T12:00:00Z", "navidad");

// CO falls back to generic seasons when no official holiday: Halloween in October.
expectCo("2026-10-15T12:00:00Z", "halloween");
expectCo("2026-02-17T12:00:00Z", "carnaval");
// Generic resolution ignores CO holidays.
{
	const generic = resolveSeasonForCountry(new Date("2026-07-20T12:00:00Z"), "generic");
	assert.equal(generic, undefined, "2026-07-20 (generic) has no season");
}

// Every CO holiday inline scene keeps the 4-sprite and exact-width invariants.
for (const def of CO_HOLIDAYS) {
	for (let probe = 0; probe < 8; probe++) {
		const line = holidayToSeason(def).inline(80, probe, passthroughKit);
		assert.ok(widthOf(line) === 80, `${def.id} inline must measure exactly 80, got ${widthOf(line)}`);
	}
}
// Holiday resting dates resolve to the documented 2026 dates.
{
	const easter = easterSunday(2026);
	assert.deepEqual([holidayDate(CO_HOLIDAYS.find((h) => h.id === "ascension")!, 2026, easter).getUTCMonth(), holidayDate(CO_HOLIDAYS.find((h) => h.id === "ascension")!, 2026, easter).getUTCDate() + 0, 0], [4, 18, 0], "Ascensión must land on May 18, 2026");
}

console.log("country smoke: OK");
console.log("seasonal smoke: OK");
console.log(knownSeasonIds().join(", "));
