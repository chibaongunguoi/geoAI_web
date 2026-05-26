import { getPermissionLabel, getPermissionGroupLabel } from './permissionMappings';

export function groupPermissionsByGroup(permissions) {
  const grouped = {};
  permissions.forEach((permissionCode) => {
    const groupLabel = getPermissionGroupLabel(permissionCode);
    const label = getPermissionLabel(permissionCode);
    if (!grouped[groupLabel]) {
      grouped[groupLabel] = [];
    }
    grouped[groupLabel].push({ code: permissionCode, label });
  });
  return grouped;
}

export function groupPermissionsByAction(permissions) {
  const grouped = {};
  permissions.forEach((permissionCode) => {
    const parts = permissionCode.split('.');
    const action = parts[parts.length - 1];
    const label = getPermissionLabel(permissionCode);
    if (!grouped[action]) {
      grouped[action] = [];
    }
    grouped[action].push({ code: permissionCode, label });
  });
  return grouped;
}

export function groupPermissionsByCategory(permissions) {
  const grouped = {};
  permissions.forEach((permissionCode) => {
    const category = permissionCode.split('.')[0];
    const label = getPermissionLabel(permissionCode);
    if (!grouped[category]) {
      grouped[category] = [];
    }
    grouped[category].push({ code: permissionCode, label });
  });
  return grouped;
}
