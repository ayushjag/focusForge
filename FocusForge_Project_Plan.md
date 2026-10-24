# FocusForge — Project Plan

## 1. Project Overview

**FocusForge** is a productivity platform that helps users follow through on commitments by scheduling focus sessions, blocking distracting websites through a browser extension, and tracking progress.

The goal is to build a real, interview-ready full-stack project while learning Docker and AWS through hands-on deployment.

## 2. Core Features

### Web application
- User registration and login
- Create, edit, schedule, and delete tasks
- Start and complete focus sessions
- View active and upcoming sessions
- Track completed and missed commitments
- Daily and weekly productivity analytics

### Chrome extension
- Select websites to block
- Synchronise active focus sessions with the backend
- Block configured websites during active sessions
- Display a custom blocking page
- Remove restrictions when a session ends

**Limitation:** Website blocking works only within the supported browser environment. Users may be able to disable the extension or use another browser. A normal website cannot independently block other websites or native applications.

## 3. Technology Stack

| Layer | Technology | Purpose |
|---|---|---|
| Frontend | Next.js + TypeScript | Dashboard and web interface |
| Styling | Tailwind CSS | Responsive UI |
| Backend | Node.js + Fastify + TypeScript (ES modules) | REST APIs and business logic |
| Database | PostgreSQL | Application data |
| ORM | Prisma | Database queries and migrations |
| Authentication | JWT + scrypt password hashing | User authentication and protected APIs |
| Validation | Fastify JSON Schema | Validate incoming data |
| API testing | Postman | Test endpoints |
| Website blocking | Chrome Extensions API | Browser website restrictions |
| Containers | Docker + Docker Compose | Package and run services |
| Cloud compute | AWS ECS Fargate | Run production containers |
| Load balancing | Application Load Balancer | Route HTTPS traffic to the API |
| Monitoring | AWS CloudWatch | Logs and monitoring |
| CI/CD | GitHub Actions | Automated testing and deployment |
| Optional storage | Amazon S3 | Object/file storage if needed |

Add Redis, queues, and other AWS services only when the application needs them.

## 4. High-Level Architecture

```text
                         User
                          |
                    Domain + HTTPS
                          |
                       Nginx
                          |
                +---------+---------+
                |                   |
             Next.js             Fastify API
                                    |
                                PostgreSQL

Chrome Extension <---- authenticated API ----> Fastify API
```

Docker will package the frontend and backend. PostgreSQL can run in a container for local development. For production, evaluate a managed database such as Amazon RDS and avoid exposing the database publicly.

### Agreed Engineering Approach

FocusForge will begin as a modular monolith. Each backend feature will keep its route, controller, service, schema, and types separate while sharing one Fastify application and one PostgreSQL database. We will complete and test one module before starting the next module.

Implementation order:

1. Complete the backend APIs and PostgreSQL data rules.
2. Build the Manifest V3 Chrome extension and verify the complete blocking workflow.
3. Build the web dashboard and analytics experience.
4. Add automated unit, integration, API, ownership, and failure-case tests.
5. Add production security, observability, CI/CD, and deployment.
6. Introduce Redis, queues, and additional AWS services only when a measured requirement justifies them.

Redis will not be added only to make the architecture look complex. PostgreSQL currently enforces the one-active-session rule. Redis may later be used for API rate limiting, short-lived caching of extension blocking state, distributed locks when multiple API instances require them, or pub/sub communication.

Background queues will be introduced when FocusForge has slow or retryable work such as email reminders, scheduled notifications, analytics aggregation, or report generation. API servers will enqueue jobs and separate worker processes will execute them. BullMQ with Redis is suitable for the first implementation; Amazon SQS can be evaluated for a managed production queue.

The initial production target will keep operations understandable: ECS Fargate for the API, Amazon RDS for PostgreSQL, CloudWatch for logs and alarms, and Secrets Manager for credentials. ElastiCache, SQS, SES, S3, and other AWS services will be added only with the features that need them. An EC2 deployment may still be completed first as a learning exercise before moving to managed container hosting.

For every module, we will follow the same company-style delivery cycle:

1. Define requirements and acceptance criteria.
2. Design the API contract and database changes.
3. Implement the module using the existing architecture.
4. Test successful, invalid, unauthorized, ownership, and concurrency cases.
5. Update Postman and project documentation.
6. Add automated tests before production deployment.
7. Deploy through CI/CD with migrations, logs, metrics, and rollback planning.
8. Measure real bottlenecks before introducing new infrastructure.

## 5. Development Roadmap

Estimated duration: **21–27 working days**, depending on experience and troubleshooting.

