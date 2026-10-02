### opensociety

**opensociety** is a privacy-first, open-source society management platform — an alternative to MyGate and NoBrokerHood for gated communities. The code is open and your data is portable: you own your deployment.

## Tech Stack

**Frontend:**
- Web: [TanStack Start](https://tanstack.com/start) (React) + TanStack Query
- Mobile: [Expo](https://expo.dev) Router (React Native, SDK 57) + TanStack Query

**Backend:**
- API: [Hono](https://hono.dev) on Node 22 for shared hosting; Cloudflare Workers adapter also available
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
  api      Hono API with Node and Cloudflare Workers adapters
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

Per-society secrets (`DATABASE_URL`, `CLERK_*`, R2) go in `apps/api/.dev.vars` for local Workers development. Node hosting uses runtime environment variables. See [the deployment guide](deploy/README.md) for container builds, configuration, migrations, scheduled jobs, and rollback.

Clerk sessions authenticate web and mobile requests. The API accepts the local `x-user-id` fallback only when no Clerk secret is configured. Keep development identity overrides out of preview and store builds.

## Mobile builds

EAS project: [ankitsejwal/opensociety](https://expo.dev/accounts/ankitsejwal/projects/opensociety). Run EAS commands from `apps/mobile`. `eas.json` provides development, iOS simulator, preview APK/ad-hoc, TestFlight, and Play internal profiles. Development installs use `com.opensociety.app.dev`; preview and store installs use `com.opensociety.app`. EAS manages store build numbers. The post-install hook builds the shared workspace package before Metro runs.

```sh
eas build --platform ios --profile simulator
eas build --platform android --profile development
eas build --platform ios --profile testflight
eas build --platform android --profile play-internal
```

Both developer memberships are available. OpenSociety needs its own store app records and signing/provisioning credentials. The existing Google publishing service account currently has Lucidity-only access. Configure the OpenSociety credentials in EAS and grant testing-track access for this app before submitting. Set the new App Store Connect app ID in `submit.testflight.ios.ascAppId` once Apple creates it. Play submission starts as a draft for the first Console rollout.

Configure `EXPO_PUBLIC_API_URL` and `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` in each EAS environment. Preview/store builds require HTTPS and reject `EXPO_PUBLIC_DEV_USER_ID`; store profiles also require a live Clerk key. The current local `.env` is for development and cannot be used to ship the app. Android push will also need an EAS file variable `GOOGLE_SERVICES_JSON` for this app's Firebase configuration. Keep signing keys and service-account JSON outside Git.

The manual **Mobile build** GitHub workflow requires a repository `EXPO_TOKEN` secret and waits for the selected EAS build. It does not submit automatically. After a successful store build, use `eas submit --platform ios --profile testflight --id BUILD_ID` or `eas submit --platform android --profile play-internal --id BUILD_ID`, then verify processing and tester access in the corresponding store.

## Push notifications

The service supports visitor approval/check-in alerts, notice publication (all residents or a selected tower), blocked/towed vehicle alerts, and maintenance reminders. The mobile app registers devices after permission is granted, refreshes tokens on foreground, removes registration before sign-out, and opens the relevant screen when a notification is tapped.

Apply migration `0023_push_delivery.sql` before enabling push. The database stores per-account tokens and a durable delivery outbox with event/device deduplication, bounded retries, Expo receipt checks, and stale/dead-token cleanup. Expo ticket acceptance is not treated as delivery. Messages can still arrive more than once if an upstream timeout occurs after Expo accepted a request. Gate messages take precedence over broadcasts; dispatch is limited to 500 messages per pass, with follow-up jobs draining larger backlogs. Terminal deliveries are retained for seven days and expired work is discarded.

For the current Workers adapter, provision `opensociety-push` and `opensociety-push-failed`, then deploy the queue bindings in `apps/api/wrangler.jsonc`. Queue wake-ups carry no personal data and run only while deliveries/receipts are pending. The morning reminder run also recovers outbox records whose wake-up publication failed. Monitor the dead-letter queue for repeated failures.

| Setting | Purpose |
| --- | --- |
| `PUSH_ENABLED=true` | Enable after the migration, queue bindings, and app credentials are ready; defaults to false. |
| `EXPO_ACCESS_TOKEN` | Server secret, required if enhanced push security is enabled for this EAS project. |
| `BILL_REMINDER_DAYS=-7,0,3` | Days relative to the due date; configurable per society. |
| `SOCIETY_TIME_ZONE=Asia/Kolkata` | Calendar days and morning reminder window (the first hourly run in the local 09:00 hour). |

Configure this app's APNs credential in EAS for iOS. For Android, configure the Firebase app matching the chosen build's package ID, its `GOOGLE_SERVICES_JSON` file, and the FCM v1 service-account credential in EAS. Lucidity's app-specific credentials do not substitute for these. Rebuild the native app after changing notification credentials/configuration. Use a development or store build for testing; Expo Go does not exercise this setup.

Before pilot distribution, verify on physical iOS and Android devices: permission grant/denial; foreground/background/cold-start notification taps; resident and guard event routing; tower targeting; partial/paid/cancelled bill reminders; token refresh; sign-out and account switching. Database integration tests cover queue claims, deduplication, retries, receipts, account reassignment, and dead-token removal; they do not prove delivery through APNs/FCM.

The shared DigitalOcean Droplet is not provisioned yet. A Node API adapter, web server, R2 S3 adapter, restart recovery, and container configuration are prepared in [the deployment guide](deploy/README.md). Store profiles still need the deployed HTTPS API and live Clerk configuration.

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
