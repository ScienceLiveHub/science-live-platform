ALTER TABLE "apikey" DROP CONSTRAINT "apikey_user_id_user_id_fk";
--> statement-breakpoint
ALTER TABLE "apikey" ALTER COLUMN "rate_limit_enabled" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "apikey" ALTER COLUMN "request_count" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "apikey" ADD COLUMN "config_id" text DEFAULT 'default' NOT NULL;--> statement-breakpoint
ALTER TABLE "apikey" ADD COLUMN "reference_id" text;--> statement-breakpoint

-- Migrate user_id to reference_id
UPDATE "apikey" SET "reference_id" = "user_id" WHERE "reference_id" IS NULL;
ALTER TABLE "apikey" ALTER COLUMN "reference_id" SET NOT NULL;
CREATE INDEX idx_apikey_reference_id ON apikey(reference_id);
CREATE INDEX idx_apikey_config_id ON apikey(config_id);

ALTER TABLE "apikey" DROP COLUMN "user_id";
