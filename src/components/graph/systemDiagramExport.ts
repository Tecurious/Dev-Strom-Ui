import svgCss from "./SystemDiagramSvg.css?raw";

const SCALE = 2;
const CARD = { width: 1600, height: 900, pad: 56, header: 150, footer: 64 };

function token(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(`--${name}`).trim();
}

/** Standalone SVG: the page stylesheet embedded with every token resolved, so
 * the image renders identically outside the app. */
function standaloneSvg(svg: SVGSVGElement): { markup: string; width: number; height: number } {
  const { width, height } = svg.viewBox.baseVal;
  const names = [...new Set([...svgCss.matchAll(/var\(--([a-z0-9-]+)\)/g)].map((m) => m[1]))];
  const tokens = names.map((n) => `--${n}:${token(n)};`).join("");
  const clone = svg.cloneNode(true) as SVGSVGElement;
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  clone.setAttribute("width", String(width));
  clone.setAttribute("height", String(height));
  const style = document.createElementNS("http://www.w3.org/2000/svg", "style");
  style.textContent = `.system-diagram-svg{${tokens}}${svgCss}`;
  clone.prepend(style);
  return { markup: new XMLSerializer().serializeToString(clone), width, height };
}

function loadImage(markup: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("diagram image failed to load"));
    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(markup)}`;
  });
}

function canvasBlob(canvas: HTMLCanvasElement, type: string): Promise<Blob> {
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("image encoding failed"))), type, 0.92),
  );
}

async function diagramBlob(svg: SVGSVGElement, type: "image/png" | "image/jpeg"): Promise<Blob> {
  const { markup, width, height } = standaloneSvg(svg);
  const img = await loadImage(markup);
  const canvas = document.createElement("canvas");
  canvas.width = width * SCALE;
  canvas.height = height * SCALE;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = token("bg");
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvasBlob(canvas, type);
}

function download(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement("a"), { href: url, download: filename });
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const slug = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "system";

export async function downloadImage(svg: SVGSVGElement, repo: string, format: "png" | "jpg"): Promise<void> {
  const blob = await diagramBlob(svg, format === "png" ? "image/png" : "image/jpeg");
  download(blob, `${slug(repo)}-system-diagram.${format}`);
}

export async function copyImage(svg: SVGSVGElement): Promise<void> {
  await navigator.clipboard.write([new ClipboardItem({ "image/png": diagramBlob(svg, "image/png") })]);
}

/** Dev-Strom share card: wordmark, repo, and the diagram framed on a panel. */
export async function downloadShareCard(svg: SVGSVGElement, repo: string): Promise<void> {
  const { markup, width, height } = standaloneSvg(svg);
  const img = await loadImage(markup);
  const { width: W, height: H, pad, header, footer } = CARD;
  const canvas = document.createElement("canvas");
  canvas.width = W * SCALE;
  canvas.height = H * SCALE;
  const ctx = canvas.getContext("2d")!;
  ctx.scale(SCALE, SCALE);
  await document.fonts.ready;

  ctx.fillStyle = token("bg");
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = token("accent");
  ctx.fillRect(0, 0, W, 8);

  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = token("ink");
  ctx.font = `600 44px ${token("font-display")}`;
  ctx.fillText("Dev-Strom", pad, 92);
  ctx.fillStyle = token("accent");
  ctx.font = `600 18px ${token("font-mono")}`;
  ctx.fillText("SYSTEM DIAGRAM", pad, 126);
  ctx.fillStyle = token("ink-2");
  ctx.font = `500 26px ${token("font-mono")}`;
  ctx.textAlign = "right";
  ctx.fillText(repo, W - pad, 92);

  const panel = { x: pad, y: header, w: W - pad * 2, h: H - header - footer };
  ctx.fillStyle = token("surface");
  ctx.strokeStyle = token("border");
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(panel.x, panel.y, panel.w, panel.h, 12);
  ctx.fill();
  ctx.stroke();

  const k = Math.min((panel.w - 48) / width, (panel.h - 48) / height);
  ctx.drawImage(img, panel.x + (panel.w - width * k) / 2, panel.y + (panel.h - height * k) / 2, width * k, height * k);

  ctx.fillStyle = token("ink-3");
  ctx.font = `500 16px ${token("font-mono")}`;
  ctx.fillText("devstrom.site", W - pad, H - 24);

  download(await canvasBlob(canvas, "image/png"), `${slug(repo)}-share-card.png`);
}
