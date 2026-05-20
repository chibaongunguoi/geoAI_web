/**
 * Server-side translation utility for accessing Vietnamese translations
 * Supports nested key access with fallback behavior
 * 
 * Usage:
 *   getTranslation('navigation.admin') // Returns "Quản trị"
 *   getTranslation('admin.users.title') // Returns "Quản lý người dùng"
 *   getTranslation('unknown.key') // Returns "unknown.key" (fallback)
 */

import { TRANSLATIONS } from './translations';

/**
 * Get translation for a given key with nested access support
 * 
 * @param {string} key - The translation key (supports dot notation for nested access)
 * @returns {string} The translated text or the key itself if translation not found
 * 
 * @example
 * getTranslation('navigation.admin') // "Quản trị"
 * getTranslation('admin.users.title') // "Quản lý người dùng"
 * getTranslation('common.save') // "Lưu"
 * getTranslation('nonexistent.key') // "nonexistent.key" (fallback)
 */
export function getTranslation(key) {
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
}

/**
 * Get translation with default value fallback
 * 
 * @param {string} key - The translation key
 * @param {string} defaultValue - The default value to return if translation not found
 * @returns {string} The translated text or the default value
 * 
 * @example
 * getTranslationWithDefault('unknown.key', 'Default Text') // "Default Text"
 * getTranslationWithDefault('navigation.admin', 'Admin') // "Quản trị"
 */
export function getTranslationWithDefault(key, defaultValue = '') {
  const translation = getTranslation(key);
  // If translation returns the key itself (not found), use the default value
  return translation === key ? defaultValue : translation;
}

/**
 * Check if a translation key exists
 * 
 * @param {string} key - The translation key
 * @returns {boolean} True if the translation exists, false otherwise
 * 
 * @example
 * hasTranslation('navigation.admin') // true
 * hasTranslation('unknown.key') // false
 */
export function hasTranslation(key) {
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
}

/**
 * Get all translations for a namespace
 * 
 * @param {string} namespace - The namespace key (e.g., 'admin', 'common')
 * @returns {object} The translations object for the namespace or empty object if not found
 * 
 * @example
 * getTranslationNamespace('admin') // { users: { title: "Quản lý người dùng", ... }, ... }
 * getTranslationNamespace('unknown') // {}
 */
export function getTranslationNamespace(namespace) {
  if (!namespace || typeof namespace !== 'string') {
    return {};
  }

  const value = TRANSLATIONS[namespace];
  return typeof value === 'object' ? value : {};
}
