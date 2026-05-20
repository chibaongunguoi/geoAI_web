/**
 * React hook for accessing Vietnamese translations on the client side
 * Provides a `t()` function for accessing translations with nested key support
 * 
 * Usage:
 *   const { t } = useTranslation();
 *   t('navigation.admin') // Returns "Quản trị"
 *   t('admin.users.title') // Returns "Quản lý người dùng"
 *   t('unknown.key') // Returns "unknown.key" (fallback)
 */

'use client';

import { useMemo } from 'react';
import { TRANSLATIONS } from './translations';

/**
 * React hook for accessing translations
 * 
 * @returns {Object} Object containing the `t` function for translation access
 * @returns {Function} t - Function to get translation for a given key
 * 
 * @example
 * const { t } = useTranslation();
 * const label = t('navigation.admin'); // "Quản trị"
 * const title = t('admin.users.title'); // "Quản lý người dùng"
 * const fallback = t('nonexistent.key'); // "nonexistent.key"
 */
export function useTranslation() {
  // Memoize the translation function to avoid recreating it on every render
  const t = useMemo(() => {
    return (key) => {
      if (!key || typeof key !== 'string') {
        return key;
      }

      // Split the key by dots to support nested access
      const keys = key.split('.');
      let value = TRANSLATIONS;

      // Traverse the nested object structure
      for (const k of keys) {
        if (value && typeof value === 'object' && k in value) {
          value = value[k];
        } else {
          // If any key in the path is not found, return the original key as fallback
          return key;
        }
      }

      // Return the found value if it's a string, otherwise return the key as fallback
      return typeof value === 'string' ? value : key;
    };
  }, []);

  return { t };
}

/**
 * Alternative hook that returns just the translation function
 * Useful when you only need the function without destructuring
 * 
 * @returns {Function} Function to get translation for a given key
 * 
 * @example
 * const t = useTranslationFunction();
 * const label = t('navigation.admin'); // "Quản trị"
 */
export function useTranslationFunction() {
  const { t } = useTranslation();
  return t;
}

/**
 * Hook for getting translations for a specific namespace
 * 
 * @param {string} namespace - The namespace key (e.g., 'admin', 'common')
 * @returns {Object} Object containing the namespace translations and the `t` function
 * @returns {Object} translations - The translations object for the namespace
 * @returns {Function} t - Function to get translation for a given key
 * 
 * @example
 * const { translations, t } = useTranslationNamespace('admin');
 * const userTitle = translations.users.title; // "Quản lý người dùng"
 * const userTitle2 = t('users.title'); // "Quản lý người dùng"
 */
export function useTranslationNamespace(namespace) {
  const { t } = useTranslation();

  const translations = useMemo(() => {
    if (!namespace || typeof namespace !== 'string') {
      return {};
    }

    const value = TRANSLATIONS[namespace];
    return typeof value === 'object' ? value : {};
  }, [namespace]);

  return { translations, t };
}

/**
 * Hook for checking if a translation key exists
 * 
 * @returns {Object} Object containing the `hasKey` function
 * @returns {Function} hasKey - Function to check if a translation key exists
 * 
 * @example
 * const { hasKey } = useHasTranslation();
 * hasKey('navigation.admin') // true
 * hasKey('unknown.key') // false
 */
export function useHasTranslation() {
  const hasKey = useMemo(() => {
    return (key) => {
      if (!key || typeof key !== 'string') {
        return false;
      }

      const keys = key.split('.');
      let value = TRANSLATIONS;

      for (const k of keys) {
        if (value && typeof value === 'object' && k in value) {
          value = value[k];
        } else {
          return false;
        }
      }

      return typeof value === 'string';
    };
  }, []);

  return { hasKey };
}

/**
 * Hook for getting translation with a default value fallback
 * 
 * @returns {Object} Object containing the `t` function
 * @returns {Function} t - Function to get translation with default value fallback
 * 
 * @example
 * const { t } = useTranslationWithDefault();
 * const label = t('unknown.key', 'Default Text'); // "Default Text"
 * const label2 = t('navigation.admin', 'Admin'); // "Quản trị"
 */
export function useTranslationWithDefault() {
  const { t: baseT } = useTranslation();

  const t = useMemo(() => {
    return (key, defaultValue = '') => {
      const translation = baseT(key);
      // If translation returns the key itself (not found), use the default value
      return translation === key ? defaultValue : translation;
    };
  }, [baseT]);

  return { t };
}
