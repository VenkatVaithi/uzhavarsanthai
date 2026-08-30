# Farmers Market

A marketplace website where farmers list and sell fresh produce, dairy, meats, honey, and handmade goods directly to local buyers.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080)
- `pnpm --filter @workspace/farm-market run dev` — run the frontend (Vite)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite, Tailwind CSS, Framer Motion, wouter, React Query
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod, `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `lib/api-spec/openapi.yaml` — API contract (source of truth)
- `lib/db/src/schema/` — Drizzle DB schema (farmers, categories, products, orders, order_items)
- `artifacts/api-server/src/routes/` — Express route handlers
- `artifacts/farm-market/src/pages/` — React pages
- `artifacts/farm-market/src/context/cart.tsx` — Cart state (local, persisted to localStorage)
- `artifacts/farm-market/src/components/layout.tsx` — Nav + footer wrapper
- `lib/api-client-react/src/generated/` — Generated React Query hooks (do not edit)
- `lib/api-zod/src/generated/` — Generated Zod schemas for server validation (do not edit)

## Architecture decisions

- OpenAPI-first: all API contracts defined in `lib/api-spec/openapi.yaml`, hooks and Zod schemas generated from it
- Cart is browser-local (localStorage), submitted as a single order via the API at checkout — no server-side cart
- Featured products are a boolean flag on each product, served via `/api/products/featured`
- Orders calculate total server-side from current product prices at time of order placement
- Zod is imported as `"zod"` (not `"zod/v4"`) in the API server for compatibility

## Product

- Farmers can be browsed and their profile pages show all their products
- Products can be filtered by category, farmer, and searched by name
- Cart persists across page refreshes, users checkout with name + email
- Order history is available at `/orders` with detail pages per order
- Homepage shows market stats (live from DB), featured products, and CTAs

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- Use `"zod"` import (not `"zod/v4"`) in api-server routes — the `zod/v4` subpath isn't available in the server build
- After changing `lib/api-spec/openapi.yaml`, run `pnpm --filter @workspace/api-spec run codegen` before touching frontend code
- Run `pnpm run typecheck:libs` after any lib change before leaf artifact typechecks

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
