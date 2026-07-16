ALTER TABLE "bill_config" ADD COLUMN "interest_enabled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "bill_config" ADD COLUMN "interest_rate_pct" integer DEFAULT 18 NOT NULL;--> statement-breakpoint
ALTER TABLE "bill_config" ADD COLUMN "grace_period_days" integer DEFAULT 15 NOT NULL;