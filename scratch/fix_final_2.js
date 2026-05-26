const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, '../apps/api/src/properties');

// 1. properties.search.service.ts: remove levenshteinDistance because it's now in properties.utils.ts
const searchPath = path.join(dir, 'properties.search.service.ts');
let search = fs.readFileSync(searchPath, 'utf-8');
// It doesn't have levenshteinDistance anymore (I moved it in fix_final), but wait, the TS error said:
// `Module '"./properties.utils"' declares 'levenshteinDistance' locally, but it is not exported.`
// Oh! I need to export levenshteinDistance in properties.utils.ts!
const utilsPath = path.join(dir, 'properties.utils.ts');
let utils = fs.readFileSync(utilsPath, 'utf-8');
utils = utils.replace('function levenshteinDistance(', 'export function levenshteinDistance(');
fs.writeFileSync(utilsPath, utils);

// 2. properties.spatial.service.ts:
// - `private async densityRegions` -> `public async densityRegions`
// - Fix this.searchService.addNormalizedPhraseFilter (if I hadn't already)
const spatialPath = path.join(dir, 'properties.spatial.service.ts');
let spatial = fs.readFileSync(spatialPath, 'utf-8');
spatial = spatial.replace('private async densityRegions(', 'public async densityRegions(');
// Also I need to change `this.addNormalizedPhraseFilter` to `this.searchService.addNormalizedPhraseFilter`
// wait, does spatialService have a `searchService`? No, because my script failed earlier!
// Let's just put `addNormalizedPhraseFilter` into properties.utils.ts!
// Actually it's easier to put `addNormalizedPhraseFilter` in utils.
// But it mutates an array. That's fine.
// Wait! `addNormalizedPhraseFilter` calls `isSameSearchTokenFilter` which is in utils!
// Let's just define `addNormalizedPhraseFilter` in spatial service locally, it's tiny!
if (!spatial.includes('addNormalizedPhraseFilter(andFilters')) {
  spatial = spatial.replace('public densityFallbackResponse(',
`public addNormalizedPhraseFilter(andFilters: Record<string, unknown>[], value?: string) {
    const normalized = normalizeSearchText(value || "");
    if (!normalized) return;
    if (!andFilters.some((filter) => filter?.searchTextNormalized?.contains === normalized)) {
      andFilters.push({ searchTextNormalized: { contains: normalized } });
    }
}
public ambiguityWarning(query: string | undefined, intent: any, tokens: string[]) {
    const normalizedQuery = normalizeSearchText(query || "");
    if (intent.filters.ward || intent.filters.district || intent.filters.status || intent.filters.propertyType || tokens.length > 0) return undefined;
    return "Bạn có thể chỉ rõ phường, quận hoặc điều kiện cần tìm?";
}
public densityFallbackResponse(`);
}
// Fix the calls in spatial service
spatial = spatial.replace(/this\.searchService\.addNormalizedPhraseFilter/g, 'this.addNormalizedPhraseFilter');
spatial = spatial.replace(/this\.searchService\.ambiguityWarning/g, 'this.ambiguityWarning');
// Also remove normalizeSearchText from spatial because it conflicts if it's imported? No, it's local in spatial.
// Wait, normalizeSearchText is defined locally at the bottom of spatial. So I don't need to import it.
fs.writeFileSync(spatialPath, spatial);

// 3. properties.search.service.ts constructor order
// Wait, TS complained about spatialService being before sqlite in properties.search.service.ts
// `properties.search.service.ts:30:56 - error TS1016: A required parameter cannot follow an optional parameter.`
// Oh! spatialService is required, but it comes AFTER sqlite which is optional!
// Let's reorder properties.search.service.ts constructor
search = search.replace(
  '@Optional() @Inject(BetterSqliteService) private readonly sqlite?: BetterSqliteService,\n    @Optional()\n    @Inject(PROPERTIES_SERVICE_OPTIONS)\n    options: PropertiesServiceOptions = {}',
  '@Optional() @Inject(BetterSqliteService) private readonly sqlite?: BetterSqliteService'
);
// Actually it's easier to just make all of them required or just swap them.
search = search.replace(
`    @Inject(PrismaService) private readonly prisma: PropertiesPrisma,
    @Inject(PropertiesSpatialService) private readonly spatialService: PropertiesSpatialService,
    @Optional() @Inject(BetterSqliteService) private readonly sqlite?: BetterSqliteService,
    @Optional()
    @Inject(PROPERTIES_SERVICE_OPTIONS)
    options: PropertiesServiceOptions = {}`,
`    @Inject(PrismaService) private readonly prisma: PropertiesPrisma,
    @Inject(PropertiesSpatialService) private readonly spatialService: PropertiesSpatialService,
    @Optional() @Inject(BetterSqliteService) private readonly sqlite?: BetterSqliteService,
    @Optional() @Inject(PROPERTIES_SERVICE_OPTIONS) options: PropertiesServiceOptions = {}`
);
fs.writeFileSync(searchPath, search);

// 4. properties.import.service.ts constructor order
const importPath = path.join(dir, 'properties.import.service.ts');
let importService = fs.readFileSync(importPath, 'utf-8');
importService = importService.replace(
`    @Inject(PrismaService) private readonly prisma: PropertiesPrisma,
    @Optional() @Inject(BetterSqliteService) private readonly sqlite?: BetterSqliteService,
    @Inject(PropertiesCrudService) private readonly crudService: PropertiesCrudService,
    @Inject(PropertiesSpatialService) private readonly spatialService: PropertiesSpatialService,
    @Optional()
    @Inject(PROPERTIES_SERVICE_OPTIONS)
    options: PropertiesServiceOptions = {}`,
`    @Inject(PrismaService) private readonly prisma: PropertiesPrisma,
    @Inject(PropertiesCrudService) private readonly crudService: PropertiesCrudService,
    @Inject(PropertiesSpatialService) private readonly spatialService: PropertiesSpatialService,
    @Optional() @Inject(BetterSqliteService) private readonly sqlite?: BetterSqliteService,
    @Optional() @Inject(PROPERTIES_SERVICE_OPTIONS) options: PropertiesServiceOptions = {}`
);
fs.writeFileSync(importPath, importService);

console.log('Fixed final 2');
