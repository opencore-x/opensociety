CREATE TYPE "public"."account_type" AS ENUM('ASSET', 'LIABILITY', 'INCOME', 'EXPENSE', 'FUND');--> statement-breakpoint
CREATE TYPE "public"."journal_source" AS ENUM('BILL', 'PAYMENT', 'EXPENSE', 'INTEREST', 'WAIVER', 'MANUAL', 'OPENING', 'ADJUSTMENT');--> statement-breakpoint
CREATE TABLE "accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"type" "account_type" NOT NULL,
	"parent_id" uuid,
	"is_group" boolean DEFAULT false NOT NULL,
	"is_mutual" boolean,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "accounts_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "journal_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entry_date" date NOT NULL,
	"narration" text NOT NULL,
	"source_type" "journal_source" NOT NULL,
	"source_id" uuid,
	"period" text NOT NULL,
	"is_reversal" boolean DEFAULT false NOT NULL,
	"reverses_id" uuid,
	"created_by" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "journal_lines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entry_id" uuid NOT NULL,
	"account_id" uuid NOT NULL,
	"debit" integer DEFAULT 0 NOT NULL,
	"credit" integer DEFAULT 0 NOT NULL,
	"apartment_id" uuid,
	"vendor_id" uuid,
	"memo" text
);
--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_parent_id_accounts_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "journal_entries" ADD CONSTRAINT "journal_entries_reverses_id_journal_entries_id_fk" FOREIGN KEY ("reverses_id") REFERENCES "public"."journal_entries"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "journal_entries" ADD CONSTRAINT "journal_entries_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "journal_lines" ADD CONSTRAINT "journal_lines_entry_id_journal_entries_id_fk" FOREIGN KEY ("entry_id") REFERENCES "public"."journal_entries"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "journal_lines" ADD CONSTRAINT "journal_lines_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "journal_lines" ADD CONSTRAINT "journal_lines_apartment_id_apartments_id_fk" FOREIGN KEY ("apartment_id") REFERENCES "public"."apartments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "accounts_type_idx" ON "accounts" USING btree ("type");--> statement-breakpoint
CREATE INDEX "accounts_parent_id_idx" ON "accounts" USING btree ("parent_id");--> statement-breakpoint
CREATE INDEX "journal_entries_period_idx" ON "journal_entries" USING btree ("period");--> statement-breakpoint
CREATE INDEX "journal_entries_source_type_idx" ON "journal_entries" USING btree ("source_type");--> statement-breakpoint
CREATE UNIQUE INDEX "journal_entries_source_uniq" ON "journal_entries" USING btree ("source_type","source_id") WHERE "journal_entries"."source_type" in ('BILL', 'PAYMENT', 'EXPENSE', 'INTEREST');--> statement-breakpoint
CREATE INDEX "journal_lines_entry_id_idx" ON "journal_lines" USING btree ("entry_id");--> statement-breakpoint
CREATE INDEX "journal_lines_account_id_idx" ON "journal_lines" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "journal_lines_apartment_id_idx" ON "journal_lines" USING btree ("apartment_id");