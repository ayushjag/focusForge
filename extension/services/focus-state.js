import { apiRequest } from "./api.js";

const STATE_STORAGE_KEY = "focusForgeBlockingState";

export const fetchBlockingState = async (accessToken) => {
  const response = await apiRequest("/api/extension/blocking-state", {
    token: accessToken,
  });
  const receivedAt = Date.now();
  const serverTime = Date.parse(response.data.serverTime);

  return {
    ...response.data,
    syncedAt: new Date(receivedAt).toISOString(),
    clockOffsetMs: Number.isFinite(serverTime) ? receivedAt - serverTime : 0,
  };
};

export const getStoredBlockingState = async () => {
  const result = await chrome.storage.local.get(STATE_STORAGE_KEY);
  return result[STATE_STORAGE_KEY] ?? null;
};

export const saveBlockingState = async (state) => {
  await chrome.storage.local.set({ [STATE_STORAGE_KEY]: state });
};

export const clearBlockingState = async () => {
  await chrome.storage.local.remove(STATE_STORAGE_KEY);
};
