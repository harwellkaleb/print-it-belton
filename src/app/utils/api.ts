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
 *   /make-server-991222a2/manager/settings/access-code  ✓  matches app.put("/make-server-991222a2/manager/settings/access-code")
 */
export function apiUrl(route: string) {
  return `${API_BASE}${route}`;
}

/**
 * Build request headers for authenticated API calls.
 *
 * The Supabase Edge Function gateway validates the Authorization header JWT
 * before forwarding the request to Hono. We send the user JWT in Authorization
 * so the gateway accepts it, and also in X-User-Token as a backup.
 */
export function authHeaders(token?: string | null): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  
  // Send user token in Authorization header for gateway validation
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
    headers["X-User-Token"] = token;
  } else {
    // Fallback to anon key if no user token
    headers["Authorization"] = `Bearer ${publicAnonKey}`;
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
