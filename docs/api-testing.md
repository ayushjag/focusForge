# FocusForge API Testing

Use this file to test each backend module as we complete it.

## Module 1: Health

Status: complete

Start the backend:

```powershell
cd D:\focusforge\backend
npm.cmd run dev
```

Postman request:

```text
GET http://127.0.0.1:5000/api/health
```

Expected response:

```json
{
  "success": true,
  "message": "FocusForge API is running"
}
```

You can also import this Postman collection:

```text
D:\focusforge\docs\postman\FocusForge.postman_collection.json
```

## Module 2: Database Foundation

Status: ready to test after Docker Desktop is running.

Start PostgreSQL:

```powershell
cd D:\focusforge
docker compose up -d
```

Generate the Prisma client and start the API:

```powershell
cd D:\focusforge\backend
npm.cmd run db:generate
npm.cmd run dev
```

Postman request:

```text
GET http://127.0.0.1:5000/api/health/database
```

Expected response:

```json
{
  "success": true,
  "message": "Database connection is healthy"
}
```

Useful Docker checks:

```powershell
cd D:\focusforge
docker compose ps
docker compose logs postgres
```

## Module 3: Core Database Models

Status: ready to migrate after Docker Desktop is running.

The models are:

- `User`: identity, email, timezone, and ownership of data
- `Task`: planned work, schedule, priority, and status
- `FocusSession`: actual focused work linked to a user and task

Create the first migration:

```powershell
cd D:\focusforge\backend
npm.cmd run db:migrate -- --name init_core_models
```

Postman request after the migration:

```text
GET http://127.0.0.1:5000/api/health/database/schema
```

Expected response:

```json
{
  "success": true,
  "data": {
    "userTable": true,
    "taskTable": true,
    "focusSessionTable": true
  }
}
```

## Next Module

## Module 4: Task CRUD API

Status: complete and ready to test.

Before testing, register or log in through the Authentication folder in Postman. It saves the access token automatically.

Start the API:

```powershell
cd D:\focusforge\backend
npm.cmd run dev
```

Every task request requires this header, which the Postman collection now supplies automatically:

```text
Authorization: Bearer <accessToken>
```

Available endpoints:

```text
POST   /api/tasks
GET    /api/tasks
GET    /api/tasks/:id
PATCH  /api/tasks/:id
DELETE /api/tasks/:id
```

Create-task request body:

```json
{
  "title": "Prepare FocusForge task API",
  "description": "Build and test the first task endpoint.",
  "priority": "HIGH",
  "scheduledStart": "2026-10-20T09:00:00.000Z",
  "scheduledEnd": "2026-10-20T10:00:00.000Z"
}
```

Import the Postman collection and run the requests in this order:

1. `POST Create Task`
2. `GET List Tasks`
3. `GET Task By ID`
4. `PATCH Update Task`
5. `DELETE Task`

`POST Create Task` automatically stores its returned task ID in the collection variable `taskId`.

## Module 5: Focus Session API

Status: complete and ready to test.

Use the access token from the Authentication folder:

```text
Authorization: Bearer <accessToken>
```

Available endpoints:

```text
POST /api/sessions/start
GET  /api/sessions
GET  /api/sessions/active
POST /api/sessions/:id/complete
POST /api/sessions/:id/cancel
```

Start-session request body:

```json
{
  "taskId": "{{taskId}}",
  "durationMinutes": 25
}
```

`durationMinutes` must be an integer from `1` to `480`. The backend generates
`actualStart` and `plannedEnd`; clients must not calculate authoritative session timestamps.

Test order in Postman:

1. Create a task using `POST Create Task`. It saves `taskId` automatically.
2. Run `POST Start Focus Session`. It saves `sessionId` automatically.
3. Run `GET Active Focus Session`.
4. Run `POST Complete Focus Session`.
5. Run `GET Focus Sessions`.

To test cancellation, start another session and use `POST Cancel Focus Session` before completing it.

Starting a second session while one is active returns:

