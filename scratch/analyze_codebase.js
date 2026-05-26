const fs = require('fs');
const path = require('path');

const WEB_DIR = path.join(__dirname, '../apps/web');
const API_DIR = path.join(__dirname, '../apps/api/src');

function walk(dir, fileList = []) {
  if (!fs.existsSync(dir)) return fileList;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const stat = fs.statSync(path.join(dir, file));
    if (stat.isDirectory()) {
      if (!['node_modules', '.next', 'dist', 'scratch', '.git'].includes(file)) {
        walk(path.join(dir, file), fileList);
      }
    } else {
      if (file.match(/\.(js|jsx|ts|tsx)$/) && !file.endsWith('.test.js') && !file.endsWith('.spec.ts')) {
        fileList.push(path.join(dir, file));
      }
    }
  }
  return fileList;
}

function analyzeWebFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n').length;
  const useStates = (content.match(/useState\(/g) || []).length;
  const useEffects = (content.match(/useEffect\(/g) || []).length;
  
  if (lines > 300 || useStates >= 5 || useEffects >= 3) {
    return {
      file: filePath.split('apps\\web\\')[1] || filePath,
      lines,
      useStates,
      useEffects,
      type: 'frontend'
    };
  }
  return null;
}

function analyzeApiFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n').length;
  const asyncMethods = (content.match(/^\s*(async )?[a-zA-Z0-9_]+\s*\(/gm) || []).length;
  const injections = (content.match(/constructor\s*\(([^)]+)\)/)?.[1]?.split(',')?.length || 0);
  
  if (lines > 300 || asyncMethods > 15 || injections > 5) {
    return {
      file: filePath.split('apps\\api\\src\\')[1] || filePath,
      lines,
      asyncMethods,
      injections,
      type: 'backend'
    };
  }
  return null;
}

const webFiles = walk(WEB_DIR);
const apiFiles = walk(API_DIR);

const results = [];

for (const file of webFiles) {
  const res = analyzeWebFile(file);
  if (res) results.push(res);
}

for (const file of apiFiles) {
  const res = analyzeApiFile(file);
  if (res) results.push(res);
}

results.sort((a, b) => b.lines - a.lines);

console.log(JSON.stringify(results, null, 2));
