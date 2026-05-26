const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, '../apps/api/src/properties');

// 1. Fix PropertiesCrudService
const crudPath = path.join(dir, 'properties.crud.service.ts');
let crud = fs.readFileSync(crudPath, 'utf-8');
crud = crud.replace(/private propertyData\(/, 'public propertyData(');
fs.writeFileSync(crudPath, crud);

// 2. Fix PropertiesSpatialService
const spatialPath = path.join(dir, 'properties.spatial.service.ts');
let spatial = fs.readFileSync(spatialPath, 'utf-8');
spatial = spatial.replace(/private readBbox\(/, 'public readBbox(');
spatial = spatial.replace(/private centroidFromBbox\(/, 'public centroidFromBbox(');
spatial = spatial.replace(/private centroidFromGeometry\(/, 'public centroidFromGeometry(');
spatial = spatial.replace(/private densityLocationFilters\(/, 'public densityLocationFilters(');
spatial = spatial.replace(/private densityFallbackResponse\(/, 'public densityFallbackResponse(');
spatial = spatial.replace(/private densityRegions\(/, 'public densityRegions(');
spatial = spatial.replace(/private densityTotal\(/, 'public densityTotal(');
spatial = spatial.replace(/private locationNames\(/, 'public locationNames(');
fs.writeFileSync(spatialPath, spatial);

// 3. Fix PropertiesSearchService duplicate Inject
const searchPath = path.join(dir, 'properties.search.service.ts');
let search = fs.readFileSync(searchPath, 'utf-8');
search = search.replace('import { Inject } from "@nestjs/common";\n', '');
fs.writeFileSync(searchPath, search);

// 4. Move normalizeSearchText and levenshteinDistance from search to utils
const utilsPath = path.join(dir, 'properties.utils.ts');
let utils = fs.readFileSync(utilsPath, 'utf-8');

const matchHelpers = search.match(/export function normalizeSearchText.*?$/s);
if (matchHelpers && !utils.includes('function normalizeSearchText')) {
  search = search.replace(/export function normalizeSearchText.*?$/s, '');
  fs.writeFileSync(searchPath, search);
  
  utils += '\n' + matchHelpers[0];
  fs.writeFileSync(utilsPath, utils);
}

// 5. Fix properties.types.ts @Injectable
const typesPath = path.join(dir, 'properties.types.ts');
let types = fs.readFileSync(typesPath, 'utf-8');
types = types.replace(/@Injectable\(\)\s*$/m, '');
fs.writeFileSync(typesPath, types);

console.log('Fixed final TS errors');
