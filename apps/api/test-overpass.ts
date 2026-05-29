import fs from "fs";

async function run() {
  const url = "https://overpass-api.de/api/interpreter";
  const query = `
  [out:json];
  area["name"="Đà Nẵng"]->.searchArea;
  (
    way["natural"="water"](area.searchArea);
  );
  out geom 5;
  `;
  try {
    const res = await fetch(url, { 
      method: "POST", 
      body: query,
      headers: {
        "User-Agent": "geoAI_web/1.0",
        "Accept": "application/json"
      }
    });
    if (!res.ok) {
      console.log(res.status, await res.text());
      return;
    }
    const data = await res.json();
    console.log(`Found ${data.elements?.length} elements`);
    fs.writeFileSync("overpass_test.json", JSON.stringify(data, null, 2));
  } catch (e) {
    console.error(e);
  }
}
run();
