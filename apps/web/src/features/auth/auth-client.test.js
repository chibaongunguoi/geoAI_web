import {
  canAccess,
  getVisibleNavigationItems,
} from "./auth-client";

describe("auth-client", () => {
  it("when a user has map.view, allows map access", () => {
    expect(canAccess(["map.view"], "map.view")).toBe(true);
  });

  it("when a user lacks admin permissions, hides admin navigation", () => {
    const items = getVisibleNavigationItems(["map.view"]);

    expect(items.map((item) => item.href)).toEqual(["/"]);
  });

  it("when a user has admin permissions, shows admin navigation", () => {
    const items = getVisibleNavigationItems(["map.view", "admin.users.view"]);

    expect(items.map((item) => item.href)).toContain("/admin/users");
  });
});
