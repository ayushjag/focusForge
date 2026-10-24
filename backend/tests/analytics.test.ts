import assert from "node:assert/strict";
import test from "node:test";
import app from "../src/app.js";
import { buildAnalyticsSummary } from "../src/modules/analytics/analytics.summary.js";

test("summary groups sessions by the chosen timezone and counts completed focus time", () => {
  const summary = buildAnalyticsSummary({
    now: new Date("2026-10-22T22:00:00.000Z"),
    timezone: "Asia/Kolkata",
    totalTasks: 4,
    completedTasks: 1,
    missedTasks: 1,
    sessions: [
      { status: "COMPLETED", actualStart: new Date("2026-10-22T18:20:00.000Z"), actualEnd: new Date("2026-10-22T18:40:00.000Z") },
      { status: "COMPLETED", actualStart: new Date("2026-10-22T18:45:00.000Z"), actualEnd: new Date("2026-10-22T18:46:30.000Z") },
      { status: "COMPLETED", actualStart: new Date("2026-10-22T18:47:00.000Z"), actualEnd: new Date("2026-10-22T18:47:30.000Z") },
      { status: "EXPIRED", actualStart: new Date("2026-10-22T19:00:00.000Z"), actualEnd: new Date("2026-10-22T19:25:00.000Z") },
      { status: "CANCELLED", actualStart: new Date("2026-10-22T19:30:00.000Z"), actualEnd: new Date("2026-10-22T19:35:00.000Z") },
      { status: "COMPLETED", actualStart: new Date("2026-10-15T10:00:00.000Z"), actualEnd: new Date("2026-10-15T10:25:00.000Z") },
    ],
  });

  assert.deepEqual(summary.period, { from: "2026-10-17", through: "2026-10-23", timezone: "Asia/Kolkata" });
  assert.equal(summary.focusMinutes, 22);
  assert.deepEqual(summary.sessions, { active: 0, completed: 3, cancelled: 1, expired: 1 });
  assert.deepEqual(summary.tasks, { total: 4, completed: 1, missed: 1, completionRate: 25 });
  assert.equal(summary.daily.find((day) => day.date === "2026-10-22")?.focusMinutes, 20);
  assert.equal(summary.daily.find((day) => day.date === "2026-10-23")?.focusMinutes, 2);
});

test("summary returns seven zero-filled days for a new account", () => {
  const summary = buildAnalyticsSummary({
    now: new Date("2026-10-22T12:00:00.000Z"),
    timezone: "UTC",
    sessions: [],
    totalTasks: 0,
    completedTasks: 0,
    missedTasks: 0,
  });

  assert.equal(summary.daily.length, 7);
  assert.equal(summary.focusMinutes, 0);
  assert.equal(summary.tasks.completionRate, 0);
  assert.equal(summary.daily.every((day) => day.focusMinutes === 0), true);
});

test("analytics summary requires authentication", async () => {
  const response = await app.inject({ method: "GET", url: "/api/analytics/summary" });
  assert.equal(response.statusCode, 401);
  assert.equal(response.json().error.code, "UNAUTHORIZED");
});

test.after(async () => { await app.close(); });
