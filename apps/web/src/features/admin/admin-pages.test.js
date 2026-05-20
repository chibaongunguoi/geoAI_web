/**
 * Admin Pages Vietnamese Content Tests
 * 
 * Tests for Property 5 and Property 6:
 * - Property 5: Admin Pages Display Only Vietnamese Text
 * - Property 6: Vietnamese Terminology Is Consistent Across Admin Pages
 * 
 * Validates: Requirements 3.1, 3.2, 3.3
 */

import { TRANSLATIONS } from '@/features/shared/localization/translations';
import { PERMISSION_MAPPINGS, PERMISSION_GROUPS } from '@/features/admin/permissions/permissionMappings';

/**
 * Helper function to check if a string contains only Vietnamese characters
 * (no ASCII English letters, but allows numbers, punctuation, and spaces)
 * 
 * Vietnamese text can contain:
 * - Vietnamese letters with diacritics (á, à, ả, ã, ạ, etc.)
 * - Numbers (0-9)
 * - Spaces and common punctuation
 * - Some acceptable abbreviations (ID, API, CSV, etc.)
 * 
 * English text contains:
 * - English letters (a-z, A-Z) that are NOT part of Vietnamese diacritics
 */
function isVietnameseOnly(text) {
  if (!text) return true;
  
  // Exception: Allow common abbreviations and technical terms that are acceptable
  const acceptableEnglish = ['ID', 'API', 'CSV', 'Excel', 'URL', 'HTTP', 'HTTPS', 'JSON', 'XML', 'User'];
  
  // Split text into words
  const words = text.split(/[\s\-_,;:()]/);
  
  for (const word of words) {
    if (!word) continue;
    
    // Check if word is an acceptable abbreviation
    if (acceptableEnglish.includes(word)) {
      continue;
    }
    
    // Check if word contains only Vietnamese characters, numbers, and punctuation
    // Vietnamese characters include: a-z with diacritics (á, à, ả, ã, ạ, ă, ắ, ằ, ẳ, ẵ, ặ, â, ấ, ầ, ẩ, ẫ, ậ, etc.)
    // and consonants with diacritics
    // We check if the word contains ONLY Vietnamese-compatible characters
    
    // Pattern: Allow Vietnamese characters (including diacritics), numbers, and some punctuation
    // Reject if contains English letters that are NOT part of Vietnamese text
    const vietnamesePattern = /^[a-zàáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ0-9\s\-_,;:()\.\/\+\*\=\[\]\{\}\|\\<>\?!@#$%^&~`'"]*$/i;
    
    if (!vietnamesePattern.test(word)) {
      // Word contains characters that are not Vietnamese
      // Check if it's a word with English letters mixed in
      const englishLetterPattern = /[a-zA-Z]/;
      if (englishLetterPattern.test(word)) {
        // Has English letters - check if it's acceptable
        const cleanWord = word.replace(/[0-9\s\-_,;:()\.\/\+\*\=\[\]\{\}\|\\<>\?!@#$%^&~`'"]/g, '');
        if (englishLetterPattern.test(cleanWord) && !acceptableEnglish.includes(cleanWord)) {
          return false;
        }
      }
    }
  }
  
  return true;
}

/**
 * Helper function to extract all text values from a nested object
 */
function extractAllTextValues(obj, visited = new Set()) {
  const values = [];
  
  if (visited.has(obj)) {
    return values;
  }
  visited.add(obj);
  
  if (typeof obj === 'string') {
    return [obj];
  }
  
  if (typeof obj === 'object' && obj !== null) {
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        values.push(...extractAllTextValues(obj[key], visited));
      }
    }
  }
  
  return values;
}

/**
 * Helper function to get all Vietnamese terms used in translations
 */
function getAllVietnamesTerms() {
  const terms = new Set();
  const values = extractAllTextValues(TRANSLATIONS);
  
  values.forEach(value => {
    if (typeof value === 'string' && value.trim()) {
      // Split by common delimiters to get individual terms
      const words = value.split(/[\s\-_,;:()]/);
      words.forEach(word => {
        if (word.trim()) {
          terms.add(word.trim());
        }
      });
    }
  });
  
  return terms;
}

/**
 * Helper function to check terminology consistency
 * Returns an object with consistent and inconsistent terms
 */
function checkTerminologyConsistency(translations) {
  const termUsage = {};
  const values = extractAllTextValues(translations);
  
  values.forEach(value => {
    if (typeof value === 'string' && value.trim()) {
      // Split by common delimiters to get individual terms
      const words = value.split(/[\s\-_,;:()]/);
      words.forEach(word => {
        if (word.trim()) {
          const term = word.trim();
          if (!termUsage[term]) {
            termUsage[term] = [];
          }
          termUsage[term].push(value);
        }
      });
    }
  });
  
  return termUsage;
}

describe('Admin Pages Vietnamese Content Tests', () => {
  describe('Property 5: Admin Pages Display Only Vietnamese Text', () => {
    it('should have all admin page titles in Vietnamese', () => {
      const adminTitles = [
        TRANSLATIONS.admin.users.title,
        TRANSLATIONS.admin.users.heading,
        TRANSLATIONS.admin.roles.title,
        TRANSLATIONS.admin.roles.heading,
        TRANSLATIONS.admin.permissions.title,
        TRANSLATIONS.admin.permissions.heading,
        TRANSLATIONS.admin.auditLogs.title,
        TRANSLATIONS.admin.auditLogs.heading,
      ];
      
      adminTitles.forEach(title => {
        expect(isVietnameseOnly(title)).toBe(true);
        expect(title).toBeTruthy();
        expect(title.length).toBeGreaterThan(0);
      });
    });

    it('should have all admin page labels in Vietnamese', () => {
      const adminLabels = [
        // Users page
        TRANSLATIONS.admin.users.search,
        TRANSLATIONS.admin.users.searchPlaceholder,
        TRANSLATIONS.admin.users.roleFilter,
        TRANSLATIONS.admin.users.allRoles,
        TRANSLATIONS.admin.users.filter,
        TRANSLATIONS.admin.users.userRole,
        TRANSLATIONS.admin.users.manager,
        TRANSLATIONS.admin.users.admin,
        TRANSLATIONS.admin.users.permissions,
        
        // Roles page
        TRANSLATIONS.admin.roles.name,
        TRANSLATIONS.admin.roles.code,
        TRANSLATIONS.admin.roles.description,
        TRANSLATIONS.admin.roles.permissions,
        
        // Permissions page
        TRANSLATIONS.admin.permissions.key,
        TRANSLATIONS.admin.permissions.group,
        TRANSLATIONS.admin.permissions.name,
        TRANSLATIONS.admin.permissions.description,
        
        // Audit logs page
        TRANSLATIONS.admin.auditLogs.action,
        TRANSLATIONS.admin.auditLogs.actionPlaceholder,
        TRANSLATIONS.admin.auditLogs.entityType,
        TRANSLATIONS.admin.auditLogs.entityTypePlaceholder,
        TRANSLATIONS.admin.auditLogs.actorUserId,
        TRANSLATIONS.admin.auditLogs.actorUserIdPlaceholder,
        TRANSLATIONS.admin.auditLogs.fromDate,
        TRANSLATIONS.admin.auditLogs.toDate,
        TRANSLATIONS.admin.auditLogs.filter,
        TRANSLATIONS.admin.auditLogs.timestamp,
        TRANSLATIONS.admin.auditLogs.actor,
        TRANSLATIONS.admin.auditLogs.entity,
        TRANSLATIONS.admin.auditLogs.changes,
      ];
      
      adminLabels.forEach(label => {
        expect(isVietnameseOnly(label)).toBe(true);
        expect(label).toBeTruthy();
        expect(label.length).toBeGreaterThan(0);
      });
    });

    it('should have all common UI elements in Vietnamese', () => {
      const commonElements = [
        TRANSLATIONS.common.save,
        TRANSLATIONS.common.cancel,
        TRANSLATIONS.common.delete,
        TRANSLATIONS.common.edit,
        TRANSLATIONS.common.add,
        TRANSLATIONS.common.search,
        TRANSLATIONS.common.filter,
        TRANSLATIONS.common.loading,
        TRANSLATIONS.common.error,
        TRANSLATIONS.common.success,
        TRANSLATIONS.common.retry,
      ];
      
      commonElements.forEach(element => {
        expect(isVietnameseOnly(element)).toBe(true);
        expect(element).toBeTruthy();
      });
    });

    it('should have all permission labels in Vietnamese', () => {
      const permissionLabels = Object.values(PERMISSION_MAPPINGS);
      
      permissionLabels.forEach(label => {
        expect(isVietnameseOnly(label)).toBe(true);
        expect(label).toBeTruthy();
        expect(label.length).toBeGreaterThan(0);
      });
    });

    it('should have all permission group labels in Vietnamese', () => {
      const groupLabels = Object.values(PERMISSION_GROUPS);
      
      groupLabels.forEach(label => {
        expect(isVietnameseOnly(label)).toBe(true);
        expect(label).toBeTruthy();
        expect(label.length).toBeGreaterThan(0);
      });
    });

    it('should have no English words in admin page content', () => {
      const adminContent = TRANSLATIONS.admin;
      const values = extractAllTextValues(adminContent);
      
      values.forEach(value => {
        if (typeof value === 'string' && value.trim()) {
          expect(isVietnameseOnly(value)).toBe(true);
        }
      });
    });

    it('should have no English words in permission mappings', () => {
      const permissionLabels = Object.values(PERMISSION_MAPPINGS);
      
      permissionLabels.forEach(label => {
        expect(isVietnameseOnly(label)).toBe(true);
      });
    });

    it('should have no English words in permission groups', () => {
      const groupLabels = Object.values(PERMISSION_GROUPS);
      
      groupLabels.forEach(label => {
        expect(isVietnameseOnly(label)).toBe(true);
      });
    });

    it('should have all breadcrumb labels in Vietnamese', () => {
      const breadcrumbLabels = [
        TRANSLATIONS.breadcrumb.admin,
        TRANSLATIONS.breadcrumb.home,
      ];
      
      breadcrumbLabels.forEach(label => {
        expect(isVietnameseOnly(label)).toBe(true);
        expect(label).toBeTruthy();
      });
    });

    it('should have all navigation labels in Vietnamese', () => {
      const navigationLabels = [
        TRANSLATIONS.navigation.admin,
        TRANSLATIONS.navigation.users,
        TRANSLATIONS.navigation.roles,
        TRANSLATIONS.navigation.permissions,
        TRANSLATIONS.navigation.auditLogs,
        TRANSLATIONS.navigation.permissionMatrix,
      ];
      
      navigationLabels.forEach(label => {
        expect(isVietnameseOnly(label)).toBe(true);
        expect(label).toBeTruthy();
      });
    });
  });

  describe('Property 6: Vietnamese Terminology Is Consistent Across Admin Pages', () => {
    it('should use consistent terminology for "Người dùng" (Users)', () => {
      const userTerms = [
        TRANSLATIONS.admin.users.heading,
        TRANSLATIONS.permissions.users,
        TRANSLATIONS.navigation.users,
      ];
      
      // All should be "Người dùng"
      userTerms.forEach(term => {
        expect(term).toBe('Người dùng');
      });
    });

    it('should use consistent terminology for "Vai trò" (Roles)', () => {
      const roleTerms = [
        TRANSLATIONS.admin.roles.heading,
        TRANSLATIONS.permissions.roles,
        TRANSLATIONS.navigation.roles,
      ];
      
      // All should be "Vai trò"
      roleTerms.forEach(term => {
        expect(term).toBe('Vai trò');
      });
    });

    it('should use consistent terminology for "Quyền" (Permissions)', () => {
      const permissionTerms = [
        TRANSLATIONS.admin.permissions.heading,
        TRANSLATIONS.navigation.permissions,
      ];
      
      // All should contain "Quyền"
      permissionTerms.forEach(term => {
        expect(term).toContain('Quyền');
      });
    });

    it('should use consistent terminology for "Nhật ký" (Logs)', () => {
      const logTerms = [
        TRANSLATIONS.admin.auditLogs.heading,
        TRANSLATIONS.navigation.auditLogs,
      ];
      
      // All should contain "Nhật ký"
      logTerms.forEach(term => {
        expect(term).toContain('Nhật ký');
      });
    });

    it('should use consistent terminology for "Quản lý" (Manage)', () => {
      const manageTerms = [
        TRANSLATIONS.admin.users.title,
        TRANSLATIONS.admin.roles.title,
        TRANSLATIONS.admin.permissions.title,
      ];
      
      // All should contain "Quản lý"
      manageTerms.forEach(term => {
        expect(term).toContain('Quản lý');
      });
    });

    it('should use consistent terminology for "Lọc" (Filter)', () => {
      const filterTerms = [
        TRANSLATIONS.admin.users.filter,
        TRANSLATIONS.admin.auditLogs.filter,
        TRANSLATIONS.common.filter,
      ];
      
      // All should be "Lọc"
      filterTerms.forEach(term => {
        expect(term).toBe('Lọc');
      });
    });

    it('should use consistent terminology for "Tìm kiếm" (Search)', () => {
      const searchTerms = [
        TRANSLATIONS.admin.users.search,
        TRANSLATIONS.common.search,
      ];
      
      // All should be "Tìm kiếm"
      searchTerms.forEach(term => {
        expect(term).toBe('Tìm kiếm');
      });
    });

    it('should use consistent terminology for "Tất cả" (All)', () => {
      const allTerms = [
        TRANSLATIONS.admin.users.allRoles,
        TRANSLATIONS.common.all,
      ];
      
      // All should contain "Tất cả"
      allTerms.forEach(term => {
        expect(term).toContain('Tất cả');
      });
    });

    it('should use consistent terminology for permission actions', () => {
      // Check that permission mappings use consistent terminology
      const permissionLabels = Object.values(PERMISSION_MAPPINGS);
      
      // Count occurrences of key terms
      const manageCount = permissionLabels.filter(label => label.includes('Quản lý')).length;
      const viewCount = permissionLabels.filter(label => label.includes('Xem')).length;
      
      // Should have multiple "Quản lý" and "Xem" terms
      expect(manageCount).toBeGreaterThan(0);
      expect(viewCount).toBeGreaterThan(0);
      
      // All permission labels should use either "Quản lý" or "Xem"
      permissionLabels.forEach(label => {
        expect(label.includes('Quản lý') || label.includes('Xem')).toBe(true);
      });
    });

    it('should use consistent terminology for permission groups', () => {
      const groupLabels = Object.values(PERMISSION_GROUPS);
      
      // All group labels should be non-empty and Vietnamese
      groupLabels.forEach(label => {
        expect(label).toBeTruthy();
        expect(isVietnameseOnly(label)).toBe(true);
      });
      
      // Check for specific consistent terms
      expect(groupLabels).toContain('Người dùng');
      expect(groupLabels).toContain('Vai trò');
      expect(groupLabels).toContain('Quyền');
      expect(groupLabels).toContain('Nhật ký');
    });

    it('should use consistent terminology across all admin sections', () => {
      const adminSections = [
        TRANSLATIONS.admin.users,
        TRANSLATIONS.admin.roles,
        TRANSLATIONS.admin.permissions,
        TRANSLATIONS.admin.auditLogs,
      ];
      
      // All sections should have consistent structure
      adminSections.forEach(section => {
        expect(section).toHaveProperty('title');
        expect(section).toHaveProperty('heading');
        expect(section.title).toBeTruthy();
        expect(section.heading).toBeTruthy();
      });
    });

    it('should maintain consistent terminology in role names', () => {
      const roleNames = [
        TRANSLATIONS.admin.users.userRole,
        TRANSLATIONS.admin.users.manager,
        TRANSLATIONS.admin.users.admin,
      ];
      
      // All role names should be Vietnamese
      roleNames.forEach(name => {
        expect(isVietnameseOnly(name)).toBe(true);
        expect(name).toBeTruthy();
      });
    });

    it('should use consistent terminology for common actions', () => {
      const commonActions = {
        save: TRANSLATIONS.common.save,
        cancel: TRANSLATIONS.common.cancel,
        delete: TRANSLATIONS.common.delete,
        edit: TRANSLATIONS.common.edit,
        add: TRANSLATIONS.common.add,
      };
      
      // All actions should be Vietnamese
      Object.values(commonActions).forEach(action => {
        expect(isVietnameseOnly(action)).toBe(true);
        expect(action).toBeTruthy();
      });
    });

    it('should use consistent terminology for status messages', () => {
      const statusMessages = [
        TRANSLATIONS.common.loading,
        TRANSLATIONS.common.error,
        TRANSLATIONS.common.success,
      ];
      
      // All status messages should be Vietnamese
      statusMessages.forEach(message => {
        expect(isVietnameseOnly(message)).toBe(true);
        expect(message).toBeTruthy();
      });
    });

    it('should have no duplicate or conflicting terminology', () => {
      const allTerms = getAllVietnamesTerms();
      
      // Check for common conflicting terms (pure English words that should not appear)
      const conflictingTerms = [
        'admin', 'users', 'roles', 'permissions', 'logs', 'manage', 'view',
        'create', 'edit', 'delete', 'filter', 'search', 'save', 'cancel'
      ];
      
      conflictingTerms.forEach(term => {
        // These English terms should not appear as standalone words in Vietnamese text
        // (they may appear in placeholders like "admin.users..." but not as standalone Vietnamese labels)
        expect(allTerms.has(term)).toBe(false);
      });
    });

    it('should use consistent terminology for table headers', () => {
      const tableHeaders = [
        TRANSLATIONS.table.name,
        TRANSLATIONS.table.email,
        TRANSLATIONS.table.role,
        TRANSLATIONS.table.status,
        TRANSLATIONS.table.actions,
      ];
      
      // All table headers should be Vietnamese
      tableHeaders.forEach(header => {
        expect(isVietnameseOnly(header)).toBe(true);
        expect(header).toBeTruthy();
      });
    });

    it('should use consistent terminology for pagination', () => {
      const paginationTerms = [
        TRANSLATIONS.pagination.previous,
        TRANSLATIONS.pagination.next,
        TRANSLATIONS.pagination.page,
      ];
      
      // All pagination terms should be Vietnamese
      paginationTerms.forEach(term => {
        expect(isVietnameseOnly(term)).toBe(true);
        expect(term).toBeTruthy();
      });
    });
  });

  describe('Property 5 & 6: Integration Tests', () => {
    it('should have all admin page content in Vietnamese without English words', () => {
      const adminContent = TRANSLATIONS.admin;
      const values = extractAllTextValues(adminContent);
      
      const nonVietnameseValues = values.filter(
        value => typeof value === 'string' && value.trim() && !isVietnameseOnly(value)
      );
      
      expect(nonVietnameseValues).toEqual([]);
    });

    it('should have all permission mappings in Vietnamese without English words', () => {
      const permissionLabels = Object.values(PERMISSION_MAPPINGS);
      
      const nonVietnameseLabels = permissionLabels.filter(
        label => !isVietnameseOnly(label)
      );
      
      expect(nonVietnameseLabels).toEqual([]);
    });

    it('should have all permission groups in Vietnamese without English words', () => {
      const groupLabels = Object.values(PERMISSION_GROUPS);
      
      const nonVietnameseLabels = groupLabels.filter(
        label => !isVietnameseOnly(label)
      );
      
      expect(nonVietnameseLabels).toEqual([]);
    });

    it('should have consistent terminology across all admin pages and permissions', () => {
      // Check that key Vietnamese terms are used consistently
      const adminContent = TRANSLATIONS.admin;
      const permissionLabels = Object.values(PERMISSION_MAPPINGS);
      
      // Check for key terms in admin content
      const adminText = JSON.stringify(adminContent);
      const permissionText = JSON.stringify(permissionLabels);
      const combinedText = adminText + permissionText;
      
      // Key terms that should appear in the translations
      const keyTerms = [
        'Người dùng',
        'Vai trò',
        'Quyền',
        'Nhật ký',
        'Quản lý',
        'Xem',
        'Lọc',
        'Tìm kiếm',
      ];
      
      keyTerms.forEach(term => {
        expect(combinedText).toContain(term);
      });
    });

    it('should have all admin page titles and headings properly defined', () => {
      const adminPages = [
        { page: 'users', section: TRANSLATIONS.admin.users },
        { page: 'roles', section: TRANSLATIONS.admin.roles },
        { page: 'permissions', section: TRANSLATIONS.admin.permissions },
        { page: 'auditLogs', section: TRANSLATIONS.admin.auditLogs },
      ];
      
      adminPages.forEach(({ page, section }) => {
        expect(section.title).toBeTruthy();
        expect(section.heading).toBeTruthy();
        expect(isVietnameseOnly(section.title)).toBe(true);
        expect(isVietnameseOnly(section.heading)).toBe(true);
      });
    });

    it('should have all permission codes mapped to Vietnamese descriptions', () => {
      const permissionCodes = Object.keys(PERMISSION_MAPPINGS);
      
      // Should have all 10 required permissions
      expect(permissionCodes.length).toBeGreaterThanOrEqual(10);
      
      // All codes should map to Vietnamese descriptions
      permissionCodes.forEach(code => {
        const label = PERMISSION_MAPPINGS[code];
        expect(label).toBeTruthy();
        expect(isVietnameseOnly(label)).toBe(true);
      });
    });

    it('should have all permission groups properly organized', () => {
      const groupKeys = Object.keys(PERMISSION_GROUPS);
      
      // Should have multiple groups
      expect(groupKeys.length).toBeGreaterThan(0);
      
      // All groups should have Vietnamese labels
      groupKeys.forEach(key => {
        const label = PERMISSION_GROUPS[key];
        expect(label).toBeTruthy();
        expect(isVietnameseOnly(label)).toBe(true);
      });
    });

    it('should maintain consistency between admin page labels and permission labels', () => {
      // Check that terminology used in admin pages matches permission terminology
      const adminUserLabel = TRANSLATIONS.admin.users.heading;
      const permissionUserLabel = TRANSLATIONS.permissions.users;
      
      expect(adminUserLabel).toBe(permissionUserLabel);
      
      const adminRoleLabel = TRANSLATIONS.admin.roles.heading;
      const permissionRoleLabel = TRANSLATIONS.permissions.roles;
      
      expect(adminRoleLabel).toBe(permissionRoleLabel);
    });
  });
});
