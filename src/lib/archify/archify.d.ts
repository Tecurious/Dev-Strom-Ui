// Type declarations for the vendored Archify renderer (plain ESM JS modules).

declare module "./render-architecture.mjs" {
  export function renderArchitecture(input: {
    diagram: Record<string, unknown>;
    strict?: boolean;
  }): { svg: string; warnings: string[] };
}
