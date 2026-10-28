# Extension Download and Setup

Share `https://focus-forge-ruddy.vercel.app/setup` with early testers. The page
is public, so they can download the extension before creating an account.

The ZIP at `/downloads/focusforge-extension.zip` contains only the production
runtime files. `manifest.json` is at the ZIP root. Its version, byte size, and
SHA-256 hash are recorded in `frontend/public/downloads/extension-release.json`.
No source tests, dependencies, environment files, or database credentials are
included. The extension connects to the deployed Render API and listens for
sync messages from the deployed Vercel website.

## Tester Flow

1. In desktop Chrome, open the setup page and download the ZIP.
2. Extract it. In `chrome://extensions`, enable Developer mode, select **Load
   unpacked**, and choose the extracted folder containing `manifest.json`.
3. Create a FocusForge account or sign in on the website. The setup page keeps
   the return path during login or registration.
4. Click the FocusForge extension icon and sign in with the same account.
5. Refresh the setup tab and check that it says **Extension connected**.
6. Open Focus Room, start a session, and verify a blocked site redirects.

Chrome cannot install the ZIP directly from the download button. Unpacked
extensions do not update automatically; testers need a new ZIP and a reload
when the extension version changes. Website blocking works in the installed
desktop browser, not in a phone browser.

## Rebuild the Download

After extension code changes, run:

```powershell
npm --prefix frontend run package:extension
```

Commit the resulting ZIP and release JSON with the extension code. CI rebuilds
the package, checks ZIP integrity, and fails if committed package bytes differ.
This keeps the public download aligned with the extension version being tested.

The package script calls the existing production extension builder and archives
an explicit list of runtime files in a stable order. It normalizes line endings
so Windows and Linux produce the same ZIP. The browser tests check the public
download's byte size and hash against its release metadata.

To check that the extracted package actually loads in a fresh Chromium profile
on Windows, run from the repository root:

```powershell
Expand-Archive -LiteralPath frontend/public/downloads/focusforge-extension.zip -DestinationPath frontend/test-results/extension-package-check -Force
node frontend/scripts/smoke-unpacked-extension.mjs frontend/test-results/extension-package-check
```

This check opens the popup and confirms that the background worker responds.
It uses Playwright's bundled Chromium; install it for the frontend if it is not
already available.

For broader distribution, use the Chrome Web Store. This manual installation
path is intended for a small, trusted pilot.
