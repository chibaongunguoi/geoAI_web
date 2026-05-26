const { Project, SyntaxKind } = require('ts-morph');
const path = require('path');
const fs = require('fs');

const noThisMethods = [
  "isExplicitListQuery", "withSemanticProviderTimeout", "withListSearchTimeout", "semanticSearchFallbackWarning",
  "searchSource", "minimumSearchScore", "bestFuzzyTokenScore", "isDensityQuestion", "densityDirection",
  "isCountQuestion", "extractPhraseAfter", "matchKnownDistrict", "matchKnownWard", "matchStatus",
  "matchPropertyType", "searchStatus", "isNaturalLanguageQuestion", "densitySearchTerms",
  "densityObjectAllocations", "selectLightPropertyFields", "validGeoJsonGeometry", "propertyObjectBbox",
  "searchAnswer", "isSameSearchTokenFilter", "featureProperties", "validBbox", "withoutCode",
  "searchableText", "searchTokens", "withDensityTimeout", "validLimit", "validDensityGridSize",
  "validLatitude", "validLongitude", "validOptionalNumber", "numberValue", "cleanString", "formatCode",
  "roundCoordinate", "integerValue", "validOptionalInteger", "validDateRange", "validDateBoundary"
];

const project = new Project();
const dir = path.join(__dirname, '../apps/api/src/properties');
const serviceFiles = [
  'properties.crud.service.ts',
  'properties.search.service.ts',
  'properties.spatial.service.ts',
  'properties.import.service.ts'
].map(f => path.join(dir, f));

project.addSourceFilesAtPaths(serviceFiles);
const originalFile = path.join(dir, 'properties.service.ts');
project.addSourceFileAtPath(originalFile);
const orig = project.getSourceFileOrThrow('properties.service.ts');

let utilsSource = '';

// Copy all imports from original file
const imports = orig.getImportDeclarations().map(i => i.getText()).join('\n');
utilsSource += imports + '\n\n';

const extractedMethods = new Set();
const origClass = orig.getClassOrThrow('PropertiesService');

for (const methodName of noThisMethods) {
  const method = origClass.getMethod(methodName);
  if (method) {
    let text = method.getText();
    // Convert class method to exported function
    text = text.replace(/^(async )?([a-zA-Z0-9_]+)\s*\(/, 'export $1function $2(');
    // Remove "private " or "public " if any
    text = text.replace(/^(private |public |protected )?export /, 'export ');
    utilsSource += text + '\n\n';
    extractedMethods.add(methodName);
  }
}

fs.writeFileSync(path.join(dir, 'properties.utils.ts'), utilsSource);
console.log('Created properties.utils.ts');

const utilsProject = new Project();
utilsProject.addSourceFilesAtPaths(serviceFiles);

for (const sf of utilsProject.getSourceFiles()) {
  const classDecl = sf.getClasses()[0];
  if (!classDecl) continue;

  const usedUtils = new Set();

  // Remove the static methods from the service class
  for (const methodName of extractedMethods) {
    const method = classDecl.getMethod(methodName);
    if (method) method.remove();
  }

  // Replace this.methodName with methodName
  sf.forEachDescendant(node => {
    if (node.getKind() === SyntaxKind.PropertyAccessExpression) {
      const expr = node.getExpression();
      if (expr.getKind() === SyntaxKind.ThisKeyword) {
        const name = node.getName();
        if (extractedMethods.has(name)) {
          usedUtils.add(name);
          node.replaceWithText(name);
        }
      }
    }
  });

  // Add import for usedUtils
  if (usedUtils.size > 0) {
    sf.addImportDeclaration({
      moduleSpecifier: './properties.utils',
      namedImports: Array.from(usedUtils).map(name => ({ name }))
    });
  }

  sf.saveSync();
  console.log('Updated ' + sf.getBaseName());
}
