/**
 * Animated decoration widget (compact: one line).
 *
 * The widget is a component factory for `ctx.ui.setWidget(key, factory)`:
 * it renders exactly one seasonal line and ticks the frame counter on an
 * interval, asking the TUI to coalesce a render.
 */

import { rgbColor, truncateToWidth } from "@earendil-works/pi-tui";
import type { TUI } from "@earendil-works/pi-tui";
import type { Theme } from "@earendil-works/pi-coding-agent";
import type { Season } from "./types.ts";

export interface HostKit {
	style(text: string, color: string): string;
}

interface ThemeLike {
	style(text: string, options: { fg?: unknown }): string;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
	const n = parseInt(hex.replace("#", ""), 16);
	return { r: (n >> 16) & 0xff, g: (n >> 8) & 0xff, b: n & 0xff };
}

/** Palette for decoration colors, chosen to read on both dark and light themes. */
const PALETTE: Record<string, string> = {
	orange: "#ff9d2e",
	purple: "#b48cff",
	lime: "#67d17d",
	red: "#ff5f66",
	gold: "#ffd166",
	snow: "#dfe7f2",
	blue: "#7cc4ff",
	pink: "#ff9ecb",
	teal: "#5fd4c4",
	brown: "#c69a6d",
	flame: "#ffcf5f",
	web: "#9aa7b8",
};

/** Build the scene Kit on top of the host theme (truecolor/256 handled by the theme). */
export function createKit(theme: ThemeLike): HostKit {
	const cache = new Map<string, string>();
	return {
		style(text: string, color: string): string {
			let styled = cache.get(color + "|" + text);
			if (styled === undefined) {
				const hex = PALETTE[color] ?? PALETTE.web;
				const { r, g, b } = hexToRgb(hex);
				styled = theme.style(text, { fg: rgbColor(r, g, b) });
				cache.set(color + "|" + text, styled);
			}
			return styled;
		},
	};
}

export interface WidgetComponent {
	render(width: number): string[];
	invalidate(): void;
	dispose?(): void;
}

/**
 * Create the animated widget component.
 * @param tui the TUI, used to coalesce renders each tick
 * @param season active season scene
 * @param kit styled-text kit bound to the active theme
 */
export function createWidget(tui: TUI, season: Season, kit: HostKit): WidgetComponent {
	let frame = 0;
	let cache: { width: number; frame: number; lines: string[] } | null = null;

	const interval = setInterval(() => {
		frame += 1;
		cache = null;
		tui.requestRender();
	}, season.intervalMs);

	return {
		render(width: number): string[] {
			if (cache && cache.width === width && cache.frame === frame) return cache.lines;
			const lines = [truncate(season.inline(Math.max(12, width), frame, kit), width)];
			cache = { width, frame, lines };
			return lines;
		},
		invalidate(): void {
			cache = null;
		},
		dispose(): void {
			clearInterval(interval);
		},
	};
}

function truncate(line: string, width: number): string {
	return truncateToWidth(line, width);
}