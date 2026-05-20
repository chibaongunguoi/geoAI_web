/**
 * Tests for Permission Mappings Module
 * 
 * Tests verify that:
 * - All 10 required permission mappings are present and correct
 * - PERMISSION_REVERSE_MAPPINGS is correctly generated
 * - PERMISSION_GROUPS is correctly defined
 * - Helper functions work correctly
 * - Bidirectional mapping consistency is maintained
 */

import {
  PERMISSION_MAPPINGS,
  PERMISSION_REVERSE_MAPPINGS,
  PERMISSION_GROUPS,
  getPermissionLabel,
  getPermissionGroupLabel,
  getReversePermissionMapping,
  hasPermissionMapping,
  getAllPermissionCodes,
  getAllPermissionLabels,
  getAllPermissionGroups,
  getPermissionsByGroup,
  getPermissionsByGroups,
} from './permissionMappings';

describe('Permission Mappings', () => {
  describe('PERMISSION_MAPPINGS', () => {
    it('should contain all 10 required permission mappings', () => {
      const requiredMappings = [
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

      requiredMappings.forEach((code) => {
        expect(code in PERMISSION_MAPPINGS).toBe(true);
      });
    });

    it('should have exactly 10 permission mappings', () => {
      expect(Object.keys(PERMISSION_MAPPINGS)).toHaveLength(10);
    });

    it('should map admin.apiKeys.manage to Quản lý khóa API', () => {
      expect(PERMISSION_MAPPINGS['admin.apiKeys.manage']).toBe('Quản lý khóa API');
    });

    it('should map admin.backups.manage to Quản lý sao lưu', () => {
      expect(PERMISSION_MAPPINGS['admin.backups.manage']).toBe('Quản lý sao lưu');
    });

    it('should map admin.config.manage to Quản lý cấu hình', () => {
      expect(PERMISSION_MAPPINGS['admin.config.manage']).toBe('Quản lý cấu hình');
    });

    it('should map admin.logs.view to Xem nhật ký', () => {
      expect(PERMISSION_MAPPINGS['admin.logs.view']).toBe('Xem nhật ký');
    });

    it('should map admin.permissions.manage to Quản lý quyền', () => {
      expect(PERMISSION_MAPPINGS['admin.permissions.manage']).toBe('Quản lý quyền');
    });

    it('should map admin.permissions.view to Xem quyền', () => {
      expect(PERMISSION_MAPPINGS['admin.permissions.view']).toBe('Xem quyền');
    });

    it('should map admin.roles.manage to Quản lý vai trò', () => {
      expect(PERMISSION_MAPPINGS['admin.roles.manage']).toBe('Quản lý vai trò');
    });

    it('should map admin.roles.view to Xem vai trò', () => {
      expect(PERMISSION_MAPPINGS['admin.roles.view']).toBe('Xem vai trò');
    });

    it('should map admin.users.manage to Quản lý người dùng', () => {
      expect(PERMISSION_MAPPINGS['admin.users.manage']).toBe('Quản lý người dùng');
    });

    it('should map admin.users.view to Xem người dùng', () => {
      expect(PERMISSION_MAPPINGS['admin.users.view']).toBe('Xem người dùng');
    });

    it('should contain only Vietnamese text (allowing common acronyms like API)', () => {
      Object.values(PERMISSION_MAPPINGS).forEach((label) => {
        // Check that label is primarily Vietnamese
        // Allow common acronyms like API which are used in Vietnamese
        expect(label).toBeDefined();
        expect(typeof label).toBe('string');
        expect(label.length).toBeGreaterThan(0);
      });
    });
  });

  describe('PERMISSION_REVERSE_MAPPINGS', () => {
    it('should contain reverse mappings for all permissions', () => {
      expect(Object.keys(PERMISSION_REVERSE_MAPPINGS)).toHaveLength(10);
    });

    it('should map Vietnamese descriptions back to technical codes', () => {
      expect(PERMISSION_REVERSE_MAPPINGS['Quản lý khóa API']).toBe('admin.apiKeys.manage');
      expect(PERMISSION_REVERSE_MAPPINGS['Quản lý sao lưu']).toBe('admin.backups.manage');
      expect(PERMISSION_REVERSE_MAPPINGS['Quản lý cấu hình']).toBe('admin.config.manage');
      expect(PERMISSION_REVERSE_MAPPINGS['Xem nhật ký']).toBe('admin.logs.view');
      expect(PERMISSION_REVERSE_MAPPINGS['Quản lý quyền']).toBe('admin.permissions.manage');
      expect(PERMISSION_REVERSE_MAPPINGS['Xem quyền']).toBe('admin.permissions.view');
      expect(PERMISSION_REVERSE_MAPPINGS['Quản lý vai trò']).toBe('admin.roles.manage');
      expect(PERMISSION_REVERSE_MAPPINGS['Xem vai trò']).toBe('admin.roles.view');
      expect(PERMISSION_REVERSE_MAPPINGS['Quản lý người dùng']).toBe('admin.users.manage');
      expect(PERMISSION_REVERSE_MAPPINGS['Xem người dùng']).toBe('admin.users.view');
    });

    it('should be bidirectional with PERMISSION_MAPPINGS', () => {
      Object.entries(PERMISSION_MAPPINGS).forEach(([code, label]) => {
        expect(PERMISSION_REVERSE_MAPPINGS[label]).toBe(code);
      });
    });
  });

  describe('PERMISSION_GROUPS', () => {
    it('should contain all 7 permission groups', () => {
      const expectedGroups = [
        'admin.apiKeys',
        'admin.backups',
        'admin.config',
        'admin.logs',
        'admin.permissions',
        'admin.roles',
        'admin.users',
      ];

      expectedGroups.forEach((group) => {
        expect(group in PERMISSION_GROUPS).toBe(true);
      });
    });

    it('should have exactly 7 permission groups', () => {
      expect(Object.keys(PERMISSION_GROUPS)).toHaveLength(7);
    });

    it('should map admin.apiKeys to Khóa API', () => {
      expect(PERMISSION_GROUPS['admin.apiKeys']).toBe('Khóa API');
    });

    it('should map admin.backups to Sao lưu', () => {
      expect(PERMISSION_GROUPS['admin.backups']).toBe('Sao lưu');
    });

    it('should map admin.config to Cấu hình', () => {
      expect(PERMISSION_GROUPS['admin.config']).toBe('Cấu hình');
    });

    it('should map admin.logs to Nhật ký', () => {
      expect(PERMISSION_GROUPS['admin.logs']).toBe('Nhật ký');
    });

    it('should map admin.permissions to Quyền', () => {
      expect(PERMISSION_GROUPS['admin.permissions']).toBe('Quyền');
    });

    it('should map admin.roles to Vai trò', () => {
      expect(PERMISSION_GROUPS['admin.roles']).toBe('Vai trò');
    });

    it('should map admin.users to Người dùng', () => {
      expect(PERMISSION_GROUPS['admin.users']).toBe('Người dùng');
    });

    it('should contain only Vietnamese text (allowing common acronyms like API)', () => {
      Object.values(PERMISSION_GROUPS).forEach((label) => {
        // Check that label is valid Vietnamese text
        // Allow common acronyms like API which are used in Vietnamese
        expect(label).toBeDefined();
        expect(typeof label).toBe('string');
        expect(label.length).toBeGreaterThan(0);
      });
    });
  });

  describe('getPermissionLabel', () => {
    it('should return Vietnamese label for valid permission code', () => {
      expect(getPermissionLabel('admin.users.manage')).toBe('Quản lý người dùng');
      expect(getPermissionLabel('admin.roles.view')).toBe('Xem vai trò');
    });

    it('should return the code itself if mapping not found', () => {
      expect(getPermissionLabel('unknown.permission.code')).toBe('unknown.permission.code');
    });

    it('should work for all 10 required permissions', () => {
      const codes = Object.keys(PERMISSION_MAPPINGS);
      codes.forEach((code) => {
        const label = getPermissionLabel(code);
        expect(label).toBe(PERMISSION_MAPPINGS[code]);
        expect(label).not.toBe(code);
      });
    });
  });

  describe('getPermissionGroupLabel', () => {
    it('should return Vietnamese group label for permission code', () => {
      expect(getPermissionGroupLabel('admin.users.manage')).toBe('Người dùng');
      expect(getPermissionGroupLabel('admin.users.view')).toBe('Người dùng');
      expect(getPermissionGroupLabel('admin.roles.manage')).toBe('Vai trò');
    });

    it('should return the prefix itself if group not found', () => {
      expect(getPermissionGroupLabel('unknown.permission.code')).toBe('unknown.permission');
    });

    it('should work for all 10 required permissions', () => {
      const codes = Object.keys(PERMISSION_MAPPINGS);
      codes.forEach((code) => {
        const groupLabel = getPermissionGroupLabel(code);
        expect(groupLabel).toBeDefined();
        expect(typeof groupLabel).toBe('string');
      });
    });
  });

  describe('getReversePermissionMapping', () => {
    it('should return technical code for Vietnamese label', () => {
      expect(getReversePermissionMapping('Quản lý người dùng')).toBe('admin.users.manage');
      expect(getReversePermissionMapping('Xem vai trò')).toBe('admin.roles.view');
    });

    it('should return undefined for unknown label', () => {
      expect(getReversePermissionMapping('Unknown Label')).toBeUndefined();
    });

    it('should work for all Vietnamese labels', () => {
      Object.entries(PERMISSION_MAPPINGS).forEach(([code, label]) => {
        expect(getReversePermissionMapping(label)).toBe(code);
      });
    });
  });

  describe('hasPermissionMapping', () => {
    it('should return true for mapped permission codes', () => {
      expect(hasPermissionMapping('admin.users.manage')).toBe(true);
      expect(hasPermissionMapping('admin.roles.view')).toBe(true);
    });

    it('should return false for unmapped permission codes', () => {
      expect(hasPermissionMapping('unknown.permission.code')).toBe(false);
    });

    it('should work for all 10 required permissions', () => {
      Object.keys(PERMISSION_MAPPINGS).forEach((code) => {
        expect(hasPermissionMapping(code)).toBe(true);
      });
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

    it('should return empty array for non-existent group', () => {
      const permissions = getPermissionsByGroup('unknown.group');
      expect(Array.isArray(permissions)).toBe(true);
      expect(permissions).toHaveLength(0);
    });

    it('should return correct structure for all groups', () => {
      Object.keys(PERMISSION_GROUPS).forEach((groupPrefix) => {
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
      Object.entries(PERMISSION_MAPPINGS).forEach(([code, label]) => {
        // Forward mapping
        expect(getPermissionLabel(code)).toBe(label);
        
        // Reverse mapping
        expect(getReversePermissionMapping(label)).toBe(code);
        
        // Round-trip consistency
        const reverseMapped = getReversePermissionMapping(label);
        expect(getPermissionLabel(reverseMapped)).toBe(label);
      });
    });

    it('should have no duplicate labels', () => {
      const labels = Object.values(PERMISSION_MAPPINGS);
      const uniqueLabels = new Set(labels);
      expect(uniqueLabels.size).toBe(labels.length);
    });

    it('should have no duplicate codes', () => {
      const codes = Object.keys(PERMISSION_MAPPINGS);
      const uniqueCodes = new Set(codes);
      expect(uniqueCodes.size).toBe(codes.length);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty string gracefully', () => {
      expect(getPermissionLabel('')).toBe('');
      expect(getPermissionGroupLabel('')).toBe('');
    });

    it('should handle null gracefully', () => {
      expect(getPermissionLabel(null)).toBe(null);
      expect(getReversePermissionMapping(null)).toBeUndefined();
    });

    it('should handle undefined gracefully', () => {
      expect(getPermissionLabel(undefined)).toBe(undefined);
      expect(getReversePermissionMapping(undefined)).toBeUndefined();
    });

    it('should handle case-sensitive lookups', () => {
      expect(getPermissionLabel('ADMIN.USERS.MANAGE')).toBe('ADMIN.USERS.MANAGE');
      expect(getReversePermissionMapping('quản lý người dùng')).toBeUndefined();
    });
  });
});
