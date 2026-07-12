import { pgTable, uuid, timestamp, unique } from 'drizzle-orm/pg-core'
import { notices } from './notices'
import { users } from './users'

// Read receipt: one row per (notice, user) the first time they open it. The
// unique pair keeps marking-as-read idempotent; readAt drives engagement stats.
export const noticeReads = pgTable(
  'notice_reads',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    noticeId: uuid('notice_id')
      .notNull()
      .references(() => notices.id),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id),
    readAt: timestamp('read_at').defaultNow().notNull(),
  },
  (t) => [unique('notice_reads_notice_user_unq').on(t.noticeId, t.userId)],
)
