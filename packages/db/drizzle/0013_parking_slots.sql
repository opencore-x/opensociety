CREATE TYPE "public"."parking_slot_type" AS ENUM('COVERED', 'OPEN');--> statement-breakpoint
CREATE TABLE "parking_slots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slot_number" text NOT NULL,
	"type" "parking_slot_type" DEFAULT 'OPEN' NOT NULL,
	"apartment_id" uuid,
	"is_temporary" boolean DEFAULT false NOT NULL,
	"assigned_until" timestamp,
	"assigned_by" uuid,
	"assigned_at" timestamp,
	"notes" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "parking_slots_slot_number_unq" UNIQUE("slot_number")
);
--> statement-breakpoint
ALTER TABLE "parking_slots" ADD CONSTRAINT "parking_slots_apartment_id_apartments_id_fk" FOREIGN KEY ("apartment_id") REFERENCES "public"."apartments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "parking_slots" ADD CONSTRAINT "parking_slots_assigned_by_users_id_fk" FOREIGN KEY ("assigned_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;