### opensociety

**opensociety** is a privacy-first, open-source society management platform — an alternative to MyGate and NoBrokerHood for gated communities. The code is open and your data is portable: you own your deployment.

## Tech Stack

**Frontend:**
- Web: [TanStack Start](https://tanstack.com/start) (React) + TanStack Query
- Mobile: [Expo](https://expo.dev) Router (React Native, SDK 54) + TanStack Query

**Backend:**
- API: [Hono](https://hono.dev) on [Cloudflare Workers](https://workers.cloudflare.com)
- Database: [Neon Postgres](https://neon.tech) via [Drizzle ORM](https://orm.drizzle.team) (neon-http driver)
- Shared contracts: Zod (`@opensociety/shared`)

**Authentication:**
- [Clerk](https://clerk.com) (web + mobile), authn-only with a local user mirror. Resident OTP uses Clerk's built-in phone OTP — no separate SMS provider for auth.

**Storage & Services:**
- Photos/documents: Cloudflare R2
- Push notifications: Expo Push

## Architecture

- **Single-tenant per society:** each society runs its own API + database instance (no `society_id`; a single `society_config` row). Complete data isolation.
- **Shared mobile app:** one app across all societies (App Store + Play Store).

See `BLOCKING_DECISIONS.md` (in the Obsidian notes) for the rationale behind tenancy, host, auth, and MVP-scope decisions.

## Monorepo

```
apps/
  api      Hono API on Cloudflare Workers (wrangler)
  web      TanStack Start admin dashboard
  mobile   Expo Router app (residents + guards)
packages/
  db       Drizzle schema + migrations (Neon)
  shared   Zod contracts shared across api/web/mobile
  typescript-config  shared tsconfig bases
```

## Quickstart

```
pnpm install
pnpm check-types                              # type-check all packages
pnpm --filter @opensociety/db db:generate    # generate a migration from the schema
pnpm --filter @opensociety/api dev           # wrangler dev (needs apps/api/.dev.vars)
pnpm --filter @opensociety/web dev           # http://localhost:3000
```

Then open the admin dashboard at **http://localhost:3000/admin**.

### Environment

Copy the example env files and fill in real values (all are gitignored):

```
cp apps/api/.dev.vars.example apps/api/.dev.vars   # DATABASE_URL, CLERK_* (API)
cp apps/web/.env.example apps/web/.env             # VITE_API_URL, VITE_DEV_USER_ID (web)
```

Per-society secrets (`DATABASE_URL`, `CLERK_*`, R2) go in `apps/api/.dev.vars` for local dev and `wrangler secret put` for production. See `.env.example` for the full list.

Until Clerk sessions are wired into the web app, set `VITE_DEV_USER_ID` to a real `users.id` so authored writes (publishing notices, approving visitors) attribute correctly.

## Admin dashboard

The web app (`apps/web`) is a shadcn/ui dashboard with light + dark mode at `/admin`:

- **Overview** — at-a-glance counts and a setup checklist
- **Society** — society configuration
- **Apartments** — add units individually or via bulk CSV import
- **Residents** — approve sign-ups (assign apartment + relation) and manage roles
- **Guards** — register gate staff, activate/deactivate
- **Visitors** — visitor logs with status filters, approve/deny
- **Notices** — publish announcements with priority and expiry

## CI

GitHub Actions runs build + type-check on every push and PR to `main` (`.github/workflows/ci.yml`).

## Documentation

- **Roadmap:** tracked in Lucidity (M0–M4 milestones)
- **Database schema:** `packages/db/schema.dbml` + generated migrations in `packages/db/drizzle/`

---

Built with ❤️ for transparency, privacy, and community ownership.
