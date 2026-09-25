// Type declarations for the vendored Archify renderer (plain ESM JS modules).

declare module "./render-architecture.mjs" {
  const _render: unknown;
  export default _render;
}

declare module "*.html?raw" {
  const content: string;
  export default content;
}
