/*
  Warnings:

  - The `status` column on the `Proceeds` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "ProceedsStatus" AS ENUM ('PENDING', 'WITHDRAWN');

-- AlterTable
ALTER TABLE "Proceeds" DROP COLUMN "status",
ADD COLUMN     "status" "ProceedsStatus" NOT NULL DEFAULT 'PENDING';
