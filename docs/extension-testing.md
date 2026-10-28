# FocusForge Chrome Extension Testing

## Deployed Pilot (Version 0.7.0)

The source extension now targets the deployed services:

- Website: https://focus-forge-ruddy.vercel.app
- API: https://focusforge-4qb1.onrender.com

Update your existing installation:

1. Open `chrome://extensions` and reload the FocusForge card loaded from `D:\focusforge\extension`.
2. Refresh the open Vercel website tab so Chrome loads the updated content script.
3. Open the extension and confirm version `0.7.0`.
4. Sign in using the same account as on the deployed website. The website's HttpOnly login cookie is separate from the extension's token. Old localhost logins are not reused.
5. Add a site and start a focus session on the website. The popup should show the active session; navigating to the blocked domain should redirect to FocusForge.
6. Add another domain while the session is active, without pressing the extension's Refresh button. It should start blocking automatically.
7. Finish the session on the website and confirm the domain becomes available again.

Only the exact production website receives the content script; arbitrary Vercel preview deployments and localhost do not signal the production extension. The one-minute alarm remains a synchronization fallback.

Build a clean folder to share with a pilot tester:

```powershell
cd D:\focusforge\extension
npm run build
```

Load `extension/dist/production` through Chrome's **Load unpacked** option. Do not load both the source and packaged production copies in the same Chrome profile. This remains an unpacked pilot extension, not a Chrome Web Store release. No local backend or Docker is needed for the deployed profile.

For local development:

```powershell
npm run build:local
```

Load `extension/dist/local`, named **FocusForge Local**, and use the local backend on port 5000. Its login and cached state are stored separately from production. The historical module checks below describe this local development workflow; use the local package for those checks.

The source `config.js` and `manifest.json` are production defaults. The build script creates each profile without changing source files. Output under `extension/dist` is ignored by Git.

### Automated Deployed-Browser Verification

Install the frontend's existing Playwright development dependencies and its bundled Chromium (`npx playwright install chromium --no-shell` from `frontend`). Run `npm ci` in `extension` for its test-only PostgreSQL cleanup client, then run:

```powershell
npm run test:deployed
```

This opt-in test uses an isolated Chromium profile, the actual extension, the live Vercel website, and the Render API. It registers a temporary test account, verifies its matching Neon row, signs into the popup, starts a session, adds a blocked site through the web UI, verifies a real navigation is redirected, finishes the session, and verifies unblocking. It removes its own account and profile afterward. Root Neon credentials are required only for cleanup; they are never packaged in the extension. Screenshots are saved under ignored `extension/test-results/deployed`.

This live test is deliberately separate from CI's offline extension tests. It is not run against public services on every push. Free-host cold starts can delay the first request; wake the website/API and retry if the first connection fails.

If this machine's DNS cannot resolve the Neon cleanup hostname, an explicit `FOCUSFORGE_TEST_DNS_SERVER` can select a resolver for this test process only. The TLS connection still verifies the real Neon hostname. This does not change Windows DNS settings or how the packaged extension connects to the API.

## Step 1: Manifest and Popup

Status: ready to test.

1. Open Chrome and visit `chrome://extensions`.
2. Enable **Developer mode** in the top-right corner.
3. Select **Load unpacked**.
4. Choose `D:\focusforge\extension`.
5. Pin FocusForge from Chrome's Extensions menu.
6. Select the FocusForge extension icon.

The popup should show:

```text
Extension ready
The FocusForge background service is running.
```

To inspect the service worker, open `chrome://extensions`, find FocusForge, and select the **service worker** link. To inspect the popup, right-click inside it and select **Inspect**.

If a file changes, return to `chrome://extensions` and select the reload button on the FocusForge extension card.

This step does not connect to the backend or block websites yet. Those behaviors will be added and tested separately.

## Step 2: Extension Login

Status: ready to test.

Before testing, start PostgreSQL and the backend:

```powershell
cd D:\focusforge
docker compose up -d

cd D:\focusforge\backend
npm.cmd run dev
```

Then:

1. Open `chrome://extensions`.
2. Select reload on the FocusForge extension card. This is required because its manifest permissions changed.
3. Open the FocusForge popup.
4. Sign in with an account previously registered through Postman.
5. Close and reopen the popup. The account should remain connected.
6. Select **Sign out**. The login form should return.

Expected successful state:

```text
Account connected
Your FocusForge login is active.
```

Also verify these failure cases:

