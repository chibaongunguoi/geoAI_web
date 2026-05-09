import { DASHBOARD_PERMISSION } from "./dashboard.controller";

describe("DashboardController permissions", () => {
  it("uses dashboard.view as the endpoint permission", () => {
    expect(DASHBOARD_PERMISSION).toBe("dashboard.view");
  });
});
