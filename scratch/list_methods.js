const { Project } = require('ts-morph');
const path = require('path');

const project = new Project();
project.addSourceFilesAtPaths(path.join(__dirname, '../apps/api/src/properties/properties.service.ts'));

const sourceFile = project.getSourceFileOrThrow('properties.service.ts');
const classDeclaration = sourceFile.getClassOrThrow('PropertiesService');

const methods = classDeclaration.getMethods().map(m => m.getName());
console.log(JSON.stringify(methods, null, 2));
