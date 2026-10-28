import { ApiError } from "../services/api.js";
import { getStoredAuth, logout } from "../services/auth.js";
import { applyBlockingRules, clearBlockingRules, redirectOpenBlockedTabs } from "../services/blocking.js";
import {
  clearBlockingState,
  fetchBlockingState,
  saveBlockingState,
} from "../services/focus-state.js";
import { getRemainingMilliseconds } from "../services/session-time.js";

const SYNC_ALARM_NAME = "focus-forge-state-sync";
const SESSION_END_ALARM_NAME = "focus-forge-session-end";

const scheduleSessionEndAlarm = async (state) => {
  await chrome.alarms.clear(SESSION_END_ALARM_NAME);

  if (!state?.isFocusSessionActive || !state.activeSession?.plannedEnd) {
    return;
  }

  const remainingMilliseconds = getRemainingMilliseconds(state);
  await chrome.alarms.create(SESSION_END_ALARM_NAME, {
    when: Date.now() + Math.max(remainingMilliseconds, 100),
  });
};

const performSync = async () => {
  const auth = await getStoredAuth();

  if (!auth) {
    await clearBlockingState();
    await clearBlockingRules();
    await chrome.alarms.clear(SESSION_END_ALARM_NAME);
    return null;
  }

  try {
    const state = await fetchBlockingState(auth.accessToken);
    await applyBlockingRules(state.blockedDomains);
    await saveBlockingState(state);
    await scheduleSessionEndAlarm(state);
    await redirectOpenBlockedTabs(state.blockedDomains).catch((error) => {
      console.warn("Could not redirect an open blocked tab", error);
    });
    return state;
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      await logout();
      await clearBlockingState();
      await clearBlockingRules();
      await chrome.alarms.clear(SESSION_END_ALARM_NAME);
    }

    throw error;
  }
};

let lastSync = Promise.resolve();
const syncBlockingState = () => {
  const result = lastSync.then(performSync, performSync);
  lastSync = result.catch(() => {});
  return result;
};

const initializeBackgroundSync = () => {
  chrome.alarms.create(SYNC_ALARM_NAME, { periodInMinutes: 1 });
  syncBlockingState().catch((error) => {
    console.warn("Initial FocusForge state sync failed", error);
  });
};

chrome.runtime.onInstalled.addListener(({ reason }) => {
  if (reason === "install") {
    console.info("FocusForge extension installed");
  }

  initializeBackgroundSync();
});

chrome.runtime.onStartup.addListener(initializeBackgroundSync);

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === SYNC_ALARM_NAME || alarm.name === SESSION_END_ALARM_NAME) {
    syncBlockingState().catch((error) => {
      console.warn("Scheduled FocusForge state sync failed", error);
    });
  }
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === "CHECK_CONNECTION") {
    syncBlockingState().then(async (state) => {
      const auth = await getStoredAuth();
      sendResponse(state && auth ? { status: "connected", userId: auth.user.id } : { status: "signed-out" });
    }).catch(() => sendResponse({ status: "unavailable" }));
    return true;
  }
  if (message.type === "PING") {
    sendResponse({
      ready: true,
      version: chrome.runtime.getManifest().version,
      capabilities: ["state-sync", "dynamic-blocking", "session-countdown"],
    });
    return false;
  }

  if (message.type === "SYNC_BLOCKING_STATE") {
    syncBlockingState()
      .then((state) => sendResponse({ success: true, state }))
      .catch((error) =>
        sendResponse({
          success: false,
          error: error.message ?? "Unable to synchronize focus state",
          code: error.code ?? "SYNC_ERROR",
        }),
      );
    return true;
  }

  if (message.type === "CLEAR_BLOCKING_STATE") {
    Promise.all([
      clearBlockingState(),
      clearBlockingRules(),
      chrome.alarms.clear(SESSION_END_ALARM_NAME),
    ])
      .then(() => sendResponse({ success: true }))
      .catch((error) => sendResponse({ success: false, error: error.message }));
    return true;
  }

  return false;
});
