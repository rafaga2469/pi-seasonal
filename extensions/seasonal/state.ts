/**
 * Persistence for the decoration preference.
 *
 * Stored in the agent directory so it survives across sessions regardless of
 * how the package was installed (personal dir, git package, npm package):
 *   ~/.pi/agent/seasonal-pref.json
 *
 * `SEASONAL_STATE_PATH` overrides the location for isolated test runs, and
 * the legacy personal-dir location is still read for one-time migration.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

export interface SeasonalState {
	/** Decoration on or off. */
	mode: "on" | "off";
	/** Active season override, or null to follow the calendar. */
	override: string | null;
}

const DEFAULT_STATE: SeasonalState = { mode: "on", override: null };

const LEGACY_PATH = join(homedir(), ".pi", "agent", "extensions", "seasonal", "state.json");

function statePath(): string {
	return process.env.SEASONAL_STATE_PATH ?? join(homedir(), ".pi", "agent", "seasonal-pref.json");
}

function parse(raw: string): SeasonalState {
	const data = JSON.parse(raw);
	const mode = data?.mode === "off" ? "off" : data?.mode === "on" ? "on" : DEFAULT_STATE.mode;
	const override = typeof data?.override === "string" ? data.override : null;
	return { mode, override };
}

export function loadState(): SeasonalState {
	try {
		return parse(readFileSync(statePath(), "utf8"));
	} catch {
		try {
			// One-time migration from the personal-dir install.
			return parse(readFileSync(LEGACY_PATH, "utf8"));
		} catch {
			return { ...DEFAULT_STATE };
		}
	}
}

export function saveState(state: SeasonalState): void {
	try {
		writeFileSync(statePath(), JSON.stringify(state, null, "\t") + "\n", "utf8");
	} catch {
		// Decoration is cosmetic; losing a preference write must never break Pi.
	}
}