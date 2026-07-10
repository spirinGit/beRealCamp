CREATE TABLE "event_squads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid NOT NULL,
	"squad_id" uuid NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"resolved_by_user_id" uuid,
	"resolved_at" timestamp,
	"resolution_source" text,
	"transaction_applied_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "event_squad_unique" UNIQUE("event_id","squad_id")
);
--> statement-breakpoint
CREATE TABLE "events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"camp_id" uuid NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"code" text NOT NULL,
	"reward_points" integer NOT NULL,
	"penalty_points" integer NOT NULL,
	"ends_at" timestamp NOT NULL,
	"created_by_user_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "event_squads" ADD CONSTRAINT "event_squads_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_squads" ADD CONSTRAINT "event_squads_squad_id_squads_id_fk" FOREIGN KEY ("squad_id") REFERENCES "public"."squads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_squads" ADD CONSTRAINT "event_squads_resolved_by_user_id_users_id_fk" FOREIGN KEY ("resolved_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_camp_id_camps_id_fk" FOREIGN KEY ("camp_id") REFERENCES "public"."camps"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;