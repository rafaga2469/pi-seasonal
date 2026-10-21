/**
 * Seasonal scenes: hybrid emoji + ASCII art with ambient animation.
 *
 * Scenes draw into a cluster canvas from canvas.ts. Every scene declares an
 * EMOJI budget (worst-case emoji clusters per frame); the canvas gets
 * `width - budget` cluster columns so the rendered lines come out at exactly
 * `width` display columns (canvas cells + one extra terminal column per emoji).
 * Emoji sprites drift slightly left of their nominal display column; ambient
 * decoration tolerates it.
 */

import type { InlineSpriteDef, Kit, Season } from "./types.ts";
import { blit, canvasToLines, clusters, clusterWidth, createCanvas, hash, put, widthOf, type Canvas } from "./canvas.ts";

const TAU = Math.PI * 2;

// Emoji sprites kept as explicit escapes so glyphs stay legible and ASCII-clean.
const SPIDER_EMOJI = "\u{1F577}\uFE0F"; // 🕷️
const GHOST_EMOJI = "\u{1F47B}"; // 👻
const PUMPKIN_EMOJI = "\u{1F383}"; // 🎃
const BAT_EMOJI = "\u{1F987}"; // 🦇
const WEB_EMOJI = "\u{1F578}\uFE0F"; // 🕸️
const TREE_EMOJI = "\u{1F384}"; // 🎄
const GIFT_EMOJI = "\u{1F381}"; // 🎁
const STAR_EMOJI = "\u2B50"; // ⭐
const SPARKLE_EMOJI = "\u2728"; // ✨
const SNOW_EMOJI = "\u2744\uFE0F"; // ❄️
const FIREWORKS_EMOJI = "\u{1F386}"; // 🎆
const SPARKLER_EMOJI = "\u{1F387}"; // 🎇
const PARTY_EMOJI = "\u{1F389}"; // 🎉
const CONFETTI_EMOJI = "\u{1F38A}"; // 🎊
const MASK_EMOJI = "\u{1F3AD}"; // 🎭
const RABBIT_EMOJI = "\u{1F430}"; // 🐰
const EGG_EMOJI = "\u{1F95A}"; // 🥚
const TULIP_EMOJI = "\u{1F337}"; // 🌷
const SHAMROCK_EMOJI = "\u{1F340}"; // 🍀
const RAINBOW_EMOJI = "\u{1F308}"; // 🌈
const SKULL_EMOJI = "\u{1F480}"; // 💀
const CANDLE_EMOJI = "\u{1F56F}\uFE0F"; // 🕯️
const BLOSSOM_EMOJI = "\u{1F33C}"; // 🌼
const TOOLS_EMOJI = "\u{1F6E0}\uFE0F"; // 🛠️
const LOVE_LETTER_EMOJI = "\u{1F48C}"; // 💌
const BALLOON_EMOJI = "\u{1F388}"; // 🎈
const CHICK_EMOJI = "\u{1F423}"; // 🐣
const MONEY_BAG_EMOJI = "\u{1F4B0}"; // 💰
const CHAMPAGNE_EMOJI = "\u{1F37E}"; // 🥂
const BEER_EMOJI = "\u{1F37B}"; // 🍻
const SANTA_EMOJI = "\u{1F385}"; // 🎅
const SUNFLOWER_EMOJI = "\u{1F33B}"; // 🌻
const WRENCH_EMOJI = "\u{1F527}"; // 🔧
const GEAR_EMOJI = "\u2699\uFE0F"; // ⚙️
const BRIEFCASE_EMOJI = "\u{1F4BC}"; // 💼

/** Render helper: paint canvas rows and force exact display width. */
function render(canvas: Canvas, kit: Kit, width: number): string[] {
	return canvasToLines(canvas, kit, width);
}

/** Display columns a sprite glyph string occupies. */
function clusterWidths(emoji: string): number {
	return clusters(emoji).reduce((sum, c) => sum + clusterWidth(c), 0);
}

// ---------------------------------------------------------------------------
// Inline mode: ONE line per frame — banner centered plus animating sprites.
// ---------------------------------------------------------------------------

/** Distinct automatic drift speeds so every sprite moves at its own pace. */
const AUTO_SPEEDS = [0.5, 0.9, 1.2, 1.6, 0.7, 1.35, 0.6, 1.1, 0.8];

