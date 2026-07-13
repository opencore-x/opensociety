import { pgTable, uuid, integer, text, timestamp, unique } from 'drizzle-orm/pg-core'
import { houseHelp } from './house-help'
import { users } from './users'

// Resident ratings/reviews of house help. reviewerId is stored for one-review-
// per-resident dedup (upsert) but is NEVER exposed by the API — reviews are
// anonymous to everyone. rating is 1..5 (enforced at the schema layer).
export const houseHelpReviews = pgTable(
  'house_help_reviews',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    houseHelpId: uuid('house_help_id')
      .notNull()
      .references(() => houseHelp.id),
    reviewerId: uuid('reviewer_id')
      .notNull()
      .references(() => users.id),
    rating: integer('rating').notNull(),
    comment: text('comment'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (t) => [unique('house_help_reviews_help_reviewer_unq').on(t.houseHelpId, t.reviewerId)],
)
