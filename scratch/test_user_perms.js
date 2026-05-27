const Database = require('better-sqlite3');
const path = require('path');
const db = new Database(path.resolve(__dirname, '../geoai_data/geoai.db'), { readonly: true });

const user = db.prepare("SELECT id, username FROM User WHERE username = 'admin123'").get();
console.log('User:', user);

// Check roles
const userRoles = db.prepare("SELECT * FROM UserRole WHERE userId = ?").all(user.id);
console.log('User roles:', userRoles);

// Check RolePermission structure
const rpCols = db.prepare("PRAGMA table_info(RolePermission)").all();
console.log('RolePermission cols:', rpCols.map(c => c.name).join(', '));

// Get role permissions
for (const ur of userRoles) {
  const perms = db.prepare("SELECT * FROM RolePermission WHERE roleId = ?").all(ur.roleId);
  console.log(`Role ${ur.roleId} permissions:`, perms.map(p => JSON.stringify(p)));
}

// Check Permission table
const permCols = db.prepare("PRAGMA table_info(Permission)").all();
console.log('Permission cols:', permCols.map(c => c.name).join(', '));

const allPerms = db.prepare("SELECT * FROM Permission WHERE id IN (SELECT permissionId FROM RolePermission WHERE roleId IN (SELECT roleId FROM UserRole WHERE userId = ?))").all(user.id);
console.log('All permissions for admin123:', allPerms.map(p => p.key || p.name || JSON.stringify(p)));

db.close();
