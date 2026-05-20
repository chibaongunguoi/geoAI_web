/**
 * Permission Utilities Module
 * 
 * This module provides utility functions for permission operations including:
 * - Filtering permissions by various criteria
 * - Grouping permissions by category or action
 * - Organizing permissions for display
 * - Validating permission structures
 * - Transforming permission data
 * 
 * These utilities support the permission management system and help organize
 * permissions for display in the UI while maintaining backward compatibility
 * with technical permission codes used in authorization.
 */

import {
  PERMISSION_MAPPINGS,
  PERMISSION_GROUPS,
  PERMISSION_REVERSE_MAPPINGS,
  getPermissionLabel,
  getPermissionGroupLabel,
  getAllPermissionCodes,
  getPermissionsByGroups,
} from './permissionMappings';

/**
 * Filter permissions by a search query
 * 
 * Searches through both permission codes and Vietnamese labels to find matching permissions.
 * Case-insensitive search that matches partial strings.
 * 
 * @param {string[]} permissions - Array of permission codes to filter
 * @param {string} query - Search query string
 * @returns {string[]} Array of permission codes matching the query
 * 
 * @example
 * filterPermissionsByQuery(['admin.users.manage', 'admin.roles.manage'], 'người')
 * // Returns ['admin.users.manage']
 * 
 * filterPermissionsByQuery(['admin.users.manage', 'admin.roles.manage'], 'quản')
 * // Returns ['admin.users.manage', 'admin.roles.manage']
 */
export function filterPermissionsByQuery(permissions, query) {
  if (!query || query.trim() === '') {
    return permissions;
  }

  const lowerQuery = query.toLowerCase();

  return permissions.filter((permissionCode) => {
    const label = getPermissionLabel(permissionCode);
    const codeMatch = permissionCode.toLowerCase().includes(lowerQuery);
    const labelMatch = label.toLowerCase().includes(lowerQuery);
    return codeMatch || labelMatch;
  });
}

/**
 * Filter permissions by group
 * 
 * Returns only permissions that belong to a specific group.
 * 
 * @param {string[]} permissions - Array of permission codes to filter
 * @param {string} groupPrefix - Permission group prefix (e.g., 'admin.users')
 * @returns {string[]} Array of permission codes in the specified group
 * 
 * @example
 * filterPermissionsByGroup(['admin.users.manage', 'admin.roles.manage', 'admin.users.view'], 'admin.users')
 * // Returns ['admin.users.manage', 'admin.users.view']
 */
export function filterPermissionsByGroup(permissions, groupPrefix) {
  return permissions.filter((permissionCode) => permissionCode.startsWith(groupPrefix));
}

/**
 * Filter permissions by action
 * 
 * Returns only permissions that have a specific action (e.g., 'manage', 'view').
 * 
 * @param {string[]} permissions - Array of permission codes to filter
 * @param {string} action - Action to filter by (e.g., 'manage', 'view')
 * @returns {string[]} Array of permission codes with the specified action
 * 
 * @example
 * filterPermissionsByAction(['admin.users.manage', 'admin.users.view', 'admin.roles.manage'], 'manage')
 * // Returns ['admin.users.manage', 'admin.roles.manage']
 */
export function filterPermissionsByAction(permissions, action) {
  return permissions.filter((permissionCode) => permissionCode.endsWith(action));
}

/**
 * Filter permissions by category
 * 
 * Returns only permissions that belong to a specific category (e.g., 'admin').
 * 
 * @param {string[]} permissions - Array of permission codes to filter
 * @param {string} category - Category to filter by (e.g., 'admin')
 * @returns {string[]} Array of permission codes in the specified category
 * 
 * @example
 * filterPermissionsByCategory(['admin.users.manage', 'user.profile.edit'], 'admin')
 * // Returns ['admin.users.manage']
 */
export function filterPermissionsByCategory(permissions, category) {
  return permissions.filter((permissionCode) => permissionCode.startsWith(category));
}

