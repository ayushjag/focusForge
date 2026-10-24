# FocusForge Backend Architecture and Interview Guide

## 1. What We Are Building

FocusForge is a productivity and commitment-tracking platform. The core idea is simple: a user creates tasks, schedules focused work sessions, starts a session, and the system helps them stay accountable by tracking completion and synchronising active sessions with a browser extension that blocks distracting websites.

The first strong milestone is the backend. If the backend is designed well, the frontend and Chrome extension can both use the same reliable source of truth.

Current backend status:

- Runtime: Node.js with TypeScript
- Framework: Fastify
- Current endpoint: `GET /api/health`
- Planned database: PostgreSQL
- Planned ORM: Prisma
- Planned authentication: Supabase Auth or JWT verification middleware

## 2. Backend-First Development Strategy

Build the backend in small verified steps:

1. Health check and project structure
2. Environment configuration
3. Database schema
4. Task CRUD APIs
5. Focus-session APIs
6. Authentication and authorization
7. Blocked website APIs for the extension
8. Analytics APIs
9. Tests, Docker, deployment, and monitoring

Each step should be testable with Postman or automated tests before moving forward.

## 3. Recommended Backend Folder Structure

```text
backend/
  src/
    config/
      env.ts
    plugins/
      prisma.ts
      auth.ts
    modules/
      health/
        health.routes.ts
      tasks/
        task.routes.ts
        task.controller.ts
        task.service.ts
        task.schema.ts
      sessions/
        session.routes.ts
        session.controller.ts
        session.service.ts
        session.schema.ts
      blocked-websites/
        blockedWebsite.routes.ts
        blockedWebsite.controller.ts
        blockedWebsite.service.ts
        blockedWebsite.schema.ts
      analytics/
        analytics.routes.ts
        analytics.controller.ts
        analytics.service.ts
    middleware/
      requireAuth.ts
      errorHandler.ts
    utils/
      errors.ts
      date.ts
    app.ts
    server.ts
  prisma/
    schema.prisma
    migrations/
```

Use this structure when the project grows. Do not create empty folders only for decoration. Add each module when its first endpoint is implemented.

## 4. Architecture Pattern

Use a modular layered architecture.

```text
HTTP request
  -> route
  -> controller
  -> service
  -> repository/Prisma
  -> PostgreSQL
```

### Route Layer

Responsibilities:

- Define URL paths and HTTP methods
- Attach request/response schemas
- Attach authentication middleware
- Forward work to controllers

Example:

- `GET /api/tasks`
- `POST /api/tasks`
- `PATCH /api/tasks/:id`

### Controller Layer

Responsibilities:

- Read validated request data
- Read authenticated user context
- Call service methods
- Return HTTP status codes and response objects

Controllers should stay thin. Business rules do not belong here.

### Service Layer

Responsibilities:

- Enforce business rules
- Prevent invalid state transitions
- Check ownership rules
- Coordinate database queries
- Keep timestamps and session rules consistent

Examples:

- A user cannot start two active focus sessions at the same time.
- A user cannot update another user's task.
- A completed session cannot be completed again.

### Database Layer

Responsibilities:

- Store durable application data
- Enforce relations and constraints
- Support indexes for common queries

Use Prisma for type-safe queries and migrations.

## 5. Core Backend Modules and Features

## Health Module

Purpose: confirm that the API process is running.

Endpoints:

- `GET /api/health`

Response:

```json
{
  "success": true,
  "message": "FocusForge API is running"
}
```

Interview explanation:

- Health checks help load balancers, deployment scripts, and monitoring tools know whether the service is alive.
- A basic health check confirms the server process is running.
- A deeper health check can also verify database connectivity.

## Auth Module

Purpose: identify the user and protect private data.

Features:

- Register/login handled by Supabase Auth or a dedicated auth provider
- Backend verifies access tokens
- Protected routes require a valid user
- User ID is attached to the request context
- Ownership checks are enforced in every private module

