# Unified Focus Room

## First Step: Session Setup

The Focus Room now lets a user prepare a session without visiting Tasks and
Blocked Sites first. Those pages remain available for full management.

- Select an open task or create a task inline. Newly created tasks are selected.
- Choose 25, 50, or 60 minutes, or a custom whole number from 1 to 480.
- Add a validated domain and enable or pause saved websites.
- Check extension connectivity and whether it belongs to the website account.
- Start the session after task creation and site changes have finished.
- Use a task row's play action to open `/focus?taskId=...` with that task selected.

This step preserves the existing backend contract: a session still needs a task.
Task-free sessions require a separate backend/schema change; no hidden tasks are
created to simulate that feature.

## Active Session

The Focus Room keeps the timer on the left and distraction protection on the
right on wide screens. On mobile, the site controls and extension status follow
the timer. Users can add a domain or enable/pause a saved site during an active
session. Each successful change requests an immediate extension sync. The
connection check continues to verify that the extension is signed in as the
same account. Recent session history returns when the active session ends.

## Read the Code in This Order

1. `frontend/components/focus/focus-screen.tsx`: fetches session data and handles
   starting, finishing, and cancelling sessions.
2. `frontend/components/focus/focus-setup.tsx`: keeps form selections in React
   state, validates duration and task titles, and creates tasks via TanStack Query.
3. `frontend/components/focus/focus-sites.tsx`: reads and updates the same saved
   websites as the management page. Query invalidation keeps both views consistent.
4. `frontend/lib/validation/domain.ts`: shared client-side domain validation.
   Backend validation is still authoritative.
5. `frontend/components/focus/extension-status.tsx`: sends a request with a unique
   ID and waits for a same-window, same-origin response. A timeout is not detection.
6. `extension/content/web-sync.js`: bridges website messages to Chrome's worker.
7. `extension/background/service-worker.js`: syncs the real backend state, then
   returns only connection status and account ID, never the access token.

## Test It

1. Reload extension v0.8.0 at `chrome://extensions`, then refresh the website tab.
2. Open Focus Room, create a task inline, and choose a custom duration.
3. Add `example.org`; pause and re-enable it without changing pages.
4. Check that the extension reports connected under the same account.
5. Start a session. Verify blocking, then finish it and verify unblocking.
6. Open Tasks and use a different task's play action. Verify that task is selected.

The default extension targets the deployed Vercel website. For a localhost
website, use `npm --prefix extension run build:local` and load `extension/dist/local`
instead; this local package expects the local backend on port 5000.

Automated browser tests mock API responses to check both desktop and mobile
workflows without creating records in the production database. The separate
extension deployment smoke test is opt-in and uses temporary live records.

## Next Step

Make the extension easy to download and install from the website. Task-free
sessions and changing the default entry page are separate follow-ups.
