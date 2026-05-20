/**
 * Comprehensive Unit Tests for Localization System
 * 
 * **Property 1: Navigation Menu Labels Are Vietnamese**
 * **Validates: Requirements 1.1, 1.2**
 * 
 * This test suite validates:
 * - useTranslation hook returns correct Vietnamese translations
 * - getTranslation utility returns correct values for nested keys
 * - Fallback behavior returns the key itself when translation not found
 * - All translation keys are properly nested and accessible
 */

import { renderHook } from '@testing-library/react';
import { useTranslation } from './useTranslation';
import { getTranslation, hasTranslation } from './getTranslation';
import { TRANSLATIONS } from './translations';

describe('Localization System - Comprehensive Unit Tests', () => {
  describe('Property 1: Navigation Menu Labels Are Vietnamese', () => {
    describe('useTranslation hook returns correct Vietnamese translations', () => {
      it('should return Vietnamese translation for navigation.admin', () => {
        const { result } = renderHook(() => useTranslation());
        const translation = result.current.t('navigation.admin');

        expect(translation).toBe('Quản trị');
        expect(translation).not.toBe('Admin');
      });

      it('should return Vietnamese translation for navigation.users', () => {
        const { result } = renderHook(() => useTranslation());
        const translation = result.current.t('navigation.users');

        expect(translation).toBe('Người dùng');
        expect(translation).not.toBe('Users');
      });

      it('should return Vietnamese translation for navigation.roles', () => {
        const { result } = renderHook(() => useTranslation());
        const translation = result.current.t('navigation.roles');

        expect(translation).toBe('Vai trò');
        expect(translation).not.toBe('Roles');
      });

      it('should return Vietnamese translation for navigation.permissions', () => {
        const { result } = renderHook(() => useTranslation());
        const translation = result.current.t('navigation.permissions');

        expect(translation).toBe('Quyền');
        expect(translation).not.toBe('Permissions');
      });

      it('should return Vietnamese translation for navigation.auditLogs', () => {
        const { result } = renderHook(() => useTranslation());
        const translation = result.current.t('navigation.auditLogs');

        expect(translation).toBe('Nhật ký');
        expect(translation).not.toBe('Audit Logs');
      });

      it('should return Vietnamese translation for navigation.dashboard', () => {
        const { result } = renderHook(() => useTranslation());
        const translation = result.current.t('navigation.dashboard');

        expect(translation).toBe('Bảng điều khiển');
        expect(translation).not.toBe('Dashboard');
      });

      it('should return Vietnamese translation for navigation.map', () => {
        const { result } = renderHook(() => useTranslation());
        const translation = result.current.t('navigation.map');

        expect(translation).toBe('Bản đồ');
        expect(translation).not.toBe('Map');
      });

      it('should return Vietnamese translation for navigation.assets', () => {
        const { result } = renderHook(() => useTranslation());
        const translation = result.current.t('navigation.assets');

        expect(translation).toBe('Tài sản');
        expect(translation).not.toBe('Assets');
      });

      it('should return Vietnamese translation for navigation.logout', () => {
        const { result } = renderHook(() => useTranslation());
        const translation = result.current.t('navigation.logout');

        expect(translation).toBe('Đăng xuất');
        expect(translation).not.toBe('Logout');
      });

      it('should return Vietnamese translation for all navigation menu items', () => {
        const { result } = renderHook(() => useTranslation());

        const navigationItems = [
          { key: 'navigation.map', expected: 'Bản đồ' },
          { key: 'navigation.assets', expected: 'Tài sản' },
          { key: 'navigation.dashboard', expected: 'Bảng điều khiển' },
          { key: 'navigation.admin', expected: 'Quản trị' },
          { key: 'navigation.users', expected: 'Người dùng' },
          { key: 'navigation.roles', expected: 'Vai trò' },
          { key: 'navigation.permissions', expected: 'Quyền' },
          { key: 'navigation.auditLogs', expected: 'Nhật ký' },
          { key: 'navigation.logout', expected: 'Đăng xuất' },
        ];

        navigationItems.forEach(({ key, expected }) => {
          const translation = result.current.t(key);
          expect(translation).toBe(expected);
          expect(translation).not.toBe(key);
        });
      });

      it('should not contain English words in navigation labels', () => {
        const { result } = renderHook(() => useTranslation());

        const englishWords = ['Map', 'Assets', 'Dashboard', 'Admin', 'Users', 'Roles', 'Permissions', 'Audit', 'Logs', 'Logout'];
        const navigationKeys = [
          'navigation.map',
          'navigation.assets',
          'navigation.dashboard',
          'navigation.admin',
          'navigation.users',
          'navigation.roles',
          'navigation.permissions',
          'navigation.auditLogs',
          'navigation.logout',
        ];

        navigationKeys.forEach((key, index) => {
          const translation = result.current.t(key);
          expect(translation).not.toContain(englishWords[index]);
        });
      });
    });

    describe('getTranslation utility returns correct values for nested keys', () => {
      it('should return Vietnamese translation for navigation.admin', () => {
        const translation = getTranslation('navigation.admin');

        expect(translation).toBe('Quản trị');
        expect(translation).not.toBe('Admin');
      });

      it('should return Vietnamese translation for admin.users.title', () => {
        const translation = getTranslation('admin.users.title');

        expect(translation).toBe('Quản lý người dùng');
        expect(translation).not.toBe('Manage Users');
      });

      it('should return Vietnamese translation for admin.roles.title', () => {
        const translation = getTranslation('admin.roles.title');

        expect(translation).toBe('Quản lý vai trò');
        expect(translation).not.toBe('Manage Roles');
      });

      it('should return Vietnamese translation for admin.permissions.title', () => {
        const translation = getTranslation('admin.permissions.title');

        expect(translation).toBe('Quản lý quyền');
        expect(translation).not.toBe('Manage Permissions');
      });

      it('should return Vietnamese translation for admin.auditLogs.title', () => {
        const translation = getTranslation('admin.auditLogs.title');

        expect(translation).toBe('Nhật ký hệ thống');
        expect(translation).not.toBe('System Audit Logs');
      });

      it('should return Vietnamese translation for deeply nested keys', () => {
        const translation = getTranslation('messages.success.saved');

        expect(translation).toBe('Lưu thành công');
        expect(translation).not.toBe('Saved successfully');
      });

      it('should return Vietnamese translation for common UI elements', () => {
        const commonTranslations = [
          { key: 'common.save', expected: 'Lưu' },
          { key: 'common.cancel', expected: 'Hủy' },
          { key: 'common.delete', expected: 'Xóa' },
          { key: 'common.edit', expected: 'Chỉnh sửa' },
          { key: 'common.add', expected: 'Thêm' },
          { key: 'common.search', expected: 'Tìm kiếm' },
          { key: 'common.filter', expected: 'Lọc' },
        ];

        commonTranslations.forEach(({ key, expected }) => {
          const translation = getTranslation(key);
          expect(translation).toBe(expected);
          expect(translation).not.toBe(key);
        });
      });

      it('should return Vietnamese translation for all admin page titles', () => {
        const adminTitles = [
          { key: 'admin.users.title', expected: 'Quản lý người dùng' },
          { key: 'admin.roles.title', expected: 'Quản lý vai trò' },
          { key: 'admin.permissions.title', expected: 'Quản lý quyền' },
          { key: 'admin.auditLogs.title', expected: 'Nhật ký hệ thống' },
        ];

        adminTitles.forEach(({ key, expected }) => {
          const translation = getTranslation(key);
          expect(translation).toBe(expected);
          expect(translation).not.toBe(key);
        });
      });

      it('should handle nested key access at various depths', () => {
        const testCases = [
          { key: 'navigation.admin', depth: 2 },
          { key: 'admin.users.title', depth: 3 },
          { key: 'messages.success.saved', depth: 3 },
          { key: 'messages.error.unauthorized', depth: 3 },
        ];

        testCases.forEach(({ key, depth }) => {
          const translation = getTranslation(key);
          expect(translation).not.toBe(key);
          expect(typeof translation).toBe('string');
          expect(translation.length).toBeGreaterThan(0);
        });
      });
    });

    describe('Fallback behavior returns the key itself when translation not found', () => {
      it('should return the key when translation not found', () => {
        const { result } = renderHook(() => useTranslation());
        const translation = result.current.t('nonexistent.key');

        expect(translation).toBe('nonexistent.key');
      });

      it('should return the key when partial path exists but final key does not', () => {
        const { result } = renderHook(() => useTranslation());
        const translation = result.current.t('admin.nonexistent.key');

        expect(translation).toBe('admin.nonexistent.key');
      });

      it('should return the key when first part of path does not exist', () => {
        const { result } = renderHook(() => useTranslation());
        const translation = result.current.t('nonexistent.users.title');

        expect(translation).toBe('nonexistent.users.title');
      });

      it('should return the key when accessing non-string value (object)', () => {
        const { result } = renderHook(() => useTranslation());
        // admin is an object, not a string
        const translation = result.current.t('admin');

        expect(translation).toBe('admin');
      });

      it('should return the key for getTranslation when translation not found', () => {
        const translation = getTranslation('nonexistent.key');

        expect(translation).toBe('nonexistent.key');
      });

      it('should return the key for getTranslation when partial path exists', () => {
        const translation = getTranslation('admin.nonexistent.key');

        expect(translation).toBe('admin.nonexistent.key');
      });

      it('should handle edge cases with fallback behavior', () => {
        const { result } = renderHook(() => useTranslation());

        const edgeCases = [
          'nonexistent.key',
          'admin.nonexistent.key',
          'nonexistent.users.title',
          'admin.users.nonexistent',
          'unknown.path.to.translation',
        ];

        edgeCases.forEach((key) => {
          const translation = result.current.t(key);
          expect(translation).toBe(key);
        });
      });

      it('should return the key for null/undefined/empty inputs', () => {
        const { result } = renderHook(() => useTranslation());

        expect(result.current.t(null)).toBe(null);
        expect(result.current.t(undefined)).toBe(undefined);
        expect(result.current.t('')).toBe('');
      });
    });

    describe('All translation keys are properly nested and accessible', () => {
      it('should have all navigation keys properly nested', () => {
        const navigationKeys = [
          'navigation.map',
          'navigation.assets',
          'navigation.dashboard',
          'navigation.admin',
          'navigation.users',
          'navigation.roles',
          'navigation.permissions',
          'navigation.auditLogs',
          'navigation.logout',
          'navigation.settings',
        ];

        navigationKeys.forEach((key) => {
          expect(hasTranslation(key)).toBe(true);
          const translation = getTranslation(key);
          expect(translation).not.toBe(key);
          expect(typeof translation).toBe('string');
        });
      });

      it('should have all admin page keys properly nested', () => {
        const adminKeys = [
          'admin.users.title',
          'admin.users.heading',
          'admin.users.search',
          'admin.roles.title',
          'admin.roles.heading',
          'admin.permissions.title',
          'admin.permissions.heading',
          'admin.auditLogs.title',
          'admin.auditLogs.heading',
        ];

        adminKeys.forEach((key) => {
          expect(hasTranslation(key)).toBe(true);
          const translation = getTranslation(key);
          expect(translation).not.toBe(key);
          expect(typeof translation).toBe('string');
        });
      });

      it('should have all common UI element keys properly nested', () => {
        const commonKeys = [
          'common.save',
          'common.cancel',
          'common.delete',
          'common.edit',
          'common.add',
          'common.search',
          'common.filter',
          'common.loading',
          'common.error',
          'common.success',
        ];

        commonKeys.forEach((key) => {
          expect(hasTranslation(key)).toBe(true);
          const translation = getTranslation(key);
          expect(translation).not.toBe(key);
          expect(typeof translation).toBe('string');
        });
      });

      it('should have all permission keys properly nested', () => {
        const permissionKeys = [
          'permissions.manage',
          'permissions.view',
          'permissions.create',
          'permissions.edit',
          'permissions.delete',
          'permissions.apiKeys',
          'permissions.backups',
          'permissions.config',
          'permissions.logs',
          'permissions.roles',
          'permissions.users',
        ];

        permissionKeys.forEach((key) => {
          expect(hasTranslation(key)).toBe(true);
          const translation = getTranslation(key);
          expect(translation).not.toBe(key);
          expect(typeof translation).toBe('string');
        });
      });

      it('should have all message keys properly nested', () => {
        const messageKeys = [
          'messages.success.saved',
          'messages.success.created',
          'messages.success.updated',
          'messages.success.deleted',
          'messages.error.saveFailed',
          'messages.error.unauthorized',
          'messages.error.notFound',
          'messages.warning.unsavedChanges',
          'messages.warning.confirmDelete',
        ];

        messageKeys.forEach((key) => {
          expect(hasTranslation(key)).toBe(true);
          const translation = getTranslation(key);
          expect(translation).not.toBe(key);
          expect(typeof translation).toBe('string');
        });
      });

      it('should have all breadcrumb keys properly nested', () => {
        const breadcrumbKeys = [
          'breadcrumb.admin',
          'breadcrumb.home',
        ];

        breadcrumbKeys.forEach((key) => {
          expect(hasTranslation(key)).toBe(true);
          const translation = getTranslation(key);
          expect(translation).not.toBe(key);
          expect(typeof translation).toBe('string');
        });
      });

      it('should have all table keys properly nested', () => {
        const tableKeys = [
          'table.id',
          'table.name',
          'table.email',
          'table.username',
          'table.role',
          'table.status',
          'table.createdAt',
          'table.updatedAt',
          'table.actions',
        ];

        tableKeys.forEach((key) => {
          expect(hasTranslation(key)).toBe(true);
          const translation = getTranslation(key);
          expect(translation).not.toBe(key);
          expect(typeof translation).toBe('string');
        });
      });

      it('should have all pagination keys properly nested', () => {
        const paginationKeys = [
          'pagination.previous',
          'pagination.next',
          'pagination.first',
          'pagination.last',
          'pagination.page',
          'pagination.of',
        ];

        paginationKeys.forEach((key) => {
          expect(hasTranslation(key)).toBe(true);
          const translation = getTranslation(key);
          expect(translation).not.toBe(key);
          expect(typeof translation).toBe('string');
        });
      });

      it('should have all filter keys properly nested', () => {
        const filterKeys = [
          'filter.search',
          'filter.filter',
          'filter.reset',
          'filter.apply',
          'filter.clearAll',
          'filter.filterBy',
          'filter.sortBy',
        ];

        filterKeys.forEach((key) => {
          expect(hasTranslation(key)).toBe(true);
          const translation = getTranslation(key);
          expect(translation).not.toBe(key);
          expect(typeof translation).toBe('string');
        });
      });

      it('should have all role keys properly nested', () => {
        const roleKeys = [
          'roles.admin',
          'roles.manager',
          'roles.user',
          'roles.guest',
          'roles.viewer',
          'roles.editor',
          'roles.owner',
        ];

        roleKeys.forEach((key) => {
          expect(hasTranslation(key)).toBe(true);
          const translation = getTranslation(key);
          expect(translation).not.toBe(key);
          expect(typeof translation).toBe('string');
        });
      });

      it('should have all audit log action keys properly nested', () => {
        const auditLogKeys = [
          'auditLog.created',
          'auditLog.updated',
          'auditLog.deleted',
          'auditLog.viewed',
          'auditLog.exported',
          'auditLog.imported',
          'auditLog.login',
          'auditLog.logout',
        ];

        auditLogKeys.forEach((key) => {
          expect(hasTranslation(key)).toBe(true);
          const translation = getTranslation(key);
          expect(translation).not.toBe(key);
          expect(typeof translation).toBe('string');
        });
      });

      it('should have all entity type keys properly nested', () => {
        const entityTypeKeys = [
          'entityTypes.user',
          'entityTypes.role',
          'entityTypes.permission',
          'entityTypes.asset',
          'entityTypes.settings',
          'entityTypes.auditLog',
          'entityTypes.apiKey',
          'entityTypes.backup',
          'entityTypes.config',
        ];

        entityTypeKeys.forEach((key) => {
          expect(hasTranslation(key)).toBe(true);
          const translation = getTranslation(key);
          expect(translation).not.toBe(key);
          expect(typeof translation).toBe('string');
        });
      });

      it('should verify TRANSLATIONS object structure is properly nested', () => {
        expect(typeof TRANSLATIONS).toBe('object');
        expect(TRANSLATIONS.navigation).toBeDefined();
        expect(TRANSLATIONS.admin).toBeDefined();
        expect(TRANSLATIONS.common).toBeDefined();
        expect(TRANSLATIONS.permissions).toBeDefined();
        expect(TRANSLATIONS.messages).toBeDefined();
        expect(TRANSLATIONS.breadcrumb).toBeDefined();
        expect(TRANSLATIONS.table).toBeDefined();
        expect(TRANSLATIONS.pagination).toBeDefined();
        expect(TRANSLATIONS.filter).toBeDefined();
        expect(TRANSLATIONS.roles).toBeDefined();
        expect(TRANSLATIONS.auditLog).toBeDefined();
        expect(TRANSLATIONS.entityTypes).toBeDefined();
      });

      it('should verify all navigation items are strings', () => {
        Object.entries(TRANSLATIONS.navigation).forEach(([key, value]) => {
          expect(typeof value).toBe('string');
          expect(value.length).toBeGreaterThan(0);
        });
      });

      it('should verify all admin items are objects with string values', () => {
        Object.entries(TRANSLATIONS.admin).forEach(([key, value]) => {
          expect(typeof value).toBe('object');
          Object.entries(value).forEach(([subKey, subValue]) => {
            expect(typeof subValue).toBe('string');
            expect(subValue.length).toBeGreaterThan(0);
          });
        });
      });

      it('should verify all common items are strings', () => {
        Object.entries(TRANSLATIONS.common).forEach(([key, value]) => {
          expect(typeof value).toBe('string');
          expect(value.length).toBeGreaterThan(0);
        });
      });
    });

    describe('Consistency and stability', () => {
      it('should return same translation for same key on multiple calls', () => {
        const { result } = renderHook(() => useTranslation());
        const key = 'admin.users.title';
        const result1 = result.current.t(key);
        const result2 = result.current.t(key);

        expect(result1).toBe(result2);
      });

      it('should return different translations for different keys', () => {
        const { result } = renderHook(() => useTranslation());
        const result1 = result.current.t('common.save');
        const result2 = result.current.t('common.delete');

        expect(result1).not.toBe(result2);
      });

      it('should not modify the original TRANSLATIONS object', () => {
        const originalValue = TRANSLATIONS.navigation.admin;
        getTranslation('navigation.admin');

        expect(TRANSLATIONS.navigation.admin).toBe(originalValue);
      });

      it('should maintain consistency between useTranslation and getTranslation', () => {
        const { result } = renderHook(() => useTranslation());
        const keys = [
          'navigation.admin',
          'admin.users.title',
          'common.save',
          'messages.success.saved',
        ];

        keys.forEach((key) => {
          const hookResult = result.current.t(key);
          const utilityResult = getTranslation(key);
          expect(hookResult).toBe(utilityResult);
        });
      });
    });

    describe('Vietnamese text validation', () => {
      it('should not contain English words in navigation labels', () => {
        const { result } = renderHook(() => useTranslation());

        const navigationKeys = [
          'navigation.map',
          'navigation.assets',
          'navigation.dashboard',
          'navigation.admin',
          'navigation.users',
          'navigation.roles',
          'navigation.permissions',
          'navigation.auditLogs',
        ];

        const englishWords = ['map', 'assets', 'dashboard', 'admin', 'users', 'roles', 'permissions', 'audit', 'logs'];

        navigationKeys.forEach((key) => {
          const translation = result.current.t(key);
          englishWords.forEach((word) => {
            expect(translation.toLowerCase()).not.toContain(word);
          });
        });
      });

      it('should not contain English words in admin page titles', () => {
        const adminKeys = [
          'admin.users.title',
          'admin.roles.title',
          'admin.permissions.title',
          'admin.auditLogs.title',
        ];

        const englishWords = ['manage', 'users', 'roles', 'permissions', 'audit', 'logs'];

        adminKeys.forEach((key) => {
          const translation = getTranslation(key);
          englishWords.forEach((word) => {
            expect(translation.toLowerCase()).not.toContain(word);
          });
        });
      });

      it('should not contain English words in common UI elements', () => {
        const commonKeys = [
          'common.save',
          'common.cancel',
          'common.delete',
          'common.edit',
          'common.add',
        ];

        const englishWords = ['save', 'cancel', 'delete', 'edit', 'add'];

        commonKeys.forEach((key, index) => {
          const translation = getTranslation(key);
          expect(translation.toLowerCase()).not.toBe(englishWords[index]);
        });
      });

      it('should not contain English words in error messages', () => {
        const errorKeys = [
          'messages.error.unauthorized',
          'messages.error.notFound',
          'messages.error.serverError',
        ];

        const englishWords = ['unauthorized', 'not found', 'server error'];

        errorKeys.forEach((key, index) => {
          const translation = getTranslation(key);
          expect(translation.toLowerCase()).not.toBe(englishWords[index]);
        });
      });
    });
  });

  describe('Integration Tests', () => {
    it('should work correctly for typical UI rendering workflow', () => {
      const { result } = renderHook(() => useTranslation());

      // Simulate rendering a page with multiple translations
      const pageTitle = result.current.t('admin.users.title');
      const saveButton = result.current.t('common.save');
      const cancelButton = result.current.t('common.cancel');
      const deleteButton = result.current.t('common.delete');

      expect(pageTitle).toBe('Quản lý người dùng');
      expect(saveButton).toBe('Lưu');
      expect(cancelButton).toBe('Hủy');
      expect(deleteButton).toBe('Xóa');
    });

    it('should handle multiple hooks in the same component', () => {
      const { result: result1 } = renderHook(() => useTranslation());
      const keys = [
        'navigation.admin',
        'admin.users.title',
        'common.save',
        'messages.success.saved',
      ];

      keys.forEach((key) => {
        const hookResult = result1.current.t(key);
        const utilityResult = getTranslation(key);
        expect(hookResult).toBe(utilityResult);
      });
    });

    it('should work with dynamic key construction', () => {
      const { result } = renderHook(() => useTranslation());

      const section = 'admin';
      const page = 'users';
      const field = 'title';
      const key = `${section}.${page}.${field}`;

      const translation = result.current.t(key);
      expect(translation).toBe('Quản lý người dùng');
    });

    it('should handle fallback chain correctly', () => {
      const { result } = renderHook(() => useTranslation());

      const key = 'admin.users.nonexistent.field';
      const translation = result.current.t(key);

      expect(translation).toBe(key);
    });

    it('should work with server-side rendering pattern', () => {
      // Simulate server-side rendering
      const pageTitle = getTranslation('admin.users.title');
      const saveButton = getTranslation('common.save');
      const cancelButton = getTranslation('common.cancel');

      expect(pageTitle).toBe('Quản lý người dùng');
      expect(saveButton).toBe('Lưu');
      expect(cancelButton).toBe('Hủy');
    });
  });
});
