/**
 * Pure drawing engine for seasonal scenes.
 *
 * The canvas is a grid of cluster cells: empty (renders as a space), a
 * single-column glyph, or an emoji cluster (2 columns; its continuation cell
 * renders as ""). Width math happens ONLY at the cell level, before any ANSI
 * styling is applied — string-level width on styled lines would count escape
 * bytes and corrupt the output.
 */

export type ColorRef = string;
export type Cell = { ch: string; color: ColorRef } | null;
export type Canvas = Cell[][];

const VS16 = 0xfe0f;
const ZWJ = 0x200d;
/** BMP emoji with native emoji presentation (render 2 columns without VS16). */
const EMOJI_PRESENT = new Set([0x2728, 0x2b50]);

function codeWidth(cp: number, hasVS16: boolean): number {
	if (hasVS16) return 2;
	if (cp >= 0x1f000) return 2;
	if (EMOJI_PRESENT.has(cp)) return 2;
	return 1;
}

/** Split a string into display clusters (base glyph + attached VS16/ZWJ/VS16 chain). */
export function clusters(text: string): string[] {
	const cps = Array.from(text).map((c) => c.codePointAt(0) ?? 0);
	const out: string[] = [];
	const joiner = new Set<number>([VS16, ZWJ]);
	let current = "";
	for (let i = 0; i < cps.length; i++) {
		if (joiner.has(cps[i])) {
			current += String.fromCodePoint(cps[i]);
			// The chain's display width belongs to the base; keep accumulating.
			while (i + 1 < cps.length && joiner.has(cps[i + 1])) {
				i++;
				current += String.fromCodePoint(cps[i]);
			}
			continue;
		}
		if (current.length > 0) out.push(current);
		current = String.fromCodePoint(cps[i]);
	}
	if (current.length > 0) out.push(current);
	return out;
}

export function clusterWidth(cluster: string): number {
	const cps = Array.from(cluster).map((c) => c.codePointAt(0) ?? 0);
	const hasVS16 = cps.some((cp) => cp === VS16);
	return codeWidth(cps[0], hasVS16);
}

/** Pure string-based display width of a rendered scene line. */
export function widthOf(line: string): number {
	let width = 0;
	for (const cluster of clusters(line)) {
		width += clusterWidth(cluster);
	}
	return width;
}

export function createCanvas(width: number, height: number): Canvas {
	const canvas: Canvas = [];
	for (let row = 0; row < height; row++) {
		canvas.push(new Array<Cell>(width).fill(null));
	}
	return canvas;
}

/** Stamp a cluster at display column x, clearing cells it visually covers. */
export function put(canvas: Canvas, x: number, y: number, cluster: string, color: ColorRef): void {
	const row = canvas[y];
	if (!row) return;
	const w = clusterWidth(cluster);
	// Wide glyphs must fit both columns; slide left at the right edge.
	if (w === 2 && x >= row.length - 1) x = row.length - 2;
	if (x < 0 || x >= row.length) return;
	row[x] = { ch: cluster, color };
	if (w === 2) {
		// Emoji claims the next column; blank it so old glyphs don't show through.
		row[x + 1] = { ch: "", color };
	} else {
		// A single-column glyph must clear a wide neighbor it would overlap.
		if (row[x - 1] && clusterWidth(row[x - 1]!.ch) === 2) row[x - 1] = null;
		if (row[x + 1] && clusterWidth(row[x + 1]!.ch) === 2) row[x + 1] = null;
		else if (row[x + 1] && row[x + 1]!.ch === "") row[x + 1] = null;
	}
}

/** Stamp a multi-cluster sprite, skipping spaces; out-of-bounds cells are clipped. */
export function blit(canvas: Canvas, x: number, y: number, line: string, color: ColorRef): void {
	const row = canvas[y];
	if (!row) return;
	let cursor = x;
	for (const cluster of clusters(line)) {
		if (cluster === " ") {
			cursor += 1;
			continue;
		}
		put(canvas, cursor, y, cluster, color);
		cursor += clusterWidth(cluster);
	}
}

/** Terminal display width of one rendered canvas cell. */
function cellDisplayWidth(cell: Cell): number {
	if (!cell) return 1; // empty renders a space
	if (cell.ch === "") return 0; // emoji continuation
	let w = 0;
	for (const cluster of clusters(cell.ch)) w += clusterWidth(cluster);
	return w;
}

function rowDisplayWidth(row: Cell[]): number {
	return row.reduce((sum, cell) => sum + cellDisplayWidth(cell), 0);
}

/**
 * Paint canvas rows into styled terminal lines.
 *
 * When `exactDisplayWidth` is given, each line is padded with plain spaces
 * (after styling, never over ANSI bytes) so its display width matches the
 * widget width exactly. Overflow is impossible: scenes budget their emoji
 * capacity; callers treat it as an internal invariant.
 */
export function canvasToLines(
	canvas: Canvas,
	kit: { style(text: string, color: string): string },
	exactDisplayWidth?: number,
): string[] {
	return canvas.map((row) => {
		let line = row.map((cell) => {
			if (cell && cell.ch === "") return "";
			if (!cell) return " ";
			return kit.style(cell.ch, cell.color);
		}).join("");
		if (exactDisplayWidth !== undefined) {
			const pad = exactDisplayWidth - rowDisplayWidth(row);
			if (pad > 0) line += " ".repeat(pad);
		}
		return line;
	});
}

export function centerText(canvas: Canvas, y: number, text: string, color: ColorRef): void {
	const row = canvas[y];
	if (!row) return;
	const x = Math.max(0, Math.floor((row.length - widthOf(text)) / 2));
	blit(canvas, x, y, text, color);
}

/** Deterministic pseudo-random number in [0, 1) per integer seed. */
export function hash(seed: number): number {
	let x = (seed * 1103515245 + 12345) & 0x7fffffff;
	x ^= x >>> 15;
	x = (x * 998_244_353) & 0x7fffffff;
	x ^= x >>> 13;
	return (x & 0x7fffffff) / 0x80000000;
}