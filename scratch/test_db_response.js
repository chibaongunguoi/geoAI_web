async function testLogin(url, payload) {
  console.log(`\nTesting login to ${url} with ${payload.identifier}...`);
  try {
    const start = Date.now();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout
    
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'content-type': 'application/json'
      },
      body: JSON.stringify(payload),
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    console.log(`Login response: status=${res.status} in ${Date.now() - start}ms`);
    const body = await res.text();
    console.log('Body:', body.substring(0, 1000));
  } catch (error) {
    console.error(`Login error for ${url}:`, error.message);
  }
}

async function main() {
  await testLogin('http://localhost:4000/auth/login', {
    identifier: 'admin123',
    password: 'admin123'
  });
  await testLogin('http://localhost:3000/api/auth/login', {
    identifier: 'admin123',
    password: 'admin123'
  });
}

main();
