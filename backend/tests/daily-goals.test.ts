import assert from "node:assert/strict";
import test from "node:test";
import app from "../src/app.js";
import { buildDailyGoalSummary } from "../src/modules/daily-goals/daily-goal.summary.js";
import { creditedMillisecondsByDay } from "../src/shared/time/focus-time.js";

const completed = (start: string, end: string) => ({
  status: "COMPLETED",
  actualStart: new Date(start),
  actualEnd: new Date(end),
});

test("a new account has no target and a zero-filled history", () => {
  const summary = buildDailyGoalSummary({
    now: new Date("2026-10-24T12:00:00Z"), timezone: "UTC", targets: [], sessions: [], days: 7,
  });
  assert.equal(summary.today.targetMinutes, null);
  assert.equal(summary.today.remainingMinutes, null);
  assert.equal(summary.currentStreak, 0);
  assert.equal(summary.history.length, 7);
});

test("target changes keep earlier days intact and a missed day resets the streak", () => {
  const summary = buildDailyGoalSummary({
    now: new Date("2026-10-24T12:00:00Z"), timezone: "UTC", days: 5,
    targets: [
      { effectiveDate: "2026-10-20", targetMinutes: 20 },
      { effectiveDate: "2026-10-22", targetMinutes: 45 },
      { effectiveDate: "2026-10-24", targetMinutes: 30 },
    ],
    sessions: [
      completed("2026-10-20T10:00:00Z", "2026-10-20T10:20:00Z"),
      completed("2026-10-21T10:00:00Z", "2026-10-21T10:20:00Z"),
      completed("2026-10-22T10:00:00Z", "2026-10-22T10:45:00Z"),
      completed("2026-10-24T10:00:00Z", "2026-10-24T10:15:00Z"),
      { status: "CANCELLED", actualStart: new Date("2026-10-24T11:00:00Z"), actualEnd: new Date("2026-10-24T11:30:00Z") },
    ],
  });
  assert.deepEqual(summary.history.map(({ targetMinutes, achieved }) => [targetMinutes, achieved]), [
    [20, true], [20, true], [45, true], [45, false], [30, false],
  ]);
  assert.equal(summary.today.focusMinutes, 15);
  assert.equal(summary.today.remainingMinutes, 15);
  assert.equal(summary.today.progressPercent, 50);
  assert.equal(summary.currentStreak, 0);
  assert.equal(summary.longestStreak, 3);
});

test("an unfinished today does not break yesterday's streak", () => {
  const summary = buildDailyGoalSummary({
    now: new Date("2026-10-24T12:00:00Z"), timezone: "UTC", days: 3,
    targets: [{ effectiveDate: "2026-10-22", targetMinutes: 10 }],
    sessions: [
      completed("2026-10-22T10:00:00Z", "2026-10-22T10:10:00Z"),
      completed("2026-10-23T10:00:00Z", "2026-10-23T10:10:00Z"),
    ],
  });
  assert.equal(summary.currentStreak, 2);
  assert.equal(summary.longestStreak, 2);
});

test("completed time is split at local midnight and cancelled time is ignored", () => {
  const summary = buildDailyGoalSummary({
    now: new Date("2026-10-22T19:00:00Z"), timezone: "Asia/Kolkata", days: 2,
    targets: [{ effectiveDate: "2026-10-22", targetMinutes: 10 }],
    sessions: [
      completed("2026-10-22T18:20:00Z", "2026-10-22T18:40:00Z"),
      { status: "EXPIRED", actualStart: new Date("2026-10-22T18:40:00Z"), actualEnd: new Date("2026-10-22T19:00:00Z") },
    ],
  });
  assert.deepEqual(summary.history.map(({ date, focusMinutes, achieved }) => [date, focusMinutes, achieved]), [
    ["2026-10-22", 10, true], ["2026-10-23", 10, true],
  ]);
  assert.equal(summary.currentStreak, 2);
});

test("day splitting respects a daylight-saving clock change", () => {
  const credited = creditedMillisecondsByDay([
    completed("2026-03-08T04:50:00Z", "2026-03-08T07:10:00Z"),
  ], "America/New_York");
  assert.equal(credited.get("2026-03-07"), 10 * 60_000);
  assert.equal(credited.get("2026-03-08"), 130 * 60_000);
});

test("daily goal routes require auth and reject invalid input", async () => {
  const unauthenticated = await app.inject({ method: "GET", url: "/api/goals/daily" });
  assert.equal(unauthenticated.statusCode, 401);

  const authorization = `Bearer ${app.jwt.sign({ id: "test-user" })}`;
  const badGoal = await app.inject({
    method: "PUT", url: "/api/goals/daily", headers: { authorization },
    payload: { targetMinutes: 0 },
  });
  assert.equal(badGoal.statusCode, 400);
  const badHistory = await app.inject({
    method: "GET", url: "/api/goals/daily?days=91", headers: { authorization },
  });
  assert.equal(badHistory.statusCode, 400);
});

test.after(async () => { await app.close(); });
