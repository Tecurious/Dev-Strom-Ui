/**
 * API base URL for all backend calls.
 *
 * Resolution order:
 *   1. VITE_API_BASE_URL at build time (e.g. "https://api.devstrom.site"
 *      for the production Worker deploy; unset for local dev).
 *   2. Fallback: same-origin relative "/api" — works with the Vite dev proxy
 *      (see vite.config.ts) and any same-origin reverse proxy.
 *
 * Always ends with "/api", no trailing slash.
 */
const raw = (import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/+$/, "");
export const API_BASE = raw ? `${raw}/api` : "/api";