/**
 * Filter permissions that have mappings
 * 
 * Returns only permissions that have Vietnamese label mappings defined.
 * Useful for filtering out unmapped or custom permissions.
 * 
 * @param {string[]} permissions - Array of permission codes to filter
 * @returns {string[]} Array of permission codes that have mappings
 * 
 * @example
 * filterMappedPermissions(['admin.users.manage', 'custom.permission', 'admin.roles.manage'])
 * // Returns ['admin.users.manage', 'admin.roles.manage']
 */
export function filterMappedPermissions(permissions) {
  return permissions.filter((permissionCode) => permissionCode in PERMISSION_MAPPINGS);
}

/**
 * Filter permissions that don't have mappings
 * 
 * Returns only permissions that don't have Vietnamese label mappings defined.
 * Useful for identifying unmapped or custom permissions.
 * 
 * @param {string[]} permissions - Array of permission codes to filter
 * @returns {string[]} Array of permission codes without mappings
 * 
 * @example
 * filterUnmappedPermissions(['admin.users.manage', 'custom.permission', 'admin.roles.manage'])
 * // Returns ['custom.permission']
 */
export function filterUnmappedPermissions(permissions) {
  return permissions.filter((permissionCode) => !(permissionCode in PERMISSION_MAPPINGS));
}

/**
 * Group permissions by their group prefix
 * 
 * Organizes permissions into groups based on their prefix (e.g., 'admin.users', 'admin.roles').
 * Returns an object with group labels as keys and arrays of permission objects as values.
 * 
 * @param {string[]} permissions - Array of permission codes to group
 * @returns {Object} Object with group labels as keys and permission arrays as values
 * 
 * @example
 * groupPermissionsByGroup(['admin.users.manage', 'admin.users.view', 'admin.roles.manage'])
 * // Returns {
 * //   'Người dùng': [
 * //     { code: 'admin.users.manage', label: 'Quản lý người dùng' },
 * //     { code: 'admin.users.view', label: 'Xem người dùng' }
 * //   ],
 * //   'Vai trò': [
 * //     { code: 'admin.roles.manage', label: 'Quản lý vai trò' }
 * //   ]
 * // }
 */
export function groupPermissionsByGroup(permissions) {
  const grouped = {};

  permissions.forEach((permissionCode) => {
    const groupLabel = getPermissionGroupLabel(permissionCode);
    const label = getPermissionLabel(permissionCode);

    if (!grouped[groupLabel]) {
      grouped[groupLabel] = [];
    }

    grouped[groupLabel].push({
      code: permissionCode,
      label,
    });
  });

  return grouped;
}

/**
 * Group permissions by their action
 * 
 * Organizes permissions into groups based on their action (e.g., 'manage', 'view').
 * Returns an object with action names as keys and arrays of permission objects as values.
 * 
 * @param {string[]} permissions - Array of permission codes to group
 * @returns {Object} Object with action names as keys and permission arrays as values
 * 
 * @example
 * groupPermissionsByAction(['admin.users.manage', 'admin.users.view', 'admin.roles.manage'])
 * // Returns {
 * //   'manage': [
 * //     { code: 'admin.users.manage', label: 'Quản lý người dùng' },
 * //     { code: 'admin.roles.manage', label: 'Quản lý vai trò' }
 * //   ],
 * //   'view': [
 * //     { code: 'admin.users.view', label: 'Xem người dùng' }
 * //   ]
 * // }
 */
export function groupPermissionsByAction(permissions) {
  const grouped = {};

  permissions.forEach((permissionCode) => {
    const parts = permissionCode.split('.');
    const action = parts[parts.length - 1];
    const label = getPermissionLabel(permissionCode);

    if (!grouped[action]) {
      grouped[action] = [];
    }

    grouped[action].push({
      code: permissionCode,
      label,
    });
  });

  return grouped;
}

