/**
 * Permission Utilities Tests
 * 
 * Tests for utility functions that filter, group, organize, and transform permissions.
 * Validates that all helper functions work correctly with permission data.
 */

import {
  filterPermissionsByQuery,
  filterPermissionsByGroup,
  filterPermissionsByAction,
  filterPermissionsByCategory,
  filterMappedPermissions,
  filterUnmappedPermissions,
  groupPermissionsByGroup,
  groupPermissionsByAction,
  groupPermissionsByCategory,
  sortPermissionsByLabel,
  sortPermissionsByCode,
  organizePermissionsForMatrix,
  organizePermissionsForList,
  organizePermissionsForTree,
  transformPermissionsWithLabels,
  transformPermissionsWithGroups,
  validatePermissionMappings,
  getPermissionStatistics,
  comparePermissions,
  mergePermissions,
  intersectPermissions,
  differencePermissions,
  hasAllPermissions,
  hasAnyPermission,
  deduplicatePermissions,
  paginatePermissions,
} from './permissionUtils';

describe('Permission Utilities', () => {
  const testPermissions = [
    'admin.users.manage',
    'admin.users.view',
    'admin.roles.manage',
    'admin.roles.view',
    'admin.backups.manage',
    'admin.logs.view',
  ];

  describe('filterPermissionsByQuery', () => {
    it('should filter permissions by Vietnamese label query', () => {
      const result = filterPermissionsByQuery(testPermissions, 'người');
      expect(result).toContain('admin.users.manage');
      expect(result).toContain('admin.users.view');
      expect(result).not.toContain('admin.roles.manage');
    });

    it('should filter permissions by code query', () => {
      const result = filterPermissionsByQuery(testPermissions, 'admin.users');
      expect(result).toContain('admin.users.manage');
      expect(result).toContain('admin.users.view');
      expect(result).not.toContain('admin.roles.manage');
    });

    it('should be case-insensitive', () => {
      const result = filterPermissionsByQuery(testPermissions, 'NGƯỜI');
      expect(result).toContain('admin.users.manage');
    });

    it('should return all permissions for empty query', () => {
      const result = filterPermissionsByQuery(testPermissions, '');
      expect(result).toEqual(testPermissions);
    });

    it('should return empty array for non-matching query', () => {
      const result = filterPermissionsByQuery(testPermissions, 'nonexistent');
      expect(result).toEqual([]);
    });
  });

  describe('filterPermissionsByGroup', () => {
    it('should filter permissions by group prefix', () => {
      const result = filterPermissionsByGroup(testPermissions, 'admin.users');
      expect(result).toContain('admin.users.manage');
      expect(result).toContain('admin.users.view');
      expect(result).not.toContain('admin.roles.manage');
    });

    it('should return empty array for non-matching group', () => {
      const result = filterPermissionsByGroup(testPermissions, 'admin.nonexistent');
      expect(result).toEqual([]);
    });
  });

  describe('filterPermissionsByAction', () => {
    it('should filter permissions by action', () => {
      const result = filterPermissionsByAction(testPermissions, 'manage');
      expect(result).toContain('admin.users.manage');
      expect(result).toContain('admin.roles.manage');
      expect(result).not.toContain('admin.users.view');
    });

    it('should filter view permissions', () => {
      const result = filterPermissionsByAction(testPermissions, 'view');
      expect(result).toContain('admin.users.view');
      expect(result).toContain('admin.roles.view');
      expect(result).not.toContain('admin.users.manage');
    });
  });

  describe('filterPermissionsByCategory', () => {
    it('should filter permissions by category', () => {
      const result = filterPermissionsByCategory(testPermissions, 'admin');
      expect(result).toEqual(testPermissions);
    });

    it('should return empty array for non-matching category', () => {
      const result = filterPermissionsByCategory(testPermissions, 'user');
      expect(result).toEqual([]);
    });
  });

  describe('filterMappedPermissions', () => {
    it('should return only mapped permissions', () => {
      const permissions = ['admin.users.manage', 'custom.permission', 'admin.roles.manage'];
      const result = filterMappedPermissions(permissions);
      expect(result).toContain('admin.users.manage');
      expect(result).toContain('admin.roles.manage');
      expect(result).not.toContain('custom.permission');
    });

    it('should return all permissions if all are mapped', () => {
      const result = filterMappedPermissions(testPermissions);
      expect(result).toEqual(testPermissions);
    });
  });

  describe('filterUnmappedPermissions', () => {
    it('should return only unmapped permissions', () => {
      const permissions = ['admin.users.manage', 'custom.permission', 'admin.roles.manage'];
      const result = filterUnmappedPermissions(permissions);
      expect(result).toEqual(['custom.permission']);
    });

    it('should return empty array if all are mapped', () => {
      const result = filterUnmappedPermissions(testPermissions);
      expect(result).toEqual([]);
    });
  });

  describe('groupPermissionsByGroup', () => {
    it('should group permissions by group prefix', () => {
      const result = groupPermissionsByGroup(testPermissions);
      expect(result['Người dùng']).toHaveLength(2);
      expect(result['Vai trò']).toHaveLength(2);
      expect(result['Sao lưu']).toHaveLength(1);
    });

    it('should include both code and label in grouped permissions', () => {
      const result = groupPermissionsByGroup(['admin.users.manage']);
      expect(result['Người dùng'][0]).toHaveProperty('code', 'admin.users.manage');
      expect(result['Người dùng'][0]).toHaveProperty('label', 'Quản lý người dùng');
    });
  });

  describe('groupPermissionsByAction', () => {
    it('should group permissions by action', () => {
      const result = groupPermissionsByAction(testPermissions);
      expect(result['manage']).toHaveLength(3);
      expect(result['view']).toHaveLength(3);
    });

    it('should include both code and label in grouped permissions', () => {
      const result = groupPermissionsByAction(['admin.users.manage']);
      expect(result['manage'][0]).toHaveProperty('code', 'admin.users.manage');
      expect(result['manage'][0]).toHaveProperty('label', 'Quản lý người dùng');
    });
  });

  describe('groupPermissionsByCategory', () => {
    it('should group permissions by category', () => {
      const permissions = ['admin.users.manage', 'user.profile.edit', 'admin.roles.manage'];
      const result = groupPermissionsByCategory(permissions);
      expect(result['admin']).toHaveLength(2);
      expect(result['user']).toHaveLength(1);
    });
  });

  describe('sortPermissionsByLabel', () => {
    it('should sort permissions by Vietnamese label in ascending order', () => {
      const result = sortPermissionsByLabel(['admin.users.manage', 'admin.backups.manage']);
      // "Quản lý người dùng" comes before "Quản lý sao lưu" in Vietnamese alphabetical order
      expect(result[0]).toBe('admin.users.manage');
      expect(result[1]).toBe('admin.backups.manage');
    });

    it('should sort permissions in descending order', () => {
      const result = sortPermissionsByLabel(['admin.backups.manage', 'admin.users.manage'], 'desc');
      // Reverse order: "Quản lý sao lưu" comes before "Quản lý người dùng"
      expect(result[0]).toBe('admin.backups.manage');
      expect(result[1]).toBe('admin.users.manage');
    });
  });

  describe('sortPermissionsByCode', () => {
    it('should sort permissions by code in ascending order', () => {
      const result = sortPermissionsByCode(['admin.users.manage', 'admin.backups.manage']);
      expect(result[0]).toBe('admin.backups.manage');
      expect(result[1]).toBe('admin.users.manage');
    });

    it('should sort permissions in descending order', () => {
      const result = sortPermissionsByCode(['admin.backups.manage', 'admin.users.manage'], 'desc');
      expect(result[0]).toBe('admin.users.manage');
      expect(result[1]).toBe('admin.backups.manage');
    });
  });

  describe('organizePermissionsForMatrix', () => {
    it('should organize permissions for matrix display', () => {
      const result = organizePermissionsForMatrix(testPermissions);
      expect(result).toHaveLength(4);
      expect(result[0]).toHaveProperty('group');
      expect(result[0]).toHaveProperty('permissions');
    });

    it('should include all permissions in organized result', () => {
      const result = organizePermissionsForMatrix(testPermissions);
      const totalPermissions = result.reduce((sum, group) => sum + group.permissions.length, 0);
      expect(totalPermissions).toBe(testPermissions.length);
    });
  });

  describe('organizePermissionsForList', () => {
    it('should organize permissions for list display', () => {
      const result = organizePermissionsForList(testPermissions);
      expect(result).toHaveLength(testPermissions.length);
      expect(result[0]).toHaveProperty('code');
      expect(result[0]).toHaveProperty('label');
    });

    it('should sort by label by default', () => {
      const result = organizePermissionsForList(['admin.users.manage', 'admin.backups.manage']);
      // "Quản lý người dùng" comes before "Quản lý sao lưu" in Vietnamese alphabetical order
      expect(result[0].code).toBe('admin.users.manage');
    });

    it('should sort by code when specified', () => {
      const result = organizePermissionsForList(['admin.users.manage', 'admin.backups.manage'], 'code');
      expect(result[0].code).toBe('admin.backups.manage');
    });
  });

  describe('organizePermissionsForTree', () => {
    it('should organize permissions for tree display', () => {
      const result = organizePermissionsForTree(testPermissions);
      expect(result).toHaveLength(1);
      expect(result[0]).toHaveProperty('id', 'admin');
      expect(result[0]).toHaveProperty('children');
    });

    it('should create hierarchical structure', () => {
      const result = organizePermissionsForTree(['admin.users.manage']);
      expect(result[0].children).toBeDefined();
      expect(result[0].children[0].children).toBeDefined();
    });
  });

  describe('transformPermissionsWithLabels', () => {
    it('should transform permissions to include labels', () => {
      const result = transformPermissionsWithLabels(['admin.users.manage']);
      expect(result[0]).toEqual({
        code: 'admin.users.manage',
        label: 'Quản lý người dùng',
      });
    });

    it('should include all permissions', () => {
      const result = transformPermissionsWithLabels(testPermissions);
      expect(result).toHaveLength(testPermissions.length);
    });
  });

  describe('transformPermissionsWithGroups', () => {
    it('should transform permissions to include labels and groups', () => {
      const result = transformPermissionsWithGroups(['admin.users.manage']);
      expect(result[0]).toEqual({
        code: 'admin.users.manage',
        label: 'Quản lý người dùng',
        group: 'Người dùng',
      });
    });

    it('should include all permissions', () => {
      const result = transformPermissionsWithGroups(testPermissions);
      expect(result).toHaveLength(testPermissions.length);
    });
  });

  describe('validatePermissionMappings', () => {
    it('should validate that all permissions have mappings', () => {
      const result = validatePermissionMappings(testPermissions);
      expect(result.isValid).toBe(true);
      expect(result.unmappedPermissions).toEqual([]);
    });

    it('should identify unmapped permissions', () => {
      const permissions = ['admin.users.manage', 'custom.permission'];
      const result = validatePermissionMappings(permissions);
      expect(result.isValid).toBe(false);
      expect(result.unmappedPermissions).toContain('custom.permission');
    });
  });

  describe('getPermissionStatistics', () => {
    it('should calculate permission statistics', () => {
      const result = getPermissionStatistics(testPermissions);
      expect(result).toHaveProperty('total', testPermissions.length);
      expect(result).toHaveProperty('mapped', testPermissions.length);
      expect(result).toHaveProperty('unmapped', 0);
      expect(result).toHaveProperty('byGroup');
      expect(result).toHaveProperty('byAction');
      expect(result).toHaveProperty('byCategory');
    });

    it('should count permissions by group', () => {
      const result = getPermissionStatistics(testPermissions);
      expect(result.byGroup['Người dùng']).toBe(2);
      expect(result.byGroup['Vai trò']).toBe(2);
    });

    it('should count permissions by action', () => {
      const result = getPermissionStatistics(testPermissions);
      expect(result.byAction['manage']).toBe(3);
      expect(result.byAction['view']).toBe(3);
    });
  });

  describe('comparePermissions', () => {
    it('should identify added permissions', () => {
      const result = comparePermissions(
        ['admin.users.manage'],
        ['admin.users.manage', 'admin.roles.manage']
      );
      expect(result.added).toContain('admin.roles.manage');
    });

    it('should identify removed permissions', () => {
      const result = comparePermissions(
        ['admin.users.manage', 'admin.roles.manage'],
        ['admin.users.manage']
      );
      expect(result.removed).toContain('admin.roles.manage');
    });

    it('should identify common permissions', () => {
      const result = comparePermissions(
        ['admin.users.manage', 'admin.roles.manage'],
        ['admin.users.manage', 'admin.backups.manage']
      );
      expect(result.common).toContain('admin.users.manage');
      expect(result.common).not.toContain('admin.roles.manage');
    });
  });

  describe('mergePermissions', () => {
    it('should merge multiple permission arrays', () => {
      const result = mergePermissions(
        ['admin.users.manage'],
        ['admin.roles.manage']
      );
      expect(result).toContain('admin.users.manage');
      expect(result).toContain('admin.roles.manage');
    });

    it('should remove duplicates', () => {
      const result = mergePermissions(
        ['admin.users.manage', 'admin.roles.manage'],
        ['admin.users.manage', 'admin.backups.manage']
      );
      expect(result).toHaveLength(3);
    });
  });

  describe('intersectPermissions', () => {
    it('should find common permissions across arrays', () => {
      const result = intersectPermissions(
        ['admin.users.manage', 'admin.roles.manage', 'admin.backups.manage'],
        ['admin.users.manage', 'admin.roles.manage'],
        ['admin.users.manage', 'admin.roles.manage', 'admin.logs.view']
      );
      expect(result).toContain('admin.users.manage');
      expect(result).toContain('admin.roles.manage');
      expect(result).not.toContain('admin.backups.manage');
    });

    it('should return empty array for no common permissions', () => {
      const result = intersectPermissions(
        ['admin.users.manage'],
        ['admin.roles.manage']
      );
      expect(result).toEqual([]);
    });
  });

  describe('differencePermissions', () => {
    it('should find permissions in first but not in second', () => {
      const result = differencePermissions(
        ['admin.users.manage', 'admin.roles.manage', 'admin.backups.manage'],
        ['admin.users.manage']
      );
      expect(result).toContain('admin.roles.manage');
      expect(result).toContain('admin.backups.manage');
      expect(result).not.toContain('admin.users.manage');
    });
  });

  describe('hasAllPermissions', () => {
    it('should return true if all required permissions are present', () => {
      const result = hasAllPermissions(
        ['admin.users.manage', 'admin.roles.manage', 'admin.backups.manage'],
        ['admin.users.manage', 'admin.roles.manage']
      );
      expect(result).toBe(true);
    });

    it('should return false if any required permission is missing', () => {
      const result = hasAllPermissions(
        ['admin.users.manage', 'admin.roles.manage'],
        ['admin.users.manage', 'admin.backups.manage']
      );
      expect(result).toBe(false);
    });
  });

  describe('hasAnyPermission', () => {
    it('should return true if any required permission is present', () => {
      const result = hasAnyPermission(
        ['admin.users.manage', 'admin.roles.manage'],
        ['admin.backups.manage', 'admin.users.manage']
      );
      expect(result).toBe(true);
    });

    it('should return false if no required permissions are present', () => {
      const result = hasAnyPermission(
        ['admin.users.manage', 'admin.roles.manage'],
        ['admin.backups.manage', 'admin.logs.view']
      );
      expect(result).toBe(false);
    });
  });

  describe('deduplicatePermissions', () => {
    it('should remove duplicate permissions', () => {
      const result = deduplicatePermissions([
        'admin.users.manage',
        'admin.users.manage',
        'admin.roles.manage',
      ]);
      expect(result).toHaveLength(2);
      expect(result).toContain('admin.users.manage');
      expect(result).toContain('admin.roles.manage');
    });

    it('should return same array if no duplicates', () => {
      const result = deduplicatePermissions(['admin.users.manage', 'admin.roles.manage']);
      expect(result).toHaveLength(2);
    });
  });

  describe('paginatePermissions', () => {
    it('should paginate permissions correctly', () => {
      const result = paginatePermissions(testPermissions, 1, 2);
      expect(result.items).toHaveLength(2);
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(2);
      expect(result.total).toBe(testPermissions.length);
    });

    it('should calculate total pages correctly', () => {
      const result = paginatePermissions(testPermissions, 1, 2);
      expect(result.totalPages).toBe(3);
    });

    it('should return correct items for different pages', () => {
      const result1 = paginatePermissions(testPermissions, 1, 2);
      const result2 = paginatePermissions(testPermissions, 2, 2);
      expect(result1.items[0]).not.toBe(result2.items[0]);
    });

    it('should handle last page with fewer items', () => {
      const result = paginatePermissions(testPermissions, 3, 2);
      expect(result.items).toHaveLength(2);
    });
  });
});
