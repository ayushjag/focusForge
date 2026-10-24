import { ApiError } from "../services/api.js";
import { getStoredAuth, login, logout, verifyAuth } from "../services/auth.js";
import {
  formatRemainingTime,
  getRemainingMilliseconds,
} from "../services/session-time.js";

const statusIndicator = document.querySelector("#status-indicator");
const statusTitle = document.querySelector("#status-title");
const statusMessage = document.querySelector("#status-message");
const extensionVersion = document.querySelector("#extension-version");
const loginView = document.querySelector("#login-view");
const accountView = document.querySelector("#account-view");
const loginForm = document.querySelector("#login-form");
const loginButton = document.querySelector("#login-button");
const loginError = document.querySelector("#login-error");
const accountTitle = document.querySelector("#account-title");
const logoutButton = document.querySelector("#logout-button");
const syncButton = document.querySelector("#sync-button");
const sessionStatus = document.querySelector("#session-status");
const blockedCount = document.querySelector("#blocked-count");
const countdownPanel = document.querySelector("#countdown-panel");
const countdownValue = document.querySelector("#countdown-value");

let countdownIntervalId = null;
let countdownSessionId = null;
let expirationSyncRequested = false;
let syncInProgress = false;

const setStatus = (state, title, message) => {
  statusIndicator.className = `status-indicator ${state}`;
  statusTitle.textContent = title;
  statusMessage.textContent = message;
};

const showLogin = () => {
  if (countdownIntervalId !== null) {
    window.clearInterval(countdownIntervalId);
    countdownIntervalId = null;
  }
  countdownPanel.classList.add("hidden");
  accountView.classList.add("hidden");
  loginView.classList.remove("hidden");
};

const stopCountdown = () => {
  if (countdownIntervalId !== null) {
    window.clearInterval(countdownIntervalId);
    countdownIntervalId = null;
  }

  countdownSessionId = null;
  expirationSyncRequested = false;
  countdownPanel.classList.add("hidden");
  countdownValue.textContent = "00:00";
};

const updateCountdown = (state) => {
  const remainingMilliseconds = getRemainingMilliseconds(state);
  countdownValue.textContent = formatRemainingTime(remainingMilliseconds);

  if (remainingMilliseconds > 0 || expirationSyncRequested) {
    return;
  }

  expirationSyncRequested = true;

  if (countdownIntervalId !== null) {
    window.clearInterval(countdownIntervalId);
    countdownIntervalId = null;
  }

  setStatus("", "Session ending", "Confirming the completed timer with FocusForge.");
  window.setTimeout(() => refreshBlockingState(), 500);
};

const startCountdown = (state) => {
  if (countdownIntervalId !== null) {
    window.clearInterval(countdownIntervalId);
  }

  if (countdownSessionId !== state.activeSession.id) {
    countdownSessionId = state.activeSession.id;
    expirationSyncRequested = false;
  }

  countdownPanel.classList.remove("hidden");
  updateCountdown(state);

  if (getRemainingMilliseconds(state) > 0) {
    countdownIntervalId = window.setInterval(() => updateCountdown(state), 1000);
  }
};

const showAccount = (auth, updateStatus = true) => {
  loginView.classList.add("hidden");
  accountView.classList.remove("hidden");
  accountTitle.textContent = auth.user.email;

  if (updateStatus) {
    setStatus("ready", "Account connected", "Your FocusForge login is active.");
  }
};

const renderBlockingState = (state) => {
  const isActive = state?.isFocusSessionActive === true;
  const domainCount = state?.blockedDomains?.length ?? 0;

  sessionStatus.textContent = isActive ? "Active" : "Not active";
  blockedCount.textContent = String(domainCount);

  if (isActive) {
    const siteLabel = domainCount === 1 ? "site" : "sites";
    setStatus(
      "ready",
      "Focus session active",
      `${domainCount} ${siteLabel} ready for distraction blocking.`,
    );
    startCountdown(state);
    return;
  }

  stopCountdown();
  setStatus("ready", "Ready", "No focus session is active.");
};

const refreshBlockingState = async () => {
  if (syncInProgress) {
    return;
  }

  syncInProgress = true;
  syncButton.disabled = true;

  try {
    const response = await chrome.runtime.sendMessage({ type: "SYNC_BLOCKING_STATE" });

    if (!response?.success) {
      if (response?.code === "UNAUTHORIZED") {
        await logout();
        setStatus("error", "Session expired", "Sign in to reconnect your account.");
        showLogin();
        return;
      }

      throw new Error(response?.error ?? "Unable to synchronize focus state");
    }

    renderBlockingState(response.state);
  } catch (error) {
    setStatus("error", "Sync unavailable", error.message);
  } finally {
    syncInProgress = false;
    syncButton.disabled = false;
  }
};

const initializePopup = async () => {
  extensionVersion.textContent = chrome.runtime.getManifest().version;

  try {
    const response = await chrome.runtime.sendMessage({ type: "PING" });
    if (!response?.ready) {
      throw new Error("Background service did not respond");
    }

    if (!response.capabilities?.includes("session-countdown")) {
      setStatus(
        "error",
        "Extension reload required",
        "Reload FocusForge from the Chrome extensions page.",
      );
      return;
    }
  } catch (error) {
    console.error("Extension readiness check failed", error);
    setStatus("error", "Extension unavailable", "Reload FocusForge from the extensions page.");
    return;
  }

  const storedAuth = await getStoredAuth();

  if (!storedAuth) {
    setStatus("", "Sign in required", "Connect your FocusForge account to continue.");
    showLogin();
    return;
  }

  try {
    showAccount(await verifyAuth(storedAuth));
    await refreshBlockingState();
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      await logout();
      setStatus("error", "Session expired", "Sign in to reconnect your account.");
      showLogin();
      return;
    }

    setStatus("error", "Backend unavailable", error.message);
    showAccount(storedAuth, false);
  }
};

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  loginError.textContent = "";
  loginButton.disabled = true;
  loginButton.textContent = "Signing in...";

  const formData = new FormData(loginForm);

  try {
    const auth = await login(formData.get("email"), formData.get("password"));
    loginForm.reset();
    showAccount(auth);
    await refreshBlockingState();
  } catch (error) {
    loginError.textContent =
      error instanceof ApiError ? error.message : "Unable to sign in right now";
  } finally {
    loginButton.disabled = false;
    loginButton.textContent = "Sign in";
  }
});

logoutButton.addEventListener("click", async () => {
  await logout();
  await chrome.runtime.sendMessage({ type: "CLEAR_BLOCKING_STATE" });
  renderBlockingState(null);
  setStatus("", "Sign in required", "Connect your FocusForge account to continue.");
  showLogin();
});

syncButton.addEventListener("click", refreshBlockingState);

window.addEventListener("unload", () => {
  if (countdownIntervalId !== null) {
    window.clearInterval(countdownIntervalId);
  }
});

initializePopup();