/**
 * Group permissions by their category
 * 
 * Organizes permissions into groups based on their category (first part of the code).
 * Returns an object with category names as keys and arrays of permission objects as values.
 * 
 * @param {string[]} permissions - Array of permission codes to group
 * @returns {Object} Object with category names as keys and permission arrays as values
 * 
 * @example
 * groupPermissionsByCategory(['admin.users.manage', 'admin.roles.manage', 'user.profile.edit'])
 * // Returns {
 * //   'admin': [
 * //     { code: 'admin.users.manage', label: 'Quản lý người dùng' },
 * //     { code: 'admin.roles.manage', label: 'Quản lý vai trò' }
 * //   ],
 * //   'user': [
 * //     { code: 'user.profile.edit', label: 'user.profile.edit' }
 * //   ]
 * // }
 */
export function groupPermissionsByCategory(permissions) {
  const grouped = {};

  permissions.forEach((permissionCode) => {
    const category = permissionCode.split('.')[0];
    const label = getPermissionLabel(permissionCode);

    if (!grouped[category]) {
      grouped[category] = [];
    }

    grouped[category].push({
      code: permissionCode,
      label,
    });
  });

  return grouped;
}

/**
 * Sort permissions alphabetically by their Vietnamese labels
 * 
 * Returns a new array of permissions sorted by their Vietnamese labels in ascending order.
 * 
 * @param {string[]} permissions - Array of permission codes to sort
 * @param {string} order - Sort order: 'asc' for ascending (default) or 'desc' for descending
 * @returns {string[]} Array of permission codes sorted by label
 * 
 * @example
 * sortPermissionsByLabel(['admin.roles.manage', 'admin.users.manage', 'admin.backups.manage'])
 * // Returns ['admin.backups.manage', 'admin.roles.manage', 'admin.users.manage']
 * // (sorted by: 'Quản lý sao lưu', 'Quản lý vai trò', 'Quản lý người dùng')
 */
export function sortPermissionsByLabel(permissions, order = 'asc') {
  const sorted = [...permissions].sort((a, b) => {
    const labelA = getPermissionLabel(a);
    const labelB = getPermissionLabel(b);
    return labelA.localeCompare(labelB, 'vi');
  });

  return order === 'desc' ? sorted.reverse() : sorted;
}

/**
 * Sort permissions alphabetically by their code
 * 
 * Returns a new array of permissions sorted by their code in ascending order.
 * 
 * @param {string[]} permissions - Array of permission codes to sort
 * @param {string} order - Sort order: 'asc' for ascending (default) or 'desc' for descending
 * @returns {string[]} Array of permission codes sorted by code
 * 
 * @example
 * sortPermissionsByCode(['admin.users.manage', 'admin.backups.manage', 'admin.roles.manage'])
 * // Returns ['admin.backups.manage', 'admin.roles.manage', 'admin.users.manage']
 */
export function sortPermissionsByCode(permissions, order = 'asc') {
  const sorted = [...permissions].sort((a, b) => a.localeCompare(b));
  return order === 'desc' ? sorted.reverse() : sorted;
}

/**
 * Organize permissions for display in a matrix format
 * 
 * Transforms an array of permissions into a structured format suitable for
 * displaying in a permission matrix (e.g., in a table with groups and permissions).
 * 
 * @param {string[]} permissions - Array of permission codes to organize
 * @returns {Array<{group: string, permissions: Array<{code: string, label: string}>}>} 
 *          Array of groups with their permissions
 * 
 * @example
 * organizePermissionsForMatrix(['admin.users.manage', 'admin.users.view', 'admin.roles.manage'])
 * // Returns [
 * //   {
 * //     group: 'Người dùng',
 * //     permissions: [
 * //       { code: 'admin.users.manage', label: 'Quản lý người dùng' },
 * //       { code: 'admin.users.view', label: 'Xem người dùng' }
 * //     ]
 * //   },
 * //   {
 * //     group: 'Vai trò',
 * //     permissions: [
 * //       { code: 'admin.roles.manage', label: 'Quản lý vai trò' }
 * //     ]
 * //   }
 * // ]
 */
