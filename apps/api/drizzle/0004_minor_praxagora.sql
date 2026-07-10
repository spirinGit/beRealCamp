ALTER TABLE "camps" ADD COLUMN "public_access_code" text;--> statement-breakpoint
ALTER TABLE "camps" ADD CONSTRAINT "camp_public_access_code_unique" UNIQUE("public_access_code");