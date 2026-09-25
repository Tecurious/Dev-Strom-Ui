/**
 * Browser-vendored Archify architecture renderer (tt-a1i/archify, MIT, v2.17).
 *
 * `renderArchifyHtml(spec)` takes a validated architecture spec (the shape the
 * API returns from /analyze/{run_id}/archify.json) and returns the full
 * self-contained interactive viewer HTML (inline SVG, dark/light themes,
 * pan/zoom, present mode, exports). No Node, no network — the renderer chain
 * in this directory is the Archify skill's own code with node-only IO stubbed.
 */

import template from "./template.html?raw";

export async function renderArchifyHtml(spec: Record<string, unknown>): Promise<string> {
  const g = globalThis as unknown as {
    __ARCHIFY_INPUT__?: unknown;
    __ARCHIFY_OUTPUT__?: { svg: string; html: string };
  };
  g.__ARCHIFY_INPUT__ = { diagram: spec, template };
  try {
    // top-level-await-free: the vendored renderer resolves synchronously on import
    await import("./render-architecture.mjs");
    const out = g.__ARCHIFY_OUTPUT__;
    if (!out?.html) throw new Error("archify renderer produced no output");
    return out.html;
  } finally {
    g.__ARCHIFY_INPUT__ = undefined;
    g.__ARCHIFY_OUTPUT__ = undefined;
  }
}

/** Fetch the stored archify spec for an analysis run; null when absent. */
export async function fetchArchifySpec(runId: string): Promise<Record<string, unknown> | null> {
  const { API_BASE } = await import("../../api/base");
  try {
    const res = await fetch(`${API_BASE}/analyze/${runId}/archify.json`, { credentials: "include" });
    if (!res.ok) return null;
    return (await res.json()) as Record<string, unknown>;
  } catch {
    return null;
  }
}
