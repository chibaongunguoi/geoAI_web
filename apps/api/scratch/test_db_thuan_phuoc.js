const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const props = await prisma.buildingProperty.findMany({
    where: {
      district: 'Hải Châu',
      ward: 'Thuận Phước',
      propertyType: 'cafe'
    }
  });
  console.log("PROPS Thuận Phước Cafe:", props.length);
  if (props.length > 0) {
    console.log(props[0]);
  }
}
main().finally(() => prisma.$disconnect());
