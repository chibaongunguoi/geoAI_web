const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Testing prisma.session.create...');
  try {
    const start = Date.now();
    
    // Find an existing user first
    const user = await prisma.user.findFirst();
    if (!user) {
      console.log('No user found to create session for!');
      return;
    }
    
    console.log(`Found user: ${user.username}, inserting session...`);
    const session = await prisma.session.create({
      data: {
        userId: user.id,
        refreshToken: 'test-refresh-token-' + Date.now(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
      }
    });
    console.log(`Session created in ${Date.now() - start}ms! ID: ${session.id}`);
    
    // Clean up
    await prisma.session.delete({
      where: { id: session.id }
    });
    console.log('Deleted temp session.');
  } catch (error) {
    console.error('Error during write:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
