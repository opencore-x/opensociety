CREATE TABLE "guard_devices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"guard_id" uuid NOT NULL,
	"device_id" text NOT NULL,
	"model" text,
	"bound_at" timestamp DEFAULT now() NOT NULL,
	"last_active_at" timestamp DEFAULT now() NOT NULL,
	"revoked_at" timestamp,
	CONSTRAINT "guard_devices_guard_device_unq" UNIQUE("guard_id","device_id")
);
--> statement-breakpoint
ALTER TABLE "guard_devices" ADD CONSTRAINT "guard_devices_guard_id_guards_id_fk" FOREIGN KEY ("guard_id") REFERENCES "public"."guards"("id") ON DELETE no action ON UPDATE no action;