```json
{
  "success": false,
  "error": {
    "code": "ACTIVE_SESSION_EXISTS"
  }
}
```

When `plannedEnd` passes, the next session-state or extension-state request marks the
session as `EXPIRED`, records `actualEnd` as `plannedEnd`, and returns no active session.
This lazy-expiration approach avoids introducing a background queue before it is needed.

## Module 6: Authentication and Authorization

Status: complete and ready to test.

Available endpoints:

```text
POST /api/auth/register
POST /api/auth/login
GET  /api/auth/me
```

`POST Register` and `POST Login` return an access token. The Postman collection saves it as `accessToken` and sends it automatically to protected Task and Focus Session APIs.

Protected endpoints return this response without a valid token:

```json
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED"
  }
}
```

## Module 7: Blocked Websites and Extension Sync

Status: complete and ready to test.

Available endpoints:

```text
POST   /api/blocked-websites
GET    /api/blocked-websites
PATCH  /api/blocked-websites/:id
DELETE /api/blocked-websites/:id
GET    /api/extension/blocking-state
```

Run these Postman requests in order:

1. `POST Add Blocked Website`. The response ID is saved as `blockedWebsiteId`.
2. `GET Blocked Websites`.
3. Run `POST Add Blocked Website` again to confirm duplicate protection returns `409`.
4. `PATCH Disable Blocked Website`, then `PATCH Enable Blocked Website`.
5. `GET Extension Blocking State` while no session is active. It returns an empty `blockedDomains` list.
6. Create a task and start a focus session.
7. Run `GET Extension Blocking State` again. It returns `youtube.com` in `blockedDomains`.
8. Complete or cancel the session, then run the sync request again.
9. `DELETE Blocked Website` after testing.

The create endpoint accepts a domain or full URL. For example,
`https://www.youtube.com/watch?v=example` is stored as `youtube.com`.

The backend now supplies the blocking state, but it cannot block Chrome by itself. The next module is a Manifest V3 Chrome extension that reads this endpoint and applies browser blocking rules.

## Module 8: Analytics Summary

Status: backend complete and connected to the dashboard.

1. Run **POST Login** in the Authentication folder to store your access token.
2. Run **GET Analytics Summary** in the Analytics folder: `GET {{baseUrl}}/api/analytics/summary`.
3. The response has seven `daily` rows, from the oldest date through today, in your account timezone. Add `?timezone=Asia/Kolkata` to use a different IANA timezone.
4. Complete a focus session, then run the request again. Its start date gains one `completedSessions` and its actual duration contributes to `focusMinutes`.
5. An expired or cancelled session increases its corresponding outcome count but adds no completed focus minutes.
6. Mark a task completed and run the request again. `tasks.completed` and `tasks.completionRate` update; `tasks.missed` counts tasks marked missed. These task counts cover all current tasks, not only the last seven days.
7. Try an invalid timezone such as `?timezone=Mars/Phobos`; expect `400 INVALID_TIMEZONE`. Remove the bearer token; expect `401 UNAUTHORIZED`.

Sessions are assigned to the calendar date on which they started in the selected timezone. A session crossing midnight is counted on its start date. `focusMinutes` is rounded to whole minutes after summing completed-session durations for each day. No analytics table or migration is required.

## Module 9: Real Web Proxy Integration

This test uses the running Next.js app, Fastify API, and PostgreSQL. It registers two unique temporary accounts, checks auth cookies, task ownership, analytics forwarding, and logout, then deletes only those test accounts. Run it against a local development database, not production.

Start PostgreSQL and the backend as above. In a second terminal, start the isolated frontend test server:

```powershell
cd D:\focusforge\frontend
npm.cmd run dev:e2e
```

In a third terminal, run:

```powershell
cd D:\focusforge\backend
npm.cmd run test:integration
```

The frontend test server listens on `http://127.0.0.1:3107` and forwards to `http://127.0.0.1:5000` by default. The integration test also checks that malformed encoded paths cannot escape the proxy allowlist. Stop the test frontend with Ctrl+C when done.
