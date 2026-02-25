ALTER TABLE "signingKey" RENAME COLUMN "key" TO "encrypted_key";--> statement-breakpoint
ALTER TABLE "signingKey" ADD COLUMN "name" text;