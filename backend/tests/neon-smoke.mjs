import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import prisma from "../dist/lib/prisma.js";

const webUrl = process.env.FOCUSFORGE_WEB_TEST_URL ?? "http://127.0.0.1:3000";
const apiUrl = process.env.FOCUSFORGE_API_URL ?? "http://127.0.0.1:5000";
const databaseUrl = new URL(process.env.DATABASE_URL ?? "");

assert.ok(databaseUrl.hostname.endsWith(".neon.tech"), "This explicit smoke test requires a Neon database");
for (const url of [webUrl, apiUrl]) {
  assert.ok(["127.0.0.1", "localhost"].includes(new URL(url).hostname), "Smoke tests require local app servers");
}

const email = `neon-smoke-${randomUUID()}@focusforge.test`;
const password = `Smoke-${randomUUID()}-password`;
let cookie;
let userId;

async function request(base, path, { method = "GET", body, token, withCookie = true } = {}) {
  const response = await fetch(new URL(path, base), {
    method,
    headers: {
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...(withCookie && cookie ? { Cookie: cookie } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
    redirect: "manual",
  });
  assert.ok(response.ok, `${method} ${path} returned ${response.status}`);
  return { response, payload: await response.json() };
}

try {
  assert.ok(databaseUrl.hostname.includes("-pooler"), "Application traffic must use Neon's pooled URL");
  const directUrl = new URL(process.env.DATABASE_URL_UNPOOLED ?? "");
  assert.ok(!directUrl.hostname.includes("-pooler"), "Migrations must use Neon's direct URL");
  const [{ database }] = await prisma.$queryRaw`SELECT current_database() AS database`;
  console.log(`PASS: connected to Neon PostgreSQL (${database}) using the pooled application URL`);

  const health = await request(apiUrl, "/api/health/database/schema", { withCookie: false });
  assert.equal(health.payload.success, true);

  const registered = await request(webUrl, "/api/auth/register", {
    method: "POST", body: { email, password, timezone: "UTC" },
  });
  userId = registered.payload.data.id;
  cookie = registered.response.headers.get("set-cookie")?.split(";")[0];
  assert.ok(cookie?.startsWith("focusforge_access_token="));
  assert.match(registered.response.headers.get("set-cookie"), /httponly/i);
  const me = await request(webUrl, "/api/auth/me");
  assert.equal(me.payload.data.id, userId);
  console.log("PASS: Next.js registration and authenticated HttpOnly cookie reach Fastify and Neon");

  const created = await request(webUrl, "/api/backend/tasks", {
    method: "POST", body: { title: "Verify Neon persistence", priority: "HIGH" },
  });
  const taskId = created.payload.data.id;
  const listed = await request(webUrl, "/api/backend/tasks");
  assert.ok(listed.payload.data.some((task) => task.id === taskId));
  const savedTask = await prisma.task.findUniqueOrThrow({ where: { id: taskId } });
  assert.equal(savedTask.userId, userId);
  console.log("PASS: task created through the website proxy is persisted and readable in Neon");

  await request(webUrl, "/api/backend/blocked-websites", {
    method: "POST", body: { domain: "youtube.com" },
  });
  const started = await request(webUrl, "/api/backend/sessions/start", {
    method: "POST", body: { taskId, durationMinutes: 1 },
  });
  assert.equal(started.payload.data.status, "ACTIVE");

  // The extension signs in directly to Fastify, separately from the web cookie.
  const login = await request(apiUrl, "/api/auth/login", {
    method: "POST", body: { email, password }, withCookie: false,
  });
  const token = login.payload.data.accessToken;
  const state = await request(apiUrl, "/api/extension/blocking-state", { token, withCookie: false });
  assert.equal(state.payload.data.isFocusSessionActive, true);
  assert.deepEqual(state.payload.data.blockedDomains, ["youtube.com"]);
  console.log("PASS: focus session and blocked domain are available through the extension state API");

  const sessionId = started.payload.data.id;
  await request(webUrl, `/api/backend/sessions/${sessionId}/complete`, { method: "POST" });
  const endedState = await request(apiUrl, "/api/extension/blocking-state", { token, withCookie: false });
  assert.equal(endedState.payload.data.isFocusSessionActive, false);
  assert.deepEqual(endedState.payload.data.blockedDomains, []);
  assert.equal((await prisma.focusSession.findUniqueOrThrow({ where: { id: sessionId } })).status, "COMPLETED");

  await request(webUrl, `/api/backend/tasks/${taskId}`, { method: "PATCH", body: { status: "COMPLETED" } });
  const analytics = await request(webUrl, "/api/backend/analytics/summary?timezone=UTC");
  assert.equal(analytics.payload.data.tasks.completed, 1);
  assert.equal(analytics.payload.data.sessions.completed, 1);
  console.log("PASS: completed task/session persisted in Neon and appeared in analytics");

  const logout = await request(webUrl, "/api/auth/logout", { method: "POST" });
  assert.match(logout.response.headers.get("set-cookie"), /^focusforge_access_token=;/);
  console.log("PASS: logout clears the web authentication cookie");
} catch (error) {
  // Report assertion failures without printing database connection strings.
  console.error("FAIL:", error instanceof Error ? error.message.replace(/postgres(?:ql)?:\/\/\S+/gi, "[REDACTED_DATABASE_URL]") : "Smoke test failed");
  process.exitCode = 1;
} finally {
  try {
    await prisma.user.deleteMany({ where: { email, ...(userId ? { id: userId } : {}) } });
    console.log("CLEANUP: removed this run's temporary account and related records");
  } finally {
    await prisma.$disconnect();
  }
}
