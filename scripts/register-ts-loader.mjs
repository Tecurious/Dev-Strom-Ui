/**
 * Bootstrap for `node --import`: registers ts-extensionless-loader.mjs via
 * the stable `module.register()` API instead of the deprecated
 * `--experimental-loader` CLI flag.
 */
import { register } from "node:module";

register("./ts-extensionless-loader.mjs", import.meta.url);
