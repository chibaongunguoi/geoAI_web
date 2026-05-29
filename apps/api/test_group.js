const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const result = await prisma.buildingProperty.findMany({
    select: { district: true, ward: true },
    distinct: ['district', 'ward'],
    take: 5
  });
  
  console.log("Here are some wards that already have data:");
  for (const row of result) {
    if (row.district && row.ward) {
      console.log(`- Quận ${row.district}, Phường ${row.ward}`);
    }
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
