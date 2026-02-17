### opensociety

**opensociety** is a privacy-first, self-hosted society management platform - an open-source alternative to MyGate and NoBrokerHood for gated communities.

## Tech Stack

**Frontend:**
- Web: [TanStack Start](https://tanstack.com/start) (React-based meta-framework)
- Mobile: [Expo](https://expo.dev) (React Native, SDK 54)

**Backend:**
- API: [Hono](https://hono.dev) (hosted on Render)
- Database: [Neon Postgres](https://neon.tech) (serverless PostgreSQL)
- ORM: [Drizzle](https://orm.drizzle.team)

**Authentication:**
- [Clerk](https://clerk.com) (web + mobile)

**Storage & Services:**
- Photos: Cloudflare R2
- Push Notifications: Expo Push (free tier)
- SMS/OTP: TBD (Twilio/MSG91/Exotel)

**Deployment Model:**
- Mobile App: Shared across all societies (App Store + Play Store)
- API + Database: Per-society instances (each society pays for their own)

## Documentation

- **Roadmap:** Tracked in [Lucidity](https://lucidity.app) (M0-M4 milestones)
- **Database Schema:** [dbdocs.io](https://dbdocs.io) (DBML)
- **Detailed Docs:** See Obsidian notes at `~/Library/Mobile Documents/.../Notes/Projects/opensociety/`

---

Built with ❤️ for transparency, privacy, and community ownership.
