# Daily Goals: Test Guide

The account's IANA timezone is chosen at registration; goals use that timezone rather than the computer's timezone. Changing the account timezone after goals have begun is not supported yet.

## Start locally

Start the local PostgreSQL database and backend as described in [API testing](api-testing.md). Apply the new migration in `backend` with `npm run db:deploy`, then start the backend with `npm run dev`. Do not point this test at the production database. Import `docs/postman/FocusForge.postman_collection.json`, set `baseUrl` to `http://127.0.0.1:5000`, and run Register or Login to save `accessToken`.

Start the frontend from `frontend` with `npm run dev`, then sign in and open `/dashboard`. The Daily goal panel is above the dashboard statistics. The 90-day activity grid shows actual completed focus minutes: each square is a date, darker green means more minutes, and an outlined square means its goal was met. Select or hover over a square to see its date and minutes. On narrow screens, the grid opens at the latest dates and scrolls horizontally.

## Dashboard sequence

1. With a new account, choose **Set daily goal**, enter a whole-number target from 1 to 480 minutes, and save. A blank value, decimal, zero, or value above 480 should show an inline error.
2. Complete a focus session, then return to the dashboard. Today's minutes and progress should update. Cancelled, active, and expired sessions do not count. A session shorter than a minute may still display zero minutes.
3. Use the pencil icon to change the target. The progress bar and remaining minutes should update. Earlier dates keep their original effective targets.
4. Select activity squares to compare days. Reaching the goal outlines today's square and increments the streak; simply studying for a few minutes does not count as a goal-met day.
5. If the API is unavailable, the panel shows a retry control rather than a false zero. Restart the backend and retry.

The frontend uses TanStack Query for the 90-day GET request, invalidates the goal query after a target change or session update, and checks for changes every minute while the dashboard is open. The browser tests in `frontend/tests/e2e/workflows.spec.ts` cover editing, validation, retry, minute display, and mobile scrolling.

## Postman sequence

1. Run **GET Daily Goal**. With a new account, `today.targetMinutes` is `null`, both streaks are `0`, and the history contains 14 dates.
2. Run **PUT Daily Goal** with `{ "targetMinutes": 30 }`. The response should show your timezone, today's target `30`, zero credited minutes, and `30` remaining minutes.
3. Use the Tasks requests to create a task. Start a short session with that task, then finish it. Run **GET Daily Goal** again. Completed elapsed time appears for today's local date. Active, cancelled, and expired time does not earn credit. A sub-minute session may round to zero; daily elapsed time is summed before rounding to whole minutes.
4. Set the goal to `15`, then get it again. Today's target changes; previous dates retain the target that was effective on those dates. After reaching today's target, `today.achieved` is `true` and the current streak grows.
5. Try `{ "targetMinutes": 0 }`, `{ "targetMinutes": 481 }`, and a decimal. Each should return `400`. Try `GET Daily Goal` with `days=91`; it should return `400`. Remove the bearer token; it should return `401`.

`currentStreak` includes today when achieved. If today is not yet achieved, it is the streak ending yesterday, so an unfinished day does not immediately break it. `longestStreak` includes all achieved days since the first target. A missed *completed* day resets the run. Completed sessions crossing local midnight split their credited elapsed time between the two dates, including daylight-saving changes.
