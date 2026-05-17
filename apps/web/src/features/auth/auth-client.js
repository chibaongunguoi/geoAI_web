export const navigationItems = [
  {
    href: "/",
    label: "Bản đồ",
    permission: "map.view"
  },
  {
    href: "/assets",
    label: "Tài sản",
    permission: "properties.view"
  },
  {
    href: "/dashboard",
    label: "Bảng điều khiển",
    permission: "dashboard.view"
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
  },
  {
    href: "/admin/permissions/matrix",
    label: "Ma trận quyền",
    permission: "admin.permissions.view"
  },
  {
    href: "/admin/audit-logs",
    label: "Nhật ký",
    permission: "admin.logs.view"
  },
  {
    href: "/admin/import-export",
    label: "Import/Export",
    permission: "assets.importExport"
  }
];

export function canAccess(permissions, permission) {
  return new Set(permissions || []).has(permission);
}

export function getVisibleNavigationItems(permissions) {
  return navigationItems.filter((item) => canAccess(permissions, item.permission));
}
