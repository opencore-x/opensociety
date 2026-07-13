CREATE INDEX "residencies_user_id_idx" ON "residencies" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "residencies_apartment_id_idx" ON "residencies" USING btree ("apartment_id");--> statement-breakpoint
CREATE INDEX "visitor_entries_status_idx" ON "visitor_entries" USING btree ("status");--> statement-breakpoint
CREATE INDEX "visitor_entries_apartment_id_idx" ON "visitor_entries" USING btree ("apartment_id");--> statement-breakpoint
CREATE INDEX "visitor_entries_created_at_idx" ON "visitor_entries" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "maintenance_tickets_status_idx" ON "maintenance_tickets" USING btree ("status");--> statement-breakpoint
CREATE INDEX "maintenance_tickets_apartment_id_idx" ON "maintenance_tickets" USING btree ("apartment_id");--> statement-breakpoint
CREATE INDEX "maintenance_tickets_category_idx" ON "maintenance_tickets" USING btree ("category");--> statement-breakpoint
CREATE INDEX "house_help_entries_house_help_id_idx" ON "house_help_entries" USING btree ("house_help_id");--> statement-breakpoint
CREATE INDEX "parking_slots_apartment_id_idx" ON "parking_slots" USING btree ("apartment_id");--> statement-breakpoint
CREATE INDEX "parking_slots_is_visitor_idx" ON "parking_slots" USING btree ("is_visitor");--> statement-breakpoint
CREATE INDEX "bill_line_items_bill_id_idx" ON "bill_line_items" USING btree ("bill_id");--> statement-breakpoint
CREATE INDEX "maintenance_bills_apartment_id_idx" ON "maintenance_bills" USING btree ("apartment_id");--> statement-breakpoint
CREATE INDEX "maintenance_bills_period_month_idx" ON "maintenance_bills" USING btree ("period_month");--> statement-breakpoint
CREATE INDEX "payments_bill_id_idx" ON "payments" USING btree ("bill_id");--> statement-breakpoint
CREATE INDEX "payments_apartment_id_idx" ON "payments" USING btree ("apartment_id");