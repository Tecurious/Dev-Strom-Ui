/**
 * Thin typed fetch wrapper. Base URL comes from src/api/base.ts:
 * VITE_API_BASE_URL (cross-origin, e.g. https://api.devstrom.site in prod)
 * or same-origin "/api" (Vite dev proxy / reverse-proxy deployments).
 */

import { API_BASE } from "./base";

export class ApiError extends Error {
  status: number;
  detail: unknown;

  constructor(status: number, message: string, detail?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.detail = detail;
  }
}

interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined>;
}

function buildUrl(path: string, query?: RequestOptions["query"]): string {
  const url = new URL(`${API_BASE}${path}`, window.location.origin);
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined) url.searchParams.set(key, String(value));
    }
  }
  return url.pathname + url.search;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, query } = options;
  const url = buildUrl(path, query);

  let res: Response;
  try {
    res = await fetch(url, {
      method,
      credentials: "include",
      headers: body !== undefined ? { "Content-Type": "application/json" } : undefined,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError(0, "Network error: unable to reach the Dev-Strom API.");
  }

  const contentType = res.headers.get("content-type") ?? "";

  // Session gone mid-flight — bounce to the login screen (once).
  if (res.status === 401 && typeof window !== "undefined") {
    const here = window.location.pathname;
    if (here !== "/login") {
      window.location.assign(`/login?next=${encodeURIComponent(here + window.location.search)}`);
    }
  }

  if (!res.ok) {
    let detail: unknown;
    try {
      detail = contentType.includes("application/json") ? await res.json() : await res.text();
    } catch {
      detail = undefined;
    }
    const message =
      (typeof detail === "object" && detail && "detail" in detail
        ? String((detail as { detail: unknown }).detail)
        : undefined) ?? `Request failed with status ${res.status}`;
    throw new ApiError(res.status, message, detail);
  }

  if (contentType.includes("application/json")) {
    return (await res.json()) as T;
  }
  // Non-JSON responses (e.g. markdown export) — caller handles as text.
  return (await res.text()) as unknown as T;
}

export const apiClient = {
  get: <T>(path: string, query?: RequestOptions["query"]) => request<T>(path, { method: "GET", query }),
  post: <T>(path: string, body?: unknown, options: Omit<RequestOptions, "method" | "body"> = {}) =>
    request<T>(path, { method: "POST", body, ...options }),
  postText: (path: string, body?: unknown) => request<string>(path, { method: "POST", body }),
};
