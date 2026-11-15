<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Project notes

Next.js 16.4 App Router app (`src/app`); currently boilerplate plus static map data.

## Commands

Use **pnpm** (`pnpm-lock.yaml` is the lockfile; `package-lock.json` was removed — ignore the `npm` instructions in `README.md`).

- `pnpm dev` / `pnpm build` / `pnpm start`
- `pnpm lint` — Biome (`biome check`), not ESLint. It also enforces formatting, so a formatting diff fails lint.
- `pnpm exec biome check --write` — fix lint + format + import order.
- `pnpm format` — formatting only (`biome format --write`); does not fix lint.
- `pnpm exec tsc --noEmit` — typecheck (no script exists).
- No test runner, CI, or pre-commit config is set up. Don't invent `pnpm test`.

## Next.js specifics

- `next.config.ts` enables `cacheComponents` + `partialPrefetching` (PPR). Data fetching is dynamic by default; cache explicitly with `use cache`, and wrap dynamic content in Suspense or builds/prerendering fail. Don't use `experimental.ppr`, `experimental_ppr`, or route `runtime` exports. See `node_modules/next/dist/docs/01-app/03-api-reference/05-config/01-next-config-js/cacheComponents.md`.
- `reactCompiler: true` is on; don't add manual `useMemo`/`memo` as a default.
- Tailwind v4 is wired through the `turbopack.rules` loader for `*.css`; import it only via `@import "tailwindcss"` in `src/app/globals.css`. There is no `tailwind.config.*`; theme tokens live in the `@theme inline` block.
- `LayoutProps<"/">` (used in `src/app/layout.tsx`) is a Next-generated global type — do not import it.
- `@/*` maps to `src/*` (`tsconfig.json`). Pages live under `src/app`, not root `app/` as `README.md` says.

## Map data

`public/data/*.json` are GeoJSON **`Feature`** objects (one `MultiPolygon` each), not `FeatureCollection`s, for kecamatan in Pasaman Barat (Sumatera Barat). They are served as static files at `/data/<file>.json` and are not yet referenced by any code. Filenames are camelCase and not all clean: `sasakRanahPasisia..json` has a double dot.

## Conventions

- Biome: 2-space indent, double quotes, automatic import organization; CSS Tailwind directives are enabled.
- Keep the generated block above intact; Next.js rewrites it on `next dev` and preserves everything outside the markers.
