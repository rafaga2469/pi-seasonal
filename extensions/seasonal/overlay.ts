/**
 * Celebration overlay: a bigger, faster seasonal animation shown on demand
 * with `/seasonal overlay`. Any key closes it; it also auto-closes after a
 * few seconds so it can never trap the user.
 */

import { visibleWidth } from "@earendil-works/pi-tui";
import type { TUI } from "@earendil-works/pi-tui";
import type { Season } from "./types.ts";
import { createKit, type HostKit } from "./widget.ts";

const AUTO_CLOSE_MS = 15_000;

export interface OverlayComponent {
	render(width: number): string[];
	handleInput?(data: string): void;
	invalidate(): void;
	dispose?(): void;
}

/** Factory for `ctx.ui.custom((tui, theme, keybindings, done) => ...)`. */
export function celebrationFactory(season: Season) {
	return (tui: TUI, theme: Parameters<typeof createKit>[0], _keybindings: unknown, done: (result?: unknown) => void): OverlayComponent => {
		return createCelebration(tui, season, createKit(theme), done);
	};
}

export function createCelebration(tui: TUI, season: Season, kit: HostKit, done: (result?: unknown) => void): OverlayComponent {
	let frame = 0;
	const interval = setInterval(() => {
		frame += 1;
		tui.requestRender();
	}, 90);

	const finish = () => {
		clearInterval(interval);
		done();
	};
	const auto = setTimeout(finish, AUTO_CLOSE_MS);

	return {
		handleInput(_data: string): void {
			clearTimeout(auto);
			finish();
		},
		render(width: number): string[] {
			const bannerLine = kit.style(season.banner, season.color);
			const labelLine = kit.style(`        ${season.label.toUpperCase()}`, season.color);
			const hint = kit.style("  [ presiona una tecla para cerrar ]  ", "web");
			return [
				centerStyled(bannerLine, width),
				"",
				centerStyled(labelLine, width),
				"",
				...season.ambient(Math.max(20, Math.min(width, 100)), frame, kit),
				"",
				centerStyled(hint, width),
			];
		},
		invalidate(): void {},
		dispose(): void {
			clearInterval(interval);
			clearTimeout(auto);
		},
	};
}

function centerStyled(text: string, width: number): string {
	const visible = visibleWidth(text);
	const pad = Math.max(0, Math.floor((width - visible) / 2));
	return " ".repeat(pad) + text;
}