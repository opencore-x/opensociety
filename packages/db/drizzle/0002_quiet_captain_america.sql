CREATE TYPE "public"."house_help_type" AS ENUM('MAID', 'COOK', 'DRIVER', 'NANNY', 'GARDENER', 'CARETAKER', 'OTHER');--> statement-breakpoint
CREATE TYPE "public"."id_proof_type" AS ENUM('AADHAAR', 'PAN', 'VOTER_ID', 'DRIVING_LICENSE', 'PASSPORT', 'OTHER');--> statement-breakpoint
CREATE TABLE "house_help" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"phone" text,
	"type" "house_help_type" DEFAULT 'OTHER' NOT NULL,
	"photo_url" text,
	"id_proof_type" "id_proof_type",
	"id_proof_number" text,
	"id_proof_url" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"registered_by" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "house_help" ADD CONSTRAINT "house_help_registered_by_users_id_fk" FOREIGN KEY ("registered_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;