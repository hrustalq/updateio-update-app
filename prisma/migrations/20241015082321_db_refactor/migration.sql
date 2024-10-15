/*
  Warnings:

  - You are about to drop the `app` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `games` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the column `externalId` on the `update_log` table. All the data in the column will be lost.
  - You are about to drop the column `gameId` on the `update_log` table. All the data in the column will be lost.
  - You are about to drop the column `patchId` on the `update_log` table. All the data in the column will be lost.
  - You are about to drop the column `success` on the `update_log` table. All the data in the column will be lost.
  - Added the required column `userId` to the `app_settings` table without a default value. This is not possible if the table is not empty.
  - Added the required column `fallbackUpdateCommand` to the `game_installation` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updateCommand` to the `game_installation` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updateRequestId` to the `update_log` table without a default value. This is not possible if the table is not empty.

*/
-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "app";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "games";
PRAGMA foreign_keys=on;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_app_settings" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "autoUpdateEnabled" BOOLEAN NOT NULL DEFAULT false,
    "updateFrequency" INTEGER NOT NULL DEFAULT 24,
    "notificationsEnabled" BOOLEAN NOT NULL DEFAULT true,
    "userId" TEXT NOT NULL
);
INSERT INTO "new_app_settings" ("autoUpdateEnabled", "id", "notificationsEnabled", "updateFrequency") SELECT "autoUpdateEnabled", "id", "notificationsEnabled", "updateFrequency" FROM "app_settings";
DROP TABLE "app_settings";
ALTER TABLE "new_app_settings" RENAME TO "app_settings";
CREATE UNIQUE INDEX "app_settings_userId_key" ON "app_settings"("userId");
CREATE TABLE "new_game_installation" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "externalGameId" TEXT NOT NULL,
    "externalAppId" TEXT NOT NULL,
    "installPath" TEXT NOT NULL,
    "pathAlias" TEXT,
    "lastUpdateDate" DATETIME,
    "updateCommand" TEXT NOT NULL,
    "fallbackUpdateCommand" TEXT NOT NULL,
    "autoUpdate" BOOLEAN NOT NULL DEFAULT true
);
INSERT INTO "new_game_installation" ("autoUpdate", "externalAppId", "externalGameId", "id", "installPath", "lastUpdateDate", "pathAlias") SELECT "autoUpdate", "externalAppId", "externalGameId", "id", "installPath", "lastUpdateDate", "pathAlias" FROM "game_installation";
DROP TABLE "game_installation";
ALTER TABLE "new_game_installation" RENAME TO "game_installation";
CREATE UNIQUE INDEX "game_installation_externalGameId_externalAppId_key" ON "game_installation"("externalGameId", "externalAppId");
CREATE TABLE "new_update_log" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "updateRequestId" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "update_log_updateRequestId_fkey" FOREIGN KEY ("updateRequestId") REFERENCES "update_requests" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_update_log" ("id", "message", "timestamp") SELECT "id", "message", "timestamp" FROM "update_log";
DROP TABLE "update_log";
ALTER TABLE "new_update_log" RENAME TO "update_log";
CREATE TABLE "new_update_requests" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "gameId" TEXT NOT NULL,
    "appId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_update_requests" ("appId", "createdAt", "gameId", "id", "status", "updatedAt", "userId") SELECT "appId", "createdAt", "gameId", "id", "status", "updatedAt", "userId" FROM "update_requests";
DROP TABLE "update_requests";
ALTER TABLE "new_update_requests" RENAME TO "update_requests";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
