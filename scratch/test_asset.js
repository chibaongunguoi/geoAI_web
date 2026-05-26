async function test() {
  const loginRes = await fetch("http://localhost:3000/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ identifier: "admin123", password: "admin123" })
  });
  
  if (!loginRes.ok) return console.error("Login failed:", await loginRes.text());
  const setCookie = loginRes.headers.get('set-cookie');

  const unique = `TEST-${Date.now()}`;
  const createRes = await fetch("http://localhost:3000/api/properties", {
    method: "POST",
    headers: { 
      "Content-Type": "application/json",
      "Cookie": setCookie
    },
    body: JSON.stringify({
      code: unique,
      name: "Test Name",
      propertyType: "cafe",
      centroidLat: 16.0,
      centroidLng: 108.0
    })
  });
  
  const created = await createRes.json();
  console.log("Created:", created);

  console.log("Measuring list API performance...");
  const start = Date.now();
  const getRes = await fetch(`http://localhost:4000/properties?query=&status=ACTIVE&propertyType=cafe&district=H%E1%BA%A3i+Ch%C3%A2u&ward=Thu%E1%BA%ADn+Ph%C6%B0%E1%BB%9Bc&sort=updatedAt`, {
    headers: { "Cookie": setCookie }
  });
  const end = Date.now();
  
  const result = await getRes.json();
  console.log("Get status:", getRes.status, "Time:", end - start, "ms", "Items:", result.items?.length);
}

test();
