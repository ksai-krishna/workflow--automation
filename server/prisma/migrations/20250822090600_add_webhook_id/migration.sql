/*
  Warnings:

  - You are about to drop the column `webhookId` on the `Workflow` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "public"."Workflow_webhookId_key";

-- AlterTable
ALTER TABLE "public"."Workflow" DROP COLUMN "webhookId";
