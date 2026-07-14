ALTER TABLE "visitor_entries" ADD COLUMN "client_id" uuid;--> statement-breakpoint
CREATE UNIQUE INDEX "visitor_entries_client_id_idx" ON "visitor_entries" USING btree ("client_id");