import { render, screen } from "@testing-library/react";

import DashboardCharts from "./DashboardCharts";

jest.mock("react-chartjs-2", () => ({
  Bar: () => <div data-testid="bar-chart" />,
  Pie: () => <div data-testid="pie-chart" />,
}));

const summary = {
  buckets: {
    byDistrict: [
      { key: "Hai Chau", label: "Hai Chau", count: 15 },
      { key: "Lien Chieu", label: "Lien Chieu", count: 10 }
    ]
  }
};

describe("dashboard components", () => {
  it("renders Bar and Pie charts", () => {
    render(<DashboardCharts summary={summary} />);

    expect(screen.getByTestId("bar-chart")).toBeInTheDocument();
    expect(screen.getByTestId("pie-chart")).toBeInTheDocument();
  });

  it("handles empty data gracefully", () => {
    render(<DashboardCharts summary={{ buckets: { byDistrict: [] } }} />);
    expect(screen.getByText(/Chưa có dữ liệu/i)).toBeInTheDocument();
  });
});