/**
 * Inline mode: ONE line of pure moving emoji — no label, every sprite bounces
 * back and forth across the full available width, staggered so they never
 * clump. Sprites budget their own capacity: canvas columns = width - sprite
 * count, so the padded line measures exactly the widget width.
 */
export function makeInline(
	sprites: InlineSpriteDef[],
	asciiAccent?: (canvas: Canvas, cols: number, frame: number) => void,
): Season["inline"] {
	return (width: number, frame: number, kit: Kit): string => {
		const budget = sprites.length;
		const cols = Math.max(8, width - sprites.reduce((sum, s) => sum + clusterWidths(s.emoji), 0));
		const canvas = createCanvas(cols, 1);
		// Drift window covers the whole line (sprites are 2 columns wide).
		const a = 0;
		const longest = Math.max(...sprites.map((s) => clusterWidths(s.emoji)), 1);
		const b = Math.max(a + 4, cols - longest - 2);
		const span = b - a;
		let i = 0;
		for (const sprite of sprites) {
			const speed = sprite.speed ?? AUTO_SPEEDS[i % AUTO_SPEEDS.length];
			// Staggered phase slots the sprites evenly along the wave.
			const phase = Math.floor((i * (span * 2)) / Math.max(2, sprites.length));
			const p = (frame * speed * 2 + phase) % (span * 2);
			const tri = p < span ? p : span * 2 - p;
			// Alternate the travel: even sprites run forward, odd ones backward.
			const travelled = i % 2 === 0 ? tri : span - tri;
			// Distinct speeds produce fractional positions; floor to a column.
			const spriteWidth = clusterWidths(sprite.emoji);
			const rightEdge = Math.max(a + 1, b - spriteWidth + 1);
			const x = Math.max(0, Math.min(rightEdge, a + Math.floor(travelled)));
			blit(canvas, x, 0, sprite.emoji, sprite.color);
			i++;
		}
		asciiAccent?.(canvas, cols, frame);
		return canvasToLines(canvas, kit, width)[0] ?? "";
	};
}

// ---------------------------------------------------------------------------
// Halloween — spider on a thread, bobbing ghost, bat, pumpkin (budget 6)
// ---------------------------------------------------------------------------

function halloweenAmbient(width: number, frame: number, kit: Kit): string[] {
	const cols = Math.max(8, width - 6);
	const canvas = createCanvas(cols, 6);
	const t = frame / 24;

	// Corner cobwebs (ASCII texture) plus a hanging web emoji.
	for (const left of [true, false]) {
		const x0 = left ? 0 : cols - 5;
		blit(canvas, x0, 0, "\\ \\ \\", "web");
		blit(canvas, x0, 1, " \\ \\ ", "web");
		blit(canvas, x0, 2, "\\ \\ \\", "web");
	}
	put(canvas, Math.floor(cols / 2) - 1, 0, WEB_EMOJI, "web");

	// Spider drifting in the left third while descending a breathing thread.
	const spiderX = 1 + Math.floor(Math.abs(Math.sin(t)) * Math.max(1, cols * 0.45));
	const drop = 1 + Math.floor(((Math.sin(t * TAU) + 1) / 2) * 3); // 1..4 rows of thread
	for (let dy = 0; dy < drop; dy++) {
		put(canvas, spiderX + (dy % 2 === 0 ? 0 : 1), dy, "|", "web");
	}
	put(canvas, spiderX, drop, SPIDER_EMOJI, "purple");

	// Bobbing ghost mid-right.
	const bob = frame % 6 < 3 ? 1 : 0;
	const ghostX = Math.floor(cols * 0.55) + Math.floor(Math.sin(t * TAU) * Math.max(1, cols * 0.12));
	put(canvas, Math.max(1, Math.min(cols - 3, ghostX)), 1 + bob, GHOST_EMOJI, "snow");

	// Flapping bat.
	const bx = 2 + Math.floor(hash(frame * 7) * Math.max(1, cols - 10));
	put(canvas, bx, 4, frame % 2 === 0 ? BAT_EMOJI : ".", "flame");

	// Glowing pumpkin at the bottom right.
	put(canvas, cols - 3, 5, PUMPKIN_EMOJI, "orange");
	if (frame % 4 === 0) put(canvas, cols - 6, 5, SPARKLE_EMOJI, "gold");

	return render(canvas, kit, width);
}

