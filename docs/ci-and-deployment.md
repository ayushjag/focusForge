# Learning CI and deployment with FocusForge

## The sequence

1. Keep backend, frontend, and extension source in the root Git repository.
2. Run automated checks on GitHub for pushes and pull requests to `main`.
3. Deploy a passing commit to a hosting account and test it over HTTPS.
4. Configure an extension release for those deployed URLs.
5. Build and verify the extension setup/connection experience.
6. Invite a small test group and learn from their first week.

Complete and understand each checkpoint before moving to the next.

## What CI does

CI means continuous integration. GitHub runs `.github/workflows/ci.yml` on a fresh machine whenever you push to `main`, open/update a pull request targeting `main`, or run it manually from the Actions tab.

It does not deploy the app. A green result means the configured checks passed; it does not prove that every possible feature works.

| Workflow section | Meaning in this project |
| --- | --- |
| `on` | Events that start the checks. |
| `permissions` | The workflow can read source, but does not need to write to the repository. |
| `concurrency` | A newer run on the same branch cancels an older run to save time. |
| `jobs.checks` | One job running on a fresh Linux machine. |
| `services.postgres` | A disposable PostgreSQL 16 database created just for this job. |
| `env` | Local test URLs and fake credentials for that database. These are not production secrets. |
| `steps` | Commands run in order; a failed required command fails the job. |

Execution order:

```text
Check out source -> install Node 22 -> npm ci
  -> generate Prisma client -> apply committed migrations
  -> backend and extension tests -> backend build
  -> frontend lint and build -> install test browser
  -> start built servers -> real API integration test -> browser tests
```

`npm ci` installs the dependency versions recorded in `package-lock.json` and fails if the lock file disagrees with `package.json`. The extension uses Node's built-in test runner and has no packages to install.

`prisma generate` creates the database client used by the code. `prisma migrate deploy` applies existing migration files. CI must not use `migrate dev`, because it should verify committed migrations rather than create new ones.

The frontend is built and served in production mode for CI. `FOCUSFORGE_E2E=1` keeps its build in `.next-e2e`. Local development still uses `.next`.

The browser tests mock API responses and check UI workflows at desktop and mobile sizes. The separate integration test talks to the real Next server, Fastify server, and temporary database. It tests authentication cookies, account isolation, and proxy path validation. Both kinds of test are useful, but neither loads the Chrome extension itself. The extension currently has automated logic tests; live website blocking still needs the manual checks in `docs/extension-testing.md`.

The workflow waits for healthy servers before running tests, stops its server processes afterward, and saves logs/browser traces for three days on failure. No production accounts or database credentials are needed. Actions are pinned to verified release commits so their code cannot silently change with a moving tag.

## Your first learning exercise

1. Open the repository's **Actions** tab and select **FocusForge CI**.
2. Open the latest run and expand **Build and test**.
3. Match each displayed step to the YAML file.
4. Find the backend, extension, integration, and browser test counts in their logs.
5. If a step is red, read its first error and reproduce that command locally. Do not delete the failing check to make the run green.

Explain this aloud: "A push starts an isolated Linux job. It installs locked dependencies, builds our apps, and tests them against a disposable database. It never touches our production data."

For a practice failure, use a separate branch and change an expected value in an existing test. Open a pull request, observe the failed check, then undo that deliberate change and observe a passing run.

## Deployment checkpoint: zero-budget pilot

Follow `free-pilot-deployment.md` for the Render + Neon setup commands and environment settings. Actual deployment and the deployed extension check are still required.

No custom domain is required. Use provider-issued HTTPS addresses while learning. Do not provision paid infrastructure or add billing details just to continue this tutorial.

Hosting choices and their current limits must be checked before creating resources. A free learning pilot is different from a reliable commercial service. In particular:

- Render free web services sleep after inactivity and share a monthly free instance-hour allowance. A first request may be slow; extension polling also consumes active runtime.
- Vercel Hobby is limited to personal/non-commercial use. Do not assume it can host a commercial FocusForge launch for free.
- The Chrome Web Store requires a one-time developer registration payment. At a zero budget, the first testers must load an unpacked extension manually. That is a pilot installation method, not a Store launch.

Deployment requires your own hosting account access. Never paste passwords, private keys, or database connection strings into chat or commit them.

Before inviting testers, complete these checks:

- Database: use a hosted PostgreSQL instance, apply migrations, and confirm data persists across application restarts.
- API: bind to the host's required interface (`HOST=0.0.0.0`), use its assigned `PORT`, and set a new random `JWT_SECRET` and production `DATABASE_URL` in its secret settings.
- Web: set `FOCUSFORGE_API_URL` to the API's HTTPS address and verify registration, login, tasks, sessions, and logout.
- Extension: replace the local API address and localhost-only content-script matches with the deployed HTTPS origins in a release package; verify that web changes synchronize.
- Connection flow: distinguish extension not installed, signed out, wrong account, API unavailable, and successfully connected. Do not claim protection is active from the website's session status alone.
- Pilot: complete a short real blocking session before asking others to install.

## Pilot learning plan

Invite 10-15 willing students after the deployed flow works. No invitations have been sent yet. Record only information participants agree to share.

- Day 1: observe installation and the first completed focus session; note where help was needed.
- Days 2-6: ask whether they returned and what interrupted studying.
- Day 7: ask what they would miss if the app disappeared and what prevented repeat use.

Measure first-session completion, use on another day, failed connections, and the main reasons for abandoning setup. Session duration by itself is not proof that the user completed useful work.

## Official references

- GitHub Node CI: https://docs.github.com/en/actions/tutorials/build-and-test-code/nodejs
- PostgreSQL in Actions: https://docs.github.com/en/actions/tutorials/use-containerized-services/create-postgresql-service-containers
- Playwright CI: https://playwright.dev/docs/ci
- Render free limits: https://render.com/docs/free
- Vercel plan terms: https://vercel.com/legal/terms
- Chrome Web Store registration: https://developer.chrome.com/docs/webstore/register/
