/*
  Warnings:

  - A unique constraint covering the columns `[formId]` on the table `Workflow` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "public"."Workflow" ADD COLUMN     "formId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Workflow_formId_key" ON "public"."Workflow"("formId");
