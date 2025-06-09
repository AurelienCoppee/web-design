/*
  Warnings:

  - A unique constraint covering the columns `[userId,eventId]` on the table `UserEventInterest` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "UserEventInterest_userId_eventDate_key";

-- DropIndex
DROP INDEX "UserEventInterest_userId_idx";

-- DropIndex
DROP INDEX "UserEventInterest_eventId_idx";

-- CreateIndex
CREATE UNIQUE INDEX "UserEventInterest_userId_eventId_key" ON "UserEventInterest"("userId", "eventId");
