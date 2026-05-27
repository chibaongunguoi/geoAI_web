async function testLogin(url, payload) {
  console.log(`\n--- Testing POST ${url} ---`);
  console.log(`Payload: ${JSON.stringify(payload)}`);
  try {
    const start = Date.now();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      console.log(`  ... ${Date.now() - start}ms elapsed, aborting`);
      controller.abort();
    }, 30000); // 30s timeout
    
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'content-type': 'application/json'
      },
      body: JSON.stringify(payload),
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    const elapsed = Date.now() - start;
    console.log(`Response: status=${res.status} in ${elapsed}ms`);
    const body = await res.text();
    console.log('Body:', body.substring(0, 500));
    return { ok: res.ok, status: res.status, elapsed };
  } catch (error) {
    if (error.name === 'AbortError') {
      console.error(`TIMEOUT: Request was aborted after 30s`);
    } else {
      console.error(`Error: ${error.message}`);
    }
    return { ok: false, error: error.message };
  }
}

async function main() {
  console.log('=== Login Test (30s timeout) ===');
  console.log('Testing GET /auth/me first...');
  try {
    const res = await fetch('http://localhost:4000/auth/me');
    console.log(`GET /auth/me: ${res.status}`);
  } catch (e) {
    console.log(`GET /auth/me error: ${e.message}`);
  }
  
  console.log('\nNow testing POST /auth/login...');
  await testLogin('http://localhost:4000/auth/login', {
    identifier: 'admin123',
    password: 'admin123'
  });
  
  console.log('\nNow testing POST /api/auth/login via Next.js proxy...');
  await testLogin('http://localhost:3000/api/auth/login', {
    identifier: 'admin123',
    password: 'admin123'
  });
}

main().then(() => {
  console.log('\nAll tests done!');
  process.exit(0);
}).catch(err => {
  console.error(err);
  process.exit(1);
});
