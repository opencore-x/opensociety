# Shared Droplet deployment

The Droplet is not provisioned, confirmed on 2026-10-02. No public deployment, production migration, DNS change, or image publication has been performed. Shared account and billing facts remain in the shared hosting memory.

Run one API and one web container per society, with Neon for the database and R2 for object storage. A shared host-level Caddy process terminates HTTPS and forwards to loopback-only ports. Each container has a 384 MiB memory cap. Measure these initial limits alongside the other shared applications before claiming capacity. Build images in GitHub Actions. Local development uses pnpm workspaces and Turborepo to keep Docker images and cache off the Mac.

## Build

Use Node 22 and pnpm 10.0.0 from the repository root:

```sh
pnpm install --frozen-lockfile
pnpm build
pnpm check-types
pnpm lint
pnpm test
pnpm --filter @opensociety/api build:node
```

Use `pnpm dev` for local API/web development. CI builds and smoke-tests both containers without using local Docker storage.

Only public configuration goes into web build arguments. Secrets belong in the API runtime environment. Production web builds require a live Clerk publishable key. Production API runtime requires a live secret unless `APP_ENV=staging` is explicit. Both require exact HTTPS origins. Set `WEB_ORIGINS` for the Workers adapter too if deploying it.

The manual **Build hosting images** GitHub workflow builds `linux/amd64` images. Set the chosen GitHub environment's `API_ORIGIN` and `CLERK_PUBLISHABLE_KEY` variables first. Run it against a revision whose CI passed. Tags include the environment and full commit SHA; record image digests for deployment and rollback. This workflow publishes images when manually invoked and does not connect to a server.

## First deployment

1. Provision the shared host and confirm its SSH alias, domains, firewall, Caddy installation, available memory, and unused application ports. Keep application ports on loopback.
2. Create a production Neon database/branch, configure the society's Clerk instance and webhook, and create an R2 bucket with bucket-scoped object read/write credentials. Set Clerk application URLs to the actual web domain. The webhook endpoint is `/webhooks/clerk` on the API host.
3. Back up the database or create a recovery branch. Review the query below before migration 0024 on an existing database. Resolve duplicates through an accounting review; the migration never deletes bills or payments. From the exact release checkout, run `pnpm --filter @opensociety/db db:migrate` with `DATABASE_URL` supplied securely. Migrations do not run during container startup.
4. Copy `compose.yaml`, `.env.example`, and `api.env.example` to a protected directory on the host. Rename the examples to `.env` and `api.env`, fill in actual values and immutable image references, then run `chmod 600 .env api.env`. Use a read-only GHCR token if image packages are private.
5. Run `docker compose pull` and `docker compose up -d`. Add the sites from `Caddyfile.example` to the existing host configuration, validate it, and reload Caddy. Configure DNS and verify HTTPS.
6. Check both `/health` endpoints, rendered pages, static assets, Clerk sign-in, role restrictions, private uploads, and the webhook. Health checks deliberately avoid Neon, so they do not wake a suspended database or certify database availability.
7. Review saved billing configuration before setting `BILLING_ENABLED=true`. Enable push after app-specific APNs/FCM setup and physical-device verification. Set the public API URL and matching Clerk publishable key in EAS, then rebuild pilot profiles.

```sql
SELECT apartment_id, period_month, count(*)
FROM maintenance_bills
WHERE type = 'MONTHLY' AND period_month IS NOT NULL
GROUP BY apartment_id, period_month
HAVING count(*) > 1;
```

## Jobs and recovery

Billing and push are initially disabled. Enabling billing generates missing bills for the current UTC month at startup, then schedules 00:00 UTC on the first. It does not backfill older months. Monthly uniqueness prevents duplicate admin/cron runs. Bills and charges commit atomically; journal headers and lines also commit atomically. Repeated monthly runs recover missing ledger entries in batches of 100.

Push retains its durable database outbox. Node runs recovery at startup, then schedules timers only for pending deliveries/receipts. Business events wake the dispatcher; empty queues do not poll Neon. Hourly reminder checks query the database only during the local 09:00 hour. That daily run also recovers missed wake-ups. Job failures retry after one minute. Run one Node API process per society; disable Workers cron and queue consumption before enabling Node jobs.

SIGTERM stops new work and drains requests/jobs for up to 25 seconds; Docker allows 30 seconds. Interrupted outbox leases expire for later recovery. Check `docker compose ps`, `docker compose logs --tail=100 api web`, and `docker stats --no-stream`. Avoid printing interpolated Compose configuration because it includes secrets from `api.env`.

## Release and rollback

Pull immutable images, apply reviewed migrations once, update `.env`, and run `docker compose up -d`. Verify authentication and representative reads/writes before enabling jobs. Keep previous image references and a database recovery point. To roll back the application, restore those references and run `docker compose up -d`; do not reverse financial data or migrations automatically. Migration 0024 only adds an index.

Local PostgreSQL tests cover 1,000-apartment billing, batched journal posting, failed-write rollback, and deduplication. They do not establish Droplet or Neon capacity. Run staging load tests using an isolated database before claiming the 1,000-concurrent-user or 10,000-visitor/day targets.

References: [Hono Node adapter](https://hono.dev/docs/getting-started/nodejs), [pnpm portable deployment](https://pnpm.io/10.x/cli/deploy).
