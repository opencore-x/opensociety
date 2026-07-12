CREATE TABLE "house_help_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"house_help_id" uuid NOT NULL,
	"apartment_id" uuid,
	"check_in_at" timestamp DEFAULT now() NOT NULL,
	"check_in_by" uuid,
	"check_out_at" timestamp,
	"check_out_by" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "house_help_entries" ADD CONSTRAINT "house_help_entries_house_help_id_house_help_id_fk" FOREIGN KEY ("house_help_id") REFERENCES "public"."house_help"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "house_help_entries" ADD CONSTRAINT "house_help_entries_apartment_id_apartments_id_fk" FOREIGN KEY ("apartment_id") REFERENCES "public"."apartments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "house_help_entries" ADD CONSTRAINT "house_help_entries_check_in_by_users_id_fk" FOREIGN KEY ("check_in_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "house_help_entries" ADD CONSTRAINT "house_help_entries_check_out_by_users_id_fk" FOREIGN KEY ("check_out_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;