const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const building = await prisma.buildingProperty.findFirst({
    where: {
      district: 'Hòa Vang',
      ward: 'Hòa Phước'
    }
  });
  
  console.log(JSON.stringify(building, null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
