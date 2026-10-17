/*
  Warnings:

  - Made the column `userId` on table `Category` required. This step will fail if there are existing NULL values in that column.
  - Made the column `userId` on table `Expense` required. This step will fail if there are existing NULL values in that column.
  - Made the column `userId` on table `Income` required. This step will fail if there are existing NULL values in that column.
  - Made the column `userId` on table `SavingsEntry` required. This step will fail if there are existing NULL values in that column.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Category" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "percentage" REAL NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'EXPENSE',
    "color" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" INTEGER NOT NULL,
    CONSTRAINT "Category_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Category" ("color", "createdAt", "id", "kind", "name", "percentage", "userId") SELECT "color", "createdAt", "id", "kind", "name", "percentage", "userId" FROM "Category";
DROP TABLE "Category";
ALTER TABLE "new_Category" RENAME TO "Category";
CREATE INDEX "Category_userId_idx" ON "Category"("userId");
CREATE UNIQUE INDEX "Category_userId_name_key" ON "Category"("userId", "name");
CREATE TABLE "new_Expense" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "amountCents" INTEGER NOT NULL,
    "date" DATETIME NOT NULL,
    "note" TEXT,
    "categoryId" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" INTEGER NOT NULL,
    CONSTRAINT "Expense_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Expense_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Expense" ("amountCents", "categoryId", "createdAt", "date", "id", "note", "userId") SELECT "amountCents", "categoryId", "createdAt", "date", "id", "note", "userId" FROM "Expense";
DROP TABLE "Expense";
ALTER TABLE "new_Expense" RENAME TO "Expense";
CREATE INDEX "Expense_date_idx" ON "Expense"("date");
CREATE INDEX "Expense_categoryId_idx" ON "Expense"("categoryId");
CREATE INDEX "Expense_userId_idx" ON "Expense"("userId");
CREATE TABLE "new_Income" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "amountCents" INTEGER NOT NULL,
    "source" TEXT,
    "date" DATETIME NOT NULL,
    "note" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" INTEGER NOT NULL,
    CONSTRAINT "Income_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Income" ("amountCents", "createdAt", "date", "id", "note", "source", "userId") SELECT "amountCents", "createdAt", "date", "id", "note", "source", "userId" FROM "Income";
DROP TABLE "Income";
ALTER TABLE "new_Income" RENAME TO "Income";
CREATE INDEX "Income_date_idx" ON "Income"("date");
CREATE INDEX "Income_userId_idx" ON "Income"("userId");
CREATE TABLE "new_SavingsEntry" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "amountCents" INTEGER NOT NULL,
    "direction" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "note" TEXT,
    "categoryId" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" INTEGER NOT NULL,
    CONSTRAINT "SavingsEntry_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "SavingsEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_SavingsEntry" ("amountCents", "categoryId", "createdAt", "date", "direction", "id", "note", "userId") SELECT "amountCents", "categoryId", "createdAt", "date", "direction", "id", "note", "userId" FROM "SavingsEntry";
DROP TABLE "SavingsEntry";
ALTER TABLE "new_SavingsEntry" RENAME TO "SavingsEntry";
CREATE INDEX "SavingsEntry_date_idx" ON "SavingsEntry"("date");
CREATE INDEX "SavingsEntry_categoryId_idx" ON "SavingsEntry"("categoryId");
CREATE INDEX "SavingsEntry_userId_idx" ON "SavingsEntry"("userId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
