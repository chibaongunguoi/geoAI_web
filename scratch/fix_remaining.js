const { Project, SyntaxKind } = require('ts-morph');
const path = require('path');
const fs = require('fs');

const project = new Project();
const dir = path.join(__dirname, '../apps/api/src/properties');
const serviceFiles = [
  'properties.crud.service.ts',
  'properties.search.service.ts',
  'properties.spatial.service.ts',
  'properties.import.service.ts'
].map(f => path.join(dir, f));

project.addSourceFilesAtPaths(serviceFiles);

// Fix 1: Change private methods to public if they are called by other services
const methodsToPublic = [
  'propertyData', 'readBbox', 'centroidFromBbox', 'centroidFromGeometry',
  'densityLocationFilters', 'densityFallbackResponse', 'densityRegions',
  'densityTotal', 'locationNames'
];

for (const sf of project.getSourceFiles()) {
  const cls = sf.getClasses()[0];
  if (cls) {
    for (const name of methodsToPublic) {
      const method = cls.getMethod(name);
      if (method && method.hasModifier(SyntaxKind.PrivateKeyword)) {
        method.getModifiers().forEach(mod => {
          if (mod.getKind() === SyntaxKind.PrivateKeyword) mod.replaceWithText('public');
        });
      }
    }
  }
}

// Fix 2: Search constructor required parameter after optional
const searchFile = project.getSourceFileOrThrow('properties.search.service.ts');
const searchCls = searchFile.getClassOrThrow('PropertiesSearchService');
const searchCtor = searchCls.getConstructors()[0];
if (searchCtor) {
  const params = searchCtor.getParameters();
  const optionsParam = params.find(p => p.getName() === 'options');
  const spatialParam = params.find(p => p.getName() === 'spatialService');
  if (optionsParam && spatialParam && optionsParam.getChildIndex() < spatialParam.getChildIndex()) {
    // Reorder: add spatialParam before optionsParam
    const spatialText = spatialParam.getText();
    spatialParam.remove();
    searchCtor.insertParameter(optionsParam.getChildIndex(), spatialText);
  }
}

// Fix 3: Duplicate 'Inject' in search service
let searchImports = searchFile.getImportDeclarations();
let injectImportFound = false;
for (const imp of searchImports) {
  if (imp.getModuleSpecifierValue() === '@nestjs/common') {
    const named = imp.getNamedImports();
    for (const n of named) {
      if (n.getName() === 'Inject') {
        if (!injectImportFound) injectImportFound = true;
        else n.remove();
      }
    }
  }
}

// Fix 4: PropertiesSpatialService missing addNormalizedPhraseFilter and ambiguityWarning
// These were in properties.search.service.ts or utils. Let's just import them from utils if they are there, or from searchService.
// Actually, they were moved to utils or deleted? Let's check if they are in SearchService.
const spatialFile = project.getSourceFileOrThrow('properties.spatial.service.ts');
const spatialCls = spatialFile.getClassOrThrow('PropertiesSpatialService');
const spatialCtor = spatialCls.getConstructors()[0];
if (spatialCtor && !spatialCtor.getParameter('searchService')) {
  // Inject SearchService to SpatialService
  spatialFile.addImportDeclaration({
    moduleSpecifier: './properties.search.service',
    namedImports: [{ name: 'PropertiesSearchService' }]
  });
  // Must insert before optional options parameter if it exists
  const optionsParam = spatialCtor.getParameter('options');
  const idx = optionsParam ? optionsParam.getChildIndex() : spatialCtor.getParameters().length;
  spatialCtor.insertParameter(idx, {
    name: 'searchService',
    isReadonly: true,
    scope: 'private',
    type: 'PropertiesSearchService',
    decorators: [{ name: 'Inject', arguments: ['forwardRef(() => PropertiesSearchService)'] }]
  });
  spatialFile.addImportDeclaration({
    moduleSpecifier: '@nestjs/common',
    namedImports: [{ name: 'forwardRef' }]
  });
  
  // Now replace this.addNormalizedPhraseFilter with this.searchService.addNormalized...
  spatialFile.forEachDescendant(node => {
    if (node.getKind() === SyntaxKind.PropertyAccessExpression) {
      const expr = node.getExpression();
      if (expr.getKind() === SyntaxKind.ThisKeyword) {
        const name = node.getName();
        if (name === 'addNormalizedPhraseFilter' || name === 'ambiguityWarning') {
          node.replaceWithText('this.searchService.' + name);
        }
      }
    }
  });
  
  // Make them public in SearchService
  const searchMethods = ['addNormalizedPhraseFilter', 'ambiguityWarning'];
  for (const name of searchMethods) {
    const m = searchCls.getMethod(name);
    if (m && m.hasModifier(SyntaxKind.PrivateKeyword)) {
      m.getModifiers().forEach(mod => {
        if (mod.getKind() === SyntaxKind.PrivateKeyword) mod.replaceWithText('public');
      });
    }
  }
}

// Since spatial imports search and search imports spatial, we need forwardRef in search as well!
if (searchCtor) {
  const spatialParam = searchCtor.getParameter('spatialService');
  if (spatialParam) {
    const decorator = spatialParam.getDecorator('Inject');
    if (decorator) {
      decorator.setArguments(['forwardRef(() => PropertiesSpatialService)']);
    }
    searchFile.addImportDeclaration({
      moduleSpecifier: '@nestjs/common',
      namedImports: [{ name: 'forwardRef' }]
    });
  }
}

project.saveSync();
console.log('Fixed cross deps and constructor orders');

// Fix 5: properties.types.ts @Injectable()
const typesPath = path.join(dir, 'properties.types.ts');
let typesCode = fs.readFileSync(typesPath, 'utf-8');
typesCode = typesCode.replace(/@Injectable\(\)\s*$/m, '');
fs.writeFileSync(typesPath, typesCode);

// Fix 6: properties.utils.ts missing normalizeSearchText
// The function normalizeSearchText is actually in MapWrapper.js on frontend! But for backend it was a standalone function in properties.service.ts?
// Wait, I need to check properties.service.ts if it had normalizeSearchText.
const origService = fs.readFileSync(path.join(dir, 'properties.service.ts'), 'utf-8');
const match = origService.match(/function normalizeSearchText.*?\}/s);
const utilsPath = path.join(dir, 'properties.utils.ts');
let utilsCode = fs.readFileSync(utilsPath, 'utf-8');
if (match && !utilsCode.includes('normalizeSearchText')) {
  utilsCode = `export ${match[0]}\n\n` + utilsCode;
  fs.writeFileSync(utilsPath, utilsCode);
}
console.log('Fixed types and utils');
