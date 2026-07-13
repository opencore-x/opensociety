ALTER TABLE "parking_slots" ADD COLUMN "is_visitor" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "parking_slots" ADD COLUMN "occupied_by_entry_id" uuid;--> statement-breakpoint
ALTER TABLE "parking_slots" ADD COLUMN "occupied_at" timestamp;--> statement-breakpoint
ALTER TABLE "parking_slots" ADD CONSTRAINT "parking_slots_occupied_by_entry_id_visitor_entries_id_fk" FOREIGN KEY ("occupied_by_entry_id") REFERENCES "public"."visitor_entries"("id") ON DELETE no action ON UPDATE no action;