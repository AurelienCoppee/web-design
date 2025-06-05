/*
  Warnings:

  - You are about to drop the column `creatorId` on the `organizations` table. All the data in the column will be lost.

*/
-- CreateTable
CREATE TABLE "UserEventInterest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "eventDate" DATETIME NOT NULL,
    CONSTRAINT "UserEventInterest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "UserEventInterest_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_organizations" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_organizations" ("createdAt", "id", "name", "updatedAt") SELECT "createdAt", "id", "name", "updatedAt" FROM "organizations";
DROP TABLE "organizations";
ALTER TABLE "new_organizations" RENAME TO "organizations";
CREATE UNIQUE INDEX "organizations_name_key" ON "organizations"("name");
CREATE TABLE "new_users" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT,
    "email" TEXT,
    "email_verified" DATETIME,
    "hashedPassword" TEXT,
    "twoFactorSecret" TEXT,
    "twoFactorEnabled" BOOLEAN DEFAULT false,
    "image" TEXT,
    "role" TEXT NOT NULL DEFAULT 'USER'
);
INSERT INTO "new_users" ("email", "email_verified", "hashedPassword", "id", "image", "name", "role", "twoFactorEnabled", "twoFactorSecret") SELECT "email", "email_verified", "hashedPassword", "id", "image", "name", "role", "twoFactorEnabled", "twoFactorSecret" FROM "users";
DROP TABLE "users";
ALTER TABLE "new_users" RENAME TO "users";
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "UserEventInterest_eventId_idx" ON "UserEventInterest"("eventId");

-- CreateIndex
CREATE INDEX "UserEventInterest_userId_idx" ON "UserEventInterest"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "UserEventInterest_userId_eventDate_key" ON "UserEventInterest"("userId", "eventDate");
