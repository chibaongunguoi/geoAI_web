import { PermissionSet } from "./permission-set";

describe("PermissionSet", () => {
  it("when a permission exists, reports that access is allowed", () => {
    const permissions = new PermissionSet(["map.view", "admin.users.view"]);

    expect(permissions.allows("map.view")).toBe(true);
  });

  it("when a permission is missing, reports that access is denied", () => {
    const permissions = new PermissionSet(["map.view"]);

    expect(permissions.allows("admin.users.manage")).toBe(false);
  });
});
