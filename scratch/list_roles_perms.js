const Database = require('better-sqlite3');
const path = require('path');
const db = new Database(path.resolve(__dirname, '../geoai_data/geoai.db'), { readonly: true });

const roles = db.prepare("SELECT id, name FROM Role").all();

for (const role of roles) {
  const perms = db.prepare(`
    SELECT p.key, p.name, p."group", p.description
    FROM Permission p
    JOIN RolePermission rp ON rp.permissionId = p.id
    WHERE rp.roleId = ?
    ORDER BY p."group", p.key
  `).all(role.id);
  
  console.log(`\nRole: ${role.name}`);
  for (const p of perms) {
    console.log(`  ${p.key}|||${p["group"]}|||${p.name}|||${p.description}`);
  }
}

db.close();
