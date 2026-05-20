/**
 * Permission Constants
 * 
 * This file contains all permission-related constants used throughout the application.
 * It serves as the central repository for permission definitions, mappings, and groups.
 */

/**
 * Permission Codes
 * Technical permission codes used for authorization checks throughout the application.
 * These codes are used internally in the authorization layer and should not be changed.
 */
export const PERMISSION_CODES = {
  ADMIN_API_KEYS_MANAGE: 'admin.apiKeys.manage',
  ADMIN_BACKUPS_MANAGE: 'admin.backups.manage',
  ADMIN_CONFIG_MANAGE: 'admin.config.manage',
  ADMIN_LOGS_VIEW: 'admin.logs.view',
  ADMIN_PERMISSIONS_MANAGE: 'admin.permissions.manage',
  ADMIN_PERMISSIONS_VIEW: 'admin.permissions.view',
  ADMIN_ROLES_MANAGE: 'admin.roles.manage',
  ADMIN_ROLES_VIEW: 'admin.roles.view',
  ADMIN_USERS_MANAGE: 'admin.users.manage',
  ADMIN_USERS_VIEW: 'admin.users.view',
};

/**
 * Permission Mappings
 * Bidirectional mapping between technical permission codes and Vietnamese semantic descriptions.
 * Used for displaying user-friendly permission labels in the UI.
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
 * Reverse Permission Mappings
 * Reverse mapping from Vietnamese descriptions back to technical permission codes.
 * Useful for lookups when you have the description and need the code.
 */
export const PERMISSION_REVERSE_MAPPINGS = Object.entries(PERMISSION_MAPPINGS).reduce(
  (acc, [code, label]) => {
    acc[label] = code;
    return acc;
  },
  {}
);

/**
 * Permission Groups
 * Organizes permissions into logical groups for better UI presentation.
 * Maps permission prefixes to Vietnamese group labels.
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
 * Permission Actions
 * Common permission actions used across the system.
 */
export const PERMISSION_ACTIONS = {
  VIEW: 'view',
  MANAGE: 'manage',
  CREATE: 'create',
  EDIT: 'edit',
  DELETE: 'delete',
};

/**
 * Permission Categories
 * High-level categories for organizing permissions.
 */
export const PERMISSION_CATEGORIES = {
  ADMIN: 'admin',
  USER: 'user',
  SYSTEM: 'system',
};