### Phase 1 — Backend Foundation (3–4 days)

#### Day 1: Project setup
- Create a GitHub repository named `focusforge`.
- Create a Fastify + TypeScript backend using ES modules.
- Configure environment variables.
- Add a health-check endpoint: `GET /api/health`.
- Test the endpoint with Postman.
- Understand Fastify, TypeScript, API endpoints, and the app/server entry points.

#### Day 2: Task APIs
Implement:
- `POST /api/tasks`
- `GET /api/tasks`
- `GET /api/tasks/:id`
- `PATCH /api/tasks/:id`
- `DELETE /api/tasks/:id`

Learn REST API design, request validation, CRUD operations, error handling, and HTTP status codes.

#### Day 3: Focus-session APIs
Implement:
- `POST /api/sessions/start`
- `POST /api/sessions/:id/complete`
- `GET /api/sessions`
- `GET /api/sessions/active`

Prevent conflicting sessions and enforce task/session ownership. Keep the server as the source of truth for timestamps.

#### Day 4: Authentication and security
- Implement local authentication with scrypt password hashing and JWTs.
- Verify JWT access tokens in the backend.
- Protect private endpoints.
- Validate ownership of tasks and sessions.
- Add consistent error responses.
- Test unauthenticated and unauthorized requests.

### Phase 2 - Chrome Extension (3-5 days)

- Build a Manifest V3 extension.
- Log in through the extension and store its token using Chrome extension storage.
- Synchronise focus-session and blocked-domain state with the backend.
- Apply and remove browser blocking rules while a session is active.
- Display a custom blocking page.
- Recover the correct state after Chrome or the service worker restarts.
- Request only necessary browser permissions and explain them clearly to users.

### Phase 3 - Frontend (4-5 days)

#### Frontend implementation order

1. Foundation and authentication: design tokens, reusable UI components, TanStack Query provider, Next.js route handlers, HttpOnly JWT cookie, login, registration, logout, and route protection.
2. Dashboard: responsive application shell backed by the existing task, session, and blocked-website APIs.
3. Work modules: task CRUD, focus-session controls, and blocked-website management.
4. Analytics: add a protected backend summary API and render real weekly focus and completion charts. Do not ship charts backed by hard-coded product data.
5. Hardening: accessibility, responsive visual checks, API tests, frontend tests, error recovery, and deployment configuration.

Frontend server state belongs in TanStack Query. Local component state handles menus, dialogs, and form UI. Redux should be added only if cross-page client-only state becomes complex enough to justify it. Browser requests go through Next.js route handlers, which read the JWT from an HttpOnly cookie and forward it to Fastify. This keeps the access token unavailable to browser JavaScript and avoids duplicating authentication headers throughout the UI.

Current checkpoint: foundation, authentication, secure API proxy, responsive dashboard shell, live dashboard reads, complete task management, focus-session controls, blocked-site management, and the protected seven-day analytics summary API are implemented. Task management includes create, edit, complete/reopen, search, filter, schedule, and delete workflows. Focus sessions include task selection, duration presets, start, synchronized countdown, progress, completion, cancellation, expiry refresh, and session history. Blocked-site management includes add, search, enable/pause, and remove controls. The dashboard uses the analytics API for seven-day completed focus time and session counts, plus an all-time task-outcome chart. Dashboard loading, error, stale-data, and retry states are explicit. Desktop and mobile Playwright workflow tests cover login, task creation/completion, focus start/finish, analytics retry, and unavailable workspace data. A real Next-to-Fastify integration test now covers cookies, task ownership, analytics forwarding, logout, and proxy path allowlisting using temporary accounts. Deployment configuration is the next separate checkpoint.

#### Day 5: Dashboard
- Sidebar navigation
- Today's task list
- Focus-time summary
- Upcoming sessions
- Completed-task count

#### Day 6: Task management
- Create, edit, and delete tasks
- Date and time selection
- Form validation
- Loading and error states

#### Day 7: Focus timer
- Start and end a session
- Display elapsed time
- Restore the correct state after a refresh
- Use server timestamps rather than trusting only the browser timer

#### Day 8: Authentication screens
- Login, registration, and logout
- Protected dashboard routes
- Authentication state handling

#### Day 9: Analytics
- Completed versus missed sessions
- Daily focus duration
- Weekly trends
- Task completion rate

### Phase 4 — Docker (3 days)

#### Day 1
- Learn images, containers, and Dockerfiles.
- Containerise the backend.

#### Day 2
- Containerise the frontend.
- Configure environment variables and networking.
- Learn volumes and persistence.

