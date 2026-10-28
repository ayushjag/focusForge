# Deploy the first FocusForge pilot without a paid domain

This is a limited learning pilot, not an always-on production service. Start after the GitHub Actions checks pass for the commit you plan to deploy.

## What runs where

```text
Browser -> Next.js web service on Render -> Fastify API on Render -> Neon PostgreSQL
Chrome extension -----------------------> Fastify API on Render
```

Use free plans only. Both Render web services receive HTTPS `onrender.com` addresses. No domain purchase is needed.

As checked on 2026-10-24, Render free web services share 750 instance-hours per workspace per month and sleep after 15 minutes without inbound traffic. Two services running constantly for one week consume 336 hours; running both constantly for a month exceeds the allowance. Extension polling can keep the API awake. Build minutes, bandwidth, and Neon quotas also apply. Check the dashboards during the pilot. Do not use artificial keep-alive traffic.

Neon currently offers a free PostgreSQL plan without a credit card. We use it instead of Render's expiring free database. Free offerings can change; confirm that each resource creation screen still says Free/$0. Stop if a required payment or upgrade appears.

## 1. Create the database

1. Sign up at https://neon.com/ using your own account. Keep the Free plan.
2. Create a project named `focusforge-pilot`; choose a region near the Render region you will use.
3. Obtain both the **pooled** and **direct (non-pooled)** PostgreSQL connection strings. Keep their TLS/SSL parameters. If the CLI is linked, `neon deploy` pulls both into the ignored root `.env.local`; see `neon-setup.md`.
4. Enter the pooled string into the backend service's `DATABASE_URL` setting and the direct string into `DATABASE_URL_UNPOOLED`. Do not put either value in a tracked file or chat.

No local Docker container is required for a deployed Neon database. Local Docker remains useful for development.

## 2. Deploy the API

Sign up at https://render.com/ and connect the FocusForge GitHub repository. Create a **Web Service** with these settings:

| Setting | Value |
| --- | --- |
| Root directory | `backend` |
| Runtime | Node |
| Branch | `main` |
| Plan | Free |
| Build command | `npm ci --include=dev && npm run db:generate && npm run build` |
| Start command | `npm run db:deploy && npm start` |
| Health-check path | `/api/health` |
| Auto-deploy | After CI Checks Pass |

Set environment variables in the service dashboard:

| Variable | Value |
| --- | --- |
| `NODE_VERSION` | `22` |
| `NODE_ENV` | `production` |
| `HOST` | `0.0.0.0` |
| `DATABASE_URL` | The pooled Neon connection string |
| `DATABASE_URL_UNPOOLED` | The direct Neon connection string for migrations |
| `JWT_SECRET` | A new random value, at least 32 characters |

Let Render supply `PORT`. Binding to `0.0.0.0` lets Render route traffic to the process; `127.0.0.1` would only accept connections from inside its own machine.

Use Render's secret generator if available, or generate a JWT secret locally:

```powershell
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

Copy that output directly into Render. Do not reuse the CI secret or the example `.env` value.

The build includes development packages because TypeScript and the Prisma CLI are needed. This pilot keeps Prisma installed so the start command can apply committed migrations before starting the server. Do not use `migrate dev`, `db push`, or the development seed in production.

After deployment, open the service's actual HTTPS address plus `/api/health`, then `/api/health/database`. Verify both return successful responses. Keep that actual API address for the next step.

## 3. Deploy the website

Create another Render **Web Service** from the same repository:

| Setting | Value |
| --- | --- |
| Root directory | `frontend` |
| Runtime | Node |
| Branch | `main` |
| Plan | Free |
| Build command | `npm ci --include=dev && npm run build` |
| Start command | `npm start -- --hostname 0.0.0.0` |
| Health-check path | `/login` |
| Auto-deploy | After CI Checks Pass |

Set `NODE_VERSION=22`, `NODE_ENV=production`, and `FOCUSFORGE_API_URL` to the API's actual HTTPS address without a trailing slash. Do not set `FOCUSFORGE_E2E`; it is for the separate test build. Keep database credentials and `JWT_SECRET` on the backend service.

This app needs a running Next.js server because it uses server-side auth cookies and proxy routes. Render's Static Site option cannot serve those routes.

## 4. Verify the website before distributing an extension

1. Register a new pilot account and sign in.
2. Create a task and add a blocked domain.
3. Start and end a short focus session.
4. Sign out and sign back in; confirm the task is still present.
5. Restart the API service and confirm the data is still present.
6. Check the browser network panel for HTTPS requests and inspect hosting logs for errors.

A sleeping service may take time to wake up. Report observed delays honestly to testers. If the free runtime cannot start the app reliably, stop and evaluate another free option rather than choosing a paid plan automatically.

### Prisma P1001 during startup

`npm run db:deploy && npm start` stops before the API starts if migrations cannot connect. The message "Prisma config detected, skipping environment variable loading" is normal: `prisma.config.ts` explicitly loads our environment, and Render injects its variables directly.

The shared environment loader adds `connect_timeout=15` to Neon database URLs when no explicit timeout exists. This applies to both application traffic and the direct migration connection. Prisma's default is five seconds, which can be too short for a cold Neon connection. Existing timeout settings, credentials, TLS options, and non-Neon URLs are preserved.

For an immediate dashboard-only change before deploying the code, append `&connect_timeout=15` to both database URL values if they already have a query string and no `connect_timeout` parameter. Keep the original URLs private. If they have no query string, use `?connect_timeout=15`.

P1001 is not proof of a cold start. If it persists, check the Neon endpoint state and hostname, verify both Render environment variables use current credentials, and inspect network restrictions. If Neon IP Allow is enabled, allow the Render service's documented outbound IP ranges; do not remove existing protections. A successful connection from a laptop does not prove reachability from Render.

Reference: https://www.prisma.io/docs/orm/v6/overview/databases/neon#resolving-connection-timeouts

## 5. Extension and onboarding checkpoint

The extension's production profile now targets `https://focusforge-4qb1.onrender.com` and synchronizes with `https://focus-forge-ruddy.vercel.app`. Version `0.8.0` can be reloaded from the source folder or packaged with `npm run build` from `extension`. A separate `npm run build:local` profile retains localhost development. Follow `extension-testing.md` to verify the deployed flow before inviting testers.

The setup/connection experience remains a later product milestone. The website's login cookie and extension's login token are separate, so users must sign into the same account in both places.

At a zero budget, willing testers can load an unpacked extension in Chrome Developer Mode. The Chrome Web Store requires a developer registration payment, so Store publishing is a later checkpoint. Do not represent manual installation as a Store release.

## 6. Invite testers only after a successful deployed session

Use `ci-and-deployment.md` for the one-week pilot plan. Ask for volunteers, explain manual installation and the free-host delays, and record feedback with their consent. No invitations are sent automatically by the app or CI.

## Sources

- https://render.com/docs/free
- https://render.com/docs/deploy-node-express-app
- https://render.com/docs/deploy-nextjs-app
- https://render.com/docs/deploys#deploy-after-ci-checks-pass
- https://neon.com/pricing
- https://developer.chrome.com/docs/webstore/register/
