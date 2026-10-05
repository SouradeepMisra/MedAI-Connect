export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:5000';

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  token?: string | null;
}

// Maps a request path to the role whose session it belongs to. Every prefix
// here is either entirely auth-gated on the backend (admin, doctor-self,
// chat) or only ever 401s on its protected sub-routes (appointments' public
// /slots never checks a token, so it never hits this) — so a 401 on any of
// these always means "this role's stored session is no longer valid."
const SESSION_RECOVERY_RULES: { prefix: string; storageKey: string; loginPath: string }[] = [
  { prefix: '/api/admin', storageKey: 'medai_admin_auth', loginPath: '/admin/login' },
  { prefix: '/api/doctor/', storageKey: 'medai_doctor_auth', loginPath: '/doctor/login' },
  { prefix: '/api/appointments', storageKey: 'medai_patient_auth', loginPath: '/login' },
  { prefix: '/api/chat', storageKey: 'medai_patient_auth', loginPath: '/login' },
];

// Called whenever a request comes back 401 — an expired/invalid token means
// the stored session for that role is no longer valid, so it's cleared and
// the browser is sent to that role's login page, instead of leaving the user
// stuck on a page that will just keep failing the same way with no way back.
// A full navigation (not React Router) is deliberate here: this runs outside
// any component, and a hard reload guarantees no stale in-memory state (from
// the now-invalid session) lingers after the redirect.
export function handleUnauthorized(path: string): void {
  const rule = SESSION_RECOVERY_RULES.find((r) => path.startsWith(r.prefix));
  if (!rule) return;

  localStorage.removeItem(rule.storageKey);
  if (window.location.pathname !== rule.loginPath) {
    window.location.href = rule.loginPath;
  }
}

// Thin fetch wrapper shared by every api/*.ts module: builds the full URL,
// attaches the JWT if one is passed, and normalizes backend error responses
// (every route in this project responds with { error: string } on failure)
// into a single thrown Error so callers just try/catch one thing.
export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: options.method ?? 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
    },
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    if (response.status === 401) handleUnauthorized(path);
    const message = data?.error ?? `Request failed with status ${response.status}`;
    throw new Error(message);
  }

  return data as T;
}
