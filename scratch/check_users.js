const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

const testPasswords = {
  admin: 'Admin123!',
  admin123: 'admin123',
  nemesiscat: 'nemesiscat060',
  manager123: 'manager123',
  user123: 'user123'
};

async function main() {
  try {
    const users = await prisma.user.findMany();
    console.log('Verifying user passwords from DB:');
    for (const u of users) {
      const defaultPassword = testPasswords[u.username];
      if (defaultPassword) {
        const isMatch = await bcrypt.compare(defaultPassword, u.passwordHash);
        console.log(`User: ${u.username} - Password verified? ${isMatch ? 'YES' : 'NO'}`);
      } else {
        console.log(`User: ${u.username} - No default test password configured for verification.`);
      }
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
