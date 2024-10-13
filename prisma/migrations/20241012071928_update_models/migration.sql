/*
  Warnings:

  - You are about to drop the `User` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `externalId` to the `UpdateLog` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "User_email_key";

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "User";
PRAGMA foreign_keys=on;

-- CreateTable
CREATE TABLE "GameInstallation" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "externalGameId" TEXT NOT NULL,
    "externalAppId" TEXT NOT NULL,
    "installPath" TEXT NOT NULL,
    "pathAlias" TEXT,
    "lastUpdateDate" DATETIME,
    "autoUpdate" BOOLEAN NOT NULL DEFAULT true
);

-- CreateTable
CREATE TABLE "ErrorLog" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "gameId" TEXT,
    "errorType" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "stackTrace" TEXT,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "AppSettings" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "autoUpdateEnabled" BOOLEAN NOT NULL DEFAULT false,
    "updateFrequency" INTEGER NOT NULL DEFAULT 24,
    "notificationsEnabled" BOOLEAN NOT NULL DEFAULT true
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_UpdateLog" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "externalId" TEXT NOT NULL,
    "patchId" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "success" BOOLEAN NOT NULL,
    "message" TEXT NOT NULL,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_UpdateLog" ("gameId", "id", "message", "patchId", "success", "timestamp") SELECT "gameId", "id", "message", "patchId", "success", "timestamp" FROM "UpdateLog";
DROP TABLE "UpdateLog";
ALTER TABLE "new_UpdateLog" RENAME TO "UpdateLog";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "GameInstallation_externalGameId_externalAppId_key" ON "GameInstallation"("externalGameId", "externalAppId");
