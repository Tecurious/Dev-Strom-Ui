/**
 * System diagram drawing engine: the tt-a1i/archify architecture renderer
 * (MIT, see ./LICENSE) turns the analysis' diagram spec into one SVG. The
 * viewer around it (pan/zoom, present, export) is Dev-Strom's own, in
 * components/graph/ArchitectureDiagram.tsx. Loaded on first use.
 */

export type ArchifySpec = Record<string, unknown>;

export async function renderArchifySvg(spec: ArchifySpec): Promise<string> {
  const { renderArchitecture } = await import("./render-architecture.mjs");
  const { svg } = renderArchitecture({ diagram: spec });
  // Intrinsic size from the viewBox, so the SVG lays out at 1:1 before zoom.
  return svg.replace(/<svg viewBox="0 0 ([\d.]+) ([\d.]+)"/, '<svg viewBox="0 0 $1 $2" width="$1" height="$2"');
}

/** Fetch the stored archify spec for an analysis run; null when absent. */
export async function fetchArchifySpec(runId: string): Promise<ArchifySpec | null> {
  const { API_BASE } = await import("../../api/base");
  try {
    const res = await fetch(`${API_BASE}/analyze/${runId}/archify.json`, { credentials: "include" });
    if (!res.ok) return null;
    return (await res.json()) as ArchifySpec;
  } catch {
    return null;
  }
}
