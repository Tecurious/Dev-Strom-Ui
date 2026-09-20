/**
 * Node ESM resolve hook: lets plain `node --test` follow the same
 * extensionless relative imports (`./base`, not `./base.ts`) that Vite's
 * bundler-mode resolution and every source file in src/ already use.
 *
 * Node's own resolver requires a full specifier for relative imports and
 * has no notion of mapping ".ts" the way a bundler does, so
 * `import { X } from "./base"` fails under plain `node --experimental-strip-types`
 * even though it's exactly what the app build expects. Rather than add
 * explicit ".ts" extensions to source imports — a style the rest of the
 * codebase doesn't use, and unnecessary for Vite/tsc — this hook retries an
 * extensionless relative import against candidate extensions, same as
 * `moduleResolution: "bundler"` does for the app.
 *
 * Registered via `--import` in the `test` npm script; see package.json.
 */
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

const CANDIDATE_EXTENSIONS = [".ts", ".tsx", ".mts", ".js"];

export async function resolve(specifier, context, nextResolve) {
  if (!specifier.startsWith(".") && !specifier.startsWith("/")) {
    return nextResolve(specifier, context);
  }

  try {
    return await nextResolve(specifier, context);
  } catch (err) {
    if (err?.code !== "ERR_MODULE_NOT_FOUND") throw err;

    const base = new URL(specifier, context.parentURL);
    for (const ext of CANDIDATE_EXTENSIONS) {
      const candidate = `${base.href}${ext}`;
      if (existsSync(fileURLToPath(candidate))) {
        return nextResolve(specifier + ext, context);
      }
    }
    throw err;
  }
}
