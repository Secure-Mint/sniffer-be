-- AlterTable
ALTER TABLE "token" ADD COLUMN     "info" JSONB NOT NULL DEFAULT '{}',
ALTER COLUMN "metadata" SET DEFAULT '{}';
