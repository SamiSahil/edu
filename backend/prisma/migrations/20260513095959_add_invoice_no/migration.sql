/*
  Warnings:

  - A unique constraint covering the columns `[schoolId,invoiceNoLower]` on the table `Invoice` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Invoice" ADD COLUMN     "invoiceNo" TEXT,
ADD COLUMN     "invoiceNoLower" TEXT;

-- CreateIndex
CREATE INDEX "Invoice_schoolId_invoiceNoLower_idx" ON "Invoice"("schoolId", "invoiceNoLower");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_schoolId_invoiceNoLower_key" ON "Invoice"("schoolId", "invoiceNoLower");
