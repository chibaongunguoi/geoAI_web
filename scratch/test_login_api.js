async function testLogin(url, label) {
  console.log(`\n--- Testing ${label} (${url}) ---`);
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        identifier: 'admin123',
        password: 'admin123'
      })
    });
    console.log('Status:', res.status);
    console.log('Headers:', [...res.headers.entries()]);
    const bodyText = await res.text();
    console.log('Body:', bodyText.substring(0, 500));
  } catch (error) {
    console.error('Fetch error:', error.message);
  }
}

async function main() {
  await testLogin('http://localhost:4000/auth/login', 'NestJS API (Direct)');
  await testLogin('http://localhost:3000/api/auth/login', 'Next.js Proxy (Web)');
}

main();
