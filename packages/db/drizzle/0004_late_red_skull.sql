CREATE TABLE "house_help_assignments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"house_help_id" uuid NOT NULL,
	"apartment_id" uuid NOT NULL,
	"assigned_by" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "house_help_assignments_help_apartment_unq" UNIQUE("house_help_id","apartment_id")
);
--> statement-breakpoint
ALTER TABLE "house_help_assignments" ADD CONSTRAINT "house_help_assignments_house_help_id_house_help_id_fk" FOREIGN KEY ("house_help_id") REFERENCES "public"."house_help"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "house_help_assignments" ADD CONSTRAINT "house_help_assignments_apartment_id_apartments_id_fk" FOREIGN KEY ("apartment_id") REFERENCES "public"."apartments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "house_help_assignments" ADD CONSTRAINT "house_help_assignments_assigned_by_users_id_fk" FOREIGN KEY ("assigned_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;