/**
 * Server-side Permission Label Utility
 * 
 * This module provides server-side functions for converting technical permission codes
 * to Vietnamese semantic descriptions. It's designed for use in server components and
 * server-side rendering contexts.
 * 
 * Unlike the client-side hook (usePermissionDisplay), this utility can be imported
 * and used directly in server components without React hooks.
 * 
 * Maintains backward compatibility with technical permission codes used in the
 * authorization layer while providing user-friendly Vietnamese descriptions for UI display.
 */

import {
  PERMISSION_MAPPINGS,
  PERMISSION_GROUPS,
  PERMISSION_REVERSE_MAPPINGS,
} from './permissionMappings';

/**
 * Get the Vietnamese semantic description for a permission code
 * 
 * This function maps technical permission codes to their Vietnamese descriptions.
 * It's designed for server-side usage in server components and server-side rendering.
 * 
 * @param {string} permissionCode - The technical permission code (e.g., 'admin.users.manage')
 * @returns {string} The Vietnamese semantic description, or the code itself if not found
 * 
 * @example
 * // In a server component
 * const label = getPermissionLabel('admin.users.manage');
 * // Returns: 'Quản lý người dùng'
 * 
 * @example
 * // Fallback behavior for unmapped codes
 * const label = getPermissionLabel('unknown.permission.code');
 * // Returns: 'unknown.permission.code'
 * 
 * @example
 * // Usage in server component
 * export default function PermissionDisplay({ permissionCode }) {
 *   const label = getPermissionLabel(permissionCode);
 *   return <span>{label}</span>;
 * }
 */
export function getPermissionLabel(permissionCode) {
  if (!permissionCode || typeof permissionCode !== 'string') {
    return permissionCode || '';
  }
  
  return PERMISSION_MAPPINGS[permissionCode] || permissionCode;
}

/**
 * Get the Vietnamese group label for a permission code
 * 
 * This function extracts the permission group prefix from a permission code
 * and returns its Vietnamese group label. It's designed for server-side usage
 * in server components and server-side rendering.
 * 
 * @param {string} permissionCode - The technical permission code (e.g., 'admin.users.manage')
 * @returns {string} The Vietnamese group label, or the prefix itself if not found
 * 
 * @example
 * // Get group label for a permission
 * const groupLabel = getPermissionGroupLabel('admin.users.manage');
 * // Returns: 'Người dùng'
 * 
 * @example
 * // Same group for different permissions
 * const groupLabel1 = getPermissionGroupLabel('admin.users.manage');
 * const groupLabel2 = getPermissionGroupLabel('admin.users.view');
 * // Both return: 'Người dùng'
 * 
 * @example
 * // Fallback behavior for unmapped groups
 * const groupLabel = getPermissionGroupLabel('unknown.permission.code');
 * // Returns: 'unknown.permission'
 * 
 * @example
 * // Usage in server component
 * export default function PermissionGroupDisplay({ permissionCode }) {
 *   const groupLabel = getPermissionGroupLabel(permissionCode);
 *   return <span className="group-label">{groupLabel}</span>;
 * }
 */
export function getPermissionGroupLabel(permissionCode) {
  if (!permissionCode || typeof permissionCode !== 'string') {
    return permissionCode || '';
  }
  
  const group = permissionCode.split('.').slice(0, -1).join('.');
  return PERMISSION_GROUPS[group] || group;
}

/**
 * Get the reverse mapping (Vietnamese description to technical code)
 * 
 * This function maps Vietnamese descriptions back to their technical permission codes.
 * Useful for lookups when you have the Vietnamese description and need the technical code.
 * 
 * @param {string} vietnameseLabel - The Vietnamese semantic description
 * @returns {string|undefined} The technical permission code, or undefined if not found
 * 
 * @example
 * // Get technical code from Vietnamese label
 * const code = getReversePermissionMapping('Quản lý người dùng');
 * // Returns: 'admin.users.manage'
 * 
 * @example
 * // Fallback behavior for unmapped labels
 * const code = getReversePermissionMapping('Unknown Label');
 * // Returns: undefined
 */
export function getReversePermissionMapping(vietnameseLabel) {
  if (!vietnameseLabel || typeof vietnameseLabel !== 'string') {
    return undefined;
  }
  
  return PERMISSION_REVERSE_MAPPINGS[vietnameseLabel];
}

/**
 * Check if a permission code has a mapping
 * 
 * This function checks whether a permission code has a Vietnamese description mapping.
 * Useful for validation and conditional rendering.
 * 
 * @param {string} permissionCode - The technical permission code
 * @returns {boolean} True if the permission code has a mapping, false otherwise
 * 
 * @example
 * // Check if permission has mapping
 * if (hasPermissionMapping('admin.users.manage')) {
 *   // Permission has a Vietnamese description
 * }
 * 
 * @example
 * // Fallback behavior for unmapped codes
 * hasPermissionMapping('unknown.permission') // Returns: false
 */