- An incorrect password displays `Invalid email or password`.
- A stopped backend displays `Cannot connect to the FocusForge API`.
- No password or access token is printed in the popup or service-worker console.

The extension stores the JWT and public user details in `chrome.storage.local`. It never stores the password. Website blocking is still intentionally disabled at this step.

## Step 3: Focus-State Synchronization

Status: ready to test.

1. Keep PostgreSQL and the backend running.
2. Reload FocusForge from `chrome://extensions` because the `alarms` permission was added.
3. Open the popup and sign in if necessary.
4. With no active focus session, confirm the popup shows `Session: Not active` and `Blocked sites: 0`.
5. In Postman, add and enable a blocked website.
6. Create a task and start a focus session using the same user account.
7. Open the popup and select **Refresh**.

Expected active state:

```text
Focus session active
Session: Active
Blocked sites: 1
```

Complete or cancel the focus session in Postman. Select **Refresh** again and confirm the popup returns to `Not active` and `0`.

The service worker also refreshes this state once every minute. This step verifies synchronization only; actual browser blocking is the next step.

## Step 4: Website Blocking

Status: ready to test.

1. Reload FocusForge from `chrome://extensions`. Chrome may ask you to approve access to websites because blocking rules require host access.
2. Confirm the popup version is `0.4.0`.
3. Keep the backend running and confirm the popup shows an active session with at least one blocked site.
4. Open or refresh the configured website, such as `https://youtube.com`.
5. Chrome should redirect the tab to the FocusForge blocked page.
6. Complete or cancel the session in Postman.
7. Open the popup and select **Refresh**.
8. Open the website again. It should load normally.

The extension redirects top-level page navigations and also redirects already-open matching tabs after a successful sync. It does not read page content.

## Step 5: Lifecycle Reliability

Run the extension's automated tests:

```powershell
cd D:\focusforge\extension
npm.cmd test
```

Then perform these browser checks:

1. Start a focus session and wait up to one minute without selecting **Refresh**. The configured site should become blocked.
2. Complete the session and wait up to one minute. Refresh the site and confirm it opens normally.
3. Restart Chrome during an active session. After Chrome starts, the site should remain blocked.
4. Sign out of FocusForge. The site should immediately become available.
5. While a site is blocked, stop the backend. The existing rule remains in place and the popup reports the connection failure. Restart the backend and complete or cancel the session to remove the rule.

FocusForge intentionally keeps the last successful blocking rules during a temporary backend outage. This prevents disconnecting the network from bypassing an active focus session. Signing out always clears the rules as a recovery path.

## Step 6: Live Session Countdown

Status: ready to test.

1. Reload FocusForge from `chrome://extensions` and confirm version `0.5.0`.
2. Start a session through Postman with `durationMinutes: 1`.
3. Open the popup and select **Refresh**.
4. Confirm the countdown appears near `01:00` and updates every second.
5. Close and reopen the popup. The countdown should resume from the backend time instead of restarting.
6. Leave the popup closed until the session ends.
7. Confirm the blocked website becomes available after the exact-end alarm synchronizes with the backend.

The countdown uses `plannedEnd`, `serverTime`, and a calculated clock offset. The service worker owns the ending alarm, so closing the popup does not pause the session.

## Step 7: Web Blocked-Site Management

Status: ready to test.

1. Keep PostgreSQL, the backend, and the frontend running. Sign in to the web app and extension with the same account.
2. Open `/blocked-sites` in the web app. Try `hello`, `localhost`, and `http://127.0.0.1`; each should show an inline validation error. Add `youtube.com`, then add it again to confirm the duplicate error.
3. Create a task and start a focus session in the web app. Open the extension popup and select **Refresh**.
4. Navigate to `https://youtube.com`. The extension should redirect it to the blocked page.
5. On `/blocked-sites`, pause `youtube.com`. Select **Refresh** in the extension popup, then open `https://youtube.com` again. It should load normally.
6. Enable it again and refresh the extension. The website should be blocked again.
7. End the session, refresh the extension, and confirm the website opens normally. Remove the domain from the web app and confirm it disappears from the list.

With extension version `0.6.0`, site and session changes made in the web app trigger an immediate extension sync. After updating the extension, reload it from `chrome://extensions` and refresh the open FocusForge web app tab once so the new content script loads. Adding an enabled site during an active session should redirect an already-open matching tab without pressing **Refresh** in the popup. The one-minute background sync remains a fallback when the web app is closed or the extension does not receive the signal.
