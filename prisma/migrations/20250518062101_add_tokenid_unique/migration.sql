/*
  Warnings:

  - A unique constraint covering the columns `[tokenId]` on the table `NFT` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "NFT_tokenId_key" ON "NFT"("tokenId");
