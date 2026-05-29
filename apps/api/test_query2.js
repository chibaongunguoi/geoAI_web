const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const count = await prisma.buildingProperty.count();
  console.log(`Total buildings: ${count}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
