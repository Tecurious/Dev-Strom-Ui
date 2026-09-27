import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { fetchArchifySpec, renderArchifySvg, type ArchifySpec } from "../../lib/archify";
import { copyImage, downloadImage, downloadShareCard } from "./systemDiagramExport";
import "./SystemDiagram.css";
import "./SystemDiagramSvg.css";

type State = { status: "loading" } | { status: "ready"; svg: string } | { status: "failed" };
type View = { x: number; y: number; k: number };
type Focus = { primary: string; nodes: string[]; edges: string[] };

const ZOOM = { min: 0.2, max: 4, step: 1.25 };
const FIT_PADDING = 32;
const ICONS = {
  zoomIn: "M8 3v10M3 8h10",
  zoomOut: "M3 8h10",
  fit: "M2 6V2h4M10 2h4v4M14 10v4h-4M6 14H2v-4",
  present: "M2 6V2h4M10 2h4v4M14 10v4h-4M6 14H2v-4M6 6l-4-4M10 6l4-4M10 10l4 4M6 10l-4 4",
  minimise: "M6 2v4H2M14 6h-4V2M10 14v-4h4M2 10h4v4",
  export: "M8 2v8M5 7l3 3 3-3M3 12v2h10v-2",
};

function Icon({ d }: { d: string }) {
  return (
    <svg className="system-diagram__icon" viewBox="0 0 16 16" aria-hidden="true">
      <path d={d} />
    </svg>
  );
}

/** What hovering `target` lights up: a component with its relationships and
 * neighbours, or a relationship with its two endpoints. */
function focusFor(target: Element, svg: SVGSVGElement): Focus | null {
  const node = target.closest("[data-node-id]")?.getAttribute("data-node-id");
  if (node) {
    const edges = Array.from(svg.querySelectorAll(`path[data-edge-from="${CSS.escape(node)}"], path[data-edge-to="${CSS.escape(node)}"]`));
    const nodes = new Set([node, ...edges.flatMap((e) => [e.getAttribute("data-edge-from")!, e.getAttribute("data-edge-to")!])]);
    return { primary: `[data-node-id="${CSS.escape(node)}"]`, nodes: [...nodes], edges: edges.map((e) => e.getAttribute("data-edge-key")!) };
  }
  const edge = target.closest("[data-edge-key]");
  const key = edge?.getAttribute("data-edge-key");
  if (!edge || !key) return null;
  return {
    primary: `path[data-edge-key="${CSS.escape(key)}"]`,
    nodes: [edge.getAttribute("data-edge-from")!, edge.getAttribute("data-edge-to")!],
    edges: [key],
  };
}

function focusCss({ primary, nodes, edges }: Focus): string {
  const scope = ".system-diagram.system-diagram--focus .system-diagram-svg";
  const lit = [
    ...nodes.map((id) => `${scope} [data-node-id="${CSS.escape(id)}"]`),
    ...edges.map((key) => `${scope} [data-edge-key="${CSS.escape(key)}"]`),
  ];
  return `${lit.join(",")}{opacity:1}${scope} ${primary}{filter:drop-shadow(0 0 5px color-mix(in srgb,var(--accent) 65%,transparent))}`;
}

/**
 * The analysis' system diagram: the drawing engine's SVG on a pan/zoom stage
 * with Dev-Strom's own controls (zoom, full-screen present, export). Shows
 * `fallback` (the mermaid card) whenever there is no spec or it can't be
 * rendered. Key it by run id so a new run starts from the loading state.
 */
