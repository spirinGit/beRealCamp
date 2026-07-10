CREATE TABLE "child_attendance" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"camp_id" uuid NOT NULL,
	"child_id" uuid NOT NULL,
	"day" date NOT NULL,
	"is_present" boolean NOT NULL,
	"marked_by_user_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"note" text,
	CONSTRAINT "child_attendance_child_day_unique" UNIQUE("child_id","day")
);
--> statement-breakpoint
ALTER TABLE "child_attendance" ADD CONSTRAINT "child_attendance_camp_id_camps_id_fk" FOREIGN KEY ("camp_id") REFERENCES "public"."camps"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "child_attendance" ADD CONSTRAINT "child_attendance_child_id_children_id_fk" FOREIGN KEY ("child_id") REFERENCES "public"."children"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "child_attendance" ADD CONSTRAINT "child_attendance_marked_by_user_id_users_id_fk" FOREIGN KEY ("marked_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;