/**
 * Shared types for the seasonal decoration extension.
 *
 * Scenes are pure functions over a `Kit`: they never import pi-tui or pi directly,
 * so the animation logic and art can be smoke-tested outside the Pi process.
 */

/** Named decoration colors. The host kit maps each name to a concrete terminal color. */
export type ColorKey =
	| "orange"
	| "purple"
	| "lime"
	| "red"
	| "gold"
	| "snow"
	| "blue"
	| "pink"
	| "teal"
	| "brown"
	| "flame"
	| "web";

/**
 * Style helper handed to scenes. Wraps text in the right ANSI for the host theme,
 * or passes through unchanged in tests.
 */
export interface Kit {
	style(text: string, color: ColorKey): string;
}

export interface Season {
	id: string;
	label: string;
	/** Banner text shown as the first widget line, styled with `color`. */
	banner: string;
	color: ColorKey;
	/** Ticks per animation frame. Ambient scenes stay between 500 and 1000 ms. */
	intervalMs: number;
	/** Draw one ambient animation frame for the given widget width. */
	ambient(width: number, frame: number, kit: Kit): string[];
	/** Total ambient canvas height, excluding the banner line. */
	height: number;
	/** Draw exactly ONE line for the given widget width (compact widget mode). */
	inline(width: number, frame: number, kit: Kit): string;
}