/**
 * Smoke test for the self-healing decoration mount (mount.ts):
 * - an initial pinned miss falls back to the document header
 * - a late-registered shell header rail is picked up by the retries
 * - the fallback header is removed once the pinned install lands
 * - retries are bounded: after maxRetries the polling stops
 * - dispose stops polling and removes the fallback
 *
 * Run with:  npx tsx extensions/seasonal/smoke-mount.ts
 * (pure logic only: no pi-tui runtime import involved)
 */

import assert from "node:assert/strict";
import { mountDecoration, type MountHost, type PinnedAttempt } from "./mount.ts";

function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

interface Harness {
	host: MountHost;
	/** Simulate gentle-shell registering its shell-header rail late. */
	registerHeaderRail(): void;
	events: string[];
	attempts(): number;
	/** How many retry ticks consulted the rail state. */
	readyCalls(): number;
}

function createHarness(): Harness {
	const events: string[] = [];
	let railRegistered = false;
	let attemptCount = 0;
	let readyCallCount = 0;
	const failingAttempt: PinnedAttempt = {
		get installed() {
			return railRegistered;
		},
		dispose() {
			events.push("attemptDisposed");
		},
	};
	const host: MountHost = {
		tryPin(): PinnedAttempt {
			attemptCount++;
			return failingAttempt;
		},
		shellHeaderReady(): boolean {
			readyCallCount++;
			return railRegistered;
		},
		installFallback() {
			events.push("installFallback");
		},
		removeFallback() {
			events.push("removeFallback");
		},
	};
	return {
		host,
		registerHeaderRail: () => {
			railRegistered = true;
		},
		events,
		attempts: () => attemptCount,
		readyCalls: () => readyCallCount,
	};
}

async function main(): Promise<void> {
	// --- Boot race: first attempt misses, the late rail lands via retry ----------

	{
		const h = createHarness();
		const mounted = mountDecoration(h.host, { retryDelayMs: 10, maxRetries: 50 });
		assert.equal(mounted.pinned, false, "initial miss must not report pinned");
		assert.deepEqual(h.events, ["installFallback"], "the fallback header must be installed on the first miss");

		const before = h.attempts();
		h.registerHeaderRail();
		await sleep(80);
		assert.ok(h.attempts() > before, `the retry loop must keep trying (got ${h.attempts()} > ${before})`);
		assert.equal(mounted.pinned, true, "a late rail must be picked up by the retries");
		assert.ok(h.events.includes("removeFallback"), "the fallback header must be removed once pinned");
		assert.ok(h.events.includes("attemptDisposed"), "the failed attempt must be disposed on promotion");

		const pinned = h.attempts();
		mounted.dispose();
		await sleep(40);
		assert.equal(h.attempts(), pinned, "dispose must stop the retry loop");
		assert.deepEqual(h.events, ["installFallback", "attemptDisposed", "removeFallback", "attemptDisposed"], `unexpected event order: ${JSON.stringify(h.events)}`);
	}

	// --- Bounded retries: give up and keep the fallback when no rail appears -----

	{
		const h = createHarness();
		const mounted = mountDecoration(h.host, { retryDelayMs: 5, maxRetries: 3 });
		await sleep(60);
		const ticks = h.readyCalls();
		assert.ok(ticks >= 3, `expected at least 3 retry ticks, got ${ticks}`);
		await sleep(30);
		assert.ok(h.readyCalls() < ticks + 2, `retries must stop after maxRetries (got ${ticks}, then ${h.readyCalls()})`);
		assert.equal(h.attempts(), 1, `tryPin must not run while the rail is missing (got ${h.attempts()})`);
		assert.equal(mounted.pinned, false, "without a rail the mount stays on the fallback");
		mounted.dispose();
	}

	// --- Dispose while still waiting: timer stops, fallback removed --------------

	{
		const h = createHarness();
		const mounted = mountDecoration(h.host, { retryDelayMs: 10, maxRetries: 50 });
		await sleep(25);
		const attempts = h.attempts();
		mounted.dispose();
		await sleep(40);
		assert.ok(h.attempts() < attempts + 2, "dispose must stop the retry loop");
		assert.ok(h.events.includes("removeFallback"), "dispose must remove the fallback header");
	}

	// --- Immediate success: no fallback is ever installed -------------------------

	{
		let removals = 0;
		const mounted = mountDecoration(
			{
				tryPin: () => ({ installed: true, dispose() {} }),
				shellHeaderReady: () => true,
				installFallback: () => assert.fail("installFallback must not run when the first attempt succeeds"),
				removeFallback: () => {
					removals++;
				},
			},
			{ retryDelayMs: 5 },
		);
		assert.equal(mounted.pinned, true, "an immediate install must report pinned");
		await sleep(20);
		assert.equal(removals, 0, "no fallback cleanup when there was no fallback");
		mounted.dispose();
	}

	// --- Gated retries: while the rail is missing, tryPin is never called --------

	{
		const h = createHarness();
		const mounted = mountDecoration(h.host, { retryDelayMs: 5, maxRetries: 50 });
		await sleep(40);
		assert.ok(h.readyCalls() > 0, "the retry loop must be ticking");
		assert.equal(h.attempts(), 1, "tryPin must not run while the rail is missing");
		assert.equal(h.events.filter((e) => e === "attemptDisposed").length, 0, "with no promotions there is nothing to dispose");
		mounted.dispose();
	}

	console.log("mount smoke: OK");
}

main().catch((error) => {
	console.error(error);
	process.exit(1);
});