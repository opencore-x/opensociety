CREATE TYPE "public"."notice_category" AS ENUM('GENERAL', 'MAINTENANCE', 'EVENT', 'SECURITY', 'BILLING', 'EMERGENCY');--> statement-breakpoint
ALTER TABLE "notices" ADD COLUMN "category" "notice_category" DEFAULT 'GENERAL' NOT NULL;--> statement-breakpoint
ALTER TABLE "notices" ADD COLUMN "attachment_url" text;--> statement-breakpoint
ALTER TABLE "notices" ADD COLUMN "attachment_name" text;