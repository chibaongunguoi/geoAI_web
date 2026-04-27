export class PermissionSet {
  private readonly permissions: Set<string>;

  constructor(permissionKeys: string[]) {
    this.permissions = new Set(permissionKeys);
  }

  allows(permissionKey: string): boolean {
    return this.permissions.has(permissionKey);
  }
}
