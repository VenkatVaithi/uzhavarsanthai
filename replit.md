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
- Authentication uses Replit-managed Clerk. Clerk keys are provisioned as workspace secrets.
- Production requires `VITE_CLERK_PROXY_URL=/api/__clerk`; the frontend build fails fast if the Clerk proxy path is missing.

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite, Tailwind CSS, Framer Motion, wouter, React Query
- API: Express 5
- Auth: Clerk for Google/account login and cookie-based web sessions
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
- Clerk session claims bridge authenticated users to the existing local `users.id`; the local users table remains the source for app relationships. Order-management grants use server-managed Clerk public metadata (see below).
- Zod is imported as `"zod"` (not `"zod/v4"`) in the API server for compatibility

## Product

- Farmers can be browsed and their profile pages show all their products
- Products can be filtered by category, farmer, and searched by name
- Cart persists across page refreshes, users checkout with name + email
- Order history is available at `/orders` with detail pages per order
- Homepage shows market stats (live from DB), featured products, and CTAs

## Order-management access

- `PATCH /api/orders/:id` requires Clerk authentication and a local account.
- Grant access using the user's **public metadata** in the appropriate Clerk environment: `{"role":"admin"}` for an administrator, or `{"role":"farmer","farmerId":123}` for a farmer linked to the existing numeric farm ID. Preserve unrelated metadata. Do not use user-editable unsafe metadata.
- No role is granted automatically when signing up or registering a farm. Accounts without a management grant, including buyers, cannot update order statuses.
- Grants are fetched from Clerk on each update so revocation does not wait for session refresh. A failed permission lookup does not permit an update.
- A farmer may update only non-empty orders containing exclusively their farm's products. Mixed-farm orders require an administrator because the current status belongs to the entire order, not to individual farms.

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- Use `"zod"` import (not `"zod/v4"`) in api-server routes — the `zod/v4` subpath isn't available in the server build
- After changing `lib/api-spec/openapi.yaml`, run `pnpm --filter @workspace/api-spec run codegen` before touching frontend code
- Run `pnpm run typecheck:libs` after any lib change before leaf artifact typechecks

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
