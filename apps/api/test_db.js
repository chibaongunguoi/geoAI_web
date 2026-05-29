const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const properties = await prisma.buildingProperty.findMany({
    select: { district: true, ward: true },
    distinct: ['district', 'ward'],
    take: 10
  });
  console.log(JSON.stringify(properties, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