// ---------------------------------------------------------------------------
// Día de los Muertos — papel picado, candles, skull, marigold (budget 4)
// ---------------------------------------------------------------------------

function muertosAmbient(width: number, frame: number, kit: Kit): string[] {
	const cols = Math.max(8, width - 4);
	const canvas = createCanvas(cols, 6);

	// Papel picado zigzag bunting.
	blit(canvas, 0, 0, "v~v~v~v~v~".repeat(Math.ceil(cols / 10) + 1).slice(0, cols), "purple");

	// Candles flickering on both sides.
	const flame = frame % 2 === 0;
	put(canvas, 4, flame ? 2 : 1, flame ? "(" : ")", "flame");
	put(canvas, 4, 3, CANDLE_EMOJI, "snow");
	put(canvas, cols - 6, flame ? 2 : 1, flame ? "(" : ")", "flame");
	put(canvas, cols - 6, 3, CANDLE_EMOJI, "snow");

	// Central sugar skull.
	put(canvas, Math.floor(cols / 2) - 1, 3, SKULL_EMOJI, "snow");

	// Marigold emoji drifting along the bottom; ASCII petals everywhere else.
	const mx = 2 + Math.floor(Math.abs(Math.sin(frame / 8)) * Math.max(1, cols - 10));
	put(canvas, mx, 5, BLOSSOM_EMOJI, "orange");
	for (let x = 2; x < cols; x += 5) {
		put(canvas, x, 5, "*", "orange");
	}

	return render(canvas, kit, width);
}

// ---------------------------------------------------------------------------
// Navidad — tree, twinkling star, gift, ❄️, snowfall, snowman (budget 4)
// ---------------------------------------------------------------------------

const SNOWMAN = [" _ ", "(o o)", "(_^_)", " /|\\"];

function navidadAmbient(width: number, frame: number, kit: Kit): string[] {
	const cols = Math.max(8, width - 4);
	const canvas = createCanvas(cols, 7);

	// Twinkling star over the tree, tree and gift on the right half.
	put(canvas, cols - 7, frame % 2 === 0 ? 0 : 1, frame % 2 === 0 ? STAR_EMOJI : SPARKLE_EMOJI, "gold");
	put(canvas, cols - 7, 2, TREE_EMOJI, "lime");
	put(canvas, cols - 4, 5, GIFT_EMOJI, "red");

	// ASCII snowman on the left.
	blit(canvas, 2, 2, SNOWMAN[0], "snow");
	blit(canvas, 2, 3, SNOWMAN[1], "snow");
	blit(canvas, 2, 4, SNOWMAN[2], "red");
	blit(canvas, 2, 5, SNOWMAN[3], "snow");

	// Snowfall: dense ASCII drift with ONE ❄️ flake drifting.
	for (let x = 0; x < cols; x++) {
		if ((x * 7 + frame * 3) % 4 < 2) {
			put(canvas, x, (x * 5 + frame * 2) % 7, frame % 2 === 0 ? "." : "`", "snow");
		}
	}
	const sx = 2 + Math.floor(Math.abs(Math.cos(frame / 9)) * Math.max(1, cols - 14));
	put(canvas, sx, 2, SNOW_EMOJI, "snow");

	return render(canvas, kit, width);
}

// ---------------------------------------------------------------------------
// Año Nuevo — fireworks at drifting centers, sparkle ground (budget 3)
// ---------------------------------------------------------------------------

