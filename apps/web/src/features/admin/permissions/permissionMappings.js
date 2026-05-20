/**
 * Permission Mappings Module
 * 
 * This module provides bidirectional mapping between technical permission codes
 * and Vietnamese semantic descriptions. It serves as the central repository for
 * permission display labels and permission grouping.
 * 
 * The mappings maintain backward compatibility with technical permission codes
 * used in the authorization layer while providing user-friendly Vietnamese
 * descriptions for UI display.
 */

/**
 * PERMISSION_MAPPINGS
 * 
 * Maps technical permission codes to Vietnamese semantic descriptions.
 * These descriptions are displayed to users in the UI instead of technical codes.
 * 
 * Format: {
 *   'technical.code': 'Vietnamese Description'
 * }
 * 
 * All 10 required permission mappings:
 * - admin.apiKeys.manage → Quản lý khóa API
 * - admin.backups.manage → Quản lý sao lưu
 * - admin.config.manage → Quản lý cấu hình
 * - admin.logs.view → Xem nhật ký
 * - admin.permissions.manage → Quản lý quyền
 * - admin.permissions.view → Xem quyền
 * - admin.roles.manage → Quản lý vai trò
 * - admin.roles.view → Xem vai trò
 * - admin.users.manage → Quản lý người dùng
 * - admin.users.view → Xem người dùng
 */
export const PERMISSION_MAPPINGS = {
  'admin.apiKeys.manage': 'Quản lý khóa API',
  'admin.backups.manage': 'Quản lý sao lưu',
  'admin.config.manage': 'Quản lý cấu hình',
  'admin.logs.view': 'Xem nhật ký',
  'admin.permissions.manage': 'Quản lý quyền',
  'admin.permissions.view': 'Xem quyền',
  'admin.roles.manage': 'Quản lý vai trò',
  'admin.roles.view': 'Xem vai trò',
  'admin.users.manage': 'Quản lý người dùng',
  'admin.users.view': 'Xem người dùng',
};

/**
 * PERMISSION_REVERSE_MAPPINGS
 * 
 * Reverse mapping from Vietnamese descriptions back to technical permission codes.
 * Useful for lookups when you have the Vietnamese description and need the technical code.
 * 
 * Format: {
 *   'Vietnamese Description': 'technical.code'
 * }
 * 
 * This mapping is automatically generated from PERMISSION_MAPPINGS to ensure
 * consistency and prevent manual errors.
 */
export const PERMISSION_REVERSE_MAPPINGS = Object.entries(PERMISSION_MAPPINGS).reduce(
  (acc, [code, label]) => {
    acc[label] = code;
    return acc;
  },
  {}
);

/**
 * PERMISSION_GROUPS
 * 
 * Organizes permissions into logical groups for better UI presentation.
 * Maps permission prefixes (e.g., 'admin.users') to Vietnamese group labels.
 * 
 * Format: {
 *   'permission.prefix': 'Vietnamese Group Label'
 * }
 * 
 * Groups are used to:
 * - Organize permissions in the permission matrix
 * - Display permission categories in the UI
 * - Filter and search permissions
 * - Improve user experience when managing permissions
 */
export const PERMISSION_GROUPS = {
  'admin.apiKeys': 'Khóa API',
  'admin.backups': 'Sao lưu',
  'admin.config': 'Cấu hình',
  'admin.logs': 'Nhật ký',
  'admin.permissions': 'Quyền',
  'admin.roles': 'Vai trò',
  'admin.users': 'Người dùng',
};

/**
 * Helper function to get the Vietnamese label for a permission code
 * 
 * @param {string} permissionCode - The technical permission code (e.g., 'admin.users.manage')
 * @returns {string} The Vietnamese semantic description, or the code itself if not found
 * 
 * @example
 * getPermissionLabel('admin.users.manage') // Returns 'Quản lý người dùng'
 * getPermissionLabel('unknown.permission') // Returns 'unknown.permission'
 */
export function getPermissionLabel(permissionCode) {
  return PERMISSION_MAPPINGS[permissionCode] || permissionCode;
}

/**
 * Helper function to get the Vietnamese group label for a permission code
 * 
 * @param {string} permissionCode - The technical permission code (e.g., 'admin.users.manage')
 * @returns {string} The Vietnamese group label, or the prefix itself if not found
 * 
 * @example
 * getPermissionGroupLabel('admin.users.manage') // Returns 'Người dùng'
 * getPermissionGroupLabel('admin.users.view') // Returns 'Người dùng'
 * getPermissionGroupLabel('unknown.permission.code') // Returns 'unknown.permission'
 */
