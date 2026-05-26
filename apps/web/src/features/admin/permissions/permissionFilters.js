import { PERMISSION_MAPPINGS, getPermissionLabel } from './permissionMappings';

export function filterPermissionsByQuery(permissions, query) {
  if (!query || query.trim() === '') return permissions;
  const lowerQuery = query.toLowerCase();
  return permissions.filter((permissionCode) => {
    const label = getPermissionLabel(permissionCode);
    return permissionCode.toLowerCase().includes(lowerQuery) || label.toLowerCase().includes(lowerQuery);
  });
}

export function filterPermissionsByGroup(permissions, groupPrefix) {
  return permissions.filter((permissionCode) => permissionCode.startsWith(groupPrefix));
}

export function filterPermissionsByAction(permissions, action) {
  return permissions.filter((permissionCode) => permissionCode.endsWith(action));
}

export function filterPermissionsByCategory(permissions, category) {
  return permissions.filter((permissionCode) => permissionCode.startsWith(category));
}

export function filterMappedPermissions(permissions) {
  return permissions.filter((permissionCode) => permissionCode in PERMISSION_MAPPINGS);
}

export function filterUnmappedPermissions(permissions) {
  return permissions.filter((permissionCode) => !(permissionCode in PERMISSION_MAPPINGS));
}
