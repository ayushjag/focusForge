import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import test from "node:test";

if (existsSync(".env")) process.loadEnvFile(".env");

const { default: prisma } = await import("../../src/lib/prisma.js");
const webUrl = process.env.FOCUSFORGE_WEB_TEST_URL ?? "http://127.0.0.1:3107";
const apiUrl = process.env.FOCUSFORGE_API_URL ?? "http://127.0.0.1:5000";

type ApiResult<T> = { response: Response; body: { success: boolean; data?: T; error?: { code: string }; message?: string } };

async function request<T>(path: string, init?: RequestInit): Promise<ApiResult<T>> {
  const response = await fetch(new URL(path, webUrl), {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
    redirect: "manual",
  });
  const body = await response.json();
  return { response, body };
}

const json = (value: unknown) => JSON.stringify(value);
const withCookie = (cookie: string, init?: RequestInit): RequestInit => ({
  ...init,
  headers: { Cookie: cookie, ...init?.headers },
});

test("Next auth cookie and proxy enforce account ownership through Fastify", async () => {
  for (const url of [webUrl, apiUrl, process.env.DATABASE_URL ?? ""]) {
    assert.ok(["localhost", "127.0.0.1"].includes(new URL(url).hostname), "Integration tests require local web, API, and database URLs");
  }

  const runId = randomUUID();
  const emails = [
    `integration-${runId}-a@focusforge.test`,
    `integration-${runId}-b@focusforge.test`,
  ];
  const password = `Test-${randomUUID()}-password`;

  try {
    const health = await fetch(new URL("/api/health/database/schema", apiUrl));
    assert.equal(health.status, 200, "Start the backend and PostgreSQL before integration tests");
    const loginPage = await fetch(new URL("/login", webUrl));
    assert.equal(loginPage.status, 200, "Start frontend npm run dev:e2e before integration tests");

    const anonymous = await request("/api/backend/tasks");
    assert.equal(anonymous.response.status, 401);
    assert.equal(anonymous.body.message, "Authentication required");

    const bearerOnly = await request("/api/backend/tasks", {
      headers: { Authorization: "Bearer not-a-cookie" },
    });
    assert.equal(bearerOnly.response.status, 401);

    const forbiddenRoot = await request("/api/backend/auth/me");
    assert.equal(forbiddenRoot.response.status, 404);

    const invalidLogin = await request("/api/auth/login", {
      method: "POST",
      body: json({ email: emails[0], password }),
    });
    assert.equal(invalidLogin.response.status, 401);
    assert.equal(invalidLogin.response.headers.get("set-cookie"), null);

    const cookies: string[] = [];
    const ids: string[] = [];
    for (const email of emails) {
      const registered = await request<{ id: string; email: string }>("/api/auth/register", {
        method: "POST",
        body: json({ email, password, timezone: "UTC" }),
      });
      assert.equal(registered.response.status, 200);
      assert.equal(registered.body.data?.email, email);
      assert.equal("accessToken" in registered.body, false);
      ids.push(registered.body.data!.id);

      const setCookie = registered.response.headers.get("set-cookie") ?? "";
      assert.match(setCookie, /^focusforge_access_token=/);
      assert.match(setCookie, /httponly/i);
      assert.match(setCookie, /samesite=lax/i);
      assert.match(setCookie, /path=\//i);
      cookies.push(setCookie.split(";")[0]);
    }

    const me = await request<{ id: string; email: string }>("/api/auth/me", withCookie(cookies[0]));
    assert.equal(me.response.status, 200);
    assert.equal(me.body.data?.id, ids[0]);

    const escapedRoot = await request("/api/backend/tasks/%252e%252e/auth/me", withCookie(cookies[0]));
    assert.equal(escapedRoot.response.status, 404, "Encoded dot segments must not escape the proxy allowlist");
    const encodedSeparator = await request("/api/backend/tasks/%252fapi%252fauth%252fme", withCookie(cookies[0]));
    assert.equal(encodedSeparator.response.status, 404);

    const created = await request<{ id: string; title: string }>("/api/backend/tasks", withCookie(cookies[0], {
      method: "POST",
      body: json({ title: "Proxy integration task", priority: "MEDIUM" }),
    }));
    assert.equal(created.response.status, 201);
    assert.equal(created.body.data?.title, "Proxy integration task");
    const taskId = created.body.data!.id;

    const ownTasks = await request<Array<{ id: string }>>("/api/backend/tasks", withCookie(cookies[0]));
    assert.equal(ownTasks.response.status, 200);
    assert.equal(ownTasks.body.data?.some((task) => task.id === taskId), true);

    const otherTasks = await request<Array<{ id: string }>>("/api/backend/tasks", withCookie(cookies[1]));
    assert.equal(otherTasks.response.status, 200);
    assert.equal(otherTasks.body.data?.some((task) => task.id === taskId), false);

    const otherTaskRead = await request(`/api/backend/tasks/${taskId}`, withCookie(cookies[1]));
    assert.equal(otherTaskRead.response.status, 404);

    const ownSummary = await request<{ tasks: { total: number } }>("/api/backend/analytics/summary", withCookie(cookies[0]));
    const otherSummary = await request<{ tasks: { total: number } }>("/api/backend/analytics/summary", withCookie(cookies[1]));
    assert.equal(ownSummary.response.status, 200);
    assert.equal(otherSummary.response.status, 200);
    assert.equal(ownSummary.body.data?.tasks.total, 1);
    assert.equal(otherSummary.body.data?.tasks.total, 0);
    const invalidTimezone = await request("/api/backend/analytics/summary?timezone=Mars%2FPhobos", withCookie(cookies[0]));
    assert.equal(invalidTimezone.response.status, 400);
    assert.equal(invalidTimezone.body.error?.code, "INVALID_TIMEZONE");

    const invalidCookie = await request("/api/backend/tasks", withCookie("focusforge_access_token=invalid"));
    assert.equal(invalidCookie.response.status, 401);
    assert.match(invalidCookie.response.headers.get("set-cookie") ?? "", /^focusforge_access_token=;/);

    const logout = await request("/api/auth/logout", withCookie(cookies[0], { method: "POST" }));
    assert.equal(logout.response.status, 200);
    const clearedCookie = (logout.response.headers.get("set-cookie") ?? "").split(";")[0];
    assert.equal(clearedCookie, "focusforge_access_token=");
    const afterLogout = await request("/api/auth/me", withCookie(clearedCookie));
    assert.equal(afterLogout.response.status, 401);
  } finally {
    await prisma.user.deleteMany({ where: { email: { in: emails } } });
    await prisma.$disconnect();
  }
});
