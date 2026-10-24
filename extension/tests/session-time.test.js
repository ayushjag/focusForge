import assert from "node:assert/strict";
import test from "node:test";
import {
  formatRemainingTime,
  getRemainingMilliseconds,
} from "../services/session-time.js";

const activeState = (plannedEnd, clockOffsetMs = 0) => ({
  isFocusSessionActive: true,
  activeSession: { plannedEnd },
  clockOffsetMs,
});

test("getRemainingMilliseconds uses the backend clock offset", () => {
  const now = Date.parse("2026-10-21T10:00:00.000Z");
  const state = activeState("2026-10-21T10:25:00.000Z", 5_000);

  assert.equal(getRemainingMilliseconds(state, now), 25 * 60_000 + 5_000);
});

test("getRemainingMilliseconds never returns a negative value", () => {
  const now = Date.parse("2026-10-21T10:30:00.000Z");
  const state = activeState("2026-10-21T10:25:00.000Z");

  assert.equal(getRemainingMilliseconds(state, now), 0);
  assert.equal(getRemainingMilliseconds(null, now), 0);
});

test("formatRemainingTime supports minute and hour countdowns", () => {
  assert.equal(formatRemainingTime(24 * 60_000 + 36_000), "24:36");
  assert.equal(formatRemainingTime(60 * 60_000), "1:00:00");
  assert.equal(formatRemainingTime(0), "00:00");
});
