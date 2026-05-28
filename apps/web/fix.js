const fs = require('fs'); 
let c = fs.readFileSync('src/features/map/layers.test.js', 'utf8'); 
c = c.replace(/sample-assets/g, 'analysis-results'); 
c = c.replace(/expect\(state\.visible\["analysis-results"\]\)\.toBe\(true\);\s*expect\(state\.visible\["analysis-results"\]\)\.toBe\(true\);/g, 'expect(state.visible["analysis-results"]).toBe(true);'); 
c = c.replace(/expect\(state\.visible\["analysis-results"\]\)\.toBe\(false\);\s*expect\(state\.visible\["analysis-results"\]\)\.toBe\(true\);/g, 'expect(state.visible["analysis-results"]).toBe(true);'); 
c = c.replace(/expect\(state\.visible\["analysis-results"\]\)\.toBe\(false\);\s*expect\(state\.visible\["analysis-results"\]\)\.toBe\(false\);/g, 'expect(state.visible["analysis-results"]).toBe(false);'); 
c = c.replace(/"admin-boundaries",\s*"analysis-results",\s*"analysis-results"/g, '"admin-boundaries", "analysis-results"'); 
c = c.replace(/"analysis-results",\s*"admin-boundaries",\s*"analysis-results"/g, '"analysis-results", "admin-boundaries"'); 
fs.writeFileSync('src/features/map/layers.test.js', c);
