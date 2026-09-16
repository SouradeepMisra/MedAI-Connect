export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:5000';

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  token?: string | null;
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
    const message = data?.error ?? `Request failed with status ${response.status}`;
    throw new Error(message);
  }

  return data as T;
}