export function hasPermissionMapping(permissionCode) {
  if (!permissionCode || typeof permissionCode !== 'string') {
    return false;
  }
  
  return permissionCode in PERMISSION_MAPPINGS;
}

/**
 * Get all permission codes
 * 
 * This function returns an array of all technical permission codes.
 * Useful for iterating over all permissions or building permission lists.
 * 
 * @returns {string[]} Array of all technical permission codes
 * 
 * @example
 * // Get all permission codes
 * const codes = getAllPermissionCodes();
 * // Returns: ['admin.apiKeys.manage', 'admin.backups.manage', ...]
 * 
 * @example
 * // Usage in server component
 * export default function PermissionList() {
 *   const codes = getAllPermissionCodes();
 *   return (
 *     <ul>
 *       {codes.map(code => (
 *         <li key={code}>{getPermissionLabel(code)}</li>
 *       ))}
 *     </ul>
 *   );
 * }
 */
export function getAllPermissionCodes() {
  return Object.keys(PERMISSION_MAPPINGS);
}

/**
 * Get all permission labels
 * 
 * This function returns an array of all Vietnamese permission labels.
 * Useful for building permission lists or dropdowns.
 * 
 * @returns {string[]} Array of all Vietnamese permission labels
 * 
 * @example
 * // Get all permission labels
 * const labels = getAllPermissionLabels();
 * // Returns: ['Quản lý khóa API', 'Quản lý sao lưu', ...]
 */
export function getAllPermissionLabels() {
  return Object.values(PERMISSION_MAPPINGS);
}

/**
 * Get all permission groups
 * 
 * This function returns an array of all Vietnamese permission group labels.
 * Useful for building permission group lists or filters.
 * 
 * @returns {string[]} Array of all Vietnamese permission group labels
 * 
 * @example
 * // Get all permission groups
 * const groups = getAllPermissionGroups();
 * // Returns: ['Khóa API', 'Sao lưu', ...]
 */
export function getAllPermissionGroups() {
  return Object.values(PERMISSION_GROUPS);
}

/**
 * Get permissions by group prefix
 * 
 * This function returns all permissions that belong to a specific group.
 * Useful for filtering permissions by category.
 * 
 * @param {string} groupPrefix - The permission group prefix (e.g., 'admin.users')
 * @returns {Array<{code: string, label: string}>} Array of permissions in the group
 * 
 * @example
 * // Get all user-related permissions
 * const userPermissions = getPermissionsByGroup('admin.users');
 * // Returns: [
 * //   { code: 'admin.users.manage', label: 'Quản lý người dùng' },
 * //   { code: 'admin.users.view', label: 'Xem người dùng' }
 * // ]
 * 
 * @example
 * // Usage in server component
 * export default function UserPermissions() {
 *   const permissions = getPermissionsByGroup('admin.users');
 *   return (
 *     <ul>
 *       {permissions.map(({ code, label }) => (
 *         <li key={code}>{label}</li>
 *       ))}
 *     </ul>
 *   );
 * }
 */
export function getPermissionsByGroup(groupPrefix) {
  if (!groupPrefix || typeof groupPrefix !== 'string') {
    return [];
  }
  
  return Object.entries(PERMISSION_MAPPINGS)
    .filter(([code]) => code.startsWith(groupPrefix))
    .map(([code, label]) => ({ code, label }));
}

/**
 * Get permissions organized by group
 * 
 * This function returns all permissions organized into groups.
 * Useful for building permission matrices or grouped permission lists.
 * 
 * @returns {Object} Object with group labels as keys and arrays of permissions as values
 * 
 * @example
 * // Get permissions organized by group
 * const grouped = getPermissionsByGroups();
 * // Returns: {
 * //   'Người dùng': [
 * //     { code: 'admin.users.manage', label: 'Quản lý người dùng' },
 * //     { code: 'admin.users.view', label: 'Xem người dùng' }
 * //   ],
 * //   'Vai trò': [
 * //     { code: 'admin.roles.manage', label: 'Quản lý vai trò' },
 * //     { code: 'admin.roles.view', label: 'Xem vai trò' }
 * //   ],
 * //   ...
 * // }
 * 
 * @example
 * // Usage in server component
 * export default function PermissionMatrix() {
 *   const grouped = getPermissionsByGroups();
 *   return (
 *     <div>
 *       {Object.entries(grouped).map(([groupLabel, permissions]) => (
 *         <div key={groupLabel}>
 *           <h3>{groupLabel}</h3>
 *           <ul>
 *             {permissions.map(({ code, label }) => (
 *               <li key={code}>{label}</li>
 *             ))}
 *           </ul>
 *         </div>
 *       ))}
 *     </div>
 *   );
 * }
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