export function organizePermissionsForMatrix(permissions) {
  const grouped = groupPermissionsByGroup(permissions);

  return Object.entries(grouped).map(([group, perms]) => ({
    group,
    permissions: perms,
  }));
}

/**
 * Organize permissions for display in a list format
 * 
 * Transforms an array of permissions into a flat list with labels,
 * suitable for displaying in a dropdown or list component.
 * 
 * @param {string[]} permissions - Array of permission codes to organize
 * @param {string} sortBy - Sort by 'label' (default) or 'code'
 * @returns {Array<{code: string, label: string}>} Array of permission objects
 * 
 * @example
 * organizePermissionsForList(['admin.users.manage', 'admin.roles.manage'])
 * // Returns [
 * //   { code: 'admin.roles.manage', label: 'Quản lý vai trò' },
 * //   { code: 'admin.users.manage', label: 'Quản lý người dùng' }
 * // ]
 */
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

/**
 * Organize permissions for display in a tree format
 * 
 * Transforms an array of permissions into a hierarchical tree structure,
 * suitable for displaying in a tree view component.
 * 
 * @param {string[]} permissions - Array of permission codes to organize
 * @returns {Array<{id: string, label: string, children: Array}>} Array of tree nodes
 * 
 * @example
 * organizePermissionsForTree(['admin.users.manage', 'admin.users.view', 'admin.roles.manage'])
 * // Returns [
 * //   {
 * //     id: 'admin',
 * //     label: 'Admin',
 * //     children: [
 * //       {
 * //         id: 'admin.users',
 * //         label: 'Người dùng',
 * //         children: [
 * //           { id: 'admin.users.manage', label: 'Quản lý người dùng' },
 * //           { id: 'admin.users.view', label: 'Xem người dùng' }
 * //         ]
 * //       },
 * //       {
 * //         id: 'admin.roles',
 * //         label: 'Vai trò',
 * //         children: [
 * //           { id: 'admin.roles.manage', label: 'Quản lý vai trò' }
 * //         ]
 * //       }
 * //     ]
 * //   }
 * // ]
 */
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

/**
 * Transform permissions to include both code and label
 * 
 * Converts an array of permission codes into an array of objects
 * containing both the code and its Vietnamese label.
 * 
 * @param {string[]} permissions - Array of permission codes
 * @returns {Array<{code: string, label: string}>} Array of permission objects
 * 
 * @example
 * transformPermissionsWithLabels(['admin.users.manage', 'admin.roles.manage'])
 * // Returns [
 * //   { code: 'admin.users.manage', label: 'Quản lý người dùng' },
 * //   { code: 'admin.roles.manage', label: 'Quản lý vai trò' }
 * // ]
 */
export function transformPermissionsWithLabels(permissions) {
  return permissions.map((code) => ({
    code,
    label: getPermissionLabel(code),
  }));
}

/**
 * Transform permissions to include code, label, and group
 * 
 * Converts an array of permission codes into an array of objects
 * containing the code, Vietnamese label, and group label.
 * 
 * @param {string[]} permissions - Array of permission codes
 * @returns {Array<{code: string, label: string, group: string}>} Array of permission objects
 * 
 * @example
 * transformPermissionsWithGroups(['admin.users.manage', 'admin.roles.manage'])
 * // Returns [
 * //   { code: 'admin.users.manage', label: 'Quản lý người dùng', group: 'Người dùng' },
 * //   { code: 'admin.roles.manage', label: 'Quản lý vai trò', group: 'Vai trò' }
 * // ]
 */
export function transformPermissionsWithGroups(permissions) {
  return permissions.map((code) => ({
    code,
    label: getPermissionLabel(code),
    group: getPermissionGroupLabel(code),
  }));
}

