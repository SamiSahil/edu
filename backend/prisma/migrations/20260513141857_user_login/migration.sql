/*
  Warnings:

  - A unique constraint covering the columns `[userId]` on the table `Staff` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Staff" ADD COLUMN     "userId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Staff_userId_key" ON "Staff"("userId");

-- CreateIndex
CREATE INDEX "Staff_schoolId_userId_idx" ON "Staff"("schoolId", "userId");

-- AddForeignKey
ALTER TABLE "Staff" ADD CONSTRAINT "Staff_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
