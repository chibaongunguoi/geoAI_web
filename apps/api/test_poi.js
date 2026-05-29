const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const count = await prisma.place.count({
    where: {
      district: 'Hải Châu'
    }
  });
  
  const sample = await prisma.place.findFirst({
    where: { district: 'Hải Châu' },
    select: { name: true, category: true, subcategories: true }
  });
  
  console.log(`POIs in Hải Châu: ${count}`);
  console.log(`Sample POI:`, sample);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