Planned endpoints if auth is handled by the backend:

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`

If Supabase handles auth directly, the backend may only need:

- token verification middleware
- user profile sync
- protected route guards

Important rules:

- Never trust a user ID sent in the request body.
- Always read the user ID from the verified token.
- Never return another user's tasks, sessions, or blocked websites.

## User/Profile Module

Purpose: store app-specific user metadata that is not part of the auth provider.

Features:

- Create local profile after first login
- Store timezone
- Store productivity preferences
- Store default focus duration
- Store extension sync settings

Possible endpoints:

- `GET /api/users/me`
- `PATCH /api/users/me`

## Task Module

Purpose: manage planned work.

Features:

- Create a task
- List user's tasks
- View one task
- Edit task title, description, priority, and schedule
- Delete or archive task
- Mark task as pending, scheduled, completed, missed, or cancelled
- Filter by date, status, and priority

Endpoints:

- `POST /api/tasks`
- `GET /api/tasks`
- `GET /api/tasks/:id`
- `PATCH /api/tasks/:id`
- `DELETE /api/tasks/:id`

Important business rules:

- A task belongs to exactly one user.
- Only the owner can read or change it.
- A task can have zero or many focus sessions.
- Deleting a task with session history should usually archive it instead of hard deleting it.

## Focus Session Module

Purpose: track real focused work.

Features:

- Start a session for a task
- Complete a session
- Cancel a session
- Get current active session
- List session history
- Prevent overlapping active sessions
- Use server timestamps as the source of truth
- Store the planned duration and planned ending time
- Expire elapsed sessions during session-state reads

Endpoints:

- `POST /api/sessions/start`
- `POST /api/sessions/:id/complete`
- `POST /api/sessions/:id/cancel`
- `GET /api/sessions`
- `GET /api/sessions/active`

Important business rules:

- A user can have only one active session.
- A session must belong to the authenticated user.
- A completed session cannot be restarted.
- Actual duration should be calculated from server timestamps.
- Duration must be an integer from 1 to 480 minutes.
- The backend calculates `plannedEnd`; clients do not submit authoritative timestamps.
- An elapsed active session becomes `EXPIRED` and uses `plannedEnd` as `actualEnd`.
- The browser timer is only a display tool, not the source of truth.

## Blocked Website Module

Purpose: store the websites the extension should block during active sessions.

Features:

- Add blocked websites
- Remove blocked websites
- Enable or disable individual websites
- Send active block list to the Chrome extension
- Keep blocking state tied to active focus sessions

Endpoints:

- `POST /api/blocked-websites`
- `GET /api/blocked-websites`
- `PATCH /api/blocked-websites/:id`
- `DELETE /api/blocked-websites/:id`
- `GET /api/extension/blocking-state`

Important business rules:

- Normalize domains before storing them.
- Do not allow invalid URLs or wildcard patterns unless they are intentionally supported.
- The extension should poll or sync with the backend to know whether blocking is active.

## Analytics Module

Purpose: convert raw task and session data into productivity insights.

Features:

- Daily focus duration
- Weekly focus duration
- Completed versus missed tasks
- Task completion rate
- Streak count
- Most productive day/time

Endpoints:

- `GET /api/analytics/summary` (implemented: protected seven-day daily and total summary)
- `GET /api/analytics/daily` (possible later endpoint)
- `GET /api/analytics/weekly` (possible later endpoint)
- `GET /api/analytics/streaks` (possible later endpoint)

Implementation decision:

- Start by calculating analytics from `Task` and `FocusSession` tables.
- Add precomputed analytics tables only if queries become slow.
- The summary uses the user's timezone by default and accepts an IANA timezone override. Only completed sessions contribute focus minutes; expired and cancelled sessions remain visible in outcome counts.

## Notification/Reminder Module

Purpose: remind users before scheduled sessions.

Features:

- Upcoming session reminders
- Missed session detection
- Email or push notification support later

Possible endpoints:

- `GET /api/reminders/upcoming`
- `PATCH /api/reminders/preferences`

Implementation decision:

- Start with frontend reminders.
- Add background jobs later for server-side reminders.

## 6. Initial Database Design

```text
User
  id
  authProviderId
  email
  timezone
  createdAt
  updatedAt