export function ArchitectureDiagram({
  runId,
  repo,
  spec,
  fallback = null,
}: {
  runId: string;
  repo: string;
  spec?: ArchifySpec | null;
  fallback?: ReactNode;
}) {
  const [state, setState] = useState<State>({ status: "loading" });
  const [view, setView] = useState<View>({ x: 0, y: 0, k: 1 });
  const [presenting, setPresenting] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [focus, setFocus] = useState<Focus | null>(null);
  // Stable identity: React re-applies innerHTML whenever this object changes.
  const markup = useMemo(() => ({ __html: state.status === "ready" ? state.svg : "" }), [state]);
  const rootRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const source = spec ?? (await fetchArchifySpec(runId));
        if (!source) throw new Error("no archify spec");
        const svg = await renderArchifySvg(source);
        if (!cancelled) setState({ status: "ready", svg });
      } catch (e) {
        console.error("System diagram unavailable, showing mermaid fallback:", e);
        if (!cancelled) setState({ status: "failed" });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [runId, spec]);

  const diagramSvg = useCallback(() => contentRef.current?.querySelector("svg") ?? null, []);

  const fit = useCallback(() => {
    const viewport = viewportRef.current;
    const svg = diagramSvg();
    if (!viewport || !svg) return;
    const { width, height } = svg.viewBox.baseVal;
    const k = Math.min(
      (viewport.clientWidth - FIT_PADDING * 2) / width,
      (viewport.clientHeight - FIT_PADDING * 2) / height,
      ZOOM.max,
    );
    setView({ k, x: (viewport.clientWidth - width * k) / 2, y: (viewport.clientHeight - height * k) / 2 });
  }, [diagramSvg]);

  const zoomAt = useCallback((factor: number, px?: number, py?: number) => {
    const viewport = viewportRef.current;
    const cx = px ?? (viewport?.clientWidth ?? 0) / 2;
    const cy = py ?? (viewport?.clientHeight ?? 0) / 2;
    setView((v) => {
      const k = Math.min(ZOOM.max, Math.max(ZOOM.min, v.k * factor));
      return { k, x: cx - (cx - v.x) * (k / v.k), y: cy - (cy - v.y) * (k / v.k) };
    });
  }, []);

  useEffect(() => {
    const viewport = viewportRef.current;
    const svg = diagramSvg();
    if (state.status !== "ready" || !viewport || !svg) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = viewport.getBoundingClientRect();
      zoomAt(Math.exp(-e.deltaY * 0.0015), e.clientX - rect.left, e.clientY - rect.top);
    };
    const resize = new ResizeObserver(fit);
    resize.observe(viewport);
    viewport.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      resize.disconnect();
      viewport.removeEventListener("wheel", onWheel);
    };
  }, [state, fit, zoomAt, diagramSvg]);

  useEffect(() => {
    if (!presenting) return;
    const onFullscreen = () => !document.fullscreenElement && setPresenting(false);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setPresenting(false);
    document.addEventListener("fullscreenchange", onFullscreen);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("fullscreenchange", onFullscreen);
      window.removeEventListener("keydown", onKey);
    };
  }, [presenting]);

  useEffect(() => {
    if (!menuOpen) return;
    const onPointer = (e: PointerEvent) => !menuRef.current?.contains(e.target as Node) && setMenuOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMenuOpen(false);
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), 1800);
    return () => clearTimeout(timer);
  }, [notice]);

  if (state.status === "failed") return <>{fallback}</>;
  if (state.status === "loading") {
    return <div className="repo-intel__archify-loading">Rendering diagram…</div>;
  }

  const endDrag = () => {
    drag.current = null;
  };

  const togglePresent = () => {
    if (presenting) {
      if (document.fullscreenElement) void document.exitFullscreen();
      setPresenting(false);
    } else {
      setPresenting(true);
      rootRef.current?.requestFullscreen?.().catch(() => {});
    }
  };

  const exportAs = async (task: (svg: SVGSVGElement) => Promise<void>, done?: string) => {
    setMenuOpen(false);
    const svg = diagramSvg();
    if (!svg) return;
    try {
      await task(svg);
      if (done) setNotice(done);
    } catch (e) {
      console.error("System diagram export failed:", e);
      setNotice("Export failed");
    }
  };

  return (
    <div
      ref={rootRef}
      className={`system-diagram${presenting ? " system-diagram--present" : ""}${focus ? " system-diagram--focus" : ""}`}
    >
      {focus && <style>{focusCss(focus)}</style>}
      <div
        ref={viewportRef}
        className="system-diagram__viewport"
        onPointerDown={(e) => {
          if (e.button !== 0) return;
          drag.current = { x: e.clientX - view.x, y: e.clientY - view.y };
          e.currentTarget.setPointerCapture(e.pointerId);
        }}
        onPointerMove={(e) => {
          const start = drag.current;
          if (start) setView((v) => ({ ...v, x: e.clientX - start.x, y: e.clientY - start.y }));
        }}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onPointerOver={(e) => {
          const svg = diagramSvg();
          if (!svg || drag.current) return;
          const next = focusFor(e.target as Element, svg);
          setFocus((prev) => (prev?.primary === next?.primary ? prev : next));
        }}
        onPointerLeave={() => setFocus(null)}
      >
        <div
          ref={contentRef}
          className="system-diagram__content"
          style={{ transform: `translate(${view.x}px, ${view.y}px) scale(${view.k})` }}
          dangerouslySetInnerHTML={markup}
        />
      </div>

      <div className="system-diagram__actions">
        <button type="button" className="system-diagram__button" onClick={togglePresent}>
          <Icon d={presenting ? ICONS.minimise : ICONS.present} />
          {presenting ? "Minimise" : "Present"}
        </button>
        <div ref={menuRef} className="system-diagram__menu">
          <button
            type="button"
            className="system-diagram__button"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
          >
            <Icon d={ICONS.export} />
            {notice ?? "Export"}
          </button>
          {menuOpen && (
            <div className="system-diagram__menu-list" role="menu">
              <button type="button" role="menuitem" className="system-diagram__menu-item"
                onClick={() => exportAs((svg) => downloadImage(svg, repo, "png"))}>
                Download PNG
              </button>
              <button type="button" role="menuitem" className="system-diagram__menu-item"
                onClick={() => exportAs((svg) => downloadImage(svg, repo, "jpg"))}>
                Download JPG
              </button>
              <button type="button" role="menuitem" className="system-diagram__menu-item"
                onClick={() => exportAs(copyImage, "Copied")}>
                Copy image
              </button>
              <button type="button" role="menuitem" className="system-diagram__menu-item"
                onClick={() => exportAs((svg) => downloadShareCard(svg, repo))}>
                Share card
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="system-diagram__zoom" role="group" aria-label="Zoom">
        <button type="button" aria-label="Zoom in" onClick={() => zoomAt(ZOOM.step)}>
          <Icon d={ICONS.zoomIn} />
        </button>
        <button type="button" aria-label="Zoom out" onClick={() => zoomAt(1 / ZOOM.step)}>
          <Icon d={ICONS.zoomOut} />
        </button>
        <button type="button" aria-label="Fit to view" onClick={fit}>
          <Icon d={ICONS.fit} />
        </button>
      </div>
    </div>
  );
}
