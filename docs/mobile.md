# Mobile development and release

[Back to OpenSociety](../README.md)

## Local development

Use the root pnpm workspace install and a running development API. Create `apps/mobile/.env` (gitignored) with public development configuration:

```dotenv
EXPO_PUBLIC_API_URL=http://localhost:8787
EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
```

Use the same Clerk instance as the API. An Android emulator reaches the host API at `http://10.0.2.2:8787`; a physical phone needs a reachable LAN address. When working without Clerk locally, omit the publishable key and set `EXPO_PUBLIC_DEV_USER_ID` to a real development user ID. The API accepts that override only when no Clerk secret is configured. Never use development identity overrides in preview or store builds.

From the repository root:

```sh
pnpm --filter @opensociety/shared build
pnpm --filter @opensociety/mobile start
```

Open Metro with an installed development build. Build profiles and native credentials are described below. [Mobile component guidance](../apps/mobile/components/README.md) covers visual changes, text scaling, safe areas, and native review.

## Release status

The mobile design was reviewed on iPhone and Android simulators on 2026-10-03. The remaining release checks include physical-device acceptance, spoken VoiceOver/TalkBack testing, live authentication, and push delivery. Store distribution also requires a deployed HTTPS API and app-specific credentials. English and Hindi are available; additional regional languages are deferred.

## Build profiles

EAS project: [ankitsejwal/opensociety](https://expo.dev/accounts/ankitsejwal/projects/opensociety). Run EAS commands from `apps/mobile`. `eas.json` provides development, iOS simulator, preview APK/ad-hoc, TestFlight, and Play internal profiles. Development installs use `com.opensociety.app.dev`; preview and store installs use `com.opensociety.app`. EAS manages store build numbers. The post-install hook builds the shared workspace package before Metro runs.

```sh
eas build --platform ios --profile simulator
eas build --platform android --profile development
eas build --platform ios --profile testflight
eas build --platform android --profile play-internal
```

Apple and Google developer memberships are available. OpenSociety still needs its own store app records, signing/provisioning credentials, and a Google publishing service account with access to this app. Configure the OpenSociety credentials in EAS and grant testing-track access for this app before submitting. Set the new App Store Connect app ID in `submit.testflight.ios.ascAppId` once Apple creates it. Play submission starts as a draft for the first Console rollout.

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

Configure this app's APNs credential in EAS for iOS. For Android, configure the Firebase app matching the chosen build's package ID, its `GOOGLE_SERVICES_JSON` file, and the FCM v1 service-account credential in EAS. Credentials for another app do not substitute for these. Rebuild the native app after changing notification credentials/configuration. Use a development or store build for testing; Expo Go does not exercise this setup.

Before pilot distribution, verify on physical iOS and Android devices: permission grant/denial; foreground/background/cold-start notification taps; resident and guard event routing; tower targeting; partial/paid/cancelled bill reminders; token refresh; sign-out and account switching. Database integration tests cover queue claims, deduplication, retries, receipts, account reassignment, and dead-token removal; they do not prove delivery through APNs/FCM.

The shared DigitalOcean Droplet is not provisioned yet. A Node API adapter, web server, R2 S3 adapter, restart recovery, and container configuration are prepared in [the deployment guide](../deploy/README.md). Store profiles still need the deployed HTTPS API and live Clerk configuration.
