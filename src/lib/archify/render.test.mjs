import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { renderArchitecture } from "./render-architecture.mjs";

// Output of Dev-Strom-Api's coerce_archify_spec; regenerate when its layout rules change.
const apiSpecs = JSON.parse(readFileSync(new URL("./fixtures/api-specs.json", import.meta.url), "utf8"));

for (const [name, diagram] of Object.entries(apiSpecs)) {
  test(`API-normalized spec "${name}" renders lint-free under upstream strict rules`, () => {
    const { svg, warnings } = renderArchitecture({ diagram, strict: true });
    assert.deepEqual(warnings, []);
    assert.match(svg, /^\s*<svg viewBox="0 0 \d+ \d+" class="system-diagram-svg"/);
    assert.doesNotMatch(svg, /archify/i);
  });
}

test("renders a fresh diagram on every call", () => {
  const [a, b] = Object.values(apiSpecs).map((diagram) => renderArchitecture({ diagram }).svg);
  assert.notEqual(a, b);
  assert.equal(renderArchitecture({ diagram: apiSpecs["prompt-example"] }).svg, b);
});

test("composition lint is reported as warnings instead of blocking the render", () => {
  const diagram = structuredClone(apiSpecs["prod-sun-mmon-puzzle"]);
  for (const c of diagram.connections) delete c.labelDy;
  const { svg, warnings } = renderArchitecture({ diagram });
  assert.ok(svg);
  assert.match(warnings.join("\n"), /overlaps component/);
  assert.throws(() => renderArchitecture({ diagram, strict: true }), /overlaps component/);
});

test("LLM-authored text is escaped, since the SVG is inserted into the page", () => {
  const hostile = `<img src=x onerror=alert(1)>"'&`;
  const diagram = structuredClone(apiSpecs["prompt-example"]);
  diagram.meta.title = hostile;
  diagram.meta.subtitle = hostile;
  for (const c of diagram.components) Object.assign(c, { label: `L${hostile}`, sublabel: `S${hostile}` });
  for (const c of diagram.connections) c.label = `C${hostile}`;
  for (const b of diagram.boundaries) b.label = `B${hostile}`;
  const { svg } = renderArchitecture({ diagram });
  assert.doesNotMatch(svg, /<img/);
  assert.match(svg, /&lt;img src=x onerror=alert\(1\)&gt;&quot;&#39;&amp;/);
});

test("loads without Node-only globals (browsers lack SharedArrayBuffer unless cross-origin isolated)", () => {
  const script = `for (const g of ["SharedArrayBuffer", "Atomics", "Buffer"]) delete globalThis[g];
    const { renderArchitecture } = await import(${JSON.stringify(new URL("./render-architecture.mjs", import.meta.url).href)});
    const diagram = ${JSON.stringify(apiSpecs["prod-sun-mmon-puzzle"])};
    process.stdout.write(String(renderArchitecture({ diagram }).svg.length > 0));`;
  const run = spawnSync(process.execPath, ["--input-type=module", "-e", script], { encoding: "utf8" });
  assert.equal(run.stderr, "");
  assert.equal(run.stdout, "true");
});

test("specs the renderer cannot place still fail loudly", () => {
  const diagram = JSON.parse(readFileSync(new URL("./fixtures/prod-raw-spec.json", import.meta.url), "utf8"));
  assert.throws(() => renderArchitecture({ diagram }), /must include pos/);
});
