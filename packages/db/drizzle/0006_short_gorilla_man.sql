CREATE TABLE "guard_duty_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"guard_id" uuid NOT NULL,
	"clock_in_at" timestamp DEFAULT now() NOT NULL,
	"clock_in_lat" double precision,
	"clock_in_lng" double precision,
	"clock_out_at" timestamp,
	"clock_out_lat" double precision,
	"clock_out_lng" double precision,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "guard_duty_sessions" ADD CONSTRAINT "guard_duty_sessions_guard_id_guards_id_fk" FOREIGN KEY ("guard_id") REFERENCES "public"."guards"("id") ON DELETE no action ON UPDATE no action;