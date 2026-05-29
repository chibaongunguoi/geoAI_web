const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const tables = await prisma.$queryRaw`SELECT tablename FROM pg_tables WHERE schemaname='public'`;
  console.log('Tables:', tables);
  
  if (tables.some(t => t.tablename === 'BuildingProperty')) {
    const count = await prisma.$queryRaw`SELECT count(*) FROM "BuildingProperty"`;
    console.log('BuildingProperty count:', count);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