export function getPermissionGroupLabel(permissionCode) {
  if (!permissionCode || typeof permissionCode !== 'string') {
    return permissionCode;
  }
  const group = permissionCode.split('.').slice(0, -1).join('.');
  return PERMISSION_GROUPS[group] || group;
}

/**
 * Helper function to get the reverse mapping (Vietnamese description to technical code)
 * 
 * @param {string} vietnameseLabel - The Vietnamese semantic description
 * @returns {string|undefined} The technical permission code, or undefined if not found
 * 
 * @example
 * getReversePermissionMapping('Quản lý người dùng') // Returns 'admin.users.manage'
 * getReversePermissionMapping('Unknown Label') // Returns undefined
 */
export function getReversePermissionMapping(vietnameseLabel) {
  return PERMISSION_REVERSE_MAPPINGS[vietnameseLabel];
}

/**
 * Helper function to check if a permission code has a mapping
 * 
 * @param {string} permissionCode - The technical permission code
 * @returns {boolean} True if the permission code has a mapping, false otherwise
 * 
 * @example
 * hasPermissionMapping('admin.users.manage') // Returns true
 * hasPermissionMapping('unknown.permission') // Returns false
 */
export function hasPermissionMapping(permissionCode) {
  return permissionCode in PERMISSION_MAPPINGS;
}

/**
 * Helper function to get all permission codes
 * 
 * @returns {string[]} Array of all technical permission codes
 * 
 * @example
 * getAllPermissionCodes() // Returns ['admin.apiKeys.manage', 'admin.backups.manage', ...]
 */
export function getAllPermissionCodes() {
  return Object.keys(PERMISSION_MAPPINGS);
}

/**
 * Helper function to get all permission labels
 * 
 * @returns {string[]} Array of all Vietnamese permission labels
 * 
 * @example
 * getAllPermissionLabels() // Returns ['Quản lý khóa API', 'Quản lý sao lưu', ...]
 */
export function getAllPermissionLabels() {
  return Object.values(PERMISSION_MAPPINGS);
}

/**
 * Helper function to get all permission groups
 * 
 * @returns {string[]} Array of all Vietnamese permission group labels
 * 
 * @example
 * getAllPermissionGroups() // Returns ['Khóa API', 'Sao lưu', ...]
 */
export function getAllPermissionGroups() {
  return Object.values(PERMISSION_GROUPS);
}

/**
 * Helper function to get permissions by group
 * 
 * @param {string} groupPrefix - The permission group prefix (e.g., 'admin.users')
 * @returns {Array<{code: string, label: string}>} Array of permissions in the group
 * 
 * @example
 * getPermissionsByGroup('admin.users')
 * // Returns [
 * //   { code: 'admin.users.manage', label: 'Quản lý người dùng' },
 * //   { code: 'admin.users.view', label: 'Xem người dùng' }
 * // ]
 */
export function getPermissionsByGroup(groupPrefix) {
  return Object.entries(PERMISSION_MAPPINGS)
    .filter(([code]) => code.startsWith(groupPrefix))
    .map(([code, label]) => ({ code, label }));
}

/**
 * Helper function to get permissions organized by group
 * 
 * @returns {Object} Object with group labels as keys and arrays of permissions as values
 * 
 * @example
 * getPermissionsByGroups()
 * // Returns {
 * //   'Người dùng': [
 * //     { code: 'admin.users.manage', label: 'Quản lý người dùng' },
 * //     { code: 'admin.users.view', label: 'Xem người dùng' }
 * //   ],
 * //   'Vai trò': [...]
 * // }
 */
export function getPermissionsByGroups() {
  const grouped = {};
  
  Object.entries(PERMISSION_MAPPINGS).forEach(([code, label]) => {
    const groupPrefix = code.split('.').slice(0, -1).join('.');
    const groupLabel = PERMISSION_GROUPS[groupPrefix] || groupPrefix;
    
    if (!grouped[groupLabel]) {
      grouped[groupLabel] = [];
    }
    
    grouped[groupLabel].push({ code, label });
  });
  
  return grouped;
}
