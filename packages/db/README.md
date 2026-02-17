# @opensociety/db

Database package for OpenSociety using Drizzle ORM and Neon Postgres.

## Setup

1. Copy `.env.example` to `.env` and add your Neon database URL
2. Install dependencies: `pnpm install`
3. Generate migrations: `pnpm db:generate`
4. Run migrations: `pnpm db:migrate`

## Scripts

- `db:generate` - Generate migration files from schema
- `db:migrate` - Run migrations
- `db:push` - Push schema changes directly (dev only)
- `db:studio` - Open Drizzle Studio

## Schema

Current tables:
- `users` - User accounts (linked to Clerk)
- `societies` - Gated communities
- `apartments` - Units within societies
- `visitors` - Visitor check-ins

## Usage

```typescript
import { db } from '@opensociety/db'

const users = await db.query.users.findMany()
```
