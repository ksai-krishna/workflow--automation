/*
  Warnings:

  - A unique constraint covering the columns `[webhookId]` on the table `Workflow` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "public"."Workflow" ADD COLUMN     "webhookId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Workflow_webhookId_key" ON "public"."Workflow"("webhookId");