Task
  id
  userId
  title
  description
  priority
  scheduledStart
  scheduledEnd
  status
  createdAt
  updatedAt

FocusSession
  id
  userId
  taskId
  plannedDurationMinutes
  plannedEnd
  actualStart
  actualEnd
  status
  createdAt
  updatedAt

BlockedWebsite
  id
  userId
  domain
  enabled
  createdAt
  updatedAt

UserPreference
  id
  userId
  defaultFocusMinutes
  reminderMinutesBefore
  createdAt
  updatedAt
```

Recommended indexes:

- `Task(userId, status)`
- `Task(userId, scheduledStart)`
- `FocusSession(userId, status)`
- `FocusSession(userId, actualStart)`
- `FocusSession(status, plannedEnd)`
- `BlockedWebsite(userId, domain)`

Recommended constraints:

- `Task.userId` references `User.id`
- `FocusSession.userId` references `User.id`
- `FocusSession.taskId` references `Task.id`
- `BlockedWebsite.userId` references `User.id`
- Unique blocked website per user: `(userId, domain)`

## 7. API Design Rules

Use consistent REST conventions:

- `GET` reads data
- `POST` creates or triggers an action
- `PATCH` updates part of a resource
- `DELETE` deletes or archives a resource

Use consistent response shape:

```json
{
  "success": true,
  "data": {}
}
```

For errors:

```json
{
  "success": false,
  "error": {
    "code": "TASK_NOT_FOUND",
    "message": "Task not found"
  }
}
```

Common status codes:

- `200 OK`: request succeeded
- `201 Created`: resource created
- `400 Bad Request`: invalid input
- `401 Unauthorized`: missing or invalid token
- `403 Forbidden`: authenticated but not allowed
- `404 Not Found`: resource does not exist
- `409 Conflict`: business rule conflict, such as active session already exists
- `500 Internal Server Error`: unexpected server error

## 8. Security Decisions

Security rules to explain in interviews:

- Authentication verifies who the user is.
- Authorization verifies what that user can access.
- Every private query is scoped by `userId`.
- Secrets are stored in environment variables.
- Passwords are not stored by the FocusForge backend if Supabase Auth is used.
- Database is not exposed publicly.
- Production traffic uses HTTPS.
- Input validation protects the API from malformed requests.
- Rate limiting can protect login and write-heavy endpoints.

## 9. System Design for FocusForge

## High-Level System Design

```text
Web App / Chrome Extension
          |
          v
      HTTPS / API
          |
          v
   Fastify Backend
          |
          v
     PostgreSQL
```

Production deployment:

```text
User
  -> Domain + HTTPS
  -> Nginx reverse proxy
  -> Frontend container
  -> Backend container
  -> PostgreSQL or Amazon RDS
```

Future scalable deployment:

```text
Clients
  -> CDN
  -> Load Balancer
  -> Backend instances
  -> PostgreSQL primary database
  -> Redis cache
  -> Queue workers
  -> Object storage/logging/monitoring
