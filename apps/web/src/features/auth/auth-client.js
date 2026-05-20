/**
 * Navigation menu items configuration
 * Each item includes:
 * - href: The route path
 * - translationKey: The translation key for the label (used to get Vietnamese text)
 * - permission: The required permission to access this menu item
 * 
 * The translationKey is used to fetch the Vietnamese label from the translations system
 * This allows for centralized management of all UI text and easy language support in the future
 */
export const navigationItems = [
  {
    href: "/",
    translationKey: "navigation.map",
    permission: "map.view"
  },
  {
    href: "/assets",
    translationKey: "navigation.assets",
    permission: "properties.view"
  },
  {
    href: "/dashboard",
    translationKey: "navigation.dashboard",
    permission: "dashboard.view"
  },
  {
    href: "/admin/users",
    translationKey: "navigation.users",
    permission: "admin.users.view"
  },
  {
    href: "/admin/roles",
    translationKey: "navigation.roles",
    permission: "admin.roles.view"
  },
  {
    href: "/admin/permissions",
    translationKey: "navigation.permissions",
    permission: "admin.permissions.view"
  },
  {
    href: "/admin/permissions/matrix",
    translationKey: "navigation.permissionMatrix",
    permission: "admin.permissions.view"
  },
  {
    href: "/admin/audit-logs",
    translationKey: "navigation.auditLogs",
    permission: "admin.logs.view"
  },
  {
    href: "/admin/import-export",
    translationKey: "navigation.importExport",
    permission: "assets.importExport"
  }
];

export function canAccess(permissions, permission) {
  return new Set(permissions || []).has(permission);
}

export function getVisibleNavigationItems(permissions) {
  return navigationItems.filter((item) => canAccess(permissions, item.permission));
}
