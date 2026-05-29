const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.$queryRawUnsafe('SELECT COUNT(*) as count FROM "RiskZone"')
  .then(console.log)
  .catch(console.error)
  .finally(() => prisma.$disconnect());
