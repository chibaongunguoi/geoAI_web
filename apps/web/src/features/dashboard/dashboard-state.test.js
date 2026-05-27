import {
  addDashboardHistory,
  dashboardCsv,
  dashboardJsonPayload,
  dashboardQueryString,
  readDashboardState,
  writeDashboardState,
} from "./dashboard-state";

const summary = {
  filters: { status: "ACTIVE" },
  totals: { total: 2, active: 2, inactive: 0, review: 0, archived: 0, recentlyUpdated: 1, missingGeometry: 0 },
  buckets: { byDistrict: [{ key: "Lien Chieu", label: "Liên Chiểu", count: 2 }] },
  trend: [{ date: "2026-05-09", count: 2 }],
  topAssets: [{ code: "DN-001", name: "Asset", status: "ACTIVE", district: "Lien Chieu", ward: "Hoa Khanh Bac" }]
};

describe("dashboard-state", () => {
  it("serializes filters and exports summary payloads", () => {
    expect(dashboardQueryString({ status: "ACTIVE", district: "Lien Chieu" })).toBe(
      "status=ACTIVE&district=Lien+Chieu",
    );
    expect(dashboardJsonPayload(summary)).toEqual(
      expect.objectContaining({ exportedAt: expect.any(String), summary }),
    );
    expect(dashboardCsv(summary)).toContain("Quận/Huyện,Số lượng Building");
    expect(dashboardCsv(summary)).toContain("Liên Chiểu,2");
  });

  it("persists filters, auto refresh config, and history", () => {
    const storage = {
      data: {},
      getItem(key) {
        return this.data[key] ?? null;
      },
      setItem(key, value) {
        this.data[key] = value;
      }
    };
    const history = addDashboardHistory([], "refresh", { total: 2 });

    expect(writeDashboardState(storage, { filters: { status: "ACTIVE" }, autoRefresh: true, history })).toBe(true);
    expect(readDashboardState(storage)).toEqual(
      expect.objectContaining({
        filters: expect.objectContaining({ status: "ACTIVE" }),
        autoRefresh: true,
        history: expect.arrayContaining([expect.objectContaining({ action: "refresh" })])
      })
    );
    expect(writeDashboardState(null, {})).toBe(false);
  });
});
