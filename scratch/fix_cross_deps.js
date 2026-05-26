const { Project, SyntaxKind } = require('ts-morph');
const path = require('path');

const project = new Project();
const dir = path.join(__dirname, '../apps/api/src/properties');
project.addSourceFilesAtPaths(path.join(dir, '*.ts'));

const searchServiceFile = project.getSourceFileOrThrow('properties.search.service.ts');
const searchClass = searchServiceFile.getClassOrThrow('PropertiesSearchService');

// Add injection for PropertiesSpatialService
searchServiceFile.addImportDeclaration({
  moduleSpecifier: './properties.spatial.service',
  namedImports: [{ name: 'PropertiesSpatialService' }]
});

const constructor = searchClass.getConstructors()[0];
if (constructor) {
  constructor.addParameter({
    name: 'spatialService',
    isReadonly: true,
    scope: 'private',
    type: 'PropertiesSpatialService',
    decorators: [{ name: 'Inject', arguments: ['PropertiesSpatialService'] }]
  });
  searchServiceFile.addImportDeclaration({
    moduleSpecifier: '@nestjs/common',
    namedImports: [{ name: 'Inject' }] // Might duplicate but TS handles or we can ignore
  });
}

// Replace this.density* with this.spatialService.density*
searchServiceFile.forEachDescendant(node => {
  if (node.getKind() === SyntaxKind.PropertyAccessExpression) {
    const expr = node.getExpression();
    if (expr.getKind() === SyntaxKind.ThisKeyword) {
      const name = node.getName();
      if (name.startsWith('density') || name === 'locationNames') {
        node.replaceWithText('this.spatialService.' + name);
      }
    }
  }
});
searchServiceFile.saveSync();
console.log('Fixed search service cross deps');

const importServiceFile = project.getSourceFileOrThrow('properties.import.service.ts');
const importClass = importServiceFile.getClassOrThrow('PropertiesImportService');

importServiceFile.addImportDeclaration({
  moduleSpecifier: './properties.crud.service',
  namedImports: [{ name: 'PropertiesCrudService' }]
});
importServiceFile.addImportDeclaration({
  moduleSpecifier: './properties.spatial.service',
  namedImports: [{ name: 'PropertiesSpatialService' }]
});

const importConstructor = importClass.getConstructors()[0];
if (importConstructor) {
  importConstructor.addParameter({
    name: 'crudService',
    isReadonly: true,
    scope: 'private',
    type: 'PropertiesCrudService',
    decorators: [{ name: 'Inject', arguments: ['PropertiesCrudService'] }]
  });
  importConstructor.addParameter({
    name: 'spatialService',
    isReadonly: true,
    scope: 'private',
    type: 'PropertiesSpatialService',
    decorators: [{ name: 'Inject', arguments: ['PropertiesSpatialService'] }]
  });
}

importServiceFile.forEachDescendant(node => {
  if (node.getKind() === SyntaxKind.PropertyAccessExpression) {
    const expr = node.getExpression();
    if (expr.getKind() === SyntaxKind.ThisKeyword) {
      const name = node.getName();
      if (name === 'propertyData') {
        node.replaceWithText('this.crudService.propertyData');
      } else if (name === 'readBbox' || name === 'centroidFromBbox' || name === 'centroidFromGeometry') {
        node.replaceWithText('this.spatialService.' + name);
      }
    }
  }
});
importServiceFile.saveSync();
console.log('Fixed import service cross deps');
