/**
 * Unit tests for getTranslation server-side utility
 * Tests nested key access, fallback behavior, and edge cases
 */

import {
  getTranslation,
  getTranslationWithDefault,
  hasTranslation,
  getTranslationNamespace,
} from './getTranslation';
import { TRANSLATIONS } from './translations';

describe('getTranslation', () => {
  describe('Basic functionality', () => {
    it('should return translation for a simple key', () => {
      const result = getTranslation('navigation.admin');
      expect(result).toBe('Quản trị');
    });

    it('should return translation for nested keys', () => {
      const result = getTranslation('admin.users.title');
      expect(result).toBe('Quản lý người dùng');
    });

    it('should return translation for deeply nested keys', () => {
      const result = getTranslation('messages.success.saved');
      expect(result).toBe('Lưu thành công');
    });

    it('should return translation for common UI elements', () => {
      const result = getTranslation('common.save');
      expect(result).toBe('Lưu');
    });

    it('should return translation for permission labels', () => {
      const result = getTranslation('permissions.manage');
      expect(result).toBe('Quản lý');
    });
  });

  describe('Fallback behavior', () => {
    it('should return the key itself when translation not found', () => {
      const result = getTranslation('nonexistent.key');
      expect(result).toBe('nonexistent.key');
    });

    it('should return the key when partial path exists but final key does not', () => {
      const result = getTranslation('admin.nonexistent.key');
      expect(result).toBe('admin.nonexistent.key');
    });

    it('should return the key when first part of path does not exist', () => {
      const result = getTranslation('nonexistent.users.title');
      expect(result).toBe('nonexistent.users.title');
    });

    it('should return the key when accessing non-string value', () => {
      // admin is an object, not a string
      const result = getTranslation('admin');
      expect(result).toBe('admin');
    });
  });

  describe('Edge cases', () => {
    it('should handle null input', () => {
      const result = getTranslation(null);
      expect(result).toBe(null);
    });

    it('should handle undefined input', () => {
      const result = getTranslation(undefined);
      expect(result).toBe(undefined);
    });

    it('should handle empty string', () => {
      const result = getTranslation('');
      expect(result).toBe('');
    });

    it('should handle non-string input', () => {
      const result = getTranslation(123);
      expect(result).toBe(123);
    });

    it('should handle key with trailing dot', () => {
      const result = getTranslation('navigation.admin.');
      expect(result).toBe('navigation.admin.');
    });

    it('should handle key with leading dot', () => {
      const result = getTranslation('.navigation.admin');
      expect(result).toBe('.navigation.admin');
    });

    it('should handle key with multiple consecutive dots', () => {
      const result = getTranslation('navigation..admin');
      expect(result).toBe('navigation..admin');
    });

    it('should handle single-level keys without dots', () => {
      const result = getTranslation('navigation');
      expect(result).toBe('navigation');
    });
  });

  describe('Vietnamese text validation', () => {
    it('should return Vietnamese text for navigation labels', () => {
      const result = getTranslation('navigation.users');
      expect(result).toBe('Người dùng');
      // Verify it's not English
      expect(result).not.toBe('Users');
    });

    it('should return Vietnamese text for admin pages', () => {
      const result = getTranslation('admin.roles.title');
      expect(result).toBe('Quản lý vai trò');
      // Verify it's not English
      expect(result).not.toBe('Manage Roles');
    });

    it('should return Vietnamese text for common UI elements', () => {
      const result = getTranslation('common.delete');
      expect(result).toBe('Xóa');
      // Verify it's not English
      expect(result).not.toBe('Delete');
    });

    it('should return Vietnamese text for error messages', () => {
      const result = getTranslation('messages.error.unauthorized');
      expect(result).toBe('Bạn không có quyền thực hiện hành động này');
      // Verify it's not English
      expect(result).not.toBe('You do not have permission to perform this action');
    });
  });

  describe('All required translations exist', () => {
    it('should have translation for all navigation items', () => {
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

      navigationKeys.forEach((key) => {
        const result = getTranslation(key);
        expect(result).not.toBe(key);
        expect(typeof result).toBe('string');
        expect(result.length).toBeGreaterThan(0);
      });
    });

    it('should have translation for all admin page titles', () => {
      const adminKeys = [
        'admin.users.title',
        'admin.roles.title',
        'admin.permissions.title',
        'admin.auditLogs.title',
      ];

      adminKeys.forEach((key) => {
        const result = getTranslation(key);
        expect(result).not.toBe(key);
        expect(typeof result).toBe('string');
        expect(result.length).toBeGreaterThan(0);
      });
    });

    it('should have translation for common UI actions', () => {
      const commonKeys = [
        'common.save',
        'common.cancel',
        'common.delete',
        'common.edit',
        'common.add',
        'common.search',
        'common.filter',
      ];

      commonKeys.forEach((key) => {
        const result = getTranslation(key);
        expect(result).not.toBe(key);
        expect(typeof result).toBe('string');
        expect(result.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Consistency checks', () => {
    it('should return same translation for same key on multiple calls', () => {
      const key = 'admin.users.title';
      const result1 = getTranslation(key);
      const result2 = getTranslation(key);
      expect(result1).toBe(result2);
    });

    it('should return different translations for different keys', () => {
      const result1 = getTranslation('common.save');
      const result2 = getTranslation('common.delete');
      expect(result1).not.toBe(result2);
    });

    it('should not modify the original TRANSLATIONS object', () => {
      const originalValue = TRANSLATIONS.navigation.admin;
      getTranslation('navigation.admin');
      expect(TRANSLATIONS.navigation.admin).toBe(originalValue);
    });
  });
});

describe('getTranslationWithDefault', () => {
  it('should return translation when key exists', () => {
    const result = getTranslationWithDefault('navigation.admin', 'Default');
    expect(result).toBe('Quản trị');
  });

  it('should return default value when key does not exist', () => {
    const result = getTranslationWithDefault('nonexistent.key', 'Default Text');
    expect(result).toBe('Default Text');
  });

  it('should return empty string as default when not provided', () => {
    const result = getTranslationWithDefault('nonexistent.key');
    expect(result).toBe('');
  });

  it('should return translation even if default value is provided', () => {
    const result = getTranslationWithDefault('common.save', 'Default Save');
    expect(result).toBe('Lưu');
  });

  it('should handle null default value', () => {
    const result = getTranslationWithDefault('nonexistent.key', null);
    expect(result).toBe(null);
  });

  it('should handle undefined default value', () => {
    const result = getTranslationWithDefault('nonexistent.key', undefined);
    // When undefined is passed as default, it's treated as "not provided" and returns empty string
    expect(result).toBe('');
  });
});

describe('hasTranslation', () => {
  it('should return true for existing translation', () => {
    const result = hasTranslation('navigation.admin');
    expect(result).toBe(true);
  });

  it('should return true for nested translation', () => {
    const result = hasTranslation('admin.users.title');
    expect(result).toBe(true);
  });

  it('should return false for non-existent translation', () => {
    const result = hasTranslation('nonexistent.key');
    expect(result).toBe(false);
  });

  it('should return false for partial path that is not a string', () => {
    const result = hasTranslation('admin');
    expect(result).toBe(false);
  });

  it('should return false for null input', () => {
    const result = hasTranslation(null);
    expect(result).toBe(false);
  });

  it('should return false for undefined input', () => {
    const result = hasTranslation(undefined);
    expect(result).toBe(false);
  });

  it('should return false for empty string', () => {
    const result = hasTranslation('');
    expect(result).toBe(false);
  });

  it('should return false for non-string input', () => {
    const result = hasTranslation(123);
    expect(result).toBe(false);
  });
});

describe('getTranslationNamespace', () => {
  it('should return namespace object for existing namespace', () => {
    const result = getTranslationNamespace('navigation');
    expect(typeof result).toBe('object');
    expect(result.admin).toBe('Quản trị');
    expect(result.users).toBe('Người dùng');
  });

  it('should return namespace object for admin namespace', () => {
    const result = getTranslationNamespace('admin');
    expect(typeof result).toBe('object');
    expect(result.users).toBeDefined();
    expect(result.roles).toBeDefined();
    expect(result.permissions).toBeDefined();
  });

  it('should return namespace object for common namespace', () => {
    const result = getTranslationNamespace('common');
    expect(typeof result).toBe('object');
    expect(result.save).toBe('Lưu');
    expect(result.cancel).toBe('Hủy');
  });

  it('should return empty object for non-existent namespace', () => {
    const result = getTranslationNamespace('nonexistent');
    expect(result).toEqual({});
  });

  it('should return empty object for null input', () => {
    const result = getTranslationNamespace(null);
    expect(result).toEqual({});
  });

  it('should return empty object for undefined input', () => {
    const result = getTranslationNamespace(undefined);
    expect(result).toEqual({});
  });

  it('should return empty object for empty string', () => {
    const result = getTranslationNamespace('');
    expect(result).toEqual({});
  });

  it('should return empty object for non-string input', () => {
    const result = getTranslationNamespace(123);
    expect(result).toEqual({});
  });

  it('should not return nested namespaces', () => {
    const result = getTranslationNamespace('admin.users');
    expect(result).toEqual({});
  });
});

describe('Integration tests', () => {
  it('should work with server-side rendering pattern', () => {
    // Simulate server-side rendering
    const pageTitle = getTranslation('admin.users.title');
    const saveButton = getTranslation('common.save');
    const cancelButton = getTranslation('common.cancel');

    expect(pageTitle).toBe('Quản lý người dùng');
    expect(saveButton).toBe('Lưu');
    expect(cancelButton).toBe('Hủy');
  });

  it('should work with dynamic key construction', () => {
    const section = 'admin';
    const page = 'users';
    const field = 'title';
    const key = `${section}.${page}.${field}`;

    const result = getTranslation(key);
    expect(result).toBe('Quản lý người dùng');
  });

  it('should handle fallback chain correctly', () => {
    const key = 'admin.users.nonexistent.field';
    const result = getTranslation(key);
    const fallback = getTranslationWithDefault(key, 'Fallback Text');

    expect(result).toBe(key);
    expect(fallback).toBe('Fallback Text');
  });

  it('should work with namespace and key combination', () => {
    const namespace = getTranslationNamespace('admin');
    const userTitle = namespace.users?.title;

    expect(userTitle).toBe('Quản lý người dùng');
  });
});

describe('Property: Translation Keys Return Vietnamese Text', () => {
  /**
   * Validates: Requirements 1.1, 4.1
   * For any translation key that exists in the system, the returned value should be Vietnamese text
   */
  it('should return Vietnamese text for all valid translation keys', () => {
    const validKeys = [
      'navigation.admin',
      'navigation.users',
      'admin.users.title',
      'common.save',
      'common.delete',
      'messages.success.saved',
      'permissions.manage',
    ];

    validKeys.forEach((key) => {
      const result = getTranslation(key);
      // Should not return the key itself (which would indicate not found)
      expect(result).not.toBe(key);
      // Should be a non-empty string
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
      // Should not contain common English words (basic check)
      expect(result.toLowerCase()).not.toMatch(/^(admin|users|roles|permissions|save|delete|cancel)$/);
    });
  });
});

describe('Property: Fallback Behavior Returns Key When Not Found', () => {
  /**
   * Validates: Requirements 1.1, 4.1
   * For any translation key that does not exist, the function should return the key itself as fallback
   */
  it('should return the key itself when translation not found', () => {
    const nonExistentKeys = [
      'nonexistent.key',
      'unknown.translation',
      'missing.admin.page',
      'invalid.path.to.translation',
    ];

    nonExistentKeys.forEach((key) => {
      const result = getTranslation(key);
      expect(result).toBe(key);
    });
  });
});

describe('Property: Nested Key Access Works Correctly', () => {
  /**
   * Validates: Requirements 1.1, 4.1
   * For any nested key with dot notation, the function should correctly traverse the object structure
   */
  it('should correctly access nested keys at various depths', () => {
    const testCases = [
      { key: 'navigation.admin', expected: 'Quản trị' },
      { key: 'admin.users.title', expected: 'Quản lý người dùng' },
      { key: 'messages.success.saved', expected: 'Lưu thành công' },
      { key: 'messages.error.unauthorized', expected: 'Bạn không có quyền thực hiện hành động này' },
      { key: 'common.save', expected: 'Lưu' },
    ];

    testCases.forEach(({ key, expected }) => {
      const result = getTranslation(key);
      expect(result).toBe(expected);
    });
  });
});
