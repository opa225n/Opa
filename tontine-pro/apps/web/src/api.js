// Client API minimal (fetch) + gestion des jetons. Pas de dépendance externe, cohérent avec le reste du dépôt.
const DEFAULT_BASE = `${location.protocol}//${location.hostname}:4000/v1`;
export const API_BASE = window.TONTINE_API_BASE || DEFAULT_BASE;

const TOKEN_KEY = "tontine.tokens";

export function getTokens() {
  try {
    return JSON.parse(localStorage.getItem(TOKEN_KEY) || "null");
  } catch {
    return null;
  }
}

export function setTokens(tokens) {
  localStorage.setItem(TOKEN_KEY, JSON.stringify(tokens));
}

export function clearTokens() {
  localStorage.removeItem(TOKEN_KEY);
}

export class ApiClientError extends Error {
  constructor(status, code, message, details) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

async function request(path, { method = "GET", body, auth = true, retry = true } = {}) {
  const headers = { "Content-Type": "application/json" };
  const tokens = getTokens();
  if (auth && tokens?.accessToken) headers.Authorization = `Bearer ${tokens.accessToken}`;

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (res.status === 401 && auth && retry && tokens?.refreshToken) {
    const refreshed = await tryRefresh(tokens.refreshToken);
    if (refreshed) return request(path, { method, body, auth, retry: false });
  }

  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) {
    // Compte suspendu par un administrateur (écran back-office B02) : coupe l'accès partout plutôt
    // que de laisser chaque écran gérer l'erreur à sa façon (ce qui laissait une page blanche).
    if (res.status === 403 && data?.code === "FORBIDDEN" && auth && location.hash !== "#/suspended") {
      sessionStorage.setItem("tontine.suspendedMessage", data.message || "Ce compte a été suspendu.");
      clearTokens();
      location.hash = "#/suspended";
    }
    throw new ApiClientError(res.status, data?.code || "UNKNOWN", data?.message || "Erreur réseau.", data?.details);
  }
  return data;
}

async function tryRefresh(refreshToken) {
  try {
    const res = await fetch(`${API_BASE}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });
    if (!res.ok) return false;
    const data = await res.json();
    const tokens = getTokens();
    setTokens({ ...tokens, accessToken: data.accessToken });
    return true;
  } catch {
    return false;
  }
}

export const api = {
  get: (path, opts) => request(path, opts),
  post: (path, body, opts) => request(path, { method: "POST", body, ...opts }),
  patch: (path, body, opts) => request(path, { method: "PATCH", body, ...opts }),
};
