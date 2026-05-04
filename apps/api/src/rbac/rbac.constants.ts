export const ROLE_CODES = ["USER", "MANAGER", "ADMIN"] as const;

export const PERMISSION_KEYS = [
  "map.view",
  "map.scan",
  "layers.view",
  "layers.manage",
  "search.use",
  "properties.view",
  "properties.manage",
  "properties.import",
  "filters.use",
  "ai.query",
  "measurement.use",
  "export.use",
  "share.create",
  "admin.users.view",
  "admin.users.manage",
  "admin.roles.view",
  "admin.roles.manage",
  "admin.permissions.view",
  "admin.permissions.manage",
  "admin.config.manage",
  "admin.apiKeys.manage",
  "admin.logs.view",
  "admin.backups.manage",
  "assets.importExport"
] as const;

export type RoleCode = (typeof ROLE_CODES)[number];
export type PermissionKey = (typeof PERMISSION_KEYS)[number];
