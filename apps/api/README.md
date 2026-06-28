# @opensociety/api

Hono API for OpenSociety, running on **Cloudflare Workers** (single-tenant: one deployment per society).

## Local dev

Create `apps/api/.dev.vars` (gitignored) with the secrets:

```
DATABASE_URL=postgresql://...    # this society's Neon database
CLERK_SECRET_KEY=sk_...
CLERK_PUBLISHABLE_KEY=pk_...
CLERK_WEBHOOK_SECRET=whsec_...
```

Then:

```
pnpm --filter @opensociety/api dev      # wrangler dev (http://localhost:8787)
pnpm --filter @opensociety/api build    # type-check (tsc --noEmit)
pnpm --filter @opensociety/api deploy   # wrangler deploy (needs CF auth)
```

Set the same secrets in production with `wrangler secret put <NAME>`.

## Routes

- `GET /health`, `GET /` — health (no DB).
- `GET|PUT /society` — single society config (upsert).
- `GET|POST /apartments`, `POST /apartments/bulk` — apartments + bulk import.
- `GET|POST /visitors`, `POST /visitors/:id/{approve,deny,checkin,checkout}` — visitor workflow.
- `GET|POST /visitors/pre-approvals`, `POST /visitors/pre-approvals/redeem` — pre-approval codes.
- `GET /users`, `POST /users/:id/approve`, `PATCH /users/:id/role` — user/approval admin.
- `GET|POST /notices` — notice board.

Auth is currently a dev stand-in (`x-user-id` / `x-guard-id` headers); these will be replaced by Clerk session verification.
