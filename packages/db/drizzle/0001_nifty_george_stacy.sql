CREATE TYPE "public"."ticket_category" AS ENUM('PLUMBING', 'ELECTRICAL', 'CARPENTRY', 'HOUSEKEEPING', 'SECURITY', 'OTHER');--> statement-breakpoint
CREATE TYPE "public"."ticket_priority" AS ENUM('LOW', 'NORMAL', 'HIGH', 'URGENT');--> statement-breakpoint
CREATE TYPE "public"."ticket_status" AS ENUM('OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED', 'CANCELLED');--> statement-breakpoint
CREATE TABLE "maintenance_tickets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"apartment_id" uuid NOT NULL,
	"raised_by" uuid NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"category" "ticket_category" DEFAULT 'OTHER' NOT NULL,
	"priority" "ticket_priority" DEFAULT 'NORMAL' NOT NULL,
	"status" "ticket_status" DEFAULT 'OPEN' NOT NULL,
	"assigned_to" uuid,
	"resolution_note" text,
	"resolved_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "maintenance_tickets" ADD CONSTRAINT "maintenance_tickets_apartment_id_apartments_id_fk" FOREIGN KEY ("apartment_id") REFERENCES "public"."apartments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maintenance_tickets" ADD CONSTRAINT "maintenance_tickets_raised_by_users_id_fk" FOREIGN KEY ("raised_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maintenance_tickets" ADD CONSTRAINT "maintenance_tickets_assigned_to_users_id_fk" FOREIGN KEY ("assigned_to") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;