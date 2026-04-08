import { projectId, publicAnonKey } from "/utils/supabase/info";

export const API_BASE = `https://${projectId}.supabase.co/functions/v1/server`;

/**
 * Build a full server URL.
 *
 * Supabase strips "/functions/v1" from req.url before handing it to Deno,
 * leaving just the route path. The Edge Function is named "server" (from supabase.json),
 * so requests to /functions/v1/server/auth/signup become /auth/signup in Hono.
 *
 * Path Hono sees after Supabase strips /functions/v1/server:
 *   /auth/signup  ✓  matches app.post("/auth/signup")
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