/**
 * Validate that all permissions in an array have mappings
 * 
 * Checks if all permission codes in the array have Vietnamese label mappings defined.
 * Returns an object with validation result and any unmapped permissions.
 * 
 * @param {string[]} permissions - Array of permission codes to validate
 * @returns {Object} Validation result with isValid flag and unmappedPermissions array
 * 
 * @example
 * validatePermissionMappings(['admin.users.manage', 'custom.permission'])
 * // Returns {
 * //   isValid: false,
 * //   unmappedPermissions: ['custom.permission']
 * // }
 */
export function validatePermissionMappings(permissions) {
  const unmappedPermissions = filterUnmappedPermissions(permissions);

  return {
    isValid: unmappedPermissions.length === 0,
    unmappedPermissions,
  };
}

/**
 * Get permission statistics
 * 
 * Calculates statistics about the permissions including total count,
 * count by group, count by action, and count of mapped vs unmapped permissions.
 * 
 * @param {string[]} permissions - Array of permission codes
 * @returns {Object} Statistics object with various counts
 * 
 * @example
 * getPermissionStatistics(['admin.users.manage', 'admin.users.view', 'admin.roles.manage'])
 * // Returns {
 * //   total: 3,
 * //   mapped: 3,
 * //   unmapped: 0,
 * //   byGroup: { 'Người dùng': 2, 'Vai trò': 1 },
 * //   byAction: { 'manage': 2, 'view': 1 },
 * //   byCategory: { 'admin': 3 }
 * // }
 */
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

/**
 * Compare two permission arrays
 * 
 * Compares two arrays of permissions and returns the differences.
 * Useful for identifying added, removed, or common permissions.
 * 
 * @param {string[]} permissions1 - First array of permission codes
 * @param {string[]} permissions2 - Second array of permission codes
 * @returns {Object} Comparison result with added, removed, and common permissions
 * 
 * @example
 * comparePermissions(
 *   ['admin.users.manage', 'admin.users.view'],
 *   ['admin.users.manage', 'admin.roles.manage']
 * )
 * // Returns {
 * //   added: ['admin.roles.manage'],
 * //   removed: ['admin.users.view'],
 * //   common: ['admin.users.manage']
 * // }
 */
export function comparePermissions(permissions1, permissions2) {
  const set1 = new Set(permissions1);
  const set2 = new Set(permissions2);

  const added = Array.from(set2).filter((p) => !set1.has(p));
  const removed = Array.from(set1).filter((p) => !set2.has(p));
  const common = Array.from(set1).filter((p) => set2.has(p));

  return {
    added,
    removed,
    common,
  };
}

/**
 * Merge multiple permission arrays and remove duplicates
 * 
 * Combines multiple arrays of permissions into a single array with duplicates removed.
 * 
 * @param {...string[][]} permissionArrays - Variable number of permission arrays
 * @returns {string[]} Merged array of unique permission codes
 * 
 * @example
 * mergePermissions(
 *   ['admin.users.manage', 'admin.users.view'],
 *   ['admin.users.view', 'admin.roles.manage']
 * )
 * // Returns ['admin.users.manage', 'admin.users.view', 'admin.roles.manage']
 */
export function mergePermissions(...permissionArrays) {
  const merged = new Set();

  permissionArrays.forEach((arr) => {
    arr.forEach((permission) => {
      merged.add(permission);
    });
  });

  return Array.from(merged);
}

/**
 * Get the intersection of multiple permission arrays
 * 
 * Returns only the permissions that are present in all provided arrays.
 * 
 * @param {...string[][]} permissionArrays - Variable number of permission arrays
 * @returns {string[]} Array of permissions common to all arrays
 * 
 * @example
 * intersectPermissions(
 *   ['admin.users.manage', 'admin.users.view', 'admin.roles.manage'],
 *   ['admin.users.manage', 'admin.roles.manage'],
 *   ['admin.users.manage', 'admin.roles.manage', 'admin.backups.manage']
 * )
 * // Returns ['admin.users.manage', 'admin.roles.manage']
 */
