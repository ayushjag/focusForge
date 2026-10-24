# FocusForge on Neon PostgreSQL

## What was connected

Only PostgreSQL is enabled in `neon.ts`. FocusForge retains its Fastify API, Prisma ORM, existing account authentication, and Next.js website. Neon does not host those application servers in this setup.

The workspace is linked locally to the selected Neon project and production branch. `.neon` and `.env.local` are ignored by Git. `neon deploy` reconciles the PostgreSQL-only policy and pulls:

- `DATABASE_URL`: pooled connection for the running API.
- `DATABASE_URL_UNPOOLED`: direct connection for schema migrations.
- `NEON_BRANCH`: metadata identifying the selected branch.

The Node.js backend is a long-running service. Prisma's existing PostgreSQL driver works with Neon; no edge/serverless driver replacement is required.

## How the environment is loaded

`backend/src/config/load-env.ts` loads values in this priority order:

1. Variables already injected into the process, such as Render's secret settings.
2. Workspace `.env.local`, normally written by Neon.
3. Workspace `.env`, if present.
4. `backend/.env`, preserving local fallback settings such as the development JWT secret.

When a database URL is selected, its direct migration URL comes from the same source. An explicitly injected database URL must not accidentally pick up another database's migration URL from a local file. If only one URL is supplied, it is used for both, preserving the existing local PostgreSQL workflow. For Neon deployments, supply both of Neon's URLs.

Prisma CLI loads the same environment via `backend/prisma.config.ts`. The Prisma datasource uses `DATABASE_URL` and `directUrl = env("DATABASE_URL_UNPOOLED")`.

Connecting Neon does not copy data from Docker. Register a new account against the Neon-backed app; accounts in your local Docker database are separate.

## Commands from the project root

```powershell
neon login
neon init -y --no-agent-setup --org-id org-curly-sun-01890509 --project-id tiny-wave-47718352 --branch production --services postgres
neon config plan
neon deploy
npm run db:generate
npm run db:deploy
npm run build
```

The first `init` attempt installed the Codex Neon plugin but failed on the optional GitHub Copilot plugin. `--no-agent-setup` skips repeating that tooling installation. If `neon` is not on your PATH yet, open a new terminal or use `npx neon@latest`.

`db:deploy` applies the existing migration files without resetting the database. `neon deploy` configures Neon services; it does not replace Prisma migrations or deploy the web/API servers to Render.

Start the built application in two terminals:

```powershell
npm run start:api
```

```powershell
npm run start:web
```

The default local website is http://localhost:3000 and API is http://127.0.0.1:5000. Docker is not required when the API uses Neon.

## Repeat the database smoke test

With both built servers running, from the root:

```powershell
npm run test:neon
```

This explicit test requires a Neon database and local API/web servers. It registers a unique temporary account through Next.js, verifies the auth cookie, creates a task, reads the persisted row through Prisma, adds a blocked domain, starts/completes a focus session, checks the extension state API, verifies analytics, and signs out. It then removes only its own temporary account and related records.

It does not load the actual Chrome extension or prove that a browser tab was redirected. Verify that separately with `docs/extension-testing.md`.

The normal integration suite still requires a local database. Its safety check has not been relaxed for Neon. CI uses its disposable PostgreSQL service; Neon credentials are not required there.

## Render settings

Follow `free-pilot-deployment.md` to host the application servers. Set both Neon database variables on the backend service and use a new production `JWT_SECRET`. The frontend service needs only the API's HTTPS URL, not database credentials.
