import { projectId, publicAnonKey } from "/utils/supabase/info";

export const API_BASE = `https://${projectId}.supabase.co/functions/v1/make-server-991222a2`;

/**
 * Build a full server URL.
 *
 * Supabase strips only "/functions/v1" from req.url before handing it to Deno,
 * leaving the function name ("make-server-991222a2") as the first path segment.
 * Hono routes are already prefixed with /make-server-991222a2, so the URL must
 * be: <API_BASE>/<route>  where route = "/make-server-991222a2/..."
 *
 * Path Hono sees after Supabase strips /functions/v1:
 *   /make-server-991222a2/auth/signup  ✓  matches app.post("/make-server-991222a2/auth/signup")
 */
export function apiUrl(route: string) {
  return `${API_BASE}${route}`;
}

/**
 * Build request headers for authenticated API calls.
 *
 * The Supabase Edge Function gateway validates the Authorization header JWT
 * before forwarding the request to Hono. User JWTs can be rejected at the
 * gateway level (e.g. when slightly stale). To avoid this:
 *   - Authorization always carries the static anon key (always accepted by gateway)
 *   - The user JWT travels in X-User-Token where the server verifies it
 *     directly via the service-role client, bypassing gateway JWT validation.
 */
export function authHeaders(token?: string | null): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${publicAnonKey}`,
  };
  if (token) {
    headers["X-User-Token"] = token;
  }
  return headers;
}

export function authHeadersOnly(token?: string | null): Record<string, string> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${publicAnonKey}`,
  };
  if (token) {
    headers["X-User-Token"] = token;
  }
  return headers;
}
