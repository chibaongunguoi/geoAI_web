async function test() {
  const q = "những quán cafe đẹp ở Hải Châu";
  const start = Date.now();
  
  console.log("Fetching /properties...");
  try {
    const r1 = await fetch(`http://localhost:4000/properties?query=${encodeURIComponent(q)}`);
    console.log("properties status:", r1.status, "Time:", Date.now() - start, "ms");
  } catch (e) {
    console.error("properties error:", e);
  }

  const start2 = Date.now();
  console.log("Fetching /poi/semantic-search...");
  try {
    const r2 = await fetch(`http://localhost:4000/poi/semantic-search?q=${encodeURIComponent(q)}&limit=15`);
    console.log("poi status:", r2.status, "Time:", Date.now() - start2, "ms");
    const data = await r2.json();
    console.log("POI Results:", data?.items?.length);
  } catch (e) {
    console.error("poi error:", e);
  }
}
test();
