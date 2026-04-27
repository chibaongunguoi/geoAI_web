export const navigationItems = [
  {
    href: "/",
    label: "Bản đồ",
    permission: "map.view"
  },
  {
    href: "/admin/users",
    label: "Người dùng",
    permission: "admin.users.view"
  },
  {
    href: "/admin/roles",
    label: "Vai trò",
    permission: "admin.roles.view"
  },
  {
    href: "/admin/permissions",
    label: "Quyền",
    permission: "admin.permissions.view"
  }
];

export function canAccess(permissions, permission) {
  return new Set(permissions || []).has(permission);
}

export function getVisibleNavigationItems(permissions) {
  return navigationItems.filter((item) => canAccess(permissions, item.permission));
}
