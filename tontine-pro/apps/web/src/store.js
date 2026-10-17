import { api, getTokens, clearTokens } from "./api.js";

let cachedMe = null;

export function isAuthenticated() {
  return Boolean(getTokens()?.accessToken);
}

export async function loadMe({ force = false } = {}) {
  if (cachedMe && !force) return cachedMe;
  cachedMe = await api.get("/me");
  return cachedMe;
}

export function getCachedMe() {
  return cachedMe;
}

export function logout() {
  clearTokens();
  cachedMe = null;
}
