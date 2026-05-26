const { Project } = require('ts-morph');
const path = require('path');
const fs = require('fs');

const srcPath = path.join(__dirname, '../apps/api/src/properties/properties.service.ts');
const dir = path.dirname(srcPath);

const crudMethods = new Set([
  'getProperty', 'createProperty', 'updateProperty', 'deleteProperty',
  'findProperty', 'propertyData', 'sanitizedPropertyInput', 'withoutCode', 'writeAudit',
  'validLatitude', 'validLongitude', 'validOptionalNumber', 'validOptionalInteger',
  'numberValue', 'integerValue', 'cleanString', 'formatCode', 'validDateRange', 'validDateBoundary'
]);

const searchMethods = new Set([
  'searchProperties', 'searchPropertiesPostgres', 'searchPropertiesPostgresList',
  'searchPropertiesSqliteList', 'shouldUseElasticsearch', 'elasticsearchProvider',
  'getSuggestions', 'searchWhere', 'fuzzySearchWhere', 'rankRows', 'searchIntent',
  'ambiguityWarning', 'isNaturalLanguageQuestion', 'searchAnswer', 'isSameSearchTokenFilter',
  'searchableText', 'searchTokens', 'listSearchFallbackResponse', 'isDensityQuestion',
  'densityDirection', 'isCountQuestion', 'extractPhraseAfter', 'shouldUseExactLocationColumns',
  'matchKnownDistrict', 'matchKnownWard', 'matchStatus', 'matchPropertyType', 'searchStatus',
  'searchPropertyType', 'addNormalizedPhraseFilter', 'addNormalizedTokenFilters', 'minimumSearchScore',
  'bestFuzzyTokenScore', 'withSemanticProviderTimeout', 'withListSearchTimeout',
  'semanticSearchFallbackWarning', 'searchSource', 'isExplicitListQuery', 'validLimit',
  'selectLightPropertyFields'
]);

const spatialMethods = new Set([
  'getBuildingHeatmap', 'densityRegions', 'densityLocationFilters', 'locationNames',
  'densitySearchTerms', 'densityTotal', 'densityRegion', 'attachDensityObjects',
  'densityObjectAllocations', 'densityObject', 'propertyObjectCenter', 'propertyObjectBbox',
  'withDensityTimeout', 'densityFallbackResponse', 'validDensityGridSize', 'roundCoordinate',
  'collectCoordinatePairs', 'geometryPoints', 'centroidFromGeometry', 'centroidFromBbox',
  'validBbox', 'readBbox', 'validGeoJsonGeometry'
]);

const importMethods = new Set([
  'importAssetRows', 'importOvertureBuildings', 'assetImportCandidate', 'overtureFeatureData',
  'featureProperties', 'primaryName'
]);

function createService(name, keepMethods, fileName) {
  const project = new Project();
  project.addSourceFilesAtPaths(srcPath);
  const sourceFile = project.getSourceFileOrThrow('properties.service.ts');
  const classDecl = sourceFile.getClassOrThrow('PropertiesService');
  
  classDecl.rename(name);
  
  const methods = classDecl.getMethods();
  for (const method of methods) {
    if (!keepMethods.has(method.getName())) {
      method.remove();
    }
  }
  
  const newPath = path.join(dir, fileName);
  fs.writeFileSync(newPath, sourceFile.getFullText());
  console.log(`Created ${fileName}`);
}

createService('PropertiesCrudService', crudMethods, 'properties.crud.service.ts');
createService('PropertiesSearchService', searchMethods, 'properties.search.service.ts');
createService('PropertiesSpatialService', spatialMethods, 'properties.spatial.service.ts');
createService('PropertiesImportService', importMethods, 'properties.import.service.ts');
