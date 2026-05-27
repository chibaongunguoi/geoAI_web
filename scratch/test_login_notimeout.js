async function testLogin(url, payload) {
  console.log(`\n--- Testing POST ${url} ---`);
  console.log(`Payload: ${JSON.stringify(payload)}`);
  try {
    const start = Date.now();
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'content-type': 'application/json'
      },
      body: JSON.stringify(payload)
      // No timeout abort, let it wait
    });
    const elapsed = Date.now() - start;
    console.log(`Response: status=${res.status} in ${elapsed}ms`);
    const body = await res.text();
    console.log('Body:', body.substring(0, 500));
    return { ok: res.ok, status: res.status, elapsed };
  } catch (error) {
    console.error(`Error: ${error.message}`);
    return { ok: false, error: error.message };
  }
}

async function main() {
  console.log('Starting login tests (no timeout)...');
  
  // Direct NestJS
  await testLogin('http://localhost:4000/auth/login', {
    identifier: 'admin123',
    password: 'admin123'
  });
}

main().then(() => {
  console.log('\nDone!');
  process.exit(0);
});
