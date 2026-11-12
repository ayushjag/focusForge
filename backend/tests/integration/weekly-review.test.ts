import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import app from "../../src/app.js";
import prisma from "../../src/lib/prisma.js";
import { addDays } from "../../src/shared/time/focus-time.js";
import { completedWeekStart } from "../../src/modules/weekly-review/weekly-review.week.js";

test("weekly report and plan persist without leaking another user's data", async () => {
  assert.ok(["localhost", "127.0.0.1"].includes(new URL(process.env.DATABASE_URL ?? "").hostname));
  const firstEmail = `weekly-${randomUUID()}@focusforge.test`;
  const secondEmail = `weekly-${randomUUID()}@focusforge.test`;
  const password = `Test-${randomUUID()}-password`;
  try {
    const register = async (email: string) => {
      const response = await app.inject({
        method: "POST", url: "/api/auth/register",
        payload: { email, password, timezone: "UTC" },
      });
      assert.equal(response.statusCode, 201);
      return response.json().data as { user: { id: string }; accessToken: string };
    };
    const first = await register(firstEmail);
    const second = await register(secondEmail);
    const headers = { authorization: `Bearer ${first.accessToken}` };
    const otherHeaders = { authorization: `Bearer ${second.accessToken}` };
    const weekStart = completedWeekStart(new Date(), "UTC");
    const currentWeekStart = addDays(weekStart, 7);

    const createdTask = await app.inject({
      method: "POST", url: "/api/tasks", headers,
      payload: { title: "Weekly review task", status: "COMPLETED" },
    });
    assert.equal(createdTask.statusCode, 201);
    const taskId = createdTask.json().data.id as string;
    assert.ok(createdTask.json().data.completedAt);
    const reopened = await app.inject({
      method: "PATCH", url: `/api/tasks/${taskId}`, headers, payload: { status: "PENDING" },
    });
    assert.equal(reopened.statusCode, 200);
    assert.equal(reopened.json().data.completedAt, null);
    const completed = await app.inject({
      method: "PATCH", url: `/api/tasks/${taskId}`, headers, payload: { status: "COMPLETED" },
    });
    assert.equal(completed.statusCode, 200);
    assert.ok(completed.json().data.completedAt);
    await prisma.task.update({
      where: { id: taskId }, data: { completedAt: new Date(`${weekStart}T12:00:00Z`) },
    });
    await prisma.dailyGoalTarget.create({
      data: { userId: first.user.id, effectiveDate: weekStart, targetMinutes: 20 },
    });
    const actualStart = new Date(`${weekStart}T13:00:00Z`);
    await prisma.focusSession.create({
      data: {
        userId: first.user.id, taskId, plannedDurationMinutes: 25,
        plannedEnd: new Date(actualStart.getTime() + 25 * 60_000),
        actualStart, actualEnd: new Date(actualStart.getTime() + 25 * 60_000), status: "COMPLETED",
      },
    });

    const plan = await app.inject({
      method: "PUT", url: "/api/reports/weekly/plan", headers,
      payload: { weekStart: currentWeekStart, priorities: ["  Study joins  ", "Practice SQL"] },
    });
    assert.equal(plan.statusCode, 200);
    assert.deepEqual(plan.json().data.priorities, ["Study joins", "Practice SQL"]);
    const duplicate = await app.inject({
      method: "PUT", url: "/api/reports/weekly/plan", headers,
      payload: { weekStart: currentWeekStart, priorities: ["Same", "same"] },
    });
    assert.equal(duplicate.statusCode, 400);

    const report = await app.inject({ method: "GET", url: "/api/reports/weekly", headers });
    assert.equal(report.statusCode, 200);
    assert.equal(report.json().data.weekStart, weekStart);
    assert.equal(report.json().data.totals.focusMinutes, 25);
    assert.equal(report.json().data.totals.completedTasks, 1);
    assert.equal(report.json().data.totals.goalsMet, 1);
    assert.deepEqual(report.json().data.nextWeekPlan.priorities, ["Study joins", "Practice SQL"]);

    const other = await app.inject({ method: "GET", url: "/api/reports/weekly", headers: otherHeaders });
    assert.equal(other.statusCode, 200);
    assert.equal(other.json().data.totals.focusMinutes, 0);
    assert.equal(other.json().data.totals.completedTasks, 0);
    assert.deepEqual(other.json().data.nextWeekPlan.priorities, []);
    const invalidWeek = await app.inject({
      method: "GET", url: `/api/reports/weekly?weekStart=${currentWeekStart}`, headers,
    });
    assert.equal(invalidWeek.statusCode, 400);
  } finally {
    await prisma.focusSession.deleteMany({ where: { user: { email: { in: [firstEmail, secondEmail] } } } });
    await prisma.user.deleteMany({ where: { email: { in: [firstEmail, secondEmail] } } });
    await app.close();
    await prisma.$disconnect();
  }
});
