import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

async function main() {
  // Buat user dummy
  const user = await prisma.user.upsert({
    where: { walletAddress: "0xB4929f44915148b91908C789651f3E4Ff9c002F9" },
    update: {},
    create: {
      walletAddress: "0xB4929f44915148b91908C789651f3E4Ff9c002F9",
      role: "USER",
      email: "dummyuser@example.com",
      password: "securepassword123",
    },
  })

  console.log("✅ Dummy user created:", user)

  // Buat NFT dummy
  await prisma.nFT.create({
    data: {
      tokenId: BigInt(0),
      contractAddress: "0x42f2C68D78688B5d790fC0aa8aAa1d6a3EA00A14",
      ownerId: user.id,
      isListed: false,
      royaltyShare: 10.0,
    },
  })

  console.log("✅ Dummy NFT created!")
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
