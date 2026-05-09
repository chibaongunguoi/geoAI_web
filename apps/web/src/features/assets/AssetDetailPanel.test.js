import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import AssetDetailPanel from "./AssetDetailPanel";

describe("AssetDetailPanel", () => {
  it("renders property details, map preview, and audit timeline", () => {
    render(
      <AssetDetailPanel
        property={{
          id: "prop-1",
          code: "DN-BLD-001",
          name: "Trụ sở 1",
          addressLine: "01 Bạch Đằng",
          ward: "Hải Châu 1",
          district: "Hải Châu",
          status: "ACTIVE",
          propertyType: "building",
          areaSqm: 1250,
          centroidLat: 16.071,
          centroidLng: 108.22
        }}
        auditLogs={[
          {
            id: "audit-1",
            action: "properties.update",
            actor: { username: "admin" },
            createdAt: "2026-05-09T09:00:00.000Z"
          }
        ]}
        canManageProperties
      />
    );

    expect(screen.getByText("DN-BLD-001")).toBeInTheDocument();
    expect(screen.getByText("01 Bạch Đằng")).toBeInTheDocument();
    expect(screen.getByText("1.250 m2")).toBeInTheDocument();
    expect(screen.getAllByText("16.071, 108.22")).toHaveLength(2);
    expect(screen.getByText("properties.update")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Sửa tài sản" })).toHaveAttribute(
      "href",
      "/assets/DN-BLD-001/edit"
    );
  });
});
