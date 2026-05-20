/**
 * Tests for Server-side Permission Label Utility
 * 
 * Tests verify that:
 * - getPermissionLabel() correctly maps permission codes to Vietnamese descriptions
 * - getPermissionGroupLabel() correctly extracts and maps permission groups
 * - All helper functions work correctly for server-side usage
 * - Fallback behavior works as expected
 * - Input validation and edge cases are handled properly
 * 
 * **Validates: Requirements 2.1, 2.3, 5.2**
 */

import {
  getPermissionLabel,
  getPermissionGroupLabel,
  getReversePermissionMapping,
  hasPermissionMapping,
  getAllPermissionCodes,
  getAllPermissionLabels,
  getAllPermissionGroups,
  getPermissionsByGroup,
  getPermissionsByGroups,
} from './getPermissionLabel';

describe('Server-side Permission Label Utility', () => {
  describe('getPermissionLabel', () => {
    it('should map admin.users.manage to Quản lý người dùng', () => {
      expect(getPermissionLabel('admin.users.manage')).toBe('Quản lý người dùng');
    });

    it('should map admin.users.view to Xem người dùng', () => {
      expect(getPermissionLabel('admin.users.view')).toBe('Xem người dùng');
    });

    it('should map admin.roles.manage to Quản lý vai trò', () => {
      expect(getPermissionLabel('admin.roles.manage')).toBe('Quản lý vai trò');
    });

    it('should map admin.roles.view to Xem vai trò', () => {
      expect(getPermissionLabel('admin.roles.view')).toBe('Xem vai trò');
    });

    it('should map admin.permissions.manage to Quản lý quyền', () => {
      expect(getPermissionLabel('admin.permissions.manage')).toBe('Quản lý quyền');
    });

    it('should map admin.permissions.view to Xem quyền', () => {
      expect(getPermissionLabel('admin.permissions.view')).toBe('Xem quyền');
    });

    it('should map admin.apiKeys.manage to Quản lý khóa API', () => {
      expect(getPermissionLabel('admin.apiKeys.manage')).toBe('Quản lý khóa API');
    });

    it('should map admin.backups.manage to Quản lý sao lưu', () => {
      expect(getPermissionLabel('admin.backups.manage')).toBe('Quản lý sao lưu');
    });

    it('should map admin.config.manage to Quản lý cấu hình', () => {
      expect(getPermissionLabel('admin.config.manage')).toBe('Quản lý cấu hình');
    });

    it('should map admin.logs.view to Xem nhật ký', () => {
      expect(getPermissionLabel('admin.logs.view')).toBe('Xem nhật ký');
    });

    it('should return the code itself if mapping not found', () => {
      expect(getPermissionLabel('unknown.permission.code')).toBe('unknown.permission.code');
    });

    it('should return empty string for empty input', () => {
      expect(getPermissionLabel('')).toBe('');
    });

    it('should return empty string for null input', () => {
      expect(getPermissionLabel(null)).toBe('');
    });

    it('should return empty string for undefined input', () => {
      expect(getPermissionLabel(undefined)).toBe('');
    });

    it('should work for all 10 required permissions', () => {
      const requiredCodes = [
        'admin.apiKeys.manage',
        'admin.backups.manage',
        'admin.config.manage',
        'admin.logs.view',
        'admin.permissions.manage',
        'admin.permissions.view',
        'admin.roles.manage',
        'admin.roles.view',
        'admin.users.manage',
        'admin.users.view',
      ];

      requiredCodes.forEach((code) => {
        const label = getPermissionLabel(code);
        expect(label).toBeDefined();
        expect(typeof label).toBe('string');
        expect(label.length).toBeGreaterThan(0);
        expect(label).not.toBe(code);
      });
    });

    it('should be case-sensitive', () => {
      expect(getPermissionLabel('ADMIN.USERS.MANAGE')).toBe('ADMIN.USERS.MANAGE');
      expect(getPermissionLabel('Admin.Users.Manage')).toBe('Admin.Users.Manage');
    });
  });

  describe('getPermissionGroupLabel', () => {
    it('should return Người dùng for admin.users.manage', () => {
      expect(getPermissionGroupLabel('admin.users.manage')).toBe('Người dùng');
    });

    it('should return Người dùng for admin.users.view', () => {
      expect(getPermissionGroupLabel('admin.users.view')).toBe('Người dùng');
    });

    it('should return Vai trò for admin.roles.manage', () => {
      expect(getPermissionGroupLabel('admin.roles.manage')).toBe('Vai trò');
    });

    it('should return Vai trò for admin.roles.view', () => {
      expect(getPermissionGroupLabel('admin.roles.view')).toBe('Vai trò');
    });

    it('should return Quyền for admin.permissions.manage', () => {
      expect(getPermissionGroupLabel('admin.permissions.manage')).toBe('Quyền');
    });

    it('should return Quyền for admin.permissions.view', () => {
      expect(getPermissionGroupLabel('admin.permissions.view')).toBe('Quyền');
    });

    it('should return Khóa API for admin.apiKeys.manage', () => {
      expect(getPermissionGroupLabel('admin.apiKeys.manage')).toBe('Khóa API');
    });

    it('should return Sao lưu for admin.backups.manage', () => {
      expect(getPermissionGroupLabel('admin.backups.manage')).toBe('Sao lưu');
    });

    it('should return Cấu hình for admin.config.manage', () => {
      expect(getPermissionGroupLabel('admin.config.manage')).toBe('Cấu hình');
    });

    it('should return Nhật ký for admin.logs.view', () => {
      expect(getPermissionGroupLabel('admin.logs.view')).toBe('Nhật ký');
    });

    it('should return the prefix itself if group not found', () => {
      expect(getPermissionGroupLabel('unknown.permission.code')).toBe('unknown.permission');
    });

    it('should return empty string for empty input', () => {
      expect(getPermissionGroupLabel('')).toBe('');
    });

    it('should return empty string for null input', () => {
      expect(getPermissionGroupLabel(null)).toBe('');
    });

    it('should return empty string for undefined input', () => {
      expect(getPermissionGroupLabel(undefined)).toBe('');
    });

    it('should work for all 10 required permissions', () => {
      const requiredCodes = [
        'admin.apiKeys.manage',
        'admin.backups.manage',
        'admin.config.manage',
        'admin.logs.view',
        'admin.permissions.manage',
        'admin.permissions.view',
        'admin.roles.manage',
        'admin.roles.view',
        'admin.users.manage',
        'admin.users.view',
      ];

      requiredCodes.forEach((code) => {
        const groupLabel = getPermissionGroupLabel(code);
        expect(groupLabel).toBeDefined();
        expect(typeof groupLabel).toBe('string');
        expect(groupLabel.length).toBeGreaterThan(0);
      });
    });

    it('should be case-sensitive', () => {
      expect(getPermissionGroupLabel('ADMIN.USERS.MANAGE')).toBe('ADMIN.USERS');
      expect(getPermissionGroupLabel('Admin.Users.Manage')).toBe('Admin.Users');
    });
  });

  describe('getReversePermissionMapping', () => {
    it('should return admin.users.manage for Quản lý người dùng', () => {
      expect(getReversePermissionMapping('Quản lý người dùng')).toBe('admin.users.manage');
    });

    it('should return admin.users.view for Xem người dùng', () => {
      expect(getReversePermissionMapping('Xem người dùng')).toBe('admin.users.view');
    });

    it('should return admin.roles.manage for Quản lý vai trò', () => {
      expect(getReversePermissionMapping('Quản lý vai trò')).toBe('admin.roles.manage');
    });

    it('should return admin.roles.view for Xem vai trò', () => {
      expect(getReversePermissionMapping('Xem vai trò')).toBe('admin.roles.view');
    });

    it('should return admin.permissions.manage for Quản lý quyền', () => {
      expect(getReversePermissionMapping('Quản lý quyền')).toBe('admin.permissions.manage');
    });

    it('should return admin.permissions.view for Xem quyền', () => {
      expect(getReversePermissionMapping('Xem quyền')).toBe('admin.permissions.view');
    });

    it('should return admin.apiKeys.manage for Quản lý khóa API', () => {
      expect(getReversePermissionMapping('Quản lý khóa API')).toBe('admin.apiKeys.manage');
    });

    it('should return admin.backups.manage for Quản lý sao lưu', () => {
      expect(getReversePermissionMapping('Quản lý sao lưu')).toBe('admin.backups.manage');
    });

    it('should return admin.config.manage for Quản lý cấu hình', () => {
      expect(getReversePermissionMapping('Quản lý cấu hình')).toBe('admin.config.manage');
    });

    it('should return admin.logs.view for Xem nhật ký', () => {
      expect(getReversePermissionMapping('Xem nhật ký')).toBe('admin.logs.view');
    });

    it('should return undefined for unknown label', () => {
      expect(getReversePermissionMapping('Unknown Label')).toBeUndefined();
    });

    it('should return undefined for empty string', () => {
      expect(getReversePermissionMapping('')).toBeUndefined();
    });

    it('should return undefined for null', () => {
      expect(getReversePermissionMapping(null)).toBeUndefined();
    });

    it('should return undefined for undefined', () => {
      expect(getReversePermissionMapping(undefined)).toBeUndefined();
    });

    it('should be case-sensitive', () => {
      expect(getReversePermissionMapping('quản lý người dùng')).toBeUndefined();
      expect(getReversePermissionMapping('QUẢN LÝ NGƯỜI DÙNG')).toBeUndefined();
    });
  });

  describe('hasPermissionMapping', () => {
    it('should return true for admin.users.manage', () => {
      expect(hasPermissionMapping('admin.users.manage')).toBe(true);
    });

    it('should return true for admin.users.view', () => {
      expect(hasPermissionMapping('admin.users.view')).toBe(true);
    });

    it('should return true for all 10 required permissions', () => {
      const requiredCodes = [
        'admin.apiKeys.manage',
        'admin.backups.manage',
        'admin.config.manage',
        'admin.logs.view',
        'admin.permissions.manage',
        'admin.permissions.view',
        'admin.roles.manage',
        'admin.roles.view',
        'admin.users.manage',
        'admin.users.view',
      ];

      requiredCodes.forEach((code) => {
        expect(hasPermissionMapping(code)).toBe(true);
      });
    });

    it('should return false for unknown permission code', () => {
      expect(hasPermissionMapping('unknown.permission.code')).toBe(false);
    });

    it('should return false for empty string', () => {
      expect(hasPermissionMapping('')).toBe(false);
    });

    it('should return false for null', () => {
      expect(hasPermissionMapping(null)).toBe(false);
    });

    it('should return false for undefined', () => {
      expect(hasPermissionMapping(undefined)).toBe(false);
    });

    it('should be case-sensitive', () => {
      expect(hasPermissionMapping('ADMIN.USERS.MANAGE')).toBe(false);
      expect(hasPermissionMapping('Admin.Users.Manage')).toBe(false);
    });
  });

  describe('getAllPermissionCodes', () => {
    it('should return array of all permission codes', () => {
      const codes = getAllPermissionCodes();
      expect(Array.isArray(codes)).toBe(true);
      expect(codes).toHaveLength(10);
    });

    it('should contain all 10 required permission codes', () => {
      const codes = getAllPermissionCodes();
      const requiredCodes = [
        'admin.apiKeys.manage',
        'admin.backups.manage',
        'admin.config.manage',
        'admin.logs.view',
        'admin.permissions.manage',
        'admin.permissions.view',
        'admin.roles.manage',
        'admin.roles.view',
        'admin.users.manage',
        'admin.users.view',
      ];
      requiredCodes.forEach((code) => {
        expect(codes).toContain(code);
      });
    });
  });

  describe('getAllPermissionLabels', () => {
    it('should return array of all Vietnamese labels', () => {
      const labels = getAllPermissionLabels();
      expect(Array.isArray(labels)).toBe(true);
      expect(labels).toHaveLength(10);
    });

    it('should contain all Vietnamese descriptions', () => {
      const labels = getAllPermissionLabels();
      const expectedLabels = [
        'Quản lý khóa API',
        'Quản lý sao lưu',
        'Quản lý cấu hình',
        'Xem nhật ký',
        'Quản lý quyền',
        'Xem quyền',
        'Quản lý vai trò',
        'Xem vai trò',
        'Quản lý người dùng',
        'Xem người dùng',
      ];
      expectedLabels.forEach((label) => {
        expect(labels).toContain(label);
      });
    });
  });

  describe('getAllPermissionGroups', () => {
    it('should return array of all permission group labels', () => {
      const groups = getAllPermissionGroups();
      expect(Array.isArray(groups)).toBe(true);
      expect(groups).toHaveLength(7);
    });

    it('should contain all group labels', () => {
      const groups = getAllPermissionGroups();
      const expectedGroups = [
        'Khóa API',
        'Sao lưu',
        'Cấu hình',
        'Nhật ký',
        'Quyền',
        'Vai trò',
        'Người dùng',
      ];
      expectedGroups.forEach((group) => {
        expect(groups).toContain(group);
      });
    });
  });

  describe('getPermissionsByGroup', () => {
    it('should return permissions for admin.users group', () => {
      const permissions = getPermissionsByGroup('admin.users');
      expect(Array.isArray(permissions)).toBe(true);
      expect(permissions).toHaveLength(2);
      expect(permissions).toContainEqual({
        code: 'admin.users.manage',
        label: 'Quản lý người dùng',
      });
      expect(permissions).toContainEqual({
        code: 'admin.users.view',
        label: 'Xem người dùng',
      });
    });

    it('should return permissions for admin.roles group', () => {
      const permissions = getPermissionsByGroup('admin.roles');
      expect(permissions).toHaveLength(2);
      expect(permissions).toContainEqual({
        code: 'admin.roles.manage',
        label: 'Quản lý vai trò',
      });
      expect(permissions).toContainEqual({
        code: 'admin.roles.view',
        label: 'Xem vai trò',
      });
    });

    it('should return permissions for admin.permissions group', () => {
      const permissions = getPermissionsByGroup('admin.permissions');
      expect(permissions).toHaveLength(2);
    });

    it('should return empty array for non-existent group', () => {
      const permissions = getPermissionsByGroup('unknown.group');
      expect(Array.isArray(permissions)).toBe(true);
      expect(permissions).toHaveLength(0);
    });

    it('should return empty array for empty string', () => {
      const permissions = getPermissionsByGroup('');
      expect(Array.isArray(permissions)).toBe(true);
      expect(permissions).toHaveLength(0);
    });

    it('should return empty array for null', () => {
      const permissions = getPermissionsByGroup(null);
      expect(Array.isArray(permissions)).toBe(true);
      expect(permissions).toHaveLength(0);
    });

    it('should return empty array for undefined', () => {
      const permissions = getPermissionsByGroup(undefined);
      expect(Array.isArray(permissions)).toBe(true);
      expect(permissions).toHaveLength(0);
    });

    it('should return correct structure for all groups', () => {
      const groups = ['admin.apiKeys', 'admin.backups', 'admin.config', 'admin.logs', 'admin.permissions', 'admin.roles', 'admin.users'];
      groups.forEach((groupPrefix) => {
        const permissions = getPermissionsByGroup(groupPrefix);
        expect(Array.isArray(permissions)).toBe(true);
        permissions.forEach((perm) => {
          expect(perm).toHaveProperty('code');
          expect(perm).toHaveProperty('label');
          expect(typeof perm.code).toBe('string');
          expect(typeof perm.label).toBe('string');
        });
      });
    });
  });

  describe('getPermissionsByGroups', () => {
    it('should return object with group labels as keys', () => {
      const grouped = getPermissionsByGroups();
      expect(typeof grouped).toBe('object');
      expect(grouped).not.toBeNull();
    });

    it('should have all 7 groups as keys', () => {
      const grouped = getPermissionsByGroups();
      const expectedGroups = [
        'Khóa API',
        'Sao lưu',
        'Cấu hình',
        'Nhật ký',
        'Quyền',
        'Vai trò',
        'Người dùng',
      ];
      expectedGroups.forEach((group) => {
        expect(grouped).toHaveProperty(group);
      });
    });

    it('should have correct permissions for each group', () => {
      const grouped = getPermissionsByGroups();
      
      expect(grouped['Người dùng']).toHaveLength(2);
      expect(grouped['Vai trò']).toHaveLength(2);
      expect(grouped['Quyền']).toHaveLength(2);
      expect(grouped['Khóa API']).toHaveLength(1);
      expect(grouped['Sao lưu']).toHaveLength(1);
      expect(grouped['Cấu hình']).toHaveLength(1);
      expect(grouped['Nhật ký']).toHaveLength(1);
    });

    it('should have correct structure for all permissions', () => {
      const grouped = getPermissionsByGroups();
      Object.values(grouped).forEach((permissions) => {
        expect(Array.isArray(permissions)).toBe(true);
        permissions.forEach((perm) => {
          expect(perm).toHaveProperty('code');
          expect(perm).toHaveProperty('label');
          expect(typeof perm.code).toBe('string');
          expect(typeof perm.label).toBe('string');
        });
      });
    });

    it('should contain all 10 permissions across all groups', () => {
      const grouped = getPermissionsByGroups();
      const allPermissions = Object.values(grouped).flat();
      expect(allPermissions).toHaveLength(10);
    });
  });

  describe('Bidirectional Mapping Consistency', () => {
    it('should maintain consistency between forward and reverse mappings', () => {
      const requiredCodes = [
        'admin.apiKeys.manage',
        'admin.backups.manage',
        'admin.config.manage',
        'admin.logs.view',
        'admin.permissions.manage',
        'admin.permissions.view',
        'admin.roles.manage',
        'admin.roles.view',
        'admin.users.manage',
        'admin.users.view',
      ];

      requiredCodes.forEach((code) => {
        const label = getPermissionLabel(code);
        const reverseMapped = getReversePermissionMapping(label);
        expect(reverseMapped).toBe(code);
        
        // Round-trip consistency
        const roundTrip = getPermissionLabel(reverseMapped);
        expect(roundTrip).toBe(label);
      });
    });
  });

  describe('Server-side Usage', () => {
    it('should work without React context', () => {
      // These functions should work in server components without React
      const label = getPermissionLabel('admin.users.manage');
      expect(label).toBe('Quản lý người dùng');
    });

    it('should be importable as a module', () => {
      expect(typeof getPermissionLabel).toBe('function');
      expect(typeof getPermissionGroupLabel).toBe('function');
      expect(typeof getReversePermissionMapping).toBe('function');
      expect(typeof hasPermissionMapping).toBe('function');
      expect(typeof getAllPermissionCodes).toBe('function');
      expect(typeof getAllPermissionLabels).toBe('function');
      expect(typeof getAllPermissionGroups).toBe('function');
      expect(typeof getPermissionsByGroup).toBe('function');
      expect(typeof getPermissionsByGroups).toBe('function');
    });

    it('should handle multiple calls without state issues', () => {
      const label1 = getPermissionLabel('admin.users.manage');
      const label2 = getPermissionLabel('admin.roles.view');
      const label3 = getPermissionLabel('admin.users.manage');
      
      expect(label1).toBe('Quản lý người dùng');
      expect(label2).toBe('Xem vai trò');
      expect(label3).toBe('Quản lý người dùng');
      expect(label1).toBe(label3);
    });
  });

  describe('Property 3: Permission Codes Map to Vietnamese Descriptions', () => {
    it('should map all permission codes to Vietnamese descriptions', () => {
      const requiredCodes = [
        'admin.apiKeys.manage',
        'admin.backups.manage',
        'admin.config.manage',
        'admin.logs.view',
        'admin.permissions.manage',
        'admin.permissions.view',
        'admin.roles.manage',
        'admin.roles.view',
        'admin.users.manage',
        'admin.users.view',
      ];

      requiredCodes.forEach((code) => {
        const label = getPermissionLabel(code);
        // Label should not be the code itself
        expect(label).not.toBe(code);
        // Label should be a non-empty string
        expect(typeof label).toBe('string');
        expect(label.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Property 5.2: Permission Display Uses Vietnamese While Authorization Uses Technical Codes', () => {
    it('should display Vietnamese while maintaining technical code for authorization', () => {
      const technicalCode = 'admin.users.manage';
      const vietnameseLabel = getPermissionLabel(technicalCode);
      
      // Display should be Vietnamese
      expect(vietnameseLabel).toBe('Quản lý người dùng');
      
      // Technical code should be preserved
      expect(technicalCode).toBe('admin.users.manage');
      
      // Reverse mapping should work
      expect(getReversePermissionMapping(vietnameseLabel)).toBe(technicalCode);
    });
  });
});
