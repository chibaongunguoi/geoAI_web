const https = require('https');

function fetchOverpass() {
  const query = `[out:json];area["name"="Đà Nẵng"]->.searchArea;(way["flood_prone"="yes"](area.searchArea);way["hazard"="flood"](area.searchArea);relation["flood_prone"="yes"](area.searchArea);relation["hazard"="flood"](area.searchArea););out geom;`;
  const url = 'https://overpass-api.de/api/interpreter?data=' + encodeURIComponent(query);
  
  https.get(url, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      try {
        const json = JSON.parse(data);
        console.log('Overpass Flood Elements:', json.elements ? json.elements.length : 0);
      } catch(e) {
        console.error('Overpass Parse Error:', e.message);
      }
    });
  }).on('error', console.error);
}

function fetchNasa() {
  // Bounding box for Da Nang approximate: 107.8, 15.9, 108.4, 16.3
  // NASA API uses Socrata: https://data.nasa.gov/resource/dd9e-wu2v.json
  const url = 'https://data.nasa.gov/resource/dd9e-wu2v.json?$where=within_box(geolocation, 16.3, 107.8, 15.9, 108.4)';
  
  https.get(url, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      try {
        const json = JSON.parse(data);
        console.log('NASA Landslides in Da Nang:', json.length);
      } catch(e) {
        console.error('NASA Parse Error:', e.message);
      }
    });
  }).on('error', console.error);
}

fetchOverpass();
fetchNasa();
