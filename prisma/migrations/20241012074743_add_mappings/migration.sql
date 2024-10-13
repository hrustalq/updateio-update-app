/*
  Warnings:

  - You are about to drop the `AppSettings` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ErrorLog` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `GameInstallation` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `SteamSettings` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `UpdateLog` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "AppSettings";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "ErrorLog";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "GameInstallation";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "SteamSettings";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "UpdateLog";
PRAGMA foreign_keys=on;

-- CreateTable
CREATE TABLE "game_installation" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "externalGameId" TEXT NOT NULL,
    "externalAppId" TEXT NOT NULL,
    "installPath" TEXT NOT NULL,
    "pathAlias" TEXT,
    "lastUpdateDate" DATETIME,
    "autoUpdate" BOOLEAN NOT NULL DEFAULT true
);

-- CreateTable
CREATE TABLE "update_log" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "externalId" TEXT NOT NULL,
    "patchId" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "success" BOOLEAN NOT NULL,
    "message" TEXT NOT NULL,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "error_log" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "gameId" TEXT,
    "errorType" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "stackTrace" TEXT,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "steam_settings" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "username" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "cmdPath" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "app_settings" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "autoUpdateEnabled" BOOLEAN NOT NULL DEFAULT false,
    "updateFrequency" INTEGER NOT NULL DEFAULT 24,
    "notificationsEnabled" BOOLEAN NOT NULL DEFAULT true
);

-- CreateIndex
CREATE UNIQUE INDEX "game_installation_externalGameId_externalAppId_key" ON "game_installation"("externalGameId", "externalAppId");
