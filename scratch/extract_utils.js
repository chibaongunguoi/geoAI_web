const { Project } = require('ts-morph');
const path = require('path');

const project = new Project();
project.addSourceFilesAtPaths(path.join(__dirname, '../apps/api/src/properties/properties.service.ts'));

const sourceFile = project.getSourceFileOrThrow('properties.service.ts');
const classDeclaration = sourceFile.getClassOrThrow('PropertiesService');

const methods = classDeclaration.getMethods();
const noThisMethods = [];

for (const method of methods) {
  const bodyText = method.getBodyText();
  if (bodyText && !bodyText.includes('this.') && !bodyText.includes('this[')) {
    noThisMethods.push(method.getName());
  }
}

console.log(JSON.stringify(noThisMethods, null, 2));
