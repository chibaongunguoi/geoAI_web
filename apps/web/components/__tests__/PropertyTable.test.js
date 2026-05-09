import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import PropertyTable from "../PropertyTable";

describe("PropertyTable", () => {
  it("renders property rows in table columns", () => {
    render(
      <PropertyTable
        results={[
          {
            id: "property-1",
            code: "DN-BLD-000001",
            name: "Nha Nguyen Luong Bang",
            ward: "Hoa Khanh Bac",
            district: "Lien Chieu",
            status: "ACTIVE",
            areaSqm: 1250
          }
        ]}
      />
    );

    expect(screen.getByRole("columnheader", { name: "Mã" })).toBeInTheDocument();
    expect(screen.getByText("DN-BLD-000001")).toBeInTheDocument();
    expect(screen.getByText("Nha Nguyen Luong Bang")).toBeInTheDocument();
    expect(screen.getByText("1.250 m2")).toBeInTheDocument();
  });

  it("renders an empty state when there are no rows", () => {
    render(<PropertyTable results={[]} />);

    expect(screen.getByText("Không có dữ liệu bảng")).toBeInTheDocument();
  });
});
