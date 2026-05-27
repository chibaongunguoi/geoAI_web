async function testPoiSearch() {
  console.log('Testing /api/poi/search proxy...');
  try {
    const res = await fetch('http://localhost:3000/api/poi/search?limit=120&south=16.035&west=108.188&north=16.103&east=108.249');
    console.log(`Status: ${res.status}`);
    const body = await res.text();
    console.log(`Body starts with: ${body.substring(0, 200)}`);
  } catch (error) {
    console.error(error);
  }
}
testPoiSearch();
