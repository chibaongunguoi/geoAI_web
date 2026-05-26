const fs = require('fs');
const path = require('path');

const srcPath = path.join(__dirname, '../apps/api/src/properties/properties.service.ts');
const typesPath = path.join(__dirname, '../apps/api/src/properties/properties.types.ts');
const code = fs.readFileSync(srcPath, 'utf-8');
const lines = code.split('\n');

const topLines = lines.slice(0, 387);
let typesCode = topLines.join('\n');

// Make everything exported
typesCode = typesCode.replace(/^(const|let|var|type|interface|enum)\s/gm, 'export $1 ');

// Since some imports are needed, we leave imports intact
fs.writeFileSync(typesPath, typesCode);
console.log('Created properties.types.ts');
