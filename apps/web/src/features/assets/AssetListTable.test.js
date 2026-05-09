import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import AssetListTable from "./AssetListTable";
import { assetSearchQuery } from "./assets-server";

describe("AssetListTable", () => {
  it("renders paginated asset rows with detail and edit links", () => {
    render(
      <AssetListTable
        assets={[
          {
            id: "prop-1",
            code: "DN-BLD-001",
            name: "Trụ sở 1",
            ward: "Hải Châu 1",
            district: "Hải Châu",
            status: "ACTIVE",
            propertyType: "building",
            updatedAt: "2026-05-09T08:00:00.000Z"
          }
        ]}
        canManageProperties
        page={1}
        pageSize={20}
        total={1}
      />
    );

    expect(screen.getByText("DN-BLD-001")).toBeInTheDocument();
    expect(screen.getByText("Trụ sở 1")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Chi tiết" })).toHaveAttribute(
      "href",
      "/assets/DN-BLD-001"
    );
    expect(screen.getByRole("link", { name: "Sửa" })).toHaveAttribute(
      "href",
      "/assets/DN-BLD-001/edit"
    );
  });

  it("renders an empty state", () => {
    render(<AssetListTable assets={[]} canManageProperties={false} page={1} pageSize={20} total={0} />);

    expect(screen.getByText("Không có tài sản phù hợp.")).toBeInTheDocument();
  });
});

describe("assetSearchQuery", () => {
  it("serializes URL-backed advanced asset filters", () => {
    expect(
      assetSearchQuery({
        query: "Nguyen",
        status: "ACTIVE",
        propertyType: "building",
        district: "Lien Chieu",
        ward: "Hoa Khanh Bac",
        updatedFrom: "2026-05-01",
        updatedTo: "2026-05-09",
        limit: 100
      })
    ).toBe(
      "query=Nguyen&status=ACTIVE&propertyType=building&district=Lien+Chieu&ward=Hoa+Khanh+Bac&updatedFrom=2026-05-01&updatedTo=2026-05-09&limit=100"
    );
  });
});
