const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const bldgCount = await prisma.buildingProperty.count();
  const placeCount = await prisma.place.count();
  const poiCount = await prisma.pOI.count();
  const userCount = await prisma.user.count();
  console.log({ bldgCount, placeCount, poiCount, userCount });
}

main().catch(console.error).finally(() => prisma.$disconnect());
