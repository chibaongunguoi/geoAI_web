const Database = require('better-sqlite3');
const path = require('path');

// Resolve database path same way BetterSqliteService does
const envUrl = process.env.DATABASE_URL || 'file:../../../geoai_data/geoai.db';
const fileMatch = envUrl.match(/^file:(.+)$/);
const filePath = fileMatch ? fileMatch[1] : null;

let dbPath;
if (filePath) {
  if (filePath.startsWith('/') || /^[a-zA-Z]:/.test(filePath)) {
    dbPath = filePath;
  } else {
    dbPath = path.resolve(process.cwd(), 'prisma', filePath);
  }
}

console.log('Database path:', dbPath);

// Try to open with readonly flag
const db = new Database(dbPath, { readonly: true });
db.pragma('journal_mode');
const mode = db.pragma('journal_mode', { simple: true });
console.log('Journal mode:', mode);

// Check WAL files
const fs = require('fs');
const shmPath = dbPath + '-shm';
const walPath = dbPath + '-wal';
console.log('-shm exists:', fs.existsSync(shmPath), fs.existsSync(shmPath) ? `(${fs.statSync(shmPath).size} bytes)` : '');
console.log('-wal exists:', fs.existsSync(walPath), fs.existsSync(walPath) ? `(${fs.statSync(walPath).size} bytes)` : '');

// Try a simple write to see if db is locked
try {
  const rw = new Database(dbPath, { timeout: 2000 });
  rw.pragma('journal_mode = WAL');
  const start = Date.now();
  rw.prepare('BEGIN IMMEDIATE').run();
  console.log(`IMMEDIATE transaction acquired in ${Date.now() - start}ms`);
  rw.prepare('ROLLBACK').run();
  console.log('OK - Database writable');
  rw.close();
} catch (err) {
  console.error('Database WRITE test failed:', err.message);
}

db.close();
