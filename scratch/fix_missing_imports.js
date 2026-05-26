const { Project } = require('ts-morph');
const path = require('path');

const project = new Project();
const dir = path.join(__dirname, '../apps/api/src/properties');
project.addSourceFilesAtPaths(path.join(dir, '*.ts'));

const typesFile = project.getSourceFileOrThrow('properties.types.ts');
const exportedDecls = Array.from(typesFile.getExportedDeclarations().keys());

for (const sf of project.getSourceFiles()) {
  if (sf.getBaseName() === 'properties.types.ts' || sf.getBaseName() === 'properties.service.ts') continue;
  
  // Clean up duplicate non-import declarations before class
  if (sf.getBaseName().includes('service.ts')) {
     // We leave it for now to avoid breaking decorators
  }

  // Add import statement for all exported types from properties.types.ts
  // We can just add a blanket import for all of them, TS will tree-shake
  sf.addImportDeclaration({
    moduleSpecifier: './properties.types',
    namedImports: exportedDecls.map(name => ({ name }))
  });

  sf.saveSync();
  console.log('Fixed imports for ' + sf.getBaseName());
}
