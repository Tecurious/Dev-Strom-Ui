# Dev-Strom — Web (F3)

React frontend for Dev-Strom: idea generation, Repository Intelligence
(evidence-first repo analysis), and run history.

## Stack

- [Vite](https://vite.dev) + React + TypeScript
- [React Router](https://reactrouter.com) for client-side routing
- [`@xyflow/react`](https://reactflow.dev) (React Flow) + [`dagre`](https://github.com/dagrejs/dagre) for the architecture graph and its auto-layout
- [`mermaid`](https://mermaid.js.org) to render optional architecture diagrams

## Develop

```bash
npm install
npm run dev
```

This starts Vite's dev server (default `http://localhost:5173`). All `/api/*`
requests are proxied to `http://localhost:8000` — see `vite.config.ts` — which
strips the `/api` prefix, so `fetch("/api/ideas")` reaches the FastAPI
backend's `POST /ideas`. Run the backend separately (see the API repo
README).

## Build

```bash
npm run build
```

Runs `tsc -b` (typecheck) then `vite build`; output goes to `web/dist/`. This
is the acceptance gate for this feature — it must succeed with zero errors.

```bash
npm run preview   # serve the production build locally
```

## Project structure

```
src/
  api/          typed fetch client + one module per backend resource
                (ideas, analyze, history, health, admin) + domain types
  components/   shared UI (AppShell, cards, badges, state blocks) and the
                graph/ subfolder (React Flow node/edge rendering, legend,
                detail panel, mermaid renderer)
  hooks/        useAsyncAction (on-demand calls), useAsyncData (load-on-
                mount), useAuth, useSidebar
  lib/          auth helpers, dagre graph layout, mermaid render helper
  pages/        one file per route (Ideas, Repository Intelligence, History,
                AnalysisDetail, RunDetail, Admin, Profile)
  theme/        design tokens (tokens.css) + base styles/motifs (base.css)
```

This is intentionally modular so future scope can add new `pages/`, `api/`,
and `hooks/` without restructuring what's here.

## Design system

A warm editorial "paper" aesthetic (in the spirit of october.dev), expressed
entirely as CSS custom properties in `src/theme/tokens.css` — colors,
fonts, spacing, and per-node/edge-type graph accents. Component CSS
consumes these tokens; nothing is hardcoded. Fonts (Inter, Fraunces,
JetBrains Mono) are loaded via a Google Fonts `@import` in `tokens.css`.

## Backend endpoints covered

`POST /ideas`, `POST /expand`, `POST /export`, `GET /history`,
`GET /runs/{run_id}`, `POST /analyze`, `GET /analyze/{run_id}`,
`GET /analyses`, `GET /health`, `GET /ready`. See `src/api/types.ts` for the
full typed contract.

## Known TODOs

- The architecture graph re-runs dagre layout on every filter toggle; fine
  at modest scale (~25 nodes) but worth memoizing/virtualizing for very
  large real repos.