#### Day 3
- Configure Docker Compose.
- Run the services together.
- Verify service-to-service communication.
- Keep secrets out of images and source control.

Local development may use these services:
- Next.js frontend container
- Fastify backend container
- PostgreSQL container

### Phase 5 — AWS Deployment (5–6 days)

| Day | Practical task | Concepts |
|---|---|---|
| 1 | Configure appropriate IAM permissions | Least privilege, roles, policies |
| 2 | Launch EC2 and configure secure access | Compute, networking, security groups |
| 3 | Install Docker and deploy containers | Linux and cloud deployment |
| 4 | Configure Nginx, domain, and HTTPS | Reverse proxy, DNS, TLS |
| 5 | Configure application logs and monitoring | CloudWatch |
| 6 | Review security, costs, and recovery | Operations and troubleshooting |

Start with EC2 to learn how deployment works. Evaluate managed services such as Amazon RDS and Systems Manager after the fundamentals are clear.

### Phase 6 — CI/CD and Production Improvements (3–4 days)

- Configure GitHub Actions for automated tests.
- Automate deployment.
- Plan database migrations.
- Add health checks and error logging.
- Plan backups and recovery.
- Review authentication, authorization, and secrets.
- Document architecture and deployment steps.

## 6. Database Models — Initial Draft

Refine this design before implementing the full workflow.

### User
- `id`
- `authProviderId`
- `createdAt`

### Task
- `id`
- `userId`
- `title`
- `description`
- `scheduledStart`
- `scheduledEnd`
- `status`
- `createdAt`
- `updatedAt`

### FocusSession
- `id`
- `userId`
- `taskId`
- `actualStart`
- `actualEnd`
- `status`
- `createdAt`

Potential later models include `BlockedWebsite`, `UserPreferences`, and daily analytics data. Avoid storing analytics that can be reliably calculated until performance requires it.

## 7. Daily Working Method

For every feature:

1. **Understand** the concept and why the project needs it.
2. **Implement** a small piece of functionality.
3. **Test** it with Postman, the browser, or automated tests.
4. **Debug** errors instead of skipping them.
5. **Explain** the implementation as if answering an interview question.
6. **Commit** the working changes to Git.

Do not build the entire project at once. Complete and verify one milestone before moving on.

## 8. Day 1 — First Milestone

### Step 1: Create the repository
Create a GitHub repository named `focusforge`.

### Step 2: Set up the backend

Suggested initial structure:

```text
focusforge/
└── backend/
    ├── src/
    │   ├── routes/
    │   ├── controllers/
    │   ├── services/
    │   ├── middleware/
    │   ├── app.ts
    │   └── server.ts
    ├── prisma/
    ├── package.json
    └── tsconfig.json
```

Create only the files needed for the first working endpoint; add other modules when they are needed.

### Step 3: Add a health-check endpoint

`GET /api/health`

Expected response:

```json
{
  "success": true,
  "message": "FocusForge API is running"
}
```

Run the server locally and test the endpoint using Postman.

### Step 4: Be able to explain
- What Express does
- Why TypeScript is used
- The difference between `app.ts` and `server.ts`
- What an API endpoint is
- Why health checks are useful

**Stop at this milestone.** Once the backend starts and the health-check endpoint works, configure PostgreSQL and design the database.

## 9. AWS Cost and Security Notes

- Develop locally before provisioning cloud resources.
- Check current AWS pricing and account-specific Free Tier eligibility.
- Configure AWS Budgets and billing alerts.
- Stop or delete resources when they are not needed.
- Remember that stopped EC2 instances can still incur charges for attached storage and other resources.
- Use least-privilege IAM roles rather than long-lived root credentials.
- Never commit API keys, database passwords, or other secrets to Git.
- Do not expose PostgreSQL directly to the public internet.
- Use HTTPS for production traffic.

Useful official documentation:
- AWS Pricing Calculator: https://calculator.aws/
- AWS Budgets: https://aws.amazon.com/aws-cost-management/aws-budgets/
- Docker Documentation: https://docs.docker.com/
- Chrome Extensions documentation: https://developer.chrome.com/docs/extensions/
- Supabase Auth documentation: https://supabase.com/docs/guides/auth
- Prisma documentation: https://www.prisma.io/docs

## 10. Definition of Done

The project is ready to present when:
- The main task and focus-session flows work.
- Authentication and data ownership are enforced.
- Website blocking works in the supported browser setup.
- The app is containerised and deployed.
- HTTPS is configured.
- Logs and health checks are available.
- Automated tests run in CI.
- You can explain the architecture, security decisions, failures, trade-offs, and costs honestly.