```

## Main System Design Flows

### Start Focus Session

1. User clicks start session.
2. Frontend sends `POST /api/sessions/start`.
3. Backend verifies token.
4. Backend checks task ownership.
5. Backend checks there is no existing active session.
6. Backend creates a session with server timestamp.
7. Frontend starts displaying timer.
8. Extension reads active session and blocks configured websites.

### Complete Focus Session

1. User clicks complete.
2. Frontend sends `POST /api/sessions/:id/complete`.
3. Backend verifies ownership.
4. Backend sets `actualEnd` and `status = completed`.
5. Backend updates task status if needed.
6. Extension stops blocking websites.
7. Analytics can now include the session.

### Website Blocking

1. User configures blocked domains.
2. Extension requests active blocking state.
3. Backend returns whether a focus session is active.
4. Backend returns enabled blocked domains.
5. Extension blocks matching URLs locally in the browser.

Important limitation:

- The backend cannot directly block websites on the user's device.
- The Chrome extension performs browser-level blocking.
- A user can still bypass blocking by disabling the extension or using another browser.

## 10. Scalability Plan

Start simple:

- One backend service
- One PostgreSQL database
- Docker Compose locally
- EC2 deployment for learning

Scale only when needed:

- Add Nginx for reverse proxy and HTTPS
- Move PostgreSQL to Amazon RDS
- Add Redis for caching active session state
- Add background workers for reminders and missed-session processing
- Add a queue for notification jobs
- Add read replicas if analytics reads become heavy
- Add horizontal backend instances behind a load balancer

## 11. Reliability and Data Consistency

Potential problems:

- User starts multiple sessions from different devices.
- Browser timer and server time disagree.
- Extension loses network connection.
- User refreshes during a session.
- Session remains active forever if the user closes the browser.

Solutions:

- Enforce one active session per user in the backend.
- Use server timestamps for actual session timing.
- Fetch active session on frontend reload.
- Add session timeout rules.
- Add a scheduled job to mark stale sessions as expired.
- Make completion endpoint idempotent where practical.

## 12. Testing Strategy

Backend tests should cover:

- Health endpoint
- Task creation, update, deletion, and filtering
- Authentication middleware
- Ownership checks
- Starting a focus session
- Preventing overlapping active sessions
- Completing and cancelling sessions
- Blocked website validation
- Analytics calculations

Test levels:

- Unit tests for services
- Integration tests for API routes
- Database tests for Prisma queries
- Manual Postman tests while learning

## 13. Interview Questions They May Ask

## Project Explanation

Possible questions:

- What is FocusForge?
- Why did you build this project?
- What real problem does it solve?
- What are the main modules?
- What was the hardest part?
- What would you improve next?

Strong answer:

FocusForge is a full-stack productivity app where users schedule tasks, run focus sessions, track completion, and use a Chrome extension to block distracting websites during active sessions. I started with the backend because both the web app and extension need a reliable shared source of truth.

## Backend Questions

Possible questions:

- Why did you use Node.js and TypeScript?
- Why Fastify instead of Express?
- What is the difference between `app.ts` and `server.ts`?
- How do you structure routes, controllers, and services?
- How do you validate request data?
- How do you handle errors consistently?
- How do you prevent one user from accessing another user's data?

Key points:

- TypeScript catches many bugs before runtime.
- Fastify is lightweight, fast, schema-friendly, and good for typed APIs.
- `app.ts` builds the application; `server.ts` starts listening on a port.
- Services contain business logic.
- Authorization is enforced by scoping queries with authenticated `userId`.

## Database Questions

Possible questions:

- What tables are needed?
- What are the relationships?
- Why PostgreSQL?
- What indexes would you add?
- How would you handle deleting a task with old sessions?
- Would you store analytics or calculate them?

Key points:

- PostgreSQL is reliable for relational data.
- Tasks and sessions are naturally relational.
- Store raw facts first; calculate analytics initially.
- Add precomputed analytics only when performance requires it.
- Prefer archive/soft delete when historical sessions matter.

## Authentication and Security Questions

Possible questions:

- How does authentication work?
- What is authorization?
- Where do you store secrets?
- How do you protect APIs?
- How do you prevent token misuse?
- What are common security risks?

Key points:

- Authentication confirms identity.
- Authorization confirms access rights.
- Secrets belong in environment variables or secret managers.
- Verify tokens on protected routes.
- Never trust user IDs from request bodies.
- Use HTTPS in production.

## System Design Questions

Possible questions:

- Design FocusForge for 1 million users.
- How would you scale active session checks?
- How would the Chrome extension sync with the backend?
- How would you design reminders?
- How would you prevent duplicate active sessions?
- How would you handle analytics at scale?
- How would you deploy this system on AWS?

Key points:

- Start with a modular monolith.
- Scale horizontally behind a load balancer when traffic grows.
- Use PostgreSQL as the source of truth.
- Use Redis for frequently checked active session state if needed.
- Use a queue and worker for reminders.
- Use database constraints and transactions to prevent duplicate active sessions.
- Use CloudWatch or another monitoring system for logs and alerts.

## AWS/Deployment Questions

Possible questions:

- How would you deploy this project?
- Why Docker?
- What is the role of Nginx?
- How do you configure HTTPS?
- How do you manage environment variables?
- How do you monitor production?
- What AWS services would you use?

Key points:

- Docker makes local and production environments more consistent.
- Nginx routes traffic and can terminate HTTPS.
- EC2 is good for learning deployment fundamentals.
- RDS is better than self-managed PostgreSQL for production.
- CloudWatch can collect logs and metrics.
- AWS Budgets helps control cost.

## Chrome Extension Questions

Possible questions:

- Can a website block other websites?
- Why do you need a Chrome extension?
- How does the extension know when to block sites?
- What are the limitations?
- What permissions are needed?

Key points:

- A normal website cannot block other websites.
- Browser extension APIs are required for browser-level blocking.
- The extension syncs with backend active-session state.
- Blocking can be bypassed if the user disables the extension or switches browsers.
- Extension permissions should be minimal and clearly justified.

## Trade-Off Questions

Possible questions:

- Why not use microservices?
- Why not store analytics in a separate database?
- Why not use Redis from day one?
- Why not build frontend first?

Key points:

- A modular monolith is easier to build, test, and deploy at this stage.
- PostgreSQL is enough until analytics volume grows.
- Redis adds operational complexity before it is needed.
- Backend first gives the frontend and extension stable APIs.

## 14. General System Design Topics Interviewers Ask

Common topics:

- Requirements: functional and non-functional
- API design
- Database schema
- Indexing
- Authentication and authorization
- Caching
- Rate limiting
- Load balancing
- Horizontal scaling
- Background jobs
- Queues
- Consistency versus availability
- Idempotency
- Observability
- Failure handling
- Cost control
- Security

Common system design prompts:

- Design a task management system.
- Design a calendar scheduler.
- Design a notification system.
- Design an analytics dashboard.
- Design a URL blocker or parental-control system.
- Design a rate limiter.
- Design a logging and monitoring system.
- Design a system that supports multiple devices per user.

How to answer:

1. Clarify requirements.
2. Estimate traffic and data size.
3. Define APIs.
4. Design the database schema.
5. Draw high-level architecture.
6. Explain important flows.
7. Discuss scale, caching, queues, and failures.
8. Discuss security and monitoring.
9. Explain trade-offs honestly.

## 15. Backend Milestone Checklist

Milestone 1:

- `GET /api/health`
- Server starts locally
- TypeScript build passes

Milestone 2:

- Prisma installed
- PostgreSQL connected
- Initial schema created
- Migration runs successfully

Milestone 3:

- Task CRUD APIs
- Request validation
- Error handling
- Postman collection

Milestone 4:

- Focus session APIs
- Active session rule
- Complete/cancel flow
- Server timestamps

Milestone 5:

- Authentication middleware
- Protected routes
- Ownership checks

Milestone 6:

- Blocked website APIs
- Extension sync endpoint

Milestone 7:

- Analytics APIs
- Tests
- Dockerfile
- Deployment notes

## 16. Definition of Done for Backend

The backend is interview-ready when:

- It has clear modules and naming.
- Core APIs work end to end.
- Authentication protects private data.
- Ownership is enforced.
- Invalid input returns clear errors.
- Database schema has relationships and indexes.
- Tests cover important business rules.
- Docker can run the backend.
- Environment variables are documented.
- You can explain architecture, trade-offs, failure cases, and scaling.
