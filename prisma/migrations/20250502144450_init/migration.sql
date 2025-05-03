/*
  Warnings:

  - You are about to drop the column `royaltyShare` on the `NFT` table. All the data in the column will be lost.
  - Added the required column `metadataUrl` to the `NFT` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "NFT" DROP COLUMN "royaltyShare",
ADD COLUMN     "metadataUrl" TEXT NOT NULL;
