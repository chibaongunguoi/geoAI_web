const bcrypt = require('bcryptjs');

async function main() {
  const rounds = 12;
  console.log(`Testing bcrypt hash with ${rounds} rounds...`);
  const start = Date.now();
  const hash = await bcrypt.hash('admin123', rounds);
  const hashTime = Date.now() - start;
  console.log(`Hash completed in ${hashTime}ms`);
  
  const start2 = Date.now();
  const valid = await bcrypt.compare('admin123', hash);
  const compareTime = Date.now() - start2;
  console.log(`Compare completed in ${compareTime}ms, result: ${valid}`);
}

main().catch(console.error);
