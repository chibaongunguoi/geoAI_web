/**
 * usePermissionDisplay React Hook
 * 
 * This hook provides client-side access to permission display functions.
 * It maps technical permission codes to Vietnamese semantic descriptions
 * for display in the UI.
 * 
 * The hook maintains backward compatibility with technical permission codes
 * used in the authorization layer while providing user-friendly Vietnamese
 * descriptions for UI display.
 * 
 * @returns {Object} Object containing permission display functions:
 *   - getLabel(permissionCode): Maps permission code to Vietnamese description
 *   - getGroupLabel(permissionCode): Gets permission group label
 * 
 * @example
 * const { getLabel, getGroupLabel } = usePermissionDisplay();
 * 
 * // Get Vietnamese label for a permission code
 * const label = getLabel('admin.users.manage'); // Returns 'Quản lý người dùng'
 * 
 * // Get group label for a permission code
 * const groupLabel = getGroupLabel('admin.users.manage'); // Returns 'Người dùng'
 * 
 * // Fallback behavior - returns code if mapping not found
 * const unknownLabel = getLabel('unknown.permission'); // Returns 'unknown.permission'
 */

'use client';

import { PERMISSION_MAPPINGS, PERMISSION_GROUPS } from './permissionMappings';

/**
 * React hook for accessing permission display functions
 * 
 * This hook provides two main functions:
 * 1. getLabel() - Maps technical permission codes to Vietnamese descriptions
 * 2. getGroupLabel() - Gets the Vietnamese group label for a permission
 * 
 * Both functions implement fallback behavior, returning the original code/prefix
 * if no mapping is found.
 * 
 * @returns {Object} Object with getLabel and getGroupLabel functions
 */
export function usePermissionDisplay() {
  /**
   * Maps a technical permission code to its Vietnamese semantic description
   * 
   * @param {string} permissionCode - The technical permission code (e.g., 'admin.users.manage')
   * @returns {string} The Vietnamese semantic description, or the code itself if not found
   * 
   * Fallback behavior:
   * - If the permission code is found in PERMISSION_MAPPINGS, returns the Vietnamese description
   * - If the permission code is not found, returns the code itself as fallback
   * 
   * @example
   * getLabel('admin.users.manage') // Returns 'Quản lý người dùng'
   * getLabel('admin.users.view') // Returns 'Xem người dùng'
   * getLabel('unknown.permission') // Returns 'unknown.permission' (fallback)
   */
  const getLabel = (permissionCode) => {
    return PERMISSION_MAPPINGS[permissionCode] || permissionCode;
  };

  /**
   * Gets the Vietnamese group label for a permission code
   * 
   * @param {string} permissionCode - The technical permission code (e.g., 'admin.users.manage')
   * @returns {string} The Vietnamese group label, or the prefix itself if not found
   * 
   * How it works:
   * 1. Extracts the group prefix from the permission code (e.g., 'admin.users' from 'admin.users.manage')
   * 2. Looks up the group prefix in PERMISSION_GROUPS
   * 3. Returns the Vietnamese group label if found, or the prefix itself as fallback
   * 
   * Fallback behavior:
   * - If the group prefix is found in PERMISSION_GROUPS, returns the Vietnamese group label
   * - If the group prefix is not found, returns the prefix itself as fallback
   * 
   * @example
   * getGroupLabel('admin.users.manage') // Returns 'Người dùng'
   * getGroupLabel('admin.users.view') // Returns 'Người dùng'
   * getGroupLabel('admin.roles.manage') // Returns 'Vai trò'
   * getGroupLabel('unknown.permission.code') // Returns 'unknown.permission' (fallback)
   */
  const getGroupLabel = (permissionCode) => {
    // Handle null and undefined gracefully
    if (permissionCode == null) {
      return '';
    }
    
    const group = permissionCode.split('.').slice(0, -1).join('.');
    return PERMISSION_GROUPS[group] || group;
  };

  return { getLabel, getGroupLabel };
}
