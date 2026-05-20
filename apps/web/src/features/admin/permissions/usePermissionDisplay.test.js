/**
 * Tests for usePermissionDisplay React Hook
 * 
 * Tests verify that:
 * - getLabel() function maps permission codes to Vietnamese descriptions
 * - getGroupLabel() function returns correct permission group labels
 * - Fallback behavior works correctly (returns code if mapping not found)
 * - Hook returns correct object structure
 * - All required permission codes have correct mappings
 * 
 * **Validates: Requirements 2.1, 2.3**
 */

import { renderHook } from '@testing-library/react';
import { usePermissionDisplay } from './usePermissionDisplay';
import { PERMISSION_MAPPINGS, PERMISSION_GROUPS } from './permissionMappings';

describe('usePermissionDisplay Hook', () => {
  describe('Hook Structure', () => {
    it('should return an object with getLabel and getGroupLabel functions', () => {
      const { result } = renderHook(() => usePermissionDisplay());
      
      expect(result.current).toHaveProperty('getLabel');
      expect(result.current).toHaveProperty('getGroupLabel');
      expect(typeof result.current.getLabel).toBe('function');
      expect(typeof result.current.getGroupLabel).toBe('function');
    });

    it('should return consistent object structure on multiple calls', () => {
      const { result: result1 } = renderHook(() => usePermissionDisplay());
      const { result: result2 } = renderHook(() => usePermissionDisplay());
      
      expect(result1.current).toHaveProperty('getLabel');
      expect(result1.current).toHaveProperty('getGroupLabel');
      expect(result2.current).toHaveProperty('getLabel');
      expect(result2.current).toHaveProperty('getGroupLabel');
    });
  });

  describe('getLabel Function', () => {
    it('should map admin.apiKeys.manage to Quản lý khóa API', () => {
      const { result } = renderHook(() => usePermissionDisplay());
      expect(result.current.getLabel('admin.apiKeys.manage')).toBe('Quản lý khóa API');
    });

    it('should map admin.backups.manage to Quản lý sao lưu', () => {
      const { result } = renderHook(() => usePermissionDisplay());
      expect(result.current.getLabel('admin.backups.manage')).toBe('Quản lý sao lưu');
    });

    it('should map admin.config.manage to Quản lý cấu hình', () => {
      const { result } = renderHook(() => usePermissionDisplay());
      expect(result.current.getLabel('admin.config.manage')).toBe('Quản lý cấu hình');
    });

    it('should map admin.logs.view to Xem nhật ký', () => {
      const { result } = renderHook(() => usePermissionDisplay());
      expect(result.current.getLabel('admin.logs.view')).toBe('Xem nhật ký');
    });

    it('should map admin.permissions.manage to Quản lý quyền', () => {
      const { result } = renderHook(() => usePermissionDisplay());
      expect(result.current.getLabel('admin.permissions.manage')).toBe('Quản lý quyền');
    });

    it('should map admin.permissions.view to Xem quyền', () => {
      const { result } = renderHook(() => usePermissionDisplay());
      expect(result.current.getLabel('admin.permissions.view')).toBe('Xem quyền');
    });

    it('should map admin.roles.manage to Quản lý vai trò', () => {
      const { result } = renderHook(() => usePermissionDisplay());
      expect(result.current.getLabel('admin.roles.manage')).toBe('Quản lý vai trò');
    });

    it('should map admin.roles.view to Xem vai trò', () => {
      const { result } = renderHook(() => usePermissionDisplay());
      expect(result.current.getLabel('admin.roles.view')).toBe('Xem vai trò');
    });

    it('should map admin.users.manage to Quản lý người dùng', () => {
      const { result } = renderHook(() => usePermissionDisplay());
      expect(result.current.getLabel('admin.users.manage')).toBe('Quản lý người dùng');
    });

    it('should map admin.users.view to Xem người dùng', () => {
      const { result } = renderHook(() => usePermissionDisplay());
      expect(result.current.getLabel('admin.users.view')).toBe('Xem người dùng');
    });

    it('should work for all 10 required permission codes', () => {
      const { result } = renderHook(() => usePermissionDisplay());
      
      Object.entries(PERMISSION_MAPPINGS).forEach(([code, expectedLabel]) => {
        const label = result.current.getLabel(code);
        expect(label).toBe(expectedLabel);
        expect(label).not.toBe(code);
      });
    });

    it('should return Vietnamese descriptions (not technical codes)', () => {
      const { result } = renderHook(() => usePermissionDisplay());
      
      Object.keys(PERMISSION_MAPPINGS).forEach((code) => {
        const label = result.current.getLabel(code);
        expect(label).not.toBe(code);
        expect(label).not.toMatch(/^admin\./);
      });
    });

    it('should implement fallback behavior - return code if mapping not found', () => {
      const { result } = renderHook(() => usePermissionDisplay());
      
      const unknownCode = 'unknown.permission.code';
      expect(result.current.getLabel(unknownCode)).toBe(unknownCode);
    });

    it('should implement fallback behavior for various unknown codes', () => {
      const { result } = renderHook(() => usePermissionDisplay());
      
      const unknownCodes = [
        'unknown.permission',
        'admin.unknown.manage',
        'custom.permission.code',
        'test.code',
      ];
      
      unknownCodes.forEach((code) => {
        expect(result.current.getLabel(code)).toBe(code);
      });
    });

    it('should handle empty string gracefully', () => {
      const { result } = renderHook(() => usePermissionDisplay());
      expect(result.current.getLabel('')).toBe('');
    });

    it('should handle case-sensitive lookups', () => {
      const { result } = renderHook(() => usePermissionDisplay());
      
      // Uppercase version should not match
      expect(result.current.getLabel('ADMIN.USERS.MANAGE')).toBe('ADMIN.USERS.MANAGE');
      
      // Mixed case should not match
      expect(result.current.getLabel('Admin.Users.Manage')).toBe('Admin.Users.Manage');
    });
  });

  describe('getGroupLabel Function', () => {
    it('should return Người dùng for admin.users permissions', () => {
      const { result } = renderHook(() => usePermissionDisplay());
      
      expect(result.current.getGroupLabel('admin.users.manage')).toBe('Người dùng');
      expect(result.current.getGroupLabel('admin.users.view')).toBe('Người dùng');
    });

    it('should return Vai trò for admin.roles permissions', () => {
      const { result } = renderHook(() => usePermissionDisplay());
      
      expect(result.current.getGroupLabel('admin.roles.manage')).toBe('Vai trò');
      expect(result.current.getGroupLabel('admin.roles.view')).toBe('Vai trò');
    });

    it('should return Quyền for admin.permissions permissions', () => {
      const { result } = renderHook(() => usePermissionDisplay());
      
      expect(result.current.getGroupLabel('admin.permissions.manage')).toBe('Quyền');
      expect(result.current.getGroupLabel('admin.permissions.view')).toBe('Quyền');
    });

    it('should return Khóa API for admin.apiKeys permissions', () => {
      const { result } = renderHook(() => usePermissionDisplay());
      expect(result.current.getGroupLabel('admin.apiKeys.manage')).toBe('Khóa API');
    });

    it('should return Sao lưu for admin.backups permissions', () => {
      const { result } = renderHook(() => usePermissionDisplay());
      expect(result.current.getGroupLabel('admin.backups.manage')).toBe('Sao lưu');
    });

    it('should return Cấu hình for admin.config permissions', () => {
      const { result } = renderHook(() => usePermissionDisplay());
      expect(result.current.getGroupLabel('admin.config.manage')).toBe('Cấu hình');
    });

    it('should return Nhật ký for admin.logs permissions', () => {
      const { result } = renderHook(() => usePermissionDisplay());
      expect(result.current.getGroupLabel('admin.logs.view')).toBe('Nhật ký');
    });

    it('should work for all 10 required permission codes', () => {
      const { result } = renderHook(() => usePermissionDisplay());
      
      Object.keys(PERMISSION_MAPPINGS).forEach((code) => {
        const groupLabel = result.current.getGroupLabel(code);
        expect(groupLabel).toBeDefined();
        expect(typeof groupLabel).toBe('string');
        expect(groupLabel.length).toBeGreaterThan(0);
      });
    });

    it('should return Vietnamese group labels (not technical prefixes)', () => {
      const { result } = renderHook(() => usePermissionDisplay());
      
      Object.keys(PERMISSION_MAPPINGS).forEach((code) => {
        const groupLabel = result.current.getGroupLabel(code);
        const prefix = code.split('.').slice(0, -1).join('.');
        
        // If it's a known group, should be Vietnamese
        if (prefix in PERMISSION_GROUPS) {
          expect(groupLabel).not.toBe(prefix);
        }
      });
    });

    it('should implement fallback behavior - return prefix if group not found', () => {
      const { result } = renderHook(() => usePermissionDisplay());
      
      const unknownCode = 'unknown.permission.code';
      expect(result.current.getGroupLabel(unknownCode)).toBe('unknown.permission');
    });

    it('should implement fallback behavior for various unknown codes', () => {
      const { result } = renderHook(() => usePermissionDisplay());
      
      expect(result.current.getGroupLabel('custom.permission.code')).toBe('custom.permission');
      expect(result.current.getGroupLabel('test.code.action')).toBe('test.code');
      expect(result.current.getGroupLabel('single')).toBe('');
    });

    it('should handle empty string gracefully', () => {
      const { result } = renderHook(() => usePermissionDisplay());
      expect(result.current.getGroupLabel('')).toBe('');
    });

    it('should handle case-sensitive lookups', () => {
      const { result } = renderHook(() => usePermissionDisplay());
      
      // Uppercase version should not match group
      expect(result.current.getGroupLabel('ADMIN.USERS.MANAGE')).toBe('ADMIN.USERS');
      
      // Mixed case should not match group
      expect(result.current.getGroupLabel('Admin.Users.Manage')).toBe('Admin.Users');
    });
  });

  describe('Integration Tests', () => {
    it('should provide consistent results across multiple calls', () => {
      const { result } = renderHook(() => usePermissionDisplay());
      
      const code = 'admin.users.manage';
      const label1 = result.current.getLabel(code);
      const label2 = result.current.getLabel(code);
      
      expect(label1).toBe(label2);
    });

    it('should work correctly for permission display workflow', () => {
      const { result } = renderHook(() => usePermissionDisplay());
      
      // Simulate displaying a permission in the UI
      const permissionCode = 'admin.users.manage';
      const label = result.current.getLabel(permissionCode);
      const groupLabel = result.current.getGroupLabel(permissionCode);
      
      expect(label).toBe('Quản lý người dùng');
      expect(groupLabel).toBe('Người dùng');
    });

    it('should handle multiple permissions in sequence', () => {
      const { result } = renderHook(() => usePermissionDisplay());
      
      const permissions = [
        'admin.users.manage',
        'admin.roles.view',
        'admin.permissions.manage',
      ];
      
      permissions.forEach((code) => {
        const label = result.current.getLabel(code);
        const groupLabel = result.current.getGroupLabel(code);
        
        expect(label).toBeDefined();
        expect(groupLabel).toBeDefined();
        expect(label).not.toBe(code);
      });
    });

    it('should maintain separation between getLabel and getGroupLabel', () => {
      const { result } = renderHook(() => usePermissionDisplay());
      
      const code = 'admin.users.manage';
      const label = result.current.getLabel(code);
      const groupLabel = result.current.getGroupLabel(code);
      
      // Label should be specific permission description
      expect(label).toBe('Quản lý người dùng');
      
      // Group label should be broader category
      expect(groupLabel).toBe('Người dùng');
      
      // They should be different
      expect(label).not.toBe(groupLabel);
    });
  });

  describe('Property 3: Permission Codes Map to Vietnamese Descriptions', () => {
    it('should map all permission codes to Vietnamese descriptions', () => {
      const { result } = renderHook(() => usePermissionDisplay());
      
      Object.keys(PERMISSION_MAPPINGS).forEach((code) => {
        const label = result.current.getLabel(code);
        
        // Should return a label
        expect(label).toBeDefined();
        
        // Should not return the code itself
        expect(label).not.toBe(code);
        
        // Should be Vietnamese (not English)
        expect(label).not.toMatch(/^admin\./);
      });
    });
  });

  describe('Property 4: Permission Mappings Are Correct and Consistent', () => {
    it('should maintain consistent mappings across calls', () => {
      const { result: result1 } = renderHook(() => usePermissionDisplay());
      const { result: result2 } = renderHook(() => usePermissionDisplay());
      
      const code = 'admin.users.manage';
      const label1 = result1.current.getLabel(code);
      const label2 = result2.current.getLabel(code);
      
      expect(label1).toBe(label2);
    });

    it('should have consistent group labels for same permission group', () => {
      const { result } = renderHook(() => usePermissionDisplay());
      
      const userPermissions = [
        'admin.users.manage',
        'admin.users.view',
      ];
      
      const groupLabels = userPermissions.map((code) =>
        result.current.getGroupLabel(code)
      );
      
      // All should have the same group label
      expect(groupLabels[0]).toBe(groupLabels[1]);
      expect(groupLabels[0]).toBe('Người dùng');
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle null gracefully', () => {
      const { result } = renderHook(() => usePermissionDisplay());
      
      expect(result.current.getLabel(null)).toBe(null);
      expect(result.current.getGroupLabel(null)).toBe('');
    });

    it('should handle undefined gracefully', () => {
      const { result } = renderHook(() => usePermissionDisplay());
      
      expect(result.current.getLabel(undefined)).toBe(undefined);
      expect(result.current.getGroupLabel(undefined)).toBe('');
    });

    it('should handle special characters in unknown codes', () => {
      const { result } = renderHook(() => usePermissionDisplay());
      
      const specialCodes = [
        'admin.users@manage',
        'admin.users#manage',
        'admin.users$manage',
      ];
      
      specialCodes.forEach((code) => {
        expect(result.current.getLabel(code)).toBe(code);
      });
    });

    it('should handle very long permission codes', () => {
      const { result } = renderHook(() => usePermissionDisplay());
      
      const longCode = 'admin.users.manage.very.long.permission.code';
      expect(result.current.getLabel(longCode)).toBe(longCode);
      expect(result.current.getGroupLabel(longCode)).toBe('admin.users.manage.very.long.permission');
    });

    it('should handle permission codes with numbers', () => {
      const { result } = renderHook(() => usePermissionDisplay());
      
      const codeWithNumbers = 'admin.users2.manage';
      expect(result.current.getLabel(codeWithNumbers)).toBe(codeWithNumbers);
    });
  });

  describe('Performance Considerations', () => {
    it('should return results quickly for known permission codes', () => {
      const { result } = renderHook(() => usePermissionDisplay());
      
      const startTime = performance.now();
      
      for (let i = 0; i < 1000; i++) {
        result.current.getLabel('admin.users.manage');
      }
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      // Should complete 1000 calls in less than 100ms
      expect(duration).toBeLessThan(100);
    });

    it('should return results quickly for unknown permission codes', () => {
      const { result } = renderHook(() => usePermissionDisplay());
      
      const startTime = performance.now();
      
      for (let i = 0; i < 1000; i++) {
        result.current.getLabel('unknown.permission.code');
      }
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      // Should complete 1000 calls in less than 100ms
      expect(duration).toBeLessThan(100);
    });
  });
});
