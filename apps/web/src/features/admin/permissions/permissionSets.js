import { filterMappedPermissions, filterUnmappedPermissions } from './permissionFilters';
import { getPermissionGroupLabel } from './permissionMappings';

export function comparePermissions(permissions1, permissions2) {
  const set1 = new Set(permissions1);
  const set2 = new Set(permissions2);
  const added = Array.from(set2).filter((p) => !set1.has(p));
  const removed = Array.from(set1).filter((p) => !set2.has(p));
  const common = Array.from(set1).filter((p) => set2.has(p));
  return { added, removed, common };
}

export function mergePermissions(...permissionArrays) {
  const merged = new Set();
  permissionArrays.forEach((arr) => {
    arr.forEach((permission) => merged.add(permission));
  });
  return Array.from(merged);
}

export function intersectPermissions(...permissionArrays) {
  if (permissionArrays.length === 0) return [];
  const [first, ...rest] = permissionArrays;
  const firstSet = new Set(first);
  return Array.from(firstSet).filter((permission) =>
    rest.every((arr) => arr.includes(permission))
  );
}

export function differencePermissions(permissions1, permissions2) {
  const set2 = new Set(permissions2);
  return permissions1.filter((p) => !set2.has(p));
}

export function hasAllPermissions(permissions, requiredPermissions) {
  const permissionSet = new Set(permissions);
  return requiredPermissions.every((p) => permissionSet.has(p));
}

export function hasAnyPermission(permissions, requiredPermissions) {
  const permissionSet = new Set(permissions);
  return requiredPermissions.some((p) => permissionSet.has(p));
}

export function deduplicatePermissions(permissions) {
  return Array.from(new Set(permissions));
}

export function paginatePermissions(permissions, page = 1, pageSize = 10) {
  const start = (page - 1) * pageSize;
  const end = start + pageSize;
  const items = permissions.slice(start, end);
  const totalPages = Math.ceil(permissions.length / pageSize);
  return {
    items,
    page,
    pageSize,
    total: permissions.length,
    totalPages,
  };
}

export function validatePermissionMappings(permissions) {
  const unmappedPermissions = filterUnmappedPermissions(permissions);
  return {
    isValid: unmappedPermissions.length === 0,
    unmappedPermissions,
  };
}

export function getPermissionStatistics(permissions) {
  const mapped = filterMappedPermissions(permissions);
  const unmapped = filterUnmappedPermissions(permissions);
  const byGroup = {};
  const byAction = {};
  const byCategory = {};

  permissions.forEach((permissionCode) => {
    const groupLabel = getPermissionGroupLabel(permissionCode);
    const parts = permissionCode.split('.');
    const action = parts[parts.length - 1];
    const category = parts[0];

    byGroup[groupLabel] = (byGroup[groupLabel] || 0) + 1;
    byAction[action] = (byAction[action] || 0) + 1;
    byCategory[category] = (byCategory[category] || 0) + 1;
  });

  return {
    total: permissions.length,
    mapped: mapped.length,
    unmapped: unmapped.length,
    byGroup,
    byAction,
    byCategory,
  };
}
