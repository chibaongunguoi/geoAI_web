import { fireEvent, render, screen } from "@testing-library/react";

import DashboardCharts from "./DashboardCharts";
import DashboardFilters from "./DashboardFilters";
import DashboardKpis from "./DashboardKpis";

const summary = {
  totals: { total: 5, active: 3, inactive: 1, review: 1, archived: 0, recentlyUpdated: 2, missingGeometry: 1 },
  buckets: {
    byStatus: [{ key: "ACTIVE", label: "Active", count: 3 }],
    byType: [{ key: "building", label: "building", count: 5 }],
    byDistrict: [{ key: "Lien Chieu", label: "Lien Chieu", count: 4 }],
    byWard: [{ key: "Hoa Khanh Bac", label: "Hoa Khanh Bac", count: 2 }]
  },
  trend: [{ date: "2026-05-09", count: 2 }]
};

describe("dashboard components", () => {
  it("renders KPI cards and lightweight chart drilldowns", () => {
    const onDrilldown = jest.fn();
    render(
      <>
        <DashboardKpis summary={summary} />
        <DashboardCharts summary={summary} onDrilldown={onDrilldown} />
      </>,
    );

    expect(screen.getByText("Tổng tài sản")).toBeInTheDocument();
    expect(screen.getByText("Thiếu tọa độ")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Active 3/i }));
    expect(onDrilldown).toHaveBeenCalledWith({ status: "ACTIVE" });
  });

  it("applies filters, refreshes, exports, and toggles auto refresh", () => {
    const handlers = {
      onApply: jest.fn(),
      onReset: jest.fn(),
      onRefresh: jest.fn(),
      onExportJson: jest.fn(),
      onExportCsv: jest.fn(),
      onViewMap: jest.fn(),
      onAutoRefreshChange: jest.fn()
    };

    render(
      <DashboardFilters
        filters={{ status: "ACTIVE", district: "" }}
        canExport
        autoRefresh={false}
        lastRefreshedAt="2026-05-09T00:00:00.000Z"
        {...handlers}
      />,
    );

    fireEvent.change(screen.getByLabelText(/Quận\/huyện/i), { target: { value: "Lien Chieu" } });
    fireEvent.click(screen.getByRole("button", { name: /Áp dụng/i }));
    fireEvent.click(screen.getByRole("button", { name: /Làm mới/i }));
    fireEvent.click(screen.getByRole("button", { name: /Xuất JSON/i }));
    fireEvent.click(screen.getByRole("button", { name: /Xuất CSV/i }));
    fireEvent.click(screen.getByRole("button", { name: /Xem trên bản đồ/i }));
    fireEvent.click(screen.getByRole("checkbox", { name: /Tự động làm mới/i }));

    expect(handlers.onApply).toHaveBeenCalledWith(expect.objectContaining({ district: "Lien Chieu" }));
    expect(handlers.onRefresh).toHaveBeenCalled();
    expect(handlers.onExportJson).toHaveBeenCalled();
    expect(handlers.onExportCsv).toHaveBeenCalled();
    expect(handlers.onViewMap).toHaveBeenCalled();
    expect(handlers.onAutoRefreshChange).toHaveBeenCalledWith(true);
  });
});
