const { Project, SyntaxKind } = require('ts-morph');
const path = require('path');

const project = new Project();
const dir = path.join(__dirname, '../apps/api/src/properties');
const serviceFiles = [
  'properties.crud.service.ts',
  'properties.search.service.ts',
  'properties.spatial.service.ts',
  'properties.import.service.ts'
].map(f => path.join(dir, f));

project.addSourceFilesAtPaths(serviceFiles);

for (const sf of project.getSourceFiles()) {
  const statements = sf.getStatements();
  for (const stmt of statements) {
    const kind = stmt.getKind();
    // Remove all variable statements, interfaces, type aliases outside of the class
    if (
      kind === SyntaxKind.VariableStatement ||
      kind === SyntaxKind.TypeAliasDeclaration ||
      kind === SyntaxKind.InterfaceDeclaration ||
      kind === SyntaxKind.EnumDeclaration
    ) {
      stmt.remove();
    }
  }
  sf.saveSync();
  console.log('Cleaned up ' + sf.getBaseName());
}
