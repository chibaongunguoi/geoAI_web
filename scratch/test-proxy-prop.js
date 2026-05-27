async function testProxy() {
  const q = "những quán cafe đẹp ở Hải Châu";
  const start = Date.now();
  console.log("Fetching /api/properties through Next.js proxy on port 3000...");
  try {
    const r1 = await fetch(`http://localhost:3000/api/properties?query=${encodeURIComponent(q)}`);
    console.log("prop status:", r1.status, "Time:", Date.now() - start, "ms");
    const data = await r1.text();
    console.log("Response starts with:", data.substring(0, 100));
  } catch (e) {
    console.error("proxy error:", e);
  }
}
testProxy();
