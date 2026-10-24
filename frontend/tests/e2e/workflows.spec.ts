import { expect, test, type Page, type Route } from "@playwright/test";

type Task = {
  id: string;
  title: string;
  description: string | null;
  priority: "LOW" | "MEDIUM" | "HIGH";
  status: "PENDING" | "COMPLETED";
  scheduledStart: null;
  scheduledEnd: null;
  createdAt: string;
};

const user = { id: "user-1", email: "tester@example.com", timezone: "UTC" };
const createdAt = "2026-10-20T08:00:00.000Z";

function task(title: string, id = "task-1"): Task {
  return { id, title, description: null, priority: "MEDIUM", status: "PENDING", scheduledStart: null, scheduledEnd: null, createdAt };
}

function summary() {
  const today = new Date();
  const daily = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(today.getTime() - (6 - index) * 86_400_000).toISOString().slice(0, 10);
    return { date, focusMinutes: index === 6 ? 35 : 0, activeSessions: 0, completedSessions: index === 6 ? 1 : 0, cancelledSessions: 0, expiredSessions: 0 };
  });
  return {
    period: { from: daily[0].date, through: daily[6].date, timezone: "UTC" },
    focusMinutes: 35,
    sessions: { active: 0, completed: 1, cancelled: 0, expired: 0 },
    tasks: { total: 1, completed: 0, missed: 0, completionRate: 0 },
    daily,
  };
}

function fulfill(route: Route, data: unknown, status = 200) {
  return route.fulfill({ status, contentType: "application/json", body: JSON.stringify(status >= 400 ? { success: false, message: String(data) } : { success: true, data }) });
}

async function mockApi(page: Page, initialTasks: Task[] = []) {
  const state = {
    tasks: [...initialTasks],
    sessions: [] as Record<string, unknown>[],
    active: null as Record<string, unknown> | null,
    failLogin: false,
    failAnalytics: false,
    failWorkspace: false,
    startedDuration: 0,
  };

  await page.route("**/api/**", async (route) => {
    const { pathname } = new URL(route.request().url());
    const method = route.request().method();
    const body = method === "GET" ? null : route.request().postDataJSON() as Record<string, unknown> | null;

    if (pathname === "/api/auth/login" && method === "POST") {
      return state.failLogin ? fulfill(route, "Invalid email or password", 401) : fulfill(route, user);
    }
    if (pathname === "/api/auth/me") return fulfill(route, user);
    if (state.failWorkspace && pathname.startsWith("/api/backend/")) return fulfill(route, "Service unavailable", 503);
    if (pathname === "/api/backend/tasks") {
      if (method === "GET") return fulfill(route, state.tasks);
      if (method === "POST") {
        const created = { ...task(String(body?.title), `task-${state.tasks.length + 1}`), priority: body?.priority } as Task;
        state.tasks.push(created);
        return fulfill(route, created, 201);
      }
    }
    if (pathname.startsWith("/api/backend/tasks/") && method === "PATCH") {
      const current = state.tasks.find((item) => item.id === pathname.split("/").at(-1));
      if (!current) return fulfill(route, "Task not found", 404);
      Object.assign(current, body);
      return fulfill(route, current);
    }
    if (pathname === "/api/backend/sessions/active" && method === "GET") return fulfill(route, state.active);
    if (pathname === "/api/backend/sessions" && method === "GET") return fulfill(route, state.sessions);
    if (pathname === "/api/backend/sessions/start" && method === "POST") {
      state.startedDuration = Number(body?.durationMinutes);
      const actualStart = new Date().toISOString();
      const session = {
        id: "session-1", taskId: body?.taskId, task: state.tasks[0],
        plannedDurationMinutes: state.startedDuration,
        plannedEnd: new Date(Date.now() + state.startedDuration * 60_000).toISOString(),
        actualStart, actualEnd: null, status: "ACTIVE",
      };
      state.active = session;
      state.sessions.unshift(session);
      return fulfill(route, session, 201);
    }
    if (pathname === "/api/backend/sessions/session-1/complete" && method === "POST") {
      const completed = { ...state.active, actualEnd: new Date().toISOString(), status: "COMPLETED" };
      state.active = null;
      state.sessions[0] = completed;
      return fulfill(route, completed);
    }
    if (pathname === "/api/backend/blocked-websites" && method === "GET") return fulfill(route, []);
    if (pathname === "/api/backend/analytics/summary" && method === "GET") {
      return state.failAnalytics ? fulfill(route, "Analytics unavailable", 503) : fulfill(route, summary());
    }
    return fulfill(route, "Unexpected API request", 404);
  });

  return state;
}

test("login shows an error, then opens the workspace", async ({ page }) => {
  const state = await mockApi(page);
  state.failLogin = true;
  await page.goto("/login");
  await page.getByLabel("Email address").fill("tester@example.com");
  await page.getByLabel("Password").fill("password123");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "Invalid email or password" })).toBeVisible();
  state.failLogin = false;
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByText("Your work, at a glance.")).toBeVisible();
});

test("creates and completes a task", async ({ page }) => {
  const state = await mockApi(page);
  await page.goto("/tasks");
  await page.getByRole("button", { name: "New task" }).click();
  await page.getByLabel("Title").fill("Write API tests");
  await page.getByRole("button", { name: "Create task" }).click();
  await expect(page.getByRole("button", { name: "Complete Write API tests" })).toBeVisible();
  await page.getByRole("button", { name: "Complete Write API tests" }).click();
  await expect(page.getByRole("button", { name: "Mark Write API tests open" })).toBeVisible();
  expect(state.tasks[0].status).toBe("COMPLETED");
});

test("starts and finishes a focus session", async ({ page }) => {
  const state = await mockApi(page, [task("Prepare release")]);
  const hydrationErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error" && message.text().includes("Hydration failed")) hydrationErrors.push(message.text());
  });
  await page.goto("/focus");
  await page.getByRole("button", { name: "Start focus session" }).click();
  await expect(page.getByRole("button", { name: "Finish session" })).toBeVisible();
  expect(state.startedDuration).toBe(25);
  await page.getByRole("button", { name: "Finish session" }).click();
  await expect(page.getByRole("button", { name: "Start focus session" })).toBeVisible();
  expect(state.sessions[0].status).toBe("COMPLETED");
  expect(hydrationErrors).toEqual([]);
});

test("dashboard retries failed analytics without showing false totals", async ({ page }) => {
  const state = await mockApi(page, [task("Prepare release")]);
  state.failAnalytics = true;
  await page.goto("/dashboard");
  await expect(page.getByText("Activity could not be loaded.")).toBeVisible();
  await expect(page.getByRole("heading", { name: "-" })).toBeVisible();
  state.failAnalytics = false;
  await page.getByText("Activity could not be loaded.").locator("..").getByRole("button", { name: "Try again" }).click();
  await expect(page.getByRole("heading", { name: "35m" })).toBeVisible();
});

test("dashboard treats unavailable workspace data as unavailable", async ({ page }) => {
  const state = await mockApi(page);
  state.failWorkspace = true;
  await page.goto("/dashboard");
  await expect(page.getByText("Tasks could not be loaded.")).toBeVisible();
  await expect(page.getByText("Session status could not be loaded.")).toBeVisible();
  await expect(page.getByText("Site list could not be loaded")).toBeVisible();
  await expect(page.getByText("Activity could not be loaded.")).toBeVisible();
  await expect(page.getByText("Protection is active now")).toHaveCount(0);
});
