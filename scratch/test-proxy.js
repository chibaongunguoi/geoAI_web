async function testProxy() {
  const q = "những quán cafe đẹp ở Hải Châu";
  const start = Date.now();
  console.log("Fetching /api/poi/semantic-search through Next.js proxy on port 3000...");
  try {
    const r2 = await fetch(`http://localhost:3000/api/poi/semantic-search?q=${encodeURIComponent(q)}&limit=15`);
    console.log("poi status:", r2.status, "Time:", Date.now() - start, "ms");
    const data = await r2.text();
    console.log("Response starts with:", data.substring(0, 100));
  } catch (e) {
    console.error("proxy error:", e);
  }
}
testProxy();
