import { getPermissionLabel, getPermissionGroupLabel } from './permissionMappings';
import { groupPermissionsByGroup } from './permissionGroups';

export function sortPermissionsByLabel(permissions, order = 'asc') {
  const sorted = [...permissions].sort((a, b) => {
    const labelA = getPermissionLabel(a);
    const labelB = getPermissionLabel(b);
    return labelA.localeCompare(labelB, 'vi');
  });
  return order === 'desc' ? sorted.reverse() : sorted;
}

export function sortPermissionsByCode(permissions, order = 'asc') {
  const sorted = [...permissions].sort((a, b) => a.localeCompare(b));
  return order === 'desc' ? sorted.reverse() : sorted;
}

export function organizePermissionsForMatrix(permissions) {
  const grouped = groupPermissionsByGroup(permissions);
  return Object.entries(grouped).map(([group, perms]) => ({
    group,
    permissions: perms,
  }));
}

export function organizePermissionsForList(permissions, sortBy = 'label') {
  const permissionObjects = permissions.map((code) => ({
    code,
    label: getPermissionLabel(code),
  }));
  if (sortBy === 'code') {
    return permissionObjects.sort((a, b) => a.code.localeCompare(b.code));
  }
  return permissionObjects.sort((a, b) => a.label.localeCompare(b.label, 'vi'));
}

export function organizePermissionsForTree(permissions) {
  const tree = {};
  permissions.forEach((permissionCode) => {
    const parts = permissionCode.split('.');
    let current = tree;
    parts.forEach((part, index) => {
      if (!current[part]) {
        current[part] = {
          id: parts.slice(0, index + 1).join('.'),
          label: index === parts.length - 1 ? getPermissionLabel(permissionCode) : part,
          children: {},
        };
      }
      current = current[part].children;
    });
  });
  const convertToArray = (obj) => {
    return Object.values(obj).map((node) => ({
      id: node.id,
      label: node.label,
      children: Object.keys(node.children).length > 0 ? convertToArray(node.children) : undefined,
    }));
  };
  return convertToArray(tree);
}

export function transformPermissionsWithLabels(permissions) {
  return permissions.map((code) => ({
    code,
    label: getPermissionLabel(code),
  }));
}

export function transformPermissionsWithGroups(permissions) {
  return permissions.map((code) => ({
    code,
    label: getPermissionLabel(code),
    group: getPermissionGroupLabel(code),
  }));
}
