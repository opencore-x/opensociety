CREATE TYPE "public"."background_check_status" AS ENUM('PENDING', 'CLEARED', 'FLAGGED');--> statement-breakpoint
ALTER TABLE "house_help" ADD COLUMN "id_verified" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "house_help" ADD COLUMN "background_check" "background_check_status" DEFAULT 'PENDING' NOT NULL;--> statement-breakpoint
ALTER TABLE "house_help" ADD COLUMN "incident_count" integer DEFAULT 0 NOT NULL;