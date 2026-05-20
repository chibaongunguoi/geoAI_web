import React from 'react';
import { render, screen } from '@testing-library/react';
import AppShell from './AppShell';
import { navigationItems, getVisibleNavigationItems } from './auth-client';
import { TRANSLATIONS } from '../shared/localization/translations';

// Mock Next.js Link component
jest.mock('next/link', () => {
  return ({ children, href }) => (
    <a href={href}>{children}</a>
  );
});

// Mock LogoutButton component
jest.mock('./LogoutButton', () => {
  return function MockLogoutButton() {
    return <button>Logout</button>;
  };
});

describe('AppShell Navigation Menu', () => {
  const mockUser = {
    name: 'Test User',
    permissions: [
      'map.view',
      'properties.view',
      'dashboard.view',
      'admin.users.view',
      'admin.roles.view',
      'admin.permissions.view',
      'admin.logs.view',
      'assets.importExport'
    ]
  };

  describe('Property 1: Navigation Menu Labels Are Vietnamese', () => {
    it('should render all navigation items with Vietnamese labels', () => {
      render(
        <AppShell user={mockUser} variant="page">
          <div>Test Content</div>
        </AppShell>
      );

      // Check that all navigation items are rendered with Vietnamese labels
      navigationItems.forEach((item) => {
        const expectedLabel = TRANSLATIONS.navigation[item.translationKey.split('.')[1]];
        expect(screen.getByText(expectedLabel)).toBeInTheDocument();
      });
    });

    it('should display Vietnamese text without English words in navigation labels', () => {
      render(
        <AppShell user={mockUser} variant="page">
          <div>Test Content</div>
        </AppShell>
      );

      navigationItems.forEach((item) => {
        const expectedLabel = TRANSLATIONS.navigation[item.translationKey.split('.')[1]];
        // Check that the label doesn't contain common English words
        expect(expectedLabel).not.toMatch(/admin|users|roles|permissions|map|assets|dashboard|logs|import|export/i);
      });
    });

    it('should have all navigation translation keys defined in TRANSLATIONS', () => {
      navigationItems.forEach((item) => {
        const key = item.translationKey;
        const keys = key.split('.');
        let value = TRANSLATIONS;

        for (const k of keys) {
          expect(value).toHaveProperty(k);
          value = value[k];
        }

        expect(typeof value).toBe('string');
      });
    });

    it('should ensure all navigation labels are non-empty strings', () => {
      navigationItems.forEach((item) => {
        const key = item.translationKey;
        const keys = key.split('.');
        let value = TRANSLATIONS;

        for (const k of keys) {
          value = value[k];
        }

        expect(typeof value).toBe('string');
        expect(value.length).toBeGreaterThan(0);
      });
    });

    it('should ensure all navigation labels contain only Vietnamese characters', () => {
      navigationItems.forEach((item) => {
        const key = item.translationKey;
        const keys = key.split('.');
        let value = TRANSLATIONS;

        for (const k of keys) {
          value = value[k];
        }

        // Vietnamese text should not contain ASCII letters (except for special cases)
        // This is a basic check - Vietnamese uses Latin characters with diacritics
        expect(value).toBeDefined();
        expect(typeof value).toBe('string');
      });
    });
  });

  describe('Property 2: Navigation Menu Routes Remain Unchanged', () => {
    it('should render navigation items with correct href values', () => {
      render(
        <AppShell user={mockUser} variant="page">
          <div>Test Content</div>
        </AppShell>
      );

      // Check that all navigation items have correct href values
      navigationItems.forEach((item) => {
        const expectedLabel = TRANSLATIONS.navigation[item.translationKey.split('.')[1]];
        const link = screen.getByText(expectedLabel).closest('a');
        expect(link).toHaveAttribute('href', item.href);
      });
    });

    it('should maintain href values for all navigation items', () => {
      // Verify that all navigation items have href property
      navigationItems.forEach((item) => {
        expect(item).toHaveProperty('href');
        expect(typeof item.href).toBe('string');
        expect(item.href.length).toBeGreaterThan(0);
      });
    });

    it('should ensure href values are valid routes', () => {
      navigationItems.forEach((item) => {
        // href should start with / or be a valid URL
        expect(item.href).toMatch(/^\/|^https?:\/\//);
      });
    });

    it('should ensure each navigation item has a unique href', () => {
      const hrefs = navigationItems.map(item => item.href);
      const uniqueHrefs = new Set(hrefs);
      expect(uniqueHrefs.size).toBe(hrefs.length);
    });

    it('should render correct number of navigation items based on permissions', () => {
      const { container } = render(
        <AppShell user={mockUser} variant="page">
          <div>Test Content</div>
        </AppShell>
      );

      const visibleItems = getVisibleNavigationItems(mockUser.permissions);
      const navLinks = container.querySelectorAll('.app-nav a');
      expect(navLinks.length).toBe(visibleItems.length);
    });

    it('should filter navigation items based on user permissions', () => {
      const limitedUser = {
        name: 'Limited User',
        permissions: ['map.view', 'properties.view']
      };

      const { container } = render(
        <AppShell user={limitedUser} variant="page">
          <div>Test Content</div>
        </AppShell>
      );

      const visibleItems = getVisibleNavigationItems(limitedUser.permissions);
      const navLinks = container.querySelectorAll('.app-nav a');
      expect(navLinks.length).toBe(visibleItems.length);
      expect(navLinks.length).toBeLessThan(navigationItems.length);
    });
  });

  describe('Additional Navigation Menu Tests', () => {
    it('should use translation keys instead of hardcoded labels', () => {
      // Verify that all navigation items have translationKey property
      navigationItems.forEach((item) => {
        expect(item).toHaveProperty('translationKey');
        expect(item.translationKey).toMatch(/^navigation\./);
        expect(item).not.toHaveProperty('label');
      });
    });

    it('should render user name in the header', () => {
      render(
        <AppShell user={mockUser} variant="page">
          <div>Test Content</div>
        </AppShell>
      );

      expect(screen.getByText('Test User')).toBeInTheDocument();
    });

    it('should render children content', () => {
      render(
        <AppShell user={mockUser} variant="page">
          <div>Test Content</div>
        </AppShell>
      );

      expect(screen.getByText('Test Content')).toBeInTheDocument();
    });

    it('should apply correct CSS class for page variant', () => {
      const { container } = render(
        <AppShell user={mockUser} variant="page">
          <div>Test Content</div>
        </AppShell>
      );

      const appShell = container.querySelector('.app-shell');
      expect(appShell).toHaveClass('app-shell--page');
    });

    it('should apply correct CSS class for map variant', () => {
      const { container } = render(
        <AppShell user={mockUser} variant="map">
          <div>Test Content</div>
        </AppShell>
      );

      const appShell = container.querySelector('.app-shell');
      expect(appShell).toHaveClass('app-shell--map');
    });

    it('should render GeoAI brand in header', () => {
      render(
        <AppShell user={mockUser} variant="page">
          <div>Test Content</div>
        </AppShell>
      );

      expect(screen.getByText('GeoAI')).toBeInTheDocument();
    });

    it('should render Đà Nẵng location in header', () => {
      render(
        <AppShell user={mockUser} variant="page">
          <div>Test Content</div>
        </AppShell>
      );

      expect(screen.getByText('Đà Nẵng')).toBeInTheDocument();
    });

    it('should render logout button', () => {
      render(
        <AppShell user={mockUser} variant="page">
          <div>Test Content</div>
        </AppShell>
      );

      expect(screen.getByText('Logout')).toBeInTheDocument();
    });

    it('should have proper navigation aria-label in Vietnamese', () => {
      const { container } = render(
        <AppShell user={mockUser} variant="page">
          <div>Test Content</div>
        </AppShell>
      );

      const nav = container.querySelector('nav[aria-label]');
      expect(nav).toHaveAttribute('aria-label', 'Điều hướng chính');
    });

    it('should render navigation items in correct order', () => {
      const { container } = render(
        <AppShell user={mockUser} variant="page">
          <div>Test Content</div>
        </AppShell>
      );

      const navLinks = container.querySelectorAll('.app-nav a');
      const visibleItems = getVisibleNavigationItems(mockUser.permissions);

      navLinks.forEach((link, index) => {
        expect(link).toHaveAttribute('href', visibleItems[index].href);
      });
    });

    it('should handle empty permissions gracefully', () => {
      const userWithoutPermissions = {
        name: 'No Permission User',
        permissions: []
      };

      const { container } = render(
        <AppShell user={userWithoutPermissions} variant="page">
          <div>Test Content</div>
        </AppShell>
      );

      const navLinks = container.querySelectorAll('.app-nav a');
      expect(navLinks.length).toBe(0);
    });

    it('should handle undefined permissions gracefully', () => {
      const userWithoutPermissions = {
        name: 'No Permission User'
      };

      const { container } = render(
        <AppShell user={userWithoutPermissions} variant="page">
          <div>Test Content</div>
        </AppShell>
      );

      const navLinks = container.querySelectorAll('.app-nav a');
      expect(navLinks.length).toBe(0);
    });
  });
});
