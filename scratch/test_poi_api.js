const http = require('http');

async function testApi() {
  console.log('Logging in...');
  
  const loginRes = await fetch('http://localhost:4000/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin', password: 'password123' })
  });
  
  if (!loginRes.ok) {
    console.error('Login failed', loginRes.status, await loginRes.text());
    return;
  }
  
  const cookies = loginRes.headers.get('set-cookie');
  console.log('Got cookie:', cookies ? 'yes' : 'no');
  
  const token = await loginRes.json();
  const authHeader = `Bearer ${token.access_token}`;

  console.log('Fetching /poi/search...');
  // Bounding box for Da Nang
  const params = new URLSearchParams({
    limit: "120",
    south: "16.035",
    west: "108.188",
    north: "16.103",
    east: "108.249"
  });
  
  const res = await fetch(`http://localhost:4000/poi/search?${params}`, {
    headers: {
      'Authorization': authHeader
    }
  });
  
  console.log('POI status:', res.status);
  const data = await res.json();
  console.log('POI count:', data.items ? data.items.length : 0);
  
  if (data.items && data.items.length > 0) {
    console.log('First 3 items:', data.items.slice(0, 3).map(i => `${i.id} - ${i.name} - type: ${i.propertyType} - lat/lng: ${i.latitude},${i.longitude}`));
  }
}

testApi().catch(console.error);
