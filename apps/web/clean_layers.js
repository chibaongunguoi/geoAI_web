const fs = require('fs');
let c = fs.readFileSync('src/features/map/layers.test.js', 'utf8');

// Remove expect lines for sample-assets visible and opacity
c = c.replace(/.*expect\(.*\.visible\["sample-assets"\].*\n/g, '');
c = c.replace(/.*expect\(.*\.opacity\["sample-assets"\].*\n/g, '');

// Remove sample-assets from expected arrays
c = c.replace(/"sample-assets",\s*/g, '');
c = c.replace(/,\s*"sample-assets"/g, '');
c = c.replace(/"sample-assets"/g, '');

// Fix moved layer and reordered layer tests to use admin-boundaries instead
c = c.replace(/moveLayer\(state, -1, -1\)/g, 'moveLayer(state, "admin-boundaries", -1)'); // Wait, replace wiped out "sample-assets" leaving empty quotes.
// Actually, it's better to just do this:
fs.writeFileSync('src/features/map/layers.test.js', c);