function newyearAmbient(width: number, frame: number, kit: Kit): string[] {
	const cols = Math.max(8, width - 3);
	const canvas = createCanvas(cols, 5);
	const t = frame / 16;

	// Two fireworks: emoji flash while igniting, expanding ASCII ring while bursting.
	const centers = [
		{ x: Math.floor(cols * 0.25) + Math.floor(Math.sin(t * TAU) * cols * 0.05), y: 1 },
		{ x: Math.floor(cols * 0.7) + Math.floor(Math.cos(t * TAU) * cols * 0.05), y: 2 },
	];
	const colors = ["gold", "red", "blue", "pink"];
	centers.forEach((c, i) => {
		const phase = frame % 9;
		const color = colors[(i + frame) % colors.length];
		const x = Math.max(0, Math.min(cols - 3, c.x));
		if (phase < 3) {
			put(canvas, x, c.y, frame % 2 === 0 ? FIREWORKS_EMOJI : SPARKLER_EMOJI, color);
		} else {
			const r = phase - 2;
			const ch = r > 3 ? "." : r > 1 ? "+" : "o";
			for (const [dx, dy] of [[r, 0], [-r, 0], [0, Math.min(r, 2)], [0, -Math.min(r, 2)]] as const) {
				put(canvas, x + dx, Math.max(0, Math.min(4, c.y + dy)), ch, color);
				put(canvas, x - dx, Math.max(0, Math.min(4, c.y + dy)), ch, color);
			}
		}
	});

	// Sparkle along the ground.
	for (let x = 0; x < cols; x += 6) {
		if (hash(x + frame * 13) > 0.5) {
			const sparkle = frame % 3 === 0 && x > cols - 8;
			put(canvas, x, 4, sparkle ? SPARKLE_EMOJI : ".", "gold");
		}
	}

	return render(canvas, kit, width);
}

// ---------------------------------------------------------------------------
// San Valentín — emoji hearts pulsing and drifting (budget 2)
// ---------------------------------------------------------------------------

const HEARTS = ["\u2764\uFE0F", "\u{1F495}", "\u{1F496}"]; // ❤️ 💕 💖

function valentinesAmbient(width: number, frame: number, kit: Kit): string[] {
	const cols = Math.max(8, width - 2);
	const canvas = createCanvas(cols, 4);
	const t = frame / 20;

	// Two emoji hearts drift and swap size with the pulse.
	const pulse = frame % 8 < 4;
	const h1 = HEARTS[(frame >> 1) % HEARTS.length];
	put(canvas, 1 + Math.floor(Math.abs(Math.sin(t)) * Math.max(1, cols * 0.45)), pulse ? 0 : 1, h1, "red");
	put(
		canvas,
		cols - 4 - Math.floor(Math.abs(Math.cos(t)) * Math.max(1, cols * 0.3)),
		pulse ? 1 : 0,
		HEARTS[((frame >> 1) + 1) % HEARTS.length],
		"pink",
	);

	// Floating ASCII hearts.
	for (let x = 0; x < cols; x += 4) {
		if (hash(x * 3 + frame) > 0.7) put(canvas, x, (frame + x) % 4, pulse ? "v" : "^", "pink");
	}

	return render(canvas, kit, width);
}

// ---------------------------------------------------------------------------
// Carnaval — dense confetti, mask, party emojis (budget 3)
// ---------------------------------------------------------------------------

const CONFETTI_CHARS = ["*", "x", "+", "~", "o"];

function carnavalAmbient(width: number, frame: number, kit: Kit): string[] {
	const cols = Math.max(8, width - 3);
	const canvas = createCanvas(cols, 5);
	const colors = ["purple", "gold", "lime", "pink", "teal"];

	// Confetti rain.
	for (let x = 0; x < cols; x++) {
		if ((x * 5 + frame * 3) % 4 < 3) {
			const y = (x * 11 + frame * 5) % 5;
			const ch = CONFETTI_CHARS[(x + frame) % CONFETTI_CHARS.length];
			put(canvas, x, y, ch, colors[(x * 3 + frame) % colors.length]);
		}
	}

	// Center mask plus party emojis popping alternately on each side.
	put(canvas, Math.floor(cols / 2) - 1, 2, MASK_EMOJI, "purple");
	if (frame % 3 === 0) put(canvas, Math.max(2, Math.floor(cols / 4)), 1, frame % 6 === 0 ? PARTY_EMOJI : CONFETTI_EMOJI, "pink");
	if (frame % 3 === 1) put(canvas, Math.min(cols - 3, Math.floor((cols * 3) / 4)), 1, frame % 6 === 1 ? CONFETTI_EMOJI : PARTY_EMOJI, "gold");

	return render(canvas, kit, width);
}

// ---------------------------------------------------------------------------
// Semana Santa / Pascua — hopping bunny, eggs, tulips (budget 6)
// ---------------------------------------------------------------------------

