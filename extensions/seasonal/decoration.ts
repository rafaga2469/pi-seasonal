/**
 * Pinned top decoration via the gentle-pi fullscreen sidebar state.
 *
 * Pi has no pinned top slot. gentle-pi's fullscreen layout paints a full-width
 * "header" row above the transcript (its shell bar) from a part map stored on
 * the terminal via stable global symbols — designed for cross-module sharing.
 * We wrap that "header" part: the shell bar keeps rendering, and our seasonal
 * line is appended as the next row, pinned, full width.
 *
 * Without gentle-pi state the caller falls back to the scrolleable document
 * header (`ctx.ui.setHeader`), which is Pi's own header slot.
 */

import { createKit } from "./widget.ts";
import type { Season } from "./types.ts";

const SIDEBAR_STATE = Symbol.for("gentle-pi.experimental-sidebar.state");
const SIDEBAR_CACHE = Symbol.for("gentle-pi.experimental-sidebar.cache");
const HEADER_KEY = "header";

interface RailPart {
	render(width: number): string[];
	digest?(): string;
	handleMouse?(event: unknown): unknown;
	invalidate?(): void;
}

interface SidebarStateLike {
	parts: Map<string, RailPart>;
}

export interface PinnedDecoration {
	/** The anchor component for setWidget(); paints nothing in the dock. */
	render(width: number): string[];
	invalidate(): void;
	dispose(): void;
	/** True once the seasonal line is wired into the shell header row. */
	get installed(): boolean;
}

/**
 * Install the decorative line into the gentle-pi shell header row. Returns a
 * do-nothing anchor component plus the real wiring; `installed` reports
 * whether the shell part map was found.
 */
export function createPinnedDecoration(
	tui: { terminal?: unknown; requestRender(force?: boolean): void },
	theme: unknown,
	season: Season,
): PinnedDecoration {
	const terminal = tui.terminal as Record<symbol, unknown> | undefined;
	const state = terminal?.[SIDEBAR_STATE] as SidebarStateLike | undefined;
	const parts = state?.parts;
	const kit = createKit(theme as never);

	let frame = 0;
	let installed = false;

	if (parts) {
		let original = parts.get(HEADER_KEY);
		const part: RailPart = {
			digest: () => String(frame),
			render(width: number): string[] {
				const lines: string[] = [];
				if (original) {
					try {
						lines.push(...(original.render(width) ?? []));
					} catch {
						// A failing shell bar must not take the decoration down.
					}
				}
				lines.push(season.inline(width, frame, kit));
				return lines;
			},
			invalidate() {
				original?.invalidate?.();
			},
			handleMouse(event) {
				return original?.handleMouse?.(event);
			},
		};
		parts.set(HEADER_KEY, part);
		installed = true;

		const interval = setInterval(() => {
			frame++;
			// gentle-shell may re-register its bar over our wrapper; re-assert.
			const current = parts.get(HEADER_KEY);
			if (current !== part) {
				original = current ?? original;
				parts.set(HEADER_KEY, part);
			}
			const cache = terminal?.[SIDEBAR_CACHE] as { revision?: number } | undefined;
			if (cache && typeof cache.revision === "number") cache.revision++;
			tui.requestRender();
		}, season.intervalMs);
		(interval as unknown as { unref?(): void }).unref?.();

		return {
			render: () => [],
			invalidate() {},
			dispose(): void {
				clearInterval(interval);
				if (parts.get(HEADER_KEY) === part) {
					if (original) parts.set(HEADER_KEY, original);
					else parts.delete(HEADER_KEY);
				}
				try {
					tui.requestRender();
				} catch {}
			},
			get installed() {
				return installed;
			},
		};
	}

	// No shell part map: still return a usable anchor so the caller reports the
	// fallback path through `installed === false`.
	try {
		tui.requestRender();
	} catch {}
	return {
		render: () => [],
		invalidate() {},
		dispose() {},
		get installed() {
			return false;
		},
	};
}