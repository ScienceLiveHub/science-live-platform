-- Rename the old column to a temporary name
ALTER TABLE "notification" RENAME COLUMN "is_dismissed" TO "is_dismissed_old";

-- CreateEnum
CREATE TYPE "NotificationStatus" AS ENUM ('unread', 'read', 'dismissed', 'persistent');

-- Add the new status column with default
ALTER TABLE "notification" ADD COLUMN "status" "NotificationStatus" DEFAULT 'unread';

-- Add group column
ALTER TABLE "notification" ADD COLUMN "group" text;

-- Update existing data: false -> 'unread', true -> 'dismissed'
UPDATE "notification" SET "status" = 'unread' WHERE "is_dismissed_old" = false;
UPDATE "notification" SET "status" = 'dismissed' WHERE "is_dismissed_old" = true;

-- Drop the old column
ALTER TABLE "notification" DROP COLUMN "is_dismissed_old";
