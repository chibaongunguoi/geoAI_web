const path = require('path');

// Simulate what BetterSqliteService does
const envUrl = process.env.DATABASE_URL || 'file:../../../geoai_data/geoai.db';
console.log('DATABASE_URL:', envUrl);

const fileMatch = envUrl.match(/^file:(.+)$/);
if (fileMatch) {
  const filePath = fileMatch[1];
  console.log('Parsed filePath:', filePath);
  
  if (filePath.startsWith('/') || /^[a-zA-Z]:/.test(filePath)) {
    console.log('Absolute path - using as-is:', filePath);
  } else {
    // BetterSqliteService resolves relative to prisma/ directory
    const resolvedFromPrisma = path.resolve(process.cwd(), 'prisma', filePath);
    console.log('Resolved from cwd+prisma:', resolvedFromPrisma);
    
    // Also where Prisma ORM resolves it from
    const resolvedFromProjectRoot = path.resolve(process.cwd(), 'apps', 'api', 'prisma', filePath);
    console.log('Resolved from project root+apps/api/prisma:', resolvedFromProjectRoot);
  }
}
