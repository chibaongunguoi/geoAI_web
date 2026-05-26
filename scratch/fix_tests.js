const fs = require('fs');
const path = require('path');

const specPath = path.join(__dirname, '../apps/api/src/properties/properties.service.spec.ts');
let spec = fs.readFileSync(specPath, 'utf-8');

// 1. Remove the old PropertiesService import
spec = spec.replace(
  'import { INTENT_KEYWORDS, PropertiesService, STOP_WORDS_FOR_TOKENS } from "./properties.service";',
  'import { INTENT_KEYWORDS, STOP_WORDS_FOR_TOKENS } from "./properties.types";\nimport { PropertiesCrudService } from "./properties.crud.service";\nimport { PropertiesSearchService } from "./properties.search.service";\nimport { PropertiesSpatialService } from "./properties.spatial.service";\nimport { PropertiesImportService } from "./properties.import.service";'
);

// 2. Inject the dummy PropertiesService class
const dummyClass = `
class PropertiesService {
  crud: PropertiesCrudService;
  search: PropertiesSearchService;
  spatial: PropertiesSpatialService;
  import: PropertiesImportService;

  constructor(prisma: any, sqlite?: any, options?: any) {
    this.crud = new PropertiesCrudService(prisma);
    this.spatial = new PropertiesSpatialService(prisma, sqlite, options);
    this.search = new PropertiesSearchService(prisma, this.spatial, sqlite, options);
    this.import = new PropertiesImportService(prisma, this.crud, this.spatial, sqlite, options);
    // Wire up search service for spatial service helper methods
    (this.spatial as any).searchService = this.search;
  }

  searchProperties(input: any) { return this.search.searchProperties(input); }
  getSuggestions(query: any) { return this.search.getSuggestions(query); }
  createProperty(input: any, actor: any) { return this.crud.createProperty(input, actor); }
  updateProperty(id: any, input: any, actor: any) { return this.crud.updateProperty(id, input, actor); }
  deleteProperty(id: any, actor: any) { return this.crud.deleteProperty(id, actor); }
  importOvertureBuildings(features: any, options: any) { return this.import.importOvertureBuildings(features, options); }
  importAssetRows(rows: any, options: any) { return this.import.importAssetRows(rows, options); }
}
`;

spec = spec.replace('function prismaStub(overrides = {}) {', dummyClass + '\nfunction prismaStub(overrides = {}) {');

fs.writeFileSync(specPath, spec);
console.log('Fixed tests');
