/**
 * Self-healing mount for the pinned decoration.
 *
 * At `session_start` the seasonal widget renders before gentle-shell has
 * registered its shell-header rail (gentle-shell wires `parts.get("header")`
 * inside its own footer factory during the first full render). The first
 * pinned attempt then misses, and this module reintroduces the decoration by
 * retrying on a bounded interval until the rail appears, keeping the document
 * header (`ctx.ui.setHeader`) as the interim fallback and dropping it the
 * moment the pinned install lands.
 *
 * Pure orchestration with an injected host: no pi imports, so tests can fake
 * the whole race.
 */

export interface PinnedAttempt {
	/** True once the seasonal line is wired into the shell header row. */
	installed: boolean;
	dispose(): void;
}

export interface MountHost {
	/** Attempt to wire the seasonal line into the shell header rail. */
	tryPin(): PinnedAttempt;
	/** True once gentle-shell has registered its shell-header rail. */
	shellHeaderReady(): boolean;
	/** Install the scrolleable document-header fallback. */
	installFallback(): void;
	/** Remove the document-header fallback. */
	removeFallback(): void;
}

export interface MountedDecoration {
	/** Paints nothing; the pinned rail (or fallback header) does the work. */
	render(width: number): string[];
	invalidate(): void;
	dispose(): void;
	/** True once a retry landed on the shell header rail. */
	get pinned(): boolean;
}

export interface MountOptions {
	/** Interval between pinned-install retries after an initial miss. */
	retryDelayMs?: number;
	/** Give up after this many retries and keep the fallback header. */
	maxRetries?: number;
}

/**
 * Mount the decoration with bounded self-healing: while the first pinned
 * attempt missed, retry whenever the shell header rail becomes available, then
 * promote to it and clear the fallback.
 */
export function mountDecoration(host: MountHost, options?: MountOptions): MountedDecoration {
	const retryDelayMs = options?.retryDelayMs ?? 500;
	const maxRetries = options?.maxRetries ?? 60;

	let pinned = host.tryPin();
	let usingFallback = false;
	let retries = 0;
	let retryTimer: ReturnType<typeof setInterval> | undefined;

	function stopRetry(): void {
		if (retryTimer !== undefined) {
			clearInterval(retryTimer);
			retryTimer = undefined;
		}
	}

	if (!pinned.installed) {
		usingFallback = true;
		host.installFallback();
		retryTimer = setInterval(() => {
			if (host.shellHeaderReady()) {
				pinned.dispose();
				const attempt = host.tryPin();
				if (attempt.installed) {
					pinned = attempt;
					usingFallback = false;
					host.removeFallback();
					stopRetry();
					return;
				}
			}
			// The rail never arrived (plain Pi without gentle-shell, or a very
			// slow frame): stop polling and keep the document-header fallback.
			if (++retries >= maxRetries) stopRetry();
		}, retryDelayMs);
		(retryTimer as unknown as { unref?(): void }).unref?.();
	}

	return {
		render(): string[] {
			return [];
		},
		invalidate() {},
		dispose(): void {
			stopRetry();
			pinned.dispose();
			if (usingFallback) {
				usingFallback = false;
				host.removeFallback();
			}
		},
		get pinned(): boolean {
			return pinned.installed;
		},
	};
}