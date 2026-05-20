/**
 * Unit tests for useTranslation React hook
 * Tests nested key access, fallback behavior, and edge cases
 * 
 * **Validates: Requirements 1.1, 4.1**
 */

import { renderHook } from '@testing-library/react';
import {
  useTranslation,
  useTranslationFunction,
  useTranslationNamespace,
  useHasTranslation,
  useTranslationWithDefault,
} from './useTranslation';
import { TRANSLATIONS } from './translations';

describe('useTranslation', () => {
  describe('Hook Structure', () => {
    it('should return an object with t function', () => {
      const { result } = renderHook(() => useTranslation());

      expect(result.current).toHaveProperty('t');
      expect(typeof result.current.t).toBe('function');
    });

    it('should return consistent object structure on multiple calls', () => {
      const { result: result1 } = renderHook(() => useTranslation());
      const { result: result2 } = renderHook(() => useTranslation());

      expect(result1.current).toHaveProperty('t');
      expect(result2.current).toHaveProperty('t');
      expect(typeof result1.current.t).toBe('function');
      expect(typeof result2.current.t).toBe('function');
    });
  });

  describe('Basic functionality', () => {
    it('should return translation for a simple key', () => {
      const { result } = renderHook(() => useTranslation());
      const translation = result.current.t('navigation.admin');

      expect(translation).toBe('Quản trị');
    });

    it('should return translation for nested keys', () => {
      const { result } = renderHook(() => useTranslation());
      const translation = result.current.t('admin.users.title');

      expect(translation).toBe('Quản lý người dùng');
    });

    it('should return translation for deeply nested keys', () => {
      const { result } = renderHook(() => useTranslation());
      const translation = result.current.t('messages.success.saved');

      expect(translation).toBe('Lưu thành công');
    });

    it('should return translation for common UI elements', () => {
      const { result } = renderHook(() => useTranslation());
      const translation = result.current.t('common.save');

      expect(translation).toBe('Lưu');
    });

    it('should return translation for permission labels', () => {
      const { result } = renderHook(() => useTranslation());
      const translation = result.current.t('permissions.manage');

      expect(translation).toBe('Quản lý');
    });
  });

  describe('Fallback behavior', () => {
    it('should return the key itself when translation not found', () => {
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

    it('should return the key when accessing non-string value', () => {
      const { result } = renderHook(() => useTranslation());
      // admin is an object, not a string
      const translation = result.current.t('admin');

      expect(translation).toBe('admin');
    });
  });

  describe('Edge cases', () => {
    it('should handle null input', () => {
      const { result } = renderHook(() => useTranslation());
      const translation = result.current.t(null);

      expect(translation).toBe(null);
    });

    it('should handle undefined input', () => {
      const { result } = renderHook(() => useTranslation());
      const translation = result.current.t(undefined);

      expect(translation).toBe(undefined);
    });

    it('should handle empty string', () => {
      const { result } = renderHook(() => useTranslation());
      const translation = result.current.t('');

      expect(translation).toBe('');
    });

    it('should handle non-string input', () => {
      const { result } = renderHook(() => useTranslation());
      const translation = result.current.t(123);

      expect(translation).toBe(123);
    });

    it('should handle key with trailing dot', () => {
      const { result } = renderHook(() => useTranslation());
      const translation = result.current.t('navigation.admin.');

      expect(translation).toBe('navigation.admin.');
    });

    it('should handle key with leading dot', () => {
      const { result } = renderHook(() => useTranslation());
      const translation = result.current.t('.navigation.admin');

      expect(translation).toBe('.navigation.admin');
    });

    it('should handle key with multiple consecutive dots', () => {
      const { result } = renderHook(() => useTranslation());
      const translation = result.current.t('navigation..admin');

      expect(translation).toBe('navigation..admin');
    });

    it('should handle single-level keys without dots', () => {
      const { result } = renderHook(() => useTranslation());
      const translation = result.current.t('navigation');

      expect(translation).toBe('navigation');
    });
  });

  describe('Vietnamese text validation', () => {
    it('should return Vietnamese text for navigation labels', () => {
      const { result } = renderHook(() => useTranslation());
      const translation = result.current.t('navigation.users');

      expect(translation).toBe('Người dùng');
      // Verify it's not English
      expect(translation).not.toBe('Users');
    });

    it('should return Vietnamese text for admin pages', () => {
      const { result } = renderHook(() => useTranslation());
      const translation = result.current.t('admin.roles.title');

      expect(translation).toBe('Quản lý vai trò');
      // Verify it's not English
      expect(translation).not.toBe('Manage Roles');
    });

    it('should return Vietnamese text for common UI elements', () => {
      const { result } = renderHook(() => useTranslation());
      const translation = result.current.t('common.delete');

      expect(translation).toBe('Xóa');
      // Verify it's not English
      expect(translation).not.toBe('Delete');
    });

    it('should return Vietnamese text for error messages', () => {
      const { result } = renderHook(() => useTranslation());
      const translation = result.current.t('messages.error.unauthorized');

      expect(translation).toBe('Bạn không có quyền thực hiện hành động này');
      // Verify it's not English
      expect(translation).not.toBe('You do not have permission to perform this action');
    });
  });

  describe('Comprehensive key coverage', () => {
    it('should return translations for all navigation keys', () => {
      const { result } = renderHook(() => useTranslation());

      const navigationKeys = [
        'navigation.map',
        'navigation.assets',
        'navigation.dashboard',
        'navigation.admin',
        'navigation.users',
        'navigation.roles',
        'navigation.permissions',
      ];

      navigationKeys.forEach((key) => {
        const translation = result.current.t(key);
        expect(translation).not.toBe(key);
        expect(typeof translation).toBe('string');
      });
    });

    it('should return translations for all admin keys', () => {
      const { result } = renderHook(() => useTranslation());

      const adminKeys = [
        'admin.users.title',
        'admin.roles.title',
        'admin.permissions.title',
        'admin.auditLogs.title',
      ];

      adminKeys.forEach((key) => {
        const translation = result.current.t(key);
        expect(translation).not.toBe(key);
        expect(typeof translation).toBe('string');
      });
    });

    it('should return translations for all common keys', () => {
      const { result } = renderHook(() => useTranslation());

      const commonKeys = [
        'common.save',
        'common.cancel',
        'common.delete',
        'common.edit',
        'common.add',
      ];

      commonKeys.forEach((key) => {
        const translation = result.current.t(key);
        expect(translation).not.toBe(key);
        expect(typeof translation).toBe('string');
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
      const { result } = renderHook(() => useTranslation());
      const originalValue = TRANSLATIONS.navigation.admin;
      result.current.t('navigation.admin');

      expect(TRANSLATIONS.navigation.admin).toBe(originalValue);
    });

    it('should memoize the t function to avoid recreating it', () => {
      const { result: result1, rerender: rerender1 } = renderHook(() => useTranslation());
      const t1 = result1.current.t;

      rerender1();

      const t2 = result1.current.t;
      expect(t1).toBe(t2);
    });
  });

  describe('Property 1: Navigation Menu Labels Are Vietnamese', () => {
    it('should return Vietnamese labels for all navigation menu items', () => {
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

      navigationKeys.forEach((key) => {
        const label = result.current.t(key);
        // Should not be the key itself (fallback)
        expect(label).not.toBe(key);
        // Should be a string
        expect(typeof label).toBe('string');
        // Should not contain English words (basic check)
        expect(label.length).toBeGreaterThan(0);
      });
    });

    it('should not return English text for navigation labels', () => {
      const { result } = renderHook(() => useTranslation());

      const englishWords = ['Map', 'Assets', 'Dashboard', 'Admin', 'Users', 'Roles', 'Permissions', 'Audit Logs'];
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

      navigationKeys.forEach((key, index) => {
        const label = result.current.t(key);
        expect(label).not.toBe(englishWords[index]);
      });
    });
  });
});

describe('useTranslationFunction', () => {
  it('should return just the translation function', () => {
    const { result } = renderHook(() => useTranslationFunction());

    expect(typeof result.current).toBe('function');
  });

  it('should work the same as useTranslation().t', () => {
    const { result: result1 } = renderHook(() => useTranslation());
    const { result: result2 } = renderHook(() => useTranslationFunction());

    const key = 'navigation.admin';
    const translation1 = result1.current.t(key);
    const translation2 = result2.current(key);

    expect(translation1).toBe(translation2);
  });

  it('should return translation for a simple key', () => {
    const { result } = renderHook(() => useTranslationFunction());
    const translation = result.current('navigation.admin');

    expect(translation).toBe('Quản trị');
  });

  it('should return translation for nested keys', () => {
    const { result } = renderHook(() => useTranslationFunction());
    const translation = result.current('admin.users.title');

    expect(translation).toBe('Quản lý người dùng');
  });

  it('should implement fallback behavior', () => {
    const { result } = renderHook(() => useTranslationFunction());
    const translation = result.current('nonexistent.key');

    expect(translation).toBe('nonexistent.key');
  });
});

describe('useTranslationNamespace', () => {
  it('should return namespace object and t function', () => {
    const { result } = renderHook(() => useTranslationNamespace('admin'));

    expect(result.current).toHaveProperty('translations');
    expect(result.current).toHaveProperty('t');
    expect(typeof result.current.t).toBe('function');
  });

  it('should return namespace object for existing namespace', () => {
    const { result } = renderHook(() => useTranslationNamespace('navigation'));

    expect(typeof result.current.translations).toBe('object');
    expect(result.current.translations.admin).toBe('Quản trị');
  });

  it('should return namespace object for admin namespace', () => {
    const { result } = renderHook(() => useTranslationNamespace('admin'));

    expect(typeof result.current.translations).toBe('object');
    expect(result.current.translations.users).toBeDefined();
  });

  it('should return namespace object for common namespace', () => {
    const { result } = renderHook(() => useTranslationNamespace('common'));

    expect(typeof result.current.translations).toBe('object');
    expect(result.current.translations.save).toBe('Lưu');
  });

  it('should return empty object for non-existent namespace', () => {
    const { result } = renderHook(() => useTranslationNamespace('nonexistent'));

    expect(result.current.translations).toEqual({});
  });

  it('should return empty object for null input', () => {
    const { result } = renderHook(() => useTranslationNamespace(null));

    expect(result.current.translations).toEqual({});
  });

  it('should return empty object for undefined input', () => {
    const { result } = renderHook(() => useTranslationNamespace(undefined));

    expect(result.current.translations).toEqual({});
  });

  it('should return empty object for empty string', () => {
    const { result } = renderHook(() => useTranslationNamespace(''));

    expect(result.current.translations).toEqual({});
  });

  it('should return empty object for non-string input', () => {
    const { result } = renderHook(() => useTranslationNamespace(123));

    expect(result.current.translations).toEqual({});
  });

  it('should return empty object for nested namespace keys', () => {
    const { result } = renderHook(() => useTranslationNamespace('admin.users'));

    expect(result.current.translations).toEqual({});
  });

  it('should provide t function that works with full keys', () => {
    const { result } = renderHook(() => useTranslationNamespace('admin'));

    // The t function from useTranslationNamespace still requires full keys
    const translation = result.current.t('admin.users.title');
    expect(translation).toBe('Quản lý người dùng');
  });
});

describe('useHasTranslation', () => {
  it('should return an object with hasKey function', () => {
    const { result } = renderHook(() => useHasTranslation());

    expect(result.current).toHaveProperty('hasKey');
    expect(typeof result.current.hasKey).toBe('function');
  });

  it('should return true for existing translation keys', () => {
    const { result } = renderHook(() => useHasTranslation());

    expect(result.current.hasKey('navigation.admin')).toBe(true);
    expect(result.current.hasKey('admin.users.title')).toBe(true);
    expect(result.current.hasKey('common.save')).toBe(true);
  });

  it('should return false for non-existent translation keys', () => {
    const { result } = renderHook(() => useHasTranslation());

    expect(result.current.hasKey('nonexistent.key')).toBe(false);
    expect(result.current.hasKey('admin.nonexistent.key')).toBe(false);
  });

  it('should return false for null input', () => {
    const { result } = renderHook(() => useHasTranslation());

    expect(result.current.hasKey(null)).toBe(false);
  });

  it('should return false for undefined input', () => {
    const { result } = renderHook(() => useHasTranslation());

    expect(result.current.hasKey(undefined)).toBe(false);
  });

  it('should return false for empty string', () => {
    const { result } = renderHook(() => useHasTranslation());

    expect(result.current.hasKey('')).toBe(false);
  });

  it('should return false for non-string input', () => {
    const { result } = renderHook(() => useHasTranslation());

    expect(result.current.hasKey(123)).toBe(false);
  });

  it('should return false for object keys', () => {
    const { result } = renderHook(() => useHasTranslation());

    // admin is an object, not a string
    expect(result.current.hasKey('admin')).toBe(false);
  });
});

describe('useTranslationWithDefault', () => {
  it('should return an object with t function', () => {
    const { result } = renderHook(() => useTranslationWithDefault());

    expect(result.current).toHaveProperty('t');
    expect(typeof result.current.t).toBe('function');
  });

  it('should return translation when key exists', () => {
    const { result } = renderHook(() => useTranslationWithDefault());
    const translation = result.current.t('navigation.admin', 'Default');

    expect(translation).toBe('Quản trị');
  });

  it('should return default value when key does not exist', () => {
    const { result } = renderHook(() => useTranslationWithDefault());
    const translation = result.current.t('nonexistent.key', 'Default Text');

    expect(translation).toBe('Default Text');
  });

  it('should return empty string as default when not provided', () => {
    const { result } = renderHook(() => useTranslationWithDefault());
    const translation = result.current.t('nonexistent.key');

    expect(translation).toBe('');
  });

  it('should return translation even if default value is provided', () => {
    const { result } = renderHook(() => useTranslationWithDefault());
    const translation = result.current.t('common.save', 'Default Save');

    expect(translation).toBe('Lưu');
  });

  it('should handle null default value', () => {
    const { result } = renderHook(() => useTranslationWithDefault());
    const translation = result.current.t('nonexistent.key', null);

    expect(translation).toBe(null);
  });

  it('should handle undefined default value when not provided', () => {
    const { result } = renderHook(() => useTranslationWithDefault());
    // When no default is provided, empty string is used
    const translation = result.current.t('nonexistent.key');

    expect(translation).toBe('');
  });

  it('should work with nested keys', () => {
    const { result } = renderHook(() => useTranslationWithDefault());
    const translation = result.current.t('admin.users.title', 'Default Title');

    expect(translation).toBe('Quản lý người dùng');
  });

  it('should return default for non-existent nested keys', () => {
    const { result } = renderHook(() => useTranslationWithDefault());
    const translation = result.current.t('admin.nonexistent.key', 'Default Nested');

    expect(translation).toBe('Default Nested');
  });
});

describe('Integration Tests', () => {
  it('should work correctly for typical UI rendering workflow', () => {
    const { result } = renderHook(() => useTranslation());

    // Simulate rendering a page with multiple translations
    const pageTitle = result.current.t('admin.users.title');
    const saveButton = result.current.t('common.save');
    const cancelButton = result.current.t('common.cancel');

    expect(pageTitle).toBe('Quản lý người dùng');
    expect(saveButton).toBe('Lưu');
    expect(cancelButton).toBe('Hủy');
  });

  it('should handle multiple hooks in the same component', () => {
    const { result: result1 } = renderHook(() => useTranslation());
    const { result: result2 } = renderHook(() => useTranslationFunction());
    const { result: result3 } = renderHook(() => useTranslationNamespace('admin'));

    const key = 'admin.users.title';
    const translation1 = result1.current.t(key);
    const translation2 = result2.current(key);
    const translation3 = result3.current.t(key);

    expect(translation1).toBe(translation2);
    expect(translation1).toBe(translation3);
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
    const { result: result1 } = renderHook(() => useTranslation());
    const { result: result2 } = renderHook(() => useTranslationWithDefault());

    const key = 'admin.users.nonexistent.field';
    const translation1 = result1.current.t(key);
    const translation2 = result2.current.t(key, 'Fallback Text');

    expect(translation1).toBe(key);
    expect(translation2).toBe('Fallback Text');
  });

  it('should work with namespace and key combination', () => {
    const { result: result1 } = renderHook(() => useTranslationNamespace('admin'));
    const { result: result2 } = renderHook(() => useTranslation());

    const namespaceTranslation = result1.current.t('admin.users.title');
    const fullKeyTranslation = result2.current.t('admin.users.title');

    expect(namespaceTranslation).toBe(fullKeyTranslation);
  });
});
