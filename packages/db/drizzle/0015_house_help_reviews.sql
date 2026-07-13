CREATE TABLE "house_help_reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"house_help_id" uuid NOT NULL,
	"reviewer_id" uuid NOT NULL,
	"rating" integer NOT NULL,
	"comment" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "house_help_reviews_help_reviewer_unq" UNIQUE("house_help_id","reviewer_id")
);
--> statement-breakpoint
ALTER TABLE "house_help_reviews" ADD CONSTRAINT "house_help_reviews_house_help_id_house_help_id_fk" FOREIGN KEY ("house_help_id") REFERENCES "public"."house_help"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "house_help_reviews" ADD CONSTRAINT "house_help_reviews_reviewer_id_users_id_fk" FOREIGN KEY ("reviewer_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;