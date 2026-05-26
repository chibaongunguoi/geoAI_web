const { Project } = require('ts-morph');
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
project.addSourceFileAtPath(path.join(dir, 'properties.service.ts'));
const orig = project.getSourceFileOrThrow('properties.service.ts');

let utilsSource = '';

const imports = orig.getImportDeclarations().map(i => i.getText()).join('\n');
utilsSource += imports + '\n\n';

const origClass = orig.getClassOrThrow('PropertiesService');

for (const methodName of noThisMethods) {
  const method = origClass.getMethod(methodName);
  if (method) {
    const isAsync = method.isAsync();
    const parameters = method.getParameters().map(p => p.getText()).join(', ');
    const returnType = method.getReturnTypeNode() ? `: ${method.getReturnTypeNode().getText()}` : '';
    const body = method.getBodyText();
    
    // Replace `this.` with nothing in the body, but carefully.
    // Actually, simple string replacement is fine for body since it's just 'this.methodName'
    let newBody = body.replace(/this\./g, '');
    
    utilsSource += `export ${isAsync ? 'async ' : ''}function ${methodName}(${parameters})${returnType} {\n${newBody}\n}\n\n`;
  }
}

fs.writeFileSync(path.join(dir, 'properties.utils.ts'), utilsSource);
console.log('Fixed properties.utils.ts');
