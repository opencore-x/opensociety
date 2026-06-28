CREATE TYPE "public"."bhk_type" AS ENUM('STUDIO', '1BHK', '2BHK', '3BHK', '4BHK', '5BHK', 'PENTHOUSE');--> statement-breakpoint
CREATE TYPE "public"."notice_priority" AS ENUM('LOW', 'NORMAL', 'HIGH', 'URGENT');--> statement-breakpoint
CREATE TYPE "public"."pre_approval_type" AS ENUM('ALWAYS', 'SCHEDULED', 'ONE_TIME');--> statement-breakpoint
CREATE TYPE "public"."residency_relation" AS ENUM('OWNER', 'TENANT', 'FAMILY');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('RESIDENT', 'GUARD', 'ADMIN', 'STAFF');--> statement-breakpoint
CREATE TYPE "public"."user_status" AS ENUM('PENDING', 'APPROVED', 'SUSPENDED');--> statement-breakpoint
CREATE TYPE "public"."visitor_status" AS ENUM('PENDING', 'APPROVED', 'DENIED', 'ENTERED', 'EXITED', 'CANCELLED', 'EXPIRED');--> statement-breakpoint
CREATE TYPE "public"."visitor_type" AS ENUM('GUEST', 'DELIVERY', 'SERVICE', 'CAB', 'OTHER');--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"clerk_id" text NOT NULL,
	"email" text,
	"phone" text,
	"name" text NOT NULL,
	"role" "user_role" DEFAULT 'RESIDENT' NOT NULL,
	"status" "user_status" DEFAULT 'PENDING' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_clerk_id_unique" UNIQUE("clerk_id"),
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_phone_unique" UNIQUE("phone")
);
--> statement-breakpoint
CREATE TABLE "society_config" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"address" text NOT NULL,
	"city" text NOT NULL,
	"state" text NOT NULL,
	"pincode" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "apartments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tower" text NOT NULL,
	"apartment_no" text NOT NULL,
	"floor" integer,
	"bhk_type" "bhk_type",
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "apartments_tower_apartment_no_unique" UNIQUE("tower","apartment_no")
);
--> statement-breakpoint
CREATE TABLE "residencies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"apartment_id" uuid NOT NULL,
	"relation" "residency_relation" DEFAULT 'OWNER' NOT NULL,
	"is_primary" boolean DEFAULT false NOT NULL,
	"start_date" timestamp DEFAULT now() NOT NULL,
	"end_date" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "guards" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"name" text NOT NULL,
	"phone" text,
	"employee_code" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "visitor_pre_approvals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"apartment_id" uuid NOT NULL,
	"created_by" uuid NOT NULL,
	"visitor_name" text NOT NULL,
	"visitor_phone" text,
	"approval_type" "pre_approval_type" DEFAULT 'ONE_TIME' NOT NULL,
	"code" text NOT NULL,
	"valid_from" timestamp DEFAULT now() NOT NULL,
	"valid_until" timestamp,
	"max_uses" integer,
	"use_count" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "visitor_pre_approvals_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "visitor_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"apartment_id" uuid NOT NULL,
	"pre_approval_id" uuid,
	"visitor_name" text NOT NULL,
	"visitor_phone" text,
	"type" "visitor_type" DEFAULT 'GUEST' NOT NULL,
	"status" "visitor_status" DEFAULT 'PENDING' NOT NULL,
	"purpose" text,
	"vehicle_number" text,
	"photo_url" text,
	"approved_by" uuid,
	"denied_reason" text,
	"check_in_by" uuid,
	"check_out_by" uuid,
	"check_in_at" timestamp,
	"check_out_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"priority" "notice_priority" DEFAULT 'NORMAL' NOT NULL,
	"published_by" uuid NOT NULL,
	"published_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "residencies" ADD CONSTRAINT "residencies_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "residencies" ADD CONSTRAINT "residencies_apartment_id_apartments_id_fk" FOREIGN KEY ("apartment_id") REFERENCES "public"."apartments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guards" ADD CONSTRAINT "guards_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "visitor_pre_approvals" ADD CONSTRAINT "visitor_pre_approvals_apartment_id_apartments_id_fk" FOREIGN KEY ("apartment_id") REFERENCES "public"."apartments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "visitor_pre_approvals" ADD CONSTRAINT "visitor_pre_approvals_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "visitor_entries" ADD CONSTRAINT "visitor_entries_apartment_id_apartments_id_fk" FOREIGN KEY ("apartment_id") REFERENCES "public"."apartments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "visitor_entries" ADD CONSTRAINT "visitor_entries_pre_approval_id_visitor_pre_approvals_id_fk" FOREIGN KEY ("pre_approval_id") REFERENCES "public"."visitor_pre_approvals"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "visitor_entries" ADD CONSTRAINT "visitor_entries_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "visitor_entries" ADD CONSTRAINT "visitor_entries_check_in_by_guards_id_fk" FOREIGN KEY ("check_in_by") REFERENCES "public"."guards"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "visitor_entries" ADD CONSTRAINT "visitor_entries_check_out_by_guards_id_fk" FOREIGN KEY ("check_out_by") REFERENCES "public"."guards"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notices" ADD CONSTRAINT "notices_published_by_users_id_fk" FOREIGN KEY ("published_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;