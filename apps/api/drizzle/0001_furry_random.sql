ALTER TABLE "children" ALTER COLUMN "parent_phone" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "children" ADD COLUMN "parent_name" text;