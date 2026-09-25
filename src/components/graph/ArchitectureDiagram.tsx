import { useEffect, useState } from "react";
import { fetchArchifySpec, renderArchifyHtml } from "../../lib/archify";

/**
 * Interactive architecture diagram: renders the analysis' Archify spec with
 * the vendored Archify viewer (dark/light, pan/zoom, present mode, exports)
 * inside a sandboxed iframe. Falls back to nothing when the spec is absent —
 * the caller keeps the mermaid card as fallback.
 */
export function ArchitectureDiagram({ runId }: { runId: string }) {
  const [html, setHtml] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setHtml(null);
    setError(null);
    (async () => {
      const spec = await fetchArchifySpec(runId);
      if (!spec || cancelled) return;
      try {
        const out = await renderArchifyHtml(spec);
        if (!cancelled) setHtml(out);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [runId]);

  if (error) {
    return <div className="repo-intel__archify-error">Diagram render failed: {error}</div>;
  }
  if (!html) {
    return <div className="repo-intel__archify-loading">Rendering diagram…</div>;
  }
  return (
    <iframe
      className="repo-intel__archify-frame"
      title="Architecture diagram"
      srcDoc={html}
      sandbox="allow-scripts allow-same-origin"
      style={{ width: "100%", minHeight: "720px", border: "1px solid var(--border, #d0d7de)", borderRadius: "12px" }}
    />
  );
}
