import assert from "node:assert/strict";
import test from "node:test";
import app from "../src/app.js";
import { AppError } from "../src/shared/errors/app-error.js";
import { buildWeeklyReview } from "../src/modules/weekly-review/weekly-review.summary.js";
import {
  completedWeekStart, normalizePriorities, resolveReportWeekStart, validatePlanWeek,
} from "../src/modules/weekly-review/weekly-review.week.js";

const at = (value: string) => new Date(value);

test("weekly review uses the account's completed Monday-Sunday week", () => {
  const now = at("2026-11-02T03:00:00.000Z");
  assert.equal(completedWeekStart(now, "Asia/Kolkata"), "2026-10-26");
  assert.equal(completedWeekStart(now, "America/Los_Angeles"), "2026-10-19");
  assert.equal(resolveReportWeekStart(now, "Asia/Kolkata"), "2026-10-26");
  assert.equal(resolveReportWeekStart(now, "Asia/Kolkata", "2026-10-19"), "2026-10-19");
  for (const invalid of ["2026-11-02", "2026-10-27", "2026-02-30", "2026-10-2", "2020-01-06"]) {
    assert.throws(() => resolveReportWeekStart(now, "Asia/Kolkata", invalid), AppError);
  }
});

test("weekly review aligns minutes, goals, task completions, and session outcomes", () => {
  const result = buildWeeklyReview({
    timezone: "Asia/Kolkata",
    weekStart: "2026-10-26",
    sessions: [
      { status: "COMPLETED", actualStart: at("2026-10-19T06:00:00Z"), actualEnd: at("2026-10-19T06:30:00Z") },
      { status: "COMPLETED", actualStart: at("2026-10-26T06:00:00Z"), actualEnd: at("2026-10-26T06:20:00Z") },
      { status: "COMPLETED", actualStart: at("2026-10-28T06:00:00Z"), actualEnd: at("2026-10-28T06:50:00Z") },
      { status: "CANCELLED", actualStart: at("2026-10-28T08:00:00Z"), actualEnd: at("2026-10-28T08:10:00Z") },
      { status: "EXPIRED", actualStart: at("2026-10-29T08:00:00Z"), actualEnd: at("2026-10-29T08:05:00Z") },
      { status: "ACTIVE", actualStart: at("2026-10-30T08:00:00Z"), actualEnd: null },
    ],
    tasks: [
      { status: "COMPLETED", completedAt: at("2026-10-26T06:00:00Z") },
      { status: "COMPLETED", completedAt: at("2026-10-28T06:00:00Z") },
      { status: "PENDING", completedAt: at("2026-10-29T06:00:00Z") },
    ],
    targets: [
      { effectiveDate: "2026-10-19", targetMinutes: 20 },
      { effectiveDate: "2026-10-28", targetMinutes: 60 },
    ],
    priorities: ["Read chapter 3", "Practice SQL"],
  });

  assert.equal(result.weekEnd, "2026-11-01");
  assert.equal(result.days.length, 7);
  assert.deepEqual(result.days.map((day) => day.focusMinutes), [20, 0, 50, 0, 0, 0, 0]);
  assert.equal(result.days[0].targetMinutes, 20);
  assert.equal(result.days[0].goalMet, true);
  assert.equal(result.days[2].targetMinutes, 60);
  assert.equal(result.days[2].goalMet, false);
  assert.deepEqual(result.totals, {
    focusMinutes: 70, completedSessions: 2, cancelledSessions: 1,
    expiredSessions: 1, completedTasks: 2, goalsMet: 1,
  });
  assert.deepEqual(result.previousWeek, { focusMinutes: 30, deltaMinutes: 40, changePercent: 133 });
  assert.deepEqual(result.bestDay, { date: "2026-10-28", focusMinutes: 50 });
  assert.deepEqual(result.nextWeekPlan, {
    weekStart: "2026-11-02", priorities: ["Read chapter 3", "Practice SQL"],
  });
});

test("weekly review splits a session across local midnight at a daylight-saving boundary", () => {
  const result = buildWeeklyReview({
    timezone: "America/New_York", weekStart: "2026-10-26",
    sessions: [{
      status: "COMPLETED",
      actualStart: at("2026-11-01T03:50:00Z"),
      actualEnd: at("2026-11-01T04:20:00Z"),
    }],
    tasks: [], targets: [], priorities: [],
  });
  assert.equal(result.days[5].focusMinutes, 10);
  assert.equal(result.days[6].focusMinutes, 20);
  assert.equal(result.days[6].completedSessions, 1);
  assert.equal(result.totals.focusMinutes, 30);
});

test("empty weeks and zero-baseline comparisons are explicit", () => {
  const result = buildWeeklyReview({
    timezone: "UTC", weekStart: "2026-10-26",
    sessions: [], tasks: [], targets: [], priorities: [],
  });
  assert.equal(result.totals.focusMinutes, 0);
  assert.equal(result.totals.goalsMet, 0);
  assert.equal(result.previousWeek.changePercent, null);
  assert.equal(result.bestDay, null);
  assert.equal(result.days.every((day) => day.targetMinutes === null), true);
});

test("plans accept only the current week and up to three distinct priorities", () => {
  const now = at("2026-11-04T12:00:00Z");
  validatePlanWeek(now, "Asia/Kolkata", "2026-11-02");
  assert.throws(() => validatePlanWeek(now, "Asia/Kolkata", "2026-10-26"), AppError);
  assert.throws(() => validatePlanWeek(now, "Asia/Kolkata", "2026-11-09"), AppError);
  assert.deepEqual(normalizePriorities(["  Read chapter 3  ", "Practice SQL"]), ["Read chapter 3", "Practice SQL"]);
  assert.deepEqual(normalizePriorities([]), []);
  assert.throws(() => normalizePriorities([" "]), AppError);
  assert.throws(() => normalizePriorities(["Read", "read"]), AppError);
  assert.throws(() => normalizePriorities(["a", "b", "c", "d"]), AppError);
});

test("weekly routes require authentication and validate request shape", async () => {
  try {
    const anonymous = await app.inject({ method: "GET", url: "/api/reports/weekly" });
    assert.equal(anonymous.statusCode, 401);
    const token = app.jwt.sign({ userId: "test-user" });
    const headers = { authorization: `Bearer ${token}` };
    const malformed = await app.inject({
      method: "GET", url: "/api/reports/weekly?weekStart=tomorrow", headers,
    });
    assert.equal(malformed.statusCode, 400);
    const tooMany = await app.inject({
      method: "PUT", url: "/api/reports/weekly/plan", headers,
      payload: { weekStart: "2026-11-02", priorities: ["a", "b", "c", "d"] },
    });
    assert.equal(tooMany.statusCode, 400);
  } finally {
    await app.close();
  }
});
