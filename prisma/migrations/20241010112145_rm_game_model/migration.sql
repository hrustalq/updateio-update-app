/*
  Warnings:

  - You are about to drop the `Game` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `patchId` to the `UpdateLog` table without a default value. This is not possible if the table is not empty.

*/
-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "Game";
PRAGMA foreign_keys=on;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_UpdateLog" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "patchId" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "success" BOOLEAN NOT NULL,
    "message" TEXT NOT NULL,
    "timestamp" DATETIME NOT NULL
);
INSERT INTO "new_UpdateLog" ("gameId", "id", "message", "success", "timestamp") SELECT "gameId", "id", "message", "success", "timestamp" FROM "UpdateLog";
DROP TABLE "UpdateLog";
ALTER TABLE "new_UpdateLog" RENAME TO "UpdateLog";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
