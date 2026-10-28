import { apiRequest } from "./api.js";
import { API_BASE_URL } from "../config.js";

const AUTH_STORAGE_KEY = `focusForgeAuth:${API_BASE_URL}`;

export const getStoredAuth = async () => {
  const result = await chrome.storage.local.get(AUTH_STORAGE_KEY);
  return result[AUTH_STORAGE_KEY] ?? null;
};

const saveAuth = async (auth) => {
  await chrome.storage.local.set({ [AUTH_STORAGE_KEY]: auth });
};

export const login = async (email, password) => {
  const response = await apiRequest("/api/auth/login", {
    method: "POST",
    body: { email, password },
  });
  const auth = {
    accessToken: response.data.accessToken,
    user: response.data.user,
  };

  await saveAuth(auth);
  return auth;
};

export const verifyAuth = async (auth) => {
  const response = await apiRequest("/api/auth/me", {
    token: auth.accessToken,
  });
  const verifiedAuth = { ...auth, user: response.data };

  await saveAuth(verifiedAuth);
  return verifiedAuth;
};

export const logout = async () => {
  await chrome.storage.local.remove(AUTH_STORAGE_KEY);
};
