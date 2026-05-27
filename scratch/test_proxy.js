const http = require('http');

async function checkFrontendProxy() {
  console.log('Checking if Next.js frontend proxy is up...');
  try {
    const res = await fetch('http://localhost:3000/api/poi/search?limit=120&south=16.035&west=108.188&north=16.103&east=108.249');
    console.log('Frontend proxy status:', res.status);
    const body = await res.text();
    console.log('Frontend proxy response snippet:', body.substring(0, 200));
  } catch(e) {
    console.error('Error connecting to frontend:', e.message);
  }
}

checkFrontendProxy();
