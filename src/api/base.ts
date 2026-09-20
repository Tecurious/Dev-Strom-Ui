/**
 * API base URL for all backend calls.
 *
 * The backend serves its routes at the *root* — /auth/providers, /ideas,
 * /health — and has no /api prefix of its own. That prefix is purely a
 * same-origin proxy convention: the Vite dev proxy rewrites it away
 * (vite.config.ts) and the nginx image strips it via `proxy_pass .../`
 * (dev-strom-web.nginx.conf).
 *
 * Resolution order:
 *   1. VITE_API_BASE_URL at build time (e.g. "https://api.devstrom.site"
 *      for the Cloudflare deploy). Those calls reach the API directly, with
 *      no proxy in between to strip anything — so NO /api is appended.
 *   2. Fallback: same-origin relative "/api", which the dev proxy or a
 *      reverse proxy strips before the request reaches the backend.
 *
 * Never ends with a trailing slash; callers supply a leading-slash path.
 */
// import.meta.env is a Vite-injected global — always present in the app
// build, but undefined when this module loads under a plain Node test
// runner (jobs.subscribe.test.mjs). Guard so both work.
const env: Partial<ImportMetaEnv> = import.meta.env ?? {};
const raw = (env.VITE_API_BASE_URL ?? "").replace(/\/+$/, "");
export const API_BASE = raw || "/api";