function pascuaAmbient(width: number, frame: number, kit: Kit): string[] {
	const cols = Math.max(8, width - 6);
	const canvas = createCanvas(cols, 6);
	const t = frame / 10;

	// Bunny hopping back and forth with a small vertical hop.
	const direction = Math.sin(t * TAU);
	const bx = Math.floor(cols / 2) + Math.floor(direction * Math.max(2, cols * 0.3));
	const hop = Math.abs(direction) > 0.7 ? 1 : 0;
	put(canvas, Math.max(1, Math.min(cols - 3, bx)), 1 + hop, RABBIT_EMOJI, "snow");

	// Three eggs and two tulips along the bottom.
	for (const ex of [4, Math.floor(cols / 2) + 1, cols - 7]) {
		if (ex < cols - 2) put(canvas, ex, 4, EGG_EMOJI, "gold");
	}
	put(canvas, 1, 5, TULIP_EMOJI, "pink");
	put(canvas, cols - 4, 5, TULIP_EMOJI, "pink");

	// Grass line.
	blit(canvas, 0, 5, "w".repeat(cols), "lime");

	return render(canvas, kit, width);
}

// ---------------------------------------------------------------------------
// San Patricio — rainbow plus shamrock rain (budget 2)
// ---------------------------------------------------------------------------

function sanpatricioAmbient(width: number, frame: number, kit: Kit): string[] {
	const cols = Math.max(8, width - 2);
	const canvas = createCanvas(cols, 5);

	// Rainbow on the right.
	put(canvas, cols - 3, 0, RAINBOW_EMOJI, "gold");

	// Shamrock rain: an emoji shamrock plus ASCII sparkles.
	const ex = 2 + Math.floor(Math.abs(Math.sin(frame / 10)) * Math.max(1, cols - 12));
	put(canvas, ex, (frame >> 1) % 5, SHAMROCK_EMOJI, "lime");
	for (let x = 2; x < cols - 4; x++) {
		if ((x * 3 + frame) % 6 === 0) {
			put(canvas, x, (x * 7 + frame * 2) % 5, frame % 2 === 0 ? "@" : "*", "lime");
		}
	}

	return render(canvas, kit, width);
}

// ---------------------------------------------------------------------------
// Día del Trabajador — calm tools row (budget 1)
// ---------------------------------------------------------------------------

function trabajadorAmbient(width: number, frame: number, kit: Kit): string[] {
	const cols = Math.max(8, width - 1);
	const canvas = createCanvas(cols, 3);
	put(canvas, Math.floor(cols / 2) - 1, 0, TOOLS_EMOJI, "teal");
	for (let x = 4; x < cols - 4; x += 7) {
		put(canvas, x, 1, frame % 2 === 0 ? "@" : "o", "teal");
	}
	blit(canvas, 0, 2, "~".repeat(cols), "teal");
	return render(canvas, kit, width);
}

// ---------------------------------------------------------------------------
// Scene registry: id -> Season. Keys mirror the calendar definitions.
// ---------------------------------------------------------------------------

function buildSeason(
	def: { id: string; label: string; banner: string; color: string; intervalMs: number; height: number },
	ambient: (width: number, frame: number, kit: Kit) => string[],
	inline: Season["inline"],
): Season {
	return {
		id: def.id,
		label: def.label,
		banner: def.banner,
		color: def.color as Season["color"],
		intervalMs: def.intervalMs,
		height: def.height,
		ambient,
		inline,
	};
}

