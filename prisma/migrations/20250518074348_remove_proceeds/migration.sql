/*
  Warnings:

  - You are about to drop the `Proceeds` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "Proceeds" DROP CONSTRAINT "Proceeds_userId_fkey";

-- DropTable
DROP TABLE "Proceeds";