export function intersectPermissions(...permissionArrays) {
  if (permissionArrays.length === 0) {
    return [];
  }

  const [first, ...rest] = permissionArrays;
  const firstSet = new Set(first);

  return Array.from(firstSet).filter((permission) =>
    rest.every((arr) => arr.includes(permission))
  );
}

/**
 * Get the difference between two permission arrays
 * 
 * Returns permissions that are in the first array but not in the second.
 * 
 * @param {string[]} permissions1 - First array of permission codes
 * @param {string[]} permissions2 - Second array of permission codes
 * @returns {string[]} Array of permissions in first but not in second
 * 
 * @example
 * differencePermissions(
 *   ['admin.users.manage', 'admin.users.view', 'admin.roles.manage'],
 *   ['admin.users.view']
 * )
 * // Returns ['admin.users.manage', 'admin.roles.manage']
 */
export function differencePermissions(permissions1, permissions2) {
  const set2 = new Set(permissions2);
  return permissions1.filter((p) => !set2.has(p));
}

/**
 * Check if a permission array contains all required permissions
 * 
 * Verifies that all required permissions are present in the given array.
 * 
 * @param {string[]} permissions - Array of permission codes to check
 * @param {string[]} requiredPermissions - Array of required permission codes
 * @returns {boolean} True if all required permissions are present
 * 
 * @example
 * hasAllPermissions(
 *   ['admin.users.manage', 'admin.users.view', 'admin.roles.manage'],
 *   ['admin.users.manage', 'admin.roles.manage']
 * )
 * // Returns true
 */
export function hasAllPermissions(permissions, requiredPermissions) {
  const permissionSet = new Set(permissions);
  return requiredPermissions.every((p) => permissionSet.has(p));
}

/**
 * Check if a permission array contains any of the required permissions
 * 
 * Verifies that at least one of the required permissions is present in the given array.
 * 
 * @param {string[]} permissions - Array of permission codes to check
 * @param {string[]} requiredPermissions - Array of required permission codes
 * @returns {boolean} True if at least one required permission is present
 * 
 * @example
 * hasAnyPermission(
 *   ['admin.users.manage', 'admin.users.view'],
 *   ['admin.roles.manage', 'admin.users.manage']
 * )
 * // Returns true
 */
export function hasAnyPermission(permissions, requiredPermissions) {
  const permissionSet = new Set(permissions);
  return requiredPermissions.some((p) => permissionSet.has(p));
}

/**
 * Deduplicate permissions array
 * 
 * Removes duplicate permission codes from an array.
 * 
 * @param {string[]} permissions - Array of permission codes
 * @returns {string[]} Array of unique permission codes
 * 
 * @example
 * deduplicatePermissions(['admin.users.manage', 'admin.users.manage', 'admin.roles.manage'])
 * // Returns ['admin.users.manage', 'admin.roles.manage']
 */
export function deduplicatePermissions(permissions) {
  return Array.from(new Set(permissions));
}

/**
 * Paginate permissions array
 * 
 * Returns a subset of permissions for a specific page.
 * 
 * @param {string[]} permissions - Array of permission codes
 * @param {number} page - Page number (1-indexed)
 * @param {number} pageSize - Number of items per page
 * @returns {Object} Pagination result with items, page, pageSize, and total
 * 
 * @example
 * paginatePermissions(['admin.users.manage', 'admin.users.view', 'admin.roles.manage'], 1, 2)
 * // Returns {
 * //   items: ['admin.users.manage', 'admin.users.view'],
 * //   page: 1,
 * //   pageSize: 2,
 * //   total: 3,
 * //   totalPages: 2
 * // }
 */
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
