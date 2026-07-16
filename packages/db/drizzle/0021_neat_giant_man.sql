CREATE TYPE "public"."expense_status" AS ENUM('PAID', 'PAYABLE');--> statement-breakpoint
CREATE TYPE "public"."tds_section" AS ENUM('SEC_194C', 'SEC_194J', 'SEC_194I');--> statement-breakpoint
CREATE TABLE "expenses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"vendor_id" uuid,
	"account_id" uuid NOT NULL,
	"amount" integer NOT NULL,
	"tax_amount" integer DEFAULT 0 NOT NULL,
	"status" "expense_status" DEFAULT 'PAID' NOT NULL,
	"description" text NOT NULL,
	"bill_ref" text,
	"method" "payment_method",
	"paid_at" timestamp,
	"attachment_url" text,
	"recorded_by" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tds_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"expense_id" uuid NOT NULL,
	"section" "tds_section" NOT NULL,
	"rate_pct" integer NOT NULL,
	"amount" integer NOT NULL,
	"deducted_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vendors" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"category" text,
	"pan" text,
	"gstin" text,
	"contact" text,
	"bank_account" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_vendor_id_vendors_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_recorded_by_users_id_fk" FOREIGN KEY ("recorded_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tds_entries" ADD CONSTRAINT "tds_entries_expense_id_expenses_id_fk" FOREIGN KEY ("expense_id") REFERENCES "public"."expenses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "expenses_account_id_idx" ON "expenses" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "expenses_vendor_id_idx" ON "expenses" USING btree ("vendor_id");--> statement-breakpoint
CREATE INDEX "expenses_created_at_idx" ON "expenses" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "tds_entries_expense_id_idx" ON "tds_entries" USING btree ("expense_id");--> statement-breakpoint
CREATE INDEX "tds_entries_section_idx" ON "tds_entries" USING btree ("section");