export const SCENES: Record<string, Season | undefined> = {
	halloween: buildSeason(
		{ id: "halloween", label: "Halloween", banner: "-=[ Halloween ]=-", color: "orange", intervalMs: 600, height: 6 },
		halloweenAmbient,
		makeInline([
			{ emoji: SPIDER_EMOJI, color: "purple" },
			{ emoji: GHOST_EMOJI, color: "snow" },
			{ emoji: PUMPKIN_EMOJI, color: "orange" },
			{ emoji: BAT_EMOJI, color: "flame", speed: 2 },
		]),
	),
	muertos: buildSeason(
		{
			id: "muertos",
			label: "Día de los Muertos",
			banner: "-=[ Día de los Muertos ]=-",
			color: "orange",
			intervalMs: 650,
			height: 6,
		},
		muertosAmbient,
		makeInline([
			{ emoji: CANDLE_EMOJI, color: "flame" },
			{ emoji: SKULL_EMOJI, color: "snow" },
			{ emoji: BLOSSOM_EMOJI, color: "orange" },
			{ emoji: SUNFLOWER_EMOJI, color: "gold" },
		]),
	),
	navidad: buildSeason(
		{ id: "navidad", label: "Navidad", banner: "-=[ Feliz Navidad ]=-", color: "red", intervalMs: 700, height: 7 },
		navidadAmbient,
		makeInline([
			{ emoji: SNOW_EMOJI, color: "snow" },
			{ emoji: TREE_EMOJI, color: "lime" },
			{ emoji: GIFT_EMOJI, color: "red" },
			{ emoji: SANTA_EMOJI, color: "red" },
		]),
	),
	newyear: buildSeason(
		{ id: "newyear", label: "Año Nuevo", banner: "-=[ ¡Feliz Año Nuevo! ]=-", color: "gold", intervalMs: 550, height: 5 },
		newyearAmbient,
		makeInline([
			{ emoji: FIREWORKS_EMOJI, color: "gold" },
			{ emoji: SPARKLER_EMOJI, color: "pink" },
			{ emoji: CHAMPAGNE_EMOJI, color: "gold" },
			{ emoji: CONFETTI_EMOJI, color: "pink", speed: 2 },
		], (canvas, cols, frame) => {
			// Twinkling ground sparkles along the line.
			for (let x = 1; x < cols - 1; x += 6) {
				if (hash(x * 3 + frame) > 0.55) put(canvas, x, 0, frame % 2 === 0 ? "." : "*", "gold");
			}
		}),
	),
	valentines: buildSeason(
		{ id: "valentines", label: "San Valentín", banner: "-=[ San Valentín ]=-", color: "pink", intervalMs: 800, height: 4 },
		valentinesAmbient,
		makeInline([
			{ emoji: HEARTS[0], color: "red" },
			{ emoji: HEARTS[1], color: "pink" },
			{ emoji: HEARTS[2], color: "pink", speed: 2 },
			{ emoji: LOVE_LETTER_EMOJI, color: "pink" },
		]),
	),
	carnaval: buildSeason(
		{ id: "carnaval", label: "Carnaval", banner: "-=[ ¡Carnaval! ]=-", color: "purple", intervalMs: 550, height: 5 },
		carnavalAmbient,
		makeInline([
			{ emoji: PARTY_EMOJI, color: "pink" },
			{ emoji: CONFETTI_EMOJI, color: "gold" },
			{ emoji: MASK_EMOJI, color: "purple", speed: 2 },
			{ emoji: BALLOON_EMOJI, color: "gold" },
		]),
	),
	pascua: buildSeason(
		{ id: "pascua", label: "Semana Santa / Pascua", banner: "-=[ Pascua ]=-", color: "gold", intervalMs: 800, height: 6 },
		pascuaAmbient,
		makeInline([
			{ emoji: RABBIT_EMOJI, color: "snow" },
			{ emoji: TULIP_EMOJI, color: "pink" },
			{ emoji: EGG_EMOJI, color: "gold", speed: 2 },
			{ emoji: CHICK_EMOJI, color: "gold" },
		]),
	),
	sanpatricio: buildSeason(
		{ id: "sanpatricio", label: "San Patricio", banner: "-=[ San Patricio ]=-", color: "lime", intervalMs: 700, height: 5 },
		sanpatricioAmbient,
		makeInline([
			{ emoji: SHAMROCK_EMOJI, color: "lime" },
			{ emoji: RAINBOW_EMOJI, color: "gold" },
			{ emoji: MONEY_BAG_EMOJI, color: "gold", speed: 2 },
			{ emoji: BEER_EMOJI, color: "gold" },
		]),
	),
	trabajador: buildSeason(
		{ id: "trabajador", label: "Día del Trabajador", banner: "-=[ Día del Trabajador ]=-", color: "teal", intervalMs: 900, height: 3 },
		trabajadorAmbient,
		makeInline([
			{ emoji: TOOLS_EMOJI, color: "teal" },
			{ emoji: WRENCH_EMOJI, color: "teal", speed: 2 },
			{ emoji: GEAR_EMOJI, color: "teal" },
			{ emoji: BRIEFCASE_EMOJI, color: "brown" },
		]),
	),
};

export function sceneById(id: string): Season | undefined {
	return SCENES[id];
}
