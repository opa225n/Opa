// Client API admin — fetch côté client uniquement (pas de server components pour les données :
// on reste simple et cohérent avec le client fetch de l'app mobile).
const DEFAULT_BASE = typeof window !== "undefined" ? `${location.protocol}//${location.hostname}:4000/v1/admin` : "";
// NEXT_PUBLIC_API_BASE_URL permet de pointer vers une API déployée séparément (ex. Vercel) ;
// sinon on retombe sur le même host que le back-office, port 4000 (dev local).
export const ADMIN_API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  (typeof window !== "undefined" && (window as any).TONTINE_ADMIN_API_BASE) ||
  DEFAULT_BASE;

const TOKEN_KEY = "tontine_admin_token";
const ADMIN_KEY = "tontine_admin_profile";

export function getAdminToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setAdminSession(token: string, admin: { id: string; email: string; fullName: string; role: string }) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(ADMIN_KEY, JSON.stringify(admin));
}

export function getAdminProfile() {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(ADMIN_KEY);
  return raw ? JSON.parse(raw) : null;
}

export function clearAdminSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(ADMIN_KEY);
}

export class AdminApiError extends Error {
  code: string;
  status: number;
  debug?: unknown;
  constructor(status: number, code: string, message: string, debug?: unknown) {
    super(message);
    this.status = status;
    this.code = code;
    this.debug = debug;
  }
}

async function request(path: string, opts: { method?: string; body?: unknown } = {}) {
  const token = getAdminToken();
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${ADMIN_API_BASE}${path}`, {
    method: opts.method || "GET",
    headers,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) {
    if (res.status === 401 && typeof window !== "undefined") {
      clearAdminSession();
      window.location.href = "/login";
    }
    throw new AdminApiError(res.status, data?.code || "UNKNOWN", data?.message || "Erreur réseau.", data?.debug);
  }
  return data;
}

export const adminApi = {
  get: (path: string) => request(path),
  post: (path: string, body?: unknown) => request(path, { method: "POST", body }),
};
