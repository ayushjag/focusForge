import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import app from "../../src/app.js";
import prisma from "../../src/lib/prisma.js";
import { addDays } from "../../src/shared/time/focus-time.js";

test("daily goal API persists targets, credits completed time, and isolates users", async () => {
  const email = `goals-${randomUUID()}@focusforge.test`;
  const secondEmail = `goals-${randomUUID()}@focusforge.test`;
  const password = `Test-${randomUUID()}-password`;

  try {
    assert.ok(["localhost", "127.0.0.1"].includes(new URL(process.env.DATABASE_URL ?? "").hostname));
    const register = async (address: string) => {
      const response = await app.inject({
        method: "POST", url: "/api/auth/register",
        payload: { email: address, password, timezone: "UTC" },
      });
      assert.equal(response.statusCode, 201);
      return response.json().data as { user: { id: string }; accessToken: string };
    };
    const first = await register(email);
    const second = await register(secondEmail);
    const authorization = `Bearer ${first.accessToken}`;
    const secondAuthorization = `Bearer ${second.accessToken}`;

    const empty = await app.inject({ method: "GET", url: "/api/goals/daily", headers: { authorization } });
    assert.equal(empty.statusCode, 200);
    assert.equal(empty.json().data.today.targetMinutes, null);

    const yesterday = addDays(new Date().toISOString().slice(0, 10), -1);
    await prisma.dailyGoalTarget.create({ data: { userId: first.user.id, effectiveDate: yesterday, targetMinutes: 20 } });
    const task = await prisma.task.create({ data: { userId: first.user.id, title: "Goal integration task" } });
    const actualStart = new Date(`${yesterday}T12:00:00.000Z`);
    await prisma.focusSession.create({
      data: {
        userId: first.user.id, taskId: task.id, plannedDurationMinutes: 20,
        plannedEnd: new Date(actualStart.getTime() + 20 * 60_000),
        actualStart, actualEnd: new Date(actualStart.getTime() + 20 * 60_000), status: "COMPLETED",
      },
    });

    const put = await app.inject({
      method: "PUT", url: "/api/goals/daily", headers: { authorization }, payload: { targetMinutes: 45 },
    });
    assert.equal(put.statusCode, 200);
    assert.equal(put.json().data.today.targetMinutes, 45);
    assert.equal(put.json().data.history.at(-2).targetMinutes, 20);
    assert.equal(put.json().data.history.at(-2).focusMinutes, 20);
    assert.equal(put.json().data.currentStreak, 1);
    const repeatedRead = await app.inject({
      method: "GET", url: "/api/goals/daily", headers: { authorization },
    });
    assert.equal(repeatedRead.json().data.history.at(-2).focusMinutes, 20);

    const secondGet = await app.inject({
      method: "GET", url: "/api/goals/daily?days=2", headers: { authorization: secondAuthorization },
    });
    assert.equal(secondGet.statusCode, 200);
    assert.equal(secondGet.json().data.today.targetMinutes, null);
    assert.equal(secondGet.json().data.history.at(-2).focusMinutes, 0);

    const update = await app.inject({
      method: "PUT", url: "/api/goals/daily", headers: { authorization }, payload: { targetMinutes: 30 },
    });
    assert.equal(update.statusCode, 200);
    assert.equal(update.json().data.history.at(-2).targetMinutes, 20);
    assert.equal(await prisma.dailyGoalTarget.count({ where: { userId: first.user.id } }), 2);
  } finally {
    await prisma.focusSession.deleteMany({ where: { user: { email: { in: [email, secondEmail] } } } });
    await prisma.user.deleteMany({ where: { email: { in: [email, secondEmail] } } });
    await app.close();
    await prisma.$disconnect();
  }
});
