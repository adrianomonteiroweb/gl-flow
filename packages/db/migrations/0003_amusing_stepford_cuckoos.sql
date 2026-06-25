ALTER TABLE "linharesflow"."clients" ADD COLUMN "founding_date" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "linharesflow"."clients" ADD COLUMN "marital_status" varchar(30);--> statement-breakpoint
ALTER TABLE "linharesflow"."clients" ADD COLUMN "partners" jsonb;