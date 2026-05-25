const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const props = await prisma.buildingProperty.findMany({
    where: {
      district: 'Hải Châu',
      ward: 'Thuận Phước'
    },
    take: 5
  });
  console.log("PROPS Thuận Phước:", props.map(p => ({
    id: p.id,
    name: p.name,
    propertyType: p.propertyType,
    status: p.status,
    source: p.source
  })));
  
  const allDistricts = await prisma.buildingProperty.groupBy({
    by: ['district', 'ward', 'propertyType', 'status'],
    _count: true
  });
  console.log("ALL:", allDistricts);
}
main().finally(() => prisma.$disconnect